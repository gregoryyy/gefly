# Austria mask source

`austria-ne-10m.geojson` is the Austria `Polygon` geometry from Natural Earth
Admin 0 Countries v5.1.1, feature `ADM0_A3=AUT`, coordinates WGS84, with all
rings and original vertices preserved. This is generalized cartographic data,
not a surveyed frontier or an authoritative imagery footprint. The public-domain
source is [Natural Earth](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/);
[terms](https://www.naturalearthdata.com/about/terms-of-use/).

Pinned source:
`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson`
(13,287,234 bytes, SHA-256
`239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`).
Extract with `python3 utils/scenery/extract-austria-boundary.py downloaded.geojson > utils/scenery/austria-ne-10m.geojson`.
The extracted UTF-8 compact geometry SHA-256 is
`a98c79bbf465a12724aa8f9df8d5e318b02d7d8223d4a55fe89ee674b2fc0acd`.

An 800 m Web-Mercator inward margin (over 500 ground metres in Austria) is
applied before display, with whole-tile omission near boundaries at high zoom
when bounded rendering cannot safely draw the margin. This avoids painting the
provider's white no-data as imagery; it is not a guarantee of legal coverage or
precise boundaries. Underlying map/imagery remains visible in excluded strips.

The middleware invokes `python3` by default. It may be configured with the
`PYTHON` environment variable to select an interpreter with Pillow 11.2.1, for
example `PYTHON=/path/to/python3 npm --prefix app run dev`. The source tiles
are streamed on demand and are not included in this repository.
