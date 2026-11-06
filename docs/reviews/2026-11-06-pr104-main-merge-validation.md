# PR104 current-main merge validation

2026-11-06 18:13 Europe/Berlin. Independent validator: Codex
`/root/camera_return_validate`, not an implementer of the preference feature or
merge. Scope is Task2.0.173's saved Options under R-UX-2 and the preference
subset of R-INPUT-1. The earlier
[saved-Options validation](2026-11-06-settings-preferences-validation.md) remains
historical; this report renews only the current merge.

Reviewed frozen publication worktree `/private/tmp/gefly-persistent-options`,
merge `a66e7ebf701f3c9c98efdc990a10770dc57fbb8e`, parents
`d0ce5c8fdaa1cda28ceaf15b387c35845e534d28` (PR104) and
`59b39a847920e017d4b976995ec2a9985145e061` (current main, including PR102).
The user requested conflict reconciliation; no new preference scope is inferred.

**Source-focused recommendation: pass.** No saved-Options source regression was
found in this merge; there is no source-validation blocker to publishing this
merge snapshot. **Current merged runtime and final shared-gate acceptance remain
pending.** Source inspection and pure tests do not replace those execution checks.

| Criterion | Expected | Observed evidence at a66e7eb | Result |
| --- | --- | --- | --- |
| R-UX-2/R-INPUT-1 criterion consistency | Retain the agreed saved-preference scope/defaults without redefining acceptance | Both exact SPEC declaration rows are unchanged from the PR104 parent; GAPS retains the dated saved-Options decision alongside incoming discovery/airport decisions. | pass |
| Merge preserves Save/Cancel/startup hooks | Restore only validated preferences; commit explicit saves; rollback previews; retain trusted audio activation and current flight setup | Diff against incoming main adds the existing startup reads, explicit persistence hooks and Save/Cancel boundary. Diff against PR104 parent changes only one main limitation-text line and one panel PAPI-description line; no preference hook was removed. Current balanced-start/pointer/airport/discovery integrations remain upstream code, not replaced by old main. | pass by source inspection |
| Bounded preference schema and separate display state | Strict1024-byte versioned record, exact fields/ranges; safe malformed/denied storage; no held commands/aircraft/loading/recording data | Helper bytes unchanged; independent15test execution passes exact boundaries, false/zero, unknown/flight fields, malformed/denied storage, getter capture/detachment and separate display records. Core settings stores selected gains/toggles/PAPI/offset/audio only. | pass |
| Current target test registration and source boundaries | Retain both script/test inventories and distinct discovery/generator/preferences pipelines | Merged JSON parses; all named script keys and unit/browser command tokens from both parents retained. Existing settings helper, separate view helper, audio control and harness are unchanged; map/source data are not imported into the preference record. | pass by source inspection |
| Complete shared histories and catalog | Keep whole DONE blocks, immutable inputs/index links and declared evidence from both parents | Independent Git comparisons preserve all182 complete DONE blocks from each parent, raw input blobs and index links, and equal catalog records including the exact generated-style extraction profile. | pass |
| Actual reload/restart/new-page retention | Saved choices survive reload, Restart and same-origin new page | New merged browser execution is running; prior publication browser results bind older main and are not reused as current observations. | blocked pending execution evidence |
| Actual preview/Save/Cancel/quick sound and denied storage | Unsaved changes roll back; valid false/zero survive; denied storage remains usable | Pure/schema and source checks pass; current actual UI/browser observations are pending. | blocked pending execution evidence |
| Actual safe startup | Restoring choices does not resume flight, unlock audio or restore held input | Source retains setters without audio unlock and paused startup; actual merged native/audio assertions pending. | blocked pending execution evidence |
| Final shared gate and assurance/diff | Complete integration checks at the final merged snapshot | Not yet complete at this initial report snapshot. | blocked |
| Broader parent requirements and cross-provider peer | Distinguish this review from aircraft/hardware/device/source fidelity and provider independence | No such acceptance is asserted or executed here. | not evaluated |

## Exact reviewed identity and independent checks

| File | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `355580362298b0a938ba793445f218508ad72607a5f41ceeea02c5f9879039d8` |
| `app/src/control-settings-panel.ts` | `761592d1e849646d9ef46c11de292217a6bc39dce19ad9e7a766971b02b98ac1` |
| `app/src/settings-preferences.ts` | `b5fb5230d909357e3ebc24878946a3dc5823f58007408151deb4bd8c28c63295` |
| `app/src/view-preferences.ts` | `6c8053fa1fee76f5a1c2cb64bbc7555e519cbda42d7cf88142712035cd7a4b9b` |
| `app/src/audio-controls.ts` | `42a5376d36c77658df89ef9204c6078ea104fecacc127d00dcf87d8ae76e7548` |
| `app/tests/settings-preferences.browser.mjs` | `b1548f9815758653fdf616b890e05ba65c6995f868dbf5447f2a1b5309856725` |
| `docs/SPEC.md` | `fb95156a2b60da600d230ea5fd9868c56eec08e8afbed0afed6de1e1033caa10` |

The helper/view/audio/harness identities match their earlier reviewed source;
the current main integration has its own hash above. Executed independently:

```sh
node --test app/src/settings-preferences.test.ts app/src/view-preferences.test.ts
```

Observed15passed,0failed/cancelled/skipped/TODO. Seven cases cover saved Options,
eight cover separate display preferences. Actual localStorage/UI/native behavior
requires the pending merged browser execution. Independent source inspection also
confirms that startup only calls audio mute/volume setters, while unlock remains
behind trusted interaction, and that Save persists explicitly while Cancel
restores the opening snapshot.

Independent Python/Git checks compare complete DONE heading/body blocks, raw input
blob identities and input-index link sets, equal full catalog records, parseable
package JSON and complete whitespace-delimited test/browser-command token sets
from both parents. The three manual conflicts were package scripts, GAPS and
TODO; auto-merged runtime hooks were inspected against both parents rather than
assumed correct from absence of textual conflicts.

This review does not accept a browser/OS restart, cross-origin/device migration,
survival of private-session termination or data deletion, actual PAPI/palette
visual fidelity, camera/loading retention, source/aircraft fidelity or training
credit. Final status and publication remain integration-owned; changed source
requires renewed affected evidence.

## Actual merged browser renewal

2026-11-06 18:14 Europe/Berlin, clock-derived. Reviewer independently inspected
the completed current publication artifact
`output/flight/settings-preferences-browser.json`, SHA-256
`717a98a699b31bd8c1d385116f03f5f0c7060000061821a7ad7eb2cab13eb52a`.
It records nine passing groups on Chromium156.0.8078.80 with zero page errors.
All five runtime/harness hashes were recomputed independently and match the
current a66e7eb files, including main35558036… above. This is a new merged
execution, not the older publication result. The browser worker produced the
artifact; this validator inspected it rather than duplicating the browser run.

| Previously pending behavior | Current observation | Result |
| --- | --- | --- |
| Save/reload, Restart and new same-origin page | Each restores pitch25%, roll150%, rudder25%, brake0%, linked rudder true, centered false, PAPI/vector true, offset0.25, volume0%, muted false. False/zero remain deliberate saved selections. | pass |
| Unsaved preview, Escape and actual outside dismissal | Reload before Save returns defaults. Escape and a real backdrop click restore the opening choices without replacing committed storage. | pass |
| Quick sound persistence | Trusted S and top sound-button actions outside Options commit immediately and survive reload. | pass |
| Malformed/future/oversized/denied storage | Corrupt, wrong-version and oversized records select usable defaults; actual denied storage permits session edits and reloads safely to defaults. | pass |
| Safe restore | Saved reload, Restart and new-page snapshots remain step0/Paused with audio locked. Actual preview gestures may unlock audio after trusted input; this is distinct from automatic startup activation. | pass |

The current source and runtime preference behavior therefore pass their bounded
criteria. **Final shared CI and final assurance/diff remain pending.** No full
application, device/browser matrix, actual PAPI/palette visuals, aircraft or
training acceptance follows from these nine groups.

## Final integrated gate renewal

2026-11-06 18:42 Europe/Berlin, clock-derived. Reviewer independently inspected
completed final execution and parsed the final assurance diff for the unchanged
`a66e7ebf701f3c9c98efdc990a10770dc57fbb8e` snapshot against tested main
`59b39a847920e017d4b976995ec2a9985145e061`. This resolves the preceding final
gate-pending condition; it is not acceptance of any later main revision.

| Remaining criterion | Observed current evidence | Result |
| --- | --- | --- |
| Complete shared CI | `output-pr104-final-ci.log` completes626Node/32Python application tests,89assurance tests and11training tests, integrity and3206tracked-path whitespace, with terminal CI success. | pass for executed checks |
| Current assurance/diff | Integrity44,093nodes/60,947facts,0errors/226warnings/138notes. Parsed diff against59b39a8 has38added/233changed/0removed identities and untruncated impact; execution owner reports exit0. | pass |
| Current source/browser binding | Recomputed all five source/harness pins still match the nine-group browser artifact717a98a6…; no runtime change followed the reviewed merge. | pass |

Final CI SHA-256 is
`5085fbef0713be15bbf42cf22be01f292f5117431a3416bc73c3db6cd79975ab`;
its integrity input hash is
`7f1299f070b89899442c9989a28f0ec6d47e694acdcd7fe1e96089c46322431c`.
The final `output-pr104-final-assure-diff.log` SHA-256 is
`ae90f7681973bb246f5e4b54f0aa0e9ab6d4217bddaeb2327f97c122377a63c6`.
The compact `output/flight/pr104-merged-runtime-summary.json` consistently names
the tested revision/base and these artifact identities; the validator checked
the actual logs/diff/source hashes rather than accepting the summary alone.
Nine optional JSBSim study checks and one platform-tool check remain skips.

The initial `output-pr104-merge-ci.log` failed AS6 with child statusnull and
88of89assurance cases; the first serial suite similarly failed. Those are failed
attempts, not passes. The quiet unchanged original suite then passes89of89, and
the subsequent entire final CI passes. A temporary ignored diagnostic harness
ran the same CLI commands and unchanged15-second deadline successfully; the
earlier exact subprocess error was not captured. A load-related explanation is
inference, not an established root cause. No source/deadline change or relaxed
assertion was used to relabel an earlier failure.

**Final bounded recommendation: pass for the saved-Options merge at a66e7eb and
its tested59b39a8 base.** Source, current nine-group browser, full CI and inspected
diff support the scoped criteria. Final shared-record/report integration and
publication bookkeeping remain integration-owned; all broader limits above,
including later-main and external-provider acceptance, remain explicit.
