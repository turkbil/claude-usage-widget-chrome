import { fetchSnapshot, fetchConsoleCredits } from './api.js';
import { defaultPrefs, getPrefs, setPrefs, getCache, setCache, getAccounts, getHiddenAccounts, upsertAccount, upsertAPI } from './prefs.js';
import { drawIcon } from './icon-draw.js';
import {
  accountState, visibleRecords, suggestion, shortNamer, formatRemaining, shortDay, grantText, i18n,
  activeCredits, money, utcDayKey, hasConsolePermission,
} from './accounts.js';
import { restoreFromSync, backupToSync, importFromMac } from './restore.js';

// Konsol (API kredisi) verisi yavaş değişir: en çok 10 dakikada bir okunur,
// popup'taki ⟳ hemen okur. Damga storage'da: MV3 işçisi uyuyunca bellekteki değişken kaybolur.
const CONSOLE_EVERY_MS = 10 * 60 * 1000;

// Yenilemeler sırayla çalışır: ikisi aynı anda `accounts` kaydını okuyup yazınca biri ötekini siliyordu.
let chain = Promise.resolve();
const serial = fn => (chain = chain.then(fn, fn));

const ALARM_REFRESH = 'cuw-refresh';
const ALARM_HISTORY = 'cuw-history';

// Kurulum, güncelleme ve tarayıcı açılışı: önce yedekten geri yükle (yeniden kurulumda
// local boştur), sonra yenile. Güncellemede local olduğu gibi kalır; birleştirme hiçbir kaydı silmez.
chrome.runtime.onInstalled.addListener(async () => {
  const prefs = await getPrefs();
  scheduleRefresh(prefs.pollIntervalSec);
  chrome.alarms.create(ALARM_HISTORY, { periodInMinutes: 5 });
  await serial(() => restoreFromSync());
  await serial(() => refresh());
});

chrome.runtime.onStartup.addListener(async () => {
  const prefs = await getPrefs();
  scheduleRefresh(prefs.pollIntervalSec);
  await serial(() => restoreFromSync());
  await serial(() => refresh());
});

// Mac uygulamasından içe aktarma kendiliğinden yapılmaz (silinen hesap geri gelmesin):
// yalnız düğmeyle (izin verilince onAdded, ya da «import-mac» mesajı).

// Hesap kayıtları ya da gizlenenler değişince sync'e yazılır (birkaç değişim tek yazmada toplanır).
// Başka bilgisayardan sync'e gelen kayıtlar aynı birleştirmeyle yerele alınır.
let backupTimer = null;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.accounts || changes.hiddenAccounts)) {
    clearTimeout(backupTimer);
    backupTimer = setTimeout(() => serial(() => backupToSync()), 2000);
  } else if (area === 'sync' && Object.keys(changes).some(k => k.startsWith('acct:') || k === 'hidden')) {
    serial(() => restoreFromSync());
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_REFRESH) await serial(() => refresh());
  if (alarm.name === ALARM_HISTORY) await recordHistory();
});

// React to settings changes from the options page.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'prefs-changed') {
      const prefs = await getPrefs();
      scheduleRefresh(prefs.pollIntervalSec);
      await updateBadge();   // re-render with new settings
    } else if (msg?.type === 'accounts-changed') {
      await updateBadge();   // gizlenen/silinen hesap ipucundan çıksın
      sendResponse({ ok: true });
    } else if (msg?.type === 'refresh-now') {
      await serial(() => refresh({ forceConsole: true }));
      sendResponse({ ok: true });
    } else if (msg?.type === 'import-mac') {
      const r = await serial(() => importFromMac());
      await updateBadge();
      sendResponse(r);
    } else if (msg?.type === 'get-snapshot') {
      const cache = await getCache();
      sendResponse(cache);
    }
  })();
  return true;   // keep channel open for async sendResponse
});

// İsteğe bağlı konsol izni verilince hemen okunur; geri alınınca yeni istek
// yapılmaz (popup «izin verilmedi» gösterir, kayıtlı kredi bildirim üretmez).
// Mac izni verilince de hemen içe aktarılır: izin penceresi popup'ı kapatsa bile hesaplar gelir.
chrome.permissions?.onAdded?.addListener(async p => {
  if ((p.origins || []).some(o => o.startsWith('https://platform.claude.com'))) await serial(() => readConsole({ force: true }));
  if ((p.origins || []).some(o => o.startsWith('http://127.0.0.1'))) await serial(() => importFromMac());
});

function scheduleRefresh(sec) {
  chrome.alarms.clear(ALARM_REFRESH);
  chrome.alarms.create(ALARM_REFRESH, { periodInMinutes: Math.max(0.5, sec / 60) });
}

async function refresh({ forceConsole = false } = {}) {
  // Konsol okuması kendi başına: konsol oturumu yoksa hata yazılmaz, claude.ai
  // hatası da konsol okumasını engellemez. İki yazma sırayla (aynı kaydı değiştirirler).
  await readConsole({ force: forceConsole });
  try {
    const snap = await fetchSnapshot();
    await setCache({ snapshot: snap, error: null, fetchedAt: Date.now() });
    await upsertAccount(snap);
    await recordHistory({ onAccountChange: true });
    await updateBadge();
    await evaluateNotifications(snap);
    await evaluateAccountNotifications();
  } catch (err) {
    const cache = await getCache();
    await setCache({ ...cache, error: String(err.message || err), fetchedAt: Date.now() });
    await updateBadge();
  }
}

async function readConsole({ force = false } = {}) {
  try {
    if (!(await hasConsolePermission())) return;
    const now = Date.now();
    const { consoleReadAt = 0 } = await chrome.storage.local.get('consoleReadAt');
    if (!force && now - consoleReadAt < CONSOLE_EVERY_MS) return;
    await chrome.storage.local.set({ consoleReadAt: now });
    const c = await fetchConsoleCredits(new Date(now));
    if (!c) return;
    await upsertAPI(c, new Date(now).toISOString(), utcDayKey(now));
    await evaluateAccountNotifications();
  } catch { /* konsol okunamadı: son değerler kalır */ }
}

// Alarmla 5 dakikada bir çalışır. Her yenilemeden sonra onAccountChange ile de
// çağrılır: o zaman yalnız oturumdaki hesap son örneğinkinden farklıysa yazar,
// böylece yeni hesabın çizgisi 5 dakika beklemeden başlar.
async function recordHistory({ onAccountChange = false } = {}) {
  const { snapshot } = (await getCache()) || {};
  if (!snapshot) return;
  const { history = [] } = await chrome.storage.local.get('history');
  const a = (snapshot.email || '').toLowerCase() || null;
  if (onAccountChange && history.length && (history[history.length - 1].a ?? null) === a) return;
  history.push({ t: Date.now() / 1000, v: snapshot.weeklyUtilization, a });
  // Cap at 14 days × 24h × 12 samples/h = 4032
  const trimmed = history.length > 4032 ? history.slice(history.length - 4032) : history;
  await chrome.storage.local.set({ history: trimmed });
}

async function updateBadge() {
  const { snapshot, error } = (await getCache()) || {};
  const prefs = await getPrefs();

  // Tooltip
  if (snapshot) {
    const pct = Math.round(snapshot.weeklyUtilization);
    // "⏳ claude1": başka bir hesabın kullanılmamış kotası 48 sa içinde yanacak.
    // İsteğe bağlı (Ayarlar, varsayılan kapalı); gizli hesaplar sayılmaz.
    // Rozet metnine dokunulmaz; ipucu yalnız başlığa eklenir.
    let next = '';
    if (prefs.toolbarHint) {
      const records = visibleRecords(await getAccounts(), await getHiddenAccounts());
      const sug = suggestion(records.map(r => accountState(r, Date.now())), Date.now());
      const current = (snapshot.email || '').toLowerCase();
      if (sug && sug.record.email !== current) next = ` ⏳ ${shortNamer(records)(sug.record.email)}`;
    }
    chrome.action.setTitle({ title: `Claude: ${pct}% this week${next}` });
  } else if (error) {
    const msg = error.startsWith('error.') ? (chrome.i18n.getMessage(error.replace(/\./g, '_')) || error) : error;
    chrome.action.setTitle({ title: `Claude Usage Widget — ${msg}` });
  }

  // Render the icon
  const imageData = drawIcon(snapshot, prefs, !!error && !snapshot);
  chrome.action.setIcon({ imageData });
}

async function evaluateNotifications(snap) {
  const prefs = await getPrefs();
  if (!prefs.notificationsEnabled) return;

  const pct = Math.round(snap.weeklyUtilization);
  const crossed =
    pct >= prefs.criticalThreshold ? 'critical' :
    pct >= prefs.alertThreshold    ? 'alert'    :
    pct >= prefs.warnThreshold     ? 'warn'     : null;

  // Son bildirilen seviye hesaba göre tutulur: zaten %90'daki bir hesaba
  // geçmek yeniden «%90 aşıldı» gibi görünmesin (ya da tersi).
  const account = (snap.email || '').toLowerCase() || null;
  const { notifyLevels = {} } = await chrome.storage.local.get('notifyLevels');
  const last = account
    ? (Object.prototype.hasOwnProperty.call(notifyLevels, account) ? notifyLevels[account] : null)
    : (prefs.lastNotifiedLevel || '');
  const store = async v => {
    if (account) await chrome.storage.local.set({ notifyLevels: { ...notifyLevels, [account]: v } });
    else await setPrefs({ lastNotifiedLevel: v });
  };

  // Hesap ilk kez görülüyor: seviyesini sessizce kaydet.
  if (last === null) { await store(crossed || ''); return; }

  // Uyarı eşiğinin altına inince yeniden kur — bir sonraki dönemde tekrar uyarsın.
  if (pct < prefs.warnThreshold && last) { await store(''); return; }

  const rank = { '': 0, warn: 1, alert: 2, critical: 3 };
  if (!crossed || rank[crossed] <= rank[last]) return;

  const messages = {
    warn:     chrome.i18n.getMessage('notification_warn',     [`${pct}`]),
    alert:    chrome.i18n.getMessage('notification_alert',    [`${pct}`]),
    critical: chrome.i18n.getMessage('notification_critical', [`${pct}`]),
  };

  chrome.notifications.create(`cuw-${crossed}-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: account ? `Claude · ${account}` : 'Claude Usage Widget',
    message: messages[crossed],
    priority: crossed === 'critical' ? 2 : 1,
  });
  await store(crossed);
}

// Hesap hatırlatmaları, her biri bir kez (anahtar storage'da tutulur):
//  • bir hesabın kullanılmamış kotası 48 sa içinde sıfırlanıyor
//  • bir abonelik 3 gün içinde bitiyor
//  • kullanılmamış bir sıfırlama hakkı 3 gün içinde sona eriyor
//  • hibe API kredisi 3 gün içinde bitiyor
async function evaluateAccountNotifications() {
  const prefs = await getPrefs();
  if (!prefs.notificationsEnabled) return;

  const now = Date.now(), soon = 3 * 86400 * 1000;
  const records = visibleRecords(await getAccounts(), await getHiddenAccounts());
  const states = records.map(r => accountState(r, now));
  const shortName = shortNamer(records);
  const apiAllowed = await hasConsolePermission();
  const { notifiedOnce = {} } = await chrome.storage.local.get('notifiedOnce');
  let changed = false;

  const once = (key, message) => {
    if (notifiedOnce[key]) return;
    notifiedOnce[key] = now;
    changed = true;
    // Sabit kimlik: aynı anda iki yenileme olursa bildirim çoğalmaz, yenilenir.
    chrome.notifications.create(`cuw-${key}`, {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Claude Usage Widget',
      message,
      priority: 1,
    });
  };

  const sug = suggestion(states, now);
  if (sug) {
    once(`hint.${sug.record.email}.${Math.floor(sug.nextReset / 1000)}`,
         i18n('accounts_hint_other', [shortName(sug.record.email), Math.round(sug.weeklyLeft),
                                      formatRemaining(sug.nextReset, now)]));
  }
  for (const s of states) {
    const name = shortName(s.record.email);
    // Yalnız iptal edilmiş abonelik gerçekten biter; yenilenen yeniden ücretlenir.
    if (s.record.planRenews === false && s.planEnd != null && s.planEnd > now && s.planEnd - now <= soon) {
      once(`plan.${s.record.email}.${Math.floor(s.planEnd / 1000)}`,
           i18n('notification_plan_end', [name, shortDay(s.planEnd)]));
    }
    // Hibe API kredisi kullanılmadan bitmek üzere (izin geri alındıysa sorulmaz).
    for (const c of apiAllowed ? activeCredits(s.record, now) : []) {
      const end = c.expiresAt ? new Date(c.expiresAt).getTime() : null;
      if (end != null && end - now <= soon) {
        once(`api.${s.record.email}.${Math.floor(end / 1000)}`,
             i18n('notification_api_end', [name, money(c.remaining), shortDay(end)]));
      }
    }
    for (const g of s.grantsLeft) {
      const end = g.endsAt ? new Date(g.endsAt).getTime() : null;
      if (end != null && end - now <= soon) {
        once(`grant.${s.record.email}.${g.kind}.${Math.floor(end / 1000)}`,
             i18n('notification_grant_end', [name, grantText([g])]));
      }
    }
  }
  if (changed) await chrome.storage.local.set({ notifiedOnce });
}
