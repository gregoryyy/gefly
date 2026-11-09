# Map-selected flight start validation

Reviewed 2026-11-05 13:16 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO 2.0.137;
R-PLAY-2 and bounded R-NAV-5. **Pass for the delivered launch increment on the
pinned actual runtime; native build provenance remains blocked.** Cross-provider
peer remains pending.

Read the [raw request and current-editor clarification](../input/2026-11-05-map-flight-start.md),
frozen SPEC, applicable role/project rules and source/evidence. Independently
inspected popup/main/session/worker routing and recomputed native height errors.
No reviewer browser/runtime suite was launched; only this report was written.

The integrated packet (`output/flight/map-start-task137-integrated-packet.json`, ignored local evidence)
SHA256 is `7e4652bfe5141d6ff885c3fb7515fd612cd362e0caba6211a5c70e676bb7772f`,
over base `700dd5386125f9864a391f85b277cb71da55290a`. All **43** current pins
independently match, as do the native child packet's seven source and seven
artifact pins (child SHA256 `1037e740ca73a3ebd86f3f8563a1e5f104d2c4d9602d00032aca27265e354fe0`).

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| R-NAV-5: direct current editor | A direct top-bar button opens the existing editor, with accessible button/controls semantics and no named-plan library. Actual desktop click opens/closes it without replacing the worker or changing native state. Existing P behavior remains in source. | pass; narrow geometry not evaluated |
| R-PLAY-2: explicit selection/action | Coordinate and selected-point popups expose Ground/1,000/5,000/10,000 ft AGL and a separate Fly from here command. Browser height changes and stale actions preserve step/digest/full native state and worker count; only explicit launch replaces the session. Source keeps planning/fix/tuning actions separate. | pass |
| Request validation | Exactly four own finite fields, strict latitude inside ±89.5°, normalized longitude/true heading and exact height choices are accepted. Helper/session units cover malformed/conflicting requests without destroying the current session. Twelve actual Worker cases reject before terrain/NAV I/O and publish no ready/state. | pass |
| Terrain-relative airborne initialization | Worker resolves active physical H after terrain installation, then adds feet×0.3048, with 90 kt TAS. Eight actual Worker launches include all four choices, regional terrain and high global terrain. Three actual UI airborne launches independently recompute errors −0.002325/−0.009002/−0.017346 m; all start paused at step/time zero. | pass within frozen 0.25 m engineering budget |
| Ground | Existing native settling supplies wheel contact, idle throttle, full brakes and paused state, rather than placing the CG at zero AGL. Actual selected-airport UI launch has all three WOW flags=1, brakes=1, throttle=0, engine running and horizontal speed 0.002754 m/s; parking-brake button is latched. | pass at tested point; terrain suitability not accepted |
| Current/stale UI guards | Main and popup identity/connection checks reject removed/replaced actions. Browser verifies coordinate/point stale actions and Review-disabled controls without worker reset. Loading/failure/preparation/continuation guards and explicit collision recovery as a new flight are source-inspected. A review finding about a fallback 90° heading was repaired: availability and dispatch now require latest finite heading. | pass for source and tested guards; missing-heading/loading/fault/collision runtime not evaluated |
| Lifecycle/context | Explicit launch pauses and clears recording/exercise context while keeping current plan/fix objects. Source Restart/loading callbacks retain map setup and existing intent; successful Continue clears map-start context. Session units establish paused replacement and stale-worker isolation. | pass by source/unit evidence; map-context Restart/loading/Continue browser paths not evaluated |
| Persistence and limits | Existing saved-position −500..6,000 m MSL validation is unchanged; main clears prior saved location on launch, and higher map starts cannot be saved. Source keeps AGL/TAS meaning and generic ground/trim limitations explicit. | pass by source inspection; high-start reload not evaluated |
| Build/fidelity | Actual native bytes are `11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`; retained build record says `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`. Current behavior cannot establish executable build provenance or inherit earlier fidelity acceptance. | blocked for provenance; aircraft/training fidelity not evaluated |

Four focused groups pass on Chrome **156.0.8078.80**, with actual native state
and deterministic optional scenery pixels. Final main hash `b732ac7a…` includes
the latest-heading guard after that functional run; this bounded delta was
source-inspected and the final production build passes. Full units record
**523 Node + 22 Python**, zero failures/skips. No narrow layout, hardware,
WebKit or full legacy browser matrix is claimed.

Across the native launches, independently recomputed maximum absolute height
error is **0.0348477426687 m**. The inherited bridge sets `h-sl-ft` and reports
`geod-alt-ft`; exact AGL readback is not claimed. The original 1e−6 assertion
failed and remains preserved in `map-start-worker-task137-strict-geodetic.log`;
it is not counted as a pass. This review uses frozen SPEC's existing **0.25 m
engineering coordinate/display budget**, not an aircraft tolerance.

At H=5989.087890625 m, the 10,000 ft command is 9037.087890625 m MSL and readback
is 9037.053042882331 m. All three high-terrain cases return trim status **−1**:
these pass paused initialization/arithmetic only, not trimmed flight or C172
high-altitude performance. Generic/coarse ground does not establish surveyed
runway, water or landing suitability. No unresolved source finding remains;
shared status and integration/publication gates belong to the orchestrator.
