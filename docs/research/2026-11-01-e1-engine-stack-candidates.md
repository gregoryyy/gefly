# E1 engine, browser and geography stack candidates

Status: candidate survey for the hands-on E1 study. **No engine, renderer, dataset
or language is selected**; nothing was built, installed into the repository, run or
benchmarked here. Researcher: Claude Code subagent `researcher`, dispatched by the
orchestrator. Accessed: 2026-11-01 10:00–11:10 Europe/Berlin (session clock).
Scope: [EVAL E1](../EVAL.md), R-REUSE-1, TODO 1.2.2; rights under [GAPS Q5](../GAPS.md)
and the [SBOM third-party policy](../SBOM.md); aircraft scope from GAPS Q3
(Cessna 172S, s/n 172S9491–172S9809, classic panel); first exercise circuit at
Frankfurt-Egelsbach (EDFE).

## Question

Which open flight-dynamics engine with which browser deployment path, and which
rendering/geography stack, best fit a deterministic fixed-step web simulator for a
classic 172S circuit at EDFE, released as GPL-3.0-or-later with a non-proprietary,
permissive-preferred third-party policy (copyleft needs justification and a
compatibility check; GPL-2.0-only material cannot be combined)?

## Method and queries

No deep-research skill or service ran; disclosed fallback: structured primary-source
investigation. The GitHub REST API was refused for repositories outside the session
(HTTP 403), so repositories were inspected with `git clone --depth 1` / `git ls-remote`
and `raw.githubusercontent.com` into a session scratch directory (not the repository;
nothing executed from them). Package metadata came from `registry.npmjs.org`. Web
searches (US-only search service) located license pages, which were then fetched
with `curl` where reachable.

Queries/lookups: JSBSim tags, `COPYING`, Emscripten guards, RNG, `FGFDMExec` API and
C172 file headers at v1.3.3; JSBSim WebAssembly wrappers (`jsbsim wasm emscripten`,
npm `jsbsim.js`); FlightGear `next` YASim SPDX headers and FDM directory; c172p-team
`LICENSE` and FDM declaration; PyFME; npm latest versions/licenses for cesium,
three, @babylonjs/core, maplibre-gl, 3d-tiles-renderer, deck.gl, ol, itowns;
license files at matching tags; Mapterhorn coverage/attribution JSON; Hessen
open-data page and DL-DE Zero text; EOX Sentinel-2 cloudless license; basemap.de terms.

Not reachable from this session: `gdk.gdi-de.org` (GDI-DE metadata catalogue;
connection reset / DNS refused for the fetch tool), `sgx.geodatenzentrum.de` (BKG
license PDFs), `gdz.bkg.bund.de`; the `s2maps.eu` license page renders client-side
and could not be read (EOX's own release page was read instead). Items depending
on them are marked *unverified*.

## Source register

Access date for all rows: 2026-11-01. "Pinned" = commit/tag actually inspected.

| ID | Source | Pinned revision / date | Inspected scope | Status |
| --- | --- | --- | --- | --- |
| E1 | [JSBSim](https://github.com/JSBSim-Team/jsbsim) | tag v1.3.3 `66f7fafc` (2026-10-16); master `911b2d48` (2026-10-29); 125 master commits since 2025-11-01; prior tags v1.3.2 2026-10-08, v1.3.1 2026-05-17, v1.3.0 2026-04-09, v1.2.4 2026-02-07 | `COPYING` (LGPL-2.1 text), README license section, `src/FGFDMExec.h/.cpp`, `src/FGJSBBase.h`, `src/models/FGPropagate.h`, `src/JSBSim.cpp`, `aircraft/c172{p,r,x}`, `.github/workflows` | **Read** |
| E2 | [0x62/jsbsim-wasm](https://github.com/0x62/jsbsim-wasm), npm `@0x62/jsbsim-wasm` | HEAD `3a039178` (2026-09-15); 25 commits since 2026-02-18; npm latest 1.2.4-beta.4 (2026-02-22); JSBSim submodule `1a2e114d` | `LICENSE` (MIT), README incl. license section, `package.json`, `patches/`, `cmake/CMakeLists.txt` flags, release tarball file list | **Read**; not built or run |
| E3 | [guptaronav/jsbsim-wasm](https://github.com/guptaronav/jsbsim-wasm) | HEAD `9a5b1c5a` (2026-07-07) | file list, LICENSE, README | Read: a derivative of E2 (same MIT copyright holder, same package name in README) with demo UI; not an independent port |
| E4 | npm [`jsbsim.js`](https://www.npmjs.com/package/jsbsim.js) | 0.0.4, published 2015-03-21; JSBSim 1.0 | registry metadata (LGPL-2.1) | Read; obsolete, Node CLI |
| E5 | [FlightGear](https://gitlab.com/flightgear/flightgear) | branch `next` `db0c8e70` (2026-10-28), version file 2024.2.0 | `LICENSE.md` (GPL-2.0 text), `LICENSES/` (BSD-3-Clause, BSL-1.0, CC0-1.0, GPL-2.0-or-later, MIT), `src/FDM/` listing, `src/FDM/YASim/*` headers/includes | **Read** (sparse) |
| E6 | [c172p-team/c172p](https://github.com/c172p-team/c172p) | master `63ba8527` (2026-10-05) | root listing, `LICENSE` (GPL-2.0 text), `c172p-main.xml` (`<flight-model>jsb</flight-model>`, `<aero>c172p</aero>`), `c172p.xml` header | **Read** (sparse) |
| E7 | [AeroPython/PyFME](https://github.com/AeroPython/PyFME) | HEAD `156fa9f1` (2020-08-13) | `COPYING` (MIT), aircraft list | Read |
| E8 | [CesiumJS](https://github.com/CesiumGS/cesium), npm `cesium` | 1.146.0 (2026-10-01); 13 releases in last 12 months (monthly) | `LICENSE.md` at tag `1.146` (Apache-2.0 + 43 third-party notices; no GPL/MPL/ODbL found by grep), `Core/Ion.js` (built-in default ion token and warning), `Core/CustomHeightmapTerrainProvider.js` exists | **Read** |
| E9 | [three.js](https://github.com/mrdoob/three.js), npm `three` | 0.187.0 (2026-10-30), tag r187 `LICENSE` MIT | license, npm metadata | Read |
| E10 | [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS), npm `3d-tiles-renderer` | 0.5.3 (2026-09-18), Apache-2.0 | license, npm metadata | Read; globe/ellipsoid features *not inspected* |
| E11 | [Babylon.js](https://github.com/BabylonJS/Babylon.js), npm `@babylonjs/core` | 9.33.1 (2026-10-29), Apache-2.0 (`license.md` at tag) | license, npm metadata | Read; geospatial features *not inspected* |
| E12 | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js), npm `maplibre-gl` | 6.16.0 (2026-10-25), BSD-3-Clause (`LICENSE.txt` at tag v6.16.0); 38 releases in 12 months | `src/ui/map.ts`: `defaultMaxPitch = 60`, `maxPitchThreshold = 180` | Read |
| E13 | npm `@deck.gl/core` 9.4.1 MIT; `ol` 10.11.0 BSD-2-Clause; `itowns` 2.46.0 (CECILL-B OR MIT, 2025-10-03); `@here/harp.gl` 0.28.0 Apache-2.0 (last 2022-01-17) | registry metadata only | Read (metadata) |
| E14 | [Emscripten](https://github.com/emscripten-core/emscripten) | latest tag 6.0.13; `LICENSE` at main `51ed9553` (MIT or UIUC/NCSA) | license | Read |
| E15 | npm `typescript` | 7.0.2 (2026-07-08), Apache-2.0 | metadata | Read |
| G1 | [Mapterhorn](https://mapterhorn.com/) terrain tiles, [code](https://github.com/mapterhorn/mapterhorn) | repo HEAD `2c4195dd`; site and `download.mapterhorn.com/attribution.json` (151 sources) | Home (code BSD-3, data per source), data-access (Terrarium-encoded 512 px WebP tiles in PMTiles), coverage (Germany/Hessen 1 m), attribution entries `dehessen`, `debayern`, `glo30` | **Read** |
| G2 | Hessen ATKIS-DGM1 (via G1 catalogue; producer listed as Hessian ministry); license copy `source-catalog/dehessen/LICENSE.pdf` | PDF printed 2025-09-01 from govdata.de | DL-DE Zero 2.0 text: "Jede Nutzung ist ohne Einschränkungen oder Bedingungen zulässig" | **Read** (secondary copy of an official license text) |
| G3 | [HVBG open data](https://hvbg.hessen.de/open-data) | live, "Einführung von Open Data zum 01.02.2022" | table: DGM1, DOM1, LoD2, DOP20 free via shop/download centre (DOP20 also WMS) | Read; **license name not stated on this page** |
| G4 | GDI-DE metadata for Hessen DOP20 / DGM (`gdk.gdi-de.org` records `f10d8ced…`, `5c88932c…`) | — | search-result summary only: `dl-zero-de/2.0`, citation "Geobasisdaten © Hessische Verwaltung für Bodenmanagement und Geoinformation" | *Unverified* (host unreachable) |
| G5 | [EOX Sentinel-2 cloudless 2024 release](https://eox.at/2025/03/sentinel-2-cloudless-2024/) | published 2025-03 | License section: 2016 version CC BY 4.0; 2018–2024 CC BY-NC-SA 4.0; attribution string | **Read** |
| G6 | [basemap.de Web Raster](https://basemap.de/produkte-und-dienste/web-raster/); terms PDF `sgx.geodatenzentrum.de/public/gdz/lizenz/deu/nutzungsbedingungen_basemapde.pdf` | live | product page read; PDF unreachable | *Unverified*: search summaries state CC BY 4.0, attribution "© basemap.de / BKG (year)" |
| G7 | Copernicus DEM GLO-30, OSM ODbL, OurAirports | see [EDDF note](2026-10-31-eddf-open-foundation.md) S2–S4 | — | Not re-read; G1 lists GLO-30 as "COPERNICUS full, free and open license" with "All rights reserved" producer line |
| P1 | [C172S/FR172 note](2026-11-01-c172s-fr172-sources.md) S13 | JSBSim master `911b2d48` | C172 model headers | Cross-checked at v1.3.3 (same notices) |

## Findings — dynamics

### JSBSim (E1)

- **License:** library and Python module LGPL-2.1 (`COPYING`, README); Unreal
  reference app MIT; MATLAB interface BSD. LGPL-2.1 §3 permits applying GPL v2 or
  any later version to a copy, so JSBSim can be combined into a GPL-3.0-or-later
  work (standard FSF compatibility reading; not legal advice). It is weak copyleft:
  if Gefly were later relaxed to a permissive license, JSBSim modifications would
  stay LGPL and users must be able to replace/relink the JSBSim part.
- **Maintenance:** active — v1.3.2 and v1.3.3 in October 2026, 125 master commits in
  the last 12 months; CI covers C++/Python builds, coverage, CodeQL — **no
  Emscripten/WASM CI job** in `.github/workflows`.
- **Browser readiness:** upstream v1.3.3 already contains `__EMSCRIPTEN__` guards in
  `FGfdmSocket.cpp` and `simgear/misc/strutils.cxx`, which are two of the three hunks
  in E2's compatibility patch; E2's ANSI-colour hunk in `FGJSBBase.cpp` is not
  upstream. *Inference:* a v1.3.3 WASM build needs at most a small patch; unbuilt.
- **Fixed step:** `FGFDMExec::Setdt()`/`GetDeltaT()`; the standalone default is
  `simulation_rate = 1/120 s` (`JSBSim.cpp` l.108); scripts use `dt="0.008333"`.
  `Hold/Resume`, `SuspendIntegration`, `EnableIncrementThenHold(n)` and selectable
  integrators per state (`simulation/integrator/...`, 0 = freeze) exist. The host
  calls `Run()` once per step, so the step is independent of display frames.
- **Determinism/replay risks:** RNG is seeded (`simulation/randomseed`, default 0)
  but uses `std::default_random_engine` with `std::normal_distribution`
  (`FGJSBBase.h` l.96–98). Both are implementation-defined, so **native (libstdc++)
  and WASM (Emscripten libc++) traces with turbulence/random inputs are expected to
  differ**; libm transcendental results can also differ by ulps between native and
  WASM. *Inference:* claim determinism per binary (same WASM file, same inputs),
  and compare native↔WASM only within tolerances; disable random models or replace
  the generator for the reference cases. No full-state snapshot/restore method
  was found in `FGFDMExec.h` (grep for Save/Snapshot/Copy); replay must be
  re-simulation from initial conditions plus the event log unless a property-dump
  restore is proven — *unverified*.
- **Terrain coupling:** ground height comes through `FGGroundCallback`; Gefly must
  feed the same terrain model the renderer and scoring use (ARCH geography rule).
- **Aircraft data:** no 172S model (P1). `c172p.xml`/`c172r.xml` have no license tag
  and carry "educational and entertainment purposes only … not to be sold";
  `c172x.xml` (1982 172P) declares "GPL" with no version. *Inference:* "not to be
  sold" is a further restriction inconsistent with (L)GPL freedoms; ship none of
  these files without a rights decision. Use them as local test fixtures and the
  XML schema as the structure for an independently sourced 172S definition.
- **Size:** source tree `src/` 4.1 MB, `aircraft/` 4.0 MB (whole tree, not needed).

### JSBSim browser wrappers (E2–E4)

- **E2 `@0x62/jsbsim-wasm`** is the only maintained-looking candidate: TypeScript SDK
  with bindings generated from `FGFDMExec.h`, Emscripten flags `-O3`,
  `MODULARIZE`, `EXPORT_ES6`, `ENVIRONMENT=web,worker,node`, `ALLOW_MEMORY_GROWTH`;
  MEMFS data, optional IDBFS. Release `dist/wasm/jsbsim_wasm.wasm` is
  **1,588,236 bytes** uncompressed (+122 kB JS glue) for JSBSim 1.2.4. Licensing as
  stated by the author: wrapper MIT; WASM bundle and patches LGPL-2.1 — both
  compatible with GPL-3.0-or-later. Risks: single maintainer, "early development"
  warning, beta tag, npm still pinned to JSBSim 1.2.4 (submodule tracks master),
  no observed tests of determinism or worker use. Building our own WASM from a
  pinned JSBSim tag with E2 as a reference is the lower-dependency option.
- E3 is a derivative of E2 (same holder/package), not independent evidence. E4 is
  a 2015 JSBSim 1.0 Node port — reject as obsolete.

### FlightGear/YASim (E5) and c172p (E6)

- **YASim license:** GPL-2.0-**or-later** where marked — 23 of 67 files carry
  `SPDX-License-Identifier: GPL-2.0-or-later`; the rest have no header and fall
  under the repository's GPL-2.0 `LICENSE.md` with `LICENSES/GPL-2.0-or-later`.
  Compatible with GPL-3.0-or-later by choosing v3 (the unmarked files need a
  per-file check; *unverified*). Strong copyleft; blocks later relaxation.
- **Coupling:** `FGFDM.cpp` includes `Main/fg_props.hxx` and simgear logging; 71
  FlightGear/SimGear references across YASim `.cpp` files. No browser build found.
  YASim solves coefficients from published performance figures — a different
  validation philosophy from JSBSim tables. *Inference:* high adaptation cost, low
  priority for E1.
- FlightGear `next` `src/FDM/` now holds JSBSim, YASim, UFO, NullFDM, SP and
  external interfaces; **LaRCsim/UIUC are absent** from this branch.
- **c172p (E6):** a 172P package using **JSBSim** (`<flight-model>jsb</flight-model>`),
  not YASim. `LICENSE` is the GPL-2.0 text with **no "or later" statement found**
  in the inspected files; the aero file `c172p.xml` has author "Unknown" and no
  license tag. *Inference:* treat as possibly GPL-2.0-only → **cannot be combined**
  with GPL-3.0-or-later until the version is clarified with the c172p team; use
  only as a behavioural/systems reference.

### Other FDMs and a reference harness

- PyFME (E7): MIT, Python, last commit 2020-08-13, has a `cessna_172` class without
  identified variant data. Useful only as an equation/test-structure reference.
- No other credible, maintained, open, browser-capable general aviation FDM was found
  in this bounded survey (a negative search result, not proof of absence).
- A **custom minimal 6-DOF model in TypeScript** is appropriate only as the E1
  reference harness (stationary/no-force, known force/torque, unit/frame conversions,
  timestep refinement) and to cross-check JSBSim integration, not as the product
  engine (R-REUSE-1).

## Findings — rendering and geography

- **CesiumJS (E8)**, Apache-2.0, monthly releases: WGS84 globe, geodetic camera at
  any pitch, terrain providers (quantized-mesh; `CustomHeightmapTerrainProvider`
  exists), WMS/WMTS/XYZ imagery, 3D Tiles. Risks: the engine embeds a **default
  Cesium ion access token** and defaults to ion services (Cesium World Terrain,
  Bing imagery) — proprietary services, excluded by Q5; Gefly must disable the
  default base layer/token and configure open terrain/imagery explicitly. npm
  package unpacked 79.7 MB (built subset smaller; *not measured*). Cesium's own
  `Clock` is a render clock; the simulation clock must stay in the worker.
  Search results describe GeoFS as Cesium-based — *unverified*, not relied on.
- **three.js (E9)** MIT + **3DTilesRendererJS (E10)** Apache-2.0: smallest and most
  permissive, flexible cockpit rendering, but globe/terrain streaming, geodetic
  precision and imagery layering are integration work. Over the 185.2 km region,
  Earth curvature drop is ≈ 185,200² / (2 × 6,371,000) ≈ **2.7 km** at the edge, so
  a flat local-tangent-plane world is acceptable for the EDFE circuit but not for
  the full region without ellipsoidal handling (derived arithmetic).
- **Babylon.js (E11)** Apache-2.0, very frequent releases; comparable to three.js;
  geospatial features not inspected — lower priority.
- **MapLibre GL JS (E12)** BSD-3-Clause: map-centric; default `maxPitch` 60°, capped
  at 180° in v6.16. Good fit for a 2D moving map, briefing and instructor review
  (Terrarium raster-DEM supported), not the primary out-the-window view.
  deck.gl (MIT), OpenLayers (BSD-2) are alternatives for 2D; iTowns is dual
  CECILL-B/MIT; harp.gl is inactive (2022).
- **Terrain for EDFE (Hessen):** Hessen **ATKIS-DGM1** 1 m bare-earth model under
  **DL-DE Zero 2.0** (G1/G2; G3 confirms free open data since 2022-02-01; official
  metadata G4 not reached). Most permissive option; best for runway/circuit area.
  Regional fallback **Copernicus GLO-30** (surface model incl. vegetation/buildings;
  attribution/conditions per EDDF note S4). **Mapterhorn** (G1) ships both as
  Terrarium-encoded PMTiles (code BSD-3; data per-source licenses — Bayern DGM1 is
  CC BY 4.0, so mixed-region extracts need per-source attribution).
- **Imagery:** Hessen **DOP20** 20 cm orthophotos — free per G3; license
  DL-DE Zero 2.0 only per G4 (*unverified*). **Sentinel-2 cloudless 2016** is
  CC BY 4.0; **2018–2024 are CC BY-NC-SA 4.0 → excluded** by Q5 (non-commercial)
  (G5). **basemap.de** web maps: CC BY 4.0 per search summaries (*unverified*,
  terms PDF unreachable). **OSM** ODbL: share-alike on derived databases; needs a
  Q5 justification if adopted (produced map works only need attribution).
- Open data licenses are not software licenses; they ship as separately licensed
  data next to GPL code (aggregate). Record each in the region manifest (ARCH).

## Language/runtime

- **TypeScript (Apache-2.0) app + Web Worker owning the fixed-step loop** with
  JSBSim compiled to WASM via **Emscripten (MIT/NCSA)**: renderer reads snapshots
  and interpolates; controls are timestamped to simulation ticks; replay = pinned
  binaries + initial conditions + seed + event log. `SharedArrayBuffer` would need
  cross-origin isolation (COOP/COEP) headers — a hosting constraint; `postMessage`
  with transferable buffers avoids it (latency to be measured).
- Alternatives: Rust→WASM (MIT/Apache toolchain) for a custom harness; JSBSim as a
  native headless service (useful as native reference, adds network latency and a
  server dependency — conflicts with self-hostable/offline goals); pure TS physics
  (harness only). WASM floating-point arithmetic is IEEE-754 deterministic except
  NaN bit patterns; relaxed-SIMD and FMA contraction must be avoided/pinned
  (*inference; verify compile flags*).

## License matrix

| Component | License (verified at) | Type | With GPL-3.0-or-later | Q5 note |
| --- | --- | --- | --- | --- |
| JSBSim engine | LGPL-2.1 (v1.3.3) | weak copyleft | Compatible (LGPL §3 → GPL v2+) | Copyleft: justification + keep as separable WASM module |
| JSBSim c172p/c172r XML | none + "not to be sold" | unclear/restrictive | **Not cleared** | Do not distribute |
| JSBSim c172x XML | "GPL" (no version) + "not to be sold" | unclear | **Not cleared** | Do not distribute |
| @0x62/jsbsim-wasm wrapper | MIT; bundle LGPL-2.1 (author statement) | permissive + weak copyleft | Compatible | Beta, single maintainer |
| YASim | GPL-2.0-or-later (SPDX on 23/67 files) | strong copyleft | Compatible as v3 (unmarked files unverified) | Blocks relaxation |
| FlightGear c172p | GPL-2.0 text, no "or later" found | strong copyleft | **Possibly incompatible** (if GPL-2.0-only) | Reference only |
| PyFME | MIT | permissive | Compatible | Inactive |
| CesiumJS | Apache-2.0 (1.146) | permissive | Compatible (GPLv3 accepts Apache-2.0) | Disable ion defaults |
| three.js / 3DTilesRendererJS | MIT / Apache-2.0 | permissive | Compatible | — |
| Babylon.js | Apache-2.0 | permissive | Compatible | — |
| MapLibre GL JS | BSD-3-Clause | permissive | Compatible | — |
| Emscripten / TypeScript | MIT or NCSA / Apache-2.0 | permissive | Compatible | Toolchain |
| Hessen DGM1 (DOP20 *unverified*) | DL-DE Zero 2.0 | public-domain-like | Data, aggregate | Preferred |
| Copernicus GLO-30 | Copernicus free/open license | open, conditions | Data, aggregate | Attribution |
| Mapterhorn tiles | code BSD-3; data per source | mixed | Data, aggregate | Per-source attribution |
| Sentinel-2 cloudless 2016 / 2018+ | CC BY 4.0 / CC BY-NC-SA 4.0 | open / NC | 2016 ok / **excluded** | — |
| basemap.de | CC BY 4.0 (*unverified*) | open | Data | Verify PDF |
| OpenStreetMap | ODbL 1.0 | share-alike data | Data | Needs justification |

## Risks

1. WASM determinism and native↔WASM equivalence are untested; implementation-defined
   RNG and libm make bit equality across native and WASM unlikely.
2. No upstream JSBSim WASM CI; wrapper is beta and single-maintainer.
3. No license-clean 172S aircraft definition exists; a new sourced XML is needed
   (E2 evaluation, separate from E1).
4. CesiumJS defaults pull proprietary ion services unless explicitly disabled; bundle
   size and Mac/Safari frame pacing unmeasured.
5. Terrain/imagery licenses for DOP20 and basemap.de not read at the official source;
   GLO-30 is a surface model and must not define runway elevations.
6. c172p and unmarked YASim files' GPL version unclear.

## Recommended shortlist for the hands-on study (proposal)

1. **Dynamics A (primary):** JSBSim **v1.3.3** (`66f7fafc`) compiled to WASM with
   Emscripten (pin a tag, e.g. 6.0.13) inside a dedicated Web Worker, fixed
   dt = 1/120 s, random models off, using E2 as a build reference (or E2 itself
   rebuilt against v1.3.3). Compare against native v1.3.3 (code1's
   `studies/e1-jsbsim/` work) on the E1 fixtures; use `c172x`/`c172p` only locally.
2. **Dynamics B (reference harness):** minimal TypeScript 6-DOF rigid-body integrator
   for the analytical E1 fixtures and timestep refinement; not a product engine.
3. **Rendering A:** CesiumJS 1.146 with ion disabled, Hessen DGM1 (or Mapterhorn
   Terrarium tiles via `CustomHeightmapTerrainProvider`) and Hessen DOP20/basemap.de
   imagery around EDFE. **Rendering B:** three.js r187 + 3DTilesRendererJS with a local
   tangent plane at EDFE. Measure load size, frame pacing, input latency and CPU
   headroom on the Q4 Mac baseline.
4. **2D map/review:** MapLibre GL JS 6.16 (BSD-3) with the same terrain/imagery.
5. **Not shortlisted:** YASim (coupling, copyleft), FlightGear c172p (license version),
   jsbsim.js (obsolete), PyFME (inactive, Python), Babylon.js (no differentiator found).

## Handoff

To orchestrator/product: (a) decide whether the LGPL-2.1 JSBSim engine is an accepted
Q5 copyleft exception (proposed justification: no permissive equivalent found; kept as
a separable WASM module); (b) choose E1 reference Mac/browser versions and budgets
before running; (c) ask the c172p team / JSBSim team about GPL version and the "not
to be sold" notes if any file is to be reused; (d) allow `gdk.gdi-de.org` and
`sgx.geodatenzentrum.de` (and the BKG download centre) in session network settings to
verify DOP20/DGM1 metadata and basemap.de terms; (e) assign the 172S JSBSim
definition as separate E2 work. No SPEC, SBOM, GAPS, TODO or DONE changes were made.
