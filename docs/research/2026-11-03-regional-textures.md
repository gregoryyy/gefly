# Bounded regional orthophoto tiles

Researcher/housekeeping: Codex `texture_research`; 2026-11-03 05:00 CET. Scope: TODO 2.0.33,
R-DATA-1/R-WORLD-1 and partial R-REGION-1. No dedicated deep-research skill is
available; this used primary-source web research and direct source-response
inspection. [Immutable observations and exact hashes](../input/2026-11-03-regional-textures.md)
record the retrieval separately from the recommendations below.

## Finding

A local, versioned tile pyramid extracted from Hessen's existing `he_dop_rgb`
WMS is practical. A real 512 × 512 EPSG:3857 request returned a valid JPEG of
Egelsbach airport. Rights permit derivative redistribution, with alterations
identified when credit is given. Aircraft/navigation fidelity and current airport
conditions are outside this imagery evidence.

## Primary sources and applicability

| Source and section | Verified facts and use |
| --- | --- |
| [HVBG service overview, Digitale Orthofotos / WMTS](https://hvbg.hessen.de/geoinformation/geodateninfrastruktur/geoportal-hessen/geodatendienste-im-originaeren-format) | Official links to WMS and WMTS; WMS 1.1.1/1.3.0; RGB and CIR TrueDOP. Inspected 2026-11-03. |
| [WMS capabilities, Service / Capability / he_dop_rgb](https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0) | JPEG, EPSG:3857 and 3000 × 3000 maximum; explicit copying/reworking/redistribution terms. Direct XML retrieved and parsed; no time dimension on RGB layer. |
| [WMTS capabilities, Contents](https://www.gds-srv.hessen.de/wmts-dop/wmts/1.0.0/WMTSCapabilities.xml) | EPSG:25832 and EPSG:4258 PNG grids, 256-pixel tiles; no Web Mercator grid. Direct XML retrieved and parsed. |
| [Official ATKIS DOP20 metadata, resource/conditions/resolution](https://www.geoportal.hessen.de/mapbender/php/mod_exportIso19139.php?url=https%3A%2F%2Fwww.geoportal.hessen.de%2Fmapbender%2Fphp%2Fmod_dataISOMetadata.php%3FoutputFormat%3Diso19139%26id%3D0b30f537-3bd0-44d4-83b0-e3c1542ca265) | Publisher HLBG; EPSG:25832 native source; 0.2 m; DL-DE-Zero-2.0. Dataset-wide date range is not a capture date for a particular extract. |
| [HVBG orthophoto product description, Aktualität / Georeferenzierung](https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/digitale-orthophotos-true-orthophoto) | Hessen-wide 20 cm RGBI production and ETRS89/UTM32N; renewal cycle described as two years. A cycle does not date a selected pixel. |
| [HVBG Open Data, automated retrieval](https://hvbg.hessen.de/geoinformation/open-data) | Automated retrieval/use is free; special preparation may incur fees. No numeric request-rate budget located. |
| [GovData Zero 2.0](https://www.govdata.de/dl-de/zero-2-0) | Allows commercial/non-commercial copying, changes, transmission and integration without conditions. Read alongside the service's requested modification notice when voluntarily crediting. |

Confidence is high for these capability/rights observations and the verified
sample; capture dates and broad-region tile byte costs remain unestablished.
The source WMS HTTP response includes `no-cache, no-store`. Under
[RFC 9111 sections 5.2.2.5 and 6](https://www.rfc-editor.org/rfc/rfc9111.html),
HTTP response caching rules and application-level handling are distinct. The
recommendation is a declared static derivative data package under the explicit
reuse terms; it does not propose an upstream HTTP response cache. No blocking
term against that redistribution was found in the inspected sources.

## Request and coordinate contract

Use WMS 1.1.1, `SRS=EPSG:3857`, `LAYERS=he_dop_rgb`, empty style,
`FORMAT=image/jpeg`, WIDTH=HEIGHT=512. Coordinates are east/north metres and
BBOX order is west,south,east,north. Avoid EPSG:4326 axis-order differences
between WMS versions. Source WMS reprojection/resampling produces the tile;
its nominal source 20 cm resolution must never be relabeled as output resolution.

For a proposed conventional Web Mercator XYZ grid, let R=6378137 m,
H=πR, n=2^z and s=2H/n. Then west=−H+x·s, east=west+s,
north=H−y·s and south=north−s. XYZ y increases southward; it is not a bottom-up
TMS y index. The sample z15/17170/11118 BBOX is
`961272.067714378,6439055.262743248,962495.060166940,6440278.255195810`.
Its actual JPEG visually places the Egelsbach runway/apron north-up. This checks
one point and orientation, not a regional georeferencing accuracy tolerance.

At latitude 50°, approximate ground resolution for these 512-pixel tiles is
`2πR cos(latitude)/(2^z·512)`:

| Level | Approximate ground m/pixel |
| --- | ---: |
| z13 | 6.142 |
| z14 | 3.071 |
| z15 | 1.535 |
| z16 | 0.768 |

These are derived output sampling scales, not validated object detail. JPEG
compression, source generalization, reprojection and terrain draping also matter.
A future 0.75 m airport subset corresponds approximately to z16 here; native
20 cm imagery and full EDDF/100 NM coverage remain separate work.

## Bounded package recommendation

Keep the renderer's network requests same-origin and backed by a finite manifest.
Extract only a predeclared region and levels; pin each shipped tile's path,
coordinates, bytes and SHA-256 plus the source request, retrieval timestamp,
license, modification notice and unknown capture date. Reject XML/HTML service
errors even when HTTP status is 200: check content type, JPEG decoding and
exact dimensions. Use modest sequential ingestion, timeouts, retries/backoff and
a hard total-byte cap; no tested source rate limit is available.

The existing broad overview bounds (8.4–8.9° E, 49.8–50.1° N) need 528 z14
or 2,068 z15 tiles when every intersecting XYZ cell is included. One verified
airport tile was 69,634 bytes, so that single-tile extrapolation alone puts
z14 near 36.8 MB before parents or finer detail. This is only an estimate;
forest/urban/airport compression differs. A smaller example extent
(8.50–8.78° E, 49.93–50.09° N) needs 168 z14 or 648 z15 tiles.
These examples illustrate budget tradeoffs, not a selected coverage boundary.

Prefer broad coarse parents, sharper bounded Egelsbach–Frankfurt/EDDF 25-approach
coverage and selected airport/circuit detail. Measure actual package bytes before
claiming the proposed approximately 40 MB repository budget. Require a complete
parent chain and explicit no-data fallback beyond declared coverage; local
view-loaded tiles should not silently fetch the source or imply that missing
high-detail areas are present. Reuse existing terrain independently; a sharper
photo changes neither ground height nor collision nor navigation data.

## Handoff and remaining limits

The orchestrator/coders choose the actual extent and levels under the product
scope. Check the final manifest geometry, byte cap, source/hash inventory and
actual browser same-origin requests independently. A static output package is
reproducible by its committed bytes/hashes; rerunning the live WMS request later
may return newer imagery, so URL alone is not a frozen source edition.

No runtime assets or implementation were edited by this note. No source capture
date, current AIRAC, runway geometry, complete 100 NM coverage, browser performance
or flight/training validation is established. The integration owner should add
these two notes to the research/input indexes and reference the final manifest
in SBOM/THIRD_PARTY_NOTICES and the scoped DONE/TODO entry. Those shared files
were outside this worker's write set.
