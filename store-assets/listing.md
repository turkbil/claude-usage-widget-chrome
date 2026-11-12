# Chrome Web Store Listing

> Diller: listing/ klasöründe (15 dil: en, tr, es, fr, de, it, ru, ja, ko, zh_TW, th, nl, cs, uk, ro).
> Bu dosya İngilizce ana metindir; dev console'a nasıl yapıştırılacağı: listing/README.md

## Item name
Claude Usage Widget

## Short description (max 132 chars)
Your weekly Claude limit in the toolbar: every account, Fable, free resets, reset times, forecast and alerts.

## Detailed description

How close am I to my weekly limit, and which account should I use first? The answer sits right in your toolbar.

▸ FEATURES
• Every account, remembered: each Claude account you sign in to in this browser, with e-mail, weekly % left, Fable left, reset day and time, monthly renewal or end date
• Accounts that are not signed in show the values from their last sign-in
• "Use this account first": a hint when an account's unused weekly quota resets within 48 hours
• Free limit resets (↺) granted by claude.ai: how many and until when. Shown only, never used
• Current account details: daily budget and where your week went (Claude Code / Chat / Cowork)
• Per-account notifications: usage thresholds, a plan that is ending, a free reset about to expire. Each sent once
• Hide or delete accounts you no longer need
• New icon: a weekly cycle
• Toolbar ring or number: weekly %, weekly left, 5-hour %, 5-hour left. Each can be hidden, shown as text or drawn as a colored ring
• Burn-rate forecast: "At this pace, 64 % by week end" or "Limit in ~1d 8h"
• 7-day trend chart in the popup
• Settings page, refresh every 30 s / 1 min / 5 min / 10 min
• 15 languages, auto-detected

▸ PRIVACY
• Account e-mails and free-reset info are kept only in this browser (chrome.storage.local) and never sent anywhere
• Requests go only to claude.ai, and only as GET: the extension reads, it never changes your account
• No telemetry, no analytics, no third-party services
• Never reads or stores your cookies: Chrome attaches them itself when calling claude.ai
• Open source, MIT license: github.com/turkbil/claude-usage-widget-chrome

▸ ALSO AVAILABLE
Native menu-bar / system-tray versions for macOS and Windows. Links are on the GitHub repo.

Built by Nurullah Okatan. Not affiliated with Anthropic. "Claude" is a trademark of Anthropic.

## Category
Productivity

## Single-purpose justification
The extension does one thing: display the user's own Claude weekly-usage metrics (already visible to them on claude.ai/settings/usage) in a small toolbar UI for at-a-glance access, for each Claude account the user signs in to in this browser.

## Permission justifications

storage — Save the user's display preferences (which metrics to show, colors, thresholds), a small local cache of the last fetched usage so the toolbar icon renders instantly when Chrome restarts, and the remembered accounts: e-mail, per-account usage values, reset times, plan dates and free-reset info. Everything stays in chrome.storage.local and is never transmitted.

alarms — Schedule the periodic background refresh and history sampling. Without alarms, the extension would either spam claude.ai or only update when the user manually opens the popup.

notifications — Send the optional alerts, off by default: usage thresholds (warn / alert / critical) per account, a reminder when an account's unused weekly quota resets within 48 hours, a cancelled plan ending within 3 days, and an unused free limit reset expiring within 3 days. Each is sent once.

Host permission claude.ai — The single reason this extension exists: read the user's own data from claude.ai with GET requests only (organizations, account, usage including free resets, rate limits, subscription details), using the cookies the user already has. The extension never writes to claude.ai and never reads, copies or transmits those cookies elsewhere.

Host permission api.github.com/repos/turkbil/* — Daily anonymous check for a new release of this extension. Can be disabled in settings; only the public Releases endpoint is contacted, no account info is sent.

> Not (13 Kas 2026): kodda (*.js) api.github.com çağrısı yok. Ya bu izin manifest'ten çıkarılmalı ya da sürüm denetimi koda eklenmeli; inceleme kullanılmayan izni reddedebilir.

## Privacy policy URL
https://github.com/turkbil/claude-usage-widget-chrome/blob/main/PRIVACY.md

## Support URL
https://github.com/turkbil/claude-usage-widget-chrome/issues
