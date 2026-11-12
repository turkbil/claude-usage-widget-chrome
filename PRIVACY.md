# Privacy Policy — Claude Usage Widget

**Last updated:** 2026-11-12

This Chrome extension does **not** collect, store, or transmit any personal
data to any server we operate or any third party. The only outbound network
traffic is:

1. **`https://claude.ai/*`** — read-only (GET) requests to fetch your own usage
   statistics. The extension uses cookies you already have for that domain;
   Chrome attaches them automatically. We never read, copy, or transmit those
   cookies anywhere.

### What we store locally

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
  popup. Account e-mails are kept only in `chrome.storage.local` on this
  device and are never sent anywhere. From the billing reply only the plan end
  date and whether the plan renews on it (status, next charge date, scheduled
  downgrade or pause) are read; only the date and a renews yes/no are stored.
  No payment or card details are read or stored.
- **Free resets** — the free limit resets claude.ai lists for each account
  (kind, how many are left, expiry date). The extension only reads them to
  show them; it never uses one. Kept only in `chrome.storage.local` on this
  device and never transmitted.
- **Notification state** — which one-time reminders were already shown and
  the last threshold level per account e-mail, so nothing is shown twice.
  Kept only locally.

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
