# Changelog — Device Health

## 4.2.9 (2026-10-09)

- Offline alerts appear when their configured delay expires, even if no other sensor changes; the pending deadline is cancelled when the card is removed.
- Structured Home Assistant save errors show a readable message or HTTP status, with Polish and English fallback text.

- Classify devices from Home Assistant registries: Bluetooth and Zigbee remain separate; Wi-Fi requires explicit evidence. Count registered physical devices once and show unlinked entity states separately. Refresh on registry events and ordinary state or attribute updates.
- Accept finite 0–100 battery levels from battery device classes or battery names with percent units. Preserve decimals and zero; exclude quantity helpers, humidity and malformed values. Summaries and alerts count each physical device once while individual readings remain visible.
- Keep continuous incidents once in history. Acknowledgement lasts until recovery; a later incident can alert again. Wait for registry identity before creating history or displaying physical alert counts; show loading/errors with explicit retry.
- Measure offline alert delay from connectivity failure. Keep devices without current state unknown, and show unknown elapsed time for invalid dates.
- Preserve background notifications with an explicit administrator preview and Create action. Prevent duplicate writes and stop further writes after account/role changes or disconnect. Display partial-save/reload errors and disabled, unavailable or unknown automation states. Use notification service calls compatible with HA 2024.1.
- Apply configured battery thresholds consistently to colors, summaries, alerts and the generator, including zero and boundary values. Normalize invalid thresholds and refresh alerts immediately after configuration changes.
- Sort the device table by name in both directions through a keyboard-accessible button. Keep the sorting button focus and the current page through ordinary HA updates.
- Keep modal keyboard focus inside the preview, support Escape before saving and return focus to its opener. Preserve YAML, caret, editor drafts and search selection through ordinary updates and language changes.
- Translate first-run guidance, status, network groups, editor, preview, alerts and pagination in English and Polish without changing authored names, models or generated payloads.
- Keep the support link compact, optional and administrator-only, with remembered dismissal and `show_support: false`.
- Document registry evidence, history lifetime, local browser preferences, manual/HACS resource cleanup and the limits of generated background notifications.

## 4.2.8 (2026-08-28)

- Isolation: Bento CSS is component-local and cannot be captured from `window.HAToolsBentoCSS` by load order.
- Isolation: persistence is now card-local, removing `window._haToolsPersistence` load-order coupling while retaining existing localStorage keys.
- Security: remove the suite-wide DOM/shadow-root injector; intro and support UI now render only inside this card.
- Security: normalize non-string values before inherited escaping and harden search/status/alert attribute sinks.
- Lifecycle: cancel deferred renders and scroll restoration on disconnect; add isolation/XSS runtime tests.

## 4.2.7 (2026-07-18)

- Fix (UI): the small accent dot before section titles no longer detaches from the title text (it was pushed to the opposite edge by the header's flex space-between); it is now pinned next to the title.

# Changelog — Device Health

## [4.2.4] - 2026-07-12

### Fixed
- `_drawSignalChart` now guards against a null 2D canvas context (`getContext("2d")` can return null); previously only a missing canvas element was handled.

## [4.2.3] - 2026-06-26

### Fixed
- Battery Health no longer counts Battery+ / Battery Notes helper entities (e.g. *_battery_type, *_battery_quantity) as battery levels. A sensor counts as a battery level only when device_class is "battery" or unit is "%" and the value is 0-100. Fixes #1 (devices wrongly shown at ~2%).

## [4.2.2] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.


## [4.2.1] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.


## [4.1.3] - 2026-05-12

### Fixed
- Removed Google Fonts CDN @import (1 occurrence(s)); now uses system font stack with Inter as the preferred locally-installed face.
- Normalized bare `font-family: "Inter", sans-serif` declarations to a complete cross-platform system stack.
- Privacy section in README: claim now matches behaviour (no CDN dependencies).

All notable changes to **Device Health** are documented here.

## [4.0.0] - 2026-05-10

### Major
- **Split from `MacSiem/ha-tools` monorepo** into a dedicated standalone HACS plugin.
- Bundled Bento Design System CSS inline — no shared dependency required.
- Inlined `_haToolsEsc` XSS sanitizer.
- Persistence keys migrated to per-tool namespace `ha-device-health-…` (clean break — old data under `ha-tools-…` is **not** migrated automatically).
- Donation/support footer added to the panel.
- Cross-tool discovery banner removed; each tool stands on its own.

### Compatibility

- Home Assistant ≥ 2024.1.0
