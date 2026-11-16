# Photo-source outline provenance

`app/src/country-imagery-outlines.ts` holds coarse outer rings that decide which
official photo source is *named*: in the 3D status text (aircraft within 2 km of
an outline), in per-tile 3D credits (rendered tile within 10 km) and in the 2D
map's source visibility/credit (view within 10 km). They never define imagery
coverage; provider alpha still does, and the service envelopes in
`app/src/country-imagery.ts` still bound requests.

| Source | Natural Earth feature(s) |
| --- | --- |
| `ch` swisstopo | Admin 0 `ADM0_A3` `CHE`, `LIE` |
| `at` basemap.at | Admin 0 `AUT` (same feature as the Austria mask) |
| `nrw` Geobasis NRW | Admin 1 `iso_3166_2` `DE-NW` |
| `bb` Berlin/Brandenburg | Admin 1 `DE-BB`, `DE-BE` |
| `es` PNOA 2024 | Admin 0 `ESP` (all parts, including islands) |

Inputs are public-domain [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) v5.1.1:

- `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson`
  (13,287,234 bytes, SHA-256 `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`, the Austria mask input);
- `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_1_states_provinces.geojson`
  (40,726,851 bytes, SHA-256 `22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5`), downloaded 2026-11-09.

Regenerate with the standard library only:
`python3 utils/scenery/extract-photo-outlines.py admin0.geojson admin1.geojson > app/src/country-imagery-outlines.ts`.
The script checks both input hashes, keeps only outer rings (holes and enclaves
such as Büsingen are treated as covered), simplifies each ring with
Douglas–Peucker at 0.01° (about 1 km), rounds to 0.001° and checks the output
SHA-256 `e6fdb5f33672a7a1ac60873f9a8e02e4053bac80a270c10bb0dc97d3d6fe8ce7`
(24 rings, about 1,700 vertices). Rings left with fewer than three distinct
vertices are dropped silently. For this input that removes five small Spanish
North African territories: Peñón de Vélez de la Gomera, the two Alhucemas islets,
the Chafarinas and Perejil. They lie south of the proxy's 35.99° N mainland PNOA
request bound, so no photography is requested there either.

Margin evidence (2026-11-09, one sample each, outlines from the unsimplified
source): live NRW WMS imagery extended at most 2.2 km (Siegerland) and 2.7 km
(Sauerland/Waldeck) beyond the NRW outline, and returned no pixels over
Frankfurt; Berlin/Brandenburg 4.5 km (Lusatia); swisstopo WMTS 3.4 km (Basel to
Lake Constance, z11); PNOA 5.1 km (eastern Pyrenees, coarse 128 px sample). The
10 km credit margin covers these with simplification error; the 2 km status
tolerance covers simplification only. Untested borders may differ.
