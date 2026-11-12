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
    // Bu sefer okunmadıysa (null) bilinen son haklar ve tarihleri korunur, 0'a dönmez.
    grants:         Array.isArray(snap.grants) ? snap.grants : (i >= 0 ? accounts[i].grants ?? null : null),
    grantsSeenAt:   Array.isArray(snap.grants) ? snap.fetchedAt : (i >= 0 ? accounts[i].grantsSeenAt ?? null : null),
    seenAt:         snap.fetchedAt,
    source:         'live',
  };
  // Konsoldan okunan API kredisi ayrı yazılır (upsertAPI); burada korunur.
  if (i >= 0) for (const k of API_FIELDS) if (accounts[i][k] !== undefined) rec[k] = accounts[i][k];
  if (i >= 0) accounts[i] = rec; else accounts.push(rec);
  await chrome.storage.local.set({ accounts });
}

const API_FIELDS = ['apiTotal', 'apiCredits', 'apiSeenAt', 'apiToday', 'apiTodayKey'];

// Konsolda (platform.claude.com) oturum açık hesabın API kredisi; claude.ai'deki
// hesaptan farklı olabilir. Kayıt yoksa verisiz bir kayıt açılır («giriş yapılmadı»).
// apiToday yalnız apiTodayKey (UTC günü) gününde sayılır.
export async function upsertAPI({ email, total, credits, today }, at, dayKey) {
  const e = String(email || '').toLowerCase();
  if (!e) return;
  const accounts = await getAccounts();
  let rec = accounts.find(a => a.email === e);
  if (!rec) {
    rec = { email: e, plan: null, weeklyPct: null, weeklyResetsAt: null, scoped: [],
            planEndsAt: null, planRenews: null, grants: null, seenAt: at, source: 'api' };
    accounts.push(rec);
  }
  rec.apiTotal = total;
  rec.apiCredits = Array.isArray(credits) ? credits : [];
  rec.apiSeenAt = at;
  if (typeof today === 'number') { rec.apiToday = today; rec.apiTodayKey = dayKey; }
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

// «Sıfırlama haklarını göster» açık mı (her hesabın altındaki ayrıntı satırı).
export async function getGrantsExpanded() {
  const { grantsExpanded = false } = await chrome.storage.local.get('grantsExpanded');
  return grantsExpanded === true;
}

export async function setGrantsExpanded(on) {
  await chrome.storage.local.set({ grantsExpanded: !!on });
}

// Kaydı siler ve gizli listesinden de çıkarır: hesap bir sonraki girişte sıfırdan eklenir.
export async function removeAccount(email) {
  const e = String(email || '').toLowerCase();
  const accounts = (await getAccounts()).filter(a => a.email !== e);
  const hiddenAccounts = (await getHiddenAccounts()).filter(h => h !== e);
  await chrome.storage.local.set({ accounts, hiddenAccounts });
}
