# Throttle shortcut quality review

Reviewed 2026-11-05 11:43 Europe/Berlin by Codex quality, independently of the
Codex implementation authors. TODO2.0.134 / R-INPUT-1; scoped working tree on
`700dd5386125f9864a391f85b277cb71da55290a`.

## Outcome and scope

Complete bounded quality review: **no blocking findings**. The frozen source
and focused real-native browser evidence support the remap. Only this assigned
report is changed by the reviewer. Cross-provider peer remains pending;
no separate CLI/model identity or aircraft-fidelity approval is inferred.

The scope is throttle shortcuts and their help text, against
[SPEC](../SPEC.md) and the immutable
[user request](../input/2026-11-05-throttle-shortcuts.md). Earlier physics,
warning delivery and A/P implementation changes in the shared working tree are
outside this review.

## Findings and reasoning

No critical, high, medium or low defect found in the scoped source.

- `app/src/pilot-controls.ts:27` accepts the exact § character independently of
  its reported physical code, including layouts requiring Shift. Otherwise Shift
  is rejected, unshifted Backquote selects idle, and exactly one physical
  Digit/Numpad digit selects 10–90% or 100% for zero. Unknown keys return null;
  output is bounded to 0–1, with no new persistence or network path.
- `app/src/main.ts:1239–1267` preserves the existing map/plan, modal, menu,
  Ctrl/Meta/Alt, Review, editable-target, repeat and controls-available gates
  before changing the lever and publishing input. Paused control staging is
  intentional; native integration is still controlled by the session/worker.
  The separate capture-phase pacing handler consumes Shift+0 producing `=`;
  the helper also rejects shifted digits if that event reaches it.
- The remap sends the existing throttle input, without changing ignition,
  native coefficients, fixed-step scheduling or shaft-power calibration.
  README, cockpit and runway help describe lever presets and distinguish A
  autopilot from P flight plan.

## Checks and evidence limits

Reviewer ran `cd app && node --test src/pilot-controls.test.ts`: **7 passed,
0 skipped**; these include three new mapping groups and existing control/Review
helpers. Reviewer also ran `node --check tests/throttle-shortcuts.browser.mjs`:
pass. Reviewer read the final browser fixture and result; no reviewer browser
execution is claimed. The three updated legacy pitch-trim, warning and pacing
browser fixtures were read for the changed shortcut semantics and independently
syntax-checked; their complete browser matrices were not rerun.

Root-provided logs `output/flight/throttle-task134-unit.log` and
`throttle-task134-build.log` were read: **486 Node + 12 Python tests passed,
0 skipped; TypeScript and production build passed**. These are author/integrator
executions, not independent browser validation or full CI/publication evidence.

Author-run `node tests/throttle-shortcuts.browser.mjs`, process 62245, completed
**exit 0 / four groups**, Chrome 156.0.8078.80. The artifact contains 13 real
worker observations: number-row and numpad zero reach `throttle_norm = 1`, §
with `IntlBackslash` and physical Backquote reach zero, and digits 1–9 reach
0.1–0.9 after resume. The fixture observes/forwards the real Worker without
replacing state; scenery imagery is a fixture. It asserts full native
step/digest/final-state equality during paused staging and guarded events,
including editable controls, menu, modal, modifiers, repeats, map/plan focus
and Review. German Shift+Digit0 `=` changes pacing while preserving throttle
and paused physics. Earlier hidden-plan-control focus failure was a fixture
failure: final test focuses a visible control and asserts actual plan/map
focus before testing guards. It is not a product failure or a counted pass.

Collision/loading/failure guards were source-inspected, with no new scenario
execution in this focused browser run. Repeat and mapping helper coverage is
broader than the browser character-layout fixtures. Guarded-event assertions
are meaningful; diagnostic `prevented` fields alone are not used as acceptance.

Physical Swiss/German keyboard hardware, OS layout translation and other browser
engines are not evaluated. A trusted Chrome Input-dispatched character/code pair
can test application routing without establishing actual hardware compatibility.
Throttle percentage remains a lever command, not guaranteed engine power.

## Frozen source identity

Frozen packet: `output/flight/throttle-task134-packet.json`, SHA-256
`2f79f3e4dd19f4f3532862fbf8460b78f18686b7a727c5ef2b540504ce6a478f`.
Reviewer independently audited the packet hash and **all 18 source/result pins**
against current bytes. It includes the browser fixture/result/log, full unit/build
logs and adapted legacy fixtures. Selected core identities follow; no claim is
made that every earlier working-tree change is covered by this review.

| Path | SHA-256 |
| --- | --- |
| `app/src/pilot-controls.ts` | `b74b7cffd7f3f22c311e2fc4a1f207d2b0929700047d045502c5997a28514338` |
| `app/src/pilot-controls.test.ts` | `fcd26eb588b6f448a5ab17c9e65d37a25c4fa8fbb79bf1dd11d5899913ee83ce` |
| `app/src/main.ts` | `f624f7c8d65e0b76ba996b041d1c4ffa1c5e934011bdbcee43af1e7f9aca7811` |
| `docs/SPEC.md` | `faa27e3d3156390e16ab93d5b0c25a4a5fa59c5fbf816d3e3027198dd04038e3` |
| `docs/input/2026-11-05-throttle-shortcuts.md` | `a3eaabb3aa40ec3b08d3c685f7f6442ca9e41d3a42a9a5bb06f265ea77127cd7` |
