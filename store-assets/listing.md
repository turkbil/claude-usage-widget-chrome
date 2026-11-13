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
• Account e-mails and free-reset info stay in this browser (chrome.storage.local, plus a chrome.storage.sync backup that Chrome syncs with your Google account if sync is on) and are never sent to us or anyone else
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

storage — Save the user's display preferences (which metrics to show, colors, thresholds), a small local cache of the last fetched usage so the toolbar icon renders instantly when Chrome restarts, and the remembered accounts: e-mail, per-account usage values, reset times, plan dates and free-reset info, in chrome.storage.local. A small copy of the account records and the hidden-account list is also kept in chrome.storage.sync so the accounts come back after a reinstall; if the user has Chrome sync on, Chrome syncs it with their Google account. The developer never receives any of it; nothing is sent to a server we operate.

alarms — Schedule the periodic background refresh and history sampling. Without alarms, the extension would either spam claude.ai or only update when the user manually opens the popup.

notifications — Send the optional alerts, off by default: usage thresholds (warn / alert / critical) per account, a reminder when an account's unused weekly quota resets within 48 hours, a cancelled plan ending within 3 days, an unused free limit reset expiring within 3 days, and a granted API credit expiring within 3 days (only with the optional console permission). Each is sent once.

Host permission claude.ai — The single reason this extension exists: read the user's own data from claude.ai with GET requests only (organizations, account, usage including free resets, rate limits, subscription details), using the cookies the user already has. The extension never writes to claude.ai and never reads, copies or transmits those cookies elsewhere.

Optional host permission platform.claude.com — Optional, requested only when the user clicks "Show API credits — allow access" (popup or Settings); the extension works fully without it. Used to show the user's own developer-console API credit balance, granted credits and their expiry date, and today's API spend. Read-only: GET requests for account, organizations and prepaid credits, plus one cost report query (POST body, read-only) for today's spend. It never claims credits, resets limits or writes anything; the values stay in this browser (chrome.storage.local and the chrome.storage.sync account backup) and are never sent to the developer. If the permission is not granted or is revoked, no request is made to this domain.

Optional host permission http://127.0.0.1:9123 — Optional, macOS only, requested only when the user clicks "Get accounts from the Mac app" (popup, shown only when no other account is known, e.g. after a reinstall) or "Import accounts from the Mac app" (Settings). 127.0.0.1 is this computer: one GET request to /accounts of the user's own Claude Usage Widget Mac app, which returns the accounts it already knows, so the user does not have to sign in to every account again. Nothing is sent to it; the records are merged into chrome.storage.local. If the app is not running or its Local HTTP endpoint is off, the extension shows "Mac app not found" and works as before. Without the permission no request is made.

## Privacy policy URL
https://github.com/turkbil/claude-usage-widget-chrome/blob/main/PRIVACY.md

## Support URL
https://github.com/turkbil/claude-usage-widget-chrome/issues
