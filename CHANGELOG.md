# Changelog

All notable changes to this project are documented here.

## [1.3.0] — 2026-11-13

Popup matches the macOS widget 1.5.7.

### Added
- **API credits per account** (developer console, platform.claude.com) behind an
  **optional permission**: nothing is requested from the console until the user
  allows it (*Show API credits — allow access*, in the popup and in Settings).
  Shows the balance, granted credits and their expiry (`$4.42 / $200 granted ·
  until Nov 16`, red within 3 days) and **today's API spend** (UTC day) per
  account, plus today's total of all accounts in the expanded header
  (`TODAY API $1.20 · 2 ACCOUNTS`). Read for the account signed in to the console,
  at most every 10 minutes or right away with ⟳. Read-only: GET requests and the
  console's cost report query; nothing is claimed, reset or changed. Without the
  permission (or after it is revoked) the row says *not allowed* and the total is
  hidden; everything else works as before.
- **Expanded part = 4-row label | value table** under every account, labels
  under the account name and values from the bar column: Weekly resets ·
  Fable resets · API credit · Last read (resets and API separately, so old
  numbers never look live). The old `↺ WEEKLY RESETS` / `↺ FABLE RESETS`
  headings are gone.
- **WEEK and FABLE % side by side** (the LEFT column is split). The list now shows
  **% used**, like the bars at the top (it used to show % left, so the same
  account read 3 % above and 97 % below); the bar fills with use and takes the
  same colours. Each rolls over on its own when its reset time passes (`0%*`).
  Fable without its own date follows the weekly reset.
- One-time notification when a granted API credit expires within 3 days.

### Changed
- Accounts that were never read (typed in by hand, or known only from the
  console) show no numbers: empty bar, `—`, a faint *not signed in* across the
  RESETS and MONTH cells; they are left out of the 48-hour hint and sorted last.
- Popup width 470 → 520 px. Money in the browser's language (`Intl`, USD).
- Expired API credit counts as 0.

### Fixed
- If the free-reset request is refused, the extension falls back to plain
  `/usage` and keeps the last known resets (and their read date) instead of 0.

## [1.2.0] — 2026-11-13

### Added
- **Accounts section** in the popup. Every claude.ai account signed in to this
  browser is remembered locally (e-mail, weekly and per-model % left, reset
  day and time, plan end date, free resets on hand). Accounts that are not
  signed in show their last-seen values, rolled forward when a weekly reset
  has passed since (marked `*`).
- **One-line account rows** on a shared column grid with aligned headings
  (ACCOUNTS · LEFT · RESETS · MONTH): full e-mail (accounts may be on
  different domains), %-left bar, reset day and time, monthly date. Order: accounts with quota left by
  soonest reset, then full ones, then accounts without data. The signed-in
  account is bold on a soft band with `●` in a fixed 14 px slot, so every name
  starts at the same x; names never wrap (they end in `…`). Details (e-mail,
  weekly, Fable, plan, free resets, last data time) are in the row tooltip.
- **Show free resets** (`▸` / `▾` under the list, always shown when there is
  an account, remembered): adds the headings `↺ WEEKLY RESETS` (under the bar
  and LEFT columns) and `↺ FABLE RESETS` (under RESETS and MONTH), and under
  every account — the signed-in one too — a second table line with one cell
  per kind: total on hand and the earliest end date (`↺ 1 · until Dec 11`),
  a faint `0` when none, a faint *unknown* until the account has been read.
  Weekly and Fable never mix; other kinds appear only in the tooltip, which
  lists each reset on its own line. The line hugs its account and is set off
  from the next one.
- **48-hour hint** (one line): names the account (full e-mail) whose unused weekly quota
  (≥ 5 %) resets within 48 hours, soonest first. Optionally (Settings → Icon,
  off by default) the toolbar tooltip adds `⏳ name` when that account is not
  the signed-in one.
- **Hide / Delete an account**: click an account row and choose in a small
  sheet inside the popup. *Hide* keeps the record but drops it from the list,
  the 48-hour hint, the toolbar tooltip and notifications; *Show hidden
  accounts (N)* under the list brings them all back. *Delete* removes the
  record (it is added again from scratch on the next sign-in).
- **Details block** for the signed-in account: reset day and time, plan end or
  renewal date, free resets on hand, daily budget (left ÷ days to reset) and
  where the week went (`seven_day_breakdown`).
- **Free resets**: `usage?cedar_ember=1&skip_spend=1` (GET only) lists the
  limit resets claude.ai hands out; they are shown, never used.
- **Account notifications**, each sent once: unused quota resetting within
  48 hours, a cancelled plan ending within 3 days, an unused free reset
  expiring within 3 days.
- **Per-model weekly limit** (e.g. *Fable*, from `limits[]`) replaces the Sonnet
  row when present, with its share of the weekly limit (`Fable · max 50%`).

### Changed
- Popup is 470 px wide (as on the Mac); the header shows the account e-mail.
  With 7 accounts it stays under Chrome's 600 px popup height while the free
  resets are collapsed; line height is fixed at 1.2 so Japanese and Thai
  fallback fonts no longer stretch rows.
- Free resets of the same kind are grouped everywhere (details block, row
  tooltip): count summed, earliest end date shown.
- Reset day/time and dates are rounded to the nearest minute before
  formatting: a `resets_at` of `…13:59:59.9Z` now reads *14:00* (as on the
  Mac) in the details block, the RESETS column and the tooltip.
  Order: bars → trend chart → forecast → details → 5-hour window → accounts.
- A renewing plan (active, next charge set, no downgrade or pause scheduled)
  shows *Renews 13 Nov* without warning; only a cancelled plan is shown in
  orange, counts resets left and is notified.
- Threshold notifications are tracked per account: switching to an account
  that is already past a threshold no longer fires a notification.
- History samples are tagged with the account; the trend chart draws only the
  signed-in account, and switching accounts records a sample at once.

## [1.1.1] — 2026-10-14

### Fixed
- **"No session" error on accounts that also have an API (Console) org.**
  The usage was read from the first organization in the list; when that was an
  API-only org, `/usage` answered 403 and the widget reported a missing
  claude.ai session. It now prefers the organization with the chat capability.
- Popup showed the raw key `error.no_session` instead of the translated
  message when cached data was still on screen; the toolbar tooltip too.
- Popup showed "reset … left" once a window had already reset; it now shows
  just "reset".
- An empty, unlabeled bar appeared under *All models* when there was no Sonnet
  limit — `display:flex` was overriding the `hidden` attribute.

### Changed
- **Toolbar number is much larger** (two digits: 12 → 20 px on the 32 px
  canvas) and auto-fits inside the ring.
- Ring contrast: the used arc is thicker and fully colored, the remaining
  track thinner and fainter; flat ends keep the last few percent visible.

## [1.1.0] — 2026-06-19

### Added
- **15 languages**, auto-detected from the browser locale. Ten new locales —
  Русский (ru), 日本語 (ja), 한국어 (ko), Italiano (it), 繁體中文 (zh_TW),
  ไทย (th), Nederlands (nl), Čeština (cs), Українська (uk), Română (ro) —
  joining English and Türkçe.
- 1400×560 marquee promotional tile for the Chrome Web Store listing.

### Changed
- **Default toolbar icon is now the donut ring** instead of an emoji. The ring
  always rasterizes and shows the weekly % at a glance; emoji stays selectable
  in Settings.
- Spanish (es), French (fr) and German (de) are now **fully translated** —
  previously they were English-fallback stubs.
- Store listing copy refreshed (15-language list, current feature set).

### Fixed
- **Toolbar icon could render blank.** Color-emoji fonts are frequently
  unavailable in the MV3 service-worker `OffscreenCanvas`, leaving the icon
  invisible. The renderer now detects a blank emoji draw and falls back to the
  weekly-% number, so the icon is always visible.
- **Settings icon picker** — preset emoji and the radio options (donut / none /
  custom) are now mutually exclusive in the UI; picking one clears the other's
  highlight.

### Removed
- Three non-functional rows from the *Title content* settings section
  (*Weekly remaining*, *5-hour %*, *5-hour remaining*). Only the weekly-%
  metric drives the toolbar icon, so those rows wrote preferences nothing ever
  read — clicking them did nothing visible.

## [1.0.0] — 2026-05

- Initial Chrome (Manifest V3) release: toolbar usage widget, popup breakdown,
  burn-rate forecast, 7-day trend, threshold notifications, settings page.
  Languages: English, Türkçe (+ de/es/fr stubs).
