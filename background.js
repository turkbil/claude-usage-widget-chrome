import { fetchSnapshot } from './api.js';
import { defaultPrefs, getPrefs, setPrefs, getCache, setCache } from './prefs.js';
import { drawIcon } from './icon-draw.js';

const ALARM_REFRESH = 'cuw-refresh';
const ALARM_HISTORY = 'cuw-history';

chrome.runtime.onInstalled.addListener(async () => {
  const prefs = await getPrefs();
  scheduleRefresh(prefs.pollIntervalSec);
  chrome.alarms.create(ALARM_HISTORY, { periodInMinutes: 5 });
  await refresh();
});

chrome.runtime.onStartup.addListener(async () => {
  const prefs = await getPrefs();
  scheduleRefresh(prefs.pollIntervalSec);
  await refresh();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_REFRESH) await refresh();
  if (alarm.name === ALARM_HISTORY) await recordHistory();
});

// React to settings changes from the options page.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'prefs-changed') {
      const prefs = await getPrefs();
      scheduleRefresh(prefs.pollIntervalSec);
      await updateBadge();   // re-render with new settings
    } else if (msg?.type === 'refresh-now') {
      await refresh();
      sendResponse({ ok: true });
    } else if (msg?.type === 'get-snapshot') {
      const cache = await getCache();
      sendResponse(cache);
    }
  })();
  return true;   // keep channel open for async sendResponse
});

function scheduleRefresh(sec) {
  chrome.alarms.clear(ALARM_REFRESH);
  chrome.alarms.create(ALARM_REFRESH, { periodInMinutes: Math.max(0.5, sec / 60) });
}

async function refresh() {
  try {
    const snap = await fetchSnapshot();
    await setCache({ snapshot: snap, error: null, fetchedAt: Date.now() });
    await updateBadge();
    await evaluateNotifications(snap);
  } catch (err) {
    const cache = await getCache();
    await setCache({ ...cache, error: String(err.message || err), fetchedAt: Date.now() });
    await updateBadge();
  }
}

async function recordHistory() {
  const { snapshot } = (await getCache()) || {};
  if (!snapshot) return;
  const { history = [] } = await chrome.storage.local.get('history');
  history.push({ t: Date.now() / 1000, v: snapshot.weeklyUtilization });
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
    chrome.action.setTitle({ title: `Claude: ${pct}% this week` });
  } else if (error) {
    chrome.action.setTitle({ title: `Claude Usage Widget — ${error}` });
  }

  // Render the icon
  const imageData = drawIcon(snapshot, prefs, !!error && !snapshot);
  chrome.action.setIcon({ imageData });
}

async function evaluateNotifications(snap) {
  const prefs = await getPrefs();
  if (!prefs.notificationsEnabled) return;

  const pct = Math.round(snap.weeklyUtilization);
  // Reset when we drop below warn — re-arm for next cycle.
  if (pct < prefs.warnThreshold && prefs.lastNotifiedLevel) {
    await setPrefs({ lastNotifiedLevel: '' });
    return;
  }

  const newLevel =
    pct >= prefs.criticalThreshold ? 'critical' :
    pct >= prefs.alertThreshold    ? 'alert'    :
    pct >= prefs.warnThreshold     ? 'warn'     : null;
  if (!newLevel) return;

  const rank = { '': 0, warn: 1, alert: 2, critical: 3 };
  if (rank[newLevel] <= rank[prefs.lastNotifiedLevel || '']) return;

  const messages = {
    warn:     chrome.i18n.getMessage('notification_warn',     [`${pct}`]),
    alert:    chrome.i18n.getMessage('notification_alert',    [`${pct}`]),
    critical: chrome.i18n.getMessage('notification_critical', [`${pct}`]),
  };

  chrome.notifications.create(`cuw-${newLevel}-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'Claude Usage Widget',
    message: messages[newLevel],
    priority: newLevel === 'critical' ? 2 : 1,
  });
  await setPrefs({ lastNotifiedLevel: newLevel });
}
