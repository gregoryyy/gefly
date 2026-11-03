# Dynamic region source observations, 2026-11-03

Recorded by Codex researcher subagent `region_sources` at 2026-11-03 05:40 CET
(Europe/Berlin). This immutable input record captures public-source observations,
not a user decision, approved terrain fidelity or implementation validation.

## Official sources inspected

- [BKG DGM200 product](https://gdz.bkg.bund.de/index.php/default/digitales-gelandemodell-gitterweite-200-m-dgm200.html)
  and [documentation](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/deu/dgm200.pdf):
  200 m terrain nodes, ETRS89/GRS80 UTM32, DHHN2016 normal heights. The current
  product terms are DL-DE-BY-2.0. The current attribution requires visible linked
  BKG and license credit plus an alteration notice.
- [OurAirports downloads](https://ourairports.com/data/): public-domain nightly
  airport CSV; no accuracy/fitness guarantee. At inspection the airport file was
  described as last modified 2026-11-02, 12,755,750 bytes. The CSV itself was not
  downloaded by this research task.
- [BKG nationwide DOP20 WMS](https://gdz.bkg.bund.de/index.php/default/wms-digitale-orthophotos-bodenauflosung-20-cm-wms-dop.html):
  a license agreement/fees are required for third-party access; its listing is
  not permission to use anonymous nationwide photography.
- [Bavaria current service notice](https://geodatenonline.bayern.de/geodatenonline/seiten/aktuell_vorjahre.html):
  old DOP80 is retired; new anonymous DOP40 is the replacement.
- [Baden-Württemberg Open GeoData](https://www.lgl-bw.de/Produkte/Open-Data/):
  DOP20 WMS/WMTS listed as open data, DL-DE-BY-2.0; visible LGL attribution.
- [BKG TopPlusOpen WMS](https://gdz.bkg.bund.de/index.php/default/wms-topplusopen-wms-topplus-open.html):
  anonymous worldwide map, DL-DE-BY-2.0 with BKG/license/data-sources credit.
  Offline extracts require the date-specific data-source notice.

## Actual anonymous network probes

Sandbox DNS failed; network-enabled read-only requests succeeded. No full DEM
archive or global airport CSV was downloaded by this subagent. No downloaded
executable was run. Tiny files went to `/tmp/gefly-region-*` only.

### DGM200 ZIP

URL: `https://daten.gdz.bkg.bund.de/produkte/dgm/dgm200/aktuell/dgm200.utm32s.geotiff.zip`

A suffix Range request returned HTTP 206, `Content-Range: bytes
38069772-38135307/38135308`, `Access-Control-Allow-Origin: *`, Last-Modified
2024-07-17. The 65,536 response bytes have SHA-256
`c70eb98fb2fdf8372178bd415b1c3c6fd3ff0a8080e0cd4a5dc152ab61ad8ed0`.
ZIP central-directory parsing found the TIFF at
`dgm200.utm32s.geotiff/dgm200/dgm200_utm32s.tif`, compressed size 36,174,984,
uncompressed size 36,436,415, local-header offset 814, deflate method 8.
This is a ZIP, not a directly streamable cloud-optimized TIFF.

Small independent ranges extracted these entries:

| Entry | Uncompressed bytes | SHA-256 |
| --- | ---: | --- |
| `aktualitaet.txt` | 1,406 | `3c67cd288df34b21157f0a9f4ddfff9fe93163b91d965422dbd796abf023c37c` |
| `dokumentation/dgm200.pdf` | 598,595 | `f85b7bcf2477696ce92c7c5465f8311dfec13072db3848f93fe278eab3d8a1c6` |
| `quellenvermerk.txt` | 1,191 | `9ed9f29905217de7528a3da819c798205ca0524a316602e0de62450859025f4e` |

The embedded PDF was parsed locally with Python pypdf and is dated 2021-03-17;
page 3 explicitly states DHHN2016, and page 6 DL-DE-BY-2.0. The older text notice
still references GeoNutzV and asks for visible BKG/year/alteration credit. Preserve
both source notices and current product terms during actual ingestion. The source
acquisition table is dated 2019-12-31: Hessen 2010–2018, Bavaria 2006–2018,
Baden-Württemberg 2000–2018. A 2024 download timestamp is not acquisition currency.
The full source TIFF's projection, transform, pixel registration, values and hash
were not inspected by this task and must be verified at ingestion.

### WMS capabilities

All three returned parsed XML with `Access-Control-Allow-Origin: *`.

| Endpoint plus `?SERVICE=WMS&REQUEST=GetCapabilities` | Bytes | SHA-256 |
| --- | ---: | --- |
| `https://geoservices.bayern.de/od/wms/dop/v1/dop40` | 10,526 | `325ebb8b090c7137b6f0b60280f870491d3df07574207dcc705daf1b365dd113` |
| `https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ATKIS_DOP_20_C` | 11,371 | `0454d57cb33011d77bfac173dd7f622fa7a7bc05d949603b886888c76b189ab4` |
| `https://sgx.geodatenzentrum.de/wms_topplus_open` | 42,599 | `53c904a1e02ef00a5796f1a5f124c8cd421ff8ab44c22790f1dba1aecce2ff72` |

Bavaria layer `by_dop40c` advertises 0.4 m source pixels, CC-BY-4.0 and a
maximum request of 6000×6000 pixels. BW layer `IMAGES_DOP_20_RGB` advertises
0.2 m source pixels, state-border clipping and DL-DE-BY-2.0; its source credit
example includes LGL-BW, year, license and www.lgl-bw.de. BKG layer `web` is a
map depiction, not photography or an aeronautical chart. These current services
are unversioned and do not pin point-specific image acquisition dates.

### Tiny GetMap pixels

Each request used WMS 1.1.1, `SRS=EPSG:4326`, `STYLES=`, `WIDTH=256`,
`HEIGHT=256`, `FORMAT=image/png`, `TRANSPARENT=TRUE`; BBOX order is lon/lat.
All returned PNG and CORS `*`; Pillow decoded each as 256×256 with varied values.
These are transport/pixel checks, not visual or positional validation.

| Endpoint/layer above | BBOX west,south,east,north | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Bavaria / `by_dop40c` | `9.48,49.85,9.52,49.89` | 175,299 | `022c24417c5acb381fa3735b42c79bceb60367583b4cd0be5a4b37b315a27552` |
| BW / `IMAGES_DOP_20_RGB` | `9.10,49.50,9.14,49.54` | 42,501 | `c04ed7485c735268148b8387defe9e7d02eaaa9931cc461399ac68dabdfbb7f7` |
| BKG / `web` | `8.2,49.3,9.8,50.45` | 182,842 | `5d3caaa41c7b8b031aeacb1eb91d88e66a178cd5f8c1b50ac15cc81d3a190f84` |
