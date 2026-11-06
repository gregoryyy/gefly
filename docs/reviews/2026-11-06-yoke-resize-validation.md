# Centered yoke resize pickup validation

Independent Codex `cws_validate`; recorded 2026-11-06 07:15 Europe/Berlin. Scope:
R-INPUT-1's added centered-layout pickup criterion, working-tree diff against
`6563c5936f6c74dc3f34d04b5000c6d7a8328b85` in
`/private/tmp/gefly-yoke-handoff`. I authored no implementation, fixture or
criterion; this report and ignored execution artifacts are my only writes.

**Recommendation: pass the bounded pointer-resize behavior at the pinned source.**
This resolves the tested viewport/layout handoff without accepting all controls,
real VS Code browser/trackpad behavior, aircraft stability or training fidelity.
The broader Task2.0.153 remains open. Final shared/publication gates are separate
from these independently executed behavioral checks.

## Snapshot and independent execution

| Path | SHA-256 |
| --- | --- |
| `app/src/pointer-yoke.ts` | `08082bce04e20ce0f7c24959884a70f37f2e8ebc29739ab4136657bcb03e5b35` |
| `app/src/pointer-yoke.test.ts` | `49b6f6a4d8cdb39e59a6a80e82bc422a5c18ffead9d0f36b6702ab6a4ea7c1bc` |
| `app/src/main.ts` | `196bf52f82bb2a48e30b9b70c900d085ad01ccbe9ec5570aea06e2eeeb2122b4` |
| `app/src/style.css` | `2c3fc2ef68b0701529c0919b7cbe597bf580a8581345947b88cdc45d282a6462` |
| `app/tests/yoke-resize.browser.mjs` | `725ea1b7bbfa3ac1c170705ab9d439d56c238b0fb157e9acc1adf9c5780d3292` |
| `docs/SPEC.md` | `098f4a8f019fa2b176700a044536bdc44ae95e8e83e0a3224030e3907bd5b7b2` |

Read AGENTS/validate, relevant SPEC/TODO/EVAL, SDLC/STYLE/SEC and the user handling
report. The explicit criterion requires neutral pointer axes after an active
centered midpoint moves, a live midpoint marker and center-to-steer hint, neutral
pickup inside the marker, retained independent keyboard commands and unchanged
relative/look/cancel semantics. The existing14px marker diameter supplies the
7 CSS-pixel pickup radius; this is a UI handoff threshold, not an aircraft dead
zone or changed sensitivity.

I independently ran:

- `node --test app/src/pointer-yoke.test.ts`:22 passed, zero skipped.
- From `app`, `npm run check && node tests/yoke-resize.browser.mjs`: TypeScript
  passed and all3 actual-browser groups passed in Chrome156.0.8078.80.

Author's original passing browser artifact was preserved before my rerun as
`output/flight/yoke-resize-browser-author.json`, SHA-256
`c67e32bec94764a451a10b636e1ae414decebbb7be689cb6dafc9f8efa752bad`.
My independently executed `output/flight/yoke-resize-browser.json` has SHA-256
`f514c5f18f360810a27d37f000f2b03b89ff2a931dd4d59d0b56ffb8c0a536c9`.
Both executions overlap the same3 groups and are not6 unique cases. My run
reports no page errors and all6 observed source hashes match before/after.

The fixture observes the real app's outgoing Worker inputs and actual native
command telemetry. Its read-only module observation snapshots controls after
`session.input`; it does not inject controls or replace native state. Scenery
pixels are synthetic. Actual WASM SHA-256 is
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`;
that identifies this execution, not validated build provenance or C172 fidelity.

## Criterion matrix

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| No resize steering jump | Actual1440→1100 browser viewport resize while yoke active, then1px motion near former center: Worker input and native aileron/elevator/rudder remain0. Unit also starts from nonzero pointer axes and observes immediate0 on midpoint movement. | pass |
| No frame-order gap | Unit moves scene bounds then sends pointer motion before another frame; helper detects new reference and remains neutral. Main also calls updateReference before each frame’s marker query. | pass for unit/source ordering |
| Marker tracks live center | Actual browser queries the resized scene and marker bounds; marker center agrees within1px. Unit getCenter matches the new midpoint exactly. | pass |
| Discoverable pickup state | Actual marker gains needs-center class and visible pointer hint says move to center ring; CSS preserves noninteractive marker and raises opacity. | pass |
| Pickup event is neutral | Actual movement to new center clears pickup class while native command remains0; unit explicitly checks pickup emits no nonzero yoke. | pass |
| Pickup radius matches marker | Source admits Euclidean distance≤7 CSS pixels, matching existing14px diameter. Tests exercise interior pickup and far-outside rejection. Exact7/just-outside7 boundary is source-inspected, not a separate browser case. | pass by source and covered behavior |
| Normal steering gain returns | Actual+15px after pickup sends+0.05 applied aileron, same as pre-resize response, with zero rudder; unit raw15px maps+0.1 per existing150px travel. | pass |
| Independent keyboard commands survive | Actual held right arrow remains+0.45 through resize; after keyup native command is0 while pickup remains pending. No lost key state or stuck command is observed. | pass |
| Relative mode unchanged | Existing and new helper cases preserve relative anchor/mapping through changed scene bounds and return+0.1 raw for15px movement. | pass at helper level; full relative app browser not rerun |
| Look/release/exit/Review/cancel preserved |22 helper groups cover hold-drag accumulation, neutral release, authoritative reentry, interruption, temporary neutralization, explicit reset/Escape, double-click and read-only Review. Actual app baseline group checks center/exit and key release. | pass for helper and measured app paths |
| Repeated active layout changes | Source updates remembered midpoint, neutralizes on every change, and retains pickup until marker reentry. Unit covers resize and reposition; browser covers one width change. | pass for covered cases; arbitrary animated layout schedules not evaluated |
| Dynamics/sensitivity boundary | Diff adds pointer-reference tracking, UI hint/class and helper tests only; no engine/model coefficient, gain, travel scale, rudder mix, timestep or AP algorithm changes. | pass by scoped diff inspection |
| Shared CI/publication | First restricted CI failed3 runtime binds; the permitted later execution renewal passes542Node+22Python,85assurance/11training and tracked whitespace with declared optional/platform skips. | pass for permitted local renewal with skips; final publication separate |
| Real VS Code/physical trackpad/device matrix | Playwright pointer/viewport tests in Chrome do not establish the actual embedded browser or physical touchpad interaction. | not evaluated |
| Aircraft handling, complete Task153, training/peer/release | Neutral command handoff does not validate native zero-command drift, failed110kt trim, real C172 response or other-provider approval. | not evaluated / peer pending |

## Integration and remaining limits

The control helper clears remembered centered reference/pickup on explicit cancel
and bypasses tracking in relative/look-only/off/disposed contexts. Pointer motion
checks reference before mapping, while main’s frame path updates marker and hint.
Only pointer axes are neutralized by layout movement; existing key composition
remains separate. Invalid/empty bounds fail neutral by source inspection; this
particular malformed geometry is not a real-browser acceptance case.

The independently executed test establishes CSS viewport coordinate behavior on
this Chromium build, not physical trackpad contact coordinates or the user’s
embedded editor browser. It does not tune handling, demonstrate hands-off wings
level flight or erase the remaining model/build/fidelity limits. Source changes
after these hashes require affected renewal, and documentation/publication gates
must be reported separately.

## Terminal CI observation

The initially pending `/private/tmp/gefly-yoke-ci.log` terminated **FAILED / exit1**,
SHA-256 `81328148df7111db7ba06be66f8e5c8fde16b369da554ac838e4256912f0bfb4`.
Application tests discover542, with539 passed/3 failed/0 skipped. Each failing
runtime test (`app/tests/runtime.test.ts:65`,`:78`,`:99`) fails to listen on
127.0.0.1 with EPERM under the restricted run. This is a reproduced environment
binding failure, not evidence that the resize behavior failed. The remaining
Python application chain is not counted passed after the Node failure.85assurance
tests,11training tests and tracked whitespace2099 paths pass. Optional JSBSim9of23
and the platform-dependent repository-tool skip remain separate skipped cases.

I reported the exact bind failure to the orchestrator for a permitted full gate
rerun. My independently run real-browser check did have local execution permission
and passed. That focused success does not turn the failed shared gate into a pass.
Final publication/milestone acceptance remains blocked until its required checks
are renewed; any later result must be recorded as a new execution.

## Permitted CI renewal

The later author-run permitted full CI execution terminates **passed with skipped
checks**, `/private/tmp/gefly-yoke-ci-authorized.log`, SHA-256 `1eae1c0b85ce5d088f2ff68372d03494b3a367283adba5d445003cc61a33d4c2`.
I inspected its terminal result and phase counts:542 Node application tests pass,
22 Python application tests pass,85 assurance and11training tests pass, tracked
whitespace2099 paths passes. The optional JSBSim9of23 and platform-dependent
repository skip are not passes. This new execution resolves the restricted-bind
CI blocker for the same application source; it does not erase or retroactively
pass the original EPERM execution. Hosted CI/final committed publication records
remain outside this report’s observed evidence.
