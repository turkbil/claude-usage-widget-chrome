# Changelog

All notable changes to this project are documented here.

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
