## Unreleased

- Show registry loading and errors with immediate explicit retry. Discard stale registry responses and health history across account/connection changes, and refresh names and bindings on native registry events; unsubscribe on disconnect.

- Refresh device status, network signal and the unlinked count on ordinary Home Assistant state and attribute changes. Alert once per physical device using its lowest battery reading, and record continuous incidents once; recovery enables a new alert after acknowledgement.
- Measure connectivity alert delay from the connectivity failure itself. Show unknown elapsed time for invalid dates and display disabled, unavailable and unknown background automation states accurately.

- Prevent duplicate background automation writes while Home Assistant is responding. Stop further writes and discard stale results after administrator role or account changes; ordinary language updates preserve the pending operation.

- Translate device status, the absent-model fallback and network group labels without changing authored models or connection classification. Use the Polish dictionary for regional Polish Home Assistant language settings as well.

- Translate the visual editor and implicit default heading using Home Assistant's language. Preserve authored titles, editor drafts, caret selection and configuration events; display an explicitly configured zero battery threshold unchanged.

- Translate the open background-automation preview, retained warning/error/result presentation, alert type labels and dates on ordinary language changes. Keep generated YAML, automation payloads, raw results and authored/server details unchanged.

- Translate first-run guidance, optional support, page-size captions, elapsed-time units and the background alert overview when the Home Assistant language changes, preserving search drafts and administrator controls. Automation payloads and creation behavior remain unchanged.

- Keep search focus and the complete selection after typing or changing the Home Assistant language. Refresh existing translations and administrator automation controls immediately even when sensor states are unchanged.

## 4.2.9 (2026-09-29)

- Correct the Polish and English first-run steps to describe the available search, status filter, tabs and device table.

- Require an administrator before opening or creating background alert automations; household users retain read-only health views.

- Restore the selected tab after reloading a direct HA panel; ignore invalid saved tab values.

- Initialize default battery and offline alert thresholds in the direct HA panel as well as Lovelace cards; preserve per-card threshold overrides.
- Classify network devices using HA Device/Entity Registry evidence and explicit SSID/connection attributes. Bluetooth/BLE stays separate; MAC/IP alone is Other.
- Count registered devices once, show unlinked entity states separately, and stop showing demo devices when HA has no readings.
- Mark devices with no entity states unknown; only an explicit connectivity sensor can mark a device offline. Show a dash for an absent or invalid last-change date instead of the Unix epoch.
- Keep UNKNOWN visible on light backgrounds and use darker status badge fills for readable white text in both themes.
- Translate the alert page-size label using the existing English/Polish pagination strings.
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
