# Scenery implementation quality review

Reviewed 2026-11-06 09:24 Europe/Berlin by Codex `scenery_quality`, independently of the implementation authors. Artifact: `/private/tmp/gefly-airport-generator`, base HEAD `6563c5936f6c74dc3f34d04b5000c6d7a8328b85`, scoped working-tree source manifest SHA-256 `8c08659d36e75913041778dfb9d45efabe6c6044313188a1c9416b8bacd0666f`. Runtime source hashes are listed below. This is quality review, not specification acceptance or cross-provider peer review.

## Outcome

Renewed 2026-11-06 09:25: no remaining blocking quality findings in this scoped snapshot. The confirmed medium cancellation/cache defect below is repaired and independently rechecked; its original reproduction remains historical evidence. No additional critical/high finding identified in the inspected airport compiler/cache/worker/renderer/markings, terrain-worker transport, overview camera or shadow changes. Missing live-source accuracy and reported real-terrain landing evidence remain limitations, not passing results.

## Finding Q1 — medium — valid persistent cache removed on cancellation

Location: `app/airport-region-server.ts`, `readDisk()` catch block (approximately lines142–164). `compiler.readCache(...,signal)` rejects when the last subscriber disconnects or the job deadline aborts. The catch treats that cancellation as corrupted data, removes the disk index and unlinks the valid cache file. A moving/reloading client can therefore discard valid regions and cause unnecessary source regeneration later, defeating the persistent backtracking/reload cache.

Independent reproduction used a fresh temporary directory containing the valid1134-byte browser fixture `114-255.json`, the actual middleware and compiler Worker, and a fetcher that throws if invoked. After `diskEntries===1`, issue mock GET `/scenery/airports/v1/114/255.json`, wait for `compilerActive===1`, set `res.destroyed=true` and emit request `aborted` / response `close`. After pending settles, observed cache file absent, diskEntries0 and upstream0. Expected: cancellation leaves valid file/index intact and a later request returns a disk hit. The original test suite did not cover this cancellation point.

Repair: distinguish cancellation/deadline from actual corruption/expiry before invalidation; rethrow aborted delivery without unlinking. Add a regression using the actual compiler worker and verify later disk reuse with no upstream call. Assigned back to `airport_server`; this reviewer made no implementation edits.

## Checks actually executed

- Independently ran `node --test app/airport-generator.test.ts app/airport-region-server.test.ts app/src/airport-region.test.ts app/src/airport-region-loader.test.ts app/src/airport-region-worker.test.ts app/src/airport-surface-geometry.test.ts app/src/airport-surface-markings.test.ts app/src/overview-camera.test.ts app/src/aircraft-shadow.test.ts app/copernicus-decode.test.ts studies/e1-browser/sim/terrain-source.test.mjs`:53passed,0failed,0skipped. Log `/private/tmp/gefly-independent-scenery-quality-tests.log`.
- Independently ran `node app/tests/aircraft-shadow.browser.mjs`: all3browser groups pass (actual shadow pixels and exact paused return, stable paused frames/no native advance, high/cockpit hiding). Log `/private/tmp/gefly-independent-shadow-browser.log`. The fixture is a flat landing study.
- Independently reproduced Q1 using a temporary cache and actual service/compiler worker; no source was changed.
- Inspected author artifacts `output/flight/airport-generator-browser.json`, `view-and-thread-browser.json`, `aircraft-shadow-browser.json`, source tests and implementation, plus relevant AGENTS/quality/SDLC/STYLE/SEC/ARCH/SPEC scope. Inspection of supplied browser artifacts is not claimed as independent execution of those suites.

## Bounds and remaining limits

Source URLs/queries and same-origin worker operations are fixed; compiled byte/geometry/cache budgets, no mapper identities, OSM credit and explicit visual-only surfaces are retained. Geometry/source work is separate from physics, while native installation and required coverage/source-history guards remain in the physics owner. Worker transfer paths copy retained arrays. Generic painted markings/PAPI are optional/illustrative; no installed equipment or surveyed surface is inferred. Overview changes camera distance, not native dynamics. Shadow pavement receivers and explicit current receiver avoid the two identified gating/occlusion causes.

Real Overpass502/timeouts prevent positive real-source airport coverage proof. Airport browser geometry/pixels are synthetic. No aircraft coefficients, full global-airport completeness, surveyed terrain/contact fidelity or training benefit is accepted. The user's exact real-terrain flicker scenario is not reproduced by the flat pixel test. The wider dirty ROOT application and subsequent merge resolutions are outside this source review and require affected integration checks. External Claude provider review remains separate/pending.

## Scoped source manifest

```json
{
  "app/airport-generator-worker.ts": "a0342f081fb06d4c21f7d52c0cec5fafcbc8715f265eace4b985ccd3597087e3",
  "app/airport-generator.test.ts": "4a94089ed88380aaf557ae9a6a07c7041ad916203bb9eb09c882d246c731c601",
  "app/airport-generator.ts": "1f0a1566d46044379e5c6423ee54b00410301faaca29cb2d6b637a04240dc795",
  "app/airport-region-server.test.ts": "9fd3414112860fe00722408b2b72a1117293b0b5291c18c9a073a736e26569a6",
  "app/airport-region-server.ts": "0b39ba79dfd1ad51709cd8c9efacb07d7657208e1dd8b33886656f766eba2dc8",
  "app/copernicus-decode.test.ts": "86c21cb83e1122a1dff171339a4febb6fbc7d543ab87aa504227f36771b0479f",
  "app/copernicus-decode.ts": "3b83c39be0b1afb6d3062b1db864d2af0f997c6b8469437332cbb1b8690ab0aa",
  "app/copernicus-decode.worker.ts": "9474612a9ec6838648bf3224081ad2cbe44b8d2e6309f0f108435a39c89d8032",
  "app/copernicus-terrain-server.ts": "03a2f63f5f1e3248444e6a84da6d04d50b3808efdba00cfee914bbfb49a299cc",
  "app/runtime.ts": "427cdd6dbe6dfca3dd70bb9f828bfd5079bb3ec5d3159e426db3cbce44b0bb1a",
  "app/src/aircraft-orientation.ts": "dbf9c9ac3862dd8b5203871aed66f9c78473e3b163ec66484660eaca3b1ba69d",
  "app/src/aircraft-shadow.test.ts": "9ffae355a0fb18132dab2162835aee061c1d54fc93aa46a3445afb3838ef9bcf",
  "app/src/aircraft-shadow.ts": "884f37b36671e2b363e20ef0bd4f04e38d49c8cef0f73c0d0f9b65f8cae88882",
  "app/src/airport-region-loader.test.ts": "774d3952a162bae3641ef959a1ebc9859f8710a3e4dcd89d0a9b9b65f01418a4",
  "app/src/airport-region-loader.ts": "015036f267573f891a3478ba253fe641ee0dd37de78dea871b7d0439ba040121",
  "app/src/airport-region-read.ts": "ffd86a69a9769d769b2ff70f155cd9d2a6bc059b4c967c4fb3e64a4de24db429",
  "app/src/airport-region-worker.test.ts": "38293f44f0dd4a0d0a7c5284f900c3db8ab8203465b259c2f91758cf8cd9167d",
  "app/src/airport-region-worker.ts": "3321b19059cbbbf058237049137a4ba53a28a1346c8547a10d3d98ffb5fcfdd9",
  "app/src/airport-region.test.ts": "2c69aefed6f75407bfe775eb6e4be7566ae6c13b12ab2d87b7680a9a13d17cfe",
  "app/src/airport-region.ts": "774e562cbb4bc4b7445c862c5dd2b21f39fde579a477f678ef8da3120160dbd2",
  "app/src/airport-region.worker.ts": "746bcad33795771bf2579667e9735821a3469ce4bab87e86b7a66fa44e5fc2fb",
  "app/src/airport-scenery.ts": "b8f9e7e1786cf109cabbf9ee71013f5aff070cd52336fa2cccb2c8e762c38877",
  "app/src/airport-surface-geometry.test.ts": "f4964fabfbfd5f123bc0f18005583850b10c868e92fb9ce3efb48fb8904caa44",
  "app/src/airport-surface-geometry.ts": "675efce414cb5b2007dbdf490a855199b09ce1e947951d2742a1e9ff28164b5e",
  "app/src/airport-surface-markings.test.ts": "1f2b484441415f0d8416cea5d4680c570707d8f9ed201de61785ca11b01d093b",
  "app/src/airport-surface-markings.ts": "d168f83d5dd16fc758548de358ed2bf2f6aaff4673dbc484017d7473a7feb3ca",
  "app/src/control-settings-panel.ts": "7230d6d52681028671cf3e81c4ad6d78963079501636ac5ed777ffce8d8a22ac",
  "app/src/main.ts": "612469b4c18be8580f6547e471814eb994cd343e49f4b31a35a3b27de1d6b0ab",
  "app/src/overview-camera.test.ts": "1f0333afcc7fe2d6ec5c6f4e57a90f1d44853dcf490b05080077def7c2f0690e",
  "app/src/overview-camera.ts": "44dc28d7c1b6fef784aa5c66c1dd86aebf156e99822d87f349608c52b6d62ae3",
  "app/src/scene.ts": "ba8b2368e1cf63d5d3bdf8b72a7917c2e9d0b100627a30d22fc6b0cbfbe5de91",
  "app/src/streamed-airport-scenery.ts": "5394e1811736c6390cfce929d06200778c5a9e3d5c6202dc50d78ec5899aeecc",
  "app/src/terrain-overview-source.ts": "c08026f8dd98fa7bf5c5b9e675ffe4677cd9b3cac637d0716b4cf1cbc8925d7a",
  "app/src/terrain-overview-source.worker.ts": "e19601ebb5150ed48241cd06d64321d69ea36ac9bd669cb626bb824c9251d99a",
  "app/src/terrain-overview.ts": "9d560e718cf0da89ad7e727e7eb04f89779569a91df54b2fa00c7a0c4dd019e1",
  "app/src/types.ts": "aeeae5b7f77d815fde5a4e37e586d9603c670af7e89e0cb0342976d325e3cb4c",
  "app/tests/airport-generator.browser.mjs": "6fb632fde8db5ab2f87eccbe6d2185a121ca2477e8343fd28143195bf8871309",
  "app/tests/view-and-thread.browser.mjs": "b666047a31f09d03c38138f6cb636a7f4ebeea42d5c460d3c37575f1ef672e9d",
  "app/vite.config.ts": "882635d2c8015e70ff0fa078d061f70dcd474a5031722663a92ab131c385cd2c",
  "studies/e1-browser/sim/terrain-source-client.js": "d1c12415f66234c1e8c47c6f92c56d1e16f311c8964d4650c9d19c1527253d85",
  "studies/e1-browser/sim/terrain-source-worker.js": "282d06628daa70a10753661e91f187c38ea6394f5a8f2d2dbacbfeaf9745cf8d",
  "studies/e1-browser/sim/terrain-source.test.mjs": "8be9a1d7698a2a8d3b485dc70c21e4011a8a64a0b49b4d2f256f0e3a94a963a8",
  "studies/e1-browser/sim/worker.js": "bf1fd1afd72903222439d52163a4f1f0e9b523fb6dbb461e315b59239e9bd697"
}
```

## Renewed Q1 check — 2026-11-06 09:25

`airport_server` repaired only the server catch and its regression test. This reviewer inspected the change and independently reran the compiler/server suites:20passed,0failed,0skipped (`/private/tmp/gefly-independent-airport-server-renewed.log`). The added deterministic regression waits for real cache validation, cancels its last subscriber, verifies byte-identical file/index/byte-count preservation, and requires a later disk hit with zero upstream calls. Independently rerunning the original reproduction now returns `retained:true`, `diskEntries:1`, `diskBytes:1134`, `upstream:0`, all pending/compiler counters0. Q1 is resolved.

The only source changes since the original manifest are `app/airport-region-server.ts` and `app/airport-region-server.test.ts`; all other reviewed runtime source hashes remain identical. Renewed source manifest SHA-256 `6d8243a40b42c1f641d92466ed8b5c32cf95143576abbe60cf32700e89252367`. Updated entries:

```json
{
  "app/airport-region-server.test.ts": "76e7926f3dbd2decf5fa17130a5d751294dfbf538f8e7a9ab3c72c2efc77868a",
  "app/airport-region-server.ts": "91ec81419de5da2a5d872318056e19b3ccd8f0fd809c0d3d936860c34f857543"
}
```

No specification or cross-provider acceptance is inferred. Subsequent source/integration edits need affected review.

## Renewed generic PAPI check — 2026-11-06 09:26

The validation reviewer found that the original generic PAPI cue measured range from the threshold rather than the light. After the orchestrator's repair, this reviewer inspected `genericPapiAngle_deg` and its use in `streamed-airport-scenery.ts`, and independently ran the markings/geometry/browser-reader unit suites:9passed,0failed. The explicit reference places the light300m beyond threshold and the aircraft1000m before threshold,69m above the unit; `atan2(69,1300)` produces3.0382327597degrees and two white heads. Off-sector/behind-threshold/unavailable-height cases hide. It still represents generic illustrative placement, not an installed PAPI.

Changed markings/renderer hashes:

```json
{}
```

No replacement-init cancellation change is included. The existing serialized message queue remains: a second init cannot enter onInit until the first settles. The discussed stale-init race was not reproduced and is not reported as a defect. Feature worker SHA-256 remains `bf1fd1afd72903222439d52163a4f1f0e9b523fb6dbb461e315b59239e9bd697`. Additional lifecycle test evidence is separate; source/coverage admission semantics are preserved.

## Scoped lifecycle harness inspection — 2026-11-06 09:35

Independently inspected the new `app/tests/terrain-source-lifecycle.browser.mjs` and supplied `output/flight/terrain-source-lifecycle-browser.json`; this amendment does not claim independent execution of that harness. No blocking test-quality finding identified. Harness SHA-256 `6bdd0ba3c39ba012c6359a726e068ba9d1caf0334e0455e52c55f327090b8657`; artifact SHA-256 `fa87f4eb956d2166e7ae172330ccfa4e7ff7f60b530eb0379be7db2f5a520f1f`.

The local HTTP fixture serves the actual fixed runtime/module allowlist and actual local engine/terrain assets; it prepends only deterministic lifecycle observers and a250ms synchronous CPU loop around the source-only `WorldTerrainStream.compose`. Native state/terrain arrays and stepping are not replaced by the probes. The physics-Worker observer forwards source messages with the native step index; the recorded tenth composition takes253.1ms while native step advances5→35. The source loop is in the actual nested source Worker. This supplies bounded evidence of CPU/thread separation, not a measured production loading latency or complete performance guarantee.

The harness then pauses through the real message API and compares complete stats snapshots (step37, digest `0c57ed48a8291307`, all14state values) after1.2s. Serialized reinitialization checks old source Worker1 termination, Worker2 creation and native step0. A deliberately corrupted required world-source byte causes an integrity error and no third ready flight. Initial delivery asserts exactly nine source-identified terrain-tile messages. These checks support their stated lifecycle/isolation cases; required-coverage waits and source-history admission remain unchanged.

No runtime lifecycle repair is included: feature worker remains SHA-256 `bf1fd1afd72903222439d52163a4f1f0e9b523fb6dbb461e315b59239e9bd697`. The final reader change removes trailing blank whitespace only; compared to the earlier frozen packet, `current.rstrip()==old.rstrip()` is true. Renewed `app/src/airport-region-read.ts` hash `5769e20cdabe5bb3a9bfedaee9422218f9e15240ffe150f9bea866501c284c5e`. This whitespace-only renewal does not invalidate the inspected reader behavior, while later semantic changes still require renewed review.
