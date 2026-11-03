# Third-party and upstream notices

## Propeller-derived bootstrap material

The following files contain material copied or adapted from the local Propeller
project under the user's bootstrap instruction:

| Gefly file | Upstream material and changes |
| --- | --- |
| `docs/BOOT.md` | `propeller/docs/BOOT.md`; adapted links, project structure and Gefly workflow/roadmap additions. The upstream source SHA-256 is recorded in the guide. |
| `justfile` | Document recipes from `propeller/justfile`; adapted project paths, positional arguments, prerequisite errors and repository checks. Unrelated application recipes were not copied. |
| `utils/pdf/style.css` | `propeller/utils/pdf/style.css`; original styling/comments retained, distribution notice added. |
| `utils/pdf/mermaid.html` | `propeller/utils/pdf/mermaid.html`; original include retained, distribution notice added. |
| `utils/pdf/latex.lua` | `propeller/utils/pdf/latex.lua`; original filter/comments retained, distribution notice added. |

Propeller's README expressly declares **GPL-3.0-or-later**. These Propeller-derived
files are distributed on those terms, with original comments/attribution retained.
Gefly adaptations and distribution notices were added on 2026-10-31. The complete,
unmodified GPL version 3 text is included in
[LICENSES/GPL-3.0-or-later.txt](LICENSES/GPL-3.0-or-later.txt). The original PDF
tooling comments also identify earlier Kibitz/OrgFab provenance.

## Propeller assurance core

`utils/assure/upstream/` contains the selected pure TypeScript lineage model, store,
ledger, Markdown/ID readers and extractors/tests from Propeller commit
`99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`, under GPL-3.0-or-later. Original
comments are retained; [the source inventory](utils/assure/UPSTREAM.json) records
upstream paths and SHA-256 values. Gefly adapters and the CLI are separate under
`utils/assure/src/`. The inventory retains Propeller's original upstream paths.
The tracker is developer tooling; it is not a scientific assurance
or training-certification system. The full GPL text remains in `LICENSES/`.

## Project-wide license status

Original Gefly material is licensed GPL-3.0-or-later (user decision,
2026-11-01; [GAPS Q5](docs/GAPS.md)); see [LICENSE](LICENSE). The upstream license
above remains applicable to the identified derived files. Separately licensed
dependencies, data and assets keep their own terms.

No aircraft manuals/models, charts, JSBSim/FlightGear code,
community add-ons or LLM runtime libraries have been bundled. Public terrain, orthophotography and historical navigation data are the separately licensed geographic data described below. Research links are
references, not grants to reuse those materials. Future additions retain their
own source, applicability and rights review in [SBOM](docs/SBOM.md).

## Browser prototype

The application bundles three.js 0.187.0, Copyright © 2010–2026 three.js authors, under the MIT license. The complete notice is retained in [LICENSES/three-MIT.txt](LICENSES/three-MIT.txt). Vite, TypeScript, type declarations and Playwright are development/test dependencies with their licenses retained in installed packages; see [SBOM](docs/SBOM.md) and the locked dependency inventory. JSBSim and its generic study aircraft data are built locally under the existing study terms and are excluded from tracked/public application artifacts.

CesiumJS 1.146.0, Copyright 2011–2026 CesiumJS Contributors, is used under Apache-2.0; see [the full notice](LICENSES/Cesium-Apache-2.0.txt). UI builds retain its package-provided license and third-party inventories beside the copied static assets. The unmodified Hessen HVBG starter photograph is bundled under DL-DE Zero 2.0, with source bounds, license, request and byte hash in [its provenance record](app/public/imagery/SOURCE.json), plus visible attribution and ellipsoid-surface limitations. See [SBOM](docs/SBOM.md).

MapLibre GL JS 6.16.0, Copyright (c) 2023 MapLibre contributors, is used under BSD-3-Clause. The [complete license](LICENSES/MapLibre-BSD-3-Clause.txt) is retained; UI builds copy the package notice to MapLibre-LICENSE.txt. MapLibre uses the already inventoried local HVBG photographs without a remote basemap.

## Public regional terrain and sharper airport imagery

The derived regional package in [app/public/terrain](app/public/terrain/README.md)
combines Hessen HVBG `he_dgm1_32` physical elevations (DHHN2016), provided under
[DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0), with GCG2016/2023
quasigeoid node offsets: **© Bundesamt für Kartographie und Geodäsie**, source
retrieved 2026, provided under [CC BY 4.0](LICENSES/CC-BY-4.0.txt). The public
[BKG product](https://gdz.bkg.bund.de/index.php/default/quasigeoid-der-bundesrepublik-deutschland-quasigeoid.html)
and [regional source ZIP](https://daten.gdz.bkg.bund.de/produkte/sonstige/quasigeoid/aktuell/quasigeoid.geo89.w.zip)
are linked in the versioned manifest with exact hashes. The original [BKG data-sources notice](app/public/terrain/BKG-SOURCES.pdf) and [attribution notice](app/public/terrain/BKG-CC-BY-NOTICE.pdf) are retained. Changes: bounded regional
extraction, geographic DEM resampling, regional bilinear geoid sampling and
interleaved float32 conversion. The combined derived data retains the BKG
attribution/license; original Gefly code remains GPL-3.0-or-later. No endorsement
or surveyed aerodrome accuracy is implied.

The additional 3000×1800 Hessen DOP20 airport JPEG is an unmodified public WMS
GetMap response, under DL-DE Zero 2.0. Its [separate source record](app/public/imagery/DETAIL-SOURCE.json)
retains bounds, request, byte hash and approximately 0.74–0.76 m output pixels.
The original 20 cm source resolution is not a claim of 20 cm output detail.

## Historical radio navigation data

`app/public/navdata/rhein-main-v1.json` and `source-nav810.dat` derive from Robin
A. Peel's NAV810 cycle 2013.10/build20131334, retained in the pinned FlightGear
fgdata revision `5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95`. Copyright © 2013
Robin A. Peel; **GPL-2.0-or-later**, no warranty. The complete original notice is
preserved in the source subset and JSON provenance. A full GPL v2 copy is supplied
in [LICENSES/GPL-2.0-or-later.txt](LICENSES/GPL-2.0-or-later.txt) and beside the
public data. Gefly selects regional rows, explicitly pairs components and converts
units/encoding; it does not update their historical applicability. See the
[data README](app/public/navdata/README.md) and
[source research](docs/research/2026-11-03-rhein-main-navigation.md).
The provisional EDDF extent anchor is from OurAirports' public-domain data.

## Regional orthophoto tiles

The `app/public/imagery/rhein-main/` pyramid derives from Hessen HVBG ATKIS DOP20,
WMS layer `he_dop_rgb`, under [DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
Modifications: WMS resampling to EPSG:3857, 512px tile cropping and optimized JPEG
re-encoding. Effective output is approximately 1.5–3 m, not native 20 cm; capture
dates are unknown. Exact source requests/raw hashes and derived byte hashes are
retained in `SOURCES.json` and `manifest.json`. This supplies visual scenery,
without current airport, chart or surveyed runway acceptance. See
[source/rights research](docs/research/2026-11-03-regional-textures.md).
