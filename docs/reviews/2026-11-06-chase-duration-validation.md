# Zoom-dependent chase return — independent validation

2026-11-06 19:34 Europe/Berlin, clock-derived. Validator: Codex
`/root/camera_return_validate`, not an author of the implementation or tests.
The validator earlier recorded the immutable request and a housekeeping source
note; those do not establish implementation acceptance. The orchestrator selected
the timing policy and owns SPEC/status/integration.

The [exact user request](../input/2026-11-06-chase-return-duration.md) asks for
longer chase return with greater zoom-out, maximum6seconds, decelerating at the
end. Current R-VIEW-1 specifies700ms plus450ms per doubling of start/target chase
radius, capped6000ms; cockpit stays700ms and disabled/reduced-motion stays instant.
The coefficients are the declared presentation policy, not an aircraft value or
additional user quote. R-INPUT-1's camera/flight-state separation remains relevant.

**Current recommendation, renewed19:46: bounded source/browser acceptance passes
for both ROOT and publication on their separate fresh wheel-guard artifacts.
Complete CI/assurance gates remain pending.** The prior ROOT b279b00… and earlier
publication runs predate the unsupported-wheel-mode repair and remain historical.
The current publication also has its own four-group legacy chase run. See the
final renewal below; evidence is not substituted between contexts.

**Historical renewal opened19:35: affected acceptance was pending.**
Independent quality finding Q1 found that Escape could fail to cancel a pure-radius chase
return while yaw/pitch were already zero. ROOT main now has a named Escape
cancellation listener and cleanup, plus a finite wheel-delta guard; the
publication repair is in progress. The harness adds an actual Escape during a
zero-look radial return and observes it for6200ms after cancellation. Source and
harness changed after the earlier ROOT e0bb109… run, so that run and the initial
publication run are historical, not final acceptance. Fresh ROOT and publication
runtime/source verification and final gates are required. No new passing result
is inferred from a running browser or the presence of the fix.

The19:34 source/unit/browser observations below remain a historical record at
their stated hashes. Unchanged pure duration arithmetic is separate from the
affected UI cancellation integration. Broader view/flight/device requirements
remain outside this increment unless explicitly observed.

## Initial source snapshots and identities — historical

ROOT is the shared working application at
`/Users/gregor/Documents/devel/gefly`, with unrelated ongoing changes. Its seven
camera/browser pins independently matched the completed initial browser artifact
at19:34; the new Escape repair invalidates that current-source binding. The
publication is the dirty, frozen feature worktree
`/private/tmp/gefly-chase-return-main`, branch `feat/scaled-chase-return`, based on
main `757c41f525e7fc530e6b9ea10a87685590f26db7`. It restores the earlier camera
slice absent from main, while retaining current main's map/NAV systems. It
explicitly has no separate terrain-overview feature; ROOT's unrelated overview
does not become a publication acceptance criterion.

| File under `app/` | ROOT SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `src/main.ts` | `8e03c2daab8e7c12c5f970b737c187f7c2815d6032c8719ad4b1c6736a4f2977` | `d82cf14e3b4420b18076be8809f6d57829bda49deb110eed212478fda1a10c33` |
| `src/scene.ts` | `63de768859232ac66544292eb7f4da4b1588df777a0419d08894dd2319d12e3a` | `f7e960f20004eff00e4cbe4f8a3abdda0556b75b059519b81ad1de7c80efa8d9` |
| `src/pointer-yoke.ts` | `01b70ea4c83891835535449e97eed4c89a60f0d07703f286b4d9a4c85f686d76` | `40f0c562f214906bb83535fa3f55e355d9e9d8c4988cdba25033cde00c4ebe6c` |
| `src/camera-return.ts` | `497586871c1ad4b568d171095391087c7085b8b16ea55e2c99176776975d7904` | same |
| `src/camera-return.test.ts` | `d3d0b8c23fbdc9415dce75cbe76c0c2cf84685e4decd0cad865508881a15c4b9` | same |
| `src/chase-distance.ts` | `aa786ff673050d4059220da44ccf13a92405b4b6c2e0eac38c90cf40c9da9745` | same |
| `src/camera-preferences.ts` | `fbd5e9963b3712426a8dd1a07a4211fac696432260ea28e378de72f5c618f055` | same |
| `tests/camera-return.browser.mjs` | `ab7c9fc3d335a9ed2927a04400429557de5720ed8e84b58ef88e96624d8d4cd8` | same |

SPEC hashes are ROOT
`e490787a9f2fb0605bcfcbaad7527c7ed566a231a3995c8b2f96190489842492`
and publication
`ad3c4a2f76a9273a214a57f9ec20bcdb9ca71d471f0cb79b2abd2e19c025b214`.
Both contain the updated duration/late-deceleration clause. The immutable request
SHA-256 is
`2f2abb3611e472b7f882bc8f41dd4e9ea2930e3137a2a5d1ca4b1d0a8500edb2`.
Broader SPEC differences reflect their different feature inventories.

## Initial criterion matrix — superseded for affected current acceptance

| Criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| Zoom-dependent duration | Greater starting chase radius gives nondecreasing duration, strictly increasing before saturation | Shared helper uses log2(start)-log2(target), adding450ms per doubling above700ms. Independent duration table and source inspection verify both integrations; ROOT actual far return lasts beyond old700ms. | pass for shared units/source and ROOT observed case; publication runtime pending |
| Six-second policy cap and exact completion | Selected chase duration never exceeds6000ms; exact supplied endpoint at deadline | Independent cap-threshold/deadline probes and unit cases pass, including20Mm and extreme/subnormal finite radii. ROOT actual sampled wide return measures6015.6ms for selected6000ms, with frame/scheduling quantization distinguished from the mathematical deadline. | pass within stated mathematical/browser scope |
| Final deceleration | Inward radius/angular motion slows over the final half without overshoot | Pure tests plus independent50equal late intervals at four radii show falling radial speeds; source quintic derivative falls after half progress. Actual equal-time late log-distance steps decline1.19046→0.69034→0.22346. | pass for shared units and ROOT actual frames |
| Wall time/frame independence | Same elapsed time gives same pose regardless of sampling; invalid/backward time cannot rewind | Shared unit tests verify sparse/dense sampling, monotone progress and exact endpoints. Main samples on RAF time, not simulation time. | pass for units/source |
| Existing cockpit, lens and close-follow behavior | Cockpit700ms; fixed FOV; exact heading-relative close chase endpoint | Units preserve cockpit700ms; ROOT actual cockpit/chase frames retain lens, orthonormal axes, shortest return and30m behind/11m above endpoint. Main-based port has the same policy and its own camera rendering integration. | pass for units and ROOT browser; publication actual pose pending |
| Repeated return and pointer reference | Restart from displayed pose with remaining radius, retaining neutral click-pair behavior | Units restart at4500ms and recompute a shorter uncapped remaining duration; ROOT repeated double-click stays within displayed radius and finishes correctly. Source synchronizes pointer look to each displayed pose. | pass within source/unit/ROOT runtime scope |
| Cancellation | Accepted input/view/lifecycle changes stop outstanding motion without delayed snap | ROOT wheel cancellation remains stable after6200ms. View/drag/synthetic-blur assertions pass with850ms observations; same shared cancellation path is source-inspected. Genuine hidden-tab/reset/Review/disposal long-duration runtime is not newly observed. | pass for measured wheel/source cases; broader actual lifecycle not evaluated |
| Preference/reduced motion | Saved boolean default-on; disabled or reduced motion returns immediately | Shared preference tests and ROOT actual toggle/reload/reduced-motion context pass; no animated frame appears in disabled/reduced cases. | pass for units/ROOT browser |
| Camera-only/native isolation | No animation command, paused step/digest/state change or lens zoom | ROOT browser compares actual native stats/full final state and command count through returns; helper has no renderer/worker/storage dependency. | pass for tested ROOT interactions |
| Publication restoration/integration | Earlier camera slice coexists with current main; no unsupported overview claim | Source diff and supplied63focused tests/TSC pass cover restored distance/pose/pointer helpers. Actual publication browser is still pending, so ROOT evidence is not substituted. | pass by source/focused supplied evidence; runtime blocked |
| Final integrated gates | Complete current app/CI/assurance at publication snapshot | Not yet supplied at this initial report. | blocked |
| Wider acceptance | Live moving-aircraft timing, full recorded Review, embedded WebKit/device matrix, physics/training/peer | Not established by these paused fixture observations. | not evaluated |

## Independent execution and numerical probes

Executed from the publication worktree against the identical shared helper/tests:

```sh
node --test app/src/camera-return.test.ts app/src/camera-preferences.test.ts
node --test app/src/camera-return.test.ts app/src/camera-preferences.test.ts app/src/chase-distance.test.ts
```

First selection passes14tests; the final broader focused selection passes20tests,
0failed/cancelled/skipped/TODO. These are two explicit selections, not additive
new test counts. The integration-supplied63-case focus suite also passes; its
scope includes camera basis/pose/distance/pointer tests. TypeScript exit0 is
integration-reported. No full CI or browser was rerun by this validator.

Independent in-memory probes import the actual helper and compare durations to
the predetermined factors1/2/4/16/256/4096:700/1150/1600/2500/4300/6000ms. They
test the exact cap threshold `2 ** (106/9)` just below/at/above, assert not done
immediately before the selected deadline and exact endpoint at it, then test
50equal late intervals for64m/512m/8192m/20Mm starts. All pass. These probes use
declared arithmetic expectations rather than reading the helper's private rate.

ROOT passes `duration_ms: undefined` when enabled and uses the factory's policy;
publication passes `cameraReturnDuration_ms(from,to)` explicitly. Inspection
confirms equivalent behavior. Both pass0 when disabled/reduced. The helper
subtracts logarithms rather than dividing radii, avoiding overflow for extreme
finite ratios; invalid/mismatched poses remain rejected. Explicit duration
override remains an internal helper capability; the actual enabled UI always
selects the bounded policy.

## Actual ROOT artifact and limits

`output/flight/camera-return-browser.json`, SHA-256
`e0bb109df1a94d936d43242ae7f64fd400d15a7724c6b064b749de8acbcfec96`,
reports five passing groups, zero errors and Chromium156.0.8078.80. Reviewer
independently recomputed every recorded source/harness pin. It observes actual
public Cesium camera values and actual native-worker stats; scenery pixels are
fixtures. Instrumentation reads poses without replacing camera output.

The wide return has354frames over6032.3ms total capture, maximum frame gap47.6ms,
and measured active-to-returned elapsed6015.6ms versus selected6000ms. This is a
frame-quantized observed completion, not a claim that a browser can render at an
exact sub-frame deadline. The browser assertion allows −400/+1500ms scheduling
slack; the independently checked pure helper establishes the exact6000ms cap.
Actual tail interpolation uses equal normalized-time intervals, avoiding a false
deceleration claim caused by irregular frame spacing. The frame ring now bounds
at2000samples, replacing the former600-sample limit.

The browser observes one long wheel-cancellation hold beyond the full maximum;
other existing cancellation cases retain shorter observations. Shorter cases
and synthetic blur must not be described as complete six-second real lifecycle
testing. Moderate-factor actual timing and live moving-aircraft follow are not
newly measured; policy source/unit coverage is separate from those UI cases.
Current publication execution and final gates remain outstanding before its
bounded delivery is accepted.

## Escape-fixed ROOT renewal — historical after the wheel-mode finding

2026-11-06 19:37 Europe/Berlin, clock-derived. Reviewer independently inspected
the fresh ROOT artifact `output/flight/camera-return-browser.json`, SHA-256
`b279b00f0f95668c0fc6237bdbf8d2243d9bbb01f34c91823e7a58a596d20b8e`.
It completes five groups with zero errors on Chromium156.0.8078.80. All seven
recorded source/harness pins were independently recomputed and match the current
ROOT source. Changed main and harness hashes are:

- `app/src/main.ts`:
  `f0d308131faa419585b98682e7f1eaa1988a220ed53edf737767799e79284c91`.
- `app/tests/camera-return.browser.mjs`:
  `d3af033bd0eae3dd960e5158f6502b08e52c8f088cf50ac0e02d0f533c432dd3`.

Scene/pointer/helper/distance/preference hashes remain the earlier ROOT values;
the duration helper remains49758687…. The old e0bb109… artifact stays historical.
No old passing result was relabeled to cover the repair.

| Affected/current ROOT criterion | Current observed evidence | Result |
| --- | --- | --- |
| Quality finding Q1: Escape during zero-look radial return | Actual scene-focused Escape is pressed during a radius-only return, without relying on a yaw/pitch change. Radius remains above the close target and stable after6200ms; native state stays frozen. Named Escape listener/cleanup are inspected in current main. | pass; Q1 resolved for ROOT |
| Current duration/cap and deceleration | Far return selects6000ms and measures6047.5ms between observed active/returned poses. Equal-time late log-distance steps decline1.17906→0.67106→0.20497. Current helper exact-cap arithmetic remains unchanged and previously tested. | pass within mathematical/frame-quantized scope |
| Existing camera behavior and isolation | All five current groups retain cockpit/FOV/endpoints/restart, wheel/lifecycle, native command/state and preference/reduced-motion assertions. Zero page errors and all source pins match. | pass for these ROOT observations |
| Malformed wheel handling | Source now checks finite horizontal and vertical wheel deltas before accepting/cancelling chase input. No separate actual malformed-wheel dispatch is asserted in this browser artifact. | pass by source inspection; extra runtime case not evaluated |
| Publication/new integrated gates | Publication source repair and its new runtime artifact are still pending verification. | blocked pending publication evidence |

The far transition records351frames with maximum frame gap107.7ms. The observed
47.5ms excess over the selected6s is rendering/sampling quantization; it does not
change the independently checked helper deadline. No universal frame-rate/SLA
claim is inferred. The new regression extends both wheel and actual Escape
cancellation observation beyond the maximum return duration; other previously
stated lifecycle/device limits remain. **Bounded ROOT acceptance is renewed;
publication acceptance is not yet renewed.** No source or tests were edited or
browser rerun by this validator.

## Wheel-guard publication renewal

2026-11-06 19:44 Europe/Berlin, clock-derived. A subsequent integration finding
showed that an unsupported wheel deltaMode could cancel animation before the
distance helper rejected that input. Both main integrations now reject modes
other than0/1/2, and reject nonpositive/nonfinite page height for page-mode input,
before consuming the event or cancelling camera motion. This changes main and
harness pins; ROOT b279b00… and previous publication results are historical.
Q1's Escape repair is retained, but those pre-wheel-guard runs are not final
acceptance for the changed integration.

Reviewer independently inspected the fresh main-based publication artifact
`/private/tmp/gefly-chase-return-main/output/flight/camera-return-browser.json`,
SHA-256
`219f45294913dd71a4ec959f83340d7a77a694ba0967b667ce09af09ecd05c30`.
It completes five groups with zero errors on Chromium156.0.8078.80. All seven
recorded source/harness hashes were independently recomputed and match current
publication files. Updated identities are:

- Publication `app/src/main.ts`:
  `1cc8433b113dc2fa1a517c23002f770319a389ffd3603f20936574a9c228c037`.
- Shared `app/tests/camera-return.browser.mjs`:
  `b82d6793683e1f67e197a33b167ecafda6aa0ce770fb9556b183db252a9ad07a`.

Publication scene/pointer and shared duration/distance/preference pins remain
their recorded values. The duration helper remains49758687…. Current ROOT main
is839d9464… with the same harness; its own fresh actual artifact is still pending
and is not inferred from this publication pass.

| Current publication criterion | Observed actual evidence | Result |
| --- | --- | --- |
| Invalid-mode input does not cancel | During active zero-look radial return, a cancelable deltaMode3wheel event remains unconsumed and animation remains active. The same pre-side-effect source guards reject malformed modes/page height. | pass for actual mode3and inspected guards; zero-height runtime not separately evaluated |
| Q1 Escape cancellation in main-based port | Actual scene-focused Escape then stops that radius-only transition; interrupted radius stays above close target and stable6200ms later, with native state frozen. | pass; Q1 resolved for this publication snapshot |
| Selected timing and end deceleration | Actual far elapsed6010.3ms for selected6000ms,338recorded frames; equal-time late log-distance steps decline1.17540→0.69978→0.23149. Shared helper arithmetic/cap tests remain unchanged. | pass within mathematical/frame-quantized scope |
| Fixed lens/endpoints/restart/preferences/native isolation | All five retained groups pass in this actual main-based app, including cockpit, repeated return, disabled/reduced motion, source hashes and native-state assertions. | pass for publication observations |
| Current ROOT and final publication gates | Fresh ROOT/legacy chase runs and complete CI are pending. | blocked pending current evidence |

**Bounded publication source/browser acceptance passes; current ROOT and final
integrated acceptance remain pending.** The legacy chase run's separate-overview
scope must be explicitly not evaluated in this port. No test was rerun or source
edited by this validator, and no earlier preparation was relabeled as current.

## Both final wheel-guard contexts and restored chase regression

2026-11-06 19:46 Europe/Berlin, clock-derived. Reviewer independently inspected
the completed current ROOT artifact, SHA-256
`c8b33bc981b0002c3d4672c4fabe11078608d289e551a86f39ec491b45fe849c`,
and rechecked publication219f4529… above. Each reports five passing groups,
zero errors and Chromium156.0.8078.80. All seven source/harness hashes match each
context's current files independently. Current ROOT main is
`839d9464ebfec3ca59fdded36e8787ed38283885e2cd73f074d1374410529212`;
publication main remains1cc8433b… and the shared harness remainsb82d6793….
The shared pure duration helper remains49758687… and has not changed.

Current SPEC hashes after a wording clarification are ROOT
`0999054788624917bca54de79ccfff13b418678956d5148b039475ddc97521a0`
and publication
`fd08a78728d7e8e3681033d2fc0e7ca18b2e80247d69f2559fe05fc70d31df9a`.
Inspection confirms the same duration/cap policy and final deceleration; wording
now explicitly distinguishes shortest-arc yaw from logarithmic chase radius,
without suggesting that cockpit return has a radius. This clarifies the existing
criterion rather than changing its threshold to fit a result.

| Current acceptance criterion | Independent observed evidence | Result |
| --- | --- | --- |
| ROOT final wheel/return integration | Actual mode3event is unconsumed and leaves return active; actual zero-look Escape then holds interrupted radius after6200ms. Wheel cancellation also has6200ms observation. Five groups/source hashes/native invariance pass. | pass for ROOT |
| Publication final wheel/return integration | Separate219f4529… run covers the same actual cases and its own main/scene/pointer hashes with five passing groups. | pass for publication |
| Current timing/deceleration | ROOT elapsed6016.8ms for selected6000ms; equal-time late log-distance steps1.18718→0.68355→0.22292. Publication6010.3ms and its decreasing tail values are independently recorded above. | pass within mathematical/frame-quantized scope |
| Restored close/Earth-scale camera slice in main-based port | New actual legacy chase run passes four groups and all nine source pins, including the camera-pose helper. Actual moving native flight and paused Review are exercised; camera zoom/lens/bounds/input guards remain coherent. | pass for listed legacy observations |
| Separate overview versus chase top-down inspection | Legacy artifact explicitly marks separate terrain-overview view not evaluated; top-down chase orbit is actually exercised. | pass for scope disclosure; separate overview not evaluated |
| Final integrated publication gates | Complete CI/assurance still pending; browser/pure-source observations do not substitute for them. | blocked |

The publication legacy artifact is
`output/flight/chase-zoom-browser.json`, SHA-256
`ee409420f30ae64e940932f4e0b9df086c748bbcbb0b3ade5ea2d6c7c218b0b4`.
It intentionally disables return animation for immediate-reset assertions, so its
Review observation is not a new animated-Review claim. The actual animation and
its two cancellation regressions are covered by the separate five-group suite.
No source pin was missing or mismatched in either current suite.

Both ROOT and publication WASM files were independently hashed to
`266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc`
at this inspection. Engine build-info provenance remains unverified: matching
runtime bytes is not verification of the recorded build or aircraft fidelity.
This does not weaken the observed camera-only/native-state-invariance assertions.

**Current bounded source/browser recommendation passes in both contexts;
final complete CI/assurance acceptance remains pending.** Earlier preparations,
Escape Q1 history and wheel-mode invalidation stay recorded. Remaining real
hidden-tab/device, animated Review, moderate-factor actual timing and training
limits are unchanged. No source/tests were edited or browser/heavy gate rerun
by this validator.
