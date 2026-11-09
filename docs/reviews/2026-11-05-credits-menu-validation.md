# Credits menu validation

Reviewed 2026-11-05 15:40 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.145;
R-UX-2/R-WORLD-11. **Pass for the bounded attribution-menu increment**, with
the runtime limits below; cross-provider peer pending.

Read the [request](../input/2026-11-05-credits-menu.md), frozen criteria and
applicable project/role rules. Inspected main/scene/CSS and the supplied manual
probe/JSON; independently viewed desktop,620px and390px screenshots. No reviewer
browser, new tests or source changes; only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| Beside brand; remove scene footer | Actual screenshots show Credits beside gefly; the real scene has zero `.cesium-widget-credits` descendants. Main supplies the menu host to `createScene`; standalone callers retain the old fallback. | pass |
| Preserve full live provider attribution and links | The same Cesium credit display renders directly into the external host, without a copied/static replacement list. Independently reversing only host/positioning changes reconstructs the prior scene SHA256 exactly, proving provider text, links and registration paths unchanged. Actual menu contains Cesium, OSM, terrain/BKG and OpenFreeMap/OpenMapTiles links; later narrow screenshots show additional photography credits arriving live. | pass by source and observed content |
| Keyboard and dismissal | Actual Escape closes and focuses its summary; Enter reopens; opening View closes Credits. Corrected outside clicks at y700 close at both620px and390px. An earlier390px click inside the taller menu correctly preserved it; this observation remains historical. | pass |
| Flight shortcut guards | In the ready Paused app, A leaves the visible AP control disengaged and `=` leaves the displayed rate unchanged. Main and flight-assists now guard all open top menus and visible Cesium credit popups. An interior native-popup click preserves the parent by source inspection. The auxiliary opener is hidden with current inline credits, so popup interaction was not executed. | pass for menu/source guards; native-popup runtime not evaluated |
| Readable bounded content | Viewed renewed screenshots have readable wrapped text and underlined links. Menu bounds are inside both narrow widths: x11–609 at620px and x11–379 at390px; document scroll width equals viewport. Renewed390px header controls fit. CSS provides bounded height, overflow scrolling, wrapping and responsive anchoring. | pass for observed layouts; forced-overflow scrolling not evaluated |

Frozen source SHA256:

- main: `969f0426c3f28a8f32f433d7b652b678b992e745dd599d0c8152bedb094ce978`
- scene: `4fa627df5ac0b7554a259ae09df5669aaec70fd4838de758e6a0d32a382d803a`
- CSS: `35302e486becb60e54af1f60843cd80069b6587db9c86d720baa7a75bf2a8309`
- flight-assists: `0a091586d26e5dbf886dc6bbd5e597b6a478d579e9f57b7576bc7c23ff78f157`

The final packet (`output/flight/credits-task145-packet.json`, ignored local evidence) SHA256 is
`d5e0e9450a6bad7b536a9b9f0c636ad6a043256ba355624e6480b47619baa499`;
all17 current pins independently match. Final manual observations exit0,
errors=[]. Hidden-topbar and hidden auxiliary-opener timeouts remain preserved;
neither is a successful popup measurement. Final537 Node +22 Python units,
type checking and production build pass, zero skips/failures; build took38.92s.

Renewed desktop and narrow screenshots show the ready Paused app. No active
flight/native-state invariance, screen-reader, external-link navigation or
complete provider/mode-transition matrix was executed. This bounded layout check
does not establish a complete device/accessibility matrix. No aircraft,
licence-law or training acceptance is implied; no blocking implementation
finding remains.
