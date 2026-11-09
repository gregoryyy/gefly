# Autopilot reload quality review

Reviewed 2026-11-05 14:57 Europe/Berlin by Codex quality, independently of the
Codex implementation authors. TODO2.0.143 / R-AP-3, scoped working tree based on
`700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded quality review: no blocking findings.** Only this assigned report is written. Cross-provider
peer remains pending. This is separate from specification validation.

The [user request](../input/2026-11-05-autopilot-reload.md) concerns AP configuration
across page reload. The implementation deliberately reconstructs a paused launch
and controller configuration; it does not claim a native dynamics checkpoint.

## Source observations

`sim/autopilot-reload.js` requires exact canonical version/KAP/NAV keys, finite
numbers and existing enum/range validation. Faulted or absent AP telemetry is
omitted rather than replaced by an earlier AP selection. Copy/capture detach and
freeze both nested groups; only supported legacy CWS/GS-reference omissions get
defaults, and GS capture without its reference is rejected. Held CWS normalizes to
released without mutating the live frame.

`flight-location.ts` writes pose and AP in one bounded JSON record. Six-field
legacy records remain supported; malformed optional AP data salvages only a valid
base position, while oversized/unknown top-level or invalid position data fails
softly. Both character and UTF-8 byte bounds apply before parsing. Live frames,
including same-step paused acknowledgements, replace pending data; Review is
excluded. Throttling, pagehide flush and clear/collision handling remain bounded.
Storage exceptions do not stop flight or initiate a new network/account flow.

Session reset validates the full location before replacing the existing worker;
the AP payload is copied, omitted from Review continuation and cleared by normal
reset/new-flight context. Worker validation precedes loading, rejects conflicting
resume/preset/map/NAV initializers, installs NAV tuning before sensor/controller
construction and restores KAP modes/targets before Ready/first state. Existing
source-loss behavior runs on resumed stepping; stored NAV/GS validity never
substitutes for live sensors. Native controller integration and transient timers
are reconstructed rather than restored.

Main restores visible NAV tuning before publishing initial UI controls, avoiding
A capture. Its awaiting-first-state guard suppresses the separate study aileron
offset for a saved engaged AP; normal manual authority remains. Acknowledged
worker data wins over UI snapshot fields when constructing saved live frames.
The runtime allowlist includes the new helper and its existing relative imports.
No native binary/model/controller-law change was reviewed as part of this task.

## Checks

Reviewer ran `node --test studies/e1-browser/sim/autopilot-reload.test.mjs
app/src/flight-location.test.ts`: **14 passed, zero skipped**; and
`node --test app/src/session.test.ts`: **70 passed, zero skipped**. These cover
canonical copies/ranges, legacy/corrupt/oversized storage, atomic paused saves,
Review/collision exclusions, detached worker envelopes and reset/continuation
isolation. Mock session checks do not establish actual native initialization or
fresh-page UI behavior.

Author's renewed final browser run79178 completed **exit 0 / six groups**, Chrome
156.0.8078.80. Reviewer read the fixture and resulting JSON. Trusted UI changes
survive real page reloads: HDG/ALT with distinct selected and held altitude,
VS/ARM, OFF target retention, BARO units/setting and both active NAV channels/OBS.
First and settled worker frames retain the settings at step/time zero without Run;
visible AP/NAV controls agree. The added direct reload starts while the actual
app says Flying with engaged HDG/ALT after native step38/time0.3166667, then
returns Paused at first/settled step/time zero with engagement, modes and distinct
bug/selected/held targets unchanged, without Run or A recapture. Moving-state
comparison correctly checks stable selections: the worker may acknowledge further
steps before pagehide, so the probe does not claim the sampled pre-navigation
pose is the final saved moving pose. Earlier Review selections do not overwrite live
state, and Restart removes the envelope. Scenery transport uses fixture pixels;
AP/dynamics and persistence use the real application/worker. Derived indicated
altitude, NAV/GS validity/kind and elevator output are correctly excluded from
settings equality rather than mistaken for saved authority.

Author's `node studies/e1-browser/sim/autopilot-reload-worker.mjs` completed
**exit 0 / seven actual native-worker cases and ten pre-asset-I/O rejections**.
Reviewer inspected the script, log and JSON. Cases include acknowledged HDG/ALT,
VS/ARM, OFF, held-CWS release, parked ground settings and a real historical IFCW
APR/GS source. Fresh worker frames restore the mode/target selections before
stepping and remain exactly paused. Moving that APR/GS snapshot to New York
produces fresh invalid NAV/GS flags; after one native step existing source-loss
logic returns ROL/VS with the appropriate alerts. This deliberately checks
reconstruction behavior, not continuing the prior servo trajectory.

The final integrated packet's **43 source/evidence hashes** and renewed browser
freeze were independently audited. Production sources are unchanged from the
prior review; the SPEC now explicitly includes running-flight reload coverage.
The original five-group success remains preserved under `before-running-*` paths.
Two intervening fixture failures sampled before the final selector acknowledgement
or typed before the visible BARO unit changed to HPA. The final fixture waits for
the requested final target and visible HPA plus its acknowledgement; these waits
retain the assertions and do not repair or conceal a production change. Reviewer
inspected the amended fixture and final six-group JSON. Root's current logs report
**535 Node + 22 Python tests passed, zero skips**, and production build passed.
Core hashes in the native evidence match the reviewed source. No reviewer browser
or new tests were authored. No physical keyboard/device matrix ran. Servo integrals, transient timers,
aircraft controls,
attitude and speed are not a checkpoint. Normal launch speed remains 90 kt TAS.
No full CI, aircraft/servo fidelity or physical hardware acceptance is inferred.
Actual native bytes are `11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`;
the build record still names
`4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
Executable build provenance remains unverified, separately from observed behavior.

## Frozen identity

| Path | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/autopilot-reload.js` | `3d6fa5a15c01f7e2e67361661b5ccfaf189f621cc128e12ccdfd288efde9b17c` |
| `studies/e1-browser/sim/worker.js` | `5903e73f51c901077fec8292aca0b7bc5f15423f14420557193e6db2564397d0` |
| `app/src/main.ts` | `492ace6dd6c4c867af276b88a23afdebe6092933c0c6d3859c9c39fc683dec50` |
| `app/src/session.ts` | `1fd2367a22aa9bdb6b253b7624f627eb7b31d3b3c41d40b663b66d4f943508d5` |
| `app/src/flight-location.ts` | `a4be33ba607dc11b80c5361d567e87f8206b409b4949b6791aec79d3f2d7895e` |
| `app/runtime.ts` | `5c3b812bddd7062119dbefbc69603ce8b3bc57b1e14561330c8b5d48e6d785da` |
| `docs/SPEC.md` | `98d8d3eb66a4fbb29320494a550783a5ae784a85228747c0c1fea966d46bc39d` |
| `docs/input/2026-11-05-autopilot-reload.md` | `e8d9c801f411dc41103535cdb0a293206587a36c0a07466f6c5c7e9371dfe835` |
| `output/flight/autopilot-reload-task143-freeze.json` | `2f863eb6d157285262f034764931e8e2cfd3e5017b12a835962bc51349063bdc` |
| `studies/e1-browser/sim/autopilot-reload-worker.mjs` | `77117248652cba2d8b2ccdbd7942195d56430e2bbe9aaef2814e405187e1551f` |
| `output/flight/autopilot-reload-native-task143.json` | `a98c5fddd28758c6e70418b07f1e400339685331b632f06c1e51633fa68fe757` |
| `app/tests/autopilot-reload.browser.mjs` | `05e5c19f09d57e481f660c7c1d9eabe3c50e300f651c7767fa582c6ea2035f1a` |
| `output/flight/autopilot-reload-task143-browser.json` | `316e447705cbf7a5245df572d79f55e3732f50ab1505f1dedbc032b2f20eae4b` |
| `output/flight/autopilot-reload-task143-integrated-packet.json` | `1bd750157bf061e713aaa5fdda4a4cbed90871c4c34ad94f5ad0c978e823bb16` |
