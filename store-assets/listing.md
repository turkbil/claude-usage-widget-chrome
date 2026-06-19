# Chrome Web Store Listing

## Item name
Claude Usage Widget

## Short description (max 132 chars)
See your weekly Claude usage in the toolbar — same data as claude.ai/settings/usage, with forecasts, charts, and alerts.

## Detailed description

Tired of opening claude.ai every time you wonder "how close am I to my weekly limit"? This extension puts the answer right in your toolbar.

A tiny donut (or just the number) sits next to your URL bar — 32 %, 3 days left. Click it for the full breakdown.

▸ FEATURES
• Real weekly limit % — pulls the same number you see on claude.ai/settings/usage
• Burn-rate forecast: "At this pace, you'll hit 64 % by week end" — or, when over-pace, "Limit in ~1d 8h"
• 7-day trend chart in the popup, with projected future as a dashed line
• Threshold notifications (warn / alert / critical) — fire once per week per level, no spam
• Settings page: each metric (weekly %, weekly remaining, 5-hour %, 5-hour remaining) can be hidden, shown as text, or drawn as a colored donut ring in the toolbar
• 5 languages: English, Türkçe, Deutsch, Español, Français — auto-detected
• 30 s / 1 min / 5 min / 10 min refresh intervals

▸ PRIVACY
• No telemetry, no analytics, no third-party services
• The extension never reads or stores your cookies — Chrome attaches them automatically when fetching claude.ai's API
• Only outbound traffic: HTTPS to claude.ai (your data) and once a day to api.github.com (release check, can be disabled)
• Fully open-source, MIT-licensed: github.com/turkbil/claude-usage-widget-chrome

▸ ALSO AVAILABLE
There are native menu-bar / system-tray versions of the same widget for both macOS and Windows — see the GitHub repo for links.

Built by Nurullah Okatan. Not affiliated with Anthropic. "Claude" is a trademark of Anthropic.

## Category
Productivity

## Single-purpose justification
The extension does one thing: display the user's own Claude weekly-usage metrics (already visible to them on claude.ai/settings/usage) in a small toolbar UI for at-a-glance access.

## Permission justifications

storage — Save the user's display preferences (which metrics to show, colors, thresholds) and a small local cache of their last fetched usage values so the toolbar icon can render instantly when Chrome restarts.

alarms — Schedule the periodic background refresh and history sampling. Without alarms, the extension would either spam claude.ai or only update when the user manually opens the popup.

notifications — Send the optional threshold alerts (warn / alert / critical) when usage crosses configurable percentages. Off by default.

Host permission claude.ai — The single reason this extension exists: fetch the user's own usage from claude.ai's own /api/organizations/{id}/usage endpoint, using the cookies the user already has. The extension never reads, copies or transmits those cookies elsewhere.

Host permission api.github.com/repos/turkbil/* — Daily anonymous check for a new release of this extension. Can be disabled in settings; only the public Releases endpoint is contacted, no account info is sent.

## Privacy policy URL
https://github.com/turkbil/claude-usage-widget-chrome/blob/main/PRIVACY.md

## Support URL
https://github.com/turkbil/claude-usage-widget-chrome/issues
