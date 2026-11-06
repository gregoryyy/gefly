# Speed-overlay validation

2026-11-05 22:09 Europe/Berlin. Independent validate; no implementation or reviewer browser execution.

**Bounded pass** for [R-SIM-9](../SPEC.md). Isolated Chrome156 component evidence uses production CSS and `createFlightAssists`:

| Criterion | Observed | Outcome |
| --- | --- | --- |
| Above open/closed map, desktop/narrow | SIM10×/REPLAY2× visible at1440/390px; overlay7>map6 | Pass |
| Pointer pass-through; menu/dialog priority | Map receives clicks; pointer-events:none; topbar8/dialog above badge | Pass |
| Preserve placement | Source changes only z-index3→7; positioning unchanged | Pass |

Narrow screenshot independently viewed. Root CSS is identical; root full-app runtime, native dynamics and WebKit were not evaluated. CI passed with9/23optionalJSBSim+1Linux-only skips (unaccepted);469Node+22Python/85assurance/11training passed. Peer pending. No fidelity acceptance.

CSS SHA-256: `e51a27961b1574ee91198f8520c41b83c8bf08826c5c43b3daf55c2eaa9116f9`.
Local-only `output/flight/speed-overlay-browser.json`: `957f195cf051e33c9fdc4c8bde8e330628cd75683ca2224b7704dbb868e303ee`. Ignored evidence requires local retention; no new permanent tests.

Local-only `output/flight/speed-overlay-ci.log` SHA-256: `de151c0ffa223535fc9752740a32d5857221ce4080c496ddb565bb1963ed0d56`.
