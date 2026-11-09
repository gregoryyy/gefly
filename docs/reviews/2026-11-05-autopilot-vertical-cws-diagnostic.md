# Autopilot vertical-mode and CWS diagnostic

Reviewed 2026-11-05 02:18 Europe/Berlin by independent Codex `validate`.
Scope: the vertical/input portion of TODO 2.0.129, R-AP-1/R-AP-2/R-INPUT-1,
following the [check-before-improving request](../input/2026-11-05-autopilot-behavior-check.md).
Quality owns the separate HDG/NAV trajectory diagnostic. The validator changed
no production code, model, specification or repository test. This report is a
diagnostic, not a new complete KAP or installed-aircraft acceptance.

The reported ALT/selector/ARM distinctions are reproduced and principally match
the source-scoped control logic. Numeric entry does not itself activate ALT;
**A has already selected ALT**, while the AP button engages VS. The reported
**same-pointer mouse-held CWS/touchpad workflow is unusable**: pointer capture
keeps delivering movement to the button instead of the scene yoke. Existing
keyboard-held CWS permits pointer hand-flying, and CWS mode/release logic responds.
No improvement is proposed or implemented by this diagnostic.

## Reference and method

The [independent source reference](../research/2026-11-05-autopilot-behavior-reference.md)
records the verified Honeywell K1 Rev 2 and Cessna C1 supplement pages and their
applicability; it also distinguishes optional generic CWS from an established
172S installation. Relevant K1 pages: 83/86 AP engagement, 84/87 ALT and UP/DN,
84-85/89 selection/ARM/capture; C1 S15-9/13/27-28. D1 9-A13-36 supports generic
optional CWS release/synchronization on a different aircraft. The source agent,
not this validator, performed the renewed manual-page extraction/visual check.
No manual defines browser pointer capture or makes A an original AP shortcut.

Three independent inline `node --input-type=module` browser probes ran from
`app/`, each spawning Vite at 127.0.0.1:5296 and actual headless Chrome
156.0.8078.80. Tool execution sessions 49727, 5785 and 4272 each completed exit 0.
They used the existing scenery-pixel fixture and observed actual module-worker
state/commands; no aircraft/controller telemetry was injected or replaced.
All flight/configuration operations used actual UI controls or trusted browser
keyboard/mouse events. A worker wrapper recorded native state, KAP commands and
pointer event delivery. No new repository test or runtime artifact file was
written; the observed snapshots and reproducible UI sequences are recorded here.

Default research `c172x` aircraft, nominal 90 kt and 1,300 ft MSL launch; initial
AP indicated pressure altitude 1,299.775684 ft, AP BARO 101325 Pa, source-default
loading/mixture and existing study assists. The native step remained 1/120 s;
long cases requested 10× wall pacing, not a larger integration step. Short CWS
cases used 1×. Every flight was stopped through explicit Pause before terrain
contact; all reported collision masks were zero. No new performance pass budget
or aircraft tolerance was invented.

Reported selected/held/indicated values convert their native metre fields using
0.3048 m/ft. Commanded VS converts `kap_vs_target_mps`; actual rate is
`-ground_down_mps * 60 / 0.3048`, the native ground vertical speed, not a claim of
installation-calibrated VSI. Lateral codes 0/1 are ROL/HDG; vertical 0/1 are VS/ALT.
A paused throttle edit is staged: configured native snapshots retain prior power
until Resume; the running rows below report actual applied throttle.

## Mode, entry and ARM observations

These observations were made while paused, with step/time unchanged at 0/0.

| Actual operation | Native result | Visible result / interpretation |
| --- | --- | --- |
| Click AP | engaged 1, ROL/VS, ARM 0; captures current approximately 0 FPM | VS active, `VS 0 FPM`; shared FPM page is read-only |
| Press A in a fresh flight | engaged 1, HDG/ALT; selected and held both 1299.775684 ft | ALT active, selector about 1300 FT, editable; intentional simulator convenience |
| In AP/VS, type 1700 before commit | native selected remains 1399.775684 ft | Text draft alone changes no target |
| Press Enter without blur | selected 1700 ft, ARM 1; remains VS; held still 1299.775684 ft | ALT ARM / ARMED appears; entry commits without requiring blur |
| Blur after that Enter | same selected/mode/ARM | No duplicate toggle or new ALT activation |
| From VS press ALT | ALT, held 1299.775684 ft, ARM 0; selected stays 1700 | Captures current pressure altitude; does not command a flight to 1700 |
| While ALT active, Enter 1800 | remains ALT, ARM 1; selected 1800, held 1299.775684 | ALT ARM can coexist with an unchanged current-altitude hold |
| Separate blur-only entry | selected 1600, ARM 1, ALT/old held reference retained | Clicking the heading field commits a changed altitude without Enter |
| Type 1500 then directly click ARM | selected 1500, ARM 1 | Same blur/ARM click arms once; it does not cancel its own auto-arm |
| Click ARMED again | ARM 0, same selected and held altitude | Explicit second press cancels capture |
| ALT-mode UP tap | held increases 1299.775684 → 1319.775684 ft; selected unchanged | A 20 ft hold-reference nudge, not a selected-target change or VS selection |

The source reference describes these distinct references/modes. Changing a target
while engaged auto-arms capture, so pressing an already ARMED button can explain
an unintended cancellation. ALT must be changed to VS before UP/DN selects a
preselected climb/descent rate. AP versus A starts from different modes, so the
same subsequent ALT press has a different toggle result.

The source also makes the shared VS page expire after three simulation seconds:
its first UP/DN press when hidden reveals the existing rate; later taps adjust
100 FPM. In the measured VS cases, the page was already visible and actual taps
set ±500 FPM. The hidden-page first-tap branch and long ALT-mode UP/DN hold were
inspected, not separately re-exercised here. A paused shared FPM page is read-only;
using an altitude knob switches to the selected-altitude FT page. That simulator
presentation and the undisplayed held-ALT reference can contribute to confusion,
without establishing incorrect underlying mode logic.

## Native vertical trajectories

Each case began from a fresh default native launch. For VS cases the actual UI
sequence was A, enter selected altitude, ALT to VS, UP/DN to ±500 FPM, retain or
explicitly cancel ARM, set power, then Run. The cases distinguish target/capture
logic from the aircraft's achievable response and manual power management.

| Case / native step | Time s | Active / ARM | Selected / held ft | Indicated pressure ft | Actual rate FPM | Applied power / TAS kt |
| --- | ---: | --- | --- | ---: | ---: | --- |
| Selected 1800 but still ALT, step 3658 | 30.483 | ALT / 1 | 1800 / 1299.776 | 1319.536 | +32.58 | 1.00 / 105.00 |
| Armed +500 climb, step 1205 | 10.042 | VS / 1 | 1600 / 1299.776 | 1361.723 | +527.06 | 1.00 / 91.73 |
| Armed +500 climb, step 2401 | 20.008 | VS / 1 | 1600 / 1299.776 | 1451.104 | +538.46 | 1.00 / 91.14 |
| Armed +500 climb, step 3601 | 30.008 | VS / 1 | 1600 / 1299.776 | 1540.522 | +531.95 | 1.00 / 90.69 |
| Armed climb bounded end, step 12063 | 100.525 | ALT / 0 | 1600 / 1600 | 1620.571 | −2.26 | 1.00 / 108.15 |
| Disarmed +500 climb, step 4807 | 40.058 | VS / 0 | 1600 / 1299.776 | 1629.316 | +528.33 | 1.00 / 90.40 |
| Disarmed climb bounded end, step 10901 | 90.842 | VS / 0 | 1600 / 1299.776 | 2064.943 | +504.78 | 1.00 / 90.17 |
| Armed −500 descent, step 3992 | 33.267 | ALT / 0 | 1000 / 1000 | 1023.869 | −554.51 | .45 / 84.54 |
| Same low-power run bounded end, step 12070 | 100.583 | ALT / 0 | 1000 / 1000 | 918.240 | −122.66 | .45 / 47.30 |
| Repeat descent after capture, step 4087 | 34.058 | ALT / 0 | 1000 / 1000 | 1017.033 | −478.49 | .45 / 84.43 |
| Repeat after restoring level power, step 12762 | 106.350 | ALT / 0 | 1000 / 1000 | 1002.542 | −2.00 | .74 / 89.88 |
| Disarmed −500 descent bounded end, step 4949 | 41.242 | VS / 0 | 1100 / 1299.776 | 958.214 | −535.46 | .50 / 86.69 |

The repeated descent was paused at native capture to set manual .74 level power,
then resumed for at least 70 further simulated seconds. It retained the same
native flight rather than rebuilding the aircraft. This isolates power from
capture logic and is a diagnostic procedure, not an operating instruction.
The initial .45-power-through-level-off run is retained as an observed limitation;
it cannot establish an ALT-mode failure after airspeed decays to 47 kt.

Armed VS changed to ALT and adopted the selected held reference in both directions.
The powered climb had a +20.57 ft residual after 100.525 s; the power-restored
descent had +2.54 ft after 106.350 s. These are measured generic-servo residuals,
not newly accepted equipment tolerances. Without ARM, the aircraft remained in
commanded VS and passed the selected altitude in both directions. That is absence
of a selected-altitude capture instruction, rather than evidence of an uncommanded
or unlimited VS command. The AP provides no autothrottle or accepted airspeed
protection. Broader stability/calibration remains unassessed.

## Live CWS and pointer-delivery observations

The corrected CWS run explicitly verified `Flying`, active scene yoke mode and
advancing native steps before each interpretation. This matters: an earlier
setup clicked the central Start overlay while trying to enable the yoke and then
called a start/resume toggle that paused it. That first attempt stayed at step 58
with yoke off and is excluded from live authority conclusions.

| Corrected actual operation | Native/input observation | Interpretation |
| --- | --- | --- |
| Mouse down on CWS, step 84 / .700 s | AP 1, HDG/ALT retained, CWS 1; pointer capture ID 1; yoke mode remains on | Button holds CWS and releases guidance |
| Drag same physical pointer into scene, step 150 / 1.250 s | All trusted pointermoves still target `ap-cws`, including x820/y235 inside scene; elevator 0 and aileron −.109375 remain unchanged | Pointer capture prevents this movement from reaching scene steering; −.109375 is the existing study assist, not the requested yoke motion |
| Mouse-held CWS plus ArrowUp, step 158 / 1.317 s | elevator .35, AP 1, CWS 1 | Keyboard manual input reaches native controls while the same mouse is captured |
| Mouse release, step 180 / 1.500 s | CWS 0, AP/ALT retained; axes neutral; held reference 1298.914951 ft, selector still 1299.773039 | Release reacquires a current-altitude reference without changing selected altitude |
| Focus CWS and hold Space; move pointer in scene, step 196 / 1.633 s | AP 1, CWS 1, yoke on; elevator .085333, aileron .203958, rudder −.313333 | Existing native keyboard-held button path permits actual pointer hand-flying; no new binding was added |
| Release Space, step 220 / 1.833 s | CWS 0, AP/ALT retained; axes all zero; held reference 1297.494490 ft | Neutral release/reacquisition occurs, with original selected altitude retained |
| Ordinary ArrowUp outside CWS, step 226 / 1.883 s | AP becomes 0, modes revert OFF | Existing declared manual-disconnect safety substitution |

A separate live VS case retained AP/VS through keyboard-held CWS and release:
step 80/.667 s command −1.41 FPM; while held, step 190/1.583 s command −254.99 FPM,
actual −269.11 FPM and elevator .35; after release, step 214/1.783 s command
−424.98 FPM, actual −651.75 FPM and elevator 0. The release command adopts a
new current-rate reference, but these 60 Hz samples do not independently locate
the exact sensor instant or establish settled tracking during the short transient.
The source release branch uses current VS in VS and current pressure altitude in
ALT; this report does not invent a synchronization tolerance from later samples.

The source cause for the mouse conflict is `beginGesture` in
[autopilot-panel.ts](../../app/src/autopilot-panel.ts): pointer activation calls
`setPointerCapture`; [pointer-yoke.ts](../../app/src/pointer-yoke.ts) receives scene
pointer events, not events retargeted to the CWS button. Keyboard activation
creates no mouse pointer capture. This is a browser input-ergonomics conflict,
separate from the optional physical CWS behavior in the manuals and the native
servo-release logic. The existing Space route is an observation, not a newly
implemented improvement or a claim that the mouse workflow is satisfactory.

## Diagnostic matrix and disposition

| Question / expected behavior | Observed evidence | Outcome |
| --- | --- | --- |
| AP versus A modes | AP enters ROL/VS; A enters HDG/ALT/current references | pass against current source-scoped contract; they intentionally differ |
| Numeric entry and blur | Enter or blur commits/auto-arms without selecting a different active mode | pass: native selected target/ARM changes; prior VS or ALT persists |
| ARM and current ALT hold | Selection/ARM is a future capture, ALT holds its captured reference | pass: observed separate selected/held references and explicit cancellation |
| Armed VS capture | Both directions adopt selected reference in ALT | pass for discrete mode/target behavior in measured bounded runs; servo residuals reported separately |
| Disarmed VS | Selected altitude alone does not level the aircraft | pass: commanded ±500 FPM persists through target in both directions; not classified as an uncommanded runaway |
| Same-pointer mouse CWS and touchpad steering | User must be able to hold CWS and steer with their chosen input | fail for the reported mouse-held/same-pointer workflow: trusted movement is captured by button, not scene; reproduced with live yoke on |
| Existing keyboard-held CWS / release / manual override | CWS permits manual control, retains AP modes, releases neutral and restores guidance | pass for observed live keyboard/pointer authority and mode transitions; exact fitted-servo synchronization fidelity not evaluated |
| Original equipment calibration/complete aircraft envelope | Requires independent applicable configuration/performance references | not evaluated: generic servo/aircraft response, C172S CWS fit, original clutch dynamics, hardware ergonomics and training credit remain open |

The diagnosis is complete within this vertical/CWS scope. The mouse CWS usability
failure remains unresolved; no fix was authorized in this step. No source-backed
mode distinction is redefined to make the user's workflow appear to pass. The
separate lateral diagnostic and any later improvement decision remain with their
assigned owners. This does not close the broader TODO 2.0.111 usability or 2.0.14
installed-fidelity gates.

## Frozen source and evidence identity

Working-tree base `700dd5386125f9864a391f85b277cb71da55290a`; relevant source hashes
were checked before and after execution and remained unchanged. Native WASM is
the local JSBSim v1.3.3 research build, not accepted aircraft data.

| Input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `docs/input/2026-11-05-autopilot-behavior-check.md` | `5e3fb1b4670da4d5cdb6a4e753b81b2a9a1ad45b4ce3ca3949676a5e5eeda111` |
| `docs/research/2026-11-05-autopilot-behavior-reference.md` | `1237f6a72c07ea9edbaf51125d5ac042c5c0c4219b714d7f0a874c7ac9585b73` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/autopilot-panel.ts` | `0240df5f5aeda003eab92bc0b74aa4c8c42399438cbb72f6683a51a5404300e2` |
| `app/src/pointer-yoke.ts` | `4a740bf71c3ab1e86a3591f7428874e7cbe85fe02c436652262f3f6e51d14b50` |
| `app/src/session.ts` | `c324026c7a7cc5c3dcc52474de47aa69a13bfffba224e3ac6c9d2e9f6c5188d3` |
| `studies/e1-browser/sim/kap140.js` | `c23458e6b0cba257231eda0cbff7798157c7fbc535d68395c2c2985838d3b78a` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `studies/e1-browser/sim/bridge.cpp` | `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a` |
| `studies/e1-browser/sim/prepare-aircraft.py` | `f0b5f809db9a5e14d666ae2b71b6e26c59008d5b28a74c389d0503d798d8d6ff` |
| `studies/e1-browser/sim/dist/jsbsim.wasm` | `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392` |

Tool-command outputs provide the independent runtime observations summarized
above. They are local diagnostics, not hosted CI, publication or a covering
cross-provider peer review. No implementation change or renewed broad simulator
acceptance is implied by completing the investigation.
