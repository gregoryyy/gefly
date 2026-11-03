# Rhein-Main orthophoto pyramid

723 local XYZ/Web-Mercator JPEG tiles, 512 pixels square, with 70,489,589 derived
bytes (67.2 MiB). Geographic footprint: 8.48–8.80°E / 49.93–50.12°N. Levels 10–14
cover the footprint; level 15 adds detail around Frankfurt airport, its eastern
approaches and Egelsbach. Near50°N, level 14 has approximately 3.07 m ground pixels
and level 15 approximately 1.54 m. The separate Egelsbach overlay remains approximately
0.75 m. These are output sampling sizes, not surveyed positional accuracy.

Source: Hessen HVBG ATKIS DOP20, WMS `he_dop_rgb`, under
[DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
Source capture dates are **unknown**. This is visual scenery, without current
airport/runway, navigation-chart, building or obstacle acceptance.

Modifications: WMS reprojection/resampling to EPSG:3857, north-down 512px cropping,
optimized JPEG quality 85 re-encoding. `SOURCES.json` identifies all 200 raw source
groups, their exact requests, grouping span and byte hashes. `manifest.json`
identifies every derived tile/hash and binds the source record. Source native
20 cm photography does not make these 1.5–3 m outputs 20 cm data.

[Offline compiler/reproduction](../../../../utils/imagery/README.md) and
[source/rights research](../../../../docs/research/2026-11-03-regional-textures.md).
Run `python3 utils/imagery/compile.py --verify` to validate the full package locally.

Only view-requested tiles load during flight, from these local files. A missing
finer tile uses the correct ancestor subrectangle. Coarse/relief fallback stays
beneath the pyramid; image changes never alter terrain heights or dynamics.
