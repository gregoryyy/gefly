# Background flight quality review

Reviewer: Codex `/root/quality`, independent of the implementation/test authors. Provider: OpenAI/Codex; no independently exposed model-version identity claimed. Scope: TODO 2.0.126 / SPEC R-SIM-2 and R-INPUT-1, with R-REVIEW-1 continuation boundaries, on the shared working tree based on `700dd5386125f9864a391f85b277cb71da55290a`. Only background lifecycle, input flushing, pending-start/Review continuation, audio eligibility, teardown and their affected tests are covered. Earlier dirty terrain/map/panel changes are excluded. Final source review: 2026-11-05 01:29 Europe/Berlin; final integrated source/independent-runtime renewal 2026-11-05 02:02 Europe/Berlin. Read AGENTS, quality-role instructions and applicable SPEC/ARCH/SEC/STYLE/SDLC.

## Disposition

No unresolved blocking quality findings in the frozen TODO 2.0.126 source and inspected final evidence. Independent session units and TypeScript checks pass; the final actual-hidden Chrome case passes all six groups. This is independent quality review, not specification validation or cross-provider peer review.

## Source inspection

`app/src/main.ts:1224` replaces focus/visibility pausing with transient-input neutralization and synchronous `session.flushInput()`. The release clears keyboard/button/stick input, releases joystick capture and spring-loaded AP inputs, while retaining latched throttle, mixture, engine/flap/trim configuration, parking brake and AP authority. Existing pointer-yoke blur/hidden cancellation still removes steering mode without recentering the camera. Window blur and visibility hiding may both release input; repeated release is harmless. Hidden audio is silenced in that lifecycle turn, independent of the next rendering frame. Visible unfocused flight may still play audio; hidden rendering cannot reenable it because the audio eligibility check retains `!document.hidden`.

`app/src/session.ts:409` adds a narrow flush method. It delegates to the existing dirty-input sender, which requires a ready worker, running intent, no collision and changed input. Restore/dispose also guard the public method. Thus a lifecycle release bypasses the 50 ms UI input-coalescing delay without sending `run`, advancing paused physics, bypassing collision or modifying the fixed-step engine. Start still publishes the current input before `run`; a release staged during loading is retained for readiness.

`main.ts` removes visibility/focus vetoes from explicit pending-ready starts, Back to live and successful Continue live. `focusFlight` checks actual document visibility/focus before moving DOM focus, avoiding focus theft when asynchronous readiness settles in another tab/window. Background events do not clear `startWhenReady`, `resumeAfterReview` or running intent. Explicit Pause still clears pending start and halts the session; Review, pausing settings, loading, collision and faults retain their stop paths. No foreground listener starts the worker automatically. Continue restores recorded commands per R-REVIEW-1; those explicit reconstructed commands are distinct from held UI inputs cleared while the candidate loads.

The worker pacing loop is unchanged in this request: each native integration step remains 1/120 s, catch-up is capped at twelve steps per timer callback and excess wall-clock deficit is dropped. The unrelated earlier worker diff changes terrain messages/identity only. No new background timer, wake lock, device permission, network or persistence path is introduced. Browser/OS scheduling and sleep can delay progress; continuous running intent does not guarantee wall-clock-equivalent simulation. Existing bounded recording/resource limits continue to apply. Page teardown removes the new named blur/visibility listeners before disposing input/session/audio components.

## Evidence and checks

Independently executed `npm --prefix app run check`: pass; `/tmp/gefly-background-quality-types.log`. Independently executed `node --test app/src/session.test.ts`: 37 pass, zero skipped; `/tmp/gefly-background-quality-session.log`. This includes the new synchronous release/dirty-input/run-intent case plus existing pause, collision, continuation, fault, reset and worker-lifecycle cases.

Inspected passing integrated `output/flight/background-flight-classic.log` and `background-flight-audio.log`, executed by the integration owner. Their source changes require actual native progress after blur, synchronous audio silence under a synthetic hidden policy while physics continues, and an explicit Pause before testing silent reset. The classic fixture explicitly selects relative yoke mode for its existing hardcoded pointer geometry; it does not change product defaults. Its final reset assertion now pauses first, avoiding a recording race from intentional background continuation. The audio-denial fixture forces a suspended context with a rejecting resume and silent sink, preserving a deterministic denied-activation branch despite Chrome's trusted-activation behavior. Other audio/native tests use the actual graph and worker. Inspected the integration owner's complete unit log: 442 Node tests plus two six-test Python groups pass, zero skips. These checks do not establish actual hidden-tab progress by themselves.

Inspected the integration owner's passing full `background-flight-smoke.log`, including the new held-axis release/native-progress assertion. Menu-visibility/map-activation adjustments target exposed controls. The recording comparison now deliberately enters Review from Pause, matching its exact-state/paused-return expectation; it does not change the product's existing running-intent restoration. The production build log also passes.

The final dedicated browser case passes all six groups in actual **headless Chrome 156.0.8078.80**. It launches an isolated temporary-profile Chrome process with ordinary background throttling, connects with `noDefaults: true`, disables Playwright focus emulation and verifies both pages belong to the same browser window. Activating the other real tab produces genuine trusted hidden/visible and blur events; neither `document.hidden` nor application flight/lifecycle code is replaced. Seven trusted hidden transitions and a trusted blur are observed. A wrapper records and forwards actual native worker messages; only scenery pixels are fixtures.

Inspected native observations: the hidden AP flight advances from step 54/time 0.45000000000000057 s to step 312/time 2.5999999999999934 s, retaining dt 1/120 s, AP authority/targets and latched throttle/flap/mixture/engine/trim/parking-brake commands. Held elevator input is released before the hidden phase while flight continues. Explicit Pause stays at step 593/time 4.941666666666702 s with unchanged digest/final state while hidden and after foregrounding; native Review stays frozen at that same frame. No background pause/disconnect command is permitted.

The last two groups gate the actual replacement worker's runtime response until the selected action's page is genuinely hidden. Restart readiness then sends `run` while hidden and advances step 74→113; Continue live completes its real reconstruction acknowledgement while hidden and advances step 214→247. Native modules and message acknowledgements are retained, not synthetic success responses. These cases resolve the pending-start/Continue verification gap. Source and session-unit inspection cover explicit Pause cancellation and the remaining stop guards; the dedicated case does not separately execute hidden Back to live from a running entry.

Earlier headful raw-Chrome/minimized-window exploration demonstrated the first native-progress/AP/latched criterion, but later restoration/desktop-input fixture failures prevented a whole-case pass. That partial exploration is historical and is not the final runtime acceptance artifact. The final headless case provides actual browser tab lifecycle evidence, not a claim that a complete headful desktop suite passed. The complete browser case first passed when executed by the implementation author; a separate validate agent independently reran the same frozen source and confirmed all six groups and exit 0. The validate agent then reran all six groups again against the final GPS-integrated main/SPEC, also passing with exit 0. The earlier independent copy is retained separately as `background-flight-validation-before-gps-browser.json`. This report now pins the final copied independent-run artifact `background-flight-validation-browser.json` and quotes its native observations above. Other regression browser runs were executed by the integration owner and independently inspected here. This reviewer executed the targeted session units/type check above. `git diff --check` passes for the frozen affected source/test scope.

## Final integration renewal

Re-read the final main lifecycle release/start/pause/pending paths and the GPS render/reset changes after TODO 2.0.128. The added target getter is read-only presentation input; the reset call retains GPS identity while rendering unavailable state. No lifecycle policy, input-release order, worker pacing or stop guard changed. The final independent six-group background run uses current `main.ts` and SPEC, resolving the full-file pin change rather than inheriting an old-runtime claim. Independent final TypeScript also passes in `/tmp/gefly-final-quality-types.log`.

## Frozen source hashes

These full-file identities pin the inspected artifact; unchanged pointer-yoke/worker files are included only for their lifecycle/pacing boundaries. Earlier unrelated changes within those files are excluded from this increment's acceptance.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/session.ts` | `c324026c7a7cc5c3dcc52474de47aa69a13bfffba224e3ac6c9d2e9f6c5188d3` |
| `app/src/types.ts` | `2784a1cf04fe209f545863bc8cefa28e6b9926ee62db4fc9afda1912b34bf6aa` |
| `app/src/session.test.ts` | `c75b8083eb3bd26ed8af7960e787c4a4871b6c21d57237e34c785b5b0470886d` |
| `app/src/pointer-yoke.ts` | `4a740bf71c3ab1e86a3591f7428874e7cbe85fe02c436652262f3f6e51d14b50` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `app/tests/background-flight.browser.mjs` | `1445e1735e2f1f9cb72048acfdae020cf4aee4ccf9cfb955bf6514f8d920d85a` |
| `app/tests/classic-smoke.mjs` | `6ae61c4a29b50d8db96a097bf3354d7fdff8f47ef6c8c46d391b35186df833a0` |
| `app/tests/engine-audio.browser.mjs` | `ec2d145a3036dee26434e5067562ef82ef37c3916dc9cb3df32f300e3d4fe75a` |
| `app/tests/smoke.mjs` | `6f34339b8ad4ee6962ba03325a0bc369e2ee8b673f71898767494e0f196b4567` |
| `app/tests/flight-actions.mjs` | `588ce4ae5a929cd8aea7c64f2af64e0b28427fbf9d8a0c2e9085f7ef09b1dff8` |

## Inspected evidence hashes

Disposable output identities identify the inspected evidence, not versioned acceptance claims.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/gefly-background-quality-session.log` | `640edcd394ca8e2217288e35b9ff4eb272d8e71b5857e2398afd32cf3ee015a9` |
| `/tmp/gefly-background-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/background-flight-validation-browser.json` | `a26ab6edbb65072a6799d1c4778bcf99b1ac82e33d8d929ca41c338abb5cbad6` |
| `output/flight/background-flight-browser.log` | `b6e35d6ca55d68b3d341cfd426bda25e386dbf58cda285edd7893a08e94f1271` |
| `output/flight/background-flight-classic.log` | `8c9f7716d7e61bce67a61983ef82c0a29e7be822be8eec3903a90280c242749b` |
| `output/flight/background-flight-audio.log` | `a8857efde6e96ac73eef566a87770f1d99c2b8ce1f7e7776a04aa76b1dc6e204` |
| `output/flight/background-flight-smoke.log` | `0391ec4880a46fe8c76a744f9fdb8efb9f42118392583bd4cbadad3b266d6c39` |
| `output/flight/background-flight-unit.log` | `b87a96cc5acc33108b6acc24ad006a1206c4046ede59ee15b3d51400e84671e8` |
| `output/flight/background-flight-build.log` | `d809a740e1a42fee9d865366ff97946419726cbf6128397870ec7f4caf19be01` |
| `/tmp/gefly-final-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |

## Limits

No aircraft fidelity, training credit, operating-system sleep progress or cross-browser/device scheduling guarantee follows from this review. Cross-provider peer review remains pending under the existing cadence. Changed affected source/tests require renewed review and hashes.
