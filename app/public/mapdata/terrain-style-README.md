# Label-free terrain cartography

`terrain-style.json` adapts the official basemap.de Web Colour style for terrain
imagery rendering. It is cartographic map material, not an aeronautical chart,
aerial photograph, surveyed airport surface or a navigation database.

- Upstream: [BKG bm_web_col.json](https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json), style version **6.0.0**.
- Retrieved: **2026-11-04**.
- Upstream SHA-256: `45aacf6ac3b391e360a3d73e7f4f79eeefe32f2f7dd92527595cfffe2e1bca00` (501,800 bytes).
- Derived SHA-256: `f6ed255e627a3dbc74dcb0a27cc982c75872c20a31d5c7815b717ac5c150b048` (174,559 bytes).
- Original material: **© GeoBasis-DE / BKG (2026)**,
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  [Official terms](https://sgx.geodatenzentrum.de/public/gdz/lizenz/deu/nutzungsbedingungen_basemapde.pdf)
  explicitly cover Web Vektor; the [product page](https://basemap.de/produkte-und-dienste/web-vektor/)
  describes style customization. [BKG](https://www.bkg.bund.de) and license links
  accompany the persistent visible source credit.

The adaptation removes all 210 symbol layers and all three fill-extrusion layers,
retaining 283 line, 67 fill and ten circle layers. Labels/glyph loading and 3D
extrusion are absent; the rock fill-pattern sprite remains. The native style's
colors, filters, source-layer names and surviving layer order are retained.
Transition duration/delay are zero. This style is rendered onto terrain, rather
than supplying building geometry or changing physical elevations.

The source `smarttiles_de` uses only `/scenery/vector/{z}/{x}/{y}.pbf`, zoom 0–15
and the Germany coverage rectangle `[5.8, 47.2, 15.1, 55.1]` degrees WGS84. The
sprite root is `/scenery/vector/sprite`; there are no direct external resource
URLs in the bundled style. The server forwards only those canonical routes to
the fixed official `gdz_basemapde_vektor/tiles/v2/bm_web_de_3857` and
`gdz_basemapde_vektor/sprites/v2/bm_web_col_sprite` paths. Authentication,
provider URLs, arbitrary query parameters and filesystem paths are not accepted.
Vector tiles/sprites are fetched during use, not bundled here. Their service
edition can change; a pinned style hash does not pin the live feature database.

Reproduction: start with the hash-verified upstream JSON; remove `glyphs`;
replace name/metadata with the recorded derivation, source and sprite routes;
set transition duration/delay to zero; retain only `background`, `fill`, `line`
and `circle` layers, setting any per-paint transition duration/delay to zero;
serialize as UTF-8 with `ensure_ascii=False`, compact comma/colon separators and
a final newline. The checked-in constant and unit test bind the exact derived
bytes. Review a new source/style version before updating this pin.
