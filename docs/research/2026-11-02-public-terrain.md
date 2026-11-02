# Public terrain: Hessen DGM1 and GCG2016

Researched by Codex housekeeping agent on 2026-11-02 23:30 Europe/Berlin. This is source selection and ingestion guidance, not acceptance of an implemented terrain package. The orchestrator owns data ingestion, requirements and integration.

## Recommended first package

Use a bounded, locally bundled derivative of official Hessen DGM1, initially around Egelsbach with explicit coverage. Add a Taunus patch if needed to demonstrate substantial relief. The whole 100 NM EDDF region crosses state boundaries and should remain a later coverage target until its sources and seams are checked. A terrain grid is not airport/runway geometry, current obstacles or scenery imagery.

[HVBG's DGM product description](https://hvbg.hessen.de/landesvermessung/geotopographie/3d-daten/digitale-gelaendemodelle) specifies ETRS89/UTM32N horizontal coordinates, DHHN2016 normal heights, float32 LZW GeoTIFF and `-9999` missing pixels. Values refer to pixel centers. The surface excludes bridges and represents acquisition-time terrain; do not describe it as a building/tree collision mesh. The published source-grid accuracy is not the accuracy of a coarse resampled simulator grid.

[HVBG's open-data terms](https://hvbg.hessen.de/geoinformation/open-data) expressly permit reproduction, modification, redistribution and application integration for commercial and noncommercial use without restrictions or conditions. If a source notice is supplied, identify changes. Preserve a visible HVBG source link and the derivative's resampling/coverage description; record the actual package terms rather than inventing a license identifier from a third-party catalog.

## Actual anonymous download discovery

The official [download center](https://gds.hessen.de/INTERSHOP/web/WFS/HLBG-Geodaten-Site/de_DE/-/EUR/ViewDownloadcenter-Start) exposes a public JSON catalog. For example:

`https://gds.hessen.de/INTERSHOP/rest/WFS/HLBG-Geodaten-Site/-/downloadcenter?path=3D-Daten%2FDigitales+Gel%C3%A4ndemodell+%28DGM1%29%2FLandkreis+Offenbach&navigation=all`

Observed entries include Egelsbach, 63.7 MB, dated 2024-05-06; Langen, 103.2 MB; and Dreieich, 154.5 MB. The corresponding Hochtaunuskreis catalog lists Kronberg, 75.8 MB; Königstein, 101 MB; and Schmitten, 129.8 MB. These large archives were **not downloaded by this research task**. The catalog returned this Egelsbach URL:

`https://gds.hessen.de/downloadcenter/20261103/3D-Daten/Digitales%20Gel%C3%A4ndemodell%20%28DGM1%29/Landkreis%20Offenbach/Egelsbach%20-%20DGM1.zip`

The date component is server-generated; discover the current URL from the catalog instead of assuming this path is permanent. Archive dates are package dates, not necessarily laser acquisition dates. Retain tile-level acquisition/CRS metadata during ingestion.

The [official small DEM sample](https://hvbg.hessen.de/sites/hvbg.hessen.de/files/2022-08/dgm_testdaten.zip) was actually downloaded to `/tmp/gefly-dgm-testdaten.zip`: 2,498,169 bytes, SHA-256 `95d0c7c8f20892327c637a0f334f9f948a2be48967f5cb297d712504e9ecf346`. Its TIFF, `dgm1_32_446_5562_1_he.tif`, is 1000×1000 at 1 m spacing, with pixel-center origin (446000.5, 5562999.5) and downward rows. Observed heights are 297.675–399.205 m. TIFF SHA-256: `3fa71a948fa9481df0698ed98439d26eef78816113c8c49a23cd0caf699bf298`. This is a format/relief probe near Wiesbaden, **not an EDFE regional package**; do not silently place it around Egelsbach. Its historical sample alone does not establish each new production tile's metadata.

### Bounded regional WCS download

The official [INSPIRE Hessen WCS](https://inspire-hessen.de/raster/dgm1/ows?SERVICE=WCS&VERSION=2.1.0&REQUEST=GetCapabilities) also exposes DGM1-derived overview coverages. Its versioned `dgm1-2025H2` endpoint and `he_dgm1_32` coverage provide a practical regional source without a municipality archive or runtime API dependency. Coverage metadata declares native E/N axes in EPSG:25832; the overview has approximately 32 m spacing, rather than the original 1 m surface.

This actual request succeeded without scaling or reprojection:

`https://inspire-hessen.de/raster/dgm1-2025H2/ows?SERVICE=WCS&VERSION=2.1.0&REQUEST=GetCoverage&COVERAGEID=he_dgm1_32&FORMAT=image%2Ftiff&SUBSET=E%28460000%2C500000%29&SUBSET=N%285520000%2C5580000%29`

The response was saved to ignored `output/terrain-probe/region-native.tif`, with its URL and HTTP metadata beside it: 9,386,714 bytes, SHA-256 `2e37db3ef8b07ec2bb206f289d1200f5cfbf41c37a3413688244dea7c29df894`. It is 1250×1875 float32 values, all valid, ranging from 81.663002 to 879.620056 m. TIFF tiepoint is (460024.0, 5579995.446496332), with pixel scales (32.0, 32.00101188970407); ingestion must honor the actual file transform, not substitute the requested bounding coordinates. This bounded native rectangle covers the Egelsbach/Frankfurt/Taunus demonstration area, not the full 100 NM region. Reproject and document the derivative locally; do not relabel these overview values as a 1 m runtime grid.

Tiny native E/N subsets and optional `SCALESIZE=E(33),N(33)` were verified independently. Native subsetting plus `OUTPUTCRS` EPSG:4326 also returned a tiny TIFF when scaling was omitted; combining native scale-axis labels with that output reprojection failed. The unscaled native response avoids this server-axis ambiguity and permits reproducible local reprojection.

Separate tiny service crops near (49.96° N, 8.643° E) and (50.232° N, 8.457° E) returned source pixels of 115.497009 and 878.749023 m respectively, exactly matching the regional TIFF's corresponding cells. Their requests, hashes and actual cell-center coordinates are in ignored `output/terrain-probe/independent-service-holdouts.json`. These are snapped raster samples, not surveyed EDFE/peak elevations or acceptance of the eventual resampled terrain. Rasterio reports `AREA_OR_POINT=Area`; use half-pixel offsets to address centers. The derived geographic grid still needs separate interpolation/coordinate checks. The 2023 grid and chosen resampling do not inherit any older 2016 geoid fixture's millimetre tolerance.

## Preserve the agreed height pipeline

[GAPS Q18](../GAPS.md#q18-contracts-v1-open-questions-o-1o-9) and [CONTRACTS §1](../design/CONTRACTS.md#1-units-and-frames) already require physical DHHN2016 height inside JSBSim, with a native terrain callback serving these heights unchanged. The renderer must use ellipsoidal height `h = H + ζ`, where `H` is DHHN2016 height and `ζ` is GCG2016 height anomaly. Do not treat DGM height as ellipsoidal height, add the anomaly inside the physical callback, or replace missing geoid data with zero. ETRS89/GRS80 versus the renderer's WGS84 horizontal frame/epoch remains a declared approximation unless separately transformed.

The [BKG product page](https://gdz.bkg.bund.de/index.php/default/quasigeoid-der-bundesrepublik-deutschland-quasigeoid.html) permits redistribution and modification under CC BY 4.0. Its required web attribution links BKG and the license, names the data sources and identifies changes. Preserve the downloaded source/attribution PDFs or their applicable notice in the package manifest. This is a data license alongside the GPL application, not a replacement project license.

The [BKG documentation](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/eng/quasigeoid_eng.pdf), pp. 3, 5–6 and 12–13, defines 30″ latitude × 45″ longitude anomaly nodes and the conversion `H = h − ζ`. Germany's land nodes are unchanged by the 2023 Baltic update. ASCII rows are latitude, longitude, anomaly in metres; missing nodes are `999999`. Reject them before interpolation.

The [West regional ZIP](https://daten.gdz.bkg.bund.de/produkte/sonstige/quasigeoid/aktuell/quasigeoid.geo89.w.zip) was actually downloaded to `/tmp/gefly-gcg-west.zip`: 7,001,748 bytes, SHA-256 `16b2f09996aee74eaa647fde4b7724ade17e384be534f38d23d9d229f30520c3`. Its `quasigeoid.geo89.w/quasigeoid/w/linux/ascii/GCG2016v2023_W.txt` has SHA-256 `e463e02e55716afceef0e1ac327906104696055290ee49a09302840586a17a57`. The rectangular grid spans 48.920833333–52.579166667° N and 5.78125–10.31875° E, with invalid nodes outside supported territory. A full EDDF 100 NM region extends beyond this southern bound; select the full Germany download for that later coverage.

A simple bilinear probe at 49.96° N, 8.643° E gives `ζ = 47.80184860000626 m` from these four valid source nodes:

| Latitude °N | Longitude °E | Anomaly m |
| --- | --- | --- |
| 49.9625 | 8.63125 | 47.7906 |
| 49.9625 | 8.64375 | 47.8024 |
| 49.954166667 | 8.63125 | 47.7899 |
| 49.954166667 | 8.64375 | 47.8030 |

This probe checks sign, units and ingestion; it does not validate an implementation or establish survey accuracy for bilinear resampling. No downloaded native interpolation executables were run.

## Integration checks to retain

Freeze source URLs, download time, hashes, projection/datum, node versus pixel-center placement, extent, missing-data policy, resampling algorithm and derivative hash. Bundle only the bounded derivative needed at runtime, including its geoid correction and attribution; no API key or remote terrain lookup is necessary. Rendering and native ground sampling must consume the same package with declared interpolation and slope/normal rules. Coarse data cannot silently become a validated runway surface; coverage edges and missing values need explicit handling. Preserve actual terrain/aircraft height alignment through live flight, ground contact, shadows, collision and recorded Review before claiming the increment complete.

## Higher-resolution photographic textures

Follow-up question recorded at 2026-11-02 23:49 Europe/Berlin: [original input](../input/2026-11-02-terrain-texture-question.md). A larger sample of the actual public orthophotography supplies additional detail; enlarging the existing starter JPEG cannot recover it. [HVBG's aerial-image description](https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/luftbildprodukte) states that orthophotos cover Hessen at 20 cm ground resolution, with some areas at 10 cm. The official [DOP20 dataset record](https://opendata.hessen.de/en/dataset/atkis-dop-20) names DL-DE Zero 2.0. Keep a frozen source request, bounds, output resolution, byte hash and voluntary HVBG credit.

The [official service/layer list](https://hvbg.hessen.de/geoinformation/geodateninfrastruktur/geoportal-hessen/geodatendienste-im-originaeren-format/geodatendienste-dienste-und-layer) identifies RGB photography as `he_dop_rgb`. Public service entry points are:

- [WMS capabilities](https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities).
- [WMTS capabilities](https://www.gds-srv.hessen.de/wmts-dop/wmts/1.0.0/WMTSCapabilities.xml).

For a bounded first delivery, pair a regional overview with an airport detail image, retaining separate rectangles and source metadata. WMS 1.1.1 with `SRS=EPSG:4326` takes longitude/latitude BBOX order; do not reuse that order blindly for WMS 1.3.0. The requested airport rectangle 8.632–8.656° E, 49.956–49.965° N at 3000×1800 produces approximately 0.56–0.57 m output pixels near Egelsbach. This improves on the old few-metre overview but is not a claim that the bundled texture has native 20 cm pixels. Further detail requires smaller geographic requests or a georeferenced tile pyramid built from the source, with bounded runtime texture memory and precomputed lower-resolution levels. Photographic detail does not refine the DEM, establish current runway conditions or introduce physical obstacle geometry.

The actual WMS 1.1.1 RGB request succeeded: ignored `output/terrain-probe/edfe-texture-detail.jpg`, 3000×1800 JPEG, 1,087,762 bytes, SHA-256 `90ea020b98bab2d8900eadefbd1fcafd738e0749f2230062f0a74cd828c149e5`. Its exact request/HTTP metadata are beside it. Visual inspection shows useful runway, taxiway and parked-aircraft detail; the supplied western boundary crops the western runway threshold, so retain a wider underlying image or enlarge the detail rectangle before describing it as full-airfield coverage. The fetched WMTS metadata advertises `he_dop_25832`/`advgrid_25832` and `he_dop_4258`/`advgrid_4258`; its tile matrix is not a generic Web Mercator XYZ contract. No imagery application asset was changed by this research task.
