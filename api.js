// Fetches Claude usage from claude.ai. Because the extension runs inside
// Chrome with host_permissions to claude.ai, cookies are sent automatically
// — no decryption, no Keychain, no DPAPI. Beautiful.

export async function fetchSnapshot() {
  const orgId = await findOrgId();
  // Plan + display name are optional — fetch in parallel, ignore failures.
  const [usage, account, plan] = await Promise.all([
    getJson(`/api/organizations/${orgId}/usage`),
    safeJson(`/api/account`),
    safeJson(`/api/organizations/${orgId}/rate_limits`),
  ]);

  if (!usage?.seven_day) throw new Error('error.api_parse');

  let sonnet = null;
  for (const k of ['seven_day_sonnet', 'seven_day_sonnet_only', 'seven_day_opus']) {
    const block = usage[k];
    if (block?.utilization != null) { sonnet = block.utilization; break; }
  }

  return {
    weeklyUtilization:    usage.seven_day.utilization,
    weeklyResetsAt:       usage.seven_day.resets_at,
    fiveHourUtilization:  usage.five_hour?.utilization ?? null,
    fiveHourResetsAt:     usage.five_hour?.resets_at  ?? null,
    sonnetUtilization:    sonnet,
    displayName:          account?.display_name || account?.full_name || account?.email_address || null,
    planLabel:            plan?.rate_limit_tier ? prettyPlanName(plan.rate_limit_tier) : null,
    fetchedAt:            new Date().toISOString(),
  };
}

async function findOrgId() {
  const list = await getJson('/api/organizations');
  if (Array.isArray(list)) {
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
