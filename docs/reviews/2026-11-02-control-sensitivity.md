# Session control sensitivity review

Scope: TODO 2.0.2, partial R-INPUT-1. Input preferences only: no aircraft-model,
hardware-calibration, replay, persistent storage or training-fidelity acceptance.

Authors: Codex orchestrator/integration, control_settings_core/code1 and
control_settings_ui/code2, with flight_housekeeping on application instructions.
Implementation fingerprint: `a33573cd68f62fc0e8da09718e2458c933bcfd8a1ffd5db41a261fdb07fb3657` (SHA-256).
Sorted paths: app/src/control-settings.ts, its .test.ts, control-settings-panel.ts,
control-settings-panel.css, main.ts, style.css, app/package.json and
app/tests/smoke.mjs; each path + NUL + bytes + NUL. Shared prose is excluded.

## Independent quality

Reviewer: Codex flight_housekeeping; excluded its own app README.
No blocking findings. Confirmed finite 25–150% gains, post-gain roll offset,
final axis bounds, unchanged throttle and frozen presets/detached settings.
Modal opening neutralizes/pauses before showModal; flight shortcuts are guarded
while open. Done/Escape restore focus without starting the engine. Flight reset
preserves gains. No storage, network or FDM changes. Type checking and eleven
native tests passed. Scope excludes the older renderer and broader aircraft fidelity.

## Independent validation

Reviewer: Codex flight_validate; authored no implementation in this change.
Actual Chrome with the existing JSBSim worker:

| Behavior | Observed result | Outcome |
| --- | --- | --- |
| Settings pause held input and engine | Step 52 remained 52 | Pass |
| Initial/default settings | 100/100/100 | Pass |
| Gentle preset | 50/50/70; actual commands elevator −0.175, aileron 0.115625, rudder 0.245 | Pass |
| Custom gains | 150/25/125; commands −0.525, 0.003125, 0.4375 | Pass |
| Offset/throttle | Roll offset remains −0.109375; throttle unchanged | Pass |
| Done/Escape | Focus returns to scene; engine remains paused | Pass |
| Flight reset and preference reset | Restart preserves gains; Default/reload restore 100s | Pass |
| Compact viewport | 390×844, dialog/buttons fit without horizontal overflow | Pass |

No page errors. The orchestrator's seventeen-check browser smoke also passed,
including preset/default/custom gains, keyboard slider adjustment and reset
preservation. The test waits for the asynchronous native dialog close event.
Strict TypeScript/build and eleven native session/gain tests passed. Rebuildable
screenshots/raw results are ignored under output/flight/.

These checks accept this bounded input increment. Full R-INPUT-1 and simulator
milestone acceptance remain open; external peer review remains pending under the
batched cadence. No aircraft response calibration or training credit is claimed.
