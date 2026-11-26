# Device Health backend candidate (not yet published)

The existing HACS Dashboard channel and `/hacsfiles/ha-device-health/ha-device-health.js` remain untouched. This component is a candidate for an integration distribution; it can register its bundled Lovelace resource when no existing copy is present. Before changing HACS category, qualify the separate integration package and migrate resources only after checking the actual stored and YAML resources. Never add a second copy of the card or remove an existing user-owned URL. Rollback retains the original dashboard and resource.

The singleton config entry exposes offline devices, devices with battery at or below 20%, and problem. Values are `unknown` if there is no relevant measurement; problem is true when either measurement finds a problem, false only when both are known healthy. Offline requires all measured connection links down; unavailable entities alone do not prove a physical outage. Battery measurements require percent and a battery class or unambiguous name, and are grouped by registered device; unlinked sensors are counted separately. Registry and state changes trigger updates; counters use measurement state class and are recorded normally. Entry IDs preserve unique IDs across reloads, not removal/reinstallation.

WebSocket: `ha_device_health/capabilities` takes `entry_id`; `policy/get` and `policy/set` take `entry_id`, with `policy/set` additionally taking `policy` and the last `revision`. The schema follows `feature_access.py`. Admin manages policy; capability results also require HA all-entity read/control permissions. An optimistic revision prevents stale writes. Policy is private and removed with the entry. The API is a capability contract only: current Dashboard 4.3.0 has no policy enforcement and does not consume it. Native aggregate entities are global HA state and cannot enforce per-user visibility or source permissions; use HA's own entity permissions. They do not provide per-user filtered aggregates. No service or action is exposed by this component.

Integration remains incomplete until the frontend enforces the capability contract at every read/action and validates native permissions for the actual target; verify HA permission changes and deny stale in-flight operations. Dashboard-only users retain existing behavior until that integration. Test on a disposable HA instance before using or distributing the candidate.

`ha_device_health/access` resolves the singleton without an entry ID. It returns `status` (`active` or `absent`), `revision` (null when absent), `features`, and `can_manage`; only admins receive `entry_id`. `ha_device_health/access/subscribe` emits only `{"changed": true}` to still-active authenticated subscribers when configuration, unload or policy changes; clients must call `access` again. User permissions can change outside this integration, so clients must re-read on reconnect, context change and before operations; subscription does not claim to detect every HA permission change.

## Packaging and migration validation

The 4.3.0 repository is registered in HACS as Dashboard. That type installs the
root JavaScript file into `www/community/ha-device-health` and legacy HACS may register
`/hacsfiles/ha-device-health/ha-device-health.js` and current HA Marketplace may use `/local/community/ha-device-health/ha-device-health.js`; verify both paths in live migration QA. The integration type installs
only `custom_components/ha_device_health`. The repository's
`content_in_root` setting must be absent for HACS to discover the integration
manifest and install that directory. Its Dashboard filename remains the root
`ha-device-health.js`.

The integration contains a copy of the card under `www`. After editing the
root card, run `node scripts/sync-card.mjs`. CI verifies the two files are
identical. Integration setup serves its copy from
`/ha_device_health/ha-device-health.js` and adds one versioned Lovelace
resource when no other Device Health resource exists. Existing HACS or manual
resources are preserved, including their URL. An integration-owned resource is
removed only when its saved ID, URL and type still match. In YAML resource mode or when the resource collection is unavailable, automatic registration is deferred to avoid duplicating an unknown user resource. Installation and uninstallation must still be checked in real Home Assistant.

The two HACS repository categories use different local paths and installation
logic. Existing Dashboard installations remain Dashboard installations. Adding a
component directory to a release does not install the component into those
systems. Conversely, installing the integration alone does not update an
existing Dashboard resource, which may continue to serve the previously
installed card. Category migration and the default catalog transition require
separate confirmation with HACS and an end-to-end fresh and upgrade test.
Do not describe this draft as an automatic Dashboard-to-integration migration.

The component uses the asynchronous static-path API introduced in HA 2024.7,
so the HACS minimum is 2024.7.0. A runtime version matrix and the minimum
supported version for the whole integration remain subject to QA.

References:
- https://www.hacs.xyz/docs/publish/integration/
- https://www.hacs.xyz/docs/publish/plugin/
- https://github.com/hacs/integration/blob/main/custom_components/hacs/repositories/integration.py
- https://github.com/hacs/integration/blob/main/custom_components/hacs/repositories/plugin.py
- https://contributors.home-assistant.io/blog/2024/06/18/async_register_static_paths/

## Security boundary for global entities

HA entity states do not carry a caller identity. These global counts and their
recorded history include measurements from all sources; granting access to an
aggregate can reveal facts about sources the same user cannot read. Card policy
does not govern native state, Recorder, REST, or another dashboard. Administrators
must restrict access to all three aggregate entities and their history to users
authorized to see the underlying population. This is a deployment requirement,
not a per-user guarantee. A policy change cannot retract previously recorded
history. A future per-user projection must filter the actual source entities
with current HA permissions on every read and invalidate on access changes; it
cannot be represented by one global native entity. Keep the required global
entities and their HA automations, and require explicit security review before
release where source visibility differs between household users.
