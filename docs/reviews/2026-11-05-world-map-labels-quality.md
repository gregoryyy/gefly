# World map place-label quality review

Reviewed 2026-11-05 13:33 Europe/Berlin by Codex quality, independently of the
Codex implementation author. TODO2.0.139 / R-WORLD-11; scoped working tree based
on `700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded review: no blocking findings.** Only this assigned report is
edited. Cross-provider peer remains pending; no exact CLI/model identity is
inferred. The [user input](../input/2026-11-05-usa-labels-rpm-response.md) contains
both labels and RPM concerns; this review covers only labels. No engine/aircraft
repair or RPM investigation is accepted here.

`worldMapLabelLayers()` adds three symbol layers to the interactive 2D map:
cities from zoom 4, towns from 7, villages/suburbs from 11. The existing `place`
source supplies `name`/`name:en`; a string expression and 1–80 length filter bound
rendered names. Names are canvas text, never HTML, instructions or resource URLs.
Rank sorting, collision placement, padding and contrasting halos support readable
placement without a new DOM label collection. This is a selected source subset,
not exhaustive USA labels, new road/country labels or a worldwide NAV inventory.

`practice-map.ts` inserts the symbol layers after global geometry and before the
regional raster layers, preserving regional cartography priority. The 3D
`createWorldMapStyle()` still returns only geometry. The muted palette is retained;
removing the shared credit's misleading “labels omitted” suffix preserves linked
OSM, OpenFreeMap, OpenMapTiles and design-licence attribution.

The style declares no glyph URL, sprite or font-face service and uses local
`sans-serif`. Reviewer inspected the installed MapLibre
`src/render/glyph_manager.ts:240`: absent a glyph URL, glyphs use local
rasterization/TinySDF. There is no new font/provider/dependency or arbitrary fetch
path. Existing tile/decoder/cache limits remain; glyph appearance and coverage
depend on available system fonts. No physical terrain, native input, avionics,
recording or persisted preference path is added.

Reviewer ran `cd app && node --test src/world-map-style.test.ts`: **2 passed,
zero skipped**. These unchanged tests check geometry/resource structure and
instance isolation, not new label semantics. No new tests were authored for the
reversible style change and no reviewer browser run is claimed. Root reports
TypeScript passed.

Author's unchanged `WORLD_MAP_CREDIT_ONLY=1` focused browser run, process 3038,
completed **exit 0 / two existing groups**, Chrome 156.0.8078.80. Its JSON contains
the new 2D label-layer IDs below the regional raster layers. Reviewer visually
inspected `world-labels-task139-outside.png`: **New York is readable** on the
actual 2D map. The real-source component image retains muted, label-free New
York/Tokyo geometry for the 3D texture. This is scoped screenshot/source evidence;
the unchanged browser assertions do not establish label text/zoom completeness,
collision behavior at every view, regional seams or a hardware/browser matrix.
No aircraft fidelity, navigation authority, full CI or publication claim follows.

## Frozen identity

| Path | SHA-256 |
| --- | --- |
| `app/src/world-map-style.ts` | `195bfe471f55394daffaf373c7ce75d0d02495da92445241ad52196124267a12` |
| `app/src/practice-map.ts` | `9b72207fd17c0ff8666d67fa4cb613558e372633ee03c558c199b9523547076e` |
| `docs/input/2026-11-05-usa-labels-rpm-response.md` | `54f3cd3733cd1093da87aa544653cdc5bb01f842e7902b6fd7738fb74d75fbbe` |
| `app/tests/world-fallback.browser.mjs` | `e9083d9eb79f7d422aab4a8ce97fc91a1b693dc1ac854353d0bd7b4995e39558` |
| `output/flight/world-labels-task139-browser.json` | `8464735206bca1c478900a61d2e05399b71b58db5a85958972c1fd0de4a2a779` |
| `output/flight/world-labels-task139-outside.png` | `796c8112361f63719f6a0d8771d6db1ef3fac44638efe5e07efbfa5192ca9068` |
| `output/flight/world-labels-task139-real-source.png` | `9c98c38f0735ed6358f661148a320bf66c86b7fccab37a200490072749ca1104` |
