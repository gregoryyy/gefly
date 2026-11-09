# Autopilot lateral behavior diagnostic

Investigator: Codex `/root/quality`, independent diagnostic stream. Report finalized 2026-11-05 07:52 Europe/Berlin. Diagnostic-only user instruction: check behavior before considering changes. No production code, specification, aircraft configuration, shared status, dependencies or commits were changed by this investigator. Only new local diagnostic scripts/results and this assigned report were written. Read AGENTS, the quality role, applicable R-AP-1/R-AP-2 and the project KAP 140 research note.

## Result and scope

A reversed HDG controller or a general failure of valid radio NAV **was not reproduced** in the tested actual-native trajectories. Both direct WASM/KAP integration and the unmodified production worker turn toward the commanded true heading by the shortest direction, including 359°↔001°. Matched-DG historical VOR and LOC scenarios arm, capture and reduce CDI error.

Several different mode/source conditions reproduce behavior that can look like ignored or wrong guidance: AP alone engages ROL rather than HDG; A captures the current heading rather than retaining a previously selected bug; HDG pressed after A toggles back to ROL; NAV with a mismatched DG course or no established ROL intercept can stay armed; an unavailable radio source reverts to ROL with a NAV alert. Selecting map GPS drives the read-only bearing dial, not the AP NAV receiver. These are distinctions in the existing declared behavior, not confirmed controller defects or authorization to change it.

The user's exact UI/settings sequence is not yet reproduced by this stream. This result is not blanket acceptance of previous behavior, installed KAP/C172 performance, or operational navigation. Browser/UI observations are owned by the orchestrator; UI-path coverage remains separately identified below.

## Frozen inputs and method

Production/runtime inputs were hashed before initial execution. The final reproducible packet additionally freezes 29 source/runtime/test/diagnostic-script paths before the repeated final execution: `output/flight/autopilot-lateral-final-packet.json`. It includes SPEC/research, UI/session/worker/KAP/navigation/bridge source, prepared aircraft and upstream systems XML, the navigation package, and actual JSBSim module/WASM/build metadata. No dynamic physics or signal mock was substituted.

The existing native artifact identifies JSBSim v1.3.3, commit `66f7fafc07fe13e7ede9db20873030fed2881713`, and WASM SHA-256 `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`. Generic prepared C172x data and reused roll servos are not a calibrated C172S/KAP installation. Tests use calm default conditions, flat/non-streamed terrain, 45 m/s initial TAS and fixed 1/120 s steps. Most start at 1200 m MSL; a separate 1300 ft fixture checks the normal app's nominal launch altitude. ALT holds the initial altitude to isolate lateral behavior; this is not a vertical-system evaluation.

Fourteen direct WASM/KAP trajectories log requested bug, KAP bug, guidance/native target, true heading, signed accumulated turn, bank, AP output, pilot aileron and actuator positions once per simulated second. Eleven production-worker trajectories exercise actual protocol commands, validated historical NAV data and changing native geometry. Three additional worker trajectories isolate AP/A/HDG sequencing. Actual native steps are accelerated in deterministic bursts rather than tied to render frames. The worker's fetch adapter serves unchanged local `/navdata/` bytes through its normal manifest/hash/schema validation; successful ready messages report package hash `67dee54d9fd535b15df83fabff6b548f6171ae0ce0b724c9ab5733bad9c47b67`.

## Heading behavior

Observed direct-native values below are measurements, not sourced hardware tolerances or acceptance budgets.

| Initial → bug, TRUE | Turn after 5 s | Bank after 5 s | Total turn after 90 s | Final heading error |
| --- | ---: | ---: | ---: | ---: |
| 82° → 90° | +4.481° | +3.452° | +8.128° | −0.128° |
| 82° → 000° | −11.956° | −26.496° | −82.059° | +0.059° |
| 82° → 180° | +19.132° | +30.412° | +98.338° | −0.338° |
| 82° → 270° | −11.956° | −26.496° | −171.604° | −0.396° |
| 000° → 90° | +19.113° | +30.418° | +90.310° | −0.310° |
| 90° → 000° | −11.956° | −26.496° | −90.046° | +0.046° |
| 180° → 270° | +19.098° | +30.418° | +90.306° | −0.306° |
| 270° → 180° | −11.956° | −26.513° | −90.044° | +0.044° |
| 359° → 001° | +1.270° | +0.654° | +2.118° | −0.118° |
| 001° → 359° | −1.021° | −1.074° | −1.884° | −0.116° |

Positive signed turn/bank here is right; negative is left. In particular, 82°→270° should turn left about 172°, not right 188°. The 1300 ft run also turns left (−171.816° total, final error −0.184°). Full-worker cases reproduce the signs and wrap directions; its different fixed throttle produces a measured 90 s error +0.607° for 82°→270°. Aileron output may countersteer while settling, so its sign at one instant is not a reliable substitute for measured bank/heading trajectory.

Source path: numeric DG degrees become `heading` radians in `autopilot-panel.ts`; `kap140.js` normalizes the bug; HDG passes that bug into the native heading servo. `bridge.cpp:605` normalizes and configures `guidance/specified-heading-rad` and true actual heading. The pinned GNC angle component computes the included angle, and the generic roll controller drives the aircraft. No degree/radian, true/magnetic or turn-sign reversal was found in that path. KAP `kap_lateral=1` means HDG; native `ap_mode=2` means the heading servo, including when higher-level NAV uses it. These are different enum layers.

## AP versus A versus HDG

| Actual production-worker sequence | Active lateral mode | Native heading after 90 s |
| --- | --- | ---: |
| AP only, preselected 180° bug, initial 82° | ROL; bug retained but not followed | 87.93° |
| A, then set bug 180°, without another HDG press | HDG | 180.35° |
| A, then set bug 180°, then press HDG | ROL; HDG toggled off | 87.93° |

The separate A-after-preselected-180° case captures the actual current 82.000004° bug and holds approximately 82.128° after 45 s. Source `worker.js:335` explicitly disconnects, captures current heading/altitude, engages AP and enters HDG/ALT; the browser's A action is a convenience distinct from the original AP button. The physical-style AP command enters ROL/current VS. ROL keeps wings approximately level; it does not promise a fixed heading. An extra HDG press toggles an already active HDG mode off.

These outcomes agree with the scoped project reference and R-AP-1/R-AP-2. They explain mode-dependent behavior without establishing that the user followed one of these sequences.

## Radio NAV behavior

All runs below use the actual validated historical package, neutral manual input and the production worker/controller. Initial displacement is a declared diagnostic geometry, not a published approach or flight instruction. NAV is used rather than APR to keep glideslope behavior outside this lateral investigation.

| Source/setup | Initial → final CDI at 90 s | Mode outcome |
| --- | --- | --- |
| FFM 114.20 MHz, OBS 000°, DG TRUE 000°, east offset 0.5 NM at about 5 NM | −0.571 → −0.060 | NAV armed from HDG, then captured |
| Same, west offset | +0.571 → +0.060 | NAV armed, then captured |
| Same east offset, DG wrongly set 090° | −0.571 → −1.000 | Stays HDG/NAV ARM; heads about 45°, away from the selected course |
| Same east offset, NAV armed from ROL with a parallel established heading | −0.571 → −1.000 | Remains ROL/NAV ARM; no automatic HDG intercept is supplied |
| IFCW 111.55 MHz, front course/DG TRUE 249.568°, right offset 0.15 NM | −0.687 → +0.0042 | NAV armed, captured and tracked |
| Same, left offset | +0.687 → +0.0056 | NAV armed, captured and tracked |

The matched cases turn in the geometrically correct initial direction. The mismatched/parallel cases do not demonstrate a defective servo: the active guidance target differs because of the DG datum or the arming mode. Source `kap140.js:150` uses DG bug ±45° while armed from HDG; once captured it uses bounded CDI correction around the DG course. NAV from ROL retains the pilot-established intercept until capture. VOR OBS may be station-calibrated magnetic while this simulator DG remains TRUE; the FFM fixture has zero source variation, so this test does not establish other-station conversion usability.

Tuning 110.30 MHz in the diagnostic area yields `nav_valid=0`, reason “No historical signal in modeled range”, NAV alert 2 and reversion to ROL while AP remains engaged. Invalid-source behavior is distinct from failure to track a valid signal. Kind/channel classification alone does not establish a valid source. Station-passage, co-channel ambiguity, corrupt-package behavior and all other stations are not newly runtime-tested here.

Current map GPS selection goes through `PracticeMap.getGpsTarget()` to the bearing-gauge presentation only. It never configures the coupled NAV1 receiver or KAP navigation sensors. GPS BRG/DIST therefore does not imply AP GPS guidance. The worker's radio NAV tests cannot accept an unimplemented GPS/FMS coupling.

## Manual authority and UI limits

A genuine worker input with aileron +0.2 and `pilot_override:true` disconnects AP on the next native step; the observed KAP engagement and native AP mode both become 0. Such a flight can continue turning from its existing bank after AP has disconnected. Mode/authority must be checked alongside heading, rather than interpreting motion alone as AP output.

Source `main.ts:1129` ignores passive touchpad-yoke output while AP is acknowledged engaged or A capture is pending, except held CWS. Thus the broad hypothesis that every normal post-ack cursor return disconnects AP is not supported by current source. The ordinary AP/P command path does not set A's pending flag; whether a very fast pointer return before acknowledgement can cause an input race is an unverified hypothesis, not a finding. The orchestrator owns actual headless UI click/type/cursor-return and GPS-selection/NAV reproduction; those paths are not silently counted as tested by these Node/native diagnostics.

## Reproduction and evidence

From the repository root, with the existing local research engine built:

```sh
node output/flight/autopilot-lateral-diagnostic.mjs
node output/flight/autopilot-lateral-worker-diagnostic.mjs
node output/flight/autopilot-lateral-worker-modes.mjs
```

The scripts are disposable local diagnostics. They do not require npm installation, a browser/server or production edits. Exact initial conditions, commands, native samples and provenance are retained in the corresponding JSON files. All three final diagnostic scripts completed. Repeated native trajectory rows match their first runs exactly in all three result files; all 29 frozen paths remain unchanged. `autopilot-lateral-repeat.json` records those checks. This establishes repeatability of these deterministic local fixtures, not validated aircraft/controller fidelity. No browser/UI result is inferred from it.

## Diagnostic evidence hashes

The packet contains the pre-execution source/runtime/test/script freeze; other rows identify local disposable evidence. They do not approve previous behavior.

| Artifact | SHA-256 |
| --- | --- |
| `output/flight/autopilot-lateral-final-packet.json` | `d92720e4c530905d1d3f6e186f08fd8b6a38674bc6111bc7ee9bb65771355667` |
| `output/flight/autopilot-lateral-freeze.json` | `df017c6b8217b88cb16ce946c79703c6f24802830a3239b5d8251158c69cfccd` |
| `output/flight/autopilot-lateral-diagnostic.mjs` | `cd3f9aa2ad715b1e4e0ef9f6158764f1dfeb2f23806390cc8c37e8ab2ac543b0` |
| `output/flight/autopilot-lateral-worker-diagnostic.mjs` | `bb855690220cf6a34e33d468bd4b4bc789fb931247064495fbc290ffa357f306` |
| `output/flight/autopilot-lateral-worker-modes.mjs` | `5126ca3a248794fb4bff915ccef7ccbf2f33532b64a3bbbacba404d3c82ebe2c` |
| `output/flight/autopilot-lateral-hdg.json` | `db3cb93dc9699003a3ca1f3ff3ed9916d5a364cc8ce777458ec75f0fca88957e` |
| `output/flight/autopilot-lateral-hdg.log` | `86a93eaa10ba9e4c575937a1528655eacf1b6297df8ec5f7b710aa508acb2267` |
| `output/flight/autopilot-lateral-worker.json` | `83542ce2b44963d0a38955edeb9139700b3e88c6c89199d5b83029200f3e6a7d` |
| `output/flight/autopilot-lateral-worker.log` | `3fa6494e83c2016b92bc6f9f4e166d3d8fcf81927ea09d4f53c02e9ef74f85a0` |
| `output/flight/autopilot-lateral-worker-modes.json` | `3b39a769aef5062efef599267673ca129c626d0ad851b12aa19dae879afc5916` |
| `output/flight/autopilot-lateral-worker-modes.log` | `1de61980c7ffc913ed9a31a9824286efb4938b46d564372960fd454d613e66e8` |
| `output/flight/autopilot-lateral-repeat.json` | `122a0055085987f1fe944caa723f53a6bd5a1c580e25963acbc09c54710e3fb8` |

## Limits

The precise user complaint remains NOT REPRODUCED without its initial heading/bug, active and armed modes, command order, radio source/OBS/DG course, manual inputs and trajectory. No production fix is proposed or made on the strength of an unverified hypothesis. This does not accept the full controller envelope, vertical behavior, weather, terrain, all navigation sources, installed-aircraft fidelity, training credit or operational navigation. Primary-source interpretation and any later product improvement remain separate work; cross-provider peer acceptance is not supplied by this same-provider diagnostic.
