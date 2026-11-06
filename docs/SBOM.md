# Software, tools and source inventory

JSBSim is the selected dynamics engine, with TypeScript, CesiumJS, a three.js fallback and MapLibre selected for the web application (GAPS Q17). The experimental application pins CesiumJS, MapLibre, three.js and its build/test tools with npm in `app/package-lock.json`; the 3D flight scene and 2D practice map are implemented within their recorded prototype limits. No repository-wide workspace layout is selected. Study/tool versions are recorded below. This overview does not replace future machine-readable inventories.

The user intends a **free/open-source project** and directs **reuse of open physics
engines/models wherever practical**. Original project material is **GPL-3.0-or-later** (GAPS Q5);
engine, aircraft model, wrapper, imagery, geodata, charts and community content
must each retain their own license/provenance. Select a compatible distribution
plan rather than assuming a single engine license covers all these materials.

## Experimental browser application

The local [application](../app/README.md) pins three.js 0.187.0 (MIT) to generate the original generic aircraft visual, Vite 8.3.5 (MIT), TypeScript 7.0.2 (Apache-2.0), @types/three 0.187.0 (MIT) and Playwright 1.64.1 (Apache-2.0). Runtime dependencies are CesiumJS 1.146.0 and MapLibre GL JS 6.16.0, described below, and three.js. Exact transitive versions/integrity hashes are in `app/package-lock.json`. **Audit, 2026-11-03 07:36 Europe/Berlin:** the lockfile was last changed in `3e8fc63` (SHA-256 `33d24625cb9849f2dc6ff594229f2464befa83db318f04a652e3efa5dca39342`; 125 packages: 55 prod, 70 dev, 48 optional). It was audited with npm 11.19.1 on Node v24.22.1 against the public registry advisory database. `npm audit --omit=dev` and the full `npm audit` each reported 0 vulnerabilities and exited 0. The earlier 2026-11-01 zero-advisory audit came before the TypeScript 7, Vite 8, Cesium and MapLibre changes and does not cover them. An audit is a dated advisory lookup, not a security review. The three.js license is retained under [LICENSES](../LICENSES/three-MIT.txt). Fonts use local system fallbacks. Application, engine, physical terrain and bundled photographs are local. The separate fixed-source scenery proxy now makes public WMS requests during flight/map use; its runtime dependencies and source rights are inventoried below.

JSBSim and c172x remain generated local research assets under the existing study recipe and rights limitations below. Vite serves only the explicitly allowlisted worker/runtime files in `app/runtime.ts`. Shared project-owned helpers are bundled with the UI; generated JSBSim files, the worker endpoint and live scenery proxy remain outside the production UI build, which is not a deployable flight simulator. No runtime aircraft-model assets or source SDKs are committed or published.


CesiumJS 1.146.0 (Apache-2.0) now renders the actual geographic scene. Its workers, widgets, textures, license and third-party inventories come from the locked npm package, without Cesium ion or commercial base layers; see [license](../LICENSES/Cesium-Apache-2.0.txt). A fixed official Hessen ATKIS DOP20 starter photograph is bundled under `app/public/imagery/`: [source bounds, request URL, byte hash and license](../app/public/imagery/SOURCE.json). The 1024×1024 JPEG is an unmodified GetMap image from the `he_dop_rgb` layer, covering 8.62–8.66° E / 49.95–49.975° N (approximately 3 × 2.8 km). [Dataset terms](https://opendata.hessen.de/de/dataset/atkis-dop-20) specify [DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0); voluntary source credit remains visible. No acquisition date or current airport conditions are claimed. Retrieval time and layer edition were also not recorded. The live `he_dop_rgb` layer has no time dimension, so the request URL does not pin an edition. SOURCE.json therefore records `retrievedAt`/`sourceEdition` as null and gives the first commit time as `retrievedNotLaterThan`. The photographs are now draped over the separately sourced regional terrain on normal flights, or the ellipsoid on explicit flat studies. Imagery alone establishes no accepted airport elevation, chart geometry or navigational authority. A bundled 512×512 coarse overview adds regional context at 8.4–8.9° E / 49.8–50.1° N; its separate byte hash and request are also recorded in SOURCE.json. The application labels overview-only coverage when regional imagery is unavailable. The bundled overview has bounded coverage; live regional map/photo layers provide additional context as described below. Complete EDDF/100 NM coverage remains future work.

The earlier unrestricted adaptive WMS experiment was removed after excessive
refinement/service timeouts. The current replacement uses bounded XYZ paths,
fixed public sources, small PNG dimensions, deadlines and memory/concurrency
limits. Verified bundled photography remains available independently; the live
service does not grant additional airport accuracy or currentness.

MapLibre GL JS 6.16.0 (BSD-3-Clause) is pinned for the lazy-loaded practice map. Its worker is explicitly bundled by Vite; no external style/glyph service is used. The map adds local versioned airport points and the fixed-source public scenery endpoints below. The complete [MapLibre license](../LICENSES/MapLibre-BSD-3-Clause.txt) is retained in source and copied into UI build output. Geographic conversion follows the [official image-source corner convention](https://maplibre.org/maplibre-gl-js/docs/API/classes/ImageSource/). The plotted route uses at most 600 endpoint-preserving samples of the already bounded flight trace; it establishes no navigational/chart or airport-reference accuracy.

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
and the Python standard library. Package installation includes the app's npm dependencies
from the lockfile via `npm ci --ignore-scripts` (no lifecycle scripts), in the
browser-application job and in the runner's app phase. The browser-application
job separately installs pinned Pillow with Python 3.11 for offline scenery-proxy
tests; those tests use supplied responses rather than live WMS. It invokes no live peer
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
| CesiumJS 1.146.0 | Studied in [studies/e1-browser/render](../studies/e1-browser/render/README.md) via CDN; Apache-2.0 (permissive). Now adopted and locked in the application, with local package assets and no ion/Bing service. The older study's CDN loading without SRI is historical study behavior, not the app's delivery path. |
| three.js 0.187.0 | Studied in [studies/e1-browser/render](../studies/e1-browser/render/README.md) via CDN; MIT (permissive). Adopted through the application lockfile for the local prototype; the older study still uses CDN loading without SRI. |
| emsdk 6.0.13 | Build tool for the JSBSim WASM study ([sim](../studies/e1-browser/sim/README.md)); not bundled; build outputs not committed. |
| OpenStreetMap data | Assess relevant basemap/coverage and ODbL obligations; public tile service access is a separate policy and hosting decision. |
| OurAirports data | Adopted as a bounded, hash-pinned 731-entry five-state community map directory, with public-domain terms and accuracy limitations; not an accepted substitute for EDDF's official ARP, surveyed ground or authoritative procedures. |
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

`studies/e1-browser/sim/prepare-propeller.py` additionally reads the pinned
JSBSim `utils/aeromatic/prop2.php` (David P. Culp, Aero-Matic v1.1) to derive a
generic fixed-pitch propeller with a windmilling power region. The generator is
covered by the JSBSim source repository's LGPL-2.1-or-later licence; no PHP
runtime, package dependency or copied coefficient asset is added. Source hash
guards cover the generator and existing engine/propeller; the output keeps the
existing geometry/inertia/Mach corrections and uses direct-drive engine design
RPM instead of the generator's estimated gearbox. Build metadata records input,
script and generated-output hashes. Generated XML and WASM remain ignored local
research assets with the existing model/data distribution restrictions. This
does not resolve source rights or validate an installed C172 propeller.

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
`navigation.js`; `terrain-stream.js` extends the explicit runtime allowlist for
regional loading. The prepared
`c172ap.xml` preserves upstream notices and records source/prepared hashes. The v3 adapter changes generic pitch PID gains and adds pitch-rate damping to reduce measured climb oscillation; these are simulator tuning, not manufacturer KAP140 coefficients;
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
Pillow 11.2.1 (MIT-CMU; authoring for this offline compiler), pinned in
[requirements](../utils/imagery/requirements.txt), with the installed package's
license retained. See [research/rights](research/2026-11-03-regional-textures.md)
and [reproduction](../utils/imagery/README.md).

## Streamed regional terrain, airport directory and live photography

The [regional terrain manifest](../app/public/terrain/region/manifest.json)
declares 608 slots over 6–14°E / 47–51.75°N. Its compressed, hash-bound
index identifies 475 assets (382 full, 93 partial), each 133,128 bytes, totaling
63,235,800 bytes; 133 unavailable slots have no asset. Unsupported nodes in
partial assets retain paired height/geoid NaNs, rather than invented elevations. BKG DGM200 uses EPSG:25832 and DHHN2016 normal heights at
200 m source spacing, under DL-DE-BY-2.0. The ZIP SHA-256 is
`db82ad95da97bf9b8a5b4eab7aa856cd6f67bb0caaec551d21d12c7807ab3216`;
the extracted TIFF SHA-256 is
`2921c7f92b970bb115ce94d6d19eb42a7735ca8c60b176660567dd1ffb62cd1f`.
Source surveys date approximately 2000–2019. The expanded package uses the
nationwide GCG2016/2023 CC-BY-4.0 archive,
[`quasigeoid.geo89.de.zip`](https://daten.gdz.bkg.bund.de/produkte/sonstige/quasigeoid/2023/quasigeoid.geo89.de.zip),
SHA-256 `d5a40a20ae4cdb372c6ca27dbf742c1f46d8e28be282a12ef083fb93b823c67a`.
The separate fine local package retains its existing GCG West source.
The compiler uses exact PROJ coordinates and source-centre bilinear interpolation
on a shared lattice, slices common edges and writes interleaved float32 H/ζ.
Native/render sampling adds a derived fine/coarse transition. Per-tile hashes,
compiler hash, source URLs and modifications are in the manifest; see
[package/reproduction](../app/public/terrain/region/README.md). No source ZIP or
GIS library is needed by the browser while flying.

`app/public/airports/` contains 731 entries from Bavaria, Baden-Württemberg,
Hesse, Rhineland-Palatinate and Saarland, preserving all source types, including
244 heliports and 41 closed facilities, from the
[OurAirports public-domain inventory](https://ourairports.com/data/). Pinned
commit `e86a650a968ba239a1288f96c05fcb80688e77a6`, CSV SHA-256
`6852f06007ec1154256faff98edb8bbfbbce93fdb279525940864f07e9d90b32`;
the 121,497-byte selected JSON has SHA-256
`dab6325f2948d4e93b36e3bb6b754ecb12c5f4b01127a82706dc521309fee6ad`.
The compiler keeps identifiers, coordinates, type and optional elevation, with
edition/rights in its manifest. Community positions/elevations do not establish
runway, navigation or current operational applicability.

The development `/scenery` proxy adds these unversioned public services; they are
not bundled source datasets or commercial provider integrations:

| Source | Fixed service/layer | Rights and visible credit |
| --- | --- | --- |
| BKG TopPlusOpen | `https://sgx.geodatenzentrum.de/wmts_topplus_open`, `web` / `WEBMERCATOR` | DL-DE-BY-2.0; linked BKG/year/license and [source inventory](https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_topplusopen.html). Map fallback, not photography/chart. |
| Hessen HVBG DOP20 | `https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows`, `he_dop_rgb` | DL-DE-Zero-2.0; HVBG credit retained. 20 cm source, not output resolution. |
| Bavaria DOP40 | `https://geoservices.bayern.de/od/wms/dop/v1/dop40`, `by_dop40c` | CC-BY-4.0; © Bayerische Vermessungsverwaltung (2026), linked LDBV/license. 40 cm source. |
| Baden-Württemberg DOP20 | `https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ATKIS_DOP_20_C`, `IMAGES_DOP_20_RGB` | DL-DE-BY-2.0; © LGL-BW (2026), linked LGL/license. 20 cm source. |
| Rhineland-Palatinate DOP20 | `https://geo4.service24.rlp.de/wms/rp_dop20.fcgi`, `rp_dop20` | DL-DE-BY-2.0; © GeoBasis-DE / LVermGeoRP (2026), Daten bearbeitet; [official layer metadata](https://www.geoportal.rlp.de/mapbender/php/mod_showMetadata.php?resource=layer&id=61676). 20 cm source. |
| Saarland DOP20 (2025 service) | `https://geoportal.saarland.de/freewms/dop2025`, `sl_dop20_rgb` | DL-DE-BY-2.0; © GeoBasis DE/LVGL-SL (2026); [official layer metadata](https://geoportal.saarland.de/mapbender/php/mod_showMetadata.php?resource=layer&id=49804). 20 cm source; service label does not establish each tile's capture date. |

Changes: fixed 256 px TopPlusOpen WMTS map requests, WMS EPSG:3857 resampling
into 512 px photo requests, transparent
photo composition and PNG encoding. Capture dates remain unknown. Cached bytes
are temporary and not a frozen Review image/video snapshot; request/resource
limits and external flow are in [SEC](SEC.md). Full EDDF/100 NM and global
provider adoption remain separate work.

The live compositor now requires **Pillow 11.2.1**, pinned in
[`utils/scenery/requirements.txt`](../utils/scenery/requirements.txt), under
MIT-CMU with PIL/Pillow copyright and its installed wheel's retained third-party
notices. It is a Python scenery-server runtime dependency as well as an existing
authoring tool, not an npm/browser/physics dependency. Python standard-library
process/JSON/base64 modules wrap it. No Pillow code is vendored into the project;
[THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md) retains the core license notice.
Static UI output does not include the Vite proxy; a production service and its
packaged dependency inventory remain hosting decisions.

## Southern Germany map-only navigation

`app/public/mapdata/` adds 144 German OurAirports radio-beacon records from the
same pinned commit as the five-state airport catalogue. The full navaids CSV hash
is `d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1`.
OurAirports releases these data as public domain/Unlicense, without an accuracy
guarantee. The snapshot is dated 2026-11-02 and was retrieved 2026-11-03.
The declared 6–14°E / 47–51.75°N envelope includes adjoining states; navaids lack
state membership fields. No official completeness/current-AIS claim is made.

The package also derives 66 German LOC/ILS parent records and their explicit
components from the existing GPL-2.0-or-later NAV810 2013.10 source, before
FlightGear scenery-height calibration. It retains consumed raw rows, source
notice and full license. The final 277-point, 175,504-byte GeoJSON SHA-256 is
`f485303ecf944d874a7cc7154a6ff0aa0f3de75c9c305372a9bd34bf1d2439d5`.
This is a separate map-only package; the receiver/worker inventory is unchanged.
See [source and rebuild instructions](../app/public/mapdata/README.md).

## Optional OSM landmark overlay

Direct pinned decoder dependencies: `@mapbox/vector-tile` 3.0.0 and `pbf` 5.1.2,
both BSD-3-Clause. They were already installed transitively; direct declarations
make their use explicit. The lockfile retains exact resolved packages/integrity.
Full notices are in `LICENSES/` and copied to UI build output.

The fixed OpenFreeMap `20261101_080013_pt` OpenMapTiles/OSM edition supplies
on-demand names and geometry. It is separate from BKG terrain cartography.
Linked OpenMapTiles/OSM attribution accompanies rendering; no offline tile or
landmark database is bundled. [Source/rights/limits](research/2026-11-04-osm-landmark-labels.md).

The decoder imports transitive `@mapbox/point-geometry` 1.1.0 under ISC; its
complete notice is retained in `LICENSES/point-geometry-ISC.txt` and UI output.


## Historical regional map fixes

[Fix data](../app/public/mapdata/fixes-README.md): Robin A.Peel FIX2013.10,
FlightGear fgdata commit5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95, GPL-2.0-or-later.
The regional2739-row subset preserves exact source coordinates and source-line
identities, including duplicated names. A50,948-byte gzip binary carries a
271,162-byte JSON payload, both bounded and manifest/hash checked. Original source
rows, notice and full GPL license accompany the package. No current AIRAC,
receiver database, published procedure or aircraft guidance is implied.


## Coarse global terrain and cartography fallback

R-WORLD-11 / TODO 2.0.135 adds the local, derived
[world-v1 package](../app/public/terrain/world/README.md): 361×181 interleaved
physical/geoid float32 nodes, 522,728 bytes, SHA-256
`36d07b3e7ef82882402ebeca41a3f3842900a91baac9b4ef29fe43d9b007d099`.
The source spacing is one degree (about 111 km north–south). Quarter-degree
streaming cells and display subdivision add no measurements. NOAA ETOPO 2022
ice-surface heights use EGM2008; NGA's public-domain EGM2008 grid supplies geoid
separation. Natural Earth's public-domain 1:50 million connected-ocean mask
creates an approximate ocean surface while preserving inland negative relief.
Exact source URLs, rights, input/compiler hashes and derivation are pinned in
[SOURCE.json](../app/public/terrain/world/SOURCE.json) and the
[notices](../THIRD_PARTY_NOTICES.md#bundled-coarse-world-terrain).

The offline compiler uses Python and already-pinned Pillow 11.2.1; no new
runtime dependency or live DEM provider is added. Numeric source downloads stay
in ignored scratch storage. Existing OpenFreeMap/OpenMapTiles/OSM source and
decoder dependencies provide fixed-route global cartography, under available regional photography, with the same bounded network/cache policy and required credit. No
external style, glyph or sprite service is introduced. Country-specific
[Swiss/Austrian sources](research/2026-11-05-swiss-austria-terrain-sources.md)
remain researched candidates requiring edition-specific rights and datum work.

Native runtime provenance is checked separately on the integrated revision; generated local engine files are not distributed by this source change.

## Copernicus global elevation source service

The [source inventory](../app/public/terrain/copernicus/SOURCE.json), [retained licence](../app/public/terrain/copernicus/LICENSE.pdf) and [source note](research/2026-11-05-copernicus-source-provenance.md) identify the fixed public2021 GLO-30 COG collection, metre/EGM2008 reference, rights and derived sampling. Restricted Node built-in DEFLATE/Float32 decoding adds no dependency. Server v1 supplies fine world30 samples; v2 supplies quarter-degree overview samples as a common API prerequisite. The display client is a separate increment. This DSM includes vegetation/buildings and is not bare-earth or surveyed airport terrain. Existing coarse geoid and explicit fallback/source limitations remain.


## OpenFlightMaps optional streaming service

No package/dependency or chart-pixel asset is added. The opt-in overlay uses the
publisher-documented EPSG3857 transparent aero API through a fixed server route.
SelectedAIRAC2611 metadata comes from ED_2611.xml (29October–26November2026),
SHA-2561631a347b654bf8fe2dd5481c3b5a6076bfefa7673f99dca3ddcdadef3ea6572.
The source module records the exact publisher metadata/credit/report URLs.
[Official About grant](https://openflightmaps.org/about/) and
[application interfaces](https://openflightmaps.org/2016/08/18/how-to-use-application-interfaces/)
support the streaming prototype with attribution and end-user error reporting.
The old full GUL PDF still returns404; broader product redistribution/full terms
review remains separate. Only bounded server memory and normal private HTTP tile
caching are used; no persistent app chart bulk cache, OFMX or plate bundle.
See [source/implementation note](research/2026-11-06-ofm-overlay-implementation.md).

## On-demand OSM airport surface packages

The fixed Private.coffee Overpass endpoint supplies live OpenStreetMap runway,
taxiway and apron ways under ODbL-1.0. Generated/cache packages keep source
way/version/timestamps, the raw response SHA and snapshot/generated dates;
mapper identities are excluded. OSM-derived data rights remain separate from
GPL application code. Attribution links to https://www.openstreetmap.org/copyright.
No npm dependency, bundled worldwide directory, model/physics data or new
OurAirports fallback is introduced. Source/cache applicability and public-service
limits are documented in [the note](research/2026-11-06-on-demand-airports.md).
