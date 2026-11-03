# Streamed Rhein-Main public terrain

This bounded package covers **8.25–10.00°E / 49.25–50.75°N**, including
Darmstadt, Odenwald and Spessart. It is a broad-relief extension around the
[finer Hessen package](../README.md), not full EDDF/100 NM or global terrain.

`manifest.json` declares **42 tiles**, seven columns by six rows at **0.25°**.
Each tile has **129×129 geographic point nodes**, row-major south→north and
west→east. Every node stores two little-endian float32 values: physical
**DHHN2016 normal height H**, then **GCG2016/2023 quasigeoid anomaly ζ**. Each
tile is 133,128 bytes; all height assets total 5,591,376 bytes. The native engine
receives H; Cesium displays H + ζ with shared SW–NE triangle interpolation.

The worker loads only the current surrounding 3×3 set, at most nine tiles, and
installs complete tiles between fixed physics steps. It pauses when that set
must change, preserving the aircraft state; explicit pause/stop cancels automatic
resume. Missing/corrupt data or leaving the physical coverage stops flight,
without zero-height or stale-height substitution. Rendering retains visited
tiles, at most 42, to display recorded Review without restoring native physics.

The finer Hessen surface takes priority in its interior. Within a **0.02° inward
band** from its nearest edge, native and renderer apply the same smoothstep
fine/coarse blend and derivative correction. This is a derived transition,
not a surveyed boundary or additional physical detail.

## Provenance, fidelity and rights

Physical source: BKG DGM200, source **EPSG:25832**, **200 m** grid, DHHN2016 normal
heights. Source surveys date approximately **2000–2019**. It is not a surveyed
runway surface, obstacle model or current airport dataset. Finer display meshes
interpolate the same data; they do not turn the source into 1 m measurements.

Credit: **© GeoBasis-DE / [BKG](https://www.bkg.bund.de) (2026), Daten verändert**,
[DL-DE-BY-2.0](https://www.govdata.de/dl-de/by-2-0).
[Product](https://gdz.bkg.bund.de/index.php/default/digitales-gelandemodell-gitterweite-200-m-dgm200.html),
[documentation](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/deu/dgm200.pdf).

Quasigeoid source: **© Bundesamt für Kartographie und Geodäsie (2026)**,
GCG2016/2023 West, [CC BY 4.0](../../../../LICENSES/CC-BY-4.0.txt), with the
original [source](../BKG-SOURCES.pdf) and [attribution](../BKG-CC-BY-NOTICE.pdf)
notices retained. No source ZIP/GeoTIFF is bundled. Source-specific terms remain
separate from original Gefly GPL-3.0-or-later code; no endorsement is implied.

| Input | SHA-256 |
| --- | --- |
| DGM200 ZIP | `db82ad95da97bf9b8a5b4eab7aa856cd6f67bb0caaec551d21d12c7807ab3216` |
| Extracted `dgm200_utm32s.tif` | `2921c7f92b970bb115ce94d6d19eb42a7735ca8c60b176660567dd1ffb62cd1f` |
| GCG West ZIP | `16b2f09996aee74eaa647fde4b7724ade17e384be534f38d23d9d229f30520c3` |

The manifest retains source URLs, licenses, compiler hash and every derived tile's
byte count/hash. Changes: exact geographic-to-source PROJ coordinates,
source-pixel-centre bilinear DEM interpolation on one shared lattice, bilinear
GCG sampling, common-edge tile slicing and float32 conversion. Shared border
nodes come from the same lattice values rather than independent tile warps.
Interpolation and survey uncertainty remain separate from binary integrity.

## Reproduction

From the repository root, install the
[pinned authoring dependencies](../../../../utils/terrain/requirements.txt) into
a temporary environment. Download the exact two source URLs from `manifest.json`,
then run:

```sh
python utils/terrain/build_regional_terrain.py \
  --dem /path/to/dgm200.utm32s.geotiff.zip \
  --geoid /path/to/quasigeoid.geo89.w.zip \
  --output app/public/terrain/region
```

The compiler rejects changed source hashes, unsupported source CRS/NoData,
missing DEM/GCG coverage and non-finite output. Runtime validates the manifest,
exact tile matrix, dimensions, bytes and SHA-256 before use. GIS libraries and
source-service downloads are authoring dependencies, not runtime flight inputs.
