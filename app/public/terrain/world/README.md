# Coarse worldwide terrain baseline

This is a bundled **one-degree** emergency fallback, not detailed regional or
surveyed airport terrain. North-south node spacing is about 111 km; interpolation
does not restore missing mountains, valleys or coastlines. Its intended use is
continued approximate global simulation when an accepted finer terrain layer
does not cover the position. Runtime integration/acceptance is separate.

## Format and references

`world-v1.json` identifies `world-v1.f32` by exact bytes and SHA-256. It contains
361 by 181 geographic nodes at integer longitude -180..180 and latitude -90..90.
Rows run south to north and columns west to east. Each node has two little-endian
float32 values: physical height H in metres relative to **EGM2008**, followed by
EGM2008 geoid undulation zeta in metres. Rendering uses `h_ellipsoid = H + zeta`.
The packed size is 522,728 bytes. +180 is a bit-identical duplicate of -180;
each polar row represents one constant physical point.

German DHHN2016/GCG2016 regional data retains its own datum. This package does
not rename German heights or claim that a coarse global/regional boundary has
been surveyed. It adds no runway, obstacle, building or aircraft data.

## Source and derivation

Exact input URLs, byte counts/hashes, compiler identity and output statistics
are in [SOURCE.json](SOURCE.json). The numeric source files remain in ignored
scratch storage; they are not duplicated in the application bundle.

- **NOAA ETOPO 2022 v1, 60 arc-second Ice Surface** supplies the relief values.
  [NOAA's product page](https://www.ncei.noaa.gov/products/etopo-global-relief-model)
  and [User Guide, sections 2-4](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf)
  identify global WGS84 geographic coordinates, EGM2008 physical heights,
  ice-surface/bed variants and free private, academic and commercial use.
  Ice Surface retains the top of Antarctic/Greenland ice sheets rather than
  the bed beneath them. Credit: NOAA National Centers for Environmental
  Information, 2022, ETOPO 2022 Global Relief Model,
  [doi:10.25921/fd45-gt74](https://doi.org/10.25921/fd45-gt74), accessed 2026-11-05.
- A bounded NOAA ERDDAP request selects a 180 by 360 subset with stride 60,
  plus the sparse northern boundary row. It does not download the complete
  high-resolution global DEM. Interior canonical nodes use the nearest source
  centre on the positive side of the equal-distance choice, offset +1/120
  degree in both axes. Longitudes wrap from source 0..360 to -180..180.
  Each pole uses the longitude mean of its nearest source row. These are
  explicit coarse resampling choices, not point-survey accuracy.
- **NGA EGM2008 via PROJ-data** supplies zeta. The
  [PROJ-data register](https://cdn.proj.org/us_nga_README.txt) identifies the
  2.5-minute grid as Public Domain. Exact integer-degree nodes are a 24-node
  stride of its PixelIsPoint grid, with no half-pixel shift or sign reversal.
  Credit: NGA, EGM2008; converted grid distributed by OSGeo PROJ-data.
- **Natural Earth 1:50 million ocean polygons** provide an approximate ocean
  mask under [Public Domain terms](https://www.naturalearthdata.com/about/terms-of-use/).
  Only its globally connected ocean component is used, with land holes
  respected; the disconnected Caspian Sea feature is excluded. Ocean nodes
  use H=0 EGM2008. Negative inland values are retained, not blanket-clamped.
  A land-hole boundary remains inland. The 1:110 million mask was too coarse
  at three sampled coastal nodes; the finer mask is applied uniformly, with
  no coordinate-specific fixes. Credit: Made with Natural Earth.

The compiler rejects missing/nonfinite source samples, source -99999 no-data,
non-ocean H at or below -1000 m / at or above 10000 m, and absolute zeta at or
above 200 m. Missing data is never replaced with invented zero ground. Inland
lake bathymetry can remain; this package does not model lake water surfaces.
The ocean/land mask and one-degree interpolation are approximate near coasts.

## Rebuild and check

Use Python 3.11+ with the existing Pillow 11.2.1 dependency. Download only the
five identified input files in SOURCE.json to scratch storage, retaining their
exact bytes. Numeric input hashes are pinned in the compiler; changed upstream
data requires review before changing those pins. ERDDAP injects request times
into metadata history, so the metadata's EGM2008/ice-surface/no-data semantics
are checked and its actual input hash is recorded rather than fixed to one
request timestamp.

From the repository root, with source paths adjusted to the downloaded files:

```sh
python3 utils/terrain/build_world_fallback.py \
  --dem /private/tmp/gefly-world-build/coarse.json \
  --north /private/tmp/gefly-world-build/north.json \
  --metadata /private/tmp/gefly-world-build/etopo.das \
  --geoid /private/tmp/gefly-world-build/egm08.tif \
  --ocean /private/tmp/gefly-world-build/ocean-50m.geojson \
  --output app/public/terrain/world
python3 -m unittest discover -s utils/terrain -p 'test_build_world_fallback.py' -v
```

The compiler is offline and performs no provider requests. Unit/asset checks
cover input registration/units/no-data, connected-ocean and hole boundaries,
negative inland preservation, geoid sign/node registration, packed identity,
dateline duplication and constant polar rows. They do not validate real-world
landing fidelity or the runtime's regional/global selection and rendering.
