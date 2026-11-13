// Chrome Web Store görsellerini 15 dilde üretir: başsız Chromium, gerçek popup.html, chrome.* taklidi.
//   node store-assets/shots/render.cjs            → hepsi
//   node store-assets/shots/render.cjs tr ja      → yalnız bu diller
// Çıktı: store-assets/screenshots/<dil>/01-accounts.png, 02-details.png, 03-hide.png (1280×800)
//        store-assets/promo/<dil>/tile-440x280.png (440×280), marquee-1400x560.png (1400×560)
// Taklit veri yalnız örnek adlar kullanır (…@example.com). Sonunda ölçüm özeti JSON olarak basılır.
const fs = require('fs');
const path = require('path');
const http = require('http');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(process.env.PLAYWRIGHT || '/Users/nurullah/.npm/_npx/9833c18b2d85bc59/node_modules/playwright')); }
const CHROME = process.env.CHROME || '/Users/nurullah/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';

const REPO = path.resolve(__dirname, '../..');
const ASSETS = path.join(REPO, 'store-assets');
const ALL = ['en', 'tr', 'de', 'es', 'fr', 'it', 'nl', 'cs', 'ro', 'ru', 'uk', 'ja', 'ko', 'zh_TW', 'th'];
const LOCS = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const NOW = new Date('2026-11-12T19:30:00Z');
const TZ = 'Europe/Istanbul';
const msgs = Object.fromEntries(ALL.map(l => [l, JSON.parse(fs.readFileSync(path.join(REPO, `_locales/${l}/messages.json`), 'utf8'))]));
const copy = JSON.parse(fs.readFileSync(path.join(__dirname, 'copy.json'), 'utf8'));

// ── Taklit veri: 7 hesap, örnek adlar ──
const ago = h => new Date(NOW.getTime() - h * 3600e3).toISOString();
const F = (pct, at) => [{ name: 'Fable', pct, resetsAt: at }];
const accounts = [
  { email: 'work@example.com', apiTotal: 151.2, apiCredits: [{ name: 'API credit', remaining: 151.2, granted: 200, expiresAt: '2026-12-14T00:00:00Z' }], apiSeenAt: ago(0), apiToday: 12.34, apiTodayKey: '2026-11-12', plan: 'Max 20x', weeklyPct: 40, weeklyResetsAt: '2026-11-16T13:00:00.000Z',
    scoped: F(4, '2026-11-16T13:00:00.000Z'), planEndsAt: '2026-11-13T10:00:00.000Z', planRenews: false,
    grants: [{ kind: 'weekly', left: 1, total: 1, endsAt: '2026-12-11T10:00:00.000Z' },
             { kind: 'fable', left: 2, total: 2, endsAt: '2027-04-01T10:00:00.000Z' },
             { kind: 'fable', left: 1, total: 1, endsAt: '2027-03-09T10:00:00.000Z' }], seenAt: ago(0), source: 'live' },
  { email: 'personal@example.com', plan: 'Max 5x', weeklyPct: 0, weeklyResetsAt: '2026-11-14T05:00:00.000Z',
    scoped: F(0, '2026-11-14T05:00:00.000Z'), planEndsAt: '2026-12-07T10:00:00.000Z', planRenews: true,
    grants: [{ kind: 'weekly', left: 1, total: 1, endsAt: '2026-12-11T10:00:00.000Z' },
             { kind: 'fable', left: 2, total: 2, endsAt: '2027-04-01T10:00:00.000Z' },
             { kind: 'fable', left: 1, total: 1, endsAt: '2027-03-09T10:00:00.000Z' }], seenAt: ago(50), source: 'live' },
  { email: 'team@example.com', apiTotal: 25, apiCredits: [], apiSeenAt: ago(1), apiToday: 3.1, apiTodayKey: '2026-11-12', plan: 'Max 5x', weeklyPct: 0, weeklyResetsAt: '2026-11-15T17:00:00.000Z',
    scoped: [], planEndsAt: '2026-11-19T10:00:00.000Z',
    grants: [{ kind: 'fable', left: 1, total: 1, endsAt: '2026-11-01T00:00:00.000Z' }], seenAt: ago(5), source: 'live' },
  { email: 'studio@example.com', plan: 'Pro', weeklyPct: 85, weeklyResetsAt: '2026-11-04T10:59:59.900Z',
    scoped: [], planEndsAt: '2026-11-21T00:00:00.000Z', planRenews: true,
    grants: [{ kind: 'weekly', left: 1, total: 1, endsAt: '2026-12-11T10:00:00.000Z' }], seenAt: '2026-11-03T12:00:00.000Z', source: 'live' },
  { email: 'research@example.com', plan: 'Pro', weeklyPct: 60, weeklyResetsAt: '2026-11-04T11:00:00.000Z',
    scoped: [], planEndsAt: '2026-12-08T00:00:00.000Z', planRenews: true,
    grants: [{ kind: 'weekly', left: 1, total: 1, endsAt: '2026-12-20T10:00:00.000Z' }], seenAt: '2026-11-03T12:00:00.000Z', source: 'live' },
  { email: 'side@example.com', plan: 'Pro', weeklyPct: 100, weeklyResetsAt: '2026-11-13T23:00:00.000Z',
    scoped: [], planEndsAt: '2026-11-19T00:00:00.000Z', planRenews: false, grants: [], seenAt: ago(3), source: 'live' },
  { email: 'test@example.com', plan: null, weeklyPct: null, weeklyResetsAt: null,
    scoped: [], planEndsAt: null, seenAt: ago(0.5), source: 'live' },
];
const snapshot = {
  weeklyUtilization: 40, weeklyResetsAt: '2026-11-16T13:00:00.000Z',
  fiveHourUtilization: null, fiveHourResetsAt: null, sonnetUtilization: null,
  displayName: 'Work', planLabel: 'Max 20x', email: 'work@example.com',
  scopedLimits: F(4, '2026-11-16T13:00:00.000Z'), scopedShare: 50,
  planEndsAt: '2026-11-13T10:00:00.000Z', planRenews: false,
  breakdown: [{ name: 'Claude Code', pct: 100 }],
  grants: accounts[0].grants, fetchedAt: ago(0),
};
const history = [{ t: (NOW.getTime() - 60e6) / 1000, v: 20 }, { t: (NOW.getTime() - 40e6) / 1000, v: 25, a: 'work@example.com' }];
const data = expanded => ({ cache: { snapshot, error: null, fetchedAt: NOW.getTime() }, accounts, history, ...(expanded ? { grantsExpanded: true } : {}) });

// Her çerçevede (üst sayfa + popup iframe'i) çalışır.
function mock({ data, locale, messages }) {
  window.__data = JSON.parse(JSON.stringify(data));
  window.__missing = [];
  const d = window.__data;
  const pick = k => { const m = messages[locale][k]; if (!m) window.__missing.push(k); return m && m.message; };
  window.chrome = {
    storage: { local: {
      get: async k => (d[k] === undefined ? {} : { [k]: JSON.parse(JSON.stringify(d[k])) }),
      set: async o => { Object.assign(d, JSON.parse(JSON.stringify(o))); },
    } },
    i18n: {
      getUILanguage: () => locale.replace('_', '-'),
      getMessage: (k, args) => {
        const m = pick(k);
        if (m == null) return '';
        const a = args == null ? [] : Array.isArray(args) ? args : [args];
        return m.replace(/\$\$|\$(\d)/g, (s, n) => (s === '$$' ? '$' : (a[n - 1] ?? '')));
      },
    },
    permissions: { contains: async () => true, request: async () => true, onAdded: { addListener() {} }, onRemoved: { addListener() {} } },
    runtime: { sendMessage: async () => ({}), openOptionsPage: () => {} },
    tabs: { create: () => {} },
  };
}

// Popup çerçevesinin içinden ölçüm.
function measurePopup() {
  const de = document.documentElement;
  const vis = e => e && !e.closest('[hidden]') && e.offsetParent !== null;
  const texts = [...document.querySelectorAll('body *')].filter(e => !e.children.length && vis(e)).map(e => e.textContent).filter(Boolean);
  const titles = [...document.querySelectorAll('[title]')].map(e => e.title);
  const rawRe = /\$\d(?![\d.,])|__MSG_|(^|\s)(accounts|section|time|detail|col|grant|grants|tip|label|notification|hide|sheet|value|forecast)_[a-z_]+/;
  const clipped = [...document.querySelectorAll('.nm, .grant-detail, .detail-l, .detail-v, .row-label, #grantsToggle, .sheet-title, .sheet-line, .sheet-actions button')]
    .filter(vis).filter(e => e.scrollWidth > e.clientWidth + 0.5).map(e => e.textContent);
  return {
    overflowX: de.scrollWidth - de.clientWidth,
    raw: texts.concat(titles).filter(t => rawRe.test(t)),
    missing: window.__missing.slice(),
    clipped,
    privacy: /ixtif|nurullahnet|gmail/i.test(document.body.innerText + titles.join(' ')),
    rows: document.querySelectorAll('.acct').length,
  };
}

// Üst sayfadan ölçüm: taşma, kırpılma, popup'la çakışma, satır sayısı.
function measureShot() {
  const W = innerWidth, H = innerHeight, de = document.documentElement;
  const texts = [...document.querySelectorAll('[data-t], .brand')];
  const fr = document.querySelector('.frame') && document.querySelector('.frame').getBoundingClientRect();
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const tr = e => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
  const lines = e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
  const out = {
    overflowX: Math.max(de.scrollWidth, document.body.scrollWidth) - W,
    clipped: texts.filter(e => e.scrollWidth > e.clientWidth + 0.5).map(e => e.textContent),
    outside: texts.filter(e => { const r = tr(e); return r.left < 0 || r.top < 0 || r.right > W || r.bottom > H; }).map(e => e.textContent),
    overlap: fr ? texts.filter(e => hit(tr(e), fr)).map(e => e.textContent) : [],
    lines: Object.fromEntries(texts.filter(e => e.matches('h1, .name, .slogan')).map(e => [e.tagName === 'H1' ? 'h1' : e.className, lines(e)])),
  };
  if (fr) out.gap = Math.round(fr.left - Math.max(...texts.map(e => tr(e).right)));
  if (fr) out.frame = { left: Math.round(fr.left), top: Math.round(fr.top), right: Math.round(fr.right), bottom: Math.round(fr.bottom) };
  return out;
}

const SCENES = [
  { id: 'accounts', file: 'screenshots/%/01-accounts.png', w: 1280, h: 800, expanded: true },
  { id: 'details', file: 'screenshots/%/02-details.png', w: 1280, h: 800, expanded: false },
  { id: 'hide', file: 'screenshots/%/03-hide.png', w: 1280, h: 800, expanded: false },
  { id: 'tile', file: 'promo/%/tile-440x280.png', w: 440, h: 280 },
  { id: 'marquee', file: 'promo/%/marquee-1400x560.png', w: 1400, h: 560, expanded: false },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync(CHROME) ? { executablePath: CHROME } : {}) });
  const open = async (locale, sc, s) => {
    const ctx = await browser.newContext({ viewport: { width: sc.w, height: sc.h }, deviceScaleFactor: 1, locale: locale.replace('_', '-'), timezoneId: TZ });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
    await page.clock.setFixedTime(NOW);
    await page.addInitScript(mock, { data: data(sc.expanded), locale, messages: msgs });
    await page.goto(`${base}/store-assets/shots/shot.html?lang=${locale}&scene=${sc.id}&s=${s}`);
    await page.waitForFunction(() => window.__shotReady === true);
    let frame = null, lay = null;
    if (sc.id !== 'tile') {
      // The popup iframe can attach a moment after __shotReady; wait for it.
      for (let i = 0; i < 100 && !frame; i++) {
        frame = page.frames().find(f => f.url().endsWith('/popup.html'));
        if (!frame) await page.waitForTimeout(100);
      }
      await frame.waitForSelector('.acct');
      await page.waitForTimeout(150);
      lay = await page.evaluate(() => window.layout());
    }
    return { ctx, page, frame, errors, lay };
  };

  // 1. geçiş: haklar açık popup'ın en uzun dili → ortak ölçek (ekran görüntülerinde popup her dilde aynı boyda).
  const heights = {};
  for (const l of ALL) {
    const { ctx, lay } = await open(l, SCENES[0], 1);
    heights[l] = lay.full; await ctx.close();
  }
  const maxH = Math.max(...Object.values(heights));
  const S = Math.min(1, +((800 - 2 * 40) / maxH).toFixed(4));

  const report = { S, maxH, heights, shots: {} };
  for (const l of LOCS) {
    for (const sc of SCENES) {
      const { ctx, page, frame, errors, lay } = await open(l, sc, S);
      if (sc.id === 'hide') {
        await frame.locator('.acct', { has: frame.locator('.nm', { hasText: /^team@/ }) }).locator('.col-eye').click();
        await page.waitForTimeout(200);
      }
      const r = await page.evaluate(measureShot);
      if (frame) r.popup = await frame.evaluate(measurePopup);
      if (sc.id === 'hide') r.sheet = await frame.evaluate(() => !document.getElementById('sheetBackdrop').hidden && document.getElementById('sheetTitle').textContent);
      r.lay = lay; r.errors = errors;
      const out = path.join(ASSETS, sc.file.replace('%', l));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out });
      report.shots[`${l}/${sc.id}`] = r;
      await ctx.close();
    }
  }
  await browser.close();
  srv.close();

  // Denetim.
  const fails = [];
  for (const [k, r] of Object.entries(report.shots)) {
    const A = (c, m) => { if (!c) fails.push(k + ' ' + m); };
    A(r.overflowX === 0, 'overflowX ' + r.overflowX);
    A(!r.clipped.length, 'clipped ' + r.clipped);
    A(!r.outside.length, 'outside ' + r.outside);
    if (!k.endsWith('marquee')) A(!r.overlap.length, 'overlap ' + r.overlap);
    A(!r.errors.length, 'errors ' + r.errors);
    if (r.gap != null) A(r.gap >= 48, 'gap ' + r.gap);
    if (r.lines.h1 != null) A(r.lines.h1 <= 3, 'h1 lines ' + r.lines.h1);
    if (k.endsWith('marquee')) A(r.lines.slogan === 1 && r.lines.name === 1, 'marquee lines ' + JSON.stringify(r.lines));
    if (k.endsWith('tile')) A(r.lines.slogan <= 2 && r.lines.name === 1, 'tile lines ' + JSON.stringify(r.lines));
    if (r.frame && !k.endsWith('marquee')) A(r.frame.top >= 24 && r.frame.bottom <= 776, 'frame vertical ' + JSON.stringify(r.frame));
    if (r.popup) {
      A(r.popup.overflowX === 0, 'popup overflowX ' + r.popup.overflowX);
      A(!r.popup.raw.length, 'raw ' + r.popup.raw);
      A(!r.popup.missing.length, 'missing ' + r.popup.missing);
      A(!r.popup.clipped.length, 'popup clipped ' + r.popup.clipped);
      A(!r.popup.privacy, 'privacy');
      A(r.popup.rows === 7, 'rows ' + r.popup.rows);
    }
    if (k.endsWith('hide')) A(typeof r.sheet === 'string' && r.sheet.includes('team'), 'sheet ' + r.sheet);
  }
  // 01-accounts'ta haklar AÇIK olmalı: açık popup, kapalı (hide sahnesi) popuptan uzun çıkmalı.
  // Tutmazsa popup'ın aç/kapa durum anahtarı (şimdilik storage 'grantsExpanded') değişmiş demektir: data() güncellenmeli.
  for (const l of LOCS) {
    const a = report.shots[`${l}/accounts`], h = report.shots[`${l}/hide`];
    if (!(a.lay.full > h.lay.full)) fails.push(`${l}/accounts haklar açık değil (açık ${a.lay.full} ≤ kapalı ${h.lay.full}); data() içindeki grantsExpanded anahtarını kontrol et`);
  }
  const keySets = Object.values(copy).map(c => JSON.stringify([Object.keys(c), ...['accounts', 'details', 'hide'].map(s => [Object.keys(c[s]), c[s].b.length])]));
  if (Object.keys(copy).length !== 15 || new Set(keySets).size !== 1) fails.push('copy.json key sets differ');
  const lines = Object.fromEntries(Object.entries(report.shots).map(([k, r]) => [k, r.lines]));
  console.log(JSON.stringify({ S, maxH, heights, lines, gaps: Object.fromEntries(Object.entries(report.shots).map(([k, r]) => [k, r.gap])), frames: Object.fromEntries(Object.entries(report.shots).filter(([k]) => /^(tr|ja)\//.test(k)).map(([k, r]) => [k, r.frame])) }));
  console.log('SHOTS', Object.keys(report.shots).length, 'FAILS', fails.length, JSON.stringify(fails, null, 1));
  if (fails.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
