# Native screenshot provenance

Captured on 9 October 2026 from a real Home Assistant staging instance, using
HACS to upgrade public v4.2.8 to source commit
`00b49e83f663c0ac462dc8258d50a65279a34987` (unreleased v4.2.9).
The normally cached browser module was compared byte for byte with that commit.

All displayed devices, labels, battery readings, connectivity changes and
network addresses are synthetic QA fixtures. The table is filtered to QA
Device 0–2. Battery readings are 10.9%, 30%, 64% and 80%; the Network view reads
−68 dBm from a real staging state attribute, with two Wi-Fi devices and one BLE
device. These images contain no household data.

Images are unedited whole native browser screenshots, captured after the view
settled. Light frames use English; narrow dark frames use Polish at 390 CSS px.
The following card remains visible as a layout boundary. Staging was restored
from its complete pre-test snapshot and independently checked afterwards.


The eight overview frames above retain their original source commit and cover
unchanged rendering, locale, role and layout behavior. On 9 October, the two
registry extractors were corrected in source commit
`7e4d1b4505b9117aeb1200e7bcb4cfec8c4ee10a`; the overview images are not evidence
for those changed extraction paths.

`review-router-connectivity.png` and `review-rssi-fallback.png` are unedited
whole native AX screenshots from this newer candidate. The first shows a router
tracker disconnected while a GPS tracker away from home and a device with one
live connection remain online. The second shows a real synthetic −95 dBm
attribute fallback after unavailable or malformed signal readings. Both use
English and a light theme; all names and addresses are staging fixtures.

The same native session observed the router's autonomous offline alert after
60.109 seconds, its recovery on `home`, valid sibling RSSI despite a damaged
first entity, ordinary attribute recovery from −95 to −55 dBm, and unknown
signal without a fabricated zero. A normal reload loaded the exact candidate
JS. The complete CURRENT snapshot was restored and independently verified;
these targeted checks do not repeat the already qualified full UI matrix.
