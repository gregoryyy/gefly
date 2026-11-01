# Experimental browser flight prototype review

Scope: TODO 2.0, partial implementation toward R-SIM-1/R-SIM-2, R-INPUT-1,
R-VIEW-1, R-UX-1 and R-REUSE-1. These results accept the local experimental slice,
not the complete requirements, first PPL exercise or simulator milestone.

Authors: Codex orchestrator (integration/UI), flight_engine (session), flight_scene
(renderer), flight_housekeeping (application instructions only).
Reviewed implementation fingerprint SHA-256:
`9b4721ec18f53af04133d57f8b896533e596c207c228261cac7c3ca83ee7e6fe`.
Computed over sorted paths, each encoded as path + NUL + bytes + NUL: app/src/*.ts,
app/src/style.css, app/index.html, app/vite.config.ts, app/package.json,
app/package-lock.json, app/tsconfig.json, app/tests/smoke.mjs and
.github/workflows/foundation.yml. Documentation is outside this code fingerprint.

## Independent quality

Reviewer: Codex flight_housekeeping; excluded its own application README from
acceptance. Reviewed code, units/signs, control/focus lifecycle, local file serving,
error handling, dependencies, smoke harness and browser CI changes. Type checking,
build and five session tests passed. Found a P2 scene-load failure that generated
repeated rejected promises and allowed flight without a scene; fixed by resolving
the scene once, disabling resume and requiring reload after a scene failure.
Affected review passed. No remaining blocking findings.

Live server probes returned the intended runtime files while direct repository
filesystem paths were forbidden and bridge.cpp was unavailable. The smoke runner
waits for its own server startup before probing. Browser CI retains pinned actions,
read-only permissions and disabled persisted checkout credentials. Dependency
installation reported zero advisories after the compatible esbuild update.

## Independent validation

Reviewer: Codex flight_validate; authored no implementation in this change.
Executed real Chrome 156.0.8078.79 with the locally built JSBSim v1.3.3 runtime.

| Scoped criterion | Observed result | Outcome |
| --- | --- | --- |
| Real worker produces finite, advancing flight state | 10.0167 s baseline: 1,202 steps and 603 states; TAS 46.3255 m/s, height 395.7794 m | Pass |
| Keyboard commands affect physics | Right input increases right bank; Arrow Up pushes nose down | Pass |
| Pause and loss of focus stop time | Step index unchanged during paused/blur intervals | Pass |
| Reset restores airborne initial state and keyboard control | Approximately 1,300 ft/90 kt; restart/view/touchpad buttons return focus to scene | Pass after focus fix |
| Views preserve simulation state | Cockpit/chase switch while paused preserves exact step/state | Pass |
| Touchpad release and visible assist | Pointer exit clears user axes; selected −0.109375 study roll offset remains; zero setting gives zero aileron | Pass |
| Baseline is usable with declared offset | Maximum absolute bank 4.26° over this ten-second sample | Pass for this sample only |
| Missing runtime is visible | Build instruction and Error; no scripted fallback | Pass |
| Missing WebGL is visible and terminal | No worker/run, including after Restart; no unhandled promises | Pass |

The focus defect initially left flight keys inactive after clicking buttons. The
integrator fixed flight-button focus and preserved range-input keyboard adjustment;
the reviewer repeated the affected checks successfully.

## Reproducible evidence and limits

`npm --prefix app run build`, `npm --prefix app test` (five passed), and
`npm --prefix app run test:browser` (ten actual-browser integration checks) passed.
The smoke runner independently observed only localhost requests and no page errors;
screenshots and raw output are rebuildable ignored files under output/flight/.
`just build-flight-engine` also passed after moving its cache under output/;
WASM SHA-256: `30c6866cd2ee508a35fec28765c6564961bfe0c51abc321e368d994b52196c65`.

The fixed-step worker is reused from E1; this slice does not newly establish full
render-rate replay invariance, long-run stability, model fidelity, performance
budgets, real EDFE geography/elevation, hardware support, pressure instruments or
the circuit exercise. Generic model data remains local and is not redistributed.
The UI-only production build deliberately excludes that runtime and cannot be
published as a working simulator. External peer review remains pending under the
batched cadence; no milestone or release acceptance is claimed.
