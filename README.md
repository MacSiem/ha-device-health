# HA Device Health

![Preview](banner.png)

Monitor the health of your Home Assistant devices from one Lovelace card:
battery levels, availability and alerts. Zero configuration — add the card and it
joins Home Assistant's device and entity registries automatically.

[![Version](https://img.shields.io/github/v/release/MacSiem/ha-device-health)](https://github.com/MacSiem/ha-device-health/releases) [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## How it works

**Short version: it works automatically.** The card reads device and entity
registries through your Home Assistant connection — no extra integration or YAML:

1. **Batteries.** An entity counts as a battery *level* only when it has
   `device_class: battery` or a `%` unit **and** a numeric 0–100 state. Helper
   entities from Battery+/Battery Notes (like `*_battery_type` or
   `*_battery_quantity`) are excluded, so counts and labels never pollute the list
   (fixed in v4.2.3).
2. **Availability.** Each registered device appears once. A device with no current
   entity state is marked unknown, not failed; `off` is only treated as offline
   when an explicit connectivity binary sensor says it is disconnected.
3. **Network evidence.** Bluetooth and Zigbee come from registry connections;
   Wi-Fi needs an explicit Wi-Fi connection type or SSID. A generic MAC or IP
   goes to Other, not Wi-Fi. Entity states without a registered device are
   counted separately and never counted as physical devices.
4. **Alerts.** Threshold-based alerts (e.g. low battery) with a history view.

### What is automatic vs. manual

| Automatic | Manual (optional) |
|---|---|
| Discovering batteries and devices | Adjusting alert thresholds |
| Filtering out Battery+ helper entities | Dismissing/reviewing alerts |
| Availability monitoring | — |

## Screenshots

| Light | Dark |
|---|---|
| ![Batteries tab, light theme](docs/screenshots/card-batteries-light.png) | ![Batteries tab, dark theme](docs/screenshots/card-batteries-dark.png) |

*The Batteries tab with synthetic sensor names and levels, sorted worst-first
with a needs-attention summary. Dark mode follows your Home Assistant theme.*

## Installation

1. Open HACS → Custom repositories.
2. Add `https://github.com/MacSiem/ha-device-health` as category **Dashboard**
   (Lovelace plugin).
3. Install **HA Device Health** and reload your browser.

## Quick start

```yaml
type: custom:ha-device-health
```

That's it — no options are required.

## FAQ

**Do I have to configure anything?**
No. The card discovers batteries and devices from your existing entities.

**Why is a device marked unknown?**
The device is registered in HA but has no current entity state to measure.
The card will not invent a health result or Wi-Fi classification.

**Why doesn't my battery show up?**
It needs `device_class: battery` or a `%` unit and a numeric 0–100 state. Text
states ("low"/"ok") and count entities are intentionally excluded.

**Does this send data anywhere?**
No. Everything runs locally in your browser against your Home Assistant instance —
no telemetry, no CDN assets.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Support

- [Buy Me a Coffee](https://buymeacoffee.com/macsiem)
- [PayPal](https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W)

The optional in-card support link is shown only to administrators. Dismiss it in the card or set `show_support: false` in the card configuration.

## License

MIT, see [LICENSE](LICENSE).
