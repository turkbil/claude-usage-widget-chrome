// Thin wrapper around chrome.storage.local for preferences + cached snapshot.

export const defaultPrefs = {
  // §01 title content modes: 'hidden' | 'text' | 'donut'
  weeklyPctMode:    'text',
  weeklyTimeMode:   'hidden',
  fiveHourPctMode:  'hidden',
  fiveHourTimeMode: 'hidden',

  // colors
  weeklyPctColor:    '#d68c45',
  weeklyTimeColor:   '#d68c45',
  fiveHourPctColor:  '#5dc97f',
  fiveHourTimeColor: '#5dc97f',

  // §02 icon
  iconType:  'emoji',   // 'emoji' | 'custom' | 'donut' | 'none'
  iconValue: '🤖',

  // §06 refresh interval
  pollIntervalSec: 60,

  // §05 notifications
  notificationsEnabled: false,
  warnThreshold:     50,
  alertThreshold:    75,
  criticalThreshold: 90,
  lastNotifiedLevel: '',
};

export async function getPrefs() {
  const stored = await chrome.storage.local.get('prefs');
  return { ...defaultPrefs, ...(stored.prefs || {}) };
}

export async function setPrefs(partial) {
  const current = await getPrefs();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ prefs: next });
  return next;
}

export async function getCache() {
  const { cache } = await chrome.storage.local.get('cache');
  return cache || null;
}

export async function setCache(cache) {
  await chrome.storage.local.set({ cache });
}

export async function getHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  return history;
}
