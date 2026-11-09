# Stall delivery quality review

Reviewed 2026-11-05 10:50 Europe/Berlin. TODO 2.0.132; R-ALERT-1. Independent OpenAI/Codex quality reviewer, not an implementation author. Same-provider quality; cross-provider peer remains pending. Exact runtime CLI/model metadata was not independently exposed.

## Outcome and scope

**Complete bounded delivery quality review: no unresolved blocking findings in the final integrated source.** The genuine publication-loss repair is supported by native producer evidence, actual browser component delivery and renewed main-app/audio regressions. The exact original weak-engine-climb case and aircraft warning calibration remain unestablished. This is a new delivery review; the [phase-one UI/wiring report](2026-11-05-stall-warning-quality.md) remains historical, with its original limited conclusions.

Scope: per-fixed-step warning peak aggregation, one-publication metadata, validated session forwarding, recordings/continuation exclusion, pending events across RAF coalescing, 200ms wall-time presentation, current versus RECENT labels, lifecycle suppression and shared visual/audio output. No native AoA threshold, aircraft coefficient, engine binary, AP law, fixed integration step or default mute change is accepted here. The weak-engine climb report does not become an aircraft-fidelity or complete user-session diagnosis through this repair.

Only this assigned report is written. Production/test/shared-status and other review paths are untouched by the reviewer. The bounded working-tree base is HEAD `700dd5386125f9864a391f85b277cb71da55290a`; final frozen source/evidence identities are pinned below.

## Reproduced delivery failure and producer repair

The actual producer packet and its before/after evidence establish more than the earlier ideal-phase risk. A Node Worker executes the actual production scheduler with fixed 1/120s and 60Hz requested state publication at 10×. A read-only observer runs immediately after the real native step, before the existing index increments; its exact labels therefore use stepIndex+1. Rewritten import/file-fetch paths adapt browser Worker loading to Node; no native warning is injected and no coefficient is replaced. Legacy heading assistance and a declared weak-power input ramp reproduce the existing generic model pulse; this is not the user's confirmed KAP or manual control sequence.

Actual native steps 1348–1357 are positive, with maximum 0.002184903303876773 at step 1352. Current raw warning is zero in every published state, including step 1360. The repaired producer attaches that genuine positive peak and exact step to the step1360 state. The measured before/after native digest remains `885b959e51bcd33e`, and maximum catch-up batch remains 12. This establishes a reproduced latest-only transport loss in that measured scheduler fixture, with preserved native dynamics; it does not prove the user's original session used the same rate, maneuver or scheduling.

After every successful native step, the worker reads the atomic validated 13-field stall group and validated cockpit/ground groups. Any wheel support upgrades on_ground to contact before observation; structure contact, invalid/missing signal/contact and failed native steps cannot leave a valid pending peak. One bounded object stores the largest actual positive and earliest equal-valued step. Publication revalidates current raw/contact/collision state, appends the pair to a separate transport message and drains only after successful postMessage. No current native value is overwritten. Stop/pause, init, loading, fault and contact clear pending metadata. Rate-only rebasing preserves the pending peak until its immediate state publication instead of silently dropping or retiming it.

## Consumer, transport and recording boundaries

The optional pair is all-or-none, finite positive and uncapped; source step is a nonnegative safe integer no later than the current frame, and all thirteen valid raw fields are required. A malformed pair rejects the session frame atomically. A completely absent legacy group remains backward compatible, while delivery itself explicitly requires the complete native group. Session forwarding copies the two transport fields without converting them into a native control or guidance request.

FlightTrace validates then deliberately omits the envelope when copying a state, exporting/importing and reconstructing continuation input. Valid transport metadata cannot become recorded warning history; malformed metadata cannot bypass schema checks because it would later be dropped. Raw warning values remain recorded. Review uses the raw monitor against selected recorded telemetry and does not consume retained live events.

Every accepted live worker frame enters the consumer before RAF, so a later clear publication cannot erase a pending event. The bounded pending boolean coalesces events without a queue; first presentation starts the 200ms wall-time minimum. The current native positive remains STALL !; a held event after native clear is explicitly RECENT STALL with its own accessible label/title. Repeated/stale envelope source steps, events from previously accepted intervals and raw-positive-covered steps cannot replay. Same-frame changed native signal, backward/inconsistent frame time, invalid/missing raw/contact and clock failure cancel held delivery. Suppression retains consumed identities; only explicit reset/new-worker epochs clear them.

Main uses performance.now() for both accept and present. RAF's callback timestamp can precede a message accepted during that frame and is correctly not used as the monotonic presentation clock. Requested pacing does not change 200ms into simulation time. Main gates delivery on running/ready/live/visible/healthy/nonloading state, suppresses it at lifecycle boundaries, resets on restart/continuation epoch and feeds the same shown live warning to visual and audio presentation. Current telemetry remains unchanged. The consumer stores constant-size state, and the producer adds bounded per-step reads/comparisons; no unbounded event/RAF/audio backlog or new network/storage path is introduced.

## Findings and affected repairs

### High, resolved: new worker dependency was not served

Location: app/runtime.ts RUNTIME_FILES. The new worker import was initially absent from the strict runtime allowlist, causing a real browser 404 and preventing native initialization. The earlier unit/Node-worker checks did not exercise this serving boundary. Integration added only stall-warning-peak.js to the allowlist, preserving path restrictions. The new runtime test checks static relative imports across the allowed project runtime JS set; it covers the current one-line import-from syntax, not arbitrary dynamic imports or a complete JavaScript parser. Reviewer source re-review and the targeted import-coverage test pass. The actual browser/session/native-worker temporal run now passes after the allowlist repair, with author process exit 0 confirmed. The earlier runtime-load failure is preserved separately and is not a pass.

### Low, resolved: direct continuation forwarded transport-only metadata

Location: app/src/session.ts restoreFromReview/initialize. Normal recorded frames already discarded peaks, but the reviewer found direct restoreFromReview(validLiveFrameWithPeak) copied and forwarded the pair into resume_state. The worker ignored it, so no native replay was demonstrated; nevertheless this violated the explicit discard-at-continuation boundary. Root now deletes both peak fields from a new selected snapshot before initialization, preserving raw native telemetry and the caller. The new regression inspects candidate init, asserts both fields absent and raw warning unchanged, and completes restoration. Reviewer renewed all 48 session cases and TypeScript successfully.

### Medium, resolved: unmute could start a cached RECENT-only horn

Location: app/src/flight-warning-audio-events.ts. Integration found enabling sound could reapply a cached RECENT-only presentation after a disabled audio epoch. The new bounded suppressRecent flag suppresses that entire retained episode on the first enabled frame until RECENT ends or a genuine raw-active warning appears. Repeated calls/raw-clear frames cannot restart the same remainder. A raw-current warning on explicit S remains audible, and an observed clear followed by a new RECENT event still plays. This changes neither graph/default mute nor AP disconnect-edge continuity. Reviewer source re-review and 22 affected audio-event/engine-audio/delivery unit cases plus TypeScript pass. The temporal browser uses the captured genuine packet in five explicitly isolated component epochs (mute/pause/hidden eligibility/Review/loading) and verifies no extra positive horn schedule from a cached remainder. These are component gates, not actual tab visibility or whole-app lifecycle transitions.

## Checks actually run

Reviewer ran from app `node --test src/stall-warning-delivery.test.ts src/session.test.ts src/flight-trace.test.ts src/flight-warnings.test.ts src/flight-warning-audio-events.test.ts > /tmp/gefly-stall-delivery-quality-unit.log`: **106 passed, zero failed/skipped** on the earlier candidate before the audio guard; that affected change was separately renewed below. Reviewer also ran from the repository `node --test studies/e1-browser/sim/stall-warning-peak.test.mjs studies/e1-browser/sim/cockpit.test.mjs > /tmp/gefly-stall-producer-quality-unit.log`: **15 passed, zero failed/skipped**. `npm run check` from app passed TypeScript. Unit coverage includes real captured pulse values, all supported rates, coalescing before first RAF, exact 200ms boundaries, duplicate/stale events, suppression/reset, malformed pair/native/contact fields, trace exclusion and session rejection.

Reviewer renewed `node --test src/flight-warning-audio-events.test.ts src/engine-audio.test.ts src/stall-warning-delivery.test.ts > /tmp/gefly-stall-delivery-quality-audio-renewal.log`: **22 passed, zero failed/skipped**; `node --test src/session.test.ts > /tmp/gefly-stall-restore-quality-renewal.log`: **48 passed, zero failed/skipped**; and `node --test --test-name-pattern='every static relative worker-runtime import' tests/runtime.test.ts > /tmp/gefly-stall-runtime-quality-import.log`: **the one selected import-coverage case passed**. Other runtime HTTP cases were outside that targeted reviewer invocation. TypeScript passed again after the repairs. Counts overlap; they are separate command runs, not a sum of unique tests.

Code1 authored/executed the producer diagnostics, and code2 authored/executed the browser checks. Their source, artifacts and integrated packet were independently inspected and hash-audited here. The reviewer ran no browser matrix or native desktop automation. Root's **final** runtime/continuation/audio-guard integrated suite passes **483 Node + 12 Python cases, zero skips**, and the production build passes. Main browser process 98965 completed exit 0 with five groups; full audio process 18315 completed exit 0 with the repeated genuine temporal pipeline plus 20 offline waveform cases and integrated AP disconnect edges. Temporal-only process 29055 also completed exit 0. Ports/cleanup completion are confirmed by the executing author/orchestrator. The failed runtime-load run remains failure evidence, not a pass.

Physical speaker output, calibration of the model warning relative to actual aircraft stall, human recognition/reaction time and every scheduling/load condition remain outside this bounded evidence. No full CI/publication or cross-provider peer acceptance is claimed.

## Actual browser temporal evidence

The unique task132-temporal-first-pass JSON/log preserve the completed exit-0 run independently of later reruns. This is real production Worker → real createSession validation → delivery/monitor → real panel → original connected 450Hz Web Audio graph in an explicit component fixture. The fixture substitutes the declared native initial condition/controls and uses legacy heading assistance to reproduce the diagnostic; responses and peaks are not injected or replaced. It is not a whole-app user maneuver.

The actual received and session-accepted publication is step1364, raw warning 0, with peak 0.002184903303876773 sourced at step1352. The rendered transition reads RECENT STALL, with title and accessible label explicitly saying current native signal is clear. First RECENT display at performance.now() 2081.7999999523163ms clears at 2298.0999999046326ms: **216.29999995231628ms observed**, exceeding the generic 200ms minimum. The original connected tone receives a positive gain while raw warning remains zero and the badge says RECENT STALL, then a zero gain on expiry/lifecycle. No physical speakers are used or accepted.

The fixture shares the bounded real peak with isolated lifecycle/audio epochs after that genuine pipeline check; their names are declared eligibility boundaries. They do not prove actual browser background throttling. The same captured-packet checks verify no cached RECENT horn on re-enable, and delivery stays canceled after the four non-mute suppression gates. Unit fake clocks separately verify exact 200ms boundary semantics, all supported pacing rates and clear-before-first-RAF coalescing. No all-browser/all-load timing guarantee follows from one measured runtime duration.

The fresh temporal execution inside the final full audio suite independently observes publication step1360 with current raw 0, the same genuine peak/source step1352, and a **200ms** presentation interval. The whole-main stress test instead observes a sustained raw-positive STALL/horn, Pause cancellation, exact recorded raw-positive Review visibility over panels and paused native-state invariance. Its recentEvents array is empty; it is not evidence of a raw-clear RECENT maneuver through the whole main application. The actual component pipeline is the explicit acceptance tier for that transient event. Captured-packet suppression epochs are component gates, not actual tab background/restore tests.

## Frozen reviewed inputs and evidence

Review packet SHA-256: `75051ed1657bca212fbbf9b3d4d024414e36b97d60b902e1c1b940a33949b2c9` (ordered path, NUL, file SHA-256, newline). Root integrated packet SHA-256: `ecb40f58da2779f978bbbe676c39b32dd22f1a9d0dccd904cbb07cdb87543c4d`; its 42 pins and the producer packet's 13 pins were independently checked against current files. Source and affected test changes require renewed review. Historical phase-one evidence remains separate.

| Path | SHA-256 |
| --- | --- |
| `app/runtime.ts` | `78e113a5dc11b17327a1de7d7773943d5d59c3ed045ec7558f357dc6bf54ea07` |
| `app/tests/runtime.test.ts` | `b522c626a3c7eaf2812beedab685166d93f7e4d0db2acd8d35fe8999c5017969` |
| `app/package.json` | `55bf5be38a6ac9add23a89ac0c5861729977af28bee704b5d20d6e1777a13205` |
| `app/src/main.ts` | `9bd9d6bcc69775a1de8607ddc8372e5a6bd2a594f3df953584989b83a72c7310` |
| `app/src/types.ts` | `8db83b52c975cb1b53d1f07f3dcd0c26ac3507581d1f1bb9a0daac7b68c24e1b` |
| `app/src/session.ts` | `041cfc811697094d6e22f8af40259cd900e46f74688b75b1f1cf9d2f61f496cf` |
| `app/src/session.test.ts` | `abbb475d801c8d4cd71033be5046bf83875db3bca334213340b4fa8e2783efb6` |
| `app/src/flight-trace.ts` | `430f7d92033c6d8ead3062401fef9e2e6e48e232a2ee86589b79290c4e1cc1d9` |
| `app/src/flight-trace.test.ts` | `ed314626debe21a6b692bcec2190badf723d63d46a2e4cecd32605383b4c70b7` |
| `app/src/stall-warning-delivery.ts` | `7a5fd79ad8e9cea3c31d78da372bacc096a49427482d01b16119d3970e905caa` |
| `app/src/stall-warning-delivery.test.ts` | `6b4674d6b0b6ad3e85f99d289463c5a9f7799460df925002cb36654a00dd86d8` |
| `app/src/flight-warnings.ts` | `e74405b4bc3da129d31f97802a9a761ab494b1f484fec93549ef1448e5d85bf7` |
| `app/src/flight-warnings-panel.ts` | `64e062a31e2ed43d482c94d43f21dcbbdd326e2d94602d54ca5218df8c869cb1` |
| `app/src/flight-warnings-panel.css` | `e2c8a4b660443fd007de1d7c0efb5afca137fce738bcb991d2091ffd5d75472c` |
| `app/src/flight-warning-audio-events.ts` | `94b185c2d04ee2ebda09ba7344ab6325cc94d2f102bf377449c2c7507cfcc683` |
| `app/src/flight-warning-audio-events.test.ts` | `e45fff5a2032cfd41bb30e9bb79b314116efd50f0b9c0198e1da596a40de5172` |
| `app/tests/flight-warnings.browser.mjs` | `31941a7d1d349155c275cca07a5d4556595daf3e72f6c0eb7387217c495d2252` |
| `app/tests/flight-warnings-audio.browser.mjs` | `2488308f38243a2d443eaaab82e5a2e61e010c7a7c334a8efecdccc6e257b52d` |
| `studies/e1-browser/sim/worker.js` | `fcd816b2395fed1375c78574fd875809616099dc5b316eb4fa1a27b66e76c5ac` |
| `studies/e1-browser/sim/stall-warning-peak.js` | `729a12bbaa0bf4e07793fa57801aa665a309efa22975bcb90529ac9092a22bd0` |
| `studies/e1-browser/sim/stall-warning-peak.test.mjs` | `96d8ab8776f686dee494c398f49d6dbdf7cf92864defe5821ef848ae1e45803c` |
| `studies/e1-browser/sim/stall-warning-native-diagnostic.mjs` | `60986cc82f0017f25b484275d0e39bdafa53af8d96bc3c877381e605da22be20` |
| `studies/e1-browser/sim/stall-warning-climb-diagnostic.mjs` | `d708c769c925614e8378363916bab0c65d28576fd9a72fe88894167917a33883` |
| `studies/e1-browser/sim/stall-warning-worker-diagnostic.mjs` | `506093bef1279d885ecc2c698eeefd55a971207ef51b06b34d469243f2663df1` |
| `studies/e1-browser/sim/dist/jsbsim.wasm` | `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392` |
| `docs/SPEC.md` | `e258a22bf998c8ab9e779f4a0f88f59eec04aa09e98eff0096c0d4a1311a121b` |
| `docs/ARCH.md` | `85d7ddc4a85e595e1a9147c5c5dd1f31ceae529ed7bcf5941d9f0862bb77b7fc` |
| `docs/SEC.md` | `fb259f7cd43d136b3479783faef999751cb060b4f86bc6e0076d2e22d0434366` |
| `app/README.md` | `cbdcc6459ba4bf27000fa5d416c89f349ef90f23ad4e2d628e679ecc796e40e0` |
| `docs/research/2026-11-05-stall-warning-reference.md` | `e0c9f3277714544435ef94544a27892113f3516b93123da069ac7fbafcb51203` |
| `output/flight/stall-warning-producer-task132-packet.json` | `17b058c8f403bb331672cae4f9e69c01963d44dbd175503c34e615397e0aac88` |
| `output/flight/task132-temporal-first-pass.json` | `b75a4f248627f76441ff75b21f90a17bdbdd7b9b0f07535af23630a8f37f7cb4` |
| `output/flight/task132-temporal-first-pass.log` | `ffbd74e8c3fb814edaea9551bca437c68a046ec41f592fcfe0822a482d5c1a87` |
| `output/flight/task132-temporal-full-audio-pass.json` | `0b1f612c1eadcaa551c8d2d101a74f363dae79e3f10de78b52ef199715f7963d` |
| `output/flight/task132-final-warning-browser.json` | `07429b8155d3bb1612a8cb2167e8fe28bc315752f6ce528d6e7728b0e8506513` |
| `output/flight/task132-final-audio-browser.json` | `ad44edf0cf56887ef19ae443d5c7eaa9c89c969e1eb6d2db0d6b7c3e8d9636bd` |
| `output/flight/task132-final-native-chain.json` | `836f575f89a760e1a4a6d90dbe8db24ddd7c821f0a2900622a5b5a860157f537` |
| `output/flight/task132-final-layout.json` | `cb6d14a12e18fe8b591410226e30bd5c3f0b4a476031b7667281fd70b1dd3549` |
| `output/flight/flight-warning-task132-phase2-native-ui-audio.log` | `d6e935bd0d49f04c2ade63122ea135e6babb7af0af7a41345bc475d99bc5d5c2` |
| `output/flight/flight-warning-task132-phase2-audio.log` | `13083dc57a9ba4451d69f0b0753903a408f6da7785b9b6c0d92c7a3095d32d8f` |
| `output/flight/task132-full-unit.log` | `197de8a98c546318df60c06c225bcca8f262457d6754e972393bcf7bdb708e82` |
| `output/flight/task132-build.log` | `bdf7947b808c0456c4f91b2ec9a90aa1d11760588ee034b7da491729fce8da2f` |
| `output/flight/task132-integrated-packet.json` | `ecb40f58da2779f978bbbe676c39b32dd22f1a9d0dccd904cbb07cdb87543c4d` |
| `output/flight/stall-warning-native-task132-climb-24.json` | `2983c1530a7e2d30ebd1fca25d20304cc08072ffa033222056a0aa2ba656ec7f` |
| `output/flight/stall-warning-native-task132-climb-24.log` | `3d40d1a06c42921187a2370533f298dfe0da7c2ed651ee32a40f5142e8916aad` |
| `output/flight/stall-warning-actual-worker-task132-climb-before.json` | `0e45e78e48f09aea6108af0097730fbf1252f1d852c98edb269396fdce99d3d4` |
| `output/flight/stall-warning-actual-worker-task132-climb-before.log` | `5bf7f43de7f97fbe01b3b6756ed49d00936cca63030695ccd04df90a443a2b5b` |
| `output/flight/stall-worker-readonly-observer-task132-climb-before.mjs` | `10f0c4f18fc30efa710cec53c1ba614a650321fb7910b5c59a4a1e086f70b95d` |
| `output/flight/stall-warning-actual-worker-task132-climb-after.json` | `785c5865ee4d644a71518cca1394bcf8914be44f6ae388784ecb83bbb33048e1` |
| `output/flight/stall-warning-actual-worker-task132-climb-after.log` | `0c6d4a67be1c26524db08832186510a33e972fa75088f55e49949212ce0d6b98` |
| `output/flight/stall-worker-readonly-observer-task132-climb-after.mjs` | `ab4e1e59cc645c22867b1c989677a023f41279cf11a1ad2fffed317f928fd996` |
| `app/src/engine-audio.ts` | `7c5bd9ef40746aa710af73b1b3ed1c6154276324a8aca31fffec26992496202d` |
| `app/src/engine-audio.test.ts` | `7e9a4f58f3be0581bf8a6e1187e0a564faac5ef094c534bae4206bba87545a30` |
| `studies/e1-browser/sim/cockpit.js` | `254015654cffd0b5da32c31e0254ef962ddf8983c1db7ac7ed7331d8b4ca2937` |
| `docs/input/2026-11-05-stall-warning.md` | `b59c7bf35ce56666d1349e40e42104fa0ccd856af87b453f33749d659536c498` |
| `docs/input/2026-11-05-stall-warning-climb.md` | `becd1e26f25021bb79dd1dfddc904650b7aee1d5fd8ae5696a2e0710e9eaafda` |
| `output/flight/flight-warning-task132-temporal-runtime-allowlist-failure.json` | `51a7cf8a11d61182f53bf684b72ff8cff3c513d9c5bc7c79f1086924fb2bfe2b` |
| `output/flight/flight-warning-task132-temporal-runtime-allowlist-failure.log` | `7c029c1437c95d6708f3a4ad66a9503d83474f35a049c1dc673eb3c7af0d8994` |
| `/tmp/gefly-stall-delivery-quality-unit.log` | `81e34ea98ab9facfaef89275a0abaa2bb02575b5bdc231bc0cd2511dc467544a` |
| `/tmp/gefly-stall-producer-quality-unit.log` | `d870308146820f828154ae6f98e759520923893ff6ca35baaf8010491208cf48` |
| `/tmp/gefly-stall-delivery-quality-audio-renewal.log` | `b3384b7176bb4478d4d0c1624616535807677bed50c975cced6b09394ece14fb` |
| `/tmp/gefly-stall-restore-quality-renewal.log` | `8f85dc47d4caa66ef536ff192bead42d47fb1b2da27c63ec1729ef60816923f0` |
| `/tmp/gefly-stall-runtime-quality-import.log` | `5de32b50ee1f257e1e21c76c254ed0442b355acd17401be309ae7e66643ec385` |
