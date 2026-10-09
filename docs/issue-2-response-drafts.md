# Device Health issue #2 response drafts

Status: draft only. Coordinator reviews the exact body and target; publication and verified native installation must precede sending. Already sent maintainer replies are not repeated.

## Initial network report

Hi @Psytoshgen, thanks again for reporting the network counts.

I have released [v4.2.9](https://github.com/MacSiem/ha-device-health/releases/tag/v4.2.9). The Network tab now counts physical devices from the HA device/entity registries. Bluetooth/BLE stays separate, Wi-Fi requires explicit Wi-Fi evidence, and MAC/IP alone goes to Other. Unlinked entity states are counted separately. I checked the card in real HA with 940 unrelated synthetic entities and an upgrade from the public version.

I am leaving the report open because I have not verified it on your devices. If you try the card again, I would appreciate hearing whether the counts are now correct in your setup.

## Support-panel comment 5084084745

Thanks for explaining why you removed the card. I changed the large support panel to a compact optional link in [v4.2.9](https://github.com/MacSiem/ha-device-health/releases/tag/v4.2.9). It is visible only to administrators and can be dismissed or disabled with `show_support: false`.

The card uses the existing HA connection; it has no telemetry or advertising SDK. The optional external support page opens only when clicked. I checked dismissal, reload and the household view in HA. I hope this addresses the interruption you described, and I would appreciate your feedback if you decide to try it again.

## After version 4.2.9 is publicly available and its installation is verified

Hi @Psytoshgen, thanks again for the report and the feedback about the support panel.

I have released [v4.2.9](https://github.com/MacSiem/ha-device-health/releases/tag/v4.2.9). The Network tab now uses Home Assistant device and entity registry information to count each physical device once. Bluetooth/BLE stays separate; Wi-Fi requires explicit Wi-Fi evidence, while a MAC or IP address alone goes to Other. Unlinked sensor entities are counted separately. I checked the card in Home Assistant with 940 unrelated synthetic entities, including an upgrade from the public release.

The large support panel is now a small optional link, visible only to administrators. It can be dismissed, or disabled with `show_support: false`.

I am leaving this report open because I have not verified the result on your devices. If you decide to try the card again, I would appreciate hearing whether these changes resolve the problem in your setup.

## Source and limits

The combined body is a delivery proposal covering the initial issue and the support-panel comment. Separate per-input drafts above remain review inputs. Nothing has been sent. The issue remains open until the author's own retest; synthetic QA does not establish success on their devices.
