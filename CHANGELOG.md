# Changelog

All notable changes to this project are documented here.

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
