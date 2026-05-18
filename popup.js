import { getCache, getHistory } from './prefs.js';

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
    await drawSparkline(snapshot);
    fillFooter(snapshot, error);
  } else if (error) {
    document.getElementById('footer').textContent = '⚠ ' + (error.startsWith('error.') ? i18n(error.replace(/\./g, '_')) : error);
    document.getElementById('footer').style.color = 'var(--blood)';
  }
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
  document.getElementById('weeklyTrailing').textContent = i18n('remaining_suffix', [formatRemaining(s.weeklyResetsAt)]);

  const pct = Math.round(s.weeklyUtilization);
  document.getElementById('allModelsRow').hidden = false;
  document.getElementById('allModelsLabel').textContent = i18n('label_all_models');
  setBar('allModels', pct);

  if (s.sonnetUtilization != null) {
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
  document.getElementById('fiveTrailing').textContent = i18n('remaining_suffix', [formatRemaining(s.fiveHourResetsAt)]);
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
    el.textContent = '⚠ ' + error;
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

function formatRemaining(iso) {
  const total = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
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

  // Past path
  const history = await getHistory();
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
