# Software, tools and source inventory

JSBSim is the selected dynamics engine, with TypeScript, CesiumJS, a three.js fallback and MapLibre selected for the web application (GAPS Q17). The experimental application pins CesiumJS, MapLibre, three.js and its build/test tools with npm in `app/package-lock.json`; the 3D flight scene and 2D practice map are implemented within their recorded prototype limits. No repository-wide workspace layout is selected. Study/tool versions are recorded below. This overview does not replace future machine-readable inventories.

The user intends a **free/open-source project** and directs **reuse of open physics
engines/models wherever practical**. Original project material is **GPL-3.0-or-later** (GAPS Q5);
engine, aircraft model, wrapper, imagery, geodata, charts and community content
must each retain their own license/provenance. Select a compatible distribution
plan rather than assuming a single engine license covers all these materials.

## Experimental browser application

The local [application](../app/README.md) pins three.js 0.187.0 (MIT) to generate the original generic aircraft visual, Vite 8.3.5 (MIT), TypeScript 7.0.2 (Apache-2.0), @types/three 0.187.0 (MIT) and Playwright 1.64.1 (Apache-2.0). Runtime dependencies are CesiumJS 1.146.0 and MapLibre GL JS 6.16.0, described below, and three.js. Exact transitive versions/integrity hashes are in `app/package-lock.json`. **Audit, 2026-11-03 07:36 Europe/Berlin:** the lockfile was last changed in `3e8fc63` (SHA-256 `33d24625cb9849f2dc6ff594229f2464befa83db318f04a652e3efa5dca39342`; 125 packages: 55 prod, 70 dev, 48 optional). It was audited with npm 11.19.1 on Node v24.22.1 against the public registry advisory database. `npm audit --omit=dev` and the full `npm audit` each reported 0 vulnerabilities and exited 0. The earlier 2026-11-01 zero-advisory audit came before the TypeScript 7, Vite 8, Cesium and MapLibre changes and does not cover them. An audit is a dated advisory lookup, not a security review. The three.js license is retained under [LICENSES](../LICENSES/three-MIT.txt). Fonts use local system fallbacks. Application, engine and the bundled Hessen starter image are local; there are no runtime imagery-service requests.

JSBSim and c172x remain generated local research assets under the existing study recipe and rights limitations below. Vite serves only the twelve named worker/runtime files in development. Shared project-owned helpers are bundled with the UI; the generated JSBSim files and worker endpoint remain outside the production UI build, which is not a deployable flight simulator. No runtime model assets or source SDKs are committed or published.


CesiumJS 1.146.0 (Apache-2.0) now renders the actual geographic scene. Its workers, widgets, textures, license and third-party inventories come from the locked npm package, without Cesium ion or commercial base layers; see [license](../LICENSES/Cesium-Apache-2.0.txt). A fixed official Hessen ATKIS DOP20 starter photograph is bundled under `app/public/imagery/`: [source bounds, request URL, byte hash and license](../app/public/imagery/SOURCE.json). The 1024×1024 JPEG is an unmodified GetMap image from the `he_dop_rgb` layer, covering 8.62–8.66° E / 49.95–49.975° N (approximately 3 × 2.8 km). [Dataset terms](https://opendata.hessen.de/de/dataset/atkis-dop-20) specify [DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0); voluntary source credit remains visible. No acquisition date or current airport conditions are claimed. Retrieval time and layer edition were also not recorded. The live `he_dop_rgb` layer has no time dimension, so the request URL does not pin an edition. SOURCE.json therefore records `retrievedAt`/`sourceEdition` as null and gives the first commit time as `retrievedNotLaterThan`. The photographs are now draped over the separately sourced regional terrain on normal flights, or the ellipsoid on explicit flat studies. Imagery alone establishes no accepted airport elevation, chart geometry or navigational authority. A bundled 512×512 coarse overview adds regional context at 8.4–8.9° E / 49.8–50.1° N; its separate byte hash and request are also recorded in SOURCE.json. The application labels overview-only coverage and reports missing coverage beyond it; EDDF/100 NM expansion remains future work.

Live adaptive WMS requests were removed after excessive refinement and service timeouts. The tested source also rejects images over 3000 pixels with an HTTP 200 XML exception. Bundling the verified starter image avoids that runtime dependency; research-model runtime data remains excluded from distribution.

MapLibre GL JS 6.16.0 (BSD-3-Clause) is pinned for the lazy-loaded practice map. Its worker is explicitly bundled by Vite; application resources, imagery metadata and raster photographs remain local, with no external style/tiles/glyph service. The complete [MapLibre license](../LICENSES/MapLibre-BSD-3-Clause.txt) is retained in source and copied into UI build output. Geographic conversion follows the [official image-source corner convention](https://maplibre.org/maplibre-gl-js/docs/API/classes/ImageSource/). The plotted route uses at most 600 endpoint-preserving samples of the already bounded flight trace; it establishes no navigational/chart or airport-reference accuracy.

## Current development tools

| Tool or asset | Use and provenance | Version / rights status |
| --- | --- | --- |
| Python | Standard-library scaffold checks, tool tests and shared CI runner, including `tomllib` | 3.11+ required; CI supports minor lines 3.11 and 3.15; exact observed patches recorded in RESULTS |
| just | Local command entry point; `just ci` delegates to `utils/ci/run.py` | Version recorded in RESULTS; not bundled or required by hosted CI |
| pandoc | Trusted Markdown to embedded HTML | Version recorded in RESULTS; not bundled |
| Google Chrome | Headless A4 PDF print | Locally installed; `CHROME` can override executable |
| `utils/pdf/style.css`, `mermaid.html`, `latex.lua` | Copied from `../propeller/utils/pdf/` by the requested bootstrap procedure | Propeller declares GPL-3.0-or-later; original comments retained, notices and full GPL text included for publication |
| Mermaid | Optional diagram rendering in PDF builds | CDN script pinned to 11.4.1 in inherited include; fetched only for Mermaid documents; no checked-in bundle |
| TeX Live / dvisvgm | Optional LaTeX fenced-block to SVG | Needed only for such blocks; not required for current foundation documents |
| Git / GitHub | Initial public repository publication authorized by user | Destination `gregoryyy/gefly`; actual commit/push evidence in DONE and RESULTS |
| Codex CLI / Claude Code CLI | Local prerequisites for the opposite-provider peer gate; not bundled | Observed CLI versions: 0.46.0 / 2.1.193. Use existing configured models/authentication, check installed capabilities and record actual model evidence per run. No installation or model selection by the router. |

The document recipes are adapted from the source project's justfile. Generated
`*.md.pdf` files and `.pdfstamps/` are excluded from Git. Upstream Propeller README
and LICENSE were inspected before publication: its declared GPL-3.0-or-later terms
are recorded for derived BOOT/build/PDF material in
[THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), with the full license text under
`LICENSES/`. Gefly's original material is now also GPL-3.0-or-later (Q5, 2026-11-01); see `LICENSE`.

## Repository-tool CI inventory

The [shared runner](../utils/ci/run.py) checks scaffold structure, offline standard-
library tool tests and whitespace in all tracked current files. Empty/missing
tests or required-phase failures return nonzero. Untracked files are outside the
whitespace gate until added to Git. This is TODO 1.1.1's bounded tool slice, not a
choice of simulator stack or completion of parent TODO 1.1.

The [workflow](../.github/workflows/foundation.yml) handles pushes and pull requests
targeting `main`, using `contents: read` and checkout `persist-credentials: false`.
It runs on `ubuntu-24.04` with explicit Python minor lines 3.11 and 3.15. At
selection on 2026-10-31, Python's [supported-version table](https://devguide.python.org/versions/)
lists 3.11 in security support and 3.15 in bugfix support;
[3.15.2](https://www.python.org/downloads/release/python-3152/) is the current
selected-line release checked for setup availability. The matrix permits later
patches within each minor line; record exact observed interpreters and hosted
runner details in RESULTS. An immutable action pin does not make the interpreter
download or hosted runner image hermetic.

| Action | Official release and immutable source pin | Runtime compatibility |
| --- | --- | --- |
| `actions/checkout` | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), `3d3c42e5aac5ba805825da76410c181273ba90b1` | Node 24 action runtime; Actions runner 2.327.1+ |
| `actions/setup-python` | [v7.1.0](https://github.com/actions/setup-python/releases/tag/v7.1.0), `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | Node 24 action runtime; Actions runner 2.327.1+ |

Both action sources declare the MIT license at their pinned revisions:
[checkout license](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/LICENSE)
and [setup-python license](https://github.com/actions/setup-python/blob/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/LICENSE).
They are referenced by CI, not vendored into the application.

The Foundation workflow sets up the Node 26 line for the offline synthetic render
and required assurance checks; see the pinned action and limits below. The resolved
patch version is printed in the log. No project packages are installed.

The runtime requirements are recorded in the pinned
[checkout source](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/README.md)
and [setup-python source](https://github.com/actions/setup-python/blob/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/README.md).
These are CI action runtimes, not application dependencies. Action/interpreter
setup can download tools; the shared gate then uses Git, Node standard libraries
and the Python standard library. Its only package install is the app's npm dependencies
from the lockfile via `npm ci --ignore-scripts` (no lifecycle scripts), in the
browser-application job and in the runner's app phase. It invokes no live peer
provider, PDF/browser/TeX process or simulator runtime. Tests mock provider calls.
Value files pin the aircraft manifest by id, version and SHA-256 of the file bytes;
the validator rejects duplicate JSON keys.

[Dependabot configuration](../.github/dependabot.yml) monitors the
`github-actions` ecosystem at `/` and the `npm` ecosystem at `/app` weekly, proposing update PRs under
[GitHub's documented action-update mechanism](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions).
For each proposed replacement, verify the release/tag-to-commit mapping against
the official action repository, inspect the pinned source and runner/runtime
requirements, preserve a full commit SHA, and review/test the change through the
same shared gate and independent review process. Do not merge an update merely
because the bot opened it. Python patch resolution and hosted runner updates
remain explicit limits outside those action pins.

Local gate observations and actual hosted outcomes are separate records under
[E0-CI](EVAL.md#e0-ci-are-repository-tool-quality-gates-reproducible-locally-and-in-ci).
Workflow presence does not establish a hosted pass or branch protection; peer
acceptance is also a separate gate. Future application lint/type checks,
dependency vulnerability/license checks and package-manager update automation
remain TODO 1.1 work as package/workspace tooling and product implementation are added.

## Assurance toolchain

The bounded assurance tool uses Node 24.2+ built-in TypeScript stripping and only
Node standard libraries; it installs no runtime packages. Type stripping is not
TypeScript type checking. The selected pure Propeller core is GPL-3.0-or-later,
pinned to `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`; [UPSTREAM](../utils/assure/UPSTREAM.json)
records each copied file's original path/hash, and [notices](../THIRD_PARTY_NOTICES.md)
preserve attribution. Gefly adapters are tested separately from the reused tests.

CI explicitly sets up the Node 26 line with `actions/setup-node` v7.1.0 at
`949feb2413d6458794dcd2491c4babbbce0c15c1`. Its official tag API was verified before
selection; the [pinned MIT license](https://github.com/actions/setup-node/blob/949feb2413d6458794dcd2491c4babbbce0c15c1/LICENSE)
and [source](https://github.com/actions/setup-node/tree/949feb2413d6458794dcd2491c4babbbce0c15c1)
are recorded here. Automatic package-manager caching is disabled. Interpreter
patches can move within that line; actual versions belong in RESULTS. Existing
weekly GitHub Actions update proposals also cover this immutable action pin.

The runtime lives in `utils/assure/`; the product contract/catalog remain in
`docs/assure/`. Assurance reads catalog/evidence files offline and creates ignored reports under
`utils/assure/out/`. It does not fetch source documents, install an SDK, run a simulator
or invoke a provider. It complements existing source/schema/conversion validators;
review still establishes source applicability and scientific meaning.

## Assessment-airspeed foundation

`packages/training/` contains the original GPL-3.0-or-later pure TypeScript mapper
and repository-data adapter; `packages/contracts/assessment-airspeed.ts` declares
their readonly interface. `packages/package.json` only declares a private ESM
source boundary, without dependencies, installer scripts or a workspace build.
The shared gate runs the module tests separately with Node 24.2+ and the existing
per-file/global reporter. No package installation or new third-party code is used.
Native type stripping is not type checking; optional local strict checking uses
the already-installed compiler recorded with its actual result.

The source remains the existing selected POH facts. The adapter preserves their
draft/not-validated status and caller-declared hash; it does not verify the byte
binding or grant data rights. Complete source/schema/conversion checks remain in
the existing aircraft validator. The mapping is an instructional derivation, not
an aircraft instrument model or accepted exercise.

## Selection and updates

Prefer the smallest dependency set that meets measured requirements. Before adopting one, record its exact version, official source, license, maintenance/security posture, transitive obligations, browser compatibility, size/performance impact and alternatives. Commit lockfiles for the selected package manager. The current action-update configuration is described above; foundation TODO 1.1 still needs vulnerability/license checks and automated update proposals appropriate to the future application ecosystem.

JSBSim is the selected dynamics engine; it is not yet a pinned product dependency. GeoFS is a reference product, not a library or asset grant. Check primary source documents and actual licenses before reuse; see [foundation research](research/2026-10-31-foundation-sources.md).

## Reuse and regional-data candidates, not adopted dependencies

The [EDDF/open-foundation source note](research/2026-10-31-eddf-open-foundation.md)
records primary links, dates, license statements and limitations for the following
candidates. None has been installed, copied into runtime assets or accepted as a
validated aircraft/region model.

| Candidate | Selection question |
| --- | --- |
| JSBSim engine and included aircraft data / Aeromatic | Can an applicable C172 model meet reference cases through a suitable browser/deployment adapter? Pin engine/model versions and inspect rights separately. **Selected** (Q17; LGPL-2.1-or-later accepted as copyleft exception; bundled aircraft data not shipped). Studied in [studies/e1-jsbsim](../studies/e1-jsbsim/README.md): PyPI 1.3.3 / `v1.3.3`@`66f7faf`, engine LGPL-2.1-or-later per source headers; `c172x` data says "GPL" (unversioned) and "not to be sold"; engine/propeller/systems files carry no notice. Q5 compatibility review pending. |
| FlightGear C172P model/package | Which flight/model/cockpit components are portable and applicable? Inspect component/asset rights and dependencies instead of importing a whole package by assumption. |
| Existing JSBSim WASM wrapper | Is the actual early-stage wrapper maintainable and adequate? Review wrapper and bundled engine licenses and run browser/replay budgets before adoption. |
| CesiumJS 1.146.0 | Studied in [studies/e1-browser/render](../studies/e1-browser/render/README.md) via CDN; Apache-2.0 (permissive). Ion token disabled, no ion/Bing assets. Not adopted in the application yet: `app/package.json` and `app/package-lock.json` neither declare nor lock CesiumJS, and `app/` does not import it (the local prototype renders with three.js). The study still uses CDN loading without SRI. |
| three.js 0.187.0 | Studied in [studies/e1-browser/render](../studies/e1-browser/render/README.md) via CDN; MIT (permissive). Adopted through the application lockfile for the local prototype; the older study still uses CDN loading without SRI. |
| emsdk 6.0.13 | Build tool for the JSBSim WASM study ([sim](../studies/e1-browser/sim/README.md)); not bundled; build outputs not committed. |
| OpenStreetMap data | Assess relevant basemap/coverage and ODbL obligations; public tile service access is a separate policy and hosting decision. |
| OurAirports data | Candidate airport records with stated public-domain terms and accuracy limitations; not an accepted substitute for EDDF's official ARP or authoritative procedures. |
| Copernicus elevation/surface products | Select product/edition, distinguish surface from terrain, review vertical reference/accuracy, attribution and actual download/service access. |
| DFS/AIP and EAD reference material | Verify viewing, extraction and redistribution permissions; public consultation is not an open chart/navigation-data grant or proof of current operational coverage. |

Reuse-first assessment belongs in E1/TODO 1.2; region/data acceptance belongs in
E10/TODO 1.7. An LLM may resolve references to approved catalog entries but cannot
create a license, data provenance or accuracy claim.

## Aircraft, avionics and geographic data

Store manifests in `data/` identifying publisher, exact aircraft/avionics applicability, revision/date, page/section, original units, extraction method, uncertainty, access date, license/redistribution permission and fixture checksum. Track provenance for derived parameters as well as raw sources. Do not copy manuals or bulk datasets unless rights permit; keep links and authorized extracts instead. Pin geographic/navigation/weather dataset revisions and freshness claims once providers are selected. Never label obsolete or synthetic data as operationally current.

For the [expanded training scope](design/TRAINING.md), inventory airport/runway and
terrain elevations with units/datums, navaid/fix identifiers and frequencies,
procedure/chart geometry, METAR/TAF and NOTAM coverage/validity, checklist sources
and radio phraseology references. Record restrictions on caching, redistribution,
derived chart generation, attribution and client access, as applicable. Real and
generated maps need separate provenance labels. No feed, global database, chart
provider or community add-on has been adopted by this refinement.

Browser orientation support and any replay/video library must be evaluated on the
chosen browser/device matrix before dependency adoption. GeoFS community add-ons
are research examples, not preapproved dependencies or accepted aircraft data.

## Third-party license policy (GAPS Q5)

Admit only non-proprietary licenses (orchestrator reading: OSI-approved software licenses and open
data/content licenses). **Prefer permissive** terms (MIT, BSD, Apache-2.0, ISC,
CC0/public domain, CC-BY) so the project's GPL-3.0-or-later can be relaxed later.
*Orchestrator proposals pending user confirmation (GAPS Q5):* a copyleft component (for example LGPL/GPL software such as JSBSim or FlightGear
aircraft packages, or ODbL share-alike data such as OpenStreetMap) needs a
recorded justification, a license-compatibility check (for example, GPL-2.0-only
material cannot be combined with GPL-3.0-or-later) and an isolation/replacement
note before adoption.
Proprietary, non-commercial-only or no-derivatives material is excluded from the
distribution; link to it instead when it is a needed reference.

## Local cockpit adapter

`studies/e1-browser/sim/prepare-aircraft.py` prepares an ignored copy of pinned
JSBSim c172x data. It hash-guards the original XML and adds only a default-on
execute gate for the automatic-mixture channel, leaving all other bytes and
coefficients unchanged. The original checkout is not modified. The build record
contains adapter ID, script/source/prepared SHA-256 hashes. Generated adapted
model bytes remain embedded only in the excluded local research runtime; this is
not a distribution-rights or selected-172S fidelity acceptance. Engine telemetry
and the modern roll autopilot reuse the already pinned source; no new numerical
or browser dependencies were added. Python's standard library supports the
adapter and its six tests, including the pinned c172ap MSL/VS/output-gate wiring. See [source mappings](research/2026-11-02-classic-controls.md).

## Aircraft reference values in application source

The application ships individual numerical aircraft values, not documents or model
files. The **rights basis is unresolved** for both groups:

| Values and files | Source and integrity | Rights position |
| --- | --- | --- |
| 1982 C172P POH KCAS limits, stall speeds, CG limits, load factors and VA (`app/src/aircraft-handbook-data.ts`, `airspeed-markings.ts`) | Third-party-hosted scan of one airframe's POH, SHA-256 `5c63c4b4…306c`; page citations in [research](research/2026-11-02-c172p-handbook-diagrams.md) | Cessna copyright; shipped as `facts_only` values without text or figures. The GAPS Q5/Q7 allowances name the 172S POH, not this document. |
| JSBSim `v1.3.3` c172x contacts, span, AERORP, alpha limit, tank capacity; `eng_io320` maximum RPM; `FGTank` default density (`aircraft-handbook-data.ts`, `spatial-stall.ts`, `c172x-instrument-references.ts`) | `c172x.xml` raw SHA-256 `b736f4b7…1840`, `eng_io320.xml` `0cedc1e3…d8c6`, re-fetched 2026-11-03 | `c172x.xml` declares an unversioned "GPL" license and "not to be sold"; the E1 survey rated it *not cleared*. `eng_io320.xml` has no notice; the repository is LGPL-2.1. GAPS Q17 excludes shipping the data files and did not consider extracted values. |

A user decision or documented rights analysis is needed before these values can be
called cleared (R-DATA-1). See [notices](../THIRD_PARTY_NOTICES.md).

## Public regional terrain data

The local [public height package](../app/public/terrain/README.md) is a derived
1,025²-node region from Hessen HVBG `he_dgm1_32` (approximately 32 m overview of
DGM1, edition 2025H2, DHHN2016 physical heights, DL-DEZero 2.0) and BKG's
GCG2016/2023 western quasigeoid (CCBY4.0, © Bundesamt für Kartographie und
Geodäsie; retrieved 2026). [The manifest](../app/public/terrain/edfe-taunus-v1.json)
pins raw source hashes, returned affine metadata, derived byte hash and tool
versions. Source data are resampled, not replaced with generated heights; the
native callback and renderer share SW–NE triangles while ellipsoid conversion
remains outside dynamics. The combined binary is 8,405,000bytes; no external
terrain service or GIS runtime is used in flight. BKG attribution and the full
[license](../LICENSES/CC-BY-4.0.txt) are retained. The compiler's pinned
numpy 1.26.4 (BSD-3-Clause), pyproj 3.7.2 (MIT) and rasterio 1.4.3 (BSD-3-Clause)
dependencies (licenses per PyPI metadata, read 2026-11-03) are authoring-only. Their
binary wheels can carry PROJ/GDAL native libraries under those libraries' own licenses. No installed
GIS binaries, wheels or downloaded source archives are committed or redistributed.

A sharper 3000×1800airport photograph is bundled with its own
[DL-DEZero source/request/hash record](../app/public/imagery/DETAIL-SOURCE.json).
Its effective output pixels are approximately 0.74–0.76m, distinct from 20 cm source
DOP20 resolution. Its retrieval time and layer edition were not recorded either; the
first commit time is given as an upper bound. Farther regional shading is explicitly derived from the DEM,
not invented satellite photography. Full-resolution tiled imagery/terrain and
complete 100 NM coverage remain later work.

The KAP 140 operating model adds project-authored worker modules `kap140.js` and
`navigation.js` (twelve allowlisted runtime files in total, including the independent altitude alerter). The prepared
`c172ap.xml` preserves upstream gains/notices and records source/prepared hashes;
generated aircraft/runtime files remain local and are not redistributed. Native
VS/ALT output is separate from the legacy engine/AP group. Manufacturer manuals
are source references only: no PDF, figure or extract is bundled. See
[autopilot research](research/2026-11-03-kap140.md) for inspected editions/rights.

## Historical Rhein-Main navigation snapshot

`app/public/navdata/` adds local source-derived NAV810 data, not an npm dependency
or live service. Source cycle 2013.10/build20131334, FlightGear fgdata commit
`5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95`, gzip SHA-256
`24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839`.
Robin A. Peel copyright 2013/GPL-2.0-or-later is retained, with corresponding source
subset and full license. Derived units/encoding/explicit component pairing and
compiler hash are recorded in the JSON; manifest binds runtime bytes. This is a
GPL-compatible copyleft data component, selected because the inspected permissive
OurAirports inventory lacks ILS components. No proprietary AIS data is copied.
The community OurAirports EDDF anchor is public domain (Unlicense repository) and is
not an official ARP. Its source is pinned in the package `region.center_source_record`:
`airports.csv` at commit `72322ae9555947b969dda8effa793072159a9a1e`, SHA-256
`e869f2a5c500aa0a5c74c680559c4e3ab7e65c7a442daa7c92b7f99fb51613ca`, row id 2212,
retrieved 2026-11-03. This replaces the earlier URL-only reference.
See [data provenance and reproduction](../app/public/navdata/README.md) and
[independent source research](research/2026-11-03-rhein-main-navigation.md).

## Regional orthophoto pyramid

`app/public/imagery/rhein-main/` contains a bounded regional pyramid derived from
Hessen HVBG `he_dop_rgb` orthophotography under DL-DE Zero 2.0. WMS EPSG:3857
metatiles are resampled by the service, cropped and JPEG re-encoded; `SOURCES.json`
records exact raw requests/hashes, and the manifest binds derived tile bytes.
Capture dates remain unknown. Effective output is approximately 3.07 m at level 14
and 1.54 m at level 15 near 50°N; the existing approximately 0.75 m EDFE overlay
remains separate. No npm runtime dependency is added. The offline compiler uses
Pillow 11.2.1 (MIT-CMU; authoring only), pinned in
[requirements](../utils/imagery/requirements.txt), with the installed package's
license retained. See [research/rights](research/2026-11-03-regional-textures.md)
and [reproduction](../utils/imagery/README.md).
