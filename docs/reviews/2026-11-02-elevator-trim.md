# Classic cockpit and landing-practice checkpoint

Scope: TODO 2.0.10–2.0.13, 2.0.15/2.0.16/2.0.18; partial R-INPUT-1,
R-VIEW-1, R-REVIEW-1, R-SIM-1/R-SIM-5 and R-NAV-1.
User requested this PR before implementing the third bearing display, round
RPM/fuel gauges and additional ALT/NAV/APR/REV guidance modes. Those remain
unchecked in TODO 2.0.14/2.0.17; disabled buttons do not count as completion.

Authors: Codex orchestrator/integration; trim_core/code1 on the study bridge,
worker, NAV gauges and OBS input; fov_input/code2 on trim/radio/AP/engine modules
and browser checks, with fov_housekeeping maintaining documentation in parallel
and later implementing the separate pointer refinements. Neither reviewer accepts
its own implementation.

Implementation SHA-256: `b1e074ce9821ca5aa6cc932e700241539802eb1d51e18eee66c020c9f3ad4281`.
Sorted implementation paths (path + NUL + bytes + NUL; shared prose excluded):

app/package-lock.json, app/package.json, app/src/autopilot-panel.css, app/src/autopilot-panel.ts, app/src/control-settings.test.ts, app/src/control-settings.ts, app/src/engine-panel.css, app/src/engine-panel.ts, app/src/flight-trace.test.ts, app/src/flight-trace.ts, app/src/landing-feedback.ts, app/src/main.ts, app/src/navigation-gauges.css, app/src/navigation-gauges.ts, app/src/pitch-trim.ts, app/src/pointer-yoke.test.ts, app/src/pointer-yoke.ts, app/src/radio-nav-panel.css, app/src/radio-nav-panel.ts, app/src/radio-nav.test.ts, app/src/radio-nav.ts, app/src/scene.ts, app/src/session.test.ts, app/src/session.ts, app/src/style.css, app/src/types.ts, app/tests/avionics-smoke.mjs, app/tests/classic-smoke.mjs, app/tests/engine-smoke.mjs, app/tests/flight-actions.mjs, app/tests/fov-smoke.mjs, app/tests/landing-physics.mjs, app/tests/navigation-input.browser.mjs, app/tests/pitch-trim.browser.mjs, app/tests/smoke.mjs, studies/e1-browser/sim/bridge.cpp, studies/e1-browser/sim/build.sh, studies/e1-browser/sim/cockpit.js, studies/e1-browser/sim/cockpit.test.mjs, studies/e1-browser/sim/worker.js.

## Independent quality

fov_housekeeping reviewed core, root integration, radio/AP/gauges, paused staging,
regression logic and affected CSS, excluding its own pointer code and prose.
trim_core reviewed pointer code/root pointer integration, excluding its own study
and NAV code. Final affected source reviews pass with no remaining blocking
findings. Independent focused checks included 42 core/state/radio tests, six
pointer tests, TypeScript and reproduction of the tracked landing evaluator.

Resolved before publication:

- Options limits retained absolute positioning after being moved into the modal;
  changed to inline scrollable content.
- Paused timeline focus/menu neutralization reset retained Review look; repaired
  while preserving explicit entry/exit/error cancellation.
- Mobile menus covered Pause, and desktop/narrow layouts clipped NAV/radio;
  final explicit 2×4 face grid, compact controls and scoped layout rules fix this.
- Portalized engine/radio content could not be found inside their original hosts
  during a fresh mobile boot; unique document-level queries now work in either
  layout. Fresh 390 px loading and live power controls were independently checked.
- Replacement-worker loading retained stale panels/enabled tuning; reset clears
  and disables them immediately. A deliberately delayed WASM request verifies it.
- OBS drags over one turn lost movement depending on event batching; full integer
  travel plus modulo delta now gives identical one-event and 39-event 390° turns.
- Paused Resume and map overlays competed; the postflight pause overlay is now
  removed, preserving the header Resume action and unobstructed controls. Map z6
  wins component specificity below header z8. Instrument screw overlays ignore pointer events,
  and each mobile face has its own positioned hardware host.

## Independent validation

Reviewer: trim_validate; no implementation authored. Actual Chrome
156.0.8078.79 on Mac, pinned JSBSim v1.3.3 generic c172x. Final engine WASM:
`0a03271cf3af8455ec66d5d94218ccc7f76494fbe6e81c2433fabca29d65b38d`.

| Criterion | Observed result |
| --- | --- |
| Elevator trim | Nonzero startup trim preserved; apostrophe/backslash, vertical slider and Slash startup restore work. Actual elevator changes correctly; upstream actuator hysteresis can absorb tiny commands. |
| Flaps and power | Native four-stop flap lever, bracket keys/keycaps, matching continuous trim rail and compact keycaps work; throttle/mixture are vertical in the engine unit. Actual applied flap command is separately captured. |
| Paused controls | All ready controls remain available. Requested trim/flaps/throttle/mixture persist while full 14-value physics, step and digest remain frozen; Resume sends queued input before advancing. Paused radio/AP metadata edits preserve immutable earlier frames/VSI. |
| Review | Controls remain read-only; recorded lever/NAV/engine/gear values come from captured samples. Live physics stays frozen; exiting preserves pending live settings. |
| Pointer | Leaving neutralizes axes while retaining yoke mode/anchor; reentry restores authoritative input without another click. Review hold-drag retains/accumulates camera angle through release/seeking; Escape centers. Live hold-look remains temporary. |
| Landing | Four explicit CG 3 m/forward 28 m/s fixtures retain initial descent/side/bank differences. Faster descent raises early load, side motion increases tyre slip, and banked right wheel contacts before left. Actual per-wheel compression/load/slip and structure-contact bits are recorded. |
| Navigation | Independent COM1/NAV1 and COM2/NAV2 tuning/swap/OBS, two original round compass cards/CDI/TO-FROM and signal flags work. Fictional LAB is opt-in; unsupported LOC/ILS stays flagged, NAV1 GS remains INOP. Recorded 11-field settings drive Review. |
| OBS interaction | Single click is 1°; holding accelerates; face/knob drag and keyboard 1°/Shift10° wrap correctly without affecting the other receiver or flight axes. Captured 390° drag, split movement and reversal are invariant. Release/focus-out/paused Review/disposal cancel gestures as appropriate. |
| Layout | All eight faces form two rows/four columns, the six-pack has its own rounded frame, AP is above the compact flap/trim pair, columns share bounds, enlarged faces and complete radio/OBS values are readable at 1440×900, 1200×800 and 880×800. Mobile 390×844 uses live/recorded dialogs, including View → NAV instruments. Rails match length, with at most one native border pixel in their tops. |
| Safety of interaction | Fresh mobile boot, held-control outside release, direct modal closing, shortcut isolation, paused map Close and cleared hints after Review all passed. Hardware decoration does not intercept input. |

Native suite: 92 passed, zero skips, plus five Python aircraft-adapter tests.
Tracked landing evaluator covers eight 120/240 Hz cases with exact repeats and
unchanged original 14-value ABI. Observed peak-load differences are at most2.45%,
first contact differs by at most4.17 ms; these are observations, not accepted
C172S tolerances. Independent app samples distinguish baseline/faster early loads
(approximately22.35/30.94 kN), slip and contact sequence.

Run `just build-flight-engine`, then `npm --prefix app test`,
`npm --prefix app run build`, `npm --prefix app run test:landing` and
`npm --prefix app run test:browser`. At unchanged integrated implementation commit 2cc0f96, shared CI passed. Final
foundation/assurance checks and the inspected main diff are recorded in DONE.
Seven final Chrome suites passed 73 groups (split runs after obsolete test
widget selectors were updated). Rebuildable JSON/scripts/screenshots stay ignored in
output/flight: final-controls-independent, fresh-mobile-independent,
obs-longdrag-independent, controls-review-independent, landing-radio-independent,
final-cosmetics-independent, final-pause-map-independent, landing-fixtures, navigation-input-browser and
avionics screenshots. Historical failed reports remain as resolved evidence.

## Applicability and remaining work

See [sources/frames](../research/2026-11-02-landing-and-radio.md) and
[application instructions](../../app/README.md). No poster bitmap was copied;
vector faces and CSS hardware are original. Generic c172x is not the selected
C172S. Fixed-wheel visuals remain illustrative; no suspension/damage limits,
surveyed EDFE ground, real station service, 8.33 kHz communication or ILS receiver
is accepted. The roll/heading AP remains the supported controller in this PR;
ALT/NAV/APR/REV, ADF/auxiliary round gauges and the later fullscreen overlay are
subsequent tasks. Physical finger/controller/OS-focus behavior and training
benefit remain unvalidated. Headless window blur/hidden lifecycle for OBS was
source-reviewed but could not be physically automated. Peer pending under the
batched cross-provider cadence.
