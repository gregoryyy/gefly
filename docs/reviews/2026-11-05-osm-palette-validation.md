# OSM palette validation

Reviewed 2026-11-05 13:30 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO 2.0.138;
bounded R-WORLD-11. **Pass for source-level palette acceptance; visual appearance
and readability remain not evaluated.** Cross-provider peer pending.

Read the [raw request](../input/2026-11-05-darker-osm-palette.md) and current
R-WORLD-11 palette criterion. This review covers the frozen, label-free
`world-map-style.ts` snapshot SHA256
`c8c57f112272333fc2a54a2e5f99c318e85ae76f0fb121bc9e51640df90938bf`.
Later TODO 2.0.139 label changes require separate acceptance.

| Criterion | Inspected evidence | Result |
| --- | --- | --- |
| Darker natural palette | Paint values use muted forest/grass/field/built-up colors, dark teal water and subdued roads. Replacements reduce RGB components relative to the prior palette. | pass by source inspection |
| Shared 2D/3D use | Practice map consumes `worldMapLayers()`; the world-profile terrain rasterizer consumes `createWorldMapStyle()`, which uses the same layers. | pass by source inspection |
| Preserve structure and behavior | Reverting only paint literals reproduces the prior source hash `4bcedc95abcafc5d86c8280059075eb40eb8a40391603b30f9e571cc54b75baa` exactly. IDs, geometry, order, source/network declarations and credits are unchanged in this snapshot. | pass |
| Actual appearance, road legibility and user preference | No reviewer screenshot/browser exercise was performed. Color constants alone do not establish rendered readability. | not evaluated |

Input SHA256: `384e82e76cbf95ddd7d3b93b069af5c96d9c87b3c149b5a6314f6958f60d7da0`.
Read SPEC SHA256: `5a8bb6364c3fbb964b71a7623f0d99169c2d81fd332396d44d777d024168b57d`.
Only this report was written; no new tests or runtime checks were added. No
blocking source finding remains. This historical snapshot review does not
accept the subsequent labels feature, navigation accuracy or physics.
