# Autopilot reload validation

Reviewed 2026-11-05 14:53 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.143;
R-AP-3. **Pass for bounded local AP-configuration reload acceptance.** Native
build provenance remains unverified; cross-provider peer pending.

Read the [request](../input/2026-11-05-autopilot-reload.md), final R-AP-3,
ARCH/SEC and applicable role/project rules. Inspected helper/storage/session/
worker/main routing, existing KAP restore/source-loss behavior, tests and actual
JSON. Independently compared saved selections with first/settled native frames.
No reviewer browser/runtime suite was launched; only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| Strict, bounded, legacy-compatible data | Canonical version1 requires exactly25 KAP and5 NAV fields with existing numeric/enum ranges. Position records retain their six-field legacy form with optional AP; inherited pose bounds remain. Store/helper units cover unknown/missing/nonfinite fields, detached copies, legacy records, corrupt AP with valid-pose salvage and4096 UTF-8-byte rejection. Oversized/invalid-base records fail softly rather than bypassing the limit. | pass by source/unit evidence |
| Atomic acknowledged live/paused saves | One acknowledged frame supplies pose and AP/NAV in one JSON record. Latest same-step paused changes replace pending data under the existing two-second write throttle; pagehide flushes it. OFF selections are retained; missing/faulted AP is omitted without reusing old settings. Units exercise atomicity, copying, storage denial and pending-state behavior; real reloads exercise final flush. | pass |
| Restore before first state; avoid recapture/UI overwrite | Worker validates before terrain/NAV I/O, installs NAV before sensors/KAP construction, restores existing controller state and applies guidance before Ready/first state. Main mirrors restored NAV before initial input and suppresses the study offset while awaiting the first engaged AP frame. No A capture is used. Browser first and400ms-settled frames retain all20 selected KAP fields and5 NAV fields exactly. | pass |
| HDG/ALT, VS/ARM, OFF/BARO/NAV | Actual UI reloads retain137° heading, distinct selected/held altitude,300 FPM VS/ARM, then OFF with205° bug,100200 Pa BARO/units and both active NAV channels/OBS. The first native state and settled UI agree with acknowledged selections; actual controls display them. | pass in six-group browser run |
| Direct reload while flying AP-engaged | A real HDG/ALT flight advances38 fixed steps/0.316667s with AP engaged, then reloads directly. Fresh first/settled frames preserve engagement/modes/targets, start at step/time zero and issue no Run. Stable selections are compared while moving; an exact pre-navigation moving pose is not asserted. | pass for configuration reload; maneuver continuity not evaluated |
| Fresh sensors, CWS and controller reconstruction | Native probes release saved CWS, restore parked settings and exercise real historical IFCW APR/GS. Valid-source first flags are1/1; the same configuration at New York reports0/0. Source order and a one-step probe establish ordinary source-loss fallback to ROL/VS with lateral/vertical alerts3/2 on resumed stepping. Derived sensor flags/elevator output are deliberately excluded from saved-selection equality. | pass for tested reconstruction behavior |
| Paused startup, Review and reset isolation | All browser reloads are Paused, step/time zero, with no Run; native probes preserve paused pose/digest. Fresh airborne TAS is46.3m/s (90kt), not saved speed/attitude. Actual Review of the earlier205° target cannot overwrite the live250° profile; Restart omits the old AP envelope. Units also cover clear/collision and continuation isolation. | pass |
| Fidelity/provenance boundaries | Configuration persistence does not restore native integrators, attitude, airspeed, controls or exact transient timing. Current WASM `11a92abd…` still differs from retained build record `4fe24bfc…`; successful execution cannot establish build or installed-aircraft fidelity. | blocked for native provenance; aircraft/training fidelity not evaluated |

The integrated packet (`output/flight/autopilot-reload-task143-integrated-packet.json`, ignored local evidence)
SHA256 is `1bd750157bf061e713aaa5fdda4a4cbed90871c4c34ad94f5ad0c978e823bb16`,
over base `700dd5386125f9864a391f85b277cb71da55290a`; all **43** current pins
independently match. Core child packet SHA256
`5bd9775065f576f6670a9367de34acb1ccde81a9b5001aff84cac370f3b5f87e`
has12 matching source/artifact pins. Final browser/store freeze SHA256
`2f863eb6d157285262f034764931e8e2cfd3e5017b12a835962bc51349063bdc`
has12 matching source/evidence/core pins.

Final browser run **79178 exits0**, six groups, Chrome156.0.8078.80,
errors=[]; JSON SHA256 is
`316e447705cbf7a5245df572d79f55e3732f50ab1505f1dedbc032b2f20eae4b`.
Seven production Node Worker/native cases and ten pre-terrain/NAV-I/O rejections
pass. Full units record **535 Node +22 Python**, zero failures/skips; final
production type/build passes. No aircraft/native/model tuning was introduced.

The original five-group pass and two subsequent fixture failures remain history;
final acceptance uses the renewed six-group run. One failure sampled10400ft
before the fifth click acknowledgement, while pagehide correctly saved10500ft;
the renewed fixture waits for the final acknowledged target. No production
repair was inferred from that sampling race. The BARO visibility fixture history
is likewise not a product pass/failure claim.

Scenery uses transport pixels; AP/native dynamics and local reloads are real.
Other hardware/browser matrices, long-term servo stability, complete transient
continuity and operational NAV/GS accuracy remain not evaluated. No unresolved
blocking implementation finding remains; shared status and final publication
gates belong to the orchestrator.
