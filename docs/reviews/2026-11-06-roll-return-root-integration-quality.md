# Roll-return working-copy integration quality

Reviewed 2026-11-06 10:52 Europe/Berlin by Codex `roll_quality`, independently of the integration author. Scope: `/private/tmp/gefly-roll-return-root-preview` against unchanged `/Users/gregor/Documents/devel/gefly`, limited to the proposed install manifest and preserved runtime. Task2.0.153; bounded R-SIM-11 return contract, not full aircraft stability, ROOT milestone or external-peer acceptance.

## Outcome

No blocking finding in this frozen integration candidate. All26manifest file pairs and12unchanged runtime pairs match their recorded hashes. The only changed running model bytes are the local native WASM and its build metadata; the included glue is byte-identical to the prior glue. No application/controller/camera/terrain source is replaced by an older branch version. Apply only the final preflighted manifest, with backups and a fresh check that ROOT has not changed. Review-record or factual-count updates after this snapshot require refreshing the affected manifest hashes before installation.

## Independent checks

- Compared every manifest `before` hash with current ROOT and every `candidate` hash with the preview:26pairs match, no conflicts. Compared all12declared core runtime files on both sides: both match the unchanged hash. Manifest SHA256`4f4f79f2125b439afc8bf8b8596986658ce99d3599e785067d0037997dc0d148` at this review.
- Independently executed193preservation-focused Node tests in the preview: all pass, no skips/failures. Scope: session, saved location, trace, pilot controls, pointer yoke, control settings, view preferences, AP reload and initial-balance helper behavior. Log `/private/tmp/gefly-roll-root-independent-preservation.log`. These pure/component checks do not claim real aircraft or browser flight execution.
- Independently ran TypeScript on the preview: pass, log `/private/tmp/gefly-roll-root-independent-tsc.log`.
- Inspected the author's full preview app log `/private/tmp/gefly-roll-root-tests.log`:717Node tests and28Python tests (9+6+10+3) pass. This is717, not the earlier shorthand715. Inspected supplied strict native57case/18return-check log `/private/tmp/gefly-roll-root-native.log`; its result agrees with this reviewer's separately executed current-engine57/18checks in the feature review. Full preview suite/native execution here is supplied evidence, not independently rerun in this integration review.

## Runtime and build preservation

The unchanged pairs are main, scene, session, pilot controls, pointer yoke, control settings, physics Worker, native bridge, terrain-grid header, KAP140 controller, navigation and AP-reload helper. No source change touches the existing AP reload/map starts/background flight, camera behavior, panel controls, terrain/airport workers or gains. The native bridge ABI/state packing is unchanged. This review does not infer all unexecuted user flows pass solely from unchanged source.

The candidate native trio exactly matches the payload served in the current five-case strict actual-ROOT-app browser artifact:

| File | Candidate SHA256 | Comparison |
| --- | --- | --- |
| jsbsim.mjs | `019d393954ba61d1e09c541496a18413118ed22617608220080ddbea3dea270e` | Also identical to current ROOT glue |
| jsbsim.wasm | `266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc` | Final v5 and controlled two-value model repair |
| build-info.json | `cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65` | Final v5 source/model metadata |

The candidate metadata's WASM hash/length, adapter-script hash and bridge hash match actual candidate bytes. Adapter ID is`gefly-c172x-mixture-pitch-ap-v5`; model hash is`cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595`. Current ROOT before-install WASM remains`c11a93378da778e34168c5b9043e44448855fb6699a640585d224313722d0f42`. The reviewed actual-browser override uses the same ROOT source and identical final payload, providing a relevant integration check without rewriting the user's runtime during testing. Its source/native hashes and return assertions were independently inspected in the [feature quality report](2026-11-06-roll-return-quality.md); this integration reviewer did not execute those browser runs independently.

## Merge and record inspection

The package preserves all existing dependencies and scripts. Its test-list edit only prepends the new pure checker tests; two added commands run the native and browser return checks. The application README preserves the complete old byte prefix and appends the roll section. No lockfile/dependency changes occur.

TODO modifies only Task153, preserves the old entry as a prefix and leaves it open for wider handling/fidelity. SPEC changes only R-SIM-11, preserving the former criterion prefix and adding the bounded return requirement once. ARCH/SBOM explain the zero-width adaptation and replace the obsolete claim that the adapter adds only mixture gating. Input index adds only the new immutable user record; research-index additions retain prior links. GAPS adds the clarification plus an older recording-scope record and remains sorted by dated decision. All205complete prior DONE records remain byte-identical as parsed whole entries; one new entry is added. No raw input history is changed.

## Limits

This is a scoped source/build/install preservation review. It does not accept the known oversized whole-ROOT assurance graph, full ROOT CI, real VSCode/WebKit controls, installed C172 rigging or selected-aircraft fidelity. Pitch hysteresis and broader sensitivity/spiral/other-envelope behavior remain open. No aerodynamic coefficient, pilot gain or continuous wings-level controller is added. Local generated aircraft/native data rights stay unresolved and these files are not approved for redistribution. Cross-provider peer results and separate specification validation must retain their actual scope/status.

## Preserved core runtime hashes

```json
{
  "app/src/main.ts": "0c0d129a2721076bfca6a305111f18952bce72fbfebd4aefbad138fde77883a8",
  "app/src/scene.ts": "32558e9ec73539cf995db6b23fd1d2957e08d3fc7bc28f55b780b0772d7fd89d",
  "app/src/session.ts": "351694cea9f26568e6d2b3608498a45c031a3c664937cf047600f52100c6916f",
  "app/src/pilot-controls.ts": "b74b7cffd7f3f22c311e2fc4a1f207d2b0929700047d045502c5997a28514338",
  "app/src/pointer-yoke.ts": "08082bce04e20ce0f7c24959884a70f37f2e8ebc29739ab4136657bcb03e5b35",
  "app/src/control-settings.ts": "9f79f1e84f4a81dd0d467ff06cddebd604bec87fff0a7a8e017e2b836fb9435d",
  "studies/e1-browser/sim/worker.js": "140d3fbadd41df7df7b37fd41fe7633f18289874f599ac4e0d0a95beec7dbf4b",
  "studies/e1-browser/sim/bridge.cpp": "e71646929a6f13dbf9abd3eddc2f158fb79fd0ae16e8ed929038d22a3bd893c8",
  "studies/e1-browser/sim/terrain-grid.h": "1fb82497d6d8ad9be270e8e9f151092acc383240d79536b43c9d5938d0d2afff",
  "studies/e1-browser/sim/kap140.js": "c23458e6b0cba257231eda0cbff7798157c7fbc535d68395c2c2985838d3b78a",
  "studies/e1-browser/sim/navigation.js": "107283241923b58445e0537228457e79d32a1603cc0c57a5038627605a193b80",
  "studies/e1-browser/sim/autopilot-reload.js": "3d6fa5a15c01f7e2e67361661b5ccfaf189f621cc128e12ccdfd288efde9b17c"
}
```
