import { getCache, getHistory, getAccounts } from './prefs.js';

const i18n = (k, args) => chrome.i18n.getMessage(k, args ? args.map(String) : undefined) || k;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('refreshBtn').textContent = '⟳';
  document.getElementById('openUsageBtn').textContent = i18n('menu_open_usage');
  document.getElementById('optionsBtn').textContent = '⚙';

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'refresh-now' });
    await render();
  });
  document.getElementById('openUsageBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://claude.ai/settings/usage' });
  });
  document.getElementById('optionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('siteLink').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://www.nurullah.net' });
  });
  document.getElementById('xLink').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://x.com/nurullah' });
  });

  await render();
});

async function render() {
  const cache = await getCache();
  if (!cache) {
    document.getElementById('footer').textContent = i18n('sparkline_empty');
    return;
  }
  const { snapshot, error } = cache;

  if (snapshot) {
    fillAccountHeader(snapshot);
    fillWeekly(snapshot);
    fillForecast(snapshot);
    fillFiveHour(snapshot);
    await fillAccounts(snapshot);
    await drawSparkline(snapshot);
    fillFooter(snapshot, error);
  } else if (error) {
    document.getElementById('footer').textContent = '⚠ ' + errorText(error);
    document.getElementById('footer').style.color = 'var(--blood)';
  }
}

// Background stores error codes like 'error.no_session'; locale keys use underscores.
function errorText(error) {
  return error.startsWith('error.') ? i18n(error.replace(/\./g, '_')) : error;
}

function fillAccountHeader(s) {
  const headerEl = document.getElementById('header');
  if (!s.displayName && !s.planLabel) { headerEl.hidden = true; return; }
  headerEl.hidden = false;
  document.getElementById('name').textContent = s.displayName || '';
  const pill = document.getElementById('planPill');
  if (s.planLabel) { pill.textContent = s.planLabel; pill.hidden = false; }
  else pill.hidden = true;
}

function fillWeekly(s) {
  document.getElementById('weeklyTitle').textContent  = i18n('section_weekly');
  document.getElementById('weeklyTrailing').textContent = remainingText(s.weeklyResetsAt);

  const pct = Math.round(s.weeklyUtilization);
  document.getElementById('allModelsRow').hidden = false;
  document.getElementById('allModelsLabel').textContent = i18n('label_all_models');
  setBar('allModels', pct);

  // Modele özel ilk haftalık limit (ör. "Fable") varsa Sonnet satırının yerini alır.
  const scoped = (s.scopedLimits || [])[0];
  if (scoped) {
    document.getElementById('sonnetRow').hidden = false;
    document.getElementById('sonnetLabel').textContent = scoped.name;
    setBar('sonnet', Math.round(scoped.pct));
  } else if (s.sonnetUtilization != null) {
    document.getElementById('sonnetRow').hidden = false;
    document.getElementById('sonnetLabel').textContent = i18n('label_sonnet');
    setBar('sonnet', Math.round(s.sonnetUtilization));
  } else {
    document.getElementById('sonnetRow').hidden = true;
  }
}

function fillFiveHour(s) {
  const has = s.fiveHourUtilization != null && s.fiveHourResetsAt;
  document.getElementById('fiveHead').hidden = !has;
  document.getElementById('fiveRow').hidden = !has;
  if (!has) return;
  document.getElementById('fiveTitle').textContent = i18n('section_five_hour');
  document.getElementById('fiveTrailing').textContent = remainingText(s.fiveHourResetsAt);
  document.getElementById('fiveLabel').textContent = i18n('label_usage');
  setBar('five', Math.round(s.fiveHourUtilization));
}

function fillForecast(s) {
  const result = computeForecast(s);
  const el = document.getElementById('forecast');
  el.classList.remove('warn');
  if (!result) { el.hidden = true; return; }
  el.hidden = false;
  if (result.kind === 'under') {
    el.textContent = i18n('forecast_under', [result.endPct]);
  } else if (result.kind === 'over') {
    el.textContent = i18n('forecast_over', [result.timeStr]);
    el.classList.add('warn');
  } else if (result.kind === 'exceeded') {
    el.textContent = i18n('forecast_exceeded');
    el.classList.add('warn');
  }
}

function fillFooter(s, error) {
  const el = document.getElementById('footer');
  const when = new Date(s.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (error) {
    el.textContent = '⚠ ' + errorText(error);
    el.style.color = 'var(--blood)';
  } else {
    el.textContent = i18n('footer_updated', [when]);
    el.style.color = '';
  }
}

function setBar(prefix, pct) {
  const fill = document.getElementById(`${prefix}Bar`);
  const value = document.getElementById(`${prefix}Value`);
  const color = colorFor(pct);
  fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  fill.style.background = color;
  value.style.color = color;
  value.textContent = i18n('value_percent', [pct]);
}

function colorFor(p) {
  if (p >= 90) return 'var(--blood)';
  if (p >= 75) return 'var(--ember)';
  if (p >= 50) return 'var(--sun)';
  return 'var(--grass)';
}

// "2g 1s kaldı" — but once the reset time has passed, just "sıfırlandı" (no "kaldı" suffix).
function remainingText(iso) {
  if (new Date(iso).getTime() <= Date.now()) return i18n('time_reset');
  return i18n('remaining_suffix', [formatRemaining(iso)]);
}

function formatRemaining(iso, now = Date.now()) {
  const total = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  if (total <= 0) return i18n('time_reset');
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return i18n('time_days_hours',    [d, h]);
  if (h > 0) return i18n('time_hours_minutes', [h, m]);
  return i18n('time_minutes', [m]);
}

function computeForecast(snap) {
  const weekEnd   = new Date(snap.weeklyResetsAt).getTime() / 1000;
  const weekStart = weekEnd - 7 * 24 * 3600;
  const now       = Date.now() / 1000;
  const elapsedSec  = now - weekStart;
  const elapsedFrac = elapsedSec / (7 * 24 * 3600);

  if (elapsedFrac <= 0.05 || elapsedFrac >= 0.97) return null;
  if (snap.weeklyUtilization <= 0.5) return null;
  if (snap.weeklyUtilization >= 100) return { kind: 'exceeded' };

  const projected = snap.weeklyUtilization / elapsedFrac;
  if (projected < 100) return { kind: 'under', endPct: Math.round(projected) };

  const rate = snap.weeklyUtilization / elapsedSec;
  const secondsToLimit = (100 - snap.weeklyUtilization) / rate;
  return { kind: 'over', timeStr: formatRemaining(new Date(Date.now() + secondsToLimit * 1000).toISOString()) };
}

async function drawSparkline(snap) {
  const canvas = document.getElementById('sparkline');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const weekEnd   = new Date(snap.weeklyResetsAt).getTime() / 1000;
  const weekStart = weekEnd - 7 * 24 * 3600;
  const now       = Date.now() / 1000;

  const margin = 18;
  const left = margin, right = canvas.width - margin;
  const top = 6, bottom = canvas.height - 6;
  const w = right - left, h = bottom - top;

  const pt = (t, v) => [
    left + (t - weekStart) / (weekEnd - weekStart) * w,
    top + (1 - Math.max(0, Math.min(100, v)) / 100) * h,
  ];

  // Baseline rule (100% mark)
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(right, top);
  ctx.stroke();

  // Now guide
  const [nowX] = pt(now, 0);
  ctx.beginPath();
  ctx.moveTo(nowX, top); ctx.lineTo(nowX, bottom);
  ctx.stroke();

  // Past path — yalnız güncel hesabın örnekleri; etiketsiz eski örnekler
  // o an açık olan her hesabı karıştırdığı için atlanır.
  const email = (snap.email || '').toLowerCase();
  const history = (await getHistory()).filter(s => !email || s.a === email);
  const past = [pt(weekStart, 0)];
  for (const s of history) {
    if (s.t > weekStart && s.t <= now) past.push(pt(s.t, s.v));
  }
  past.push(pt(now, snap.weeklyUtilization));

  // Gradient fill under past
  const ember = '#d68c45';
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, 'rgba(214,140,69,0.30)');
  grad.addColorStop(1, 'rgba(214,140,69,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(...past[0]);
  for (let i = 1; i < past.length; i++) ctx.lineTo(...past[i]);
  ctx.lineTo(past[past.length - 1][0], bottom);
  ctx.lineTo(past[0][0], bottom);
  ctx.closePath();
  ctx.fill();

  // Past line
  ctx.strokeStyle = ember;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(...past[0]);
  for (let i = 1; i < past.length; i++) ctx.lineTo(...past[i]);
  ctx.stroke();

  // Future projected line (dashed)
  const elapsedSec = now - weekStart;
  let projected = snap.weeklyUtilization * ((weekEnd - weekStart) / Math.max(60, elapsedSec));
  projected = Math.min(100, Math.max(snap.weeklyUtilization, projected));
  const future = pt(weekEnd, projected);

  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = 'rgba(214,140,69,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(...past[past.length - 1]);
  ctx.lineTo(...future);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dots
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(past[past.length - 1][0], past[past.length - 1][1], 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(214,140,69,0.55)';
  ctx.beginPath();
  ctx.arc(future[0], future[1], 2, 0, Math.PI * 2);
  ctx.fill();
}

// ── Hesaplar ───────────────────────────────────────────────────────────────
// Mac'teki AccountMath (Sources/Accounts.swift) ile aynı hesap.

const WEEK_MS = 7 * 24 * 3600 * 1000;
const HINT_WINDOW_MS = 48 * 3600 * 1000;

const toMs = iso => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
};

// Tarihi bütün haftalarla geleceğe gelene dek ileri kaydırır.
function roll(t, now) {
  if (t > now) return { next: t, rolled: false };
  const weeks = Math.floor((now - t) / WEEK_MS) + 1;
  return { next: t + weeks * WEEK_MS, rolled: true };
}

// `next`ten `end`e (dahil) kadar kalan haftalık sıfırlama sayısı.
function resetsBefore(end, next) {
  if (end == null || next == null) return null;
  if (next > end) return 0;
  return Math.floor((end - next) / WEEK_MS) + 1;
}

// Bir kaydın şimdiki anlamı: kayıttan beri geçen haftalık pencereler ileri
// kaydırılır (limit arada sıfırlanmış olmalı).
function accountState(r, now) {
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
  return {
    record: r, nextReset: next, weeklyLeft, scopedLeft, rolled, planEnd,
    weeklyResetsLeft: resetsBefore(planEnd, next),
    scopedResetsLeft: resetsBefore(planEnd, scopedNext),
  };
}

// Kullanılmamış haftalık kotası boşa gidecek hesap: 48 saat içinde sıfırlanır
// ve en az %5 kalmıştır. En yakın sıfırlama kazanır; eşitse fazla kalan.
function suggestion(states, now) {
  const c = states.filter(s => {
    if (s.nextReset == null || s.weeklyLeft == null) return false;
    const until = s.nextReset - now;
    return until > 0 && until <= HINT_WINDOW_MS && s.weeklyLeft >= 5;
  });
  c.sort((a, b) => (a.nextReset - b.nextReset) || ((b.weeklyLeft ?? 0) - (a.weeklyLeft ?? 0)));
  return c[0] || null;
}

// Güncel hesap önce, sonra en yakın sıfırlama.
function sortStates(states, current) {
  return states.sort((a, b) => {
    const ac = a.record.email === current, bc = b.record.email === current;
    if (ac !== bc) return ac ? -1 : 1;
    return (a.nextReset ?? Infinity) - (b.nextReset ?? Infinity);
  });
}

const uiLocale = () => {
  try { return chrome.i18n.getUILanguage() || undefined; } catch { return undefined; }
};

// "Pzt 16:00" — haftalık sıfırlamanın günü ve saati, tarayıcı dilinde.
function weekdayTime(t) {
  return new Intl.DateTimeFormat(uiLocale(), {
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(t));
}

// "13 Kas"
function shortDay(t) {
  return new Intl.DateTimeFormat(uiLocale(), { day: 'numeric', month: 'short' }).format(new Date(t));
}

// "şimdi" · "25dk önce" · "3s önce" · "2g önce"
function ageText(iso, now) {
  const t = toMs(iso);
  if (t == null) return '';
  const s = Math.max(0, (now - t) / 1000);
  if (s < 120)   return i18n('accounts_now');
  if (s < 3600)  return i18n('accounts_ago', [i18n('time_minutes',     [Math.floor(s / 60)])]);
  if (s < 86400) return i18n('accounts_ago', [i18n('time_hours_short', [Math.floor(s / 3600)])]);
  return i18n('accounts_ago', [i18n('time_days_short', [Math.floor(s / 86400)])]);
}

function leftColor(left) {
  if (left <= 10) return 'var(--blood)';
  if (left <= 25) return 'var(--ember)';
  if (left <= 50) return 'var(--sun)';
  return 'var(--grass)';
}

async function fillAccounts(snap, now = Date.now()) {
  const box = document.getElementById('accounts');
  const current = (snap.email || '').toLowerCase();
  const states = sortStates((await getAccounts()).map(r => accountState(r, now)), current);

  box.hidden = states.length === 0;
  if (!states.length) return;

  document.getElementById('accountsTitle').textContent = i18n('section_accounts');
  document.getElementById('accountsTrailing').textContent = i18n('accounts_count', [states.length]);

  const hint = document.getElementById('accountsHint');
  const sug = suggestion(states, now);
  if (sug) {
    const pct = Math.round(sug.weeklyLeft);
    const when = formatRemaining(new Date(sug.nextReset).toISOString(), now);
    hint.textContent = '⏳ ' + (sug.record.email === current
      ? i18n('accounts_hint_current', [pct, when])
      : i18n('accounts_hint_other', [sug.record.email, pct, when]));
    hint.hidden = false;
  } else {
    hint.hidden = true;
  }

  const rows = document.getElementById('accountRows');
  rows.replaceChildren(...states.map(s => accountRow(s, s.record.email === current, now)));

  const stale = document.getElementById('accountsStale');
  stale.textContent = i18n('accounts_stale_note');
  stale.hidden = states.length < 2;
}

// Bir hesap için üç satır: e-posta | kalan · sıfırlama | Fable · abonelik | yaş.
function accountRow(s, isCurrent, now) {
  const r = s.record;
  const row = document.createElement('div');
  row.className = 'acct';

  const line = (cls, leftText, rightText, rightColor) => {
    const el = document.createElement('div');
    el.className = 'acct-line ' + cls;
    const l = document.createElement('span');
    l.className = 'acct-l';
    l.textContent = leftText;
    l.title = leftText;
    const rt = document.createElement('span');
    rt.className = 'acct-r';
    rt.textContent = rightText;
    if (rightColor) rt.style.color = rightColor;
    el.append(l, rt);
    row.append(el);
  };

  // 1) ● e-posta | %X kaldı
  let leftText = '—', leftCol = 'var(--haze)';
  if (s.weeklyLeft != null) {
    leftText = i18n('accounts_left', [Math.round(s.weeklyLeft)]) + (s.rolled ? '*' : '');
    leftCol = leftColor(s.weeklyLeft);
  }
  line('top', (isCurrent ? '● ' : '') + r.email, leftText, leftCol);

  // 2) ↻ Pzt 16:00 · 3g 17s | Fable %Y kaldı
  const reset = s.nextReset != null
    ? '↻ ' + weekdayTime(s.nextReset) + ' · ' + formatRemaining(new Date(s.nextReset).toISOString(), now)
    : i18n('accounts_no_data');
  const f = s.scopedLeft[0];
  line('mid', reset, f ? i18n('accounts_scoped_left', [f.name, Math.round(f.left)]) : '');

  // 3) Abonelik 13 Kas · 0 sıfırlama kaldı | 2s önce
  const bits = [];
  if (s.planEnd != null) {
    bits.push(i18n('accounts_plan_until', [shortDay(s.planEnd)]));
    if (s.planEnd < now) {
      bits.push(i18n('accounts_plan_passed'));
    } else if (s.weeklyResetsLeft != null) {
      if (s.scopedResetsLeft != null && s.scopedResetsLeft !== s.weeklyResetsLeft && f) {
        bits.push(i18n('accounts_resets_split', [s.weeklyResetsLeft, f.name, s.scopedResetsLeft]));
      } else {
        bits.push(i18n('accounts_resets', [s.weeklyResetsLeft]));
      }
    }
  }
  line('low', bits.join(' · '), isCurrent ? i18n('accounts_now') : ageText(r.seenAt, now));

  return row;
}
