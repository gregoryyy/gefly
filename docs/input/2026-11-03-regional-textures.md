# Regional orthophoto evidence capture, 2026-11-03

Captured by Codex researcher/housekeeping subagent (`texture_research`) at 2026-11-03 05:00 CET.
This is an append-only source-observation record for TODO 2.0.33, R-DATA-1,
R-WORLD-1 and the bounded first increment of R-REGION-1. It records observations,
not a user decision, aircraft/navigation authority or accepted implementation.

## Requests and observed bytes

The web tool could not render the WMS/WMTS XML. Direct HTTPS retrieval with curl
succeeded. The initial sandboxed request failed DNS; the approved network-enabled
retrieval succeeded. No source data was changed.

| Resource | Retrieved bytes | SHA-256 |
| --- | ---: | --- |
| [WMS 1.3.0 capabilities](https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0) | 60,315 | `5755ee90b686ea2bf3cccd60235b047574fa9d36da9657807b16464cf621009a` |
| [WMTS capabilities](https://www.gds-srv.hessen.de/wmts-dop/wmts/1.0.0/WMTSCapabilities.xml) | 16,314 | `f189ee93f8396e7a07e992c2efac0248fcbae16d46cfaa97d27ade94952a3b8e` |
| [One WMS sample](https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=he_dop_rgb&STYLES=&FORMAT=image%2Fjpeg&SRS=EPSG%3A3857&BBOX=961272.067714378%2C6439055.262743248%2C962495.060166940%2C6440278.255195810&WIDTH=512&HEIGHT=512) | 69,634 | `4bc3b5223d483f32223a2efd4c1d21d8ec117d0a46aa9243853567c23a0e33aa` |

XML was parsed with Python ElementTree. Pillow identified and verified the sample
as JPEG, RGB, 512 × 512; its image was visually inspected. It depicts the EDFE
runway and northern apron/buildings, with north at the top. The sample corresponds
to the proposed Web Mercator XYZ grid z=15, x=17170, y=11118. Temporary response
files were held under `/tmp`, not added to the product assets by this work.

## WMS observations

Service title: `WMS HE DOP`. The document advertises `image/jpeg`, EPSG:3857,
EPSG:4326 and other CRS; MaxWidth and MaxHeight are both 3000. `he_dop_rgb`
is present with title `DOP rgb`, queryable=0, cascaded=1. No TIME dimension is
advertised on that layer. Its EPSG:3857 envelope uses east/north metre order.
No numeric request-rate limit was found in the inspected capabilities or the
linked official service overview. This is not evidence of unlimited capacity.

Fees say automated retrieval/use of geobasis data and associated metadata is free.
AccessConstraints permit commercial/non-commercial copying, alteration,
combination, redistribution and integration into applications. They also say that
if source credit is supplied, it must mention alterations/reworking. These are
paraphrases of the retrieved service metadata, not a new license interpretation.

The successful sample returned HTTP 200, `Content-Type: image/jpeg` and
`Cache-Control: no-cache, no-store`; response Date was
`Tue, 03 Nov 2026 03:58:33 GMT`. The HTTP caching directive is recorded separately
from the explicit dataset reuse rights. This delivery proposes an authored,
versioned static extract, not an HTTP response cache or live upstream proxy.

## WMTS observations

Only `he_dop_25832` and `he_dop_4258` layers were listed, both image/png.
Their grids are `advgrid_25832` (EPSG:25832) and `advgrid_4258` (EPSG:4258),
256 × 256 pixels, sixteen matrices each. EPSG:3857 was not advertised. WMTS
is therefore not a direct substitute for the proposed local Web Mercator XYZ
JPEG pyramid. WMTS fees/access constraints use the same rights wording as WMS.

## Dataset and date observations

[Official Geoportal ATKIS DOP20 metadata](https://www.geoportal.hessen.de/mapbender/php/mod_exportIso19139.php?url=https%3A%2F%2Fwww.geoportal.hessen.de%2Fmapbender%2Fphp%2Fmod_dataISOMetadata.php%3FoutputFormat%3Diso19139%26id%3D0b30f537-3bd0-44d4-83b0-e3c1542ca265)
identifies the Hessisches Landesamt für Bodenmanagement und Geoinformation,
ETRS89/UTM32N (EPSG:25832), native 0.2 m ground resolution and
DL-DE-Zero-2.0. The rendered metadata showed metadata date 2026-09-08 and a
dataset-wide temporal range beginning 2021-04-01. Search/direct render responses
disagreed on the latest dataset-wide date (2026-10-22 versus 2026-10-27), which
also establishes neither EDFE nor EDDF capture dates. No point-specific flight
date was established. Retain `sourceImageDate: null` for the extracts.

The OpenData Hessen catalog page returned HTTP 403 through the web tool; its
contents were not relied upon for renewed verification. Official HVBG/Geoportal
pages and actual capability documents supplied the verified information.
