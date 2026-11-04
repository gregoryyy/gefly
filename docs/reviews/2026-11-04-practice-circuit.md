# Schematic north-circuit cue: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 03:20 Europe/Berlin**.
Scope: TODO 2.1.4, the generated-cue slice of R-AIRPORT-1/R-TRAIN-5 and
map/recording behavior in R-WORLD-6/R-REVIEW-1. Generated EDFE circuit
teaching cue and geometric nearest-segment readout, not a published route,
assessment or completed circuit exercise. Implementation authors are the Codex
orchestrator, `glide_cases` and `glide_model`; this reviewer authored neither
their implementation nor tests.

## Provenance and limits

The existing [exercise draft](../design/EXERCISE-01.md) explicitly distinguishes
generated teaching lines from operator landmarks without coordinates. The
[operator source survey](../research/2026-11-01-edfe-aerodrome-sources.md)
supports the north/right-hand 26 and north/left-hand 08 direction only.
`airport-geometry.ts` supplies the existing approximate operator-derived runway
frame: dated magnetic bearing plus a recorded variation, assumed midpoint,
1400m physical length and a 234m displaced landing threshold on 26.
It is not surveyed threshold geometry or a current navigation database.

The proposed 1852m width, upwind extension and final extension are instructional
choices. They do not come from the operator's published circuit dimensions.
No altitude, speed, obstacle clearance, flown-leg sequence or grading is inferred.
No chart is reproduced or traced; no new source retrieval is required for this
explicitly generated cue.

## Quality

Source review and the independently executed
`node --test app/src/practice-circuit.test.ts` pass all five tests. The local
east/north frame uses metres; map coordinates are longitude/latitude degrees,
while selected aircraft positions enter in radians. Both patterns lie north of
the runway with the appropriate turn direction. Runway 26 starts at its displaced
threshold and extends beyond the physical departure end using 1166m, rather than
incorrectly adding the full 1400m from that threshold. Geometry and coordinates
are frozen independently of native state.

Nearest-leg classification projects onto finite segments, clamps to endpoints,
uses an explicit numerical tie rule, and rejects invalid/degenerate input or
positions more than 5km from the guide. It has no progress state or assessment.
Map integration defaults off, bounds DOM markers to five, copies geometry into
GeoJSON and removes stale cues for invalid positions or unknown Review context.
Known recorded/active context outranks selectors; fit changes only the map camera.
Existing map interaction neutralization is unchanged. The final 48px fit padding
reserves space for label boxes without changing circuit coordinates.

The initial browser observation hook accidentally changed an unbraced early
return; it was repaired to observe the controller assignment without changing
return flow. Cropped captures prompted actual panel scrolling and stronger
checks for every endpoint and label inside the unobstructed viewport. These
repairs have a clean final browser result below. The final wait also requires
matching source data, DOM labels and context readout, avoiding an asynchronous
MapLibre-data observation race after returning to live.

**Quality: pass for this bounded implementation; no outstanding findings.**

## Specification validation

**Validation: pass for the following slices, not full requirement acceptance.**

| Criterion | Observed evidence | Outcome |
| --- | --- | --- |
| Generated five-leg north guide with correct direction and displaced-threshold anchoring | Independent five-test suite, known along-runway coordinates and signed-turn checks | Pass |
| Off-default cue, directional labels, dashed line and whole-guide fit | Actual Chrome browser five-group run; all projected endpoints and label boxes inside the visible viewport; fresh live/Review/mobile screenshots inspected | Pass |
| Selected live/recorded position drives geometric nearest leg, not lesson progress | Real EDFE 26/08 starts, selector-priority checks, explicit synthetic imported positions changing nearest leg/highlight on seek | Pass |
| Unknown Review, non-EDFE selection without active context and invalid positions do not retain stale cues | Actual browser clearing cases; independent invalid/far classifier tests | Pass |
| View actions preserve paused native state and recording context | Actual browser compares native step, digest and final state; existing airport seven-group and flight-map eight-check regressions | Pass |

The reviewer independently executed `node --test app/src/practice-circuit.test.ts`
(5/5 pass), reviewed source and tests, and inspected final screenshots.
Root/implementation-agent browser execution is recorded in
`output/ci/practice-circuit-browser.log` (five groups, Chrome 156.0.8078.80),
`output/ci/practice-circuit-airport-regression.log` (seven groups) and
`output/ci/practice-circuit-map-regression.log` (eight checks). Those browser
commands were not independently rerun by this reviewer. They use deterministic
basemap/scenery pixels and the actual MapLibre renderer and JSBSim worker;
imported nearest-leg observations are explicitly synthetic, not a flown circuit.
Optional public-service imagery capture is not required acceptance evidence.

The cue has no altitude, speed, obstacle, noise-abatement or route-fidelity
acceptance. Label overlap with independent map markers remains possible. This
does not freeze EXERCISE-01, validate a completed circuit or establish training
credit. Cross-provider peer review remains pending.

## Frozen source packet

Base `ce326d6b355768866364b9439a59a67ed3a52672` plus reviewed working-tree
changes. `output/flight/practice-circuit-review-packet.json` lists 13 source,
test, package, specification and existing-source-reference files. SHA-256 of
sorted `path + NUL + file SHA-256 + newline`:
`8d135f9e18bec3cd9fa3903bf992089e13ed435cc12739ca5b11d197d82d3243`.
Shared status/catalog/evidence records, this report and the reviewer's own notes
are excluded from independent acceptance.
