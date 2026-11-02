# Bundled public Hessen terrain

The normal flight uses a versioned local height package from **8.45–8.90° E,
49.85–50.35° N**: Egelsbach, Frankfurt and part of the Taunus. This is a bounded
prototype, not the entire EDDF/100 NM region.

`edfe-taunus-v1.json` records the source requests, editions, raw/derived hashes,
build versions, interpolation and limitations. `edfe-taunus-v1.f32` is
1,025 × 1,025 point nodes, row-major south→north and west→east, with two
little-endian float32 channels per node: physical **DHHN2016 height H**, then
**GCG2016/2023 quasigeoid anomaly ζ**. Native dynamics receives H only. The
renderer receives h = H + ζ, using the same SW–NE triangles. Zero is not a
substitute for missing data. Coverage exits stop flight; flat landing studies
are a separate explicit profile.

The physical source is Hessen HVBG's `he_dgm1_32`, the official approximately
32 m overview of DGM1. Resampling produces approximately 32–54 m geographic
node spacing. The package is not native 1 m DGM1, a surveyed runway surface,
an obstacle model, current airport information or a validated training model.
Recorded Review retains the selected height convention and ground observations.

## Rights and changes

Physical source: Hessen HVBG, [DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0),
via its [official elevation service](https://inspire-hessen.de/raster/dgm1/ows?SERVICE=WCS&VERSION=2.1.0&REQUEST=GetCapabilities).

Quasigeoid source: **© Bundesamt für Kartographie und Geodäsie**, GCG2016/2023,
retrieved 2026, [CC BY 4.0](../../../LICENSES/CC-BY-4.0.txt),
[product/source](https://gdz.bkg.bund.de/index.php/default/quasigeoid-der-bundesrepublik-deutschland-quasigeoid.html).
The original [data-sources notice](BKG-SOURCES.pdf) and [attribution notice](BKG-CC-BY-NOTICE.pdf) are retained.
Changes: regional extraction, geographic DEM resampling, regional bilinear
quasigeoid sampling, and interleaved float32 conversion. The combined derived
data retains this attribution and CC BY 4.0 terms; the DEM source separately
remains DL-DE Zero 2.0. No endorsement is implied. The original source ZIP and
GeoTIFF are not bundled; exact source URLs/hashes are in the manifest.

## Reproduction

Install [the pinned authoring dependencies](../../../utils/terrain/requirements.txt)
in a temporary environment. Fetch the exact source URLs in the manifest and run:

```sh
python utils/terrain/build_public_terrain.py \
  --dem /path/to/region-native.tif --geoid /path/to/quasigeoid.geo89.w.zip \
  --output app/public/terrain
```

The compiler rejects changed source hashes and missing DEM/quasigeoid nodes.
The geographic point-node registration uses the returned TIFF's actual affine
transform and pixel centers, rather than assuming requested crop corners equal
sample centers. Runtime loading verifies dimensions, datums and binary SHA-256.
No GIS library, API key or public server request is required while flying.
