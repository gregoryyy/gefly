# Worldwide map and terrain fallback sources

Researched 2026-11-05 11:55 Europe/Berlin by Codex
`/root/resize_housekeeping` for TODO 2.0.135. This is source/transport research,
not acceptance of a physical terrain provider, hosting choice or global landing
fidelity. It extends the [earlier global survey](2026-11-03-global-scenery.md).
The follow-up [Swiss/Austrian source note](2026-11-05-swiss-austria-terrain-sources.md)
records compatible national DEM/map candidates and their datum/edition limits.

**Subsequent implementation choice:** the orchestrator selected a bundled,
one-degree NOAA ETOPO 2022 Ice Surface / EGM2008 baseline with a separate NGA
geoid and Natural Earth ocean mask. Its [asset documentation](../../app/public/terrain/world/README.md)
records the actual derivation and limits. The Terrarium candidate investigated
below was not selected as the live physical fallback; its mixed-datum and
service-dependency caveats remain historical research findings.

## Separate cartography and height

[OpenFreeMap](https://openfreemap.org/) offers worldwide OSM-derived vector
cartography without accounts or API keys. Its public instance has no stated
view/request cap or SLA. The existing label-free MapLibre path can reuse its
map data outside the German BKG coverage; this does not itself supply continuous
physical terrain elevations. OpenStreetMap's
[data licence](https://www.openstreetmap.org/copyright) is ODbL, independently of
application/source-code licences. Retain visible linked OSM/OpenMapTiles credits.

The [service terms](https://openfreemap.org/tos/) provide no accuracy/availability
warranty and distinguish interactive display from bulk collection. The offline
exception is at most 3000 tiles or 50 MB, four parallel requests and an identified
User-Agent. This task did not crawl tiles or choose self-hosting.

## AWS Terrain Tiles candidate

The [AWS open-data registry](https://registry.opendata.aws/terrain-tiles/)
describes a public global terrain-height mosaic managed by Mapzen. The provider's
[service documentation](https://github.com/tilezen/joerd/blob/master/docs/use-service.md)
lists the no-key endpoint
`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
These S3 Terrarium tiles are 256 pixels square; the old keyed Mapzen service URL
is a different endpoint. Bucket versioning is documented. A production SLA was
not established.

The [format](https://github.com/tilezen/joerd/blob/master/docs/formats.md) is
RGB PNG, metres, Web Mercator, decoded as `R*256 + G + B/256 - 32768`.
That fractional encoding is not a height-accuracy claim. The
[producer](https://github.com/tilezen/joerd/blob/master/joerd/output/terrarium.py)
reserves red channel zero as no-data: reject it rather than installing a
-32768 m surface. Web Mercator excludes polar caps beyond approximately
85.05113 degrees latitude; clamping requests there does not establish polar
ground coverage.

[Source documentation](https://github.com/tilezen/joerd/blob/master/docs/data-sources.md)
lists GMTED at coarse zooms, SRTM and national DEMs at finer zooms, and ETOPO1
bathymetry. Resolution varies by source/latitude/zoom; requesting finer tiles
does not create surveyed detail. Negative terrain values can be bathymetry or
below-sea-level land, so they cannot alone identify a water surface. Water
handling needs its own explicit policy.

The [attribution register](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
lists source-specific credits and terms, including USGS/NOAA public-domain data,
CC BY and national open-government licences. It is not one blanket Mapzen/MIT
data licence. Preserve applicable source credits and modifications in the asset
inventory/notices; source code licensing does not replace data obligations.

## Vertical reference and geoid options

Terrarium's format section establishes metres and horizontal EPSG:3857, but
does not establish one normalized vertical datum for its multi-source mosaic.
The explicit EGM96 statement is under the separate Skadi HGT section. Inspection
of the public [compositor](https://github.com/tilezen/joerd/blob/master/joerd/composite.py)
shows source-SRS reprojection/compositing, not an explicit universal vertical
normalization. A uniform EGM96 interpretation of all Terrarium tiles therefore
remains an approximation requiring disclosure, not a verified datum fact.

NGA publishes [global gravity/geoid models](https://earth-info.nga.mil/geograv).
The official [PROJ-data NGA register](https://cdn.proj.org/us_nga_README.txt)
marks its converted worldwide grids Public Domain and describes physical-height
to WGS84 ellipsoidal-height conversion:

| Grid | Spacing | Observed HTTP size |
| --- | --- | ---: |
| [EGM96](https://cdn.proj.org/us_nga_egm96_15.tif) | 15 arc-minutes | 2,710,815 bytes |
| [EGM2008](https://cdn.proj.org/us_nga_egm08_25.tif) | 2.5 arc-minutes | 80,585,622 bytes |

Use a named compatible undulation N for `h_ellipsoid = H_physical + N`. A geoid
grid is not a terrain DEM. Choosing EGM2008 does not silently convert an EGM96
or national-datum DEM into that physical reference. Existing German DHHN2016
heights/GCG2016 corrections retain their separate meaning; see the
[datum contract research](2026-11-01-jsbsim-datum-172s-controls.md). Regional/global
seams and native/render sampling still need measured checks.

## Historical bounded observation and initial implementation route

One Cape Town-area request at `terrarium/8/141/153.png` returned HTTP 200,
`image/png`, RGB 256x256, 89,469 bytes, CORS `*`, last-modified 16 November 2017.
SHA-256: `b540b692a660497165adb114b3fc7a4b1561bc11a4ef9d67512b9b3c1d869973`.
Decoded values ranged from -135.078125 to 2194 m with no red-zero samples.
This proves transport/decoding for one response, not datum, surface accuracy or
worldwide availability. Two metadata-only HEAD requests established the geoid
sizes above. Headers/version identity are retained in temporary
`/private/tmp/gefly-world-fallback-probe.json`; no bulk data was downloaded.

A feasible bounded route is regional terrain first, OpenFreeMap cartography
outside regional imagery, and a separately labelled coarse global DEM fallback.
If EGM96 is used for rendering that mosaic, label its physical/vertical datum
as approximate. Share the same accepted height samples with physics and the
renderer. Validate canonical URLs, timeout/stream byte caps, PNG dimensions,
no-data and finite decoded bounds; bound requests/cache and cancel obsolete work.
A 256x256 RGB raster has 196,608 raw colour bytes, but PNG size is not inherently
bounded by that number because compressed streams and ancillary chunks vary.
Missing/invalid data must not become invented zero terrain. Provider failure,
polar coverage, water surfaces, datum seams and reproducible source/version
identity remain explicit implementation/validation work.
