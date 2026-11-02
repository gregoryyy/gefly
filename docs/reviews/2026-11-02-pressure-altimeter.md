# Pressure altimeter in the research flight deck

Scope: TODO 2.0.5, partial R-AIR-3/R-REVIEW-1. Ideal ISA instrument practice,
not acceptance of the installed C172S altimeter, EDFE elevation or full v1.1 run
contracts. Model derivation, primary references and limits are in the
[source note](../research/2026-11-02-pressure-altimeter.md).

Authors: Codex orchestrator/integration, altimeter_core/code1 and altimeter_ui/code2
in parallel; altimeter_research maintained sources/application instructions
alongside implementation. Implementation SHA-256: `327d617a8ad5865826538bd92e85d66540ad1fa1710eaf6e62bcc73b20f2adad`.
Sorted paths: app/package.json, app/runtime.ts, app/src/flight-trace.test.ts, app/src/flight-trace.ts, app/src/main.ts, app/src/pressure-altimeter-panel.css, app/src/pressure-altimeter-panel.ts, app/src/session.test.ts, app/src/session.ts, app/src/types.ts, app/tests/smoke.mjs, app/vite.config.ts, studies/e1-browser/sim/altimeter.js, studies/e1-browser/sim/altimeter.test.mjs, studies/e1-browser/sim/bridge.cpp, studies/e1-browser/sim/build.sh, studies/e1-browser/sim/worker.js; each path + NUL + bytes + NUL.
Shared prose is excluded.

## Independent quality

Reviewer: Codex altimeter_research, excluding its own source note and app README.
No blocking findings. Confirmed read-only engine pressure exports and physical
psf-to-Pa conversion, unchanged 14-value dynamics state/digest, coherent NASA
constants and scale-offset model, bounded unavailable behavior, per-step worker
indications and paused setting messages that never run physics. Session validates
and copies a complete optional numeric group; old engine builds can still fly.

Paused trace replacement requires an identical physics/environment frame and
preserves VSI and prior immutable objects. Review renders captured fields and
disables adjustment. Modal hotkeys are guarded; local runtime resources remain
allowlisted. A low finding that every unavailable case suggested only rebuilding
was fixed to mention the supported range too, with affected source review passing.
Vite 8's removed object-form manualChunks setting broke the inherited build;
the replacement follows the [Vite migration guide](https://vite.dev/guide/migration) and uses supported Rolldown codeSplitting and retains a separate
lazy map chunk. Build output was inspected; the large-chunk warning remains.

## Independent validation

Reviewer: Codex altimeter_validate; no implementation authored. Actual headless
Chrome with the rebuilt local engine:

| Behavior | Observed evidence | Outcome |
| --- | --- | --- |
| Engine pressure | 96655.3669 Pa at initial 396.24 m study height; ideal indication 396.1716 m (1299.776 ft) | Pass |
| QNH/STD labels | Engine QNH 101325.5447 Pa and standard 101325 Pa correctly share the near-equality label | Pass |
| Launch QFE | Initial static pressure as setting gives exactly zero; explicitly not airport elevation | Pass |
| Paused adjustments | All physical fields and WASM dynamics digest unchanged at step zero through settings/units | Pass |
| Manual and units | 1000 hPa gives 285.2872 m indicated; invalid bounds rejected; unit changes preserve Pa | Pass |
| Modal behavior | Done/Escape restore scene focus and stay paused; R/V/Space cannot control flight | Pass |
| Recorded review | Home standard 1013.25 hPa, End launch QFE 966.55 hPa; live worker step 142 frozen | Pass |
| Reset | Default standard setting and empty trace restored | Pass |
| 390px viewport | Dialog x=19..371, y=87..757; gauge/opener fit without horizontal overflow; visually inspected | Pass |
| Missing pressure fields | Disabled control, unavailable indication; flight advances to step 34 | Pass |
| Errors/network | No page errors; localhost-only requests | Pass |

The small negative-zero formatting finding was fixed and affected actual-browser
checks passed: −0.0001 m displays 0 ft, while −0.3048 m displays −1 ft.
The affected modal-readout validation also passed: at worker step zero, launch
QFE shows 0 ft indicated and STD shows 1300 ft. At 390×844 the dialog fits at
x=19..371, y=60..784. At 390×568 natural scrolling keeps Done visible and
accessible, with paused scene focus restored after closing.

The orchestrator's final Chrome smoke passed all 26 groups, including prior map,
controls, imagery, review and real missing-engine behavior. Earlier smoke attempts
were not passes: one assumed engine QNH was exactly 101325 Pa; another compared a
paused streamed sample with the worker's final intervening step. Final assertions
use actual QNH and authoritative worker stats/digest instead. Strict TypeScript,
production UI build and 39 native tests passed with zero native skips. The inherited DONE order failure was repaired by sorting complete records without
changing their contents. Rebuildable
raw logs/screenshots are ignored under output/flight/.

## Limits

Launch-point QFE is an airborne practice datum, not an aerodrome/threshold or AGL.
QNH is the fixed engine atmosphere reference, not a weather report. The setting
shortcuts are teaching aids, not mechanical mode switches. The 800–1100 hPa UI
range is an application bound, not an aircraft subscale specification. The ideal
model supports pressure heights from −2000 to 11000 m; installation errors, lag,
failures, real weather, transition procedures and accepted airport data remain
unsupported. Pressure fields extend the local prototype; full v1.1 event/digest
contracts and input-driven replay remain future work. Paused changes replace the
last state sample, without preserving each intermediate knob event. Reset returns
to standard; display-unit preference is session-only. Peer pending under the
batched cadence; no full requirement, milestone or training credit is accepted.
