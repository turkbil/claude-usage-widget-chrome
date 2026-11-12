// Thin wrapper around chrome.storage.local for preferences + cached snapshot.

export const defaultPrefs = {
  // §01 toolbar weekly-% display mode: 'hidden' | 'text' | 'donut'
  weeklyPctMode:    'text',
  weeklyPctColor:    '#d68c45',

  // §02 icon — default to the donut ring: always renders in the MV3 worker
  // and shows the % at a glance. Emoji stays selectable in Settings.
  iconType:  'donut',   // 'emoji' | 'custom' | 'donut' | 'none'
  iconValue: '🤖',

  // §06 refresh interval
  pollIntervalSec: 60,

  // §05 notifications
  notificationsEnabled: false,
  warnThreshold:     50,
  alertThreshold:    75,
  criticalThreshold: 90,
  lastNotifiedLevel: '',

  // Araç çubuğu ipucuna «⏳ claude1» (sıradaki hesap) eklensin mi; varsayılan kapalı.
  toolbarHint: false,
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

// Bu tarayıcıda görülen her claude.ai hesabı, küçük harf e-postaya göre.
// Yalnız oturum açık hesap canlı okunabilir; diğerleri son girişteki değerleri
// tutar. Yalnız yerelde saklanır, hiçbir yere gönderilmez.
export async function getAccounts() {
  const { accounts = [] } = await chrome.storage.local.get('accounts');
  return Array.isArray(accounts) ? accounts : [];
}

export async function upsertAccount(snap) {
  const email = (snap?.email || '').toLowerCase();
  if (!email) return;
  const accounts = await getAccounts();
  const i = accounts.findIndex(a => a.email === email);
  const rec = {
    email,
    plan:           snap.planLabel ?? null,
    weeklyPct:      snap.weeklyUtilization ?? null,
    weeklyResetsAt: snap.weeklyResetsAt ?? null,
    scoped:         Array.isArray(snap.scopedLimits) ? snap.scopedLimits : [],
    // subscription_details yanıt vermezse bilinen son bitiş tarihi korunur.
    planEndsAt:     snap.planEndsAt ?? (i >= 0 ? accounts[i].planEndsAt : null) ?? null,
    // true = o gün yenilenir · false = iptal edilmiş, gerçekten bitiyor · null = bilinmiyor.
    planRenews:     typeof snap.planRenews === 'boolean' ? snap.planRenews
                  : (i >= 0 && typeof accounts[i].planRenews === 'boolean' ? accounts[i].planRenews : null),
    // Elde kalan ücretsiz sıfırlama hakları (yalnız okunur, yerelde tutulur).
    grants:         Array.isArray(snap.grants) ? snap.grants : [],
    seenAt:         snap.fetchedAt,
    source:         'live',
  };
  if (i >= 0) accounts[i] = rec; else accounts.push(rec);
  await chrome.storage.local.set({ accounts });
}

// Listeden gizlenen hesaplar (küçük harf e-posta). Kayıt saklanır; yeniden
// giriş yapılsa da gizli kalır, «Gizlenen hesapları göster» hepsini geri getirir.
export async function getHiddenAccounts() {
  const { hiddenAccounts = [] } = await chrome.storage.local.get('hiddenAccounts');
  return Array.isArray(hiddenAccounts) ? hiddenAccounts : [];
}

export async function hideAccount(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return;
  const hidden = await getHiddenAccounts();
  if (!hidden.includes(e)) await chrome.storage.local.set({ hiddenAccounts: [...hidden, e].sort() });
}

export async function unhideAllAccounts() {
  await chrome.storage.local.set({ hiddenAccounts: [] });
}

// Kaydı siler ve gizli listesinden de çıkarır: hesap bir sonraki girişte sıfırdan eklenir.
export async function removeAccount(email) {
  const e = String(email || '').toLowerCase();
  const accounts = (await getAccounts()).filter(a => a.email !== e);
  const hiddenAccounts = (await getHiddenAccounts()).filter(h => h !== e);
  await chrome.storage.local.set({ accounts, hiddenAccounts });
}
