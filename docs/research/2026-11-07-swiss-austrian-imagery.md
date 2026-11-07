# Switzerland and Austria photographic scenery

The selected Swiss source is `ch.swisstopo.swissimage-product`, a transparent
256-pixel PNG WMTS layer in Web Mercator. The [official service announcement](https://docs.geo.admin.ch/releases/20250514.html)
describes transparency; the [SWISSIMAGE product page](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10)
reports 10 cm ground resolution in plains/major valleys and 25 cm in the Alps,
with dates varying by area. Service zoom controls effective rendering detail.
The official [free-geodata terms](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices)
allow use, modification, distribution and commercial use with attribution and
limit excessive geoservice usage. The product says the centres of 20 large
lakes include 2016–2018 Planet imagery and requires the notice “Includes material
© (2016-2018) Planet. All rights reserved”. The [official SWISSIMAGE metadata](https://www.geocat.ch/geonetwork/srv/api/records/d8864f44-7392-47b5-ad0e-cf1d52d156ac/formatters/xml) labels the product Opendata BY, and the official product links the swisstopo terms permitting distribution of the delivered product. No separate Planet-specific grant was located; do not claim Planet imagery is independently public domain or that an unrestricted licence to its raw data was established. The
opaque `swissimage` background layer includes non-Swiss SPOT imagery and is not
the selected product layer.

The Austrian source is [basemap.at Orthofoto](https://basemap.at/en/orthofoto/),
a 256-pixel JPEG WMTS in Web Mercator with 29 cm nominal national imagery and
15 cm in selected areas. The provider states [CC BY 4.0 and attribution](https://basemap.at/en/).
The URL uses tile row before column. Actual border tiles contain opaque white
no-data, which must not be keyed by colour because snow and cloud can be white.
An approximate, conservatively inset Natural Earth 1:10m public-domain Austria
polygon is used only to mask photography, with transparent fallback near
boundaries. It is not a surveyed boundary or guarantee of source coverage.

Both services are fixed allowlisted same-origin proxies in the local Vite
server, with bounded queue, concurrency, data, decode and cache lifetimes;
visible requested tile coordinates are disclosed to each source operator. The
current service worker does not persist these source tiles. Source-specific
breakers and client cooldowns limit repeated upstream demand during outages;
recovery is separate from terrain and other imagery. Photography
availability and capture dates vary; unavailable tiles fall through to the
existing OSM map. Production hosting has not been decided.
