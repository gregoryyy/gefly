# README flight screenshot

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
