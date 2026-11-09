# Paused-state marker and RPM quality review

Reviewed 2026-11-05 13:51 Europe/Berlin by Codex quality, independently of the
Codex implementation/diagnostic authors. TODO2.0.140 / R-SIM-2 / R-PLAY-2;
working tree based on `700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded review: no blocking findings.** Only this assigned report is
edited. Cross-provider peer remains pending; no exact CLI/model identity is
inferred. The [user confirmed the report occurred while paused](../input/2026-11-05-paused-marker.md)
and requested an on-screen marker. This is a UI clarification, not an engine,
RPM-scale or aircraft-model repair.

## Source and repaired behavior

The reproduced UI trap was prior flight → new paused map start: `hasFlown`
remained true, hiding the Start card while the optional top menu was also hidden.
The root fix clears that UI flag only after a valid explicit map-start request,
before reset. The new paused flight therefore exposes Start, with Start/Space
and staged-power guidance. General manual Pause retains its existing compact UI.
No throttle, native integration or gauge source is changed.

`updateSessionUI()` sets the PAUSED marker hidden during initialization/fault,
collision, running or Review; ready live pause shows it independently of the
optional menu. Existing pause/start/ready/reset/error/Review transitions call
that updater. The static `role=status`/polite text provides a non-colour cue and
Space guidance without repeated text rewriting, focus acquisition or event
handlers. CSS `pointer-events:none` preserves the underlying clicked action;
there is no display rule overriding the native `hidden` attribute. Its z-index 9
is below the header and its placement has a narrow-screen rule. No network,
permission, persistence, listener or per-frame computation is added.

No critical, high, medium or low defect remains in this scoped candidate.

## Evidence and limits

Before-fix diagnostic packet `rpm-response-usa-packet.json` was independently read
and hash-audited. Actual native fixtures show running throttle response: roughly
828→2963 RPM on the ground and 1238→3071 RPM airborne. The actual app also responds
to running throttle changes; the two numeric displays track rendered native RPM.
Paused staging leaves RPM and native step/pose/digest frozen, as required. The
existing analog pointer's 3000 RPM display clamp was not retuned. These are
current-runtime wiring observations, not accepted real-aircraft performance.

Author's bounded after-fix manual observation uses the actual app/Worker, with
optional scenery pixels/empty vector geometry as fixtures. Reviewer read the
ignored diagnostic and JSON, and visually inspected the map-start and manual-
pause screenshots. At 1440×1000 in Chrome 156.0.8078.80, with the top menu hidden:

- New paused map start: marker and enabled Start card visible; native step 0.
- Clicking visible Start: step advances to 64 and marker is hidden.
- Subsequent manual Pause: marker visible, large Start card hidden; step 83.
- Review: marker hidden; the native worker stays at step 83.

The short paused observation records identical step, digest and full native pose,
with no page errors. Computed marker pointer events are `none`; the desktop badge
is inside the viewport. This is manual diagnostic evidence, not a newly authored
test suite or an independently executed reviewer browser test. No tests were
added or run by the reviewer for this reversible UI change. The integrator reports a successful production build, recorded in the frozen
snapshot packet below.

Narrow/mobile geometry, actual screen-reader announcements and initialization/
fault/collision marker snapshots were source-reviewed only, not measured in this
manual capture. The diagnostic recreates matching paused UX; it does not recover
the user's exact earlier session. Current WASM build provenance remains separately
unverified (`11a92…` actual versus `4fe24…` build record). No aircraft fidelity,
full CI or publication acceptance follows.

## Frozen identity

Final historical snapshot packet
`output/flight/osm-pause-task138-140-packet.json`, SHA-256
`9f70cc7ae2a52161ea6fd6e17de73834c7de64e9053d6deedf0bf03771976c34`:
all **19 pins independently audited**. Repaired main/style are preserved as
`output/flight/pause-marker-task140-main.ts` and
`output/flight/pause-marker-task140-style.css`, byte-identical to the source
identities below. This is the delivered task-140 snapshot; later world-detail or
flight-plan UI work is outside this review.

Before-fix diagnostic packet `output/flight/rpm-response-usa-packet.json`:
SHA-256 `6a65b84c22253cc622d6ec02e557e3612e6b9cc5523748241e972ec7fe766758`;
all ten contained artifact pins independently match. Its earlier main hash is a
historical diagnostic snapshot, not the repaired source identity below.

| Path | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `f51923fa3ee52ac7ddbd6655e68c68b287edd44e7500f72858375ea70e350ae3` |
| `app/src/style.css` | `15275cf2bac223944f9f2dc2e601d247b760e7695224746ef7a9a535255e53d9` |
| `docs/input/2026-11-05-paused-marker.md` | `5cc76e9cd88088808ed4faeb9ac4bcdb683b384d289166a0017e0232706b77ba` |
| `output/flight/pause-marker-after140-observations.json` | `06c3aea999628af40d75dbd23886f498b04bb78d8195ccb561b703104402987a` |
