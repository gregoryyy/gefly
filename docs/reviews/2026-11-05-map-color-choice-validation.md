# Map color choice validation

Reviewed 2026-11-05 15:23 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.144;
R-WORLD-6/R-WORLD-11. **Pass for bounded 2D palette-choice acceptance.**
Cross-provider peer pending.

Read the [clarification](../input/2026-11-05-map-color-choice.md), frozen
SPEC/ARCH/SEC and applicable project/role rules. Inspected style, preference,
map/main routing, tests, browser observations and manual probe source.
Independently viewed all four paired street screenshots and fresh dark terrain
texture composite. No reviewer browser or acceptance suite was launched;
only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| Light default and explicit dark choice | Fresh map initializes Original/light; the labeled native Dark map checkbox selects terrain/dark when checked. Actual menu interactions at New York and London zoom14 produce the corresponding checked state, background paint and saved enum. Source supplies normal keyboard checkbox semantics. | pass; keyboard-only traversal not evaluated |
| Explicit vector paints; no color conversion | Both palettes share49 world layers. Independent read-only evaluation found82 differing color leaves, all under paint color properties, and no other output differences. Current dark `createWorldMapStyle()` output exactly equals the frozen pre-change style. No pixel/HSL/tile or photograph conversion is introduced. | pass |
| Preserve cartography, camera, overlays and native state | Paired observations retain identical center/zoom,63 map layer IDs,10 source IDs and rendered name sets:47 New York and38 London. Screenshots show the same roads/buildings/names in visibly light/dark palettes. The probe verifies native step, digest and final state remain equal during paused menu interactions. Route/source objects are retained by paint-only updates; populated-route runtime preservation was not exercised. | pass within observed scope |
| Keep Aerial and 3D independent | Actual Aerial visibility remains visible with either choice. The world-profile 3D provider still constructs the unchanged dark default; a fresh real provider composite shows dark named NY/Tokyo/London tiles. The checkbox only reaches the 2D map. | pass by source and component/manual evidence |
| Persist and restore safely | Both actual reloads restore checked/terrain or unchecked/original with matching paints, Paused at native step0. Eight renewed preference-unit groups cover legacy defaults, invalid optional color retaining good base choices, bad base/version/unknown-key defaults,256 UTF-8-byte rejection, denied storage and canonical copied writes. | pass |
| Preserve Options preference handling | Main loads before map construction and includes the current color in every display-preference save. Existing preview/cancel behavior remains in its prior handler. The older preference-browser fixture was adapted and syntax checked, without executing its full matrix. | pass by source; renewed Options runtime matrix not evaluated |

The integrated packet (`output/flight/map-colors-task144-integrated-packet.json`, ignored local evidence)
SHA256 is `43d8b8cec207e73f047ee4e0894b6b76c8c5a22ba94f96767ac67e9a990cf35f`;
all21 current pins independently match. Style source is
`3fee32d77e440ffa435fce7768dc29bdb6b16c1c657755eb614fb079a75081d8`;
core packet is `8cd25e0050b95a7df108cb36dcddddc8e5443357cbb8b042d6563c2f2f228242`.
The browser freeze `fdadbdef96b988895683350d7e5ced81ebcf4ba0492eb03b5cd00dc035520f2c`
retains one unavailable original unit-log pin after an accidental integration
overwrite. That historical log is not confirmed evidence. The packet explicitly
records the correction; renewed eight-group and integrated logs replace it.

Focused browser run66551 exits0 with two existing groups plus the bounded manual
observations above, Chrome156.0.8078.80. These are not new palette pixel tests.
Both49-layer styles have zero recorded MapLibre schema errors; existing two
style units, final537 Node +22 Python units and production type/build pass,
zero skips/failures. Build took6.90s.

Regional raster transport uses image fixtures; Aerial visibility is not real
photograph-quality acceptance. Running-flight, Review, narrow-screen and broader
browser/device palette interactions were not evaluated. No new physics,
worldwide source completeness, aircraft fidelity or training acceptance follows
from this display change. No blocking implementation finding remains.
