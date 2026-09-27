## Unreleased

- Classify network devices using HA Device/Entity Registry evidence and explicit SSID/connection attributes. Bluetooth/BLE stays separate; MAC/IP alone is Other.
- Count registered devices once, show unlinked entity states separately, and stop showing demo devices when HA has no readings.
- Mark devices with no entity states unknown; only an explicit connectivity sensor can mark a device offline.
- Replace the large donation panel with a compact optional link after user feedback in issue #2.

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
