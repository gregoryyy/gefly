# Scenery ROOT integration quality review

Reviewed 2026-11-06 09:32 Europe/Berlin by Codex `scenery_quality`, independently of the feature/integration authors. Scope: proposed `/private/tmp/gefly-airport-root-preview` runtime integration compared against unchanged working ROOT `/Users/gregor/Documents/devel/gefly` and the reviewed feature source `/private/tmp/gefly-airport-generator`. This is a scoped merge-quality check, not whole-ROOT/specification/cross-provider acceptance. Paired runtime manifest SHA-256 `c20c4737b6dff9a217a7cc6d1ce97a656c6da6307ab10d1dcce237e8d21e4b0e`.

## Outcome

No blocking integration-quality finding identified in the reviewed candidate. Preserve the tests/fidelity/source limitations below. Subsequent source changes or a different ROOT preflight hash invalidate affected review.

## Preservation and wiring inspected

- `main.ts` preserves existing local view preferences/map palette, background flight focus/release handling, flight-plan shortcut, saved AP/startup configuration, stall-warning delivery, balanced handling inputs and all prior disposal calls. Its changes add the overview menu/view/zoom and look-only pointer mode; no aircraft gains, coefficients or new native commands are introduced. Overview wheel handling is guarded for menus/dialogs/modifiers and has matching disposal.
- `package.json` adds test registrations/scripts while retaining every existing ROOT script/dependency. `runtime.ts` adds only the two terrain-source modules to its fixed served set, preserving autopilot reload, map starts, stall peaks and initial balance. `types.ts` changes only the view/camera signature.
- The ROOT worker diff is exactly the source-thread integration around the existing terrain initialization/owners. Existing AP reload, map start, balanced initialization, stall fields, native stepping and serialized command queue remain. Candidate worker hash `140d3fbadd41df7df7b37fd41fe7633f18289874f599ac4e0d0a95beec7dbf4b`; the feature worker has a different hash because ROOT's preexisting functionality is retained. No prompt replacement-init cancellation behavior is added.
- `scene.ts` retains static regional-airfield status/metrics, recording/source admission guards, credits container and terrain provider. Optional airport source delivery is enabled only for ordinary public-terrain live context (including paused preparation); Review/flat histories remain excluded. It adds the explicit rendered receiver to shadow gating and the external overview camera without native state changes. The added status element/overview source are disposed.
- `airport-scenery.ts` retains the pinned Frankfurt package/EDFE renderer and their lifecycle. Once that package is valid, its source IDs exclude competing streamed copies; failed static loading does not mark exclusions. Static primitive collections and streamed surfaces receive shadows. Existing regional status/metrics, visibility, update and disposal behavior remain, with streamed work added beside them. Source-ID exclusion is an identity preference, not a promise that every pinned/new source layout is complete or current. Existing prepared regional surfaces are not upgraded to the new generic worldwide marking/PAPI renderer by this merge.
- Source-module comparison found no unexpected differences between candidate and feature outside the integration paths. The candidate retains ROOT-specific `types.ts` fields while extending only the view contract.

## Independently executed checks

- `node --test app/src/view-preferences.test.ts app/src/airport-scenery-data.test.ts app/src/pointer-yoke.test.ts app/src/session.test.ts app/src/flight-location.test.ts app/src/stall-warning-delivery.test.ts studies/e1-browser/sim/autopilot-reload.test.mjs studies/e1-browser/sim/map-start.test.mjs studies/e1-browser/sim/stall-warning-peak.test.mjs` in candidate:152passed,0failed,0skipped. `/private/tmp/gefly-independent-root-integration-tests.log`.
- `./app/node_modules/.bin/tsc --noEmit -p app/tsconfig.json` in candidate: passed, no diagnostics. `/private/tmp/gefly-independent-root-integration-tsc.log`.
- `node app/tests/autopilot-reload.browser.mjs` in candidate: all6actual UI/Worker/native groups pass, including engaged flight reload into pausedstep0, distinct selected/held targets, VS/ARM, OFF/BARO/NAV selections, Review isolation and explicit Restart. `/private/tmp/gefly-independent-root-ap-browser.log`; candidate artifact `output/flight/autopilot-reload-task143-browser.json`. Scenery pixels use fixtures.
- Compared ROOT/candidate byte hashes for session, location storage, view preferences, stall-warning delivery, pointer input, initial-balance helper and local native WASM/build-info: all identical. WASM SHA-256 `c11a93378da778e34168c5b9043e44448855fb6699a640585d224313722d0f42`, build-info `0b5910545b81299abfd0d8e85b35da2a4b0f2d640684d88a15165d7332815bdd`. This proves preservation of these bytes, not a fresh engine build or aircraft fidelity.
- Inspected author candidate710unit-test pass/TSC log, actual airport/cache browser pass and view/terrain-worker equivalence pass. Those supplied executions are not represented as independently rerun by this review. Independently executed feature tests and shadow pixels are recorded separately in [feature quality](2026-11-06-scenery-quality.md).

A separate feature Vite close/recreate probe in one Node process returned404for an intentionally invalid airport-cell URL in both rounds, rather than a disposed-service503. No live source was queried. This provides bounded service-lifecycle evidence; it is not a positive Copernicus decode-after-restart test.

## Limits

The wider dirty ROOT assurance-cardinality gate and unrelated unpublished features are not accepted here. This review covers the listed merge/wiring paths and preservation observations, not every existing feature or real-terrain fidelity. Live Overpass positive source coverage remains blocked by observed502/timeouts; fixture airport geography is synthetic. Required terrain coverage waits/source-history safety guards remain. Generic markings/PAPI are illustrative/optional, not surveyed or installed equipment. The flat shadow pixel test does not establish that the user's exact real-terrain landing is fixed. Browser evidence is Chrome; the user's internal WebKit-based view was not directly tested. No data rights or current OFM edition are selected by this integration.

## Paired runtime source manifest

```json
{
  "app/package.json": {
    "root": "a74f1fb61db58579a77864245f1bd01246c663b20033a8acef50f899f55d575a",
    "candidate": "c146e9419c008edb3e998a8129d5a4239ab4b254f7ca7d58c755b0605d5b29da"
  },
  "app/runtime.ts": {
    "root": "daa93ea2e997069f5d5a163bf711ce99e7119ba5b1458de02d4971f141c7f799",
    "candidate": "3445c47a6b1caface718576339590510190ce80a306b1cdba6c22e7a59f47d19"
  },
  "app/src/main.ts": {
    "root": "b5f26ddd99b079fc2607535b3ee8547aa63387b7063f1a9c911681f67e84434d",
    "candidate": "0c0d129a2721076bfca6a305111f18952bce72fbfebd4aefbad138fde77883a8"
  },
  "app/src/scene.ts": {
    "root": "402039a155d0114c42a0ed9bc0f50a4ecfeb564e544b7df2c62598bb99e00f53",
    "candidate": "32558e9ec73539cf995db6b23fd1d2957e08d3fc7bc28f55b780b0772d7fd89d"
  },
  "app/src/airport-scenery.ts": {
    "root": "a4624a425e22c29263330d86a8a4d199a97790a8d01ab1734bb1ffd851a3d929",
    "candidate": "46a4978f081e42e48c765bd98451547e8a929a10ac39278c18ff3a6937f3c8d2"
  },
  "app/src/control-settings-panel.ts": {
    "root": "617856228db0472ed52a2a727d6dfcf8603d80f1511529b32f10b680bc2eb98e",
    "candidate": "7230d6d52681028671cf3e81c4ad6d78963079501636ac5ed777ffce8d8a22ac"
  },
  "app/src/types.ts": {
    "root": "ffb0aaee7b7751de0139524e83c6c69b65683d7ceb7e4135cc72416573f4a645",
    "candidate": "16232e981a72f7c24c9ad0a67a9dff71874ed9affb8f383f31538debd9360147"
  },
  "studies/e1-browser/sim/worker.js": {
    "root": "1e87c4405bcc588cceb87fb1cf56bcd9a731f7a49cb0549032ad700b25c6b98e",
    "candidate": "140d3fbadd41df7df7b37fd41fe7633f18289874f599ac4e0d0a95beec7dbf4b"
  },
  "app/vite.config.ts": {
    "root": "cffde9dc79eb4f519dc9f1b3b5749e6bf65611f7b0bdddfa270a1e4a075f2749",
    "candidate": "882635d2c8015e70ff0fa078d061f70dcd474a5031722663a92ab131c385cd2c"
  }
}
```
