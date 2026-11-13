# Privacy Policy — Claude Usage Widget

**Last updated:** 2026-11-13

This Chrome extension does **not** collect, store, or transmit any personal
data to any server we operate or any third party. The only network traffic is:

1. **`https://claude.ai/*`** — read-only (GET) requests to fetch your own usage
   statistics. The extension uses cookies you already have for that domain;
   Chrome attaches them automatically. We never read, copy, or transmit those
   cookies anywhere.
2. **`https://platform.claude.com/*`** — only if you grant this **optional**
   permission (*Show API credits — allow access*). Read-only requests to your own
   developer console: account e-mail, organizations, prepaid credit balance and
   granted credits (GET), plus one cost report query for today's spend
   (`cost/query_bucketed`, sent as POST because the query is in the body; it
   changes nothing). No credit is ever claimed, no limit is reset, nothing is
   written. Without the permission, no request goes to this domain. You can
   revoke it any time in Chrome's extension settings.
3. **`http://127.0.0.1:9123/*`** — macOS only, and only if you grant this
   **optional** permission (*Get accounts from the Mac app*). One GET request to
   `/accounts` of the Claude Usage Widget Mac app **on this same computer**
   (127.0.0.1 never leaves your machine), to copy the accounts it already knows
   after a reinstall. Nothing is sent to it. Without the permission, no request
   is made.

### What we store

In your browser's local extension storage (`chrome.storage.local`):

- **Settings** — your display preferences (which metrics to show, colors,
  thresholds, etc.).
- **Cached snapshot** — your latest weekly usage %, plan label, display name,
  account e-mail and plan end date (all read from claude.ai). Used to render the toolbar icon instantly when
  you open the popup. Never transmitted.
- **Usage history** — up to 14 days of weekly-utilization samples (a single
  number per sample, timestamped, tagged with the account e-mail). Used to
  draw the trend chart. Never transmitted.
- **Accounts** — for every claude.ai account signed in to this browser: its
  e-mail address, plan label, weekly and per-model usage %, reset times and
  plan end date, as last seen. Used only for the *Accounts* section of the
  popup. Account e-mails are kept in `chrome.storage.local` and in the
  `chrome.storage.sync` backup below; we never receive them. From the billing reply only the plan end
  date and whether the plan renews on it (status, next charge date, scheduled
  downgrade or pause) are read; only the date and a renews yes/no are stored.
  No payment or card details are read or stored.
- **Free resets** — the free limit resets claude.ai lists for each account
  (kind, how many are left, expiry date). The extension only reads them to
  show them; it never uses one. Kept in `chrome.storage.local` and the
  `chrome.storage.sync` backup below; we never receive them.
- **API credits** — only with the optional permission above: for the account
  signed in to the developer console, its credit balance, granted credits
  (name, amount left, amount granted, expiry date), today's API spend and when
  they were read. Kept in `chrome.storage.local` and the `chrome.storage.sync`
  backup below (balance and credits, not today's spend); we never receive them.
- **Notification state** — which one-time reminders were already shown and
  the last threshold level per account e-mail, so nothing is shown twice.
  Kept only locally.

In Chrome's extension sync storage (`chrome.storage.sync`):

- **Account backup** — a small copy of the account records above (e-mail,
  plan, usage %, reset times, plan end date, free resets, API credit balance
  and when they were read) and the list of hidden accounts, so they come back
  after the extension is removed and installed again. **If Chrome sync is on,
  Chrome syncs this with your Google account** (Chrome's own extension sync);
  **we never see it** — it never reaches a
  server we operate. If Chrome sync is off it stays in this browser only. It
  holds no cookies, tokens, payment or card details.

### What we do NOT do

- ❌ No analytics SDK (Sentry, PostHog, Google Analytics, etc.)
- ❌ No telemetry of any kind
- ❌ No request to any third-party server we operate
- ❌ No selling, sharing, or licensing of your data
- ❌ No persistent IDs or fingerprints

### Source code

This extension is fully open-source under the [MIT License](LICENSE):
https://github.com/turkbil/claude-usage-widget-chrome — every line of code
that runs on your machine is in that repository.

### Contact

For privacy questions, open an issue at
https://github.com/turkbil/claude-usage-widget-chrome/issues
or email me at the address listed on https://www.nurullah.net.
