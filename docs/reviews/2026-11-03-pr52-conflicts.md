# PR #52 merge integration: independent quality and validation

Reviewer: Codex subagent `resolve52_quality`, 2026-11-03, Europe/Berlin.
Scope: merge `a655bc9` (current main) into PR #52 head `eb7e5b7`, on
`fix/pr-52-conflicts`. The reviewer did not author the merge resolutions or
implementation. This is a bounded integration review; it does not complete the
batched cross-provider review in TODO 0.19 or accept the findings batch in 0.21.

## Quality

**No blocking merge defects found** in the frozen source, focused units and
actual-browser integration checks below. Scoped validation passes for the
exercised integration behavior; unresolved rights and wider peer/fidelity gates
remain explicit.

Both parents' package test commands survive the union: 42 Node test files, the
shared aircraft-preparation Python tail, 39 browser/native commands and the
separate scenery suite. No dependency or lockfile change was needed. Independent
comparison of DONE sections found every complete entry from both parents,
including unchanged bodies: 93 entries from `eb7e5b7`, 94 from `a655bc9`.

The receiver package identity is still obtained through `loadNavigationPackage`
in both UI and worker; the new map-only southern-Germany inventory does not
attest the radio receiver data. The ready callback carries both navigation
identity and terrain readiness, and degraded EDDF guidance reaches its visible
ready state rather than throwing from the callback. The worker contact helper
uses the streamed atlas gradient. Contact availability, first-contact latching,
NaN property handling and named-contact resolution remain intact alongside
terrain streaming, rather than being replaced with old single-grid behavior.

The imagery helper combines PR #52's whole-pyramid failure notice with main's
live photo/map fallback state. Camera-change queue cancellation and its disposal
remain paired. No additional aircraft coefficients, scenery services, data
permissions or fidelity claims were introduced by these resolutions.

## Independently executed checks

| Command/check | Observed outcome |
| --- | --- |
| Focused app Node tests: session, navigation identity, flight trace, imagery status, source provenance, streamed terrain provider, pointer yoke, control settings, flight-map navigation and airport catalogue | **99 pass**, zero failures/skips |
| `node --test collision.test.mjs kap140.test.mjs navigation.test.mjs terrain-stream.test.mjs simulation-rate.test.mjs` in `studies/e1-browser/sim` | **41 pass**, zero failures/skips |
| Parent-by-parent package script inclusion and complete DONE section/body comparison | **Pass**; no lost commands or historical sections |
| Conflict marker scan and `git diff --check` | **Pass** on the reviewed source/records |
| `node output/flight/pr52-navdata-degraded.mjs` (independent ignored evidence script) | **Two groups pass**: actual native EDDF restarts with forced worker NAV manifest failure and with mismatched ready attestation both reach usable Paused/Start, display the expected source error, and advance actual flight afterward |
| `node app/tests/streamed-region.browser.mjs` | **Four groups pass**: nine initial tiles; Darmstadt/Odenwald/Spessart native/Cesium heights agree within 0.25 m; map/Review leave paused native state unchanged; missing/corrupt initial tiles fail closed |
| `node app/tests/regional-nav-flight.browser.mjs` | **Five groups pass**: verified source/terrain preset, paused receiver state, actual native APR/GS capture, recorded read-only Review and local/no-page-error checks |
| `node app/tests/parking-rudder.browser.mjs` | **Five groups pass**: latch lifecycle/isolation, full native brakes independent of wheel gain, linked-rudder defaults/manual priority, read-only Review/restart and actual nosewheel steering |

The orchestrator separately owns shared CI, typecheck/build and fresh native
build evidence. Their outcomes are not commands independently executed here. The orchestrator
reported shared CI exit 0 (280 app, 84 assurance and 11 assessment cases; study
skips remain explicit), passing typecheck/build and a fresh native build plus
`bridge-native.mjs`. The reviewer independently confirmed the built WASM hash
below before exercising the actual browser runtime.

## Scoped specification validation

| Criterion | Expected and observed evidence | Outcome |
| --- | --- | --- |
| R-BOOT-3 / SDLC integration | Retain both parents' test entry points and complete dated log records; direct inclusion/body comparisons agree | **Pass** |
| R-NAV-4 identity | Receiver UI/worker package identity remains separate from map-only data; matching/missing/malformed/mismatched hashes exercise pure guards | **Pass** for inspected and unit-exercised contract |
| R-NAV-4 EDDF degraded ready | Actual native-worker fault-injection restarts show the expected alert, usable Paused/Start and advancing flight for unavailable/mismatched worker NAV | **Pass** for exercised degraded-ready contract |
| R-SIM-1, R-SIM-5 / R-WORLD-5 | Named contact/unknown telemetry guards coexist with streamed terrain; contact sampling uses atlas gradient; focused source/unit cases pass | **Pass** for source/pure contract and exercised streamed native/browser integration |
| R-INPUT-1 / R-REVIEW-1 | Parking/rudder and centered touchpad coexist with review/NO DATA changes and rate snapshots; focused unit groups pass | **Pass** for source/unit scope and exercised actual parking/rudder integration; centered browser renewal is orchestrator-owned |
| R-WORLD-4 | Whole-pyramid failure and live fallback status coexist; cancellation disposal remains paired | **Pass** for source and pure helper cases |
| R-DATA-1 | Q24 remains unresolved; source objects retain unresolved-rights labels | **Pass** for honest status retention; source-rights clearance **blocked** |
| GAPS Q25 | New record quotes the existing direct user instruction exactly, records today's preservation date and declares original timestamp unknown; historical peer finding retained | **Pass** for record meaning; no new user decision inferred |
| Native absent-property/name-reordering fault injection; real aircraft fidelity, current navdata, live imagery availability, training benefit | Not established by this bounded merge review | **Not evaluated** |

## Runtime evidence and reviewed snapshot

Checks used actual Chrome **156.0.8078.80**, the rebuilt JSBSim WASM and public
DEM packages. Native bytes: **1,755,647**; SHA-256:
`ff073b7fd8ee4966a7fac508cc0cdc86c33ed678c12648495bfab3e741aaa15c`.
The source bridge hash is
`63fa5e00435a273bb3ed50e87351d3ca1a053576e1a1a623af7506aa89b2aabc`.
Map/photo pixels are deterministic local fixtures, not live-source evidence.
The negative NAV cases alter source availability/attestation only; they do not
substitute invented flight dynamics or assert real-world ILS accuracy.

At **2026-11-03 10:18 Europe/Berlin**, independently hashed the following 36
paths as sorted `path + NUL + lowercase SHA-256(file bytes) + newline` records.
Packet SHA-256:
`8ec94a5ee2a0d4b868398c8d9f45de24ddc04a6a1cf51df8065d8acb386e4c0a`.
The ignored inventory is `output/flight/pr52-quality-packet.json`; corresponding
runtime logs/JSON are `output/flight/pr52-*.log` and
`output/flight/pr52-navdata-degraded.json`. Changed covered bytes require affected
review renewal. Review prose, shared status and generated binaries are outside
this source packet; status meaning and native identity are recorded separately.

```text
app/README.md
app/package.json
app/src/aircraft-handbook-data.ts
app/src/c172x-instrument-references.ts
app/src/control-settings.ts
app/src/flight-map-navigation.ts
app/src/flight-trace.ts
app/src/imagery-status.test.ts
app/src/imagery-status.ts
app/src/main.ts
app/src/navdata-identity.test.ts
app/src/navdata-identity.ts
app/src/pointer-yoke.ts
app/src/radio-nav.ts
app/src/scene.ts
app/src/session.test.ts
app/src/session.ts
app/src/spatial-stall.ts
app/src/style.css
app/src/types.ts
app/tests/flight-actions.mjs
app/tests/parking-rudder.browser.mjs
app/tests/regional-nav-flight.browser.mjs
app/tests/smoke.mjs
app/tests/streamed-region.browser.mjs
docs/SBOM.md
docs/input/2026-11-03-demonstrable-increments-record.md
studies/e1-browser/sim/bridge.cpp
studies/e1-browser/sim/build.sh
studies/e1-browser/sim/collision.js
studies/e1-browser/sim/kap140.js
studies/e1-browser/sim/navigation.js
studies/e1-browser/sim/simulation-rate.js
studies/e1-browser/sim/terrain-grid.h
studies/e1-browser/sim/terrain-stream.js
studies/e1-browser/sim/worker.js
```

No cross-provider CLI/identity/packet run was performed by this subagent. This
same-session integration review preserves, rather than closes, the independent
peer cadence and outstanding source-rights decisions.
