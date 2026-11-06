# Saved Options: independent specification validation

Recorded 2026-11-06 13:45; renewed 13:48 Europe/Berlin by Codex
`/root/settings_validate`. Task2.0.173; R-UX-2 and the preference subset of
R-INPUT-1. This reviewer did not implement the feature or its tests and edits
only this validation report. Quality review is recorded
[separately](2026-11-06-settings-preferences-quality.md).

**Recommendation:** accept the scoped saved-Options behavior in both the root
application and the publication port, on their separate completed evidence.
The orchestrator repaired
the conflicting R-INPUT-1 retention wording; this reviewer checked the repair
against the existing saved-preference criterion without changing that criterion.

## Frozen scope and evidence

The user [request](../input/2026-11-06-flaps-settings.md) is interpreted in the
[settings scope note](../research/2026-11-06-settings-preferences.md). This
review covers saved Options and its existing separate display-preference record,
not all other behavior declared under the broad R-INPUT-1/R-UX-2 requirements.
Aircraft loading/controls, transient camera gestures, hardware calibration,
aircraft fidelity, terrain/source fidelity and training acceptance are outside
this increment.

The root is a dirty working application based on commit700dd53, not a clean
publication revision. Its task-specific main delta is compared with
`output/flap-settings-before/app/src/main.ts`; unrelated root changes are excluded.
The publication worktree is `/private/tmp/gefly-persistent-options`, based on
`6563c5936f6c74dc3f34d04b5000c6d7a8328b85`. Runtime source identity is explicit:

| Artifact | Root SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `app/src/main.ts` | `9f3bf028bd1e477adf41f4a3451b2c305d548314c4ffc64bae30aa2c880d06b4` | `3529bca9afcb980d0f216a3ce29a8761221044ea6e3e88ff741fdd423f683562` |
| `app/src/settings-preferences.ts` | `b5fb5230d909357e3ebc24878946a3dc5823f58007408151deb4bd8c28c63295` | Same |
| `app/src/control-settings-panel.ts` | `761592d1e849646d9ef46c11de292217a6bc39dce19ad9e7a766971b02b98ac1` | `52047e6bb7c8d118dedf49bd208169f82cddda30277f569408527c341793c84b` |
| `app/src/audio-controls.ts` | `42a5376d36c77658df89ef9204c6078ea104fecacc127d00dcf87d8ae76e7548` | Same |
| `app/src/view-preferences.ts` | `6c8053fa1fee76f5a1c2cb64bbc7555e519cbda42d7cf88142712035cd7a4b9b` | Same |
| `app/tests/settings-preferences.browser.mjs` | `b1548f9815758653fdf616b890e05ba65c6995f868dbf5447f2a1b5309856725` | Same |

The root SPEC snapshot initially inspected has SHA-256
`1836e2fe6c54bacaeaf9c0c96874380cd1e56b32b24fc0fe38e2ed4813fe071e`;
the publication SPEC snapshot has
`4d15ec22a4a716685c0a8d0d33c8688ce7f6d23ecb97dd64e2f83e20f390766e`.
Both contained the new R-UX-2 saved-Options criterion. The initial R-INPUT-1
consistency finding was sent to the orchestrator, which repaired its old
session-only clauses. Renewed inspection confirms saved brake gain with default
25%, linked rudder initially off unless saved, and centered mode initially on
unless saved. The renewed root SPEC SHA-256 is
`12627e9a6107b19c3473c6efa629c00a5b3be2a81f429aa21c285a8e44a540fe`;
publication SPEC SHA-256 is
`953aa8a079c56c85c10da2329c9ad0e9a9fe2a7ff3ab1f9cfa1d2148dccfdb27`.
Runtime source files and their evidence hashes are unchanged by this repair.

Evidence inspected, rather than accepted from test names or summaries:

- Completed root Chrome156.0.8078.80 report
  `output/flight/settings-preferences-browser.json`, SHA-256
  `a05f221af4e28c2aef6cb0cb057f5776b8e31f95ba7c3c6ccdcad482918aaf2e`:
  nine completed groups, all pass, no page errors, tested source hashes matching
  the current root runtime/harness files. Its harness uses the real app and
  native Worker, forwarding messages unchanged; scenery pixels/vector responses
  are fixtures. It checks actual stored objects and reloaded form/audio state.
- Completed root view report `output/flight/view-preferences-browser.json`,
  SHA-256 `cb5e833a099d7b9c23e7d8dc4ad5146ca8b5f838407f35108c120edde336ab3d`:
  four pass groups, with observed Cesium scene mode/label level and native
  statistics checks. This older harness does not include source hashes in its
  artifact; current harness/main inspection supplies supplementary context,
  not a claim of equivalent pinning.
- Completed publication Chrome156.0.8078.80 report
  `output/flight/settings-preferences-browser.json` in the publication worktree,
  SHA-256 `72b233b670ba670e0ea0489126331b0ee079b2f83ca8b36ecbc2ab5ba310e609`:
  the same nine groups pass, no page errors. This reviewer recomputed all five
  runtime/harness hashes against that worktree and confirmed they match its
  report, including its distinct main/panel files. Its actual observations retain
  the same zero/false choices and paused/locked reload as root.
- Independently executed `node --test app/src/settings-preferences.test.ts
  app/src/view-preferences.test.ts`:15 cases pass, zero failures/skips. Seven are
  new Options cases and eight are existing display-preference cases. Reviewed
  assertions cover exact boundaries, stored schema, hostile getters, corrupted
  reads, denied/quota writes and detached snapshots.
- Root startup/save/cancel/reset paths, panel rollback handling, audio setters
  and the publication Git diff were inspected. Audio setters do not create or
  resume AudioContext; only the existing unlock path does.

## Criterion matrix

`Pass` in the root column is bounded to this increment, not full acceptance of
every clause in the parent requirement. A publication source match is not a
substitute for exercising its different main file.

| Requirement / criterion | Expected | Observed root evidence | Root | Publication |
| --- | --- | --- | --- | --- |
| R-UX-2 / durable saved Options | Gains, brake, control toggles, PAPI, roll offset, mute and volume restore after Save/reload | Saved reload observes pitch25%, roll150%, rudder25%, brake0%, link true, centered false, PAPI true, offset0.25, volume0%, muted false; stored object matches the exact expected schema | Pass | Pass: separate nine-group port run |
| R-UX-2 / Restart and new page | Committed choices remain after Flight restart and another same-origin page | Actual reset action and fresh tab both reproduce the saved choices and unchanged committed record | Pass | Pass: separate nine-group port run |
| R-UX-2 / unsaved preview | Reload discards preview; Escape restores opening values without saving | Reload-before-Save observes defaults; Escape restores all selected control/scenery/Advanced/audio values and leaves storage equal to the committed object | Pass | Pass: separate nine-group port run |
| R-UX-2 / outside dismissal | Actual outside click restores opening values without saving | Click at viewport1,1 closes the dialog; reopening shows the committed choices and unchanged stored object | Pass | Pass: separate nine-group port run |
| R-UX-2 / quick sound | Explicit sound actions outside Options commit immediately | Trusted S toggles saved mute true, reload restores it; top sound button commits false and another reload restores it | Pass | Pass: separate nine-group port run |
| R-UX-2 / false and zero | False/zero are valid selections, not absence | Browser retains brake0, volume0, centered false and mute false; unit round trips include boundaries and both boolean states | Pass | Pass: shared helper and separate port run |
| R-UX-2 / bounded untrusted storage | Exact version/type/range/field schema; corrupt, unsupported, oversized or denied storage stays usable | Browser malformed/future/1025-byte records select defaults; actual localStorage SecurityError permits session edits and usable reload. Independent units reject extra flight fields, nonfinite/coercible values and failed writes without replacing prior storage | Pass | Pass: helper plus actual denied/corrupt port run |
| R-UX-2 / no startup flight/audio activation | Restore does not run native flight or unlock audio | Reload reports step0/Paused; harness asserts no native run message and audio data-unlocked false. Source setters do not allocate/resume context | Pass | Pass: separate nine-group port run |
| R-UX-2 / separate display record | Terrain, labels and palette remain outside the Options schema | Unit schemas separate fields; actual root view checks restore imagery/vector and label levels through reload, preserve AP acknowledgement, and freeze native stats while display changes. Palette storage round trips are unit-tested; palette rendering after reload is not newly exercised here | Pass for storage/terrain/labels; palette render not evaluated | Pass for stored/vector preference; actual scene/label/palette render not newly evaluated |
| R-INPUT-1 / controls are preferences, not held inputs | Saved gains/toggles must not import transient commands or alter physics coefficients | Exact record rejects throttle, axes, flap, trim, engine, location, AP and recording fields; reviewed startup keeps held sets/axes separate, and only the explicitly selected experimental roll-offset preference restores its existing command path | Pass | Pass: source/helper and separate port run |
| R-INPUT-1 / default consistency | Brake25%, linked rudder off and centered mode on unless explicitly saved otherwise | Empty/corrupt/denied storage observes these defaults; valid stored false/zero overrides survive | Pass at implementation | Pass: source/helper and separate port run |
| R-INPUT-1 / authoritative retention wording | Existing requirement clauses agree with saved-preference behavior | Renewed SPEC inspection confirms saved brake/link/centered preferences with the same absent-choice defaults as the implementation | Pass after documentation repair | Pass after documentation repair |
| Broader R-INPUT-1/R-UX-2 | Hardware/browser matrix, mappings, calibration, all overlays and unrelated guards | Not included in the task-specific persistence evidence | Not evaluated | Not evaluated |
| Aircraft/source fidelity and camera/loading retention | Separate requirements and task scopes | Not changed or validated by saved Options | Not evaluated | Not evaluated |

## Integration evidence and limits

The publication worktree initially had a zero-group sandbox `listen EPERM`
failure on127.0.0.1:5379. It was not accepted as a pass. The completed later
nine-group run above supplies current publication runtime evidence; this reviewer
inspected the actual output and pins rather than inheriting the root result.
The earlier root browser navigation timeout was also superseded by a completed
pinned run, not reclassified as successful.

Publication `just ci` completed successfully, with555 Node application cases,
22 application Python cases (6+6+10),85 assurance cases and11 training cases.
The offline tools ran243 cases with one reported skip; the optional JSBSim study
ran23 cases with nine skips, which remain skips. The reviewer inspected
`output-settings-ci.log`, SHA-256
`350f2994159de38286aa8d60ad10e90eab9dc76e495226acc2b21c38030421ae`,
including its final Foundation CI passed-with-skips result. This is observed
orchestrator-run evidence, not an independently repeated full CI invocation.
Final review/status documentation and final assurance/diff checks remain the
integration owner's responsibility.

The broader root full-application attempt is not a pass: concurrent airport
worker/deadline cases failed. The isolated airport server recheck subsequently
passes13/13 cases in `output/flap-settings-airport-recheck.log`; it does not turn
the failed broad attempt into a successful run. Those unrelated scenarios are
not accepted by this settings report.

Whole-root CI/assurance, hosted CI, cross-provider peer, other browsers/devices,
browser-process/OS restart and actual visual PAPI/palette rendering are not newly
evaluated. Actual reload and a new same-origin page plus the use of persistent
localStorage establish the scoped retention mechanism; they are not a claim
that site data survives browser data deletion, private-session termination or a
different origin/device. Publication main did not previously expose the root's
palette UI; the port retains palette metadata in its shared helper without
claiming a new palette rendering control. Aircraft fidelity, camera/loading
retention and the full parent input/overlay requirements remain outside scope.
