# Autopilot behavior: integrated diagnostic

Recorded 2026-11-05 02:29 Europe/Berlin by Codex orchestrator.
Scope: TODO 2.0.129 / R-AP-1, R-AP-2 and R-INPUT-1.
The user asked to check behavior before considering improvements. No production
code, model, specification, dependency or repository acceptance test was changed
for this diagnostic. Previous authorized feature changes remain in the worktree.

Status: **partial diagnostic**. Existing mode behavior and the mouse-CWS
usability failure were measured; the exact later near-north A-to-230-degree UI/flight sequence is
**not evaluated** because the additional protected browser run could not execute.
A separate sandboxed offline engine check below covers controlled near-north
capture without opening a browser.
This is not a fresh autopilot-fidelity acceptance or a claim to have resolved the
user's reported heading excursion.

## Findings

| Topic | Observed behavior | Interpretation and limit |
| --- | --- | --- |
| HDG trajectories | Fourteen actual WASM/KAP cases turned toward the bug by the shortest direction, including cardinal targets and 359/001 crossings. Final 90 s errors in the tracked cases were at most about 0.40 degrees. | Wrong-sign HDG was not reproduced in these calm fixtures. This is an observation, not an installed-aircraft tolerance or proof about every flight state. |
| A versus AP | Actual UI and worker observations show AP enters ROL/current VS, while A captures current heading/altitude in HDG/ALT and overwrites a previously selected heading. | They are different declared commands. A is a simulator convenience, not the original hardware AP button. |
| HDG after A | A, then selecting 180 degrees without another mode press, tracked 180.35 degrees after 90 s. Adding an HDG press changed the mode to ROL and ended near 87.93 degrees. | HDG is a toggle. Pressing it after A disables tracking; the retained bug is then not followed. This sequence can look like an ignored target, but does not establish the cause of the user's exact event. |
| Radio NAV | Matched-DG VOR and LOC worker fixtures armed, captured and reduced CDI error. A mismatched DG/OBS course or ROL without an intercept stayed armed; invalid source fell back to ROL with a NAV alert. | Valid radio NAV worked in the tested fixtures. Its DG course/intercept conditions matter. |
| Map GPS versus NAV | A real map GPS selection drove BRG while NAV1 remained 113.80 MHz with the LAB fixture disabled and NAV invalid. Pressing NAV produced ROL/NAV alert rather than GPS tracking. | The GPS display is not an AP GPS source. Current radio fields remained unchanged in the captured serial UI data. |
| Selected altitude | Enter and blur committed the target and armed capture while AP was engaged, without changing the active vertical mode. | Entry did not itself activate ALT. A had already selected ALT in that workflow. |
| ALT | Captured current pressure altitude independently of the selected number. Editing another target armed capture but retained the existing ALT hold. Pressing ALT again entered VS. | This distinction is supported by the inspected KAP 140 references. Selecting an altitude alone does not initiate a climb. |
| ARM and VS | Armed powered climbs and descents captured the selected altitude and entered ALT. Explicitly disarmed VS continued through the target in both directions. | ARM governs preselect capture. VS still commands a rate when capture is disarmed; this is different from a selected-altitude ceiling/floor. |
| Power and response | In the corrected descent case, restoring level-flight power at capture yielded about 1002.54 ft and -2.00 FPM for a 1000 ft selection. Leaving low descent power caused speed and altitude loss despite ALT mode. | Throttle is manual. Mode correctness does not establish adequate aircraft energy or calibrated servo performance. |
| Mouse-held CWS | Actual captured-pointer movement over the scene still targeted the CWS button; the scene yoke received no steering command. | **Reproduced usability failure** for using one pointer to hold the button and steer. No fix was made. |
| Keyboard-held CWS | With the yoke already enabled, holding Space on the focused CWS button allowed pointer steering; mouse-held CWS also allowed keyboard steering. AP remained engaged and release synchronized the relevant ALT/VS reference. | Existing alternative inputs work. They do not make the mouse-only workflow usable or establish stock C172S CWS installation. |

## Evidence

- [Independent lateral diagnostic](2026-11-05-autopilot-lateral-diagnostic.md):
  14 direct native trajectories, 11 production-worker NAV/authority scenarios,
  three additional mode-sequence trajectories, frozen runtime/source inputs and
  repeated native results.
- [Independent vertical/CWS diagnostic](2026-11-05-autopilot-vertical-cws-diagnostic.md):
  actual browser input, authoritative worker snapshots, powered capture/rate
  observations, and preserved unsuccessful fixture/low-power attempts.
- [Independent manual reference](../research/2026-11-05-autopilot-behavior-reference.md):
  hash-verified manufacturer-authored KAP/Cessna documents, printed-page
  applicability and optional-CWS limits.
- Orchestrator serial browser observations:
  output/flight/autopilot-ui-authority-serial-pass.json, SHA-256
  bf53ff10fc64bcdcaf9d355a3296c1f86d9ee8415e3cc6ad3d0b29f7578cef4f.
  Trusted click/type/Enter actions confirmed A's overwrite and the HDG toggle.
  Passive cursor return after acknowledged engagement retained AP/HDG and
  pilot_override=false. GPS-to-NAV observations are from the same successful
  serial run. The first attempt accidentally hit the Start gate while enabling
  the yoke and is retained separately as a failed fixture.

The serial JSON contains the actual radio fields radio_nav_active_khz,
radio_nav2_active_khz, radio_obs_deg and radio_obs2_deg; post-run comparison
confirms 113800/114000 kHz and 0/0 degrees remained unchanged. The first script's
radio assertion used absent short field aliases, so that assertion alone was
not evidence. The retained full native snapshots support this comparison.

The local UI script was subsequently extended for a bounded pending-AP/cursor
timing probe and corrected radio-field assertions. That extended version was
**not executed**: automatic approval review could not complete because its usage
limit had been reached. Do not associate its current script hash with the older
successful serial run or infer that the new timing cases passed.

## Additional sandboxed near-north engine check

A separate unprivileged Node process imported the already-local JSBSim WASM and
KAP controller. It opened no browser/server, used no elevated access and made no
external request. This is a distinct lower-access physics check, not a retry or
substitute for the blocked browser/UI action.

Command: node output/flight/autopilot-north-offline.mjs; observed exit 0.
Inputs: the same local native engine/controller, fixed 1/120 s, calm flat-ground
fixture, initially trimmed wings-level at 1300 ft MSL and 45 m/s, for 90 simulated
seconds. The A-style sequence captures the current heading/pressure altitude into
HDG/ALT. The script and its own source/runtime freeze, JSON time series and log
are under output/flight/autopilot-north-offline.*; original lateral artifacts
were not overwritten.

| Initial heading | Heading after 90 s | Absolute heading error |
| --- | --- | --- |
| 000.00 degrees | 000.09497 degrees | 0.09497 degrees |
| 000.01 degrees | 000.10497 degrees | 0.09497 degrees |
| 359.99 degrees | 000.08497 degrees | 0.09497 degrees across north |
| 355.00 degrees | 355.09478 degrees | 0.09478 degrees |
| 005.00 degrees | 005.09517 degrees | 0.09517 degrees |

No case approached 230 degrees; sampled bank stayed below about 0.224 degrees.
These are observed controlled-fixture results, not an acceptance tolerance.
They exercise the native engine/controller and idealized capture sequence, not
browser event timing, the complete production-worker capture path, the user's
settings or an already banked/slow/out-of-envelope aircraft.

## Still open

The user's [later recollection](../input/2026-11-05-autopilot-north-followup.md)
was speculative: A near north, followed by an apparent heading around 230 degrees.
The controlled offline cases now include near-north capture, but not that exact
UI engagement, attitude, airspeed, settings and action sequence. A future actual-native/browser
reproduction must record the captured bug, active modes, bank, airspeed, control
inputs and any disconnect; neither normal steady fixtures nor source inspection
can substitute for it.

The additional browser execution was blocked by an approval-review service usage
limit, not by a safety decision about the test. No blocked browser/server action was retried through another route. The
separate offline case stayed within the normal sandbox and does not count as
browser/UI evidence. TODO 2.0.129 remains open for this case. Improvements
to controls, mode semantics, CWS or GPS/AP coupling were not authorized or made
in this diagnostic step.
