# Paused RPM and status-marker validation

Reviewed 2026-11-05 13:48 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.140;
R-SIM-2 and bounded R-PLAY-2. **Pass for the pause marker and restored map-flight
Start affordance.** Native build provenance remains unverified; peer pending.

Read the [user's pause clarification](../input/2026-11-05-paused-marker.md),
frozen criteria and source. Independently inspected diagnostic/after-fix JSON,
scripts, source identities and all four after-fix screenshots. No reviewer
browser run or new permanent tests were made; only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| R-SIM-2: visible live-pause marker | `PAUSED` and `Space to resume` are outside the optional header. Actual 1440×1000 map-start and manual-pause screenshots show readable status with the header hidden; JSON confirms visible marker. | pass at observed layout |
| Hide during running/Review | After visible Start click the marker is hidden and simulation advances; manual Pause restores it; Review hides it. Independently viewed screenshots and hidden/rectangle fields agree. | pass |
| Hide during initialization/failure/collision | Source combines unavailable, collided, running and Review guards. These unavailable/collision transitions were not exercised in the after-fix observation. | pass by source inspection; runtime not evaluated |
| Input/accessibility boundary | Source uses `role=status`, polite live semantics and `pointer-events:none`; actual computed pointer-events is `none`. No control, focus or dynamics action is attached to the marker. | pass for source/computed rule; click-through and screen-reader behavior not evaluated |
| R-PLAY-2: Start after prior flight | Explicit map launch now clears `hasFlown` before reset. Actual New York 1,000 ft AGL launch after prior flight is paused with a visible enabled Start card and Start/Space/power guidance. Clicking that Start successfully runs the native flight. | pass at reproduced case; other map heights source-inspected |
| Preserve paused physics/power staging | After-fix paused observation reports unchanged step, digest and full pose over 200 ms. Before-fix diagnostic separately demonstrates selecting 100% while paused leaves native RPM/throttle/state frozen; the control/session/worker path is unchanged by this UI repair. | pass for measured hold and preserved staging path |
| Diagnostic interpretation | Actual time-advancing native and app observations show RPM responds to throttle. In the app, paused RPM remains 2521; running idle is about 1249 and full about 3038. The existing analog needle ceiling remains 3000 while numeric RPM changes. This supports pause clarification, not aircraft calibration. | pass for bounded observation |

The retained before-fix diagnostic packet (`output/flight/rpm-response-usa-packet.json`, ignored local evidence)
SHA256 is `6a65b84c22253cc622d6ec02e557e3612e6b9cc5523748241e972ec7fe766758`;
all ten file pins independently match. Its old main snapshot is distinct from
the repaired UI. Native ground/1,000 ft sequences apply 0/.5/1/0 throttle with
changing RPM and simulated time; the missing Start card is reproduced there.
The user's confirmation establishes pause, without establishing that exact
original map-launch sequence.

After-fix observations (`output/flight/pause-marker-after140-observations.json`, ignored local evidence)
SHA256 `06c3aea999628af40d75dbd23886f498b04bb78d8195ccb561b703104402987a`
contain four bounded manual browser snapshots, Chrome156.0.8078.80, errors=[]
and sameStep/sameDigest/samePose=true. This is not a broad automated test suite.
Viewed images: map start (`output/flight/pause-marker-after140-map-start.png`, ignored local evidence),
manual pause (`output/flight/pause-marker-after140-manual-pause.png`, ignored local evidence),
flying (`output/flight/pause-marker-after140-flying.png`, ignored local evidence) and
Review (`output/flight/pause-marker-after140-review.png`, ignored local evidence).

Frozen main SHA256 is `f51923fa3ee52ac7ddbd6655e68c68b287edd44e7500f72858375ea70e350ae3`;
CSS is `15275cf2bac223944f9f2dc2e601d247b760e7695224746ef7a9a535255e53d9`.
The production build passes; `osm-rpm-task138-140-build.log` SHA256 is
`29636873e1a0f000eea3257fe663cbb5ef666f076dcb3f68af5ea59873edd0fa`.
Read SPEC SHA256 is `32f038f4188fd23ba4daff42e634840abdde3dd62691d94e351a9141771f1ed3`;
input is `5cc76e9cd88088808ed4faeb9ac4bcdb683b384d289166a0017e0232706b77ba`.

No blocking source/observed-UI finding remains. Mobile/other layouts, actual
assistive technology and broader browser/device coverage are not evaluated.
Current native WASM remains `11a92abd…`, differing from build record `4fe24bfc…`;
successful response does not resolve provenance or accept C172 performance.
No engine/model retuning or gauge calibration is approved. Shared status and
integration/publication gates belong to the orchestrator.
