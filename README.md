# Claude Usage Widget — Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-d68c45.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-v3-d68c45)](#)

**Chrome extension** that shows your Claude weekly usage in the browser toolbar — same data source as the [macOS](https://github.com/turkbil/claude-usage-widget) and [Windows](https://github.com/turkbil/claude-usage-widget-windows) widgets, but as a tiny ring next to the URL bar.

> 💻 **Three versions exist** — pick the one for your platform:
> - 🍎 **macOS** → [claude-usage-widget](https://github.com/turkbil/claude-usage-widget)
> - 🪟 **Windows** → [claude-usage-widget-windows](https://github.com/turkbil/claude-usage-widget-windows)
> - 🌐 **Chrome (any OS)** → you are here

Because the extension runs inside Chrome with cookie access already granted, this version is the **simplest to install** — no Keychain prompt, no DPAPI, no binary download. Just install from the Chrome Web Store (or load unpacked from this repo).

---

## What it does

- **Toolbar icon** shows your weekly usage % as either a number, a colored donut ring, or your custom emoji
- **Popup** with the full breakdown: weekly progress bars, 5-hour window, forecast, sparkline trend, account name + plan badge
- **Threshold notifications** when you cross configurable warn / alert / critical levels (Chrome native notifications)
- **Settings page** for per-metric display modes + colors, icon picker, refresh interval, notification thresholds
- **5 languages** auto-detected from your Chrome locale: English, Türkçe, Deutsch, Español, Français
- **No telemetry, no third-party services.** Cookies are sent automatically by Chrome on every request — the extension never reads or stores them.

---

## Install — unpacked (testing)

1. Clone this repo or download a release zip
2. Open `chrome://extensions/`
3. Toggle **Developer mode** in the top-right
4. Click **Load unpacked** and select this folder
5. Pin the icon to your toolbar via the puzzle-piece menu

## Install — from Chrome Web Store

> Pending review. Will be listed at https://chrome.google.com/webstore/detail/... once approved.

---

## Settings

Right-click the toolbar icon → **Options** (or open `chrome://extensions/` → Claude Usage Widget → Details → Extension options).

| Section | What's there |
|---|---|
| **Title content** | For each of Weekly %, Weekly remaining, 5-hour %, 5-hour remaining: hide / show as text / show as a donut. Pick from 8 swatch colors when donut. |
| **Icon** | Emoji preset (🤖🧠⚡✨◉●▲◐), custom emoji, donut summary, or no icon. |
| **Refresh interval** | 30 s · 1 min · 5 min · 10 min |
| **Notifications** | Toggle threshold alerts. Three configurable levels (warn / alert / critical) fire Chrome notifications when crossed. Each level fires once per week. |

---

## Permissions explained

| Permission | Why it's needed |
|---|---|
| `storage` | Save your settings + cached usage |
| `alarms` | Periodic refresh and history sampling |
| `notifications` | Threshold alerts |
| `host_permissions: claude.ai/*` | Send your existing cookie to claude.ai's usage API (no other site touched) |
| `host_permissions: api.github.com/repos/turkbil/*` | Daily version-check against this repo's Releases (disable-able) |

The extension never reads or transmits your cookies. Chrome attaches them automatically on `credentials:'include'` requests to claude.ai — same as any web page would.

---

## Privacy

- **No analytics, no telemetry.** Only outbound traffic is HTTPS to `claude.ai` (data) and once per day to `api.github.com` (release check).
- **No data sent to third parties.** No Sentry, no PostHog, no Mixpanel.
- **Local storage:** preferences + a 14-day usage history sample (capped at 4032 entries, ~70 KB).
- See [PRIVACY.md](PRIVACY.md) for the formal policy.

---

## Languages

Auto-detects Chrome's UI language and falls back to English.

| | |
|---|---|
| 🇬🇧 | English (default) |
| 🇹🇷 | Türkçe |
| 🇩🇪 | Deutsch (PR welcome) |
| 🇪🇸 | Español (PR welcome) |
| 🇫🇷 | Français (PR welcome) |

---

## Author

Built by **Nurullah Okatan** — [nurullah.net](https://www.nurullah.net) · [@nurullah](https://x.com/nurullah)

## License

[MIT](LICENSE) © Nurullah Okatan

Not affiliated with Anthropic. "Claude" is a trademark of Anthropic.
