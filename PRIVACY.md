# Privacy Policy — Claude Usage Widget

**Last updated:** 2026-05-13

This Chrome extension does **not** collect, store, or transmit any personal
data to any server we operate or any third party. The only outbound network
traffic is:

1. **`https://claude.ai/*`** — to fetch your own usage statistics. The extension
   uses cookies you already have for that domain; Chrome attaches them
   automatically. We never read, copy, or transmit those cookies anywhere.
2. **`https://api.github.com/repos/turkbil/...`** — once per day, to check
   whether a newer release exists. No identifying information is sent (no
   account ID, no email). This can be disabled in the extension settings.

### What we store locally

In your browser's local extension storage (`chrome.storage.local`):

- **Settings** — your display preferences (which metrics to show, colors,
  thresholds, etc.).
- **Cached snapshot** — your latest weekly usage %, plan label, display name
  (all read from claude.ai). Used to render the toolbar icon instantly when
  you open the popup. Never transmitted.
- **Usage history** — up to 14 days of weekly-utilization samples (a single
  number per sample, timestamped). Used to draw the trend chart. Never
  transmitted.

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
