# Imagery and material sources

Checked by Codex orchestrator on 2026-11-03. This is source research for TODO
2.0.33/2.0.36/2.0.37, not a provider selection or runtime integration.

| Source | Available material | Proposed use |
| --- | --- | --- |
| [Hessen DOP20/TrueDOP](https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/digitale-orthophotos-true-orthophoto) | Statewide 20 cm orthophotography; free download/WMS. Current bundled source rights remain in its manifests. | Airport/circuit detail from a multiresolution cache; the current 3000×1800 crop has about 0.75 m output pixels. |
| [Copernicus Sentinel-2](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2) | Free/open satellite data; RGB bands at 10 m. [Global mosaics](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html) include cloud-free annual composites. | Broad regional/distant photographic backdrop; insufficient detail for runway-level textures. |
| [ESA WorldCover](https://esa-worldcover.org/en/data-access) | Global 10 m land-cover classifications; CC BY 4.0 with specified attribution. | Masks for procedural vegetation, built surfaces and water; classifications are not photographic texture or obstacle truth. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Community vector data under ODbL with attribution/share-alike obligations. | Later roads, water outlines and building geometry, preserving source/coverage and uncertainty. Public data access does not imply unrestricted use of public tile servers. |

Recommendation: keep official local orthophotography for near-ground detail,
use broader imagery farther away, and add source-driven procedural materials
and structures in the already recorded later stages. Any future ingestion still
needs exact product/date/coverage/rights metadata and a hosting/cache decision.
