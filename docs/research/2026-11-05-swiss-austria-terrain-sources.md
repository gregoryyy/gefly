# Swiss and Austrian terrain sources and coarser fallbacks

Researched 2026-11-05 12:03 Europe/Berlin by Codex
`/root/resize_housekeeping` for the TODO 2.0.135 source question. Compatible
source candidates exist; this note does not claim they have been ingested,
height-transformed or validated in Gefly. No country terrain tiles or bulk
archives were downloaded.

## Switzerland

[swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d) is a
bare-earth product available as 0.5 m or 2 m COG/XYZ, in 1 km square tiles,
LV95/LN02. The smaller spacing may be oversampled. The stated update cycle is
six years, with regional acquisition/quality differences. Its
[OGD terms](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices)
allow use, redistribution, processing and commercial use with source credit.
The product page's sample files are explicitly test-only, not product assets;
an ingestion must use the actual OGD downloads under their terms.

[swissALTIRegio](https://www.swisstopo.admin.ch/en/height-model-swissaltiregio)
provides a 10 m grid covering Switzerland and at least 100 km beyond its border,
as a complete COG or 10 km square XYZ tiles. Some areas are oversampled. The
publisher describes yearly domestic updates and foreign updates when available.
Its [news overview](https://www.swisstopo.admin.ch/en/news-overview) records an
edition update on 25 June 2026. Use the edition-specific source-credit list:
the current product terms distinguish 2025-and-later credits, including
Baden-Wuerttemberg DGM1, from the 2024 version. The old 2024 press story is not
evidence of the current mosaic's exact composition.

The product's vertical caveat is material: Swiss cells use LN02, but foreign
cells were **not transformed from their original height system to LN02**.
LV95 is the horizontal CRS, not proof of a uniform vertical datum. Preserve
country/source identity and transform heights explicitly before blending with
German DHHN2016/GCG or a global EGM-based fallback.

For maps, [geo.admin XYZ](https://docs.geo.admin.ch/visualize-data/xyz.html)
documents EPSG:3857 tile access; layer coverage/credits still apply. The
[swisstopo Base Map](https://www.swisstopo.admin.ch/en/web-maps-base-map)
has a specific licence boundary: third-party users may access the Swiss and
Liechtenstein vector data freely, while its foreign/worldwide component is
reserved to Swiss federal administration users. Use OpenFreeMap for the
independent worldwide cartographic fallback, rather than assuming the Swiss
service's full world extent is licensed for Gefly.

## Austria

The current [BEV ALS-DGM product](https://www.bev.gv.at/Services/Produkte/Digitales-Gelaendehoehenmodell/ALS-Hoehenraster.html)
is a nationwide 1 m bare-earth GeoTIFF product, supplied in 50 km square tiles.
It is free of charge, with annual national mosaics and regional acquisition
intervals up to ten years; the page lists 2025 edition metadata. Its horizontal
CRS is EPSG:3035. Heights generally use **EVRF2000 Austria orthometric heights,
EPSG:9274**, but tiles of the 15 September 2021 series use **Adria Triest
heights, EPSG:5778**. Do not label every Austrian DEM as Adria or EGM96.
The official [catalogue record for a published 2022-series tile](https://www.data.gv.at/datasets/b077342b-50fb-45cf-a885-85ac25f4cd3c?locale=de)
specifies CC BY 4.0. Freeze the chosen edition's actual tile metadata/licence
before ingestion; a product page's latest mosaic year is not every tile's
survey date.

The older [Geoland 10 m DGM catalogue](https://www.data.gv.at/datasets/d88a1246-9684-480b-a480-ff63286b35b7)
also lists ALS-derived GeoTIFF ZIP data and CC BY 4.0. Its dataset update is
15 April 2021 and resource creation is 17 March 2015; portal migration/update
dates do not make it a new 2026 terrain capture. The inspected catalogue does
not establish its vertical datum. It remains a candidate requiring that check.

[basemap.at](https://basemap.at/) supplies Austrian cartography as EPSG:3857
WMTS and vector services, under CC BY 4.0, with the required linked credit
`Datenquelle: basemap.at` or `Grundkarte: basemap.at`. This can fit the existing
map renderer after provider integration; cartography and relief images are not
physical DEM samples.

## Lower-quality fallback hierarchy

Prefer an applicable national bare-earth DEM where accepted, then a coarser
validated regional/global layer. [SRTM 1 arc-second](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1)
is approximately 30 m and covers 60 N to 56 S. Its
[USGS specification](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm)
states WGS84 horizontal / EGM96 vertical. USGS also documents
[canopy and rooftop contributions](https://www.usgs.gov/special-topics/significant-topographic-changes-in-the-united-states/science/accuracy-assessment):
raw SRTM is not guaranteed bare-earth terrain.

[GMTED2010](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-global-multi-resolution-terrain-elevation)
offers public-domain 7.5, 15 and 30 arc-second products, roughly 250, 500 and
1000 m at the equator. Most cover 84 N to 56 S; several extend to 90 S, with
fine-resolution gaps in Greenland/Antarctica. Choose the aggregation product
and source metadata explicitly, rather than calling every coarse grid a new
bare-earth observation. AWS Terrain Tiles already mosaics several such source
families; its zoom-dependent detail is not a national-data quality guarantee.

The [worldwide fallback note](2026-11-05-world-terrain-fallback.md) records
transport, mixed-datum, no-data, ocean/bathymetry and polar limits. Fallback can
reduce detail when finer valid data is absent; it cannot turn missing samples
into surveyed zero terrain. Datum transforms, seams, native/render agreement,
attribution and edition hashes remain implementation/validation work.
