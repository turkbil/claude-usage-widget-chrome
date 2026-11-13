import {
  getCache, getHistory, getAccounts, getHiddenAccounts, hideAccount, removeAccount, unhideAllAccounts,
  getGrantsExpanded, setGrantsExpanded,
} from './prefs.js';
import {
  i18n, toMs, accountState, visibleRecords, suggestion, sortStates, shortNamer, resetsBefore, grantsOnHand,
  weekdayTime, shortDay, formatRemaining, ageText, grantText, grantLine, grantSummary,
  activeCredits, apiTodayTotal, utcDayKey, money, dayTime, hasConsolePermission, CONSOLE_ORIGINS,
} from './accounts.js';

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

  setupSheet();
  // İsteğe bağlı konsol izni: düğme API kredisi satırında (yeniden çizilir, dinleyici listede).
  // Verilirse hemen okunur; geri alınırsa «izin verilmedi» hâline dönülür.
  document.getElementById('accountRows').addEventListener('click', async e => {
    if (!e.target.closest('.api-perm')) return;
    let ok = false;
    try { ok = await chrome.permissions.request({ origins: CONSOLE_ORIGINS }); } catch {}
    if (ok) { try { await chrome.runtime.sendMessage({ type: 'refresh-now' }); } catch {} }
    await render();
  });
  chrome.permissions?.onRemoved?.addListener(() => render());
  chrome.permissions?.onAdded?.addListener(() => render());
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
    fillDetails(snapshot);
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
  // E-posta hesapları ayırt eder; görünen adlar çoğu zaman aynıdır.
  document.getElementById('name').textContent = s.email ? '● ' + s.email : (s.displayName || '');
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
    document.getElementById('sonnetLabel').textContent = typeof s.scopedShare === 'number'
      ? i18n('label_scoped_cap', [scoped.name, Math.round(s.scopedShare)])
      : scoped.name;
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
  return { kind: 'over', timeStr: formatRemaining(Date.now() + secondsToLimit * 1000) };
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

// ── Ayrıntılar ─────────────────────────────────────────────────────────────
// Mac'teki currentDetailRows (Sources/main.swift) ile aynı satırlar.

function fillDetails(s, now = Date.now()) {
  const rows = [];
  const reset = toMs(s.weeklyResetsAt);
  if (reset != null) rows.push({ label: i18n('detail_reset'), value: weekdayTime(reset) });

  const end = toMs(s.planEndsAt);
  if (end != null && s.planRenews === true) {
    // Yenilenen abonelik: yalnız yenileme tarihi, uyarısız.
    rows.push({ label: i18n('detail_renews'), value: shortDay(end) });
  } else if (end != null && s.planRenews !== false) {
    // Yenilenip yenilenmeyeceği bilinmiyor: tarih renksiz, uyarı yok.
    rows.push({ label: i18n('detail_plan'), value: shortDay(end) });
  } else if (end != null) {
    const n = resetsBefore(end, reset);
    if (end < now) {
      rows.push({ label: i18n('detail_plan'), value: shortDay(end) + ' · ' + i18n('accounts_plan_passed'), color: 'var(--haze)' });
    } else if (n === 0) {
      rows.push({ label: i18n('detail_plan'), value: shortDay(end) + ' · ' + i18n('detail_last_week'), color: 'var(--ember)' });
    } else {
      rows.push({ label: i18n('detail_plan'), value: shortDay(end) + (n != null ? ' · ' + i18n('accounts_resets', [n]) : '') });
    }
  }

  const onHand = grantsOnHand(s.grants, now);
  if (onHand.length) rows.push({ label: i18n('detail_grants'), value: grantText(onHand), color: 'var(--ember)' });

  // Günlük pay: kalan kota, sıfırlamaya kalan günlere bölünür.
  if (reset != null) {
    const days = (reset - now) / 86400e3;
    if (days > 0.25) {
      const left = Math.max(0, 100 - s.weeklyUtilization);
      rows.push({ label: i18n('detail_daily'), value: '~' + i18n('value_percent', [Math.round(left / Math.max(1, days))]) });
    }
  }

  const used = (Array.isArray(s.breakdown) ? s.breakdown : []).filter(b => b.pct >= 1).sort((a, b) => b.pct - a.pct);
  if (used.length) {
    rows.push({ label: i18n('detail_breakdown'),
                value: used.map(b => b.name + ' ' + i18n('value_percent', [Math.round(b.pct)])).join(' · ') });
  }

  const box = document.getElementById('details');
  box.hidden = rows.length === 0;
  box.replaceChildren(...rows.map(r => {
    const el = document.createElement('div');
    el.className = 'detail';
    const l = document.createElement('span');
    l.className = 'detail-l';
    l.textContent = r.label;
    const v = document.createElement('span');
    v.className = 'detail-r';
    v.textContent = r.value;
    v.title = r.value;
    if (r.color) v.style.color = r.color;
    el.append(l, v);
    return el;
  }));
}

// ── Hesaplar ───────────────────────────────────────────────────────────────
// Mac'teki AccountRowView (Sources/Accounts.swift) ile aynı tek satırlık görünüm.

function leftColor(left) {
  if (left <= 10) return 'var(--blood)';
  if (left <= 25) return 'var(--ember)';
  if (left <= 50) return 'var(--sun)';
  return 'var(--grass)';
}

async function fillAccounts(snap, now = Date.now()) {
  const box = document.getElementById('accounts');
  const current = (snap.email || '').toLowerCase();
  const all = await getAccounts();
  const hidden = await getHiddenAccounts();
  const records = visibleRecords(all, hidden);
  const states = sortStates(records.map(r => accountState(r, now)));
  const shortName = shortNamer(records);

  // «Gizlenen hesapları göster (N)»: hepsi gizli olsa da bölüm bu bağlantı için açık kalır.
  const hiddenCount = all.length - records.length;
  const showHidden = document.getElementById('showHidden');
  showHidden.textContent = i18n('hide_show', [hiddenCount]);
  showHidden.hidden = hiddenCount === 0;

  box.hidden = states.length === 0 && hiddenCount === 0;
  box.querySelector('.acct-head').hidden = states.length === 0;

  document.getElementById('accountsTitle').textContent = i18n('section_accounts');
  document.getElementById('colLeft').textContent  = i18n('col_left');
  document.getElementById('colFable').textContent = i18n('col_fable');
  document.getElementById('colReset').textContent = i18n('col_reset');
  document.getElementById('colPlan').textContent  = i18n('col_plan');

  const hint = document.getElementById('accountsHint');
  const sug = suggestion(states, now);
  if (sug) {
    const pct = Math.round(sug.weeklyLeft);
    const when = formatRemaining(sug.nextReset, now);
    hint.textContent = '⏳ ' + (sug.record.email === current
      ? i18n('accounts_hint_current', [pct, when])
      : i18n('accounts_hint_other', [shortName(sug.record.email), pct, when]));
    hint.title = hint.textContent;
    hint.hidden = false;
  } else {
    hint.hidden = true;
  }
  const toggle = document.getElementById('grantsToggle');
  const grantHead = document.getElementById('grantHead');
  if (!states.length) {
    document.getElementById('accountRows').replaceChildren();
    document.getElementById('accountsStale').hidden = true;
    toggle.hidden = true;
    grantHead.hidden = true;
    return;
  }

  // Her hesabın (açık hesap dahil) hemen altında, kapalıyken gizli 4 satırlık tablo.
  // Başlıkta bugünkü API toplamı; konsol izni yoksa gösterilmez.
  const expanded = await getGrantsExpanded();
  const apiAllowed = await hasConsolePermission();
  const total = apiTodayTotal(records, now);
  const totalEl = document.getElementById('grantTotal');
  totalEl.textContent = apiAllowed && total.accounts > 0
    ? i18n('api_today_total', [money(total.sum), total.accounts]) : '';
  totalEl.hidden = !totalEl.textContent;
  grantHead.dataset.empty = totalEl.hidden ? '1' : '';
  grantHead.hidden = !expanded || grantHead.dataset.empty === '1';
  const rows = document.getElementById('accountRows');
  // İzin düğmesi tek: oturum açık hesabın (yoksa ilk hesabın) API kredisi satırında.
  const permAt = states.some(s => s.record.email === current) ? current : states[0].record.email;
  rows.replaceChildren(...states.flatMap(s => [
    accountRow(s, s.record.email === current, shortName(s.record.email), now),
    grantRow(s, expanded, apiAllowed, now, s.record.email === permAt),
  ]));
  // Hesap varsa düğme her zaman görünür (tek hesapta da).
  toggle.hidden = false;
  setToggleText(expanded);

  const stale = document.getElementById('accountsStale');
  setWithResetIcon(stale, i18n('accounts_stale_note'));
  stale.title = i18n('accounts_stale_note');
  stale.hidden = states.length < 2;
}

// Tek satır: ad · kalan çubuğu · %N · sıfırlama · abonelik bitişi. Ayrıntılar ipucunda.
function accountRow(s, isCurrent, name, now) {
  const r = s.record;
  const row = document.createElement('div');
  row.className = 'acct acct-grid' + (isCurrent ? ' current' : '');

  const cell = (cls, text, extra) => {
    const el = document.createElement('span');
    el.className = cls + (extra ? ' ' + extra : '');
    if (text != null) el.textContent = text;
    row.append(el);
    return el;
  };

  // Ad: güncel hesap kalın ve «●» işaretli; diğerleri soluk (son girişteki veri).
  // İşaretin sabit yeri var (adlar aynı hizada); uzun ad alt satıra kaymaz, «…» ile kesilir.
  const nameEl = cell('col-name');
  const mk = document.createElement('span');
  mk.className = 'mk';
  mk.textContent = isCurrent ? '●' : '';
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = name;
  nameEl.append(mk, nm);

  // Kalan çubuğu ve yüzdesi.
  const barCell = cell('col-bar');
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  bar.append(fill);
  barCell.append(bar);
  if (s.weeklyLeft != null) {
    fill.style.width = `${Math.max(0, Math.min(100, s.weeklyLeft))}%`;
    fill.style.background = leftColor(s.weeklyLeft);
    if (!isCurrent) fill.style.opacity = '0.7';
    const pct = cell('col-pct', i18n('value_percent', [Math.round(s.weeklyLeft)]) + (s.rolled ? '*' : ''));
    pct.style.color = leftColor(s.weeklyLeft);
  } else {
    fill.style.width = '0';
    cell('col-pct', '—', 'faint');
  }

  // Fable kalanı; «*» = son okumadan beri penceresi sıfırlandı (yeniden %100).
  const f = s.scopedLeft[0];
  if (f) {
    const fp = cell('col-fpct', i18n('value_percent', [Math.round(f.left)]) + (s.scopedRolled ? '*' : ''));
    fp.style.color = leftColor(f.left);
  } else {
    cell('col-fpct', '—', 'faint');
  }

  if (s.neverSignedIn || s.nextReset == null) {
    // Hiç okunmadı: tahmin yerine bunu söyle; metin SIFIRLAMA + AYLIK hücrelerini birlikte kullanır.
    cell('col-wide', i18n('accounts_not_signed_in'), 'faint');
  } else {
    // Sıfırlama günü ve saati.
    cell('col-reset', weekdayTime(s.nextReset));
    // Aylık tarih: yenileniyorsa (ya da bilinmiyorsa) renksiz, iptal edilmiş ve
    // gerçekten bitiyorsa turuncu, tarihi geçtiyse soluk.
    const ending = r.planRenews === false && s.planEnd != null && s.planEnd > now;
    if (s.planEnd != null) {
      cell('col-plan', shortDay(s.planEnd), s.planEnd < now ? 'faint' : (ending ? 'warn' : ''));
    } else {
      cell('col-plan', '—', 'faint');
    }
  }

  row.title = accountDetails(s, isCurrent, now);
  // Tıklayınca (ya da Enter/Boşluk) alttan «Gizle · Sil · Vazgeç» seçimi açılır.
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.addEventListener('click', () => openSheet(r.email, name));
  row.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(r.email, name); }
  });
  return row;
}

// «↺» yazı tiplerinde tutarsız çiziliyor (Mac Chrome'da «ʊ» gibi); metindeki her «↺»
// yerine aynı boyutta küçük bir SVG ok koyar.
const RESET_SVG = '<svg class="reset-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2.2 2.4 5.2 4.9 2 6.6Z" fill="currentColor"/></svg>';
function setWithResetIcon(el, text) {
  el.textContent = '';
  text.split('↺').forEach((part, i) => {
    if (i > 0) el.insertAdjacentHTML('beforeend', RESET_SVG);
    if (part) el.append(part);
  });
}

// Hesabın altındaki tablo (Mac'teki GrantDetailView), etiket | değer:
//   Haftalık hak · «↺ 1 · son 11 Ara», hak yoksa soluk «0», hiç okunmadıysa soluk «bilinmiyor»
//   Fable hakkı  · aynı biçim
//   API kredisi  · «$4,42 / $200 hibe · son 16 Kas · bugün $0,00» (3 gün içinde bitecekse kırmızı)
//   Son okuma    · «haklar 13 Kas 00:36 · API şimdi»
// Diğer hak türleri (ör. oturum) tabloda yok, ipucunda tek tek.
function grantRow(s, expanded, apiAllowed, now, permButton) {
  const r = s.record;
  const el = document.createElement('div');
  el.className = 'grant-row';
  el.hidden = !expanded;
  const line = (labelKey, text, cls, withIcon) => {
    const ln = document.createElement('div');
    ln.className = 'acct-grid g-line';
    const l = document.createElement('span');
    l.className = 'g-label';
    l.textContent = i18n(labelKey);
    const v = document.createElement('span');
    v.className = 'g-value' + (cls ? ' ' + cls : '');
    if (withIcon) setWithResetIcon(v, text); else v.textContent = text;
    v.title = text;
    ln.append(l, v);
    el.append(ln);
    return v;
  };

  for (const [kind, key] of [['weekly', 'grants_row_weekly'], ['fable', 'grants_row_fable']]) {
    if (s.neverSignedIn || !Array.isArray(r.grants)) { line(key, i18n('grants_unknown_short')); continue; }
    const { count, first } = grantSummary(s.grantsLeft, kind);
    if (count === 0) line(key, '0');
    else line(key, '↺ ' + count + (first != null ? ' · ' + i18n('grant_until', [shortDay(first)]) : ''), 'on', true);
  }

  // API kredisi: konsoldan, yalnız izin verildiyse.
  const today = r.apiTodayKey === utcDayKey(now) && typeof r.apiToday === 'number'
    ? ' · ' + i18n('api_today', [money(r.apiToday)]) : '';
  if (!apiAllowed) {
    const v = line('grants_row_api', i18n('api_no_permission'));
    if (permButton) {
      // «API kredilerini göster — izin ver»: soluk metnin altında, aynı hücrede.
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'api-perm';
      b.textContent = i18n('api_permission_button');
      v.append(b);
    }
  } else if (typeof r.apiTotal !== 'number') {
    line('grants_row_api', i18n('api_unknown'));
  } else {
    const cr = activeCredits(r, now);
    if (cr.length) {
      const left = cr.reduce((n, c) => n + c.remaining, 0), granted = cr.reduce((n, c) => n + c.granted, 0);
      const ends = cr.map(c => toMs(c.expiresAt)).filter(t => t != null);
      const first = ends.length ? Math.min(...ends) : null;
      const soon = first != null && first - now < 3 * 86400e3;
      line('grants_row_api', i18n('api_credit', [money(left), money(granted)])
        + (first != null ? ' · ' + i18n('grant_until', [shortDay(first)]) : '') + today, soon ? 'soon' : 'on');
    } else {
      line('grants_row_api', money(r.apiTotal) + today, r.apiTotal > 0 ? 'plain' : '');
    }
  }

  // Son okuma, ayrı ayrı: haklar claude.ai'den, kredi konsoldan gelir.
  const when = iso => (now - toMs(iso) < 180e3 ? i18n('accounts_now') : dayTime(toMs(iso)));
  const apiSeen = apiAllowed && r.apiSeenAt ? r.apiSeenAt : null;
  if (s.neverSignedIn && !apiSeen) {
    line('grants_row_seen', i18n('accounts_never_read'));
  } else {
    const bits = [];
    if (!s.neverSignedIn) bits.push(i18n('grants_seen_resets', [when(r.grantsSeenAt || r.seenAt)]));
    if (apiSeen) bits.push(i18n('grants_seen_api', [when(apiSeen)]));
    line('grants_row_seen', bits.join(' · '));
  }

  if (s.grantsLeft.length) el.title = s.grantsLeft.map(grantLine).join('\n');
  return el;
}

function setToggleText(expanded) {
  document.getElementById('grantsToggle').textContent =
    (expanded ? '▾ ' : '▸ ') + i18n(expanded ? 'grants_hide' : 'grants_show');
}

// İpucu: e-posta, haftalık, Fable, sıfırlama hakkı, abonelik, son veri zamanı.
function accountDetails(s, isCurrent, now) {
  const r = s.record;
  const lines = [r.email];
  if (s.nextReset != null) {
    const pct = s.weeklyLeft != null ? i18n('value_percent', [Math.round(s.weeklyLeft)]) : '—';
    lines.push(i18n('tip_weekly', [pct, weekdayTime(s.nextReset), formatRemaining(s.nextReset, now)]));
  }
  for (const f of s.scopedLeft) lines.push(i18n('tip_scoped', [f.name, Math.round(f.left)]));
  if (s.grantsLeft.length) lines.push(i18n('detail_grants') + ': ' + grantText(s.grantsLeft));
  if (s.planEnd != null && r.planRenews === true) {
    lines.push(i18n('detail_renews') + ' ' + shortDay(s.planEnd));
  } else if (s.planEnd != null) {
    const bits = [i18n(r.planRenews === false ? 'tip_plan_ends' : 'accounts_plan_until', [shortDay(s.planEnd)])];
    if (s.planEnd < now) {
      bits.push(i18n('accounts_plan_passed'));
    } else if (s.weeklyResetsLeft != null) {
      const f = s.scopedLeft[0];
      if (s.scopedResetsLeft != null && s.scopedResetsLeft !== s.weeklyResetsLeft && f) {
        bits.push(i18n('accounts_resets_split', [s.weeklyResetsLeft, f.name, s.scopedResetsLeft]));
      } else {
        bits.push(i18n('accounts_resets', [s.weeklyResetsLeft]));
      }
    }
    lines.push(bits.join(' · '));
  }
  if (s.neverSignedIn) lines.push(i18n('accounts_never_read'));
  else lines.push(i18n('tip_seen', [isCurrent ? i18n('accounts_now') : ageText(r.seenAt, now)]));
  if (s.rolled) lines.push(i18n('tip_rolled'));
  lines.push(i18n('tip_remove'));
  if (!isCurrent) lines.push(i18n('tip_refresh'));
  return lines.join('\n');
}

// ── Gizle / Sil ────────────────────────────────────────────────────────────
// Mac'teki confirmHide (Sources/main.swift) karşılığı; native confirm() yerine
// popup içinde alttan açılan panel. Gizle: kayıt kalır, listeden, uyarıdan,
// ipucundan ve bildirimlerden çıkar. Sil: kayıt silinir, yeniden girişte sıfırdan eklenir.

let sheetEmail = null;

function setupSheet() {
  document.getElementById('sheetHideBtn').textContent   = i18n('hide_confirm');
  document.getElementById('sheetDeleteBtn').textContent = i18n('hide_delete');
  document.getElementById('sheetCancelBtn').textContent = i18n('hide_cancel');

  document.getElementById('sheetHideBtn').addEventListener('click', () => applySheet(hideAccount));
  document.getElementById('sheetDeleteBtn').addEventListener('click', () => applySheet(removeAccount));
  document.getElementById('sheetCancelBtn').addEventListener('click', closeSheet);
  document.getElementById('sheetBackdrop').addEventListener('click', e => {
    if (e.target.id === 'sheetBackdrop') closeSheet();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheetEmail) { e.preventDefault(); closeSheet(); }
  });
  // Aç/kapa yeniden çizmeden yalnız hak başlığını ve satırlarını gösterir/gizler; durum hatırlanır.
  document.getElementById('grantsToggle').addEventListener('click', async () => {
    const expanded = !(await getGrantsExpanded());
    await setGrantsExpanded(expanded);
    const gh = document.getElementById('grantHead');
    gh.hidden = !expanded || gh.dataset.empty === '1';
    document.querySelectorAll('#accountRows .grant-row').forEach(el => { el.hidden = !expanded; });
    setToggleText(expanded);
  });
  document.getElementById('showHidden').addEventListener('click', async () => {
    await unhideAllAccounts();
    await accountsChanged();
  });
}

function openSheet(email, name) {
  sheetEmail = email;
  document.getElementById('sheetTitle').textContent      = i18n('hide_title', [name]);
  document.getElementById('sheetHideText').textContent   = i18n('hide_body_hide', [email]);
  document.getElementById('sheetDeleteText').textContent = i18n('hide_body_delete');
  document.getElementById('sheetBackdrop').hidden = false;
  document.getElementById('sheetHideBtn').focus();
}

function closeSheet() {
  sheetEmail = null;
  document.getElementById('sheetBackdrop').hidden = true;
}

async function applySheet(action) {
  const email = sheetEmail;
  closeSheet();
  if (!email) return;
  await action(email);
  await accountsChanged();
}

// Popup'ı yeniden çizer; background araç çubuğu ipucunu tazeler.
async function accountsChanged() {
  try { await chrome.runtime.sendMessage({ type: 'accounts-changed' }); } catch {}
  await render();
}
