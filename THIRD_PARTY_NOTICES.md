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

No aircraft manuals, aircraft model files, charts, JSBSim/FlightGear code,
community add-ons or LLM runtime libraries have been bundled. Individual numerical
values extracted from a manual and from JSBSim aircraft data do ship in the
application source; their rights basis is unresolved, as described below. Public terrain, orthophotography and historical navigation data are the separately licensed geographic data described below. Research links are
references, not grants to reuse those materials. Future additions retain their
own source, applicability and rights review in [SBOM](docs/SBOM.md).

## Browser prototype

The application bundles three.js 0.187.0, Copyright © 2010–2026 three.js authors, under the MIT license. The complete notice is retained in [LICENSES/three-MIT.txt](LICENSES/three-MIT.txt). Vite, TypeScript, type declarations and Playwright are development/test dependencies with their licenses retained in installed packages; see [SBOM](docs/SBOM.md) and the locked dependency inventory. JSBSim and its generic study aircraft data are built locally under the existing study terms and are excluded from tracked/public application artifacts.

CesiumJS 1.146.0, Copyright 2011–2026 CesiumJS Contributors, is used under Apache-2.0; see [the full notice](LICENSES/Cesium-Apache-2.0.txt). UI builds retain its package-provided license and third-party inventories beside the copied static assets. Two unmodified Hessen HVBG ATKIS DOP20 photographs are bundled under DL-DE Zero 2.0: the starter photograph `edfe-starter.jpg` and the coarse regional backdrop `edfe-overview.jpg`. [Their provenance record](app/public/imagery/SOURCE.json) gives source bounds, license, request and byte hash for each. Retrieval time and layer edition were not recorded; only an upper bound, the first commit time, is given. Visible attribution and ellipsoid-surface limitations accompany them. See [SBOM](docs/SBOM.md).

MapLibre GL JS 6.16.0, Copyright (c) 2023 MapLibre contributors, is used under BSD-3-Clause. The [complete license](LICENSES/MapLibre-BSD-3-Clause.txt) is retained; UI builds copy the package notice to MapLibre-LICENSE.txt. MapLibre uses bundled HVBG photographs, the community airport inventory and the fixed-source live scenery endpoints inventoried below.

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
Its retrieval time and layer edition were not recorded; the record gives the
first commit time as an upper bound.
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
The provisional EDDF extent anchor (50.026706, 8.55835) is the EDDF row (id 2212)
of OurAirports `airports.csv` at repository commit
`72322ae9555947b969dda8effa793072159a9a1e`, SHA-256
`e869f2a5c500aa0a5c74c680559c4e3ab7e65c7a442daa7c92b7f99fb51613ca`, retrieved
2026-11-03. That data is released into the public domain (the repository uses the
Unlicense). It is a community point, not a verified official ARP; the JSON
`region.center_source_record` repeats these details.

## Authoring-only Python packages

The offline terrain and imagery compilers use packages pinned in
`utils/terrain/requirements.txt` and `utils/imagery/requirements.txt`:
numpy 1.26.4 (BSD-3-Clause), pyproj 3.7.2 (MIT), rasterio 1.4.3 (BSD-3-Clause)
and Pillow 11.2.1 (MIT-CMU), per their PyPI metadata (read 2026-11-03).
Binary wheels of pyproj and rasterio can include PROJ, GDAL and other native
libraries under their own licenses. None of these packages or libraries is
redistributed with Gefly; only their outputs are.

## Aircraft reference values in the application (rights unresolved)

The application source ships individual numerical values, not documents:

- From the Cessna 1982 Model 172P POH, read from a third-party-hosted scan:
  KCAS limits, stall speeds, CG limits, load factors and VA values, in
  `app/src/aircraft-handbook-data.ts` and `app/src/airspeed-markings.ts`.
  This manual is copyrighted. No text, table, figure or page image is copied.
- From JSBSim `v1.3.3` aircraft and engine data: c172x contact coordinates,
  span, AERORP, alpha limit and tank capacity, `eng_io320.xml` maximum RPM, and
  the `FGTank.cpp` default fuel density. These are in
  `app/src/aircraft-handbook-data.ts`, `app/src/spatial-stall.ts` and
  `app/src/c172x-instrument-references.ts`. `c172x.xml` declares an unversioned
  "GPL" license with "not to be sold" terms. `eng_io320.xml` has no notice, and
  the JSBSim repository is LGPL-2.1.

No recorded user decision, permission or rights analysis covers shipping these
values yet. The facts-only allowances in GAPS Q5/Q7 name the selected 172S POH
and other specific sources, not this C172P POH or JSBSim data. See [the handbook research](docs/research/2026-11-02-c172p-handbook-diagrams.md),
[the airspeed research](docs/research/2026-11-02-c172p-airspeed-markings.md) and
[SBOM](docs/SBOM.md). This is not a legal opinion.

## Regional orthophoto tiles

The `app/public/imagery/rhein-main/` pyramid derives from Hessen HVBG ATKIS DOP20,
WMS layer `he_dop_rgb`, under [DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
Modifications: WMS resampling to EPSG:3857, 512px tile cropping and optimized JPEG
re-encoding. Effective output is approximately 1.5–3 m, not native 20 cm; capture
dates are unknown. Exact source requests/raw hashes and derived byte hashes are
retained in `SOURCES.json` and `manifest.json`. This supplies visual scenery,
without current airport, chart or surveyed runway acceptance. See
[source/rights research](docs/research/2026-11-03-regional-textures.md).

## Streamed DGM200 regional terrain

The [42-tile regional package](app/public/terrain/region/README.md) derives from
BKG DGM200, **© GeoBasis-DE / BKG (2026), Daten verändert**, under
[Data licence Germany – Attribution 2.0](https://www.govdata.de/dl-de/by-2-0).
[BKG](https://www.bkg.bund.de) publishes the
[product](https://gdz.bkg.bund.de/index.php/default/digitales-gelandemodell-gitterweite-200-m-dgm200.html)
and [documentation](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/deu/dgm200.pdf).
The original source archive and extracted TIFF are not bundled; URLs and exact
hashes are retained in the manifest. Changes: regional extraction, exact
coordinate transformation, bilinear source-centre resampling on common nodes,
float32 encoding and a declared fine/coarse boundary blend. The 200 m source
spacing and approximately 2000–2019 survey ages are not upgraded by display LOD.

GCG2016/2023 West retains **© Bundesamt für Kartographie und Geodäsie (2026)**,
[CC BY 4.0](LICENSES/CC-BY-4.0.txt), and the original
[sources](app/public/terrain/BKG-SOURCES.pdf) and
[attribution](app/public/terrain/BKG-CC-BY-NOTICE.pdf) notices. Changes are bounded
regional extraction/interpolation and combination with the DEM. Each input keeps
its own terms; original Gefly code remains GPL-3.0-or-later. No BKG endorsement,
surveyed airport accuracy or accepted training fidelity is implied.

## Community airport points

`app/public/airports/` selects 731 entries across five southern German states from
[OurAirports' public-domain data](https://ourairports.com/data/), commit
`e86a650a968ba239a1288f96c05fcb80688e77a6`, retrieved 2026-11-03. Source and
derived byte hashes, bounds and provenance are in its manifest. Modifications:
five-state selection retaining all source types, field selection, sorting and JSON conversion. This
community inventory has no accuracy/fitness guarantee and is not a navigation
chart, official ARP, surveyed ground or current operational directory.

## Live public map and photography

The local development proxy fetches and resamples fixed public WMS layers;
source responses are cached temporarily, not bundled as a global data grant.

- **TopPlusOpen:** © [BKG](https://www.bkg.bund.de) (2026),
  [DL-DE-BY-2.0](https://www.govdata.de/dl-de/by-2-0), with the linked
  [data-source inventory](https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_topplusopen.html).
  It is a map fallback, not aerial photography or an aviation chart.
- **Hessen HVBG DOP20:** `he_dop_rgb`,
  [DL-DE-Zero-2.0](https://www.govdata.de/dl-de/zero-2-0); voluntary HVBG credit.
- **Bavaria DOP40:** © [Bayerische Vermessungsverwaltung](https://www.ldbv.bayern.de)
  (2026), [CC BY 4.0](LICENSES/CC-BY-4.0.txt), layer `by_dop40c`.
- **Baden-Württemberg DOP20:** © [LGL-BW](https://www.lgl-bw.de) (2026),
  [DL-DE-BY-2.0](https://www.govdata.de/dl-de/by-2-0), layer `IMAGES_DOP_20_RGB`.

Changes: WMS resampling to EPSG:3857, transparent image composition and PNG
encoding. Native source 20/40 cm resolution does not establish output detail;
capture dates are unknown. Missing photo footprints can remain transparent over
the map. Live responses are not a pinned photographic replay/video archive.
See [source observations](docs/research/2026-11-03-dynamic-region.md) and
[runtime inventory](docs/SBOM.md). Research into Google/MapTiler/Cesium services
does not adopt their content or grant reuse rights.

## Pillow scenery compositor

Pillow **11.2.1**, installed separately from
`utils/scenery/requirements.txt`, supports live PNG composition and existing
offline imagery authoring. It is not bundled into browser or physics code.
The installed wheel retains the full license and notices of its native libraries;
those notices must accompany any later packaged redistribution. The inspected
Pillow 11.2.1 core license states:

> The Python Imaging Library (PIL) is
>
> Copyright © 1997-2011 by Secret Labs AB
> Copyright © 1995-2011 by Fredrik Lundh and contributors
>
> Pillow is the friendly PIL fork. It is
>
> Copyright © 2010 by Jeffrey A. Clark and contributors

Pillow is licensed under the open source MIT-CMU License:

> By obtaining, using, and/or copying this software and/or its associated
> documentation, you agree that you have read, understood, and will comply
> with the following terms and conditions:
>
> Permission to use, copy, modify and distribute this software and its
> documentation for any purpose and without fee is hereby granted,
> provided that the above copyright notice appears in all copies, and that
> both that copyright notice and this permission notice appear in supporting
> documentation, and that the name of Secret Labs AB or the author not be
> used in advertising or publicity pertaining to distribution of the software
> without specific, written prior permission.
>
> SECRET LABS AB AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
> SOFTWARE, INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
> IN NO EVENT SHALL SECRET LABS AB OR THE AUTHOR BE LIABLE FOR ANY SPECIAL,
> INDIRECT OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
> LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
> OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
> PERFORMANCE OF THIS SOFTWARE.

## Southern Germany map navigation

`app/public/mapdata/` combines 144 German OurAirports community beacons from the
same public-domain snapshot with 66 historical German LOC/ILS parents and their
explicit antennas from Robin A. Peel / FlightGear NAV810 2013.10, GPL-2.0-or-later.
The original source notice, consumed historical rows and complete GPL license are
retained in that directory. Modifications: bounded geographic/country selection,
component pairing, feet-to-metres conversion, source frequency labels and GeoJSON
serialization. See its [provenance and changes](app/public/mapdata/README.md).
Community beacons and historical ILS do not establish current operational service.

## Local generic propeller preparation

The local research build reads fixed-pitch multiplier formulas from David P.
Culp's Aero-Matic v1.1 (July 2003), `utils/aeromatic/prop2.php` in the pinned
[JSBSim source](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/utils/aeromatic/prop2.php).
JSBSim is LGPL-2.1-or-later; see [upstream licence](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/COPYING).
The preparation script parses the verified source locally and substitutes the
existing engine's direct-drive design RPM for the generator's gearing estimate,
retaining the existing propeller geometry/inertia/Mach correction data. Generated
model bytes are excluded from source distribution and do not establish aircraft
performance or broader model-data redistribution rights.


## EDFE vector scenery and airport COM directory

`app/public/airports/scenery/edfe-vector.geojson` is a bounded, simplified derived
OpenStreetMap database, © OpenStreetMap contributors, under
[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Preserve source/version
metadata and visible [attribution](https://www.openstreetmap.org/copyright).
[Scenery source note](app/public/airports/scenery/README.md) records the source API,
selection, timestamp, checksum, derived runway facts and generic practice-aid limits.
No airport chart images are redistributed.

`app/public/airports/com-regional.json` is a filtered OurAirports public-domain
snapshot. Its manifest retains source commit, timestamp and checksum; see the
[COM source note](docs/research/2026-11-03-airport-com-directory.md). It is not current
operational aeronautical information. Original rendering code remains GPL-3.0-or-later;
source data rights remain separate.


## Label-free official terrain cartography

`app/public/mapdata/terrain-style.json` is adapted from basemap.de Web Colour
style 6.0.0, © GeoBasis-DE / BKG (2026), under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Text/symbol and hidden
extrusion layers are omitted; retained fill/line/circle cartography is unchanged.
Source hash, exact changes, upstream terms and live vector/sprite endpoints are in
[the asset note](app/public/mapdata/terrain-style-README.md). Runtime cartography
is rendered onto the existing terrain, with linked attribution visible in the
scene. Data licensing is separate from Gefly code. No aircraft model or commercial
map subscription is added.
