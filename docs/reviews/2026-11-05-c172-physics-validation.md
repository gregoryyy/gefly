# C172 physics diagnostic validation

Reviewed 2026-11-05 11:28 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an author of the model, diagnostics or proposed
corrections. TODO 2.0.133; R-SIM-5, R-AIR-1, R-AIR-2 and R-FID-3.
Author/reviewer provider: OpenAI/Codex. Exact CLI/model identity was not
independently exposed; cross-provider peer remains pending.

**Status: complete bounded diagnostic validation. Pass for the delivered audit
and supported observations; aircraft-performance acceptance remains blocked.**
The audit reproduces one actual-app low-speed warning under sustained higher VS
demand and exposes important configuration/control/model concerns. It does not
validate C172P/172S fidelity, justify a coefficient change, establish the user's
exact original sequence or prove user error. Only this new assigned report was
written; no production, model, binary, shared record or other report was changed.

## Frozen inputs and independent method

Read AGENTS and validate/SDLC/STYLE/SEC/TODO/EVAL, the current specification,
both immutable user inputs, the [reference audit](../research/2026-11-05-c172-performance-audit.md)
and final [integrated findings](2026-11-05-c172-physical-model-audit.md).
The follow-up reports a 40–50 kt event band; it does not establish starting speed,
IAS/CAS/TAS reference, altitude, power/flap state or original AP/manual mode.

Reviewed the working-tree snapshot over HEAD
`700dd5386125f9864a391f85b277cb71da55290a`, identified by the
integrated packet (`output/flight/c172-physics-task133-packet.json`, ignored local evidence), SHA-256
`59c8659e534a2b3ce469b7d263587a6780c7810dd30439b6f97e5febaf0ff891`. Independently recomputed **all 43 packet pins** and **all 8 nested
performance-artifact pins**: all matched. Source/controller/units, native arrays,
model/engine tables and relevant runtime summation were inspected. Computed
sample summaries, repeated-result equality, browser metrics and static lift
arithmetic directly from the retained inputs, rather than accepting only author
summaries or successful exits. No independent browser was launched and no native
suite was rerun by this validator.

Used the PDF skill read-only to inspect complete P/S engine, weight and maximum-
climb pages from existing locally rendered, hash-matched manufacturer-authored
PDFs. Their applicable conditions match the reference note. No PDF, page image or
new manual extract was authored or added to the repository. The P reference is
160 BHP/2700 RPM and normal takeoff/landing weight 2400 lb; the separate S is
180 BHP/2700 RPM and 2550 lb. The maximum-climb tables specify flaps up, full
throttle, KIAS, pressure altitude/temperature and a mixture note. These do not
supply a matched CAS/MSL/native-auto-mixture acceptance target for the present
runs. Source revisions and redistribution limits remain explicit in the note.

## Criterion matrix

| Requirement / diagnostic criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| R-AIR-1 / R-FID-3: identify actual configuration | Loaded runtime must be identified separately from the selected future 172S. Native/app build metadata and hashes identify generic 1982 C172P/BETA c172x, eng_io320, adapted fixed-pitch propeller and unchanged WASM. Browser ready metadata matches the native-audit WASM. | pass for diagnostic identification; no 172S acceptance |
| R-SIM-5: freeze baseline and declare conditions | Fixed 1/120 s, loading/CG/fuel, trim, actual engine/propeller/flap state, controls and assists must be explicit. Scripts/records declare native heading/VS servos, PI outer loop, clean initial trim, automatic mixture, initial TAS/CAS handling and actual observation windows. No production/model/coefficient/binary edit is part of this delivery. | pass as diagnostic provenance |
| R-SIM-5: repeatability | Repeated execution must preserve the measured native outcomes without being equated with accuracy. All 43 full result objects independently compare exactly equal across retained runs; the baseline repeats and six low-start cases are explicit. Corrected four propulsion case objects also compare exactly equal to the retained first-final copy. | pass for repeatability only |
| R-SIM-5: valid steady/transient interpretation | Commanded VS and brief altitude gain must not substitute for achieved/stabilized response. Actual down velocity, altitude/time, CAS drift and energy-height change are recorded. Independent clean-window summaries match; changing actual altitude/CG/trim conditions remain visible. Low-speed PI failures and failed 40-CAS trim are excluded from accepted physical conclusions. | pass as diagnostic interpretation |
| R-AIR-2: flap command and native actuator tracing | Degree/30 UI boundary, normalized command, degree feedback/source terms and paused versus stepped motion must be distinct. Two actuator suites match source UP↔10 timing 2 s and adjacent detents 1 s, within one native step; invalid commands preserve command/digest. Fourteen trajectories show combined native response, not isolated lift/drag force measurements. | pass for existing-model wiring/source correspondence |
| R-SIM-5 / R-AIR-2: flap effectiveness at aircraft conditions | Validate actual flap lift/drag/pitch and low-speed behavior against independent applicable references/tolerances. None of the 14 transient trajectories enters 40–50 CAS; separate low-start cases have different servo/initialization conditions. No matched flap-down aircraft force/performance target is supplied. | blocked for aircraft effectiveness acceptance |
| R-SIM-5: actual-app climb reproduction | Operate current UI and distinguish selected/achieved rates, controls and native response. Original four-case script forwards worker responses unchanged and records actual UI settings; scenery pixels alone are fixtures. 400/600 FPM remain above 88.30/80.55 CAS over the bounded runs; 1000 FPM reaches the reported band and a genuine native warning. | pass for bounded reproduction, not every climb or exact user case |
| R-AIR-2: effective manual control observation | Actual elevator movement, rather than only a command, must establish an effective input. The original −0.04 command leaves elevator unchanged. The renewed −0.16 case confirms actual movement and pitch response, then neutral release/history effects; large bank drift prevents steady straight-climb interpretation. | pass for traced response; controlled manual climb not evaluated |
| R-SIM-5: propulsion/export and causal boundaries | Mechanical hp↔W, rad/s↔RPM and climb sign must be traced; source nominal rating must not be confused with measured output. Corrected ground[4] down-velocity sign agrees with altitude/time; sampled throttle/running and mean power/RPM recompute. Native engine property/source arithmetic supports high measured output relative to the nominal point. Sole propeller causality or a power boost is not established. | pass for bounded measurements/source interpretation |
| R-SIM-5: static lift interpretation | Active source contributions may be inspected without calling them total native lift or proving an erroneous duplicate. Both LIFT siblings are summed; independently reconstructed clean/beta-zero alpha0.2 source arithmetic is 1.22+0.8543042=2.0743042 under stated exclusions. No native per-function isolation/counterfactual or aircraft polar is accepted. | pass for static source fact; causal/physical conclusion not evaluated |
| R-SIM-5 / R-AIR-1: aircraft reference-case acceptance | Match variant, mass/CG, pressure altitude, OAT, speed reference, trim/envelope and independent predeclared tolerances. Default P loading is 2480 lb; native fixtures lack matched pressure-altitude/OAT/installation-IAS conditions and aircraft tolerances. The S limit/table cannot validate the P model. | blocked; aircraft fidelity remains unaccepted |
| R-FID-3: claims and limits | Generic/unverified behavior must remain identified and separate from aircraft or training validation. Final findings explicitly retain failed fixtures, unmatched references, model/control concerns and no-retune scope. They do not infer correctness or user error from the moderate-climb successes. | pass for this diagnostic deliverable |
| Broader gates | Exact original user maneuver, full flight envelope, installed controls/172S implementation, training credit, other browser/device targets, publication and covering peer review need separate evidence. | not evaluated; peer pending |

## Independently checked observations and material limits

Native loading is exactly **2480 lb**, including the 80 lb external station.
Removing it produces 2400 lb and changes lateral CG/inertia/trim as well as mass;
the two-occupant case is 2044 lb. These are not otherwise identical chart cases.
For clean roughly-75-CAS observations initialized at 1000 m, independently
recomputed mean climbs are **2.5596 / 2.7662 / 3.5300 m/s**, with CAS changes near
0.02 m/s. Mean actual altitudes are **1456 / 1491 / 1623 m**, so neither identical
final altitude nor POH atmospheric matching is implied.

The six low-start cases distinguish initialization from speed-hold performance:
40 CAS at default loading has trim status −1; its subsequent descent/recovery
cannot establish a valid trimmed point. At 45/50 CAS, successful initial trim
and acceleration under full power/VS0 are observed; speed is not held there.
The separate six 40/45/50-CAS PI-seeking cases fail settling and their recovery
outcomes remain controller limitations. Forced large-pull/extreme-pitch cases
also do not represent normal climb or a manufacturer test condition.

All four corrected propulsion cases have full throttle/running state throughout
the sampled final window. Mean native power independently recomputes to about
**236 hp at 400 m initialization and 219 hp at 1000 m**, with RPM about
**3085/3065**. These are unvalidated operating points above the nominal
160 hp/2700 RPM reference, not proof that the engine is too weak or that a single
propeller adapter causes the complaint. Approximate thrust×TAS/shaft-power ratio
is not an exact local-axis propulsive efficiency or an accepted propeller curve.

The actual app uses native CAS and 10× pacing in the three KAP cases. The first
observed 40–50-CAS state in the 1000-FPM case is **49.93 CAS at 81.48 s**; the first
observed native warning is **41.34 CAS at 166.22 s**, pitch **20.80 degrees**, actual
climb about **604 FPM**, full throttle and flaps up. Maximum bank reaches
**33.72 degrees**. These are recorded publication observations, not exact
critical-AoA/stall-onset or wings-level performance measurements. Source/API
traces distinguish this current-app KAP path from the legacy-servo native matrix.

The ineffective small-pointer case was returned to the integration owner rather
than accepted as manual-pitch evidence. In that trace trim+0.1811904 plus command
−0.04 stays positive, so the **23-degree** positive aerosurface branch changes
the target by only **−0.016054 rad**, within the actuator's history-dependent
0.025-rad half-width. Selecting the 28-degree branch from raw command alone would
be incorrect. The renewed effective case moves actual elevator from
0.07472076 to 0.03550476 rad, releases near 8.04 degrees pitch and settles after
neutral at 0.04972076 rad with unchanged trim. Minimum CAS is 67.98, no native
warning is observed, but bank reaches **68.59 degrees**. This is control/input-
response evidence, not a straight-climb or recovery success.

The earlier propeller diagnostic's wrong ground-velocity slot was corrected and
renewed before freeze; only the down-index-4 result is used here. Other
unsuccessful/nonrepresentative outcomes remain retained instead of being counted
as aircraft passes. No unresolved blocking discrepancy was found in the bounded
diagnostic report. The next fidelity work needs applicable matched reference
conditions and predeclared acceptance criteria; no horsepower increase, flap
multiplier, removed lift term or hysteresis retune is approved by this validation.

## Checks and identities

Author/root runs in the frozen packet record exit 0 for the performance matrices,
14 flap trajectories/two actuator suites, corrected and repeated propulsion,
static source arithmetic, original actual-app run **31614** and renewed effective
manual run **79357**. Validator commands were read-only hash/JSON/XML arithmetic
and source inspection plus existing PDF-page viewing. Neither repeatable native
results nor a completed browser diagnostic supplies an aircraft tolerance.
Root owns final shared status, integration gates and any later model correction.

All 43 integrated inputs and 8 nested performance artifacts are pinned inside
the verified packet. Additional identities below freeze the applicable SPEC,
manual sources independently inspected and retained propulsion repeat reference.
Changed affected inputs require renewed review.

| Path | SHA-256 |
| --- | --- |
| `output/flight/c172-physics-task133-packet.json` | `59c8659e534a2b3ce469b7d263587a6780c7810dd30439b6f97e5febaf0ff891` |
| `docs/SPEC.md` | `e258a22bf998c8ab9e779f4a0f88f59eec04aa09e98eff0096c0d4a1311a121b` |
| `/tmp/gefly-c172-audit/c172p-1982.pdf` | `5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c` |
| `/tmp/gefly-c172-audit/c172s-rev5.pdf` | `420dbdaf5517a7a005cde8938ac359678bcfe52863e8efd4f55fcdbf29ec429f` |
| `output/flight/c172-propeller-task133-first-final.json` | `c3c7c9545f790da99b0c52d6e904db0f576bab6cb29564b6c66c84294cb48275` |
