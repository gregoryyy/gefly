# Roll-return ROOT integration validation

Recorded 2026-11-06 10:59 Europe/Berlin by Codex `roll_validate`, independently of the implementation/integration author. Scope: `/private/tmp/gefly-roll-return-root-preview` versus the preserved user checkout `/Users/gregor/Documents/devel/gefly` and `/private/tmp/gefly-stability-response`. Initial 26-file candidate/preflight manifest SHA-256 `4f4f79f2125b439afc8bf8b8596986658ce99d3599e785067d0037997dc0d148`; 12 critical runtime byte identities are declared in that manifest.

**Current result: scoped runtime/record integration passes. V1 is resolved by the verified report refresh. The registration-only package/report addendum below is reviewed and ready for the parent’s final metadata copy.** This is a narrow integration validation, not whole-ROOT CI/assurance, complete Task153, aircraft fidelity, user-browser/hardware or training acceptance.

## Method and observations

Independently checked every initial manifest before-hash against then-unchanged ROOT and every candidate-hash against the preview: all 26 pairs matched. All 12 critical runtime files matched both original ROOT and candidate. During this review the parent applied the candidate. Independently rechecked installed ROOT: all 26 files now match the frozen candidate, all 12 critical runtime hashes remain unchanged, and the three native payloads equal the already tested actual-ROOT HTTP-override payloads. This distinguishes initial preflight, candidate validation and post-apply byte identity; it does not claim the old engine remains installed.

The original copies in `output/flight/roll-return-integration/before` independently match every non-null preflight hash. Original DONE 205 complete entries are all retained unchanged in candidate DONE 206 entries, using the repository's fence-aware sorted-log splitter. App README is a literal prefix-preserving append. TODO changes only Task153 by appending to the original line. Existing input/research index lines remain; input records are unique. GAPS 51 timestamped decision records are newest-first. All 89 SPEC requirement IDs are preserved; only R-SIM-11's declaration changes.

The candidate package retains all existing non-script/dependency content. Existing commands remain; its test command only prepends the roll checker test. Two separate roll-native/browser commands are added. Main, scene/camera, session, pilot gains, pointer, control preferences, physics Worker, bridge/terrain ABI, KAP, navigation and AP reload code remain byte-identical.

Independently verified the candidate's MJS/WASM/build-info hashes against `output/flight/disturbance-input-browser-final-v5-strict.json` (`d21695bd53617f8a037da5027702bf0481dc14414a21ddb4854556dd3adc0388`). All seven non-native ROOT source pins in that real-app artifact also match the candidate. The supplied strict execution ran actual ROOT UI/Worker code with only per-context native-file overrides: five cases pass 30 paired finite L/R own-initial return checks at +.5/1/2/5/10/20s; all released axes stay 0. These executions were supplied and independently inspected, not rerun by this validator. Exact runtime identity supports reusing this affected behavior evidence for the candidate.

Inspected supplied candidate logs: 717 Node app cases pass, 28 Python cases pass (9 adapter + 6 propeller + 10 terrain + 3 airfield), TypeScript exits clean with an empty error log, and strict native 57 diagnostic / 18 return checks pass with maximum returned surface residual 0. This reviewer did not independently rerun the complete 717-case suite or another full browser run; the preceding feature validation independently executed the affected adapter/checker/native/AP suites.

## Criterion matrix

| Scoped criterion | Expected | Observed evidence | Status |
| --- | --- | --- | --- |
| Snapshot/preflight preservation | Original files and candidate bytes match the declared integration set before apply | Independent 26 before/candidate pairs and backed-up originals match the initial manifest | pass |
| R-INPUT-1/R-SIM-11 runtime preservation | Retain existing gains, manual input, AP/session/map/background/camera behavior and terrain ABI | 12 critical file hashes equal original ROOT; no app runtime source replacement outside the native payloads. Existing package tests/scripts/dependencies retained | pass |
| R-SIM-11 exact tested native payload | Install the same model/runtime exercised by the strict actual-app proof | MJS019d3939…, WASM266f2016…, metadata cbbe0f59… match the strict five-case artifact; matching actual ROOT source pins | pass |
| R-SIM-11 local behavior integration | Actual commands release and both real ailerons return to their own trimmed positions | Reused strict actual-ROOT source/native-identical five-case execution with 30 finite paired return observations, all zero; installed payloads match afterward | pass |
| Candidate regression/type safety | Existing candidate tests and affected native regression pass | Supplied logs 717 Node + 28 Python, clean TypeScript, 57 native diagnostic + 18 strict checks pass; no failed/skipped application cases reported | pass |
| Shared-record preservation | Preserve existing records, IDs and source inputs while recording the refinement | Complete DONE entries, README/TODO append semantics, unique input index, chronological GAPS and 89 unchanged SPEC IDs independently checked | pass |
| Current review evidence | Stale model/checker evidence is replaced with the reviewed static snapshot | V1 resolved: metadata-refresh record and readback confirm final 40f quality/validation copies b0dc9db7…/dd13c1e9… in candidate and ROOT; current metadata is correctly cbbe. Later registration-only qualification is returned for final copy below | pass |
| Post-apply integrity | Applied files equal reviewed candidate, with critical runtime preserved | Independently verified all 26 ROOT paths against candidate and all 12 preservation hashes after parent apply | pass |
| Whole-ROOT graph, wider handling/fidelity and user hardware | Separate complete acceptance evidence | Existing broader graph-bound limitation and aircraft/user-browser limits remain outside this scope | not evaluated |

## V1 — review-record freshness, resolved

The original candidate/deployed review copies were stale: validation d0c4782a… pinned earlier metadata f285 and older test identities against native 266/cbbe. Parent refreshed both final 40f reports into candidate/ROOT. Independent readback confirmed byte equality at that refresh: quality b0dc9db70da6e6575bb6607234d0d77d6f512557e12ce713463882dd8deefc47 and validation dd13c1e91b5ad09789db7e815b2b354206376652e256cee347c94a313fc5d43b. `output/flight/roll-return-integration/metadata-refresh.json` records the exact old/new document hashes and the accompanying sequence/wrapper/harness/evidence updates. V1 is closed; no model/physics mismatch occurred.

The refreshed 29-file manifest (`634b633b9c81d5427fed3704c07b3e4152e6502a79e548dcf429194a19c39cb8`) replaces the initial 26-file record for that metadata stage. Twelve critical runtime files and the three native payloads remain unchanged. The actual installed no-override five-case proof 8654925e… and installed native 57/18/54 return checks pass on this same physical runtime.

## Registration-only addendum and final metadata copy

After the 40f shared gate, only feature `app/package.json` adds the exact first command `node ../studies/e1-browser/sim/roll-return-native.mjs && ` before the old browser chain. Independent object comparison after removing that prefix equals the 40f package in every field. All eight other implementation/test files retain their reviewed hashes. Test/default unit commands, dependencies and old browser chain remain unchanged. Registered command execution from `app/` passes 57 diagnostic / 18 isolated / 54 successive checks; log SHA-256 `b09617174a692e527cb463b3bfecd1454cfb56a8e1b8038ab2e5662fae5842b9`. Whole older browser-chain replay is not claimed. The pre-registration full 555 Node + 25 Python / 85 assurance / 11 training CI is qualified with this positive registration check.

Current feature nine-file manifest is `c2deb0730552dc2d84885baa1e10d358f9d69018b8db716647e99b58955913f4`; package pin is `20dd8c015cb144bef40d59cb1596a8232c741a525e8da13b7996eb04c31a23b1`. The parent’s final ROOT package change must apply the same prefix to ROOT’s own preserved old chain, rather than replace ROOT with the narrower feature package. This exact bounded transformation and the updated source-report qualification are reviewed. At this inspection time, installed ROOT/candidate still have the pre-registration test script; application runtime is unaffected.

This updated report and the updated final feature quality/validation reports are returned to the parent for the final metadata-only copy/readback and package-prefix application. No claim is made that these newly written report bytes were already copied before this review. That final bookkeeping step changes neither the 12 preserved runtime files nor native model 266/cbbe.

## Verified native payloads

| File | SHA-256 |
| --- | --- |
| `jsbsim.mjs` | `019d393954ba61d1e09c541496a18413118ed22617608220080ddbea3dea270e` |
| `jsbsim.wasm` | `266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc` |
| `build-info.json` | `cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65` |

## Supplied log identities

- `/private/tmp/gefly-roll-root-tests.log`: SHA-256 `feeebc07219d9ff9df0fb894041bd70917d1bdcc8c80c346c8127983ce465922`.
- `/private/tmp/gefly-roll-root-tsc.log`: SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `/private/tmp/gefly-roll-root-native.log`: SHA-256 `ad9693dbe39a5f356d7aa2cfad3b0bc1089fb23666e6a44378b7328330aedb4f`.

Only this assigned report was written. The application revision remains a generic 1982 C172P research model; this scope supplies no installed 172S, full stability envelope, real touchpad/WebKit, legacy-recording fidelity or training approval. The existing user's browser must load the new native payload to run it; file installation does not prove the state of an already-running Worker.
