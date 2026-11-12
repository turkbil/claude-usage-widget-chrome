// Hesap hesabı ve metin yardımcıları — popup ile background ortak kullanır.
// Mac'teki AccountMath / AccountStore (Sources/Accounts.swift) ile aynı mantık.

export const i18n = (k, args) => chrome.i18n.getMessage(k, args ? args.map(String) : undefined) || k;

export const WEEK_MS = 7 * 24 * 3600 * 1000;
export const HINT_WINDOW_MS = 48 * 3600 * 1000;

export const toMs = iso => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
};

// Tarihi bütün haftalarla geleceğe gelene dek ileri kaydırır.
export function roll(t, now) {
  if (t > now) return { next: t, rolled: false };
  const weeks = Math.floor((now - t) / WEEK_MS) + 1;
  return { next: t + weeks * WEEK_MS, rolled: true };
}

// `next`ten `end`e (dahil) kadar kalan haftalık sıfırlama sayısı.
export function resetsBefore(end, next) {
  if (end == null || next == null) return null;
  if (next > end) return 0;
  return Math.floor((end - next) / WEEK_MS) + 1;
}

// Kullanılmamış ve süresi dolmamış ücretsiz sıfırlama hakları.
export function grantsOnHand(grants, now) {
  return (Array.isArray(grants) ? grants : []).filter(g => {
    if (!g || !(g.left > 0)) return false;
    const end = toMs(g.endsAt);
    return end == null || end > now;
  });
}

// Bir kaydın şimdiki anlamı: kayıttan beri geçen haftalık pencereler ileri
// kaydırılır (limit arada sıfırlanmış olmalı).
export function accountState(r, now) {
  let next = null, rolled = false;
  const reset = toMs(r.weeklyResetsAt);
  if (reset != null) ({ next, rolled } = roll(reset, now));

  const weeklyLeft = rolled ? 100 : (typeof r.weeklyPct === 'number' ? Math.max(0, 100 - r.weeklyPct) : null);

  const scopedLeft = [];
  let scopedNext = null;
  (Array.isArray(r.scoped) ? r.scoped : []).forEach((sc, i) => {
    let left = Math.max(0, 100 - (Number(sc.pct) || 0));
    const ra = toMs(sc.resetsAt);
    if (ra != null) {
      const x = roll(ra, now);
      if (x.rolled) left = 100;
      if (i === 0) scopedNext = x.next;
    }
    scopedLeft.push({ name: sc.name, left });
  });

  const planEnd = toMs(r.planEndsAt);
  const grantsLeft = grantsOnHand(r.grants, now);
  // «Bitişten önce kalan sıfırlama» yalnız gerçekten biten abonelikte anlamlı.
  const renews = r.planRenews === true;
  return {
    record: r, nextReset: next, weeklyLeft, scopedLeft, rolled, planEnd,
    weeklyResetsLeft: renews ? null : resetsBefore(planEnd, next),
    scopedResetsLeft: renews ? null : resetsBefore(planEnd, scopedNext),
    grantsLeft,
  };
}

// Gizlenen hesaplar listeden, 48 sa uyarısından, araç çubuğu ipucundan ve
// bildirimlerden çıkar; kayıtları storage'da kalır.
export function visibleRecords(records, hidden) {
  const h = new Set((hidden || []).map(e => String(e).toLowerCase()));
  return records.filter(r => !h.has(r.email));
}

// Kullanılmamış haftalık kotası boşa gidecek hesap: 48 saat içinde sıfırlanır
// ve en az %5 kalmıştır. En yakın sıfırlama kazanır; eşitse fazla kalan.
export function suggestion(states, now) {
  const c = states.filter(s => {
    if (s.nextReset == null || s.weeklyLeft == null) return false;
    const until = s.nextReset - now;
    return until > 0 && until <= HINT_WINDOW_MS && s.weeklyLeft >= 5;
  });
  c.sort((a, b) => (a.nextReset - b.nextReset) || ((b.weeklyLeft ?? 0) - (a.weeklyLeft ?? 0)));
  return c[0] || null;
}

// «Önce bunu kullan» sırası: kalanı ≥ %5 olanlar en yakın sıfırlamaya göre,
// sonra dolu hesaplar, en sonda verisizler.
export function sortStates(states) {
  const group = s => (s.weeklyLeft == null ? 2 : s.weeklyLeft >= 5 ? 0 : 1);
  return states.sort((a, b) =>
    (group(a) - group(b)) || ((a.nextReset ?? Infinity) - (b.nextReset ?? Infinity)));
}

// "claude2" — e-postanın @ öncesi; iki hesap aynı ön adı paylaşıyorsa tam e-posta.
// Hesap adı her yerde tam e-posta: alan adları farklı olabiliyor (claude2@nurullah.net,
// nurullahnet@gmail.com), «@» öncesi tek başına yanıltıyor. Mac'teki shortName ile aynı.
export function shortNamer(records) {
  return email => String(email || '');
}

const uiLocale = () => {
  try { return chrome.i18n.getUILanguage() || undefined; } catch { return undefined; }
};

// Biçimlendirmeden önce en yakın dakikaya yuvarlar: resets_at «…13:59:59.9Z» gibi
// geldiğinde saat «13:59» değil (Mac'teki gibi) «14:00» yazılsın.
const toMinute = t => new Date(Math.round(new Date(t).getTime() / 60000) * 60000);

// "Pzt 16:00" — haftalık sıfırlamanın günü ve saati, tarayıcı dilinde.
export function weekdayTime(t) {
  return new Intl.DateTimeFormat(uiLocale(), {
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(toMinute(t));
}

// "13 Kas"
export function shortDay(t) {
  return new Intl.DateTimeFormat(uiLocale(), { day: 'numeric', month: 'short' }).format(toMinute(t));
}

// "2g 1s" · "3s 20dk" · "12dk"
export function formatRemaining(t, now = Date.now()) {
  const total = Math.max(0, Math.floor((new Date(t).getTime() - now) / 1000));
  if (total <= 0) return i18n('time_reset');
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return i18n('time_days_hours',    [d, h]);
  if (h > 0) return i18n('time_hours_minutes', [h, m]);
  return i18n('time_minutes', [m]);
}

// "şimdi" · "25dk önce" · "3s önce" · "2g önce"
export function ageText(iso, now) {
  const t = toMs(iso);
  if (t == null) return '';
  const s = Math.max(0, (now - t) / 1000);
  if (s < 120)   return i18n('accounts_now');
  if (s < 3600)  return i18n('accounts_ago', [i18n('time_minutes',     [Math.floor(s / 60)])]);
  if (s < 86400) return i18n('accounts_ago', [i18n('time_hours_short', [Math.floor(s / 3600)])]);
  return i18n('accounts_ago', [i18n('time_days_short', [Math.floor(s / 86400)])]);
}

const grantKind = g => (['weekly', 'fable', 'session'].includes(g.kind) ? g.kind : 'other');

// "1 haftalık · son 11 Ara" — tek bir hak.
export function grantLine(g) {
  const kind = i18n('grant_' + grantKind(g), [g.left]);
  const end = toMs(g.endsAt);
  return end != null ? kind + ' · ' + i18n('grant_until', [shortDay(end)]) : kind;
}

// Bir türdeki haklar: toplam kalan ve en erken son tarih (Mac'teki grantSummary).
export function grantSummary(grants, kind) {
  const g = grants.filter(x => x.kind === kind);
  const ends = g.map(x => toMs(x.endsAt)).filter(t => t != null);
  return { count: g.reduce((n, x) => n + x.left, 0), first: ends.length ? Math.min(...ends) : null };
}

// "1 haftalık · son 11 Ara, 3 Fable · son 9 Mar" — aynı türdeki haklar
// toplanır, türün en erken son tarihi (önce kullanılacak olan) gösterilir.
export function grantText(grants) {
  const groups = new Map();
  for (const g of grants) {
    const k = grantKind(g);
    const acc = groups.get(k) || { kind: k, left: 0, endsAt: null };
    acc.left += g.left;
    const end = toMs(g.endsAt);
    if (end != null && (acc.endsAt == null || end < toMs(acc.endsAt))) acc.endsAt = g.endsAt;
    groups.set(k, acc);
  }
  return [...groups.values()].map(grantLine).join(', ');
}
