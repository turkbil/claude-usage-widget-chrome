// Hesap kayıtlarının yedeği ve geri yüklenmesi: eklenti kaldırılıp yeniden
// kurulunca chrome.storage.local silinir; hesaplar şu sırayla geri gelir:
//  1. chrome.storage.sync — her kayıt değişiminde küçük bir kopya yazılır.
//     Chrome eşitlemesi açıksa Google hesabıyla eşitlenir (başka bilgisayarlar da yazar),
//     kapalıysa yalnız bu tarayıcıda durur ve kaldırınca o da silinir.
//  2. Mac uygulaması — GET http://127.0.0.1:9123/accounts (yalnız bu bilgisayar,
//     isteğe bağlı izinle, yalnız kullanıcı düğmeye basınca istenir).
//  3. İkisi de yoksa: hesaplara yeniden giriş.
// Hepsi yalnız okuma: buradan hiçbir sunucuya veri gönderilmez.
import { getAccounts, getHiddenAccounts, getCache } from './prefs.js';
import { toMs } from './accounts.js';

export const MAC_ORIGINS = ['http://127.0.0.1:9123/*'];
const MAC_URL = 'http://127.0.0.1:9123/accounts';
const PREFIX = 'acct:';
const HIDDEN_KEY = 'hidden';
const ITEM_MAX = 8000;        // QUOTA_BYTES_PER_ITEM 8192, payı bırakılır
const TOTAL_MAX = 100000;     // QUOTA_BYTES 102400
const STAMP_EVERY = 3600e3;   // yalnız okuma zamanı değiştiyse en çok saatte bir yazılır

const SYNC_FIELDS = ['email', 'plan', 'weeklyPct', 'weeklyResetsAt', 'scoped', 'planEndsAt', 'planRenews',
  'grants', 'grantsSeenAt', 'seenAt', 'source', 'apiTotal', 'apiCredits', 'apiSeenAt'];

// Alan grupları: her grup kendi okuma zamanıyla karşılaştırılır, daha yeni olan kazanır.
const GROUPS = [
  { name: 'usage',  at: r => (r.source === 'note' || r.weeklyPct != null || r.weeklyResetsAt != null) ? toMs(r.seenAt) : null,
    fields: ['plan', 'weeklyPct', 'weeklyResetsAt', 'scoped', 'planEndsAt', 'planRenews', 'seenAt', 'source'] },
  { name: 'grants', at: r => (Array.isArray(r.grants) ? toMs(r.grantsSeenAt ?? r.seenAt) : null),
    fields: ['grants', 'grantsSeenAt'] },
  { name: 'api',    at: r => (typeof r.apiTotal === 'number' ? toMs(r.apiSeenAt) : null),
    fields: ['apiTotal', 'apiCredits', 'apiSeenAt', 'apiToday', 'apiTodayKey'] },
];

// storage.sync yoksa (eski ya da kısıtlı Chromium tarayıcı) yedek atlanır; local yine çalışır.
const syncArea = () => { try { return chrome.storage.sync || null; } catch { return null; } };

// Saniye (Mac: Unix zamanı), milisaniye ya da ISO metin → ISO metin.
function iso(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && isFinite(v)) return new Date(v < 1e11 ? v * 1000 : v).toISOString();
  if (typeof v === 'string') return isNaN(new Date(v).getTime()) ? null : v;
  return null;
}
const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
const arr = v => (Array.isArray(v) ? v : []);

// Sync ya da Mac kaydını Chrome biçimine çevirir (bilinmeyen alanlar atılır).
export function normalize(r) {
  const email = String(r?.email || '').trim().toLowerCase();
  if (!email) return null;
  const out = {
    email,
    plan:           typeof r.plan === 'string' ? r.plan : null,
    weeklyPct:      num(r.weeklyPct),
    weeklyResetsAt: iso(r.weeklyResetsAt),
    scoped:         arr(r.scoped).map(s => ({ name: String(s?.name ?? ''), pct: Number(s?.pct) || 0, resetsAt: iso(s?.resetsAt) })),
    planEndsAt:     iso(r.planEndsAt),
    planRenews:     typeof r.planRenews === 'boolean' ? r.planRenews : null,
    grants:         Array.isArray(r.grants)
      ? r.grants.map(g => ({ kind: String(g?.kind ?? 'other'), left: Number(g?.left) || 0, total: Number(g?.total) || 0, endsAt: iso(g?.endsAt) }))
      : null,
    grantsSeenAt:   iso(r.grantsSeenAt),
    seenAt:         iso(r.seenAt),
    source:         typeof r.source === 'string' ? r.source : 'live',
  };
  if (typeof r.apiTotal === 'number') {
    out.apiTotal = r.apiTotal;
    out.apiCredits = arr(r.apiCredits).map(c => ({ name: String(c?.name ?? ''), remaining: Number(c?.remaining) || 0,
                                                  granted: Number(c?.granted) || 0, expiresAt: iso(c?.expiresAt) }));
    out.apiSeenAt = iso(r.apiSeenAt);
    if (typeof r.apiToday === 'number' && typeof r.apiTodayKey === 'string') { out.apiToday = r.apiToday; out.apiTodayKey = r.apiTodayKey; }
  }
  return out;
}

// Aynı e-postada her alan grubu için daha yeni okunan alınır. `liveEmail` (Chrome'da şu an
// oturumu açık hesap) için Chrome'un kendi kullanım ve hak verisi her zaman kazanır.
export function mergeAccounts(local, incoming, liveEmail = '') {
  const list = local.map(r => ({ ...r }));
  let added = 0, updated = 0;
  for (const raw of incoming) {
    const inc = normalize(raw);
    if (!inc) continue;
    const i = list.findIndex(a => a.email === inc.email);
    if (i < 0) { list.push(inc); added++; continue; }
    const cur = list[i];
    let changed = false;
    for (const g of GROUPS) {
      const lt = g.at(cur), it = g.at(inc);
      if (it == null) continue;
      if (lt != null && (it <= lt || (inc.email === liveEmail && g.name !== 'api'))) continue;
      for (const f of g.fields) {
        if (inc[f] === undefined) delete cur[f]; else cur[f] = inc[f];
      }
      changed = true;
    }
    if (changed) updated++;
  }
  return { list, added, updated };
}

const liveEmail = async () => String((await getCache())?.snapshot?.email || '').toLowerCase();

const bytes = (k, v) => new TextEncoder().encode(k + JSON.stringify(v)).length;

// Sync'e yazılacak küçük kayıt; 8 KB'ye sığmazsa önce hak ve kredi listeleri kısalır.
function compact(r) {
  const c = {};
  for (const f of SYNC_FIELDS) if (r[f] !== undefined) c[f] = r[f];
  const key = PREFIX + r.email;
  for (const n of [8, 4, 1, 0]) {
    if (bytes(key, c) <= ITEM_MAX) break;
    if (Array.isArray(c.grants)) c.grants = c.grants.slice(0, n);
    if (Array.isArray(c.apiCredits)) c.apiCredits = c.apiCredits.slice(0, n);
    if (Array.isArray(c.scoped)) c.scoped = c.scoped.slice(0, Math.max(1, n));
  }
  return bytes(key, c) <= ITEM_MAX ? c : null;
}

// İki kopya aynı mı: okuma zamanları dışındaki her şey eşit ve zamanlar 1 saatten yakın.
function same(a, b) {
  if (!a || !b) return false;
  const strip = o => { const x = { ...o }; delete x.seenAt; delete x.grantsSeenAt; delete x.apiSeenAt; return JSON.stringify(x); };
  if (strip(a) !== strip(b)) return false;
  return ['seenAt', 'grantsSeenAt', 'apiSeenAt'].every(k => {
    const x = toMs(a[k]), y = toMs(b[k]);
    return x === y || (x != null && y != null && Math.abs(x - y) < STAMP_EVERY);
  });
}

const union = (...ls) => [...new Set(ls.flat().map(e => String(e).toLowerCase()).filter(Boolean))].sort();

// Sync'teki kopyayı yerele işler: yeni hesaplar eklenir, aynı hesapta daha yeni gruplar alınır;
// gizlenenler birleşimdir. Yalnız bir şey değiştiyse yerel yazılır. Sonra yedek açılır.
export async function restoreFromSync() {
  const area = syncArea();
  try {
    if (!area) return { added: 0, updated: 0 };
    const all = await area.get(null);
    const recs = Object.entries(all || {}).filter(([k]) => k.startsWith(PREFIX)).map(([, v]) => v);
    const local = await getAccounts();
    const m = mergeAccounts(local, recs, await liveEmail());
    const patch = {};
    if (m.added || m.updated) patch.accounts = m.list;
    const hidden = await getHiddenAccounts();
    const h = union(hidden, arr(all?.[HIDDEN_KEY]));
    if (h.length !== hidden.length) patch.hiddenAccounts = h;
    if (Object.keys(patch).length) await chrome.storage.local.set(patch);
    return { added: m.added, updated: m.updated };
  } catch {
    return { added: 0, updated: 0 };
  } finally {
    try { await chrome.storage.local.set({ syncChecked: true }); } catch {}
  }
}

// Yerel kayıtları sync'e yazar. Üzerine yazmaz: sync'teki kopya (başka bilgisayardan da gelmiş
// olabilir) önce aynı kuralla birleştirilir, yalnız değişen hesaplar tek `set` ile yazılır.
// Kota aşılırsa (QUOTA_BYTES / MAX_WRITE_OPERATIONS_*) sessizce atlanır; sonraki değişimde yeniden denenir.
export async function backupToSync() {
  const area = syncArea();
  if (!area) return { written: 0 };
  try {
    const { syncChecked } = await chrome.storage.local.get('syncChecked');
    if (!syncChecked) return { written: 0 };   // geri yükleme bitmeden yazılmaz (boş kurulum sync'i ezmesin)
    const all = (await area.get(null)) || {};
    const local = await getAccounts();
    const items = {};
    let total = 0;
    // Yeni okunan önce: toplam kota dolarsa en eski hesaplar dışarıda kalır.
    const sorted = [...local].sort((a, b) => (toMs(b.seenAt) ?? 0) - (toMs(a.seenAt) ?? 0));
    for (const r of sorted) {
      const key = PREFIX + r.email;
      const prev = all[key];
      // Kanonik biçim (eksik alan = null): «yok» ile «null» farkı boşuna yazma saymasın.
      const merged = normalize(prev ? mergeAccounts([prev], [r]).list[0] : r);
      const c = merged && compact(merged);
      if (!c) continue;
      total += bytes(key, c);
      if (total > TOTAL_MAX) break;
      const was = prev && normalize(prev);
      if (!same(was && compact(was), c)) items[key] = c;
    }
    const hidden = union(arr(all[HIDDEN_KEY]), await getHiddenAccounts());
    if (JSON.stringify(hidden) !== JSON.stringify(union(arr(all[HIDDEN_KEY])))) items[HIDDEN_KEY] = hidden;
    const n = Object.keys(items).length;
    if (n) await area.set(items);
    return { written: n };
  } catch {
    return { written: 0 };
  }
}

// Silinen hesap sync'ten de silinir (yoksa sonraki geri yüklemede geri gelirdi).
export async function forgetInSync(email) {
  const area = syncArea();
  if (!area) return;
  try {
    const e = String(email || '').toLowerCase();
    const { [HIDDEN_KEY]: h = [] } = await area.get(HIDDEN_KEY);
    await area.remove(PREFIX + e);
    if (arr(h).includes(e)) await area.set({ [HIDDEN_KEY]: arr(h).filter(x => x !== e) });
  } catch {}
}

// «Gizlenen hesapları göster»: birleşim listesi sync'te de boşaltılır.
export async function unhideAllInSync() {
  const area = syncArea();
  if (!area) return;
  try { await area.set({ [HIDDEN_KEY]: [] }); } catch {}
}

// «Mac uygulamasından al» yalnız macOS'ta gösterilir.
export function isMac() {
  try {
    const p = navigator.userAgentData?.platform || navigator.platform || '';
    return /mac/i.test(p);
  } catch { return false; }
}

export async function hasMacPermission() {
  try { return await chrome.permissions.contains({ origins: MAC_ORIGINS }); } catch { return false; }
}

// Mac uygulamasının hesaplarını okur ve birleştirir. Uç yoksa ya da kapalıysa { ok: false }.
export async function importFromMac() {
  if (!(await hasMacPermission())) return { ok: false, reason: 'permission' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  try {
    const res = await fetch(MAC_URL, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: ctl.signal });
    if (!res.ok) return { ok: false, reason: 'http' };
    const list = await res.json();
    if (!Array.isArray(list)) return { ok: false, reason: 'format' };
    const m = mergeAccounts(await getAccounts(), list, await liveEmail());
    if (m.added || m.updated) await chrome.storage.local.set({ accounts: m.list });
    return { ok: true, count: list.length, added: m.added, updated: m.updated };
  } catch {
    return { ok: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
