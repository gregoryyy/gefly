# Public terrain, sharper airport imagery and control/audio corrections

Scope: TODO 2.0.32, 2.0.34 and 2.0.35; R-WORLD-2, R-DATA-1, R-SIM-3,
R-VIEW-1, R-REVIEW-1, R-INPUT-1, R-AUDIO-1 and R-ENG-1 affected criteria.
Base: `7610edc9b2a2a655bdbdb4d82a64b0adab5ae487` (PR #46 head).
Authors: Codex orchestrator on dataset compilation, common sampling/schema,
worker/session/trace integration, terrain-plane collision and shared records;
fov_input/code1 on native terrain callback/build/fixtures and pointer correction;
engine_sound_ui/code2 on Cesium terrain/rendering and audible RPM spool;
fov_housekeeping on parallel source research/input records.

Frozen source/asset SHA-256:
`4109f8a0371c46261ed51c3b2f7473e1f266ba7bc77936226f779763529b9e81`.
The 44 sorted changed/new app, study simulation and terrain-authoring paths, including the
CC BY license, are hashed as path + NUL + bytes + NUL; Markdown excluded.
The local built WASM SHA-256 is
`b5ea56c3a517bb9756a6d95d2239fac45bace6ac6120cecad5e57e68f01aea52`.
Generated upstream aircraft/runtime artifacts remain local and ignored.

## Independent quality and validation

fov_housekeeping independently reviews non-authored implementation, excluding
its research/input prose and older pointer behavior it previously authored.
Root/code2 separately inspect primary-source rights/facts. Code2 also reviews
root/code1 native, worker, schema, trace and terrain-plane integration, excluding
its renderer/audio work. Component source hashes and criterion outcomes are in
local ignored output/terrain-probe/independent-integration/review-outcomes.json.
Quality and validation pass for the bounded increment; cross-provider peer is
separate and remains pending until an actual external result is recorded.

| Criterion | Independent evidence |
| --- | --- |
| R-WORLD-2/R-DATA-1: source, registration, rights | Hash-pinned Hessen WCS 2025H2 physical DHHN2016 grid and BKG GCG2016v2023 quasigeoid. Independent reprojection matches all 1,050,625 physical nodes bitwise after float32 quantization; 41 geoid holdouts match. Two independent WCS crops agree with source cells. Bundled original BKG notices and linked visible BKG 2026/license/Sources attribution are checked. |
| R-WORLD-2: shared surface/datum | Both consumers use SW–NE triangles. Physical H stays in JSBSim; rendering adds ζ. Independent airfield and hill physical/geoid holdouts pass. Native C++ geometry fixtures and three actual WASM groups cover plateau/contact, immutable data ownership, bounds and exact legacy flat digest. |
| R-WORLD-2: actual renderer | Four provider tests and three actual-browser groups. Near-ground L4 GPU mesh differs from the common surface by −0.226017 m at the airfield and −0.187497 m in hills, within the predeclared 0.25 m implementation budget. No survey-accuracy inference. Stationary render changed-pixel fraction and camera drift are both zero. |
| R-WORLD-2: visible landscape/imagery | Flight → Taunus ridge flight starts real native flight above the hills. DEM-derived shaded relief covers the bounded region; photographs cover declared smaller areas. Highest airport image provider and actual GPU texture are both 3000×1800. Its effective 0.74–0.76 m pixels are distinguished from 20 cm source imagery. |
| R-WORLD-2: fail closed | Four actual public-terrain browser groups include a corrupt file rejected before Worker startup, a native coverage exit freezing accepted step/digest/original 14 values, and rejected resume/burst. No implicit flat fallback. |
| R-SIM-3/R-SIM-8 affected | Actual public DEM wheel landing produces positive native reactions without false body collision. Native contacts sample per-support slopes. Illustrative body/prop/fin clearance uses the physical local triangle plane with checked ENU/NED/body transforms and grade/heading regressions. |
| R-REVIEW-1/R-VIEW-1 affected | Selected recorded terrain/converted aircraft heights agree with rendering; native shadow receives on the actual height surface. Paused camera/Review inspection preserves native values/digest. Explicit cached real/flat study provider changes are exercised. Mobile 390×568 credit/status clearance passes. |
| R-INPUT-1 affected | Six pure tests and three actual-browser groups. Hold-look release preserves the original yoke anchor; returning to the same pointer location returns actual aileron 0.140625/elevator 0.08. Original center is neutral, outside release/reentry remains authoritative, short click intentionally recenters. |
| R-AUDIO-1/R-ENG-1 affected | Eleven parameter tests and eleven actual-browser audio groups independently pass. Real native starter rises from rest through 40/438/1207 RPM; engine-off coast 1048.650/630.630/349.268/0 RPM yields rotation 209.730/126.126/69.854/0 Hz. Measured PCM follows those frequencies; exhaust stays zero while actual combustion is off, final and paused RMS are zero. |

The reviewer runs 68 focused Node cases with zero skips plus the audio 11-case
renewal. Existing actual collision five-group and shadow three-group regressions
also pass in root integration. The old low-altitude collision fixture now opts
explicitly into its original flat study; new public-terrain tests exercise real
height contacts separately. All test browsers/servers are closed after execution.

Resolved finding: BKG rendered attribution originally omitted linked name/year
and Sources; the fixed compact attribution and exact original notice extraction
were independently rechecked, including the narrow viewport.

## Security, data and fidelity limits

The browser reads only bounded local manifests/binaries/images. Terrain names,
dimensions, numeric values, byte length, SHA-256 and datum are validated before
physics. No new runtime credentials, external service, persistence or telemetry.
GIS authoring dependencies are pinned separately and are not application runtime
dependencies. Source rights and reproduction are recorded in the terrain README,
manifests, THIRD_PARTY_NOTICES and SBOM.

Coverage is 8.45–8.90°E, 49.85–50.35°N (roughly 32×55 km), not the full 100 NM
roadmap. The source is a roughly 32 m overview, resampled to 32–54 m node spacing,
not 1 m terrain. ETRS89/WGS84 epoch differences are not resolved; there is no
surveyed airport, current obstacle or training-credit claim. Coarser visual LOD
can differ more than the finest near-ground budget. Body/prop/fin proxies use a
local plane and discrete fixed steps, not full-mesh continuous collision. Native
gear/structure supports sample actual terrain. Flat presets remain explicit
research fixtures. Higher-resolution regional tiling (2.0.33), procedural land
cover (2.0.36) and buildings/structures (2.0.37) remain later work.

Audio is original uncalibrated synthesis. The 12× rotation harmonic is a timbre
choice, not modeled gearing. Airborne windmilling can retain actual RPM after
ignition off; there is no fabricated ramp or forced physics shutdown. Human
listening acceptance and installed-aircraft acoustics are not evaluated.

Local evidence is retained under output/flight and output/terrain-probe:
terrain-source-packet.txt; public-terrain-browser.*; terrain-renderer-browser.*;
pointer-yoke-browser.*; engine-audio-browser.* and original native WAV previews;
independent-data-validation.json; independent-native-quality.json; and
independent-integration/. Renderer fixtures distinguish camera positioning from
actual native flight; native app fixtures establish the latter separately.

## Integrated gates

`just ci` exits 0: 238 repository-tool tests (one live-provider test skipped),
160 app Node tests plus five Python adapter tests, 84 assurance tests and 11
assessment tests pass. The optional Python JSBSim study runs 14 of 23 cases; nine
are skipped because that Python package is unavailable. These are not physics
acceptance substitutes; actual native/WASM/browser fixtures executed separately.
Tracked-content whitespace passes on all indexed paths. `just check` passes;
`just assure check` reports zero errors with existing advisory warnings. The
assurance diff against the declared base is inspected: new R-WORLD-2/R-WORLD-3,
new stable tasks, source objects and research are present; later tasks stay open
and historical records are preserved. `npm --prefix app run build` passes with
the existing large vendor chunk warning; no device-performance acceptance is
inferred. The existing interactive smoke test also passes all 26 listed checks
on actual Chrome/native dynamics with only local runtime traffic.

[PR #47](https://github.com/gregoryyy/gefly/pull/47) is published from `0577dc4`,
based on PR #46 while that dependency remains open. A fresh target fetch and
local merge-tree check pass; GitHub reports MERGEABLE/CLEAN. Hosted CI is not
triggered for this feature-branch target; the shared CI/build results above are
local, not hosted check results.

The final R-SIM-8/R-VIEW-1 clauses now describe supported terrain and the active
public or explicit flat-study receiver. fov_housekeeping independently renews
these documentation criteria against the unchanged contact/Review/shadow tests.

## Actual external peer attempt

The Codex → Claude route was invoked through `utils/peer_review.py` with existing
CLI 2.1.193 and a fresh tool-disabled project-only packet. Packet SHA-256:
`490501446bdcd2af222e668817da9271c4bfdfa331486dc7bfa1165f824be4b4`;
source revision is the frozen implementation hash above. The process timed out
at 180 seconds (`reviewer_timeout`, exit 2), with no review or verifiable model
identity returned. Quality and specification peer outcomes are **blocked**, not
passes; peer remains pending. No authentication/configuration change or fallback
provider was used. Raw normalized result remains local under
output/peer/2026-11-03-terrain-peer-result.json.

The packet excludes earlier pending PR changes and uses the SPEC snapshot before
the two final receiver-wording clarifications. It cannot establish a completed
batched peer gate or acceptance of a milestone/release. Same-provider independent
quality/validation and executed checks retain their separately declared scope.
