# C172 physical-model diagnostic quality review

Reviewed 2026-11-05 11:27 Europe/Berlin. TODO 2.0.133; R-SIM-5 and the affected R-AP-1/input/source boundaries. Independent OpenAI/Codex quality reviewer, not an author of the production model or the author diagnostics. The reviewer did execute the separately identified eight-case native initialization cross-check below; it is independent corroboration, not independent acceptance of its own aircraft calibration. Cross-provider peer remains pending; exact runtime CLI/model metadata was not independently exposed.

## Current outcome

**Complete bounded diagnostic review: no unresolved blocking defect in the final diagnostic packet or its qualified conclusions. Aircraft/model-fidelity acceptance remains NOT EVALUATED; no production repair is approved.** The available measurements support material configuration/propulsion/lift/control concerns and reproduce one actual-app excessive-VS low-speed case. They do not support a blanket conclusion that every climb stalls, that the engine is simply underpowered, that flap actuation is broken, or that the additional lift term is an unintended duplicate.

Only this assigned report is written in the repository. Source/model coefficients, runtime/WASM, shared status and previous reviews are untouched by the reviewer. The base is HEAD `700dd5386125f9864a391f85b277cb71da55290a`. Applicable raw inputs are [the model-audit request](../input/2026-11-05-c172-physical-model.md) and [the 40–50kt follow-up](../input/2026-11-05-c172-low-speed-followup.md). The [reference audit](../research/2026-11-05-c172-performance-audit.md) supplies separately scoped P/S manual conditions.

## Diagnostic findings

### Medium, repaired diagnostic error: propeller audit used a horizontal component as climb

Location: studies/e1-browser/sim/c172-propeller-audit.mjs sample. The reviewer found climb_mps assigned -ground[3]. Native gf_ground_state uses index3 for heading-frame right/cross-track ground velocity and index4 for down velocity. The expected climb boundary is -ground[4], corroborated independently by altitude change/time. Root corrected only the diagnostic. Final four-case execution60444 and exact repeated execution21666 completed exit0 with byte-identical logs; the frozen JSON samples actual throttle1/running1, records actual mean altitude and identifies its source hash. Recomputed height change/time agrees with the corrected small vertical rates; no old horizontal-as-climb claim is accepted. This was a mislabeled measurement, not an engine or aircraft-model fix. The reviewer's first message called index3 unrotated east velocity; source readback corrected that wording before this report.

### Material open applicability/configuration concern: current model is a generic P, with 2480lb default loading

The executing bundle is the pinned generic c172x, describing a 1982 C172P/BETA with eng_io320 and a generic 75-inch fixed-pitch windmilling adapter. It is not the selected future 172S/180hp configuration. The engine filename does not prove injection; its header says the generated engine input is not injected.

Native loading is 2480lb initially, including an 80lb external pointmass at structural y=144in. Removing just that pointmass yields 2400lb and changes lateral CG from approximately +0.107376m to −0.010964m, along with inertia/trim demands. The P manual's normal takeoff/landing limit is 2400lb; the S's 2550lb limit does not validate an overweight P as an S. The lighter two-occupant comparator is 2044lb, not an otherwise identical P-chart case. Differences among these cases cannot be assigned to mass alone because CG/inertia/trim change too.

The eight independent native checks corroborate both actual mass values and substantial unassisted lateral drift at the original loading. Whether this source loading should become a different supported default is a product/model decision; no removal or retune is authorized here. Existing generic/research provenance limits remain relevant.

### Material open propulsion concern: nominal160hp is not the measured operating output

The native bridge reads propulsion/engine[0]/power-hp and converts mechanical hp to watts using 550ft·lbf/s. Pinned FGPiston binds this property to HP, calculated from fuel flow/ISFC, mixture efficiency, friction/pumping terms and boost loss. Supplied XML bsfc0.32 sets ISFC. MaxHP160 is a reference/normalization value and participates in automatic calibration when ISFC is absent; it is not a hard runtime power clamp. A stronger-than160hp readout is therefore not a simple hp↔W conversion error or proof that the export means percent power.

The full-power diagnostic observes approximately200–236 native hp and about2980–3086RPM in representative climb/level windows, above the nominal160hp/2700RPM source point. Actual throttle, mixture and running state must be checked rather than inferred from a requested lever. The generic propeller adapter replaces CP/CT tables and its source/runtime equilibrium merits a separate matched audit. This is evidence of an unvalidated operating point, not evidence the current engine produces too little power, and not a demonstrated single-cause attribution to the propeller adapter. Boosting power or editing coefficients is not justified by this audit.

### Material open lift concern: two active alpha-dependent lift contributions add

The reviewer independently inspected pinned upstream and prepared XML. CLwbh and CLalpha are direct active siblings under the LIFT axis, not a function definition replacing another. FGAerodynamics::Load places each function in the axis array; Run sums each cached GetValue. FGTable clamps at table boundaries. At body alpha0.2rad, beta0, flap0, hysteresis0 and ground-effect factor1, CLwbh contributes1.22; CLalpha's alpha-degree lookup is beyond its10-degree upper row and gives slope4.271521, multiplied by alpha to add0.8543042. Their static sum is2.0743042 before elevator/rate/other terms.

This additive source behavior is established. Whether it is an accidental double count, intended experimental data or a valid combined polar is not established by names or descriptions. No native per-function force export/isolation or matched counterfactual has been accepted. Static XML component arithmetic is not measured total native CL/lift, and omits dynamics, flap/side-slip/ground-effect/hysteresis assumptions outside its declared sample. It is a serious candidate for further model review, not permission to delete a term.

### Invalid low-speed-controller inference is excluded

The43-case diagnostic's declared PI CAS seeker uses a generic VS servo as its inner loop. It converges near65/75/85CAS in the recorded windows but does not maintain40/45/50CAS; those requested low-speed cases oscillate and can exchange large kinetic/potential energy. Their means and failed recovery cannot establish sustained low-speed aircraft performance. The archive retains those failures rather than silently relabeling them as a successful controller.

The separate six low-start cases are initialization/recovery observations. At original2480lb,40CAS fails longitudinal trim and starts nearzero AoA/pitch with an initial descent; this cannot be called a trimmed low-speed model point. Successful45/50CAS initializations subsequently accelerate under full power/VS0 and do not hold their requested starting speed. No fixed-airspeed or calibrated pilot claim is justified.

### Ineffective small manual input is excluded as a pitch-response test

Independent validation found the original15px pointer case publishes about−0.04 normalized elevator command while actual elevator remains constant across its flight samples. XML adds manual input to trim/AP before the piecewise aerosurface scale. In this actual trace, trim+0.1811904 plus manual−0.04 remains positive, so the23degree×0.01745 positive branch applies: the scaled target change is−0.016054rad. It is incorrect to select the28degree negative branch from the manual command alone. Elevator hysteresis_width is0.05rad; FGActuator implements a history-dependent half-width0.025rad around previous output before bias. This small actual target change can stay inside that range. Hysteresis is not a0.05 normalized input deadband, and no universal manual-input threshold follows without trim/history.

Thus that case tests input delivery, not an effective manual pull or gentle-climb aircraft response. The source actuator is not thereby calibrated for a C172, and changing its values is not authorized. The separately executed effective-deflection case preserves the old original-four-case artifact and confirms actual elevator movement. With a60px/−0.16 input, surface position moves from0.0747207614rad to0.0355047614rad; the pitch-sum still stays on the positive branch. After manual command returns0, actual elevator settles at0.0497207614rad, exactly0.025rad below its pre-pull position with unchanged trim. This retained difference matches hysteresis history and contradicts any assumption that neutral command restores the original surface position. That is a measured control-response limitation, not an aircraft-specific calibration or permission to remove the actuator model.

## Flap and actual-app observations

The native flap diagnostic separates command from actual actuator: paused degree/30 commands do not step physics or instantly move the surface; actual detents traverse0→10 in2s,10→20 in1s,20→30 in1s, with matching reverse segments in the unchanged source, at both2480/2400lb. Invalid commands do not change the command or digest. Source CLDf/CDDf/CmDf terms and nonzero native trajectories show that flap input is not absent. These are source/motion observations, not accepted aircraft flap effectiveness or a calibrated drag polar.

The30s retained-clean-trim transients start at40m/s TAS (about77.8kt TAS), **not40kt**. Flap extension changes pitch, speed and climb together. A brief greater height gain with10degrees while speed falls cannot establish improved sustained climb. The source manufacturer max-rate chart is flaps up; it supplies no flap-down performance tolerance. Generic VS1m/s command is not a measured1m/s climb.

The first actual-app browser set uses real UI/worker responses, original loading/terrain and full throttle/flaps up. At10× pacing,400fpm demand remains above88.30CAS and ends around401fpm;600fpm remains above80.55CAS and ends around559fpm over the bounded180simseconds. The1000fpm demand passes49.93CAS near81.48simseconds and reaches a native warning near41.34CAS at166.22s, pitch about20.8degrees and actual climb about604fpm. Maximum bank reaches33.72degrees, so this is not a wings-level steady climb test. It reproduces the40–50kt band and warning during the higher VS demand without changing the model. Commanded climb is not achieved climb. It does not establish that every climb stalls or diagnose the user's exact AP/manual/rate/power sequence. The ineffective15px manual case must not be used as counterevidence to a manual-control complaint. The effective60px/release-at8degree case reaches actual pitch8.04degrees before release, has minimum67.98CAS and no native warning over60simseconds, but reaches68.59degrees bank and ends in a descent/acceleration (about125CAS). It demonstrates real command/surface response and retained hysteresis, not a stable manual climb or a successful bank-controlled stall test.

## Reference conditions and numerical interpretation

The reviewer used the PDF skill and independently inspected the complete P/S maximum-climb pages and the P stall-speed page from the existing hash-matched manufacturer-authored scans. The local research note's tabulated values/conditions match those pages. Source dates/variant applicability and redistribution limits remain those recorded in the reference audit; no manual scans are added to the repository.

P Fig5-6 uses2400lb, full throttle, flaps up and KIAS, with pressure-altitude/temperature rows and the specified mixture note. S Fig5-6 separately uses2550lb and different speeds/engine/propeller. Native CAS from vc-fps is neither TAS nor an installation-calibrated IAS indication. The UI explicitly labels ideal CAS when available. The diagnostics do not export matched OAT/pressure altitude and use native automatic mixture. Their30m/1000m labels are initial MSL heights; final windows freely climb to different heights. For example the original30m clean75CAS final window is near598m mean MSL, and the2400lb comparator near638m, so neither is a sea-level chart row.

P Fig5-3's51/52KCAS clean zero-bank values specify **power off**,2400lb and rearward/forward CG. Comparing successful power-on45CAS trim directly with52KCAS cannot alone prove excess lift or a wrong stall speed. CG, bank, power and transient conditions must be matched. Even the independent40CAS/2400lb positive-warning trimmed point is not a matched power-off stall test or a measured maximum-lift point.

SI/kt/rpm/hp/lb boundaries were checked. Climb uses native down velocity negated, independently compared with height/time. Specific energy-height h+TAS²/(2g) is a diagnostic under its still-air/native-default assumptions, not a force/power balance or calibrated climb chart. Last30s reporting is not itself a stabilization criterion; recorded speed/height/energy changes must accompany any mean. Exact fixed-step repeatability proves repeatability, not physical correctness or model applicability. No new aircraft tolerance is selected after seeing these outcomes.

## Independent native cross-check actually run

With root authorization, reviewer executed `/private/tmp/gefly-quality-c172-initial.mjs`, producing `/private/tmp/gefly-quality-c172-initial.json` and its log on the existing hash-verified WASM. Eight cases solve the initializer's TAS so native CAS is40/45/50/75kt at1000mMSL for source-default2480lb and no-external2400lb, then retain initialization trim/throttle for one unforced second with no AP or study roll offset. The numerical CAS conversion assertion is a harness check, not an aircraft acceptance tolerance.

At2480lb,40CAS trim fails;45CAS succeeds at alpha0.20561rad with warning0. At2400lb,40CAS succeeds at alpha0.26844 with warning1.08699;45CAS succeeds at alpha0.19580 with warning0. After1s, default45CAS bank is about7.98degrees versus0.58degrees without external mass, so this is not a sustained laterally trimmed flight test. These short observations corroborate loading, low-speed initialization and actuator/trim-reference caveats; they do not validate operational speeds or isolate lift/propulsion causality.

Final author source/artifact hashes and all scoped outcomes are frozen below. Root/code1/code2 ran the author diagnostics:43 native cases repeated exactly plus six low-start cases; two native actuator suites and14 flap trajectories; four corrected propulsion cases with an exact repeat; static lift arithmetic; original four actual-app cases (process31614 exit0); and the separate effective-manual case (79357 exit0). The original-four script/JSON/log are preserved separately from the final extended script; no claim is made that one final invocation reran all five cases. Their successful completion means the diagnostic observations/assertions completed, not that the aircraft passed physical-performance tolerances.

Reviewer independently ran the eight native initialization/unit cases described above and read primary source/XML plus complete manual pages. Reviewer also ran `node --check` for c172-performance-diagnostic.mjs, c172-flap-diagnostic.mjs, c172-propeller-audit.mjs and app/tests/c172-physics.browser.mjs, and parsed c172-lift-audit.py with Python ast: all final-source syntax checks passed without rerunning or overwriting the author outputs. No independent browser matrix, build, coefficient/model edit, operational instruction, physical-aircraft performance or training-credit acceptance is claimed.

## Evidence interpretation and remaining limits

The integrated author findings were reviewed against the source and raw artifacts, not treated as independent validation. They retain the failed PI speed-seeker and40CAS trim outcomes, the ineffective15px case, the68.59degree effective-manual bank and the power-off/power-on reference distinction. Physical stall onset/lift-curve correctness, installation IAS, matched pressure-altitude/OAT/CG conditions, individual native aerodynamic forces and model-coefficient provenance/tolerances remain outside the accepted diagnostic conclusion. No erroneous-lift-term intent or single weak-engine/propeller/actuator cause is proved. The static overlap, above-nominal operating point, loading and backlash observations are concrete open model concerns for a separately scoped correction/validation task.

No coefficients, production control behavior, default loading, engine/propeller adapter or executing binary changed in this task. Exact source/model identities distinguish the current generic P-based model from the planned S; the future172S and R-SIM-5 acceptance remain unestablished. Same-provider quality does not satisfy the cross-provider peer gate or a separate specification validation.

## Frozen reviewed inputs and evidence

Review packet SHA-256: `2f8b1af29f2eb1accb9819a5817c2428a1c63a94f6ee716d956b8696f484c479` (ordered path, NUL, SHA-256, newline). Root packet SHA-256: `59c8659e534a2b3ce469b7d263587a6780c7810dd30439b6f97e5febaf0ff891`. Its43 source/artifact pins and the nested performance packet's eight pins were independently checked against current files. Manual PDFs remain temporary external source material, not redistributed repository assets. Changes to an affected diagnostic/conclusion require renewed review.

| Path | SHA-256 |
| --- | --- |
| `docs/input/2026-11-05-c172-physical-model.md` | `71152722e96f5c88c31693835fc74d73b7869eadd100f3e3ba7ba0cabaa028fa` |
| `docs/input/2026-11-05-c172-low-speed-followup.md` | `ac0f06ca7281f01734da67a227c4887ac167efc6201647965681c9f81d4ad017` |
| `docs/research/2026-11-05-c172-performance-audit.md` | `21e369b22cf21599dfb6734b4f1ac1c775c4907f0b9abb2d0e5b33c5ac550d09` |
| `docs/reviews/2026-11-05-c172-physical-model-audit.md` | `fa20923aa946a7f52fdeaa4a692bab99fdff9015991e7f51e98a7448191047df` |
| `studies/e1-browser/sim/c172-performance-diagnostic.mjs` | `b7c2c78bbdf0310d4f9d23c118b8a5bd94db78cfb7134f32dbafb191b94c54be` |
| `studies/e1-browser/sim/c172-flap-diagnostic.mjs` | `0e360bf58b0532db41c6bd143bfebe00bb3d12943d9fac78f32b7cdffd4d3660` |
| `studies/e1-browser/sim/c172-propeller-audit.mjs` | `ab9953abf5a10aec111e630b42476fed0b857c4e30b9015e489d75b981f1af75` |
| `studies/e1-browser/sim/c172-lift-audit.py` | `7dcec7b828f1ed134bfd5f817c48b305ea37741e3a98e1950571abdf1660e15f` |
| `app/tests/c172-physics.browser.mjs` | `cffcd21da38c1d604aa73766ca77b791eebfed6f09deb2f13af3d3936633c45c` |
| `studies/e1-browser/sim/bridge.cpp` | `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a` |
| `studies/e1-browser/sim/worker.js` | `fcd816b2395fed1375c78574fd875809616099dc5b316eb4fa1a27b66e76c5ac` |
| `studies/e1-browser/sim/loading.js` | `10fb0ae8b7622455a875ecc48ce689d6455a921cb2a02b2d94495306f4268dc4` |
| `studies/e1-browser/sim/prepare-aircraft.py` | `f0b5f809db9a5e14d666ae2b71b6e26c59008d5b28a74c389d0503d798d8d6ff` |
| `studies/e1-browser/sim/prepare-propeller.py` | `d0b185544637898b9478fc00b810cc3bbebdf1d2ce445a95854f9b56d6a9318d` |
| `app/src/main.ts` | `9bd9d6bcc69775a1de8607ddc8372e5a6bd2a594f3df953584989b83a72c7310` |
| `app/src/pilot-controls.ts` | `1dbb7cb96f8d0a9ee691641fbfbec68b57d84b5d7e31d25dfc6a463e98d26d0e` |
| `app/src/pointer-yoke.ts` | `4a740bf71c3ab1e86a3591f7428874e7cbe85fe02c436652262f3f6e51d14b50` |
| `app/src/autopilot-panel.ts` | `0240df5f5aeda003eab92bc0b74aa4c8c42399438cbb72f6683a51a5404300e2` |
| `studies/e1-browser/sim/dist/jsbsim.wasm` | `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392` |
| `studies/e1-browser/sim/dist/jsbsim.mjs` | `37c820f6990770f8645479e9bce7a37b3ad96da3791367114a5b43c234940824` |
| `studies/e1-browser/sim/dist/build-info.json` | `d535d34f6f3956949724d9b3fbcae704e545b73bdce138f39bebf63bf4b24b26` |
| `studies/e1-browser/sim/.work/prepared-aircraft/c172x/c172x.xml` | `02d1811acad049a259644d4bb36cac94cfdf8600b25b14d844e484d50db347c5` |
| `studies/e1-browser/sim/.work/prepared-engine/prop_75in2f.xml` | `fc3163d3a8ee885af513aa80950f1b4ef6c85a00e7ebeafd4d31b0c5dc6d4e40` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/aircraft/c172x/c172x.xml` | `b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/engine/eng_io320.xml` | `0cedc1e356a7a572a175f351a4abb952ba91081219a37dc7192bce3a2181d8c6` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/src/models/FGAerodynamics.cpp` | `aa14e69c6a25133b25e80f76fbfc3b8c4a34a1a6636e7b8420fb540b697237d0` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/src/models/propulsion/FGPiston.cpp` | `64a65a0407d664c89964933013f6f0063b75a877bae498256ae497091042ab0a` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/src/models/propulsion/FGPropeller.cpp` | `52f6877843a6945cd399302158da5c7a16a1f5fc843f0cc140b18c2c76e9ae97` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/src/models/flight_control/FGActuator.cpp` | `a055f9495efccdfde9ae5da52cbce396d2471242680c9104d8747d58e12c0194` |
| `studies/e1-browser/sim/.work/jsbsim-1.3.3/src/math/FGTable.cpp` | `a1fca96f0a4292317ff9bb3b9372f3a69d9ddaf25de2896802cd3bdf6cc1d7a7` |
| `output/flight/c172-performance-task133-packet.json` | `f668b188f6ff5f6377c83204fa6a99da77001d2d00a27e01d3eb61ed2e3933a3` |
| `output/flight/c172-flaps-task133.json` | `c20ea1cd018d3a3aa4b072689297cb259aef48bbe39b0d315e040400d00da671` |
| `output/flight/c172-flaps-task133.log` | `2a7faa1448c415c671f508b0467237c2da4708038d02092ffd7b3ccd5d70e1bf` |
| `output/flight/c172-propeller-task133.json` | `c3c7c9545f790da99b0c52d6e904db0f576bab6cb29564b6c66c84294cb48275` |
| `output/flight/c172-propeller-task133.log` | `fdf280e2aacc1cec76f185821831805ca82f6a781a6cb5c8b77197ce09cc11ae` |
| `output/flight/c172-propeller-task133-repeat.log` | `fdf280e2aacc1cec76f185821831805ca82f6a781a6cb5c8b77197ce09cc11ae` |
| `output/flight/c172-lift-task133.json` | `0b8656c6d06d645118789a57a04e707cb819effad10d7d74dbbc676a1a33721b` |
| `output/flight/c172-lift-task133.log` | `0b8656c6d06d645118789a57a04e707cb819effad10d7d74dbbc676a1a33721b` |
| `output/flight/c172-browser-task133-original-four.json` | `d62c8eed335ae8c2e07995cb1ff0b324d5617c05ee098fd5f810ba86f96049ea` |
| `output/flight/c172-browser-task133-original-four.log` | `eb3eaaee06a50f9351b3d1afccfb1033bc13191eab380d449f756cc457fdd3c9` |
| `output/flight/c172-browser-task133-original-four.browser.mjs` | `899a1b4e64238bdef5a27769f74be7a017809c585147918714fcc355d724abfd` |
| `output/flight/c172-browser-task133-manual-effective.json` | `7c5562296dea05eaa956361dcd05cd4fe575368eb3666b0682e5c8c1d6c551c5` |
| `output/flight/c172-browser-task133-manual-effective.log` | `e583eae3cf8baf6e80d5cce9fee8aa7cbcd14238b1487d45e51b08cf08582d5a` |
| `output/flight/c172-performance-task133-full-final.json` | `b148d4cca1090ea60b2c717531d31712ec0d442758924e14181cecdcaa2dd15f` |
| `output/flight/c172-performance-task133-full-final.log` | `4984935f3fc9b04e3695700f52b8c6eb3b4d8dd634fc9f0ae5140829dc19324e` |
| `output/flight/c172-performance-task133-low-start.json` | `0ee797f17b934d565e295bfdea5ae36d7847ef5b119f54a8b25dee8f96b6b63a` |
| `output/flight/c172-performance-task133-low-start.log` | `c5814233dfff8e45885ea7c1600a4e4d86428fd82e85a13d2af493da7c4cd9f9` |
| `output/flight/c172-performance-task133-exploratory43-source.mjs` | `a1a62b6d29542822e0ff651d30ae18e80f7ad193a051e1adbdbcc567aa489e0f` |
| `output/flight/c172-performance-task133-exploratory43.json` | `ec3f7e40113165bbeb37a769150d90986aa95d3f17f4d02438515cba69cc0c96` |
| `output/flight/c172-performance-task133-exploratory43.log` | `4984935f3fc9b04e3695700f52b8c6eb3b4d8dd634fc9f0ae5140829dc19324e` |
| `output/flight/c172-physics-task133-packet.json` | `59c8659e534a2b3ce469b7d263587a6780c7810dd30439b6f97e5febaf0ff891` |
| `docs/SPEC.md` | `e258a22bf998c8ab9e779f4a0f88f59eec04aa09e98eff0096c0d4a1311a121b` |
| `docs/SEC.md` | `fb259f7cd43d136b3479783faef999751cb060b4f86bc6e0076d2e22d0434366` |
| `app/src/six-pack.ts` | `66bd815e88243cdc6088d5b0834b208ddf55c7a6f2bc06d2c67e5f993bea575c` |
| `/private/tmp/gefly-quality-c172-initial.mjs` | `9cfb37f5756819a97b301e946613e0609b8e985bdfb98acc6b6b31c4dcddbc91` |
| `/private/tmp/gefly-quality-c172-initial.json` | `8c8520a8b7b9eb80276093a80290b5c8d9be0e5fdfcefb58c631c2c5fa4ecf4f` |
| `/private/tmp/gefly-quality-c172-initial.log` | `32d454f9821f2ff2539b96d99a9503d542e9a714498460a167a555d1f34a6fd7` |
| `/private/tmp/gefly-c172-audit/c172p-1982.pdf` | `5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c` |
| `/private/tmp/gefly-c172-audit/c172s-rev5.pdf` | `420dbdaf5517a7a005cde8938ac359678bcfe52863e8efd4f55fcdbf29ec429f` |
| `/private/tmp/gefly-c172-audit/p-83.png` | `40de528e1f33a456d442d8edced2db2dfb03a3aeb84527fb4b412ea098abfbf3` |
| `/private/tmp/gefly-c172-audit/s-128.png` | `1d5974099036e0f46ef1f2cc95f4c090fb38515de6c517c0cf3a853310ad2700` |
| `/private/tmp/gefly-172p-poh-p80.png` | `b42b92f935e9940fce8dafb9d914c35b55588e76bc3d24c34fd35cc5d1ba0bca` |
| `output/flight/engine-build/jsbsim-1.3.3/src/models/FGAerodynamics.cpp` | `aa14e69c6a25133b25e80f76fbfc3b8c4a34a1a6636e7b8420fb540b697237d0` |
| `output/flight/engine-build/jsbsim-1.3.3/src/models/propulsion/FGPiston.cpp` | `64a65a0407d664c89964933013f6f0063b75a877bae498256ae497091042ab0a` |
| `output/flight/engine-build/jsbsim-1.3.3/src/models/propulsion/FGPropeller.cpp` | `52f6877843a6945cd399302158da5c7a16a1f5fc843f0cc140b18c2c76e9ae97` |
| `output/flight/engine-build/jsbsim-1.3.3/src/models/flight_control/FGActuator.cpp` | `a055f9495efccdfde9ae5da52cbce396d2471242680c9104d8747d58e12c0194` |
| `output/flight/engine-build/jsbsim-1.3.3/src/math/FGTable.cpp` | `a1fca96f0a4292317ff9bb3b9372f3a69d9ddaf25de2896802cd3bdf6cc1d7a7` |
| `output/flight/engine-build/prepared-aircraft/c172x/c172x.xml` | `02d1811acad049a259644d4bb36cac94cfdf8600b25b14d844e484d50db347c5` |
