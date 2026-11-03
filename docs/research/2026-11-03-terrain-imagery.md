# Imagery and material sources

Checked by Codex orchestrator on 2026-11-03. This is source research for TODO
2.0.33/2.0.36/2.0.37, not a provider selection or runtime integration.

| Source | Available material | Proposed use |
| --- | --- | --- |
| [Hessen DOP20/TrueDOP](https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/digitale-orthophotos-true-orthophoto) | Statewide 20 cm orthophotography; free download/WMS. Current bundled source rights remain in its manifests. | Airport/circuit detail from a multiresolution cache; the current 3000×1800 crop has about 0.75 m output pixels. |
| [Copernicus Sentinel-2](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2) | Free/open satellite data; RGB bands at 10 m. [Global mosaics](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html) include cloud-free annual composites. | Broad regional/distant photographic backdrop; insufficient detail for runway-level textures. |
| [ESA WorldCover](https://esa-worldcover.org/en/data-access) | Global 10 m land-cover classifications; CC BY 4.0 with specified attribution. | Masks for procedural vegetation, built surfaces and water; classifications are not photographic texture or obstacle truth. |
| [OpenAerialMap](https://openaerialmap.org/about/) | Open aerial/UAV imagery under CC BY 4.0; resolution and geographic availability depend on contributed datasets. | Supplemental photographs where suitable coverage exists; Frankfurt coverage has not been established. |
| [Cesium ion imagery](https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/) | Ready-to-stream imagery providers; third-party commercial content has its own [usage terms](https://cesium.com/learn/ion/content-usage-and-attribution-guide/). | Optional managed service after account/hosting/terms decisions; provider access does not make imagery freely redistributable with this repository. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Community vector data under ODbL with attribution/share-alike obligations. | Later roads, water outlines and building geometry, preserving source/coverage and uncertainty. Public data access does not imply unrestricted use of public tile servers. |

Recommendation: keep official local orthophotography for near-ground detail,
use broader imagery farther away, and add source-driven procedural materials
and structures in the already recorded later stages. Any future ingestion still
needs exact product/date/coverage/rights metadata and a hosting/cache decision.

## Rights and access addendum (2026-11-03 07:40 Europe/Berlin)

Added by Claude Code housekeeping after Claude peer review F53 ([report](../reviews/2026-11-03-codex-prs-39-50-peer.md)). It does not change the findings above. "Not verified" means no licence or terms page was read for this note; it is not a claim that the source is restricted or free.

This table is an **unverified pointer list**, as checked on 2026-11-03 (no time recorded). It is not a source register. Only the Hessen row describes data that ships, and that row's rights, requests, hashes and retrieval records are in [SOURCE.json](../../app/public/imagery/SOURCE.json), [DETAIL-SOURCE.json](../../app/public/imagery/DETAIL-SOURCE.json) and the regional [manifest](../../app/public/imagery/rhein-main/manifest.json) (DL-DE Zero 2.0).

| Source | Licence or terms identifier | Status |
| --- | --- | --- |
| Copernicus Sentinel-2 | The [Copernicus Data Space Ecosystem terms](https://dataspace.copernicus.eu/terms-and-conditions), read 2026-11-03, say Sentinel data are "free, full and open" and governed by the [Legal Notice on the use of Copernicus Sentinel Data and Service](https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice). The legal notice itself was not read. | Not ingested; no product or edition selected |
| ESA WorldCover | CC BY 4.0, as stated on the access page (not re-read) | Not ingested |
| OpenAerialMap | CC BY 4.0 per dataset, as stated on the about page (not re-read) | Not ingested; coverage not established |
| Cesium ion | Provider-specific commercial terms | Not used |
| OpenStreetMap | ODbL 1.0 | Not ingested |

Any later ingestion needs its own dated source record with edition, licence and hashes.
