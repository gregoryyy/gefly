# Stall-warning delivery validation

Reviewed 2026-11-05 10:51 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation or fixture author.
TODO 2.0.132 / affected R-ALERT-1 delivery criteria. Author/reviewer provider:
OpenAI/Codex; exact runtime CLI/model identity was not independently exposed.
Cross-provider peer remains pending.

**Status: complete bounded validation. Recommendation: pass for the reproduced
native-positive delivery repair at the frozen integrated snapshot.** No unresolved
blocking discrepancy remains in that scope. The exact original user climb,
installed warning timing and aircraft fidelity are not thereby validated.
The earlier [visibility/wiring report](2026-11-05-stall-warning-validation.md)
remains a historical phase-one record; only this new assigned report was written.

## Snapshot and method

Reviewed AGENTS/validate, SDLC/STYLE/SEC/TODO, EVAL's separation of presentation and
physics, both immutable user records, the updated SPEC/ARCH/SEC and applicable
research/source records. Reviewed the frozen working tree over HEAD
`700dd5386125f9864a391f85b277cb71da55290a`. The
integrated packet (`output/flight/task132-integrated-packet.json`, ignored local evidence), SHA-256
`ecb40f58da2779f978bbbe676c39b32dd22f1a9d0dccd904cbb07cdb87543c4d`, identifies **42 source/test/document/evidence inputs**.
Every listed hash was independently recomputed and matched. All **13 nested
producer-packet inputs** also matched; their links were checked for actual scope,
not treated as proof merely because a manifest was complete.

Independently inspected producer, session/schema/trace, delivery helper,
main lifecycle/RAF routing, renderer, audio event guard, serving boundary and
acceptance assertions. Recomputed native peak/digest equality, browser elapsed
presentation times, suppression counts and final layout bounds. Existing logs
were inspected; this validator did not launch a browser, use CUA/native UI,
rerun the broad suites or implement any repair.

## Evidence levels

The actual production worker scheduler in a Node Worker, with a read-only
post-step observer and declared generic heading-assisted weak-climb inputs,
records native positives at **steps 1348–1357**. The final run publishes **zero raw
positive states**, yet its step-1360 state carries the genuine maximum
**0.002184903303876773 at source step 1352**, while current raw warning stays zero.
Independently compared before/after native positive observations: exactly equal;
native digest **885b959e51bcd33e** and WASM bytes remain equal. Publication schedules
can differ between runs; this is not a claim of identical wall scheduling or of
the user's confirmed KAP/manual maneuver.

The browser temporal fixture runs the **real production Worker → real session
validation → consumer/monitor → real panel → original connected Web Audio graph**.
It substitutes explicit native initial conditions and controls, without injecting
state or warning responses. The first preserved run receives raw-clear peak
publication 1364/source 1352 and shows RECENT STALL for **216.29999995231628 ms**.
The final full-audio run receives publication 1360/source 1352 and shows it for
**200.0 ms**. Both elapsed times were independently recomputed from transitions;
wire and session peaks agree. The connected original 450 Hz gain becomes positive
while raw signal is zero, then cancels. This is component integration, not a
whole-application weak-climb maneuver or physical speaker test.

Five subsequent lifecycle/audio checks reuse a captured genuine packet in
isolated component epochs. Their mute/pause/hidden/Review/loading labels describe
eligibility gates; **hidden is not an actual hidden-tab transition**. All preserve
the positive schedule count on re-enable; the four non-mute delivery gates remain
canceled after re-enable.

The separate full-main application run completes **5 groups**, covering actual
native raw-positive STALL/horn, clear/contact/terrain states, Pause, recorded
Review and paused native invariance. Its `recentEvents` array is empty: this run
does **not** prove the current-raw-clear RECENT path through full main. That path's
causal evidence is the real-worker/session component fixture above. The full
audio run also renews **20 offline PCM waveform cases** and actual native AP
disconnect edges. Offline audio, actual native component integration and full-main
observations are distinct evidence types.

## Criterion matrix

| R-ALERT-1 affected criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Preserve genuine inter-publication positives | Observe after each fixed step, deliver interval maximum and exact source step without replacing current native values. Producer source and actual final worker artifact show raw zero at publication with the exact native peak; all native positive observations and digest match the before case. | pass in the reproduced fixture |
| Bounded, validated transport | Optional pair is all-or-none, finite positive, source-step bounded and requires the complete valid native group. Session tests reject malformed/partial/future/legacy-without-native pairs atomically; producer retains one peak and drains successful publication, with contact/invalid/stop clears. Runtime allowlist now serves the new helper, confirmed by actual browser native initialization. | pass |
| Survive display coalescing | Each accepted frame enters before RAF; later clear state cannot erase pending warning. Source preserves one pending event; unit cases cover raw-positive→clear and captured producer peak→later clear before first display. Real temporal browser receives raw-clear native metadata and displays it. | pass |
| 200 ms wall-time minimum and rate behavior | First display starts the minimum using performance.now(), not simulation time or earlier RAF timestamp. Unit assertions test 199.999/200 ms, delayed first display, all five pacing rates and rate changes; actual browser durations independently recompute to 216.3 and 200.0 ms. | pass for tested policy and runs |
| Current, recent, unavailable and clear identity | Current native positive is STALL !; retained raw-clear event is RECENT STALL with explicit title/ARIA; Review never uses RECENT. Final synthetic label checks and actual temporal transitions agree. N/A remains distinct and clear cues collapse. All 16 final synthetic layout records meet bounds/header/stacking assertions; actual recorded-positive 1440/390 layouts are unobscured. | pass |
| Deduplication and no queue/backlog | Stale/duplicate/source-covered peaks do not extend or replay; new events coalesce, and suppression retains consumed identity. Meaningful helper tests exercise duplicates, previous intervals, raw-covered events, coalescing, backwards clocks/frames and reset epochs; source stores constant-size state. | pass at helper/source boundary |
| Contact, invalid data and lifecycle cancellation | Unit cases cancel on every wheel/structure/collision/contact-invalid or missing native field and all named eligibility gates. Main source synchronously suppresses pause, hiding/loading/fault boundaries and resets new-worker/continuation epochs; component captured-packet gates show cancellation/no replay. Full-main Pause and Review are independently runtime-covered. | pass within stated unit/source/component and full-main scopes |
| Muting/unlock/resume must not replay a cached remainder | Audio guard suppresses first-enabled RECENT-only episodes until clear or current raw positive; current raw-positive enable and fresh audible events still work. Renewed guard tests, component mute/re-enable checks and final audio regression cover the common graph boundary, including the volume-zero enabled condition by source/unit inspection. | pass; physical output not evaluated |
| Recordings, import and continuation exclude envelope | Trace validates then copies only raw fields; export/import omit the pair. Tests cover injected valid/malformed metadata. Direct restore now strips both fields from a copy before initialization; regression checks raw/caller preservation and completes restore. Review reads raw recorded telemetry, never retained live events. | pass |
| Preserve native dynamics and existing audio behavior | No threshold, engine binary, AP law, integration step or graph/default-mute change. Actual worker digest/WASM equality supports this maneuver; source confirms presentation-only main consumer. Full-main paused comparisons and final offline/AP-edge audio checks pass. | pass for bounded correspondence/regressions |
| Exact original user climb and full-main raw-clear RECENT sequence | Original AP/manual/rate/power/configuration are unknown; the full-main stress run exercises sustained raw positive rather than this short pulse. | not evaluated; no exact-session resolution claim |
| Broader platform, physical sound and fidelity | Actual hidden-tab throttling of this event, other engines/devices, all-load timing, physical speakers/human audibility, installed 172S thresholds and aerodynamic stall calibration require separate evidence. | not evaluated |
| Cross-provider/publication gates | This same-provider review does not establish peer coverage, publication or final post-status integration gates. | not evaluated; peer pending |

## Repairs, checks and limits

Preserved failures are not passes. The first temporal browser exposed the new
worker helper missing from the strict runtime allowlist, causing native startup
failure; its JSON/log remain pinned below. The helper is now explicitly served
and a static relative-import coverage check protects the current runtime imports.
That check covers the existing import syntax, not arbitrary JavaScript imports.
The direct-continuation metadata leak and cached-RECENT audio replay were also
repaired and their affected tests renewed. No remaining blocking finding was
identified in this validation scope.

The final integrated packet records process exits **98965 = 0** (full main),
**18315 = 0** (full audio, including repeated temporal fixture) and **29055 = 0**
(first preserved temporal run). Logs and final artifacts were independently read.
Renewed full tests report **483 Node + 12 Python passed, zero skips**, and the
production build passed; the separate producer checks report **15 passed, zero
skips**. These were author/root/quality executions, not validator reruns. A build
or structural check alone is not native-flight or training evidence.

The repair fixes a demonstrated loss of genuine model warning information and
its presentation across two scheduling boundaries. It does not establish an
appropriate aircraft warning threshold, explain every weak-engine climb loss,
or justify changes to AoA, IAS, engine power or AP behavior. Generic presentation
retention intentionally differs from instantaneous raw native state and is
labeled accordingly. Root owns task status, final documentation/integration gates
and any later peer/publication action.

## Additional pins

All 42 final integrated inputs are pinned inside the independently verified
packet above; the nested producer packet pins its actual before/after observer,
source and log evidence. These extra identities include authoritative user input,
the unchanged audio graph and the preserved unsuccessful browser observation.
Changed affected inputs invalidate this bounded acceptance until renewed review.

| Path | SHA-256 |
| --- | --- |
| `output/flight/task132-integrated-packet.json` | `ecb40f58da2779f978bbbe676c39b32dd22f1a9d0dccd904cbb07cdb87543c4d` |
| `docs/input/2026-11-05-stall-warning.md` | `b59c7bf35ce56666d1349e40e42104fa0ccd856af87b453f33749d659536c498` |
| `docs/input/2026-11-05-stall-warning-climb.md` | `becd1e26f25021bb79dd1dfddc904650b7aee1d5fd8ae5696a2e0710e9eaafda` |
| `app/src/engine-audio.ts` | `7c5bd9ef40746aa710af73b1b3ed1c6154276324a8aca31fffec26992496202d` |
| `output/flight/stall-warning-actual-worker-task132-climb-before.json` | `0e45e78e48f09aea6108af0097730fbf1252f1d852c98edb269396fdce99d3d4` |
| `output/flight/stall-warning-actual-worker-task132-climb-after.json` | `785c5865ee4d644a71518cca1394bcf8914be44f6ae388784ecb83bbb33048e1` |
| `output/flight/flight-warning-task132-temporal-runtime-allowlist-failure.json` | `51a7cf8a11d61182f53bf684b72ff8cff3c513d9c5bc7c79f1086924fb2bfe2b` |
| `output/flight/flight-warning-task132-temporal-runtime-allowlist-failure.log` | `7c029c1437c95d6708f3a4ad66a9503d83474f35a049c1dc673eb3c7af0d8994` |
