// Fetches Claude usage from claude.ai. Because the extension runs inside
// Chrome with host_permissions to claude.ai, cookies are sent automatically
// — no decryption, no Keychain, no DPAPI. Beautiful.

export async function fetchSnapshot() {
  const orgId = await findOrgId();
  // Plan, görünen ad ve abonelik bitişi isteğe bağlı — paralel çek, hatayı yut.
  const [usage, account, plan, sub] = await Promise.all([
    // cedar_ember=1 ücretsiz sıfırlama haklarını da getirir (claude.ai/settings/usage
    // ne gösteriyorsa). Yalnız okuma: hiçbir hak kullanılmaz, POST atılmaz.
    getJson(`/api/organizations/${orgId}/usage?cedar_ember=1&skip_spend=1`),
    safeJson(`/api/account`),
    safeJson(`/api/organizations/${orgId}/rate_limits`),
    safeJson(`/api/organizations/${orgId}/subscription_details`),
  ]);

  if (!usage?.seven_day) throw new Error('error.api_parse');

  let sonnet = null;
  for (const k of ['seven_day_sonnet', 'seven_day_sonnet_only', 'seven_day_opus']) {
    const block = usage[k];
    if (block?.utilization != null) { sonnet = block.utilization; break; }
  }

  // Modele özel haftalık limitler (ör. "Fable") limits[] içinde kind "weekly_scoped" olarak gelir.
  const scopedLimits = [];
  for (const item of Array.isArray(usage.limits) ? usage.limits : []) {
    if (item?.kind !== 'weekly_scoped') continue;
    const name = item.scope?.model?.display_name || item.scope?.surface?.display_name;
    if (!name || typeof item.percent !== 'number') continue;
    scopedLimits.push({ name, pct: item.percent, resetsAt: isoOrNull(item.resets_at) });
  }

  // Haftanın nereye gittiği: Claude Code, Sohbetler, …
  const breakdown = [];
  for (const row of Array.isArray(usage.seven_day_breakdown?.rows) ? usage.seven_day_breakdown.rows : []) {
    if (typeof row?.display_name === 'string' && typeof row.percent === 'number')
      breakdown.push({ name: row.display_name, pct: row.percent });
  }

  // İlk modele özel limitin haftalık kotadan en çok alabileceği pay (ör. Fable %50).
  const share = Array.isArray(usage.weekly_scoped_shares)
    ? usage.weekly_scoped_shares[0]?.allowance_percent_of_weekly : null;
  const scopedShare = typeof share === 'number' ? share : null;

  // claude.ai'nin verdiği ücretsiz sıfırlama hakları; duraklatılmışlar atlanır.
  const grants = [];
  for (const g of Array.isArray(usage.cedar_ember?.grants) ? usage.cedar_ember.grants : []) {
    if (!g || g.paused === true) continue;
    const clears = Array.isArray(g.clears) ? g.clears : [];
    const kind = g.gives_back_weekly === true ? 'fable'
               : clears.includes('seven_day') ? 'weekly'
               : clears.includes('five_hour') ? 'session' : 'other';
    grants.push({
      kind,
      left:   Number(g.resets_left)  || 0,
      total:  Number(g.resets_total) || 0,
      endsAt: isoOrNull(g.ends_at),
    });
  }

  // Fatura yanıtından yalnız ödenmiş ayın bitiş tarihi ve o gün yenilenip
  // yenilenmeyeceği okunur; ödeme/kart alanları asla alınmaz, saklanmaz.
  const planEndsAt = isoOrNull(sub?.plan_ending_at) || isoOrNull(sub?.next_charge_at);
  // Aktif, sonraki ödemesi olan ve durdurulması planlanmamış abonelik yenilenir.
  // Fatura ucu yanıt vermezse bilinmiyor (null).
  const planRenews = sub && typeof sub === 'object'
    ? sub.status === 'active'
      && typeof sub.next_charge_at === 'string'
      && sub.scheduled_downgrade == null
      && sub.manual_pause_scheduled_at == null
    : null;

  const email = account?.email_address || null;

  return {
    weeklyUtilization:    usage.seven_day.utilization,
    weeklyResetsAt:       usage.seven_day.resets_at,
    fiveHourUtilization:  usage.five_hour?.utilization ?? null,
    fiveHourResetsAt:     usage.five_hour?.resets_at  ?? null,
    sonnetUtilization:    sonnet,
    displayName:          account?.display_name || account?.full_name || email,
    planLabel:            plan?.rate_limit_tier ? prettyPlanName(plan.rate_limit_tier) : null,
    email,
    scopedLimits,
    planEndsAt,
    planRenews,
    breakdown,
    scopedShare,
    grants,
    fetchedAt:            new Date().toISOString(),
  };
}

async function findOrgId() {
  const list = await getJson('/api/organizations');
  if (Array.isArray(list)) {
    // An account can also hold an API-only (Console) org, which answers
    // /usage with 403 — prefer the org that has the chat capability.
    const chat = list.find(o => o?.uuid && o.capabilities?.includes('chat'));
    if (chat) return chat.uuid;
    for (const o of list) if (o?.uuid) return o.uuid;
  }
  throw new Error('error.org_not_found');
}

async function getJson(path) {
  const resp = await fetch('https://claude.ai' + path, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    if (resp.status === 401 || resp.status === 403) throw new Error('error.no_session');
    throw new Error(`HTTP ${resp.status}: ${body.slice(0, 120)}`);
  }
  return resp.json();
}

async function safeJson(path) {
  try { return await getJson(path); } catch { return null; }
}

// ISO metni → düzgün ISO metni; yoksa ya da ayrıştırılamazsa null.
function isoOrNull(x) {
  if (typeof x !== 'string' || !x) return null;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function prettyPlanName(tier) {
  let s = tier.toLowerCase()
    .replace(/^default_claude_/, '')
    .replace(/^default_/, '');
  return s.split('_').map(p => {
    if (['max','pro','team','free','enterprise'].includes(p))
      return p[0].toUpperCase() + p.slice(1);
    return p;
  }).join(' ');
}
