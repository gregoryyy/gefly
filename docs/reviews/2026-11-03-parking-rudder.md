# Parking brake and linked rudder: independent review

Reviewer: Codex subagent `ground_controls_quality`, 2026-11-03,
Europe/Berlin. Base: `c28d85631cd57db725d9d6567f569250924d80cd`;
reviewing the integrated `feat/parking-rudder-controls` working tree.
The reviewer did not author the implementation, maintained tests or shared
requirements. Cross-provider peer remains **pending** under the existing cadence.

## Quality

Quality: **no blocking findings after the label repair**. Specification
validation: **pass for this exercised R-INPUT-1/TODO 2.0.49 increment**, with
the limits below.

**Resolved, low: compact labels overflowed.** At 1440×900 the wheel-brake
button was 89 px wide (87 px client) but its content needed 113 px, allowing the
B keycap to spill into the adjacent parking button. The orchestrator shortened
visible labels to WHEEL/PARK while preserving full accessible names. Independent
renewal confirms ON/OFF/Review contents fit at 1440 and 1024 px, both buttons
share a 22 px unscaled row, and no button extends beyond the tested viewport.
The initial harness stopped at the genuine overflow assertion; later assertions
are claimed only from the successful renewed run. Evidence:
`output/flight/parking-rudder-layout-quality.png` (before repair) and
`output/flight/parking-rudder-quality.json` (renewed measurements).

The parking latch is separate page-memory input state. N and the adjacent
button toggle a full normalized native brake command, independent of the
momentary wheel-brake gain. The existing native dynamics still determine motion,
contact and collision; no aircraft freeze or new pressure/force coefficient was
introduced. Restart clears the latch; pause, focus loss and held-input clearing
do not. Review disables mutation and explicitly marks the unrecorded latch
unknown rather than deriving it from captured applied braking.

The guarded shortcut excludes repeats, modifiers, editable fields, menus,
dialogs, map focus and unavailable/Review/collision states. Session-state changes
also refresh the button's disabled state before a subsequent worker frame.
Button state has an accessible pressed indication and a non-color ON label.

The optional link defaults off and stays in page memory. It uses deliberate
pilot roll after sensitivity and before the experimental offset, with the pinned
model's opposite rudder sign. Explicit nonzero manual rudder takes priority.
Autopilot servo output and the study roll correction never enter the mix.
The checkbox and existing sensitivity presets preserve the selected preference.
Both boolean additions reject invalid values; the final axes/brake remain bounded.
No new dependency, source asset, persistence, network or device-permission flow
is introduced.

Inspected the existing `bridge.cpp` mapping
`fcs/steer-cmd-norm = -rudder` and the local prepared generic c172x model:
the nose bogey has 10° maximum steering, the main bogeys have 0°. These are
existing study-model values, not validated C172S hardware geometry. Ground-turn
regressions can establish the current reused direction, not installed-aircraft
steering calibration or taxi radius.

## Evidence

| Independently executed check | Result |
| --- | --- |
| `node --test app/src/control-settings.test.ts app/src/session.test.ts` | **41 pass**, zero failures/skips. Covers signed/offset-free mixing, manual priority, bounds/invalid flags, full parking command independent of wheel gain, paused command staging and existing session safeguards. |
| `node app/tests/parking-rudder.browser.mjs` | **Five groups pass** on independent rerun, Chrome 156.0.8078.80 and actual JSBSim: guarded latch/paused invariance; native full parking vs 25% held braking; linked input/manual override/presets/offset exclusion; Review/reset; signed native ground steering. Scenery pixels alone are fixtures. |
| `node /tmp/gefly-ground-quality.mjs` | **Five additional groups pass after label repair**: paused Enter/Space toggles without native step/digest/final-state change; compact row/label measurements; held B → N on/off yields both native brakes .25 → 1 → .25, then B release → 0; paused Options/preset invariance; 1024 px scaled bounds. Additional assertions verify ON/OFF/Review text fits at desktop/narrow widths and Review leaves physics frozen. Zero page errors. |
| `node app/tests/ground-braking.browser.mjs` | **Eight groups pass** on independent post-repair rerun: flat/public ground native braking, explicit full-command/intentional contact collision, actual B/button release, Options/presets/restart/paused-state behavior, read-only Review and older-runtime missing-value compatibility. |

Shared CI, build and publication are orchestrator-owned evidence, not commands
claimed as independently executed by this reviewer. Browser scenery fixtures
cannot establish real geography, visual currency or aircraft fidelity.

## Specification validation

This matrix concerns only the new R-INPUT-1/TODO 2.0.49 increment and affected
read-only Review behavior; it does not accept the broader input/hardware roadmap.

| Criterion | Expected evidence | Outcome |
| --- | --- | --- |
| N and adjacent button toggle once, accessible state, compact shared row | Independent maintained browser + Enter/Space/ON/OFF/Review/1440/1024 measurements | **Pass after repair** |
| Parking command full and independent of held B/gain | Pure mapping, actual native brake outputs and held B/N independence | **Pass** |
| Pause/focus/neutralization retain latch, restart clears it | Maintained actual browser lifecycle and native step/digest/final-state invariance | **Pass** |
| Shortcut guards and read-only Review with unknown latch | Actual repeat/modifier/menu/editing/Review checks plus inspected map/loading/failure/collision guards | **Pass for inspected/exercised cases**; latter failure states not separately fault-injected |
| Off-default session-only rudder link, presets retain it, paused changes freeze physics | Actual Options/preset and native frozen-state checks, no persistence path | **Pass** |
| Correct linked direction/manual override, no offset/AP mixing | Pure tests, actual worker command signs/manual Q override, and inspected pilot-only call graph | **Pass** |
| Reused rudder/nosewheel coupling turns correctly on ground | Existing bridge/model and independently rerun signed actual-native ground-turn regression | **Pass for this generic model** |
| C172S calibration, actual parking hardware, optional controllers and training approval | Outside this scoped increment | **Not evaluated** |

## Reviewed snapshot

Independently re-hashed every entry in the final eight-path
`path + NUL + SHA-256 + newline` packet. SHA-256:
`39076da0e3c9df6c9322d43e4f7e56f0774e4f9166b5720e6a9ff2bfa9bdc67b`.
The packet covers main/CSS, settings/panel/unit tests, package test script, new
parking browser suite and the legacy braking browser test. The latter changed
only its unavailable visible-label expectation from WHEEL BRAKES — to WHEEL —;
its accessible-name and missing-value checks remain intact. The label repair
changed presentation only, and affected keyboard/layout/held-brake checks were
renewed after it. Shared prose/this report are outside the runtime packet.

The independent native fixture observed two-second heading changes of
−0.01273 rad with neutral rudder, −0.08607 rad with Q/+0.35 and +0.06037 rad
with W/−0.35, while the nose wheel remained in contact for all 240 samples.
This confirms the reused signed response in the pinned generic model, not
C172S hardware behavior, operational parking effectiveness or a landing/taxi
training assessment.
