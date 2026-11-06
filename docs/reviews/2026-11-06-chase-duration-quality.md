# Chase return duration: independent production quality review

2026-11-06 19:34 Europe/Berlin, clock-derived. Reviewer: Codex
`/root/nav_receiver_trace`, acting as quality. Task2.0.185;
R-VIEW-1/R-INPUT-1/R-UX-2. This reviewer authored the focused
`camera-return.test.ts` changes and explicitly excludes those tests from
independent acceptance. Production camera modules and integration were authored
by other agents. This is a source-quality review, not specification validation,
cross-provider peer review or aircraft/training fidelity acceptance.

## Reviewed snapshot and outcome

Reviewed the working production port in `/private/tmp/gefly-chase-return-main`,
based on main `757c41f525e7fc530e6b9ea10a87685590f26db7`, against that base.
The working tree is not a frozen commit; hashes identify the inspected source.
Initial outcome: **needs changes** for finding Q1. No other blocking source
findings were identified in this bounded review. Main-port browser and full
integration gates have not been independently observed here.

| Source | SHA-256 |
| --- | --- |
| `app/src/camera-return.ts` | `497586871c1ad4b568d171095391087c7085b8b16ea55e2c99176776975d7904` |
| `app/src/main.ts` | `d82cf14e3b4420b18076be8809f6d57829bda49deb110eed212478fda1a10c33` |
| `app/src/pointer-yoke.ts` | `40f0c562f214906bb83535fa3f55e355d9e9d8c4988cdba25033cde00c4ebe6c` |
| `app/src/scene.ts` | `f7e960f20004eff00e4cbe4f8a3abdda0556b75b059519b81ad1de7c80efa8d9` |
| `app/src/camera-pose.ts` | `445ca24283032513b7adb4dacb058e1a1089dff4b0853651b7e4ceffeed9029e` |
| `app/src/chase-distance.ts` | `aa786ff673050d4059220da44ccf13a92405b4b6c2e0eac38c90cf40c9da9745` |
| `app/src/camera-preferences.ts` | `fbd5e9963b3712426a8dd1a07a4211fac696432260ea28e378de72f5c618f055` |

## Finding Q1 — medium: Escape does not stop a purely radial return

Locations in the initial main-based snapshot: `app/src/pointer-yoke.ts:59`
(`setLook` deduplication), `:112` (`reset`), `:251` (Escape handler), and
`app/src/main.ts:1275` (`onLook` cancellation).

Reproduction: switch to Chase, zoom far without dragging, double-click to start
the radial return, then press Escape while it is active. The synchronized look
is already `(0,0)`. Escape calls `reset()`, which calls `setLook(0,0)`; the
unchanged-angle guard suppresses `onLook`, so main never cancels the radial
animation. The camera continues moving after the reset. In contrast, Escape
with a nonzero look angle emits `onLook` and cancels it.

A read-only Node reproduction using the real `createPointerYoke` and an
EventTarget surface called `synchronizeLook(0,0)` then dispatched Escape. It
observed `{changed:0,resets:0}`. Source inspection confirms the same path exists
in the user's ROOT working app. R-VIEW-1 requires reset to cancel motion; the
README calls Escape a view reset. Expected behavior is cancellation independent
of whether the look angle changes. Add an explicit reset/cancellation
notification or guarded scene Escape handler, retaining menu/editor guards and
the distinction between cancelling a return and starting a new chase return.
Add a regression for a zero-angle, nonzero-radius transition and an actual
browser check that its active state clears and no delayed movement resumes.

## Other source observations

- The new default duration implements the agreed bounded presentation policy:
 700ms base,450ms per starting-radius doubling, cap6000ms. Logarithm differences
 avoid overflow in the radius quotient; finite positive radii and matching
 optional-radius shapes are validated. Equal/closer radii and cockpit retain
 700ms. Explicit0 still bypasses animation. The generic explicit override is
 not itself capped; the actual main integration passes only the bounded helper
 result or0.
- Quintic easing retains zero endpoint velocity/acceleration, shortest yaw and
 logarithmic-radius interpolation. It accelerates initially and decelerates
 finally; no claim of constant deceleration or world-space stopping follows.
 Monotone wall-time progress cannot rewind on backward clocks. Endpoint copies
 and clamped positive radius interpolation bound extreme finite cases.
- Animation samples only transient camera look/radius and synchronizes the
 pointer's look without invoking flight callbacks. Actual scene pose is rebuilt
 from the current selected aircraft state each frame. Camera distance does not
 alter FOV, native state, session pacing, navigation, terrain source selection
 or flight controls. The existing double-click gesture still neutralizes its
 temporary pointer input and preserves the preceding yoke mode/reference.
- Wheel, fresh pointerdown, view change, new-flight reset, Review transitions,
 blur, hidden document and disposal have direct cancellation paths. Disabled
 preference and newly enabled reduced motion finish immediately. Preference
 storage accepts only a bounded versioned boolean and handles denied storage.
- The main-based diff retains the current main map shortcut, worldwide airport,
 NAV receiver, OFM, persisted settings and existing native pause behavior. It
 ports only the necessary camera/gesture modules; it does not import the older
 stacked feature branch's terrain-worker, overview or shadow implementation.
 No dependency or lockfile change is present.
- `setCameraPose` validates complete vectors before public camera mutation,
 normalizes extreme magnitudes safely, restores an identity reference frame and
 uses exact orthonormal axes to avoid Cesium's pole HPR ambiguity. Its module
 scratch storage is synchronous and local to camera presentation.

## Checks and limits

Independently ran, in the main-based port:

```text
node --test app/src/camera-pose.test.ts app/src/camera-preferences.test.ts app/src/chase-distance.test.ts app/src/pointer-yoke.test.ts app/src/aircraft-orientation.test.ts
51 tests passed; zero failures, skips or cancellations.
```

These tests were authored by other agents. They do not cover Q1 and their
passing result does not override that reproduction. The review also inspected
the current browser harness: it observes real Cesium camera frames and worker
messages, verifies far return timing/end deceleration, and renews the wheel
cancel wait to6200ms. Actual execution against the main-based port remains
pending in this report. Source or harness repairs require affected renewal.
Full CI, assurance check/diff, supported-device performance and real OS
background behavior are not evaluated by this source review. Cross-provider
peer remains pending under the project cadence.

## Q1 repair renewal — 2026-11-06 19:38 Europe/Berlin

Independently inspected the production owner's repair in the main-based port.
`app/src/main.ts` now hashes
`354eede281a5e572fb01481be02dbf2db86cfbc253864561ccbc8fd7b92c9b48`;
the numerical helper retains the source hash above. A named scene `keydown`
listener cancels camera return directly on Escape, independently of pointer
look-change deduplication, and pagehide removes that listener. It neither starts
a new return nor changes pointer APIs, event propagation, native controls,
menu/editor handling or centered-yoke pickup. The existing Escape reset path
still centers look and releases the yoke. **Q1 is repaired at source; renewed
production source quality has no blocking findings.**

Independently inspected the ROOT-authored browser regression, SHA-256
`d3af033bd0eae3dd960e5158f6502b08e52c8f088cf50ac0e02d0f533c432dd3`.
It starts a radial return from centered look, sends an actual keyboard Escape,
waits for inactive rendered state, requires a still-enlarged interrupted radius,
then verifies radius stability after6200ms. This would fail the original Q1
path, which reaches close follow instead of preserving that radius. It does not
replace production camera or worker behavior. The existing native step/digest
checks remain active. My own helper unit tests remain excluded from independent
acceptance.

Read the actual ROOT browser result
`output/flight/camera-return-browser.json`, SHA-256
`b279b00f0f95668c0fc6237bdbf8d2243d9bbb01f34c91823e7a58a596d20b8e`:
five groups pass, errors are empty, seven declared source pins bind the run,
and the far transition records6047.5ms rendered elapsed for its6000ms policy.
ROOT main is pinned as
`f0d308131faa419585b98682e7f1eaa1988a220ed53edf737767799e79284c91`;
its scene and pointer files differ from the main-based port because ROOT has
additional uncommitted features. This is evidence for the repaired working app,
not a substitute for execution against the publication port. A late rendered
frame is not a changed policy duration. Main-based publication browser/full CI
remain pending at this renewal; no heavy tests were run while its browser was
active. Supported-device, real hidden-tab and cross-provider limits above remain.

## Main-based runtime renewal and bounded edge note

Independently read the publication port's actual browser artifact
`output/flight/camera-return-browser.json`, SHA-256
`2f1c006dbaab2e0e39bb85e8f4d4a7d1c0b7089f084445d21e03aa7ccaabf60a`.
It reports five groups passing and no errors; its seven declared source hashes
match the repaired main354eede snapshot above. It records6053.9ms rendered
elapsed for the6000ms capped return, verifies decreasing late logarithmic-radius
increments, and includes the real keyboard Escape regression plus6200ms
post-cancellation stability. This renews the browser evidence against the
publication source rather than relying on ROOT's different scene/pointer source.
Full CI and assurance remain separate gates.

Q2, low/nonblocking: `chaseWheel` rejects nonfinite deltas and ordinary gesture
conflicts before side effects, but it prevents the event and cancels an active
return before `nextChaseDistance` rejects an unsupported `deltaMode` or a page
mode with nonpositive viewport height. Cockpit's existing wheel handler rejects
those cases before consuming the event. Browser-native wheel modes are0/1/2 and
the visible chase scene has positive height, so this does not block ordinary
user-facing return behavior; document-hidden cancellation already has its own
path. For consistent accepted-wheel guards, validate the mode and page height
before preventDefault/cancellation. Do not substitute a `next !== current`
guard, since an otherwise valid wheel gesture at a radius clamp can still
legitimately interrupt a return. A regression can dispatch a cancelable
unsupported-mode wheel during an active return and require unchanged active
state and an unconsumed event. No source repair was made by this reviewer.

## Q2 repair renewal — 2026-11-06 19:44 Europe/Berlin

The orchestrator repaired Q2. Independently inspected main SHA-256
`1cc8433b113dc2fa1a517c23002f770319a389ffd3603f20936574a9c228c037`:
unsupported wheel modes and page-mode invalid/nonpositive height now return
before event consumption or camera cancellation. Valid wheel input at an
existing distance clamp still cancels the outstanding return. The Q1 scene
Escape handler and its disposal remain intact. No numerical helper, pointer
API, session command or native pacing changes accompany this guard.

Independently inspected the ROOT-authored browser harness SHA-256
`b82d6793683e1f67e197a33b167ecafda6aa0ce770fb9556b183db252a9ad07a`:
its real cancelable `WheelEvent` mode3 probe occurs during the zero-angle
radial return, requires `defaultPrevented === false` and active state retained,
then executes the keyboard Escape and6200ms interrupted-radius stability check.
This would fail the original Q2 handler. The invalid page-height guard is
source-reviewed; this browser probe does not pretend to exercise that branch.

Read the final publication browser artifact, SHA-256
`219f45294913dd71a4ec959f83340d7a77a694ba0967b667ce09af09ecd05c30`:
five groups pass, errors are empty, and all seven declared source pins match
the current publication files. The capped return records6010.3ms rendered
elapsed for its6000ms policy. **Q1 and Q2 are repaired; renewed production
quality has no outstanding findings in scope.** My authored helper unit tests
remain outside independent acceptance. CI/assurance and legacy chase-browser
completion remain separate pending evidence, and the stated device,
background-lifecycle and cross-provider limits remain.

## Working-app and legacy chase renewal — 2026-11-06 19:45 Europe/Berlin

Independently read the final ROOT camera result SHA-256
`c8b33bc981b0002c3d4672c4fabe11078608d289e551a86f39ec491b45fe849c`:
five groups pass, errors are empty and all seven declared source pins match
the current ROOT files. ROOT main is now
`839d9464ebfec3ca59fdded36e8787ed38283885e2cd73f074d1374410529212`;
the shared return helper and final harness retain their hashes above. The far
return measures6016.8ms rendered elapsed for6000ms policy. This renews the
working app after the same wheel guard repair and includes both mode3 rejection
and Escape interrupted-radius stability.

Also independently read the main-based legacy chase artifact
`output/flight/chase-zoom-browser.json`, SHA-256
`ee409420f30ae64e940932f4e0b9df086c748bbcbb0b3ade5ea2d6c7c218b0b4`:
four groups pass, errors are empty, and its nine declared source pins bind the
repaired main1cc8433 snapshot, camera-pose/orientation modules and final chase
harness26ef6fc7. It covers actual distance/fixed lens,20Mm top-down chase orbit,
ordinary input guards and cockpit FOV, live heading-relative follow and paused
Review/native isolation. Its immediate-return assertions deliberately disable
animation; they complement rather than replace the animated-return suite. A
top-down chase orbit is not acceptance of the separate Terrain overview view.

Production quality remains **no outstanding findings in scope**. My authored
helper unit tests remain excluded from independent acceptance. Full CI and
assurance are still pending; no additional test process was launched by this
reviewer during these browser runs.

## Full CI evidence renewal — 2026-11-06 19:51 Europe/Berlin

Independently inspected the completed publication CI log
`output-camera-final-ci.log`, SHA-256
`0d35c5bfa85f0495af4f646d7131dbd4d730a2eeeb0e6475e68bb535edb87af5`.
Its terminal result is `Foundation CI: passed with skipped checks`, not an
all-tests-executed claim. It records694 application Node tests and32 application
Python tests passing,89 assurance tests,11 training-package tests, and assurance
integrity44299nodes/66465facts/zero errors/237warnings/138notes. Repository tools
execute247 of248 tests with one Linux-only skip. JSBSim study executes14 of23
with nine optional Python-JSBSim checks skipped; C172S study executes25 of25.
Tracked-content whitespace passes for3277 tracked paths. These are observed
gate outcomes, not independent acceptance of my authored camera-return tests,
nor aircraft-model validation inferred from a green CI.

The orchestrator identifies the tested source/requirements snapshot as d75fd17.
The current inspected production main/helper/browser hashes remain exactly
those of the final browser renewal above. Read-only Git comparison confirms
d75fd17..3fd6382 adds only the three camera quality/runtime/validation records;
no production code changed after the CI source snapshot. The post-CI review
metadata and final TODO/DONE integration still require their final assurance
check and explicit-base lineage diff; this report does not mark those pending
steps passed. Production quality remains no outstanding findings in scope.

External cross-provider peer is pending. The orchestrator reports CLI2.1.308
present but unauthenticated; this reviewer has not treated CLI presence, these
same-provider reviews or test success as an executed external peer gate.

## Production build renewal — 2026-11-06 19:53 Europe/Berlin

Independently read the publication `npm --prefix app run build` log
`output-camera-main-build.log`, SHA-256
`a162453458ae297b34228188e723f0d1277de65d39a27698e62d2661f3dd15c6`.
The orchestrator's process exits0 and the log reports the TypeScript/Vite build
complete in8.49s. Existing large-chunk and plugin-timing warnings remain visible;
they are not concealed as an all-device performance pass. Rechecked production
main1cc8433 and helper49758687 hashes unchanged. No source or test was edited for
this renewal. Final metadata assurance/diff remain integration-owned and pending
in this report; external peer remains pending, with authentication unavailable.
