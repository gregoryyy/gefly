# Scenery increment validation

Recorded 2026-11-06 09:29 Europe/Berlin. Reviewer: Codex `scenery_validate`, independent of implementation. Scope: isolated `/private/tmp/gefly-airport-generator`, base `6563c5936f6c74dc3f34d04b5000c6d7a8328b85` plus reviewed working tree. This does not accept the separately merged ROOT preview, earlier PRs, all existing criteria in the broad requirements, aircraft fidelity or a release milestone.

Status: **bounded software criteria pass; live-source success and exact sloped-landing reproduction not evaluated**. The PAPI sightline defect found in this validation and the independently found valid-cache cancellation defect are repaired, with renewed reference tests and actual airport browser evidence. This is incremental software validation, not full airport/terrain/aircraft or release acceptance. No missing evidence is treated as passed.

## Method and evidence

Read AGENTS, validate contract, applicable SPEC/SDLC/STYLE/SEC/EVAL, source/cache research, OFM assessment, implementation and test bodies. Independently ran:

```sh
node --test app/src/airport-region.test.ts app/airport-generator.test.ts app/airport-region-server.test.ts app/src/airport-region-loader.test.ts app/src/airport-region-worker.test.ts app/src/airport-surface-geometry.test.ts app/src/airport-surface-markings.test.ts app/src/overview-camera.test.ts app/src/aircraft-shadow.test.ts app/copernicus-decode.test.ts studies/e1-browser/sim/terrain-source.test.mjs
node --test app/src/airport-surface-markings.test.ts app/src/airport-geometry.test.ts
```

Initial run:53 tests pass; renewed PAPI run:8 tests pass. Final full focused run after both repairs:55 tests pass, no skips/failures; log `/private/tmp/gefly-scenery-validate-final.log`. The final cancel-during-disk-validation case waits for actual compiler ownership, confirms file/index byte preservation and obtains the next disk hit without an upstream call. Browser results below were executed by the author and independently inspected here, including their test assertions; this reviewer did not execute those browser runs. The final airport artifact passes4 groups, its10 pinned sources match current bytes, and before/after pins are equal.

`/private/tmp/gefly-airport-ci-final.log` records592 application tests, assurance85/training11 passing, scaffold/integrity/whitespace passing and the final shared gate with9 optional JSBSim study skips. This final run follows both repairs. These observations remain separate from untested broader fidelity and the external peer gate.

## Criterion matrix

| Criterion | Expected | Observed evidence | Status |
| --- | --- | --- | --- |
| R-AIRPORT-3 canonical regions and source boundary | Fixed source/query, finite half-degree identities, wrapped longitude and polar/geometry limits | Independently passed contract/compiler/server/geometry tests: invalid paths/queries/credentials, source ID/time/hash, byte/point/segment/extent limits, dateline and invalid polar cases; implementation constants match declared limits | pass |
| R-AIRPORT-3 source provenance/privacy | Preserve source geometry/width/version/time/hash; strip mapper identity; unknown classes stay missing | Compiler reference assertions preserve input coordinates and provenance and reject unsupported/incomplete source; mapper/user/UID/changeset/private tags absent | pass |
| R-AIRPORT-3 cache persistence and corruption | Hash/schema-validated bounded atomic persistent packages, distinct TTL for valid empty, corruption/failure not empty coverage | Server tests independently pass fresh-instance reuse, SHA/schema corruption, expiry, valid empty versus remark/failure, entry eviction and unavailable disk fallback. Browser fixture observes9 disk responses after process/page restart with no upstream calls | pass |
| R-AIRPORT-3 cancellation must preserve valid persistent data | Last subscriber cancellation aborts work without invalidating a valid disk entry | Quality-found defect repaired: abort now propagates before eviction; independently executed regression waits for active compiler, aborts, verifies unchanged file/index and subsequent disk hit with zero upstream calls | pass |
| R-AIRPORT-3 source queues/deadlines/backoff | One active/eight pending,10s start spacing, deadline, duplicate sharing and failure cooldown | Independently passed serial/duplicate/capacity, scaled spacing, noncooperative timeout/late reply and global throttle cases; defaults inspected. This is a software bound, not public-service throughput validation | pass |
| R-AIRPORT-3 client lifecycle/cache | At most9 desired,32 payloads/64MiB, one fetch; cancel obsolete/Review/flat/disposal, no frame retry loop | Loader/data-worker units independently pass, including distant traversal, caching, abort/disposal, malformed/late replies and metadata bounds; browser script exercises Review and cached backtracking | pass |
| R-AIRPORT-3 visual native isolation and outside-region rendering | Ready bounded terrain-draped surfaces outside Germany, no native controls/time/digest change | Author browser artifact passes real compiler/browser Worker/Cesium/native fixture in California and transport traversal to UK, dedup and fresh cache; initial ready mesh uses387 instances with one deferred feature, no sea-level placeholder. Final actual-browser rerun after PAPI/cache repairs passes with current source pins | pass |
| R-AIRPORT-3 prepared priority, missing heights and redrape | Preserve EDFE/prepared source exclusions; wait for actual receiver; avoid whole-globe/native writes | Independently passed missing-height and allocation tests; renderer source excludes EDFE2km and supplied IDs, clears only its owned collection on revision. Actual Frankfurt prepared-package integration is outside this isolated artifact | pass |
| R-AIRPORT-3 status/limits | Loading/empty/unavailable/partial/deferred with source dates and resource caps | Scene status/text/title/datasets and renderer counters inspected; fixture records truthful `terrain-pending`, source date, bounded resident/instance/desired counts | pass |
| R-AIRPORT-3 live positive OSM coverage | Verify an actual live provider response produces usable real airport data | Reported live Cape Town service probes502/timeouts; fixture is synthetic. No real layout/source accuracy acceptance | not evaluated |
| R-AIRPORT-3 markings and pavement layering | Generic white runway/yellow taxiway paint only for mapped paved layouts; runway above taxiway above apron | Independent marking tests pass paved/unpaved guards, geometry height and budget cases; source offsets12/8/4cm and paint18cm above same sampler; renderer paint colors inspected. No surveyed installed markings claim | pass |
| R-AIRPORT-2 larger-runway practice PAPI | Optional illustrative four-head cues, actual unit/aircraft sightline and height datum, hide unavailable/outside sector | Original threshold-distance error repaired using actual head.location; independent69m/1300m reference yields3.0382327597° and2white lights. Missing heights/behind/offsector tests pass; four-head admission and generic UI labeling inspected. Final actual-browser rerun has8 generic heads and passes; source pins current | pass |
| R-WORLD-11 source CPU separation | Source fetch/decode/composition off physics worker; native admission between steps unchanged | Dedicated source/overview browser Worker and2-thread Copernicus decoder source inspected; independently passed real Node decoder thread/heartbeat/exact Float32 tests. Native callbacks remain only in physics worker | pass |
| R-WORLD-11 exact grids and trajectory | Preserve full9-grid physical/geoid arrays/hash, retained inputs and native trajectory | Independent linked-worker tests pass moves/prefetch/dateline/cancellation/full-batch validation. Author actual-browser harness compares all9 grids plus two native engines'14 fields/digest after120 steps; overview compares16641 nodes/hash, world/raw buffers retained | pass |
| R-WORLD-11 failure/cancellation/source guards | Reject stale/corrupt/crashed worker results; keep required-coverage waits and source history | Independent protocol tests pass old epoch, canceled startup, malformed complete batch before install/removal, crash and fine-only behavior; existing admission/stop controller remains local and required terrain waits remain visible | pass |
| R-VIEW-1 overview camera | Separate view, heading-relative orbit,50m–20000km scroll zoom, no native state changes | Independent camera bounds/orthogonal finite vectors tests pass; author browser selects overview, zooms20000km and returns chase with unchanged paused state/step/digest. Modifier/dialog/menu/FOV guards and look-only source inspected | pass |
| R-VIEW-1 shadow receiver handling | Active terrain/flat receiver cue, opaque pavement receives shadow, readout jitter does not toggle valid cue | Independent shadow units pass active ellipsoid receiver,±0.6m AGL readout jitter and invalid/high/cockpit hiding. Source uses actual rendered CG/receiver and RECEIVE_ONLY airport pavement; author flat-study pixel test sees exact repeat frames/native freeze | pass |
| R-VIEW-1 reported landing flicker on real terrain | Confirm stability on the user's changing/sloped airport receiver during an actual landing | Flat paused pixel fixture and pure jitter cases do not reproduce the reported moving/sloped landing. No exact user flight/location supplied or exercised | not evaluated |
| R-DATA-1 OFM assessment | Identify structured-data route, product/rights/edition constraints without unreviewed import | Research recommends separate aviation overlay, keeps actual edition/license selection open, separates plate/database rights and user-driven error reporting. Independently checked publisher About/FAQ and archived GitHub redirect to GitLab; GitLab format contents unavailable. No OFM data import | pass |

## Findings and limits

The PAPI defect was concrete:1km before threshold, lights300m beyond it,69m above light level produced3.95°/4white using threshold distance, rather than3.04°/2white to the unit. Parent repaired the calculation and the independent reference passes. The quality-found cache-cancellation defect is repaired and independently reproduced by its regression test; final browser/CI results are renewed.

Performance guarantees, actual provider uptime, worldwide geometry completeness, current aeronautical data, obstacle clearance, surveyed PAPI placement/thresholds, sloped landing pixel stability and aircraft/training fidelity are not accepted. Native required-coverage waits remain; a separate Worker is not a promise of zero logical pauses or a frame-time benchmark.

Review identity is this source snapshot plus listed evidence. Further source edits invalidate affected rows and require renewed review. The generated evidence is local output, not shipped source and not independent cross-provider peer acceptance.

## Snapshot fingerprints

Working-tree source manifest SHA-256 `898320d697d11e12564d8a62262bdb7239952ff3dc7929463ca5afc5d11fae7f` (sorted path→SHA256 JSON; changed/new app/studies files only, renewed after trailing-whitespace metadata closure).

```json
{
  "app/copernicus-decode.test.ts": "86c21cb83e1122a1dff171339a4febb6fbc7d543ab87aa504227f36771b0479f",
  "app/copernicus-decode.ts": "3b83c39be0b1afb6d3062b1db864d2af0f997c6b8469437332cbb1b8690ab0aa",
  "app/copernicus-decode.worker.ts": "9474612a9ec6838648bf3224081ad2cbe44b8d2e6309f0f108435a39c89d8032",
  "app/copernicus-terrain-server.ts": "03a2f63f5f1e3248444e6a84da6d04d50b3808efdba00cfee914bbfb49a299cc",
  "app/package.json": "0833783cba47be22dcdf2a271b4a1fe8c91ab4130ed7a6c95fdfb1e48b52d2c8",
  "app/runtime.ts": "427cdd6dbe6dfca3dd70bb9f828bfd5079bb3ec5d3159e426db3cbce44b0bb1a",
  "app/src/aircraft-orientation.ts": "dbf9c9ac3862dd8b5203871aed66f9c78473e3b163ec66484660eaca3b1ba69d",
  "app/src/aircraft-shadow.test.ts": "9ffae355a0fb18132dab2162835aee061c1d54fc93aa46a3445afb3838ef9bcf",
  "app/src/aircraft-shadow.ts": "884f37b36671e2b363e20ef0bd4f04e38d49c8cef0f73c0d0f9b65f8cae88882",
  "app/src/main.ts": "612469b4c18be8580f6547e471814eb994cd343e49f4b31a35a3b27de1d6b0ab",
  "app/src/overview-camera.test.ts": "1f0333afcc7fe2d6ec5c6f4e57a90f1d44853dcf490b05080077def7c2f0690e",
  "app/src/overview-camera.ts": "44dc28d7c1b6fef784aa5c66c1dd86aebf156e99822d87f349608c52b6d62ae3",
  "app/src/scene.ts": "ba8b2368e1cf63d5d3bdf8b72a7917c2e9d0b100627a30d22fc6b0cbfbe5de91",
  "app/src/terrain-overview-source.ts": "c08026f8dd98fa7bf5c5b9e675ffe4677cd9b3cac637d0716b4cf1cbc8925d7a",
  "app/src/terrain-overview-source.worker.ts": "e19601ebb5150ed48241cd06d64321d69ea36ac9bd669cb626bb824c9251d99a",
  "app/src/terrain-overview.ts": "9d560e718cf0da89ad7e727e7eb04f89779569a91df54b2fa00c7a0c4dd019e1",
  "app/src/types.ts": "aeeae5b7f77d815fde5a4e37e586d9603c670af7e89e0cb0342976d325e3cb4c",
  "app/tests/terrain-source-lifecycle.browser.mjs": "6bdd0ba3c39ba012c6359a726e068ba9d1caf0334e0455e52c55f327090b8657",
  "app/tests/view-and-thread.browser.mjs": "b666047a31f09d03c38138f6cb636a7f4ebeea42d5c460d3c37575f1ef672e9d",
  "app/vite.config.ts": "882635d2c8015e70ff0fa078d061f70dcd474a5031722663a92ab131c385cd2c",
  "studies/e1-browser/sim/terrain-source-client.js": "d1c12415f66234c1e8c47c6f92c56d1e16f311c8964d4650c9d19c1527253d85",
  "studies/e1-browser/sim/terrain-source-worker.js": "282d06628daa70a10753661e91f187c38ea6394f5a8f2d2dbacbfeaf9745cf8d",
  "studies/e1-browser/sim/terrain-source.test.mjs": "8be9a1d7698a2a8d3b485dc70c21e4011a8a64a0b49b4d2f256f0e3a94a963a8",
  "studies/e1-browser/sim/worker.js": "bf1fd1afd72903222439d52163a4f1f0e9b523fb6dbb461e315b59239e9bd697"
}
```

Inspected evidence SHA-256:

- `output/flight/airport-generator-browser.json`: `8863ef309430f024e3bd4bef5bc9ff2162f2257268998e49e36ab03c4583b1ee`.
- `output/flight/view-and-thread-browser.json`: `daa1d6440fbe9fe8134c61dda0b717ff29ac923515a7b94f554eacc5c647d268`.
- `output/flight/aircraft-shadow-browser.json`: `549e86a048c644985972fbc9027bf772584fe850717ef55bfedd57439589e868`.
- `/private/tmp/gefly-scenery-validate-final.log`: `ebee45b26a1dd65e8a1f921755200f737cacda30fb47938ea5e52f869902289e`.
- `/private/tmp/gefly-airport-ci-final.log`: `d35e0320887376830ddef67f6109dc66281b84d664355f83141c59e44f2e4334`.

## Additional terrain-source lifecycle evidence — 2026-11-06 09:34

Independently inspected the author/coder's actual `app/tests/terrain-source-lifecycle.browser.mjs` and `output/flight/terrain-source-lifecycle-browser.json`; this validator did not rerun that browser command. HTTP-boundary instrumentation wraps the real production physics/nested source Workers and delays only source composition; it supplies no substitute geography/physics. Native steps progress5→35during253ms source-worker synchronous CPU work at1×. Manual pause remains atstep37 with identical full pose/digest over the1.2-second observation; serialized new-flight init terminates source identity1and creates2atstep0. Corrupt required world bytes produce visible integrity failure and no thirdready publication. These support R-WORLD-11/R-SIM-2 CPU separation, pause intent and serialized reset lifecycle. They do not prove cancellation of a concurrent init before the existing serialized command completes, unlimited no-wait flight or a general frame-time budget. No runtime source changed for this harness.

- `app/tests/terrain-source-lifecycle.browser.mjs` SHA-256 `6bdd0ba3c39ba012c6359a726e068ba9d1caf0334e0455e52c55f327090b8657`.
- `output/flight/terrain-source-lifecycle-browser.json` SHA-256 `fa87f4eb956d2166e7ae172330ccfa4e7ff7f60b530eb0379be7db2f5a520f1f`.

The later feature airport-region-read.ts trim removes trailing blank whitespace only. The author reran the actual airport browser after this trim; all10 pins now match current source and before/after identities are equal, with4groups passing. The source manifest and airport evidence hash below are renewed for this metadata/whitespace-only closure; lifecycle instrumentation adds no runtime change.
