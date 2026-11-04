# Label-free public cartography for terrain

Retrieved 2026-11-04 by Codex `glide_housekeeping`. Scope: reuse real map
cartography across the active terrain region, without baked labels. This source
investigation does not establish rendering correctness or global scenery coverage.

## Source choice

The existing BKG TopPlusOpen WMS serves raster maps with labels already baked
into their pixels. A live
[GetCapabilities request](https://sgx.geodatenzentrum.de/wms_topplus_open?service=WMS&request=GetCapabilities)
returned HTTP 200 and advertised only `web`, `web_grau`, `web_scale`,
`web_scale_grau`, `web_light`, `web_light_grau`, each with the same default style.
No label-free layer/style was advertised. The basemap.de raster WMS likewise
advertised color/gray layers, not a separate text-free rendering. This does not
justify erasing raster text or claiming that a reduced-content style has no labels.

The official [basemap.de Web Vektor product](https://basemap.de/produkte-und-dienste/web-vektor/)
provides Germany-wide vector cartography and explicitly supports MapLibre and
customized styles. Its
[color style](https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json)
can retain existing fills, lines and circles while omitting symbol layers. The
three extrusion layers are disabled in the retrieved source; ordinary 2D building
fills remain. This is official basemap.de cartography, **not pixel-identical
TopPlusOpen styling**, and not invented scenery. Use this full regional map in place of the small EDFE-only vector-land overlay
as the terrain texture source.

## Actual endpoint probes

The requests below returned HTTP 200 with `Access-Control-Allow-Origin: *`.

| Resource | Observed result |
| --- | --- |
| Color style | 501,800 bytes; style version 6.0.0; 573 layers: 67 fill, 283 line, 10 circle, 3 hidden extrusion, 210 symbol |
| [Base TileJSON](https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/bm_web_de_3857.json) | Native zoom 0–15; XYZ scheme; bounds 5.8–15.1°E, 47.2–55.1°N; description says created 19 October 2026 |
| [Tile 14/8584/5562](https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/14/8584/5562.pbf) | 11,543 bytes at the test point 49.9116°N, 8.6348°E, south of the EDFE extract; nonempty PBF response, not yet a rendered-image acceptance |
| Color sprite JSON / PNG | 9,166 / 28,937 bytes; patterns remain needed by retained fill layers |

Color-style SHA-256:
`45aacf6ac3b391e360a3d73e7f4f79eeefe32f2f7dd92527595cfffe2e1bca00`.
The sampled PBF SHA-256 was
`3b2a1d6c5efc51b89d416c262c51fddcaeddd64a83828cb153390e215e198a6d`.
These identify observations, not permanent service versions; the service updates.

The runtime can use a fixed HTTPS host/path allowlist beneath
`sgx.geodatenzentrum.de/gdz_basemapde_vektor/`. Retained style patterns need sprites;
removing all symbol layers removes the text/glyph requirement. Honor TileJSON's
native maximum zoom and overzoom its vector geometry rather than requesting
nonexistent higher-native-zoom tiles. Bound concurrent rendering/cache resources,
show failures and preserve physical elevation independently of visual texture.

## Rights and attribution

The official [basemap.de usage terms](https://sgx.geodatenzentrum.de/public/gdz/lizenz/deu/nutzungsbedingungen_basemapde.pdf)
cover Web Vektor under CC BY 4.0, with DL-DE-BY-2.0 offered as an alternative.
The terms permit adaptation and require visible attribution plus an indication
of changes. For this use, retain a visible linked credit such as:

© GeoBasis-DE / [BKG](https://www.bkg.bund.de) (2026),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · labels omitted;
rendered on terrain.

The data license remains separate from Gefly code. Existing credits for imagery,
airport geometry and OSM airport detail remain applicable to their own layers.
This investigation does not authorize aircraft-data redistribution or establish
operational charts, navigation currency or obstacle/landing fidelity.
