# Background-flight validation

Reviewed 2026-11-05 02:01 Europe/Berlin by independent Codex `validate`.
Scope: TODO 2.0.126, the background-lifecycle slice of R-SIM-2/R-INPUT-1,
following the [user request](../input/2026-11-05-background-flight.md).
The validator authored neither implementation nor acceptance fixtures.
Working-tree base: `700dd5386125f9864a391f85b277cb71da55290a`.

Recommendation: **pass for the bounded local increment at the recorded hashes**.
The earlier blocked draft is superseded by the independent successful hidden-tab
run. Cross-provider peer remains pending. This does not accept the separately
evolving right-click map increment, aircraft fidelity or training credit.

## Executed and inspected evidence

The validator independently ran from `app/`:

- `node --test src/session.test.ts ../studies/e1-browser/sim/simulation-rate.test.mjs`: **39 pass, zero skipped**, including immediate input flush, coalescing, ready/run ordering, explicit pause during loading, continuation, collision/fault stops and fixed-step rate arithmetic.
- `node tests/background-flight.browser.mjs`: **exit 0, all six groups pass**, Chrome 156.0.8078.80, Node v26.13.0 on macOS 26.2 (25C56). The final JSON is this independent run; the existing browser log records the implementation agent's preceding successful run of the identical fixture.

The integration owner executed **442 Node + 12 Python** cases, UI build,
classic-control, audio and standard smoke regressions at the background-flight
freeze. The validator inspected their passing logs. These integration results
are distinct from the independently executed checks. The final integrated
445-case suite and renewed background runtime result are recorded below.

The browser check uses actual local JSBSim WASM; only scenery pixels are fixtures.
A fresh isolated Chrome profile, `--headless=new` and
`connectOverCDP({ noDefaults: true })` avoid Playwright's forced focus/visibility.
Both pages must share one browser window. Activating the second tab produces
trusted hidden/visible and blur events with native document visibility; no
`document.hidden` override or background-throttling-disabling flag is used.
This is actual headless Chrome lifecycle behavior, not an independently
successful final headful/OS-window-minimization test.

Observed native build: JSBSim v1.3.3 at
`66f7fafc07fe13e7ede9db20873030fed2881713`; WASM SHA-256
`4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.

| Independent observation | Native steps / time | Result |
| --- | --- | --- |
| AP flight while actually hidden | 54 → 312; .450000 → 2.600000 s | Progress at dt = 1/120 s; AP engagement/modes/heading bug/held altitude unchanged |
| Held-input release sequence | 394 → 516; 3.283333333 → 4.300000 s | Neutral manual elevator/rudder/override sent; no pause; latched commands unchanged |
| Explicit Pause, hidden and foreground return | 593 / 4.941666667 s throughout | Identical digest `db2020273d58747d` and complete native final state |
| Review, hidden and foreground return | 593 / 4.941666667 s throughout | Same digest/native state; exiting Review entered from Pause remains paused |
| Pending Restart readiness while hidden | Replacement worker 74 → 113; .616666667 → .941666667 s | Real native module response deferred until hidden; run command sent while hidden |
| Pending Continue live acknowledgement while hidden | Replacement worker 214 → 247; 1.783333333 → 2.058333333 s | Actual acknowledgement and continued progress while hidden |

Latched commands in the AP case are throttle .7, flaps 1/3, manual mixture .9,
trim .182, engine on and parking brake 1. Backgrounding preserves them. The study
roll-correction offset remains distinct from transient manual axes. The hidden AP
case records 1 dropped wall-clock step: this supports the documented slowdown
limit rather than guaranteed real-time pacing. Each progress comparison checks
delta time against delta steps / 120 within 1e-8 s; no enlarged integration step
is used. Deferred readiness checks tag replacement workers separately, so stale
old-worker telemetry cannot establish success.

## Final integrated renewal

After the shared main module and SPEC gained the GPS presentation increment,
the validator inspected the changed null-state/live gauge calls and independently
reran the same six-group background browser fixture on the final integrated tree:
**exit 0, all six groups pass**. The observation table above now records this
renewed run. Current main/SPEC/document hashes below replace the earlier freeze;
the preceding independent artifact is preserved separately as historical evidence.
The lifecycle handlers, pending-start guards, session flush and worker pacing
remain unchanged. The integration owner also completed final 445 Node + 12 Python
cases with zero skips and the final build; this does not imply new fidelity scope.

## Criterion matrix

| Criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Running flight while hidden/unfocused | No application pause; native step/time progresses in verified hidden state | pass: independent actual hidden-tab/native progress and trusted lifecycle events; no application pause or AP-disconnect command |
| Immediate transient release | Clear held axes/override before background timer throttling, preserving latched commands and AP targets | pass: lifecycle neutralizes then synchronously flushes; independent session check proves one-time immediate publication and no run/pause mutation; actual hidden release preserves nondefault commands, parking latch and AP authority/targets |
| Pending explicit start/resume | Hidden state cannot cancel requested start or continuation | pass: actual deferred Restart readiness and Continue live acknowledgement send run and progress while hidden; source also retains Review-exit resume intent; session checks retain pending run intent and respect explicit loading cancellation |
| Fixed step and bounded catch-up | Worker-owned 1/120 s integration independent of RAF, capped catch-up retained | pass: actual native time/step arithmetic above; session init uses 1/120 s; inspected worker retains MAX_CATCHUP=12 and drops excess wall-clock deficit without changing dt; independent pacing cases pass |
| Explicit Pause and foreground return | Hide/show cannot advance paused step/time/digest/native state or trigger autoresume | pass: independent actual Pause invariance above; visibility callback acts only on hide and no focus-resume callback is added |
| Review and pausing settings | Review and dialogs that explicitly pause retain their stops; closing a pausing setting does not resume | pass: independent actual hidden Review invariance; renewed integrated smoke covers Options/pressure/modal stops, and inspected hooks retain pauseFlight. No separate actual-hidden settings-dialog case is claimed |
| Collision/loading/fault stops | Lifecycle cannot override existing collision, terrain-loading or failure guards | pass for inspected/session boundary: sendInput refuses collided/unready/not-running state; faults stop/destroy the session; worker terrain wait halts and resumes only prior run intent, and explicit Pause clears resumeAfterTerrain. Independent collision/fault/continuation cases pass. No new hidden collision/terrain-fault browser case is claimed |
| Hidden audio/control regressions | Hidden silence remains separate from flight continuation | pass: hidden lifecycle silences immediately and RAF retains hidden gate; renewed actual audio regression observes silence with native progress; classic and smoke regressions pass |
| Declared limits/data flow | Disclose throttling/sleep limits; add no permission/persistence path | pass: README/ARCH/SEC distinguish run intent from guaranteed progress through OS suspension/sleep; inspected lifecycle adds no network/storage/permission boundary |
| General render-rate/device/fidelity acceptance | Separate broader gates | not evaluated: no complete render-rate determinism comparison, optional-device/browser matrix, OS sleep, real-time guarantee, aircraft or training acceptance is claimed |

## Unsuccessful observations retained

Initial fixture attempts failed before acceptance: a keyboard mixture expectation
assumed .90 while the selected value was .97; Playwright's owned focus-emulation
session prevented genuine hiding; minimization/restore attempts did not establish
a stable intended lifecycle; and strict signed-zero comparison rejected physically
neutral -0. The final isolated, headless, same-window tab fixture replaces those
attempts. Earlier headful attempts are not promoted to final headful evidence.
The initial un-escalated full suite also failed localhost binding with EPERM;
its escalated replacement passed. No unsuccessful attempt is counted as a pass.

## Frozen inputs and evidence

SHA-256 at the affected review freeze:

| Input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/session.ts` | `c324026c7a7cc5c3dcc52474de47aa69a13bfffba224e3ac6c9d2e9f6c5188d3` |
| `app/src/types.ts` | `2784a1cf04fe209f545863bc8cefa28e6b9926ee62db4fc9afda1912b34bf6aa` |
| `app/src/session.test.ts` | `c75b8083eb3bd26ed8af7960e787c4a4871b6c21d57237e34c785b5b0470886d` |
| `app/tests/background-flight.browser.mjs` | `1445e1735e2f1f9cb72048acfdae020cf4aee4ccf9cfb955bf6514f8d920d85a` |
| `app/tests/flight-actions.mjs` | `588ce4ae5a929cd8aea7c64f2af64e0b28427fbf9d8a0c2e9085f7ef09b1dff8` |
| `app/tests/smoke.mjs` | `6f34339b8ad4ee6962ba03325a0bc369e2ee8b673f71898767494e0f196b4567` |
| `app/tests/classic-smoke.mjs` | `6ae61c4a29b50d8db96a097bf3354d7fdff8f47ef6c8c46d391b35186df833a0` |
| `app/tests/engine-audio.browser.mjs` | `ec2d145a3036dee26434e5067562ef82ef37c3916dc9cb3df32f300e3d4fe75a` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `app/src/pointer-yoke.ts` | `4a740bf71c3ab1e86a3591f7428874e7cbe85fe02c436652262f3f6e51d14b50` |
| `app/src/control-settings.ts` | `e5f5c95632d66738649afe6768ee2d439881a8671a55da270baeeb27570589b9` |
| `app/README.md` | `73f7ff8f59e983c2ac5756d6a1ed520c2e9ccbd775a8ae47dac1f4eb82fca9a5` |
| `docs/ARCH.md` | `3cce8dda3d7ec645f725cda99d445d51c047a577e2415e3887d8687fe84e31cc` |
| `docs/SEC.md` | `8d1041b0e71512951568756fb2fde4cfb7e30e94c2344c22d6d3371dfe1298ca` |

Local evidence is under `output/flight/`:

| Evidence | SHA-256 |
| --- | --- |
| `background-flight-validation-browser.json` (final integrated independent run, preserved by integration owner) | `a26ab6edbb65072a6799d1c4778bcf99b1ac82e33d8d929ca41c338abb5cbad6` |
| `background-flight-validation-before-gps-browser.json` (earlier independent run, historical) | `a4ad1dbd77f101fd9ea45955384b2dd017c30a1b1a92a8b2813b875d968d04f6` |
| `background-flight-browser.log` (preceding author run) | `b6e35d6ca55d68b3d341cfd426bda25e386dbf58cda285edd7893a08e94f1271` |
| `background-flight-unit.log` | `b87a96cc5acc33108b6acc24ad006a1206c4046ede59ee15b3d51400e84671e8` |
| `background-flight-smoke.log` | `0391ec4880a46fe8c76a744f9fdb8efb9f42118392583bd4cbadad3b266d6c39` |
| `background-flight-classic.log` | `8c9f7716d7e61bce67a61983ef82c0a29e7be822be8eec3903a90280c242749b` |
| `background-flight-audio.log` | `a8857efde6e96ac73eef566a87770f1d99c2b8ce1f7e7776a04aa76b1dc6e204` |
| `background-flight-build.log` | `d809a740e1a42fee9d865366ff97946419726cbf6128397870ec7f4caf19be01` |
| `final-gps-unit.log` (final integrated 445 Node + 12 Python) | `e4696109b88c01cff09de572b7baa6c93bbf834cc1197f35543bafd9ba589486` |
| `gps-bearing-build.log` (final integrated build) | `c4af66d93b72ad5be8e8afcab07a92b01fd23ebbc9b5d217a987ebb7c7cfa756` |

No unresolved in-scope failure remains. Actual OS sleep/process suspension,
headful minimization, a broad browser/device matrix, guaranteed real-time
progress, hosted CI/publication, aircraft fidelity and training credit are not
evaluated. Changes to reviewed inputs require renewed affected validation.
