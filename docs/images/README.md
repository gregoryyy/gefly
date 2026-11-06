# README flight screenshot

## Current README capture — 2026-11-06

`gefly-2026-11-06.png` was captured from the current local development build at
`localhost:5173` on **2026-11-06 at 13:08 Europe/Berlin**, using Chrome
156.0.8078.80 at 1920×1080 / device scale 1. It shows the generic research aircraft in
Chase view, the full classic cockpit and the actual retained Egelsbach flight
trace: 378 points. The native JSBSim worker was running at 1×, 46.2083 simulated seconds /
step 5545, with HDG/ALT engaged. Worldwide community airport/NAV discovery reports
ready; this viewpoint does not demonstrate its entire coverage.

This is a working-tree development snapshot, not a claim that every pictured
feature is merged into main or that aircraft/training fidelity is validated.
The [capture record](../reviews/2026-11-06-readme-capture.json) preserves the image
SHA-256, native/source hashes, browser/state, source credits and request outcomes.
A read-only Worker observer recorded actual state. Capture used ordinary controls:
V for Chase, A for autopilot, M for map, accelerated flight then 1×, Pause while
public tiles settled, hold-drag to show the horizon, I to hide the title menu and
Fit path, then Resume before capture. No imagery fixture, source rewrite,
generated backdrop or image editing was used.

The visible loading notices are retained. Some live photographic detail and
nearby airport geometry are still loading; the capture records one
aborted optional airport request and no application errors. This image is not
proof of complete photography, airport geometry or global data availability.

The map's on-screen attribution remains visible. The scene's full attribution now
lives in **Credits**, so the README also places source credit beside the image:

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
  [ODbL](https://opendatacommons.org/licenses/odbl/); served using
  [OpenFreeMap](https://openfreemap.org/) and the
  [OpenMapTiles schema](https://openmaptiles.org/),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Hessen HVBG aerial imagery and DGM:
  [DL-DE-Zero-2.0](https://www.govdata.de/dl-de/zero-2-0).
- Terrain © GeoBasis-DE / BKG (2026), DGM200:
  [DL-DE-BY-2.0](https://www.govdata.de/dl-de/by-2-0); GCG2016 © BKG (2026):
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Heights and imagery are
  resampled/blended; [terrain source notice](../../app/public/terrain/region/README.md)
  and [full inventory](../../THIRD_PARTY_NOTICES.md) retain product-specific details.
- Airport/community radio records: [OurAirports public domain](https://ourairports.com/data/).
  The [historical FlightGear navigation package](../../app/public/navdata/README.md)
  retains GPL-2.0-or-later/source-edition limits.

Aircraft visuals, cockpit and application code are project-authored; source-data
rights remain separate from the project GPL licence. Earlier images and their
original capture records are retained below.


`gefly-flight.png` was captured from the actual browser application on
2026-11-03 using Chrome 156 at 1680×1050. The existing JSBSim WASM worker was
advancing at 1× near the default Egelsbach start, at simulation time 19.05 s /
step 2286. The camera is in Chase view, with the classic cockpit panels visible
and HDG/ALT engaged through A. It is a screenshot of the experimental prototype,
not validated C172S or training performance.

No imagery fixtures, generated backdrop, source rewrite or image editing was
used. The scene loaded its actual bundled Hessen orthophoto pyramid through
level 15, plus the normal public-service requests. Some live imagery requests
reported degraded coverage; the screenshot therefore does not establish complete
upstream photography coverage. The captured scene's worker and image diagnostics
were recorded in disposable `output/flight/readme-screenshot.json`.

The screenshot retains the renderer's on-screen data credits. Hessen HVBG aerial
imagery uses [DL-DE-Zero-2.0](https://www.govdata.de/dl-de/zero-2-0). Terrain
combines the inventoried Hessen DEM, altered BKG DGM200 under DL-DE-BY-2.0 and
BKG GCG2016/2023 under CC-BY-4.0. Other normal live map/photo layers retain
their displayed source/license credits. See the complete
[third-party inventory](../../THIRD_PARTY_NOTICES.md) and
[terrain package](../../app/public/terrain/region/README.md). The original
aircraft visual, cockpit and application code are project-authored; third-party
data rights remain separate from the GPL project license.

## Previous README capture — 2026-11-03

`gefly-systems-cockpit-flight-map.png` was refreshed on 2026-11-03 using the actual application
in Chrome 156.0.8078.80 at 1920×1080. It shows the latest left systems panel,
six-pack/NAV instruments, engine, KAP 140/flap/trim and radio columns, a visible
horizon in chase view, and the public map centered around Egelsbach (EDFE).
The cyan trajectory contains 447 sampled points from the real JSBSim
flight; no route or aircraft states were fabricated. At capture the flight was
running at 1×, time 61.68 s / step 7402, with HDG/ALT engaged.

Reproduce manually with `node app/tests/capture-readme.mjs` after building the
local native runtime. It uses normal UI controls and public services, with no
imagery fixtures, source rewriting, generated backdrop or image editing.
The flight is briefly paused while public tiles settle, then resumed before
capture. The screenshot retains source credits and any live detail-loading
notice; it is not proof of complete upstream imagery availability or fidelity.
Disposable state/network evidence is in `output/flight/readme-latest-panel.json`.

The BKG public map uses DL-DE-BY-2.0. The photography, terrain and geoid source
rights described above and in the third-party inventory still apply. Aircraft
visuals and cockpit code are project-authored; data rights remain separate.
