# OSM terrain relief

The 3D vector map is draped over rendered elevation. Cesium 1.146 custom heightmap terrain does not provide vertex normals, so globe lighting alone cannot shade local terrain faces. The proposed renderer derives faceted face direction from fragment position derivatives and applies bounded neutral darkening over vector imagery, with a fixed local light direction. This is illustrative slope shading, not cast shadows, a weather observation or a terrain accuracy claim.

Enable only for vector scenery with terrain; omit it for photographic and flat-ground study views. Check fragment derivatives and highp range before use and fall back to unshaded imagery on unsupported contexts or shader failure. Preserve source, cartography, tile loading, physics and native state.

A controlled GPU ridge, a rendered Hessen view with synthetic OSM tiles, mode changes, camera orientation, paused state and tile requests provide bounded verification. Synthetic imagery does not establish real OSM label legibility; WebKit and background/live flight must be assessed separately. Source: installed Cesium 1.146 and [CustomHeightmapTerrainProvider documentation](https://cesium.com/learn/cesiumjs/ref-doc/CustomHeightmapTerrainProvider.html).
