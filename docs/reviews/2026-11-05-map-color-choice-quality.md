# 2D map color choice quality review

Reviewed 2026-11-05 15:23 Europe/Berlin by Codex quality, independently of the
Codex implementation authors. TODO2.0.144 / R-WORLD-6 and R-WORLD-11; scoped
working tree based on `700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded review: no blocking findings.** Only this assigned report is
written. Specification validation is separate; cross-provider peer remains pending.
The [clarified user request](../input/2026-11-05-map-color-choice.md) selects a
2D light/dark flag while the 3D terrain keeps its darker palette.

The shared style uses explicit `original` and `terrain` paint palettes over the
same 49 layers, source geography, labels, filters and placement. There is no
pixel/HSL/tile or photography conversion. Original denotes the offered light
cartography, not a claim of reproducing an upstream rendered OSM style exactly.
`createWorldMapStyle()` retains its dark default for the 3D renderer. No source,
glyph/font service, sprite, provider or dependency is added; existing credits,
resource bounds and inert source-name handling remain.

`practice-map.ts` supplies a labeled native checkbox (`Dark map`), defaulting off,
with an explicit 2D-only tooltip and visible keyboard focus styling. Its change
path updates paint on existing world-layer IDs, without recreating the map or
changing the camera, source, route/fix store, Aerial visibility or native commands.
The existing interaction release boundary remains. Disposal removes the listener.
Main restores the choice before map construction and persists it through the same
view-preference helper. No color callback reaches the 3D scene.

The optional fourth field in the existing version-one preference is a two-value
enum. Legacy profiles default to light. An invalid optional scheme preserves valid
terrain/landmark choices; bad base/version/unknown keys default safely. The
256-byte UTF-8 limit precedes parsing. Save copies only display fields, samples
getters once, supports legacy callers and rejects an explicit invalid scheme.
Denied storage does not prevent display changes. Options retains its terrain
preview/cancel/Save behavior and includes the unchanged color choice in writes;
this integration was reviewed by source, not a new Options browser run.

Reviewer ran the existing style tests (**2 passed**) and preference tests
(**8 passed**), zero skipped, plus installed MapLibre schema validation for each
palette (**49 layers, zero errors each**). No new palette/pixel tests or reviewer
browser were authored. The original review checked all 17 source/evidence pins in
the UI freeze and both source/baseline pins in the palette packet. At final
integration **16 of the 17 UI pins remain available**: root accidentally overwrote
`output/flight/map-colors-task144-unit.log`; its original
`fcb4865539bff0c0fd6647986434a2dd6ed9627f09b6b9263c6f82d50cf2b47a`
bytes were not recovered. That historical packet is retained unchanged, with this
pin unavailable rather than reconfirmed. The replacement
`map-colors-task144-unit-renewed.log` records eight passing preference tests on the
same source. Reviewer checked that log and all **21 current integrated-packet
pins** against bytes. The integrated suite records **537 Node + 22 Python tests
passed, zero failures/skips**, and production build passed in 6.90 seconds.
This correction changes evidence availability, not the production review outcome.
The corrected README/app help describes the actual Dark map checkbox, off/light
default and on/dark behavior; reviewer read both.

Author's ignored observational copy of the existing focused world fixture,
process66551, completed **exit 0 / two existing groups**, Chrome156.0.8078.80.
Reviewer read the script/JSON and inspected all four USA/UK paired screenshots.
Actual New York and London street views retain readable names/detail in both
palettes, the same camera, 63 layer IDs, 10 source IDs and rendered name sets
(47 USA, 38 UK). The Dark map checkbox changes the current paint and saved enum;
both dark and light reloads restore the corresponding flag/paint Paused at native
step zero. Aerial visibility stays selected across palette changes; existing
paused native step/digest/final-state invariance checks pass. Fresh real texture-
provider observations retain dark New York/Tokyo/London cartography separately
from the 2D choice; this is component evidence, not a new 3D maneuver matrix.

The existing preference browser fixture's schema and obsolete AP-reset expectation
were adapted to the separate acknowledged AP persistence from R-AP-3. Reviewer
read those expectations; author reports syntax passed, but its full four-group
run was not repeated. Photo pixels are transport fixtures in the focused app
observation, so unchanged Aerial selection is not a new photography-quality claim.
No narrow-device, screen-reader, performance, worldwide readability or full CI
matrix ran. No physical terrain, AP/recording semantics, native/model retuning,
aircraft fidelity or native-build provenance acceptance follows.

## Frozen identity

| Path | SHA-256 |
| --- | --- |
| `app/src/world-map-style.ts` | `3fee32d77e440ffa435fce7768dc29bdb6b16c1c657755eb614fb079a75081d8` |
| `app/src/practice-map.ts` | `b6a512f4b8ba07bb0177dcbe15e0e3b333b120fbda7b0c825a805afa4643f914` |
| `app/src/view-preferences.ts` | `6c8053fa1fee76f5a1c2cb64bbc7555e519cbda42d7cf88142712035cd7a4b9b` |
| `app/src/main.ts` | `724575064bf8864f400d65fc210301fdb5e890b674d55b7862bdf05e58fe2aca` |
| `docs/SPEC.md` | `c3e944feb89f00a786f8b3b19e95720a4b76886585d9816dcf37f0ed36e0b069` |
| `docs/input/2026-11-05-map-color-choice.md` | `e65121d966fef80b6e2874531c0dcf1d1d44e59a1f9d46102907c1bacff3fb8f` |
| `output/flight/world-map-palettes-task144-core-packet.json` | `8cd25e0050b95a7df108cb36dcddddc8e5443357cbb8b042d6563c2f2f228242` |
| `output/flight/map-colors-task144-freeze.json` | `fdadbdef96b988895683350d7e5ced81ebcf4ba0492eb03b5cd00dc035520f2c` |
| `output/flight/map-colors-task144-integrated-packet.json` | `43d8b8cec207e73f047ee4e0894b6b76c8c5a22ba94f96767ac67e9a990cf35f` |
