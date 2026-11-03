# Global scenery, local detail and Google Earth

Research date: 2026-11-03, Europe/Berlin. Authors: Codex orchestrator,
`global_sources` and `google_flythrough` researcher subagents. Related:
[user request](../input/2026-11-03-global-scenery-research.md), R-WORLD-1 through
R-WORLD-4, R-REGION-1, R-DATA-1, TODO 2.0.36/2.0.37/2.0.46.

## Finding and recommendation

Global streaming is feasible with the existing CesiumJS/MapLibre/JSBSim stack.
The difficult parts are consistent high-resolution photography and 3D structures,
source rights, and agreement between visible terrain and physical ground. A
larger tile cache or finer interpolation does not supply those missing inputs.

Recommended direction, **not a selected provider or accepted fidelity claim**:
keep an open global terrain/vector baseline, upgrade exercise regions with
official high-resolution terrain and photography, and permit an optional
commercial visual provider. Retain the deterministic flight worker, cockpit and
independently sourced contact surface. Google Earth is useful immediately as a
visual benchmark; its own flight mode does not provide our training systems.

## Method and evidence limits

No dedicated deep-research skill/service was available. This is a structured
multi-source web investigation of official documentation, provider policies,
original graphics literature and upstream source code. Pages were accessed on
2026-11-03; live probes below ran around 05:26 UTC. Google pages inspected report
2026-11-02 updates. Prices and service terms are dated observations, not permanent
entitlements. We did not activate billing, obtain a provider contract, benchmark
a global flight, or validate world terrain accuracy.

The current working tree has a bounded regional streaming implementation under
integration. That is distinct from completed global coverage. Existing
`scene.ts` already uses Cesium imagery/terrain providers; the worker/native
atlas shares terrain samples with the renderer. Extending this arrangement is
less invasive than replacing the flight engine.

## Global data and service candidates

| Layer / candidate | Verified availability and rights | Fit and limitation |
| --- | --- | --- |
| [Mapterhorn](https://mapterhorn.com/) | Publisher lists global 30 m sources, Hessen/Bavaria 1 m and Baden-Württemberg 0.25 m. BSD-3 code; separate source-specific data licenses. [512 px Terrarium WebP XYZ and PMTiles extracts](https://mapterhorn.com/data-access/). | Promising open terrain baseline with regional upgrades. Source resolution is not measured accuracy; mixed datums are unresolved below. |
| [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) | GLO-30/GLO-90 freely accessible under their applicable data license; EEA-10 has restricted eligibility. It is a **surface model**, including vegetation/buildings. | Broad relief fallback, not automatically bare-earth landing terrain. The [AWS mirror](https://registry.opendata.aws/copernicus-dem/) is a 2021 snapshot, excludes some restricted areas and has no ocean tiles. |
| [ESA WorldCover](https://esa-worldcover.org/en/data-access) | Global approximately 10 m land-cover data and 2020/2021 Sentinel composites; CC-BY-4.0 with required credit. COG and WMS/WMTS access. | Supports forest/grass/crop/built-up/water materials and a coarse photographic base; does not resolve individual runway markings. |
| [OpenFreeMap](https://openfreemap.org/) / [Protomaps](https://docs.protomaps.com/basemaps/downloads) | OSM-derived global vectors and self-hostable archives; data attribution/license separate from software. Protomaps offers regional extracts; full planet about 120 GB at z0–15. | Good MapLibre map and source of roads/water/building footprints, not aerial imagery. Protomaps discourages production hotlinking to its download bucket. |
| [MapTiler satellite](https://docs.maptiler.com/schema-raster/satellite/) | Commercial global imagery. Publisher claims 5–50 cm in much of Western Europe/USA, 1 m in other populated regions and 2 m elsewhere. [Terrain service](https://docs.maptiler.com/schema-raster/terrain-rgb/) offers global 30 m and selected finer sources. | Strong photo candidate, but regional advertised detail must be checked in actual flight views. Service assets are not open or bundled GPL data. |
| [Cesium ion content](https://cesium.com/platform/cesium-ion/content/) | Ready-to-stream World Terrain, OSM Buildings, Sentinel-2 and partner content. [Terrain ingestion](https://cesium.com/learn/3d-tiling/ion-tile-terrain/) can combine local DEMs with a global base. | Low renderer integration burden. CesiumJS being open source does not grant unrestricted ion service/content rights. |
| [Google Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/use-renderer) | Supported in CesiumJS through OGC 3D Tiles/glTF with key, billing and attribution. | Strong candidate for Google-style photographic structures where coverage exists, subject to the EEA restriction and terms below. |

National open orthophotos remain valuable: the
[regional research](2026-11-03-dynamic-region.md) identifies Hessen, Bavaria and
Baden-Württemberg services. They do not form a uniform global free-photo API.
Google-quality imagery, global cartographic detail and textured 3D buildings are
three different targets; excellent orthophotos alone still look flat at low
altitude. This last comparison is an engineering assessment, not a measured
provider ranking.

### Mapterhorn and reusable Cesium adapters

The [upstream vertical-reference issue](https://github.com/mapterhorn/mapterhorn/issues/255)
remains open. A maintainer's May 2026 response says vertical references were not
being handled. Inspected code at
`2c4195dd90b91a8dde5cfa3e27a1167f64808a41` performs horizontal EPSG:3857
[reprojection](https://raw.githubusercontent.com/mapterhorn/mapterhorn/2c4195dd90b91a8dde5cfa3e27a1167f64808a41/pipelines/aggregation_reproject.py).
Its [encoder](https://raw.githubusercontent.com/mapterhorn/mapterhorn/2c4195dd90b91a8dde5cfa3e27a1167f64808a41/pipelines/utils.py)
rounds heights by `min(1, 2^(19-z)/256)` metres: 1 m through z11, 0.5 m at z12,
0.015625 m at z17. Pixel encoding precision is not vertical accuracy. The
[source catalogue](https://github.com/mapterhorn/mapterhorn/tree/2c4195dd90b91a8dde5cfa3e27a1167f64808a41/source-catalog)
records licenses/resolutions; it does not establish a normalized vertical datum
or acquisition date for every source. Source coverage can be queried through
[coverage metadata](https://single-archive-tiles.mapterhorn.com/coverage.json).

[Re:Earth Terrain](https://terrain.reearth.land/) already exposes a Cesium
quantized-mesh endpoint, with [MIT implementation code](https://github.com/reearth/reearth-terrain).
It applies EGM2008 to Mapterhorn elevation data and advertises ellipsoidal output.
This is a useful reusable renderer path, **not proof that each upstream national
height datum is EGM2008**. Likewise, the MIT
[Cesium Mapterhorn provider](https://github.com/bertt/cesium-mapterhorn-provider)
is an integration reference, not physics validation. Neither was installed.
Preserve original source credits from the
[Mapterhorn attribution inventory](https://mapterhorn.com/attribution/);
the adapter's software license does not replace underlying data terms.

### Small live availability probes

Read-only HTTPS requests used identifying User-Agent
`GeflyResearch/1.0 (https://github.com/gregoryyy/gefly)`. An initial default
Python request returned 403; the identified requests below returned 200. No key
or account was used, and no imagery/terrain bytes were added to the repository.

| Actual response | Bytes / SHA-256 | Observation |
| --- | --- | --- |
| `https://tiles.mapterhorn.com/tilejson.json` | 270 / `d28ade7b57a0c28f8f5d3f3f1b3f07e0c20306ea9e223c4f3dcffc5854f11543` | XYZ, Terrarium, 512 px; latitude bounds ±85.0511287°, CORS `*`. |
| `https://tiles.mapterhorn.com/12/2146/1389.webp` | 53,672 / `944457e76b7b950ef48648f5cb318e47d174d63b862d087ab462444e527c9e3f` | Pillow decoded RGB 512×512, Terrarium heights 103.5–192 m; centre 118 m. Cache max-age 604800; CORS `*`. |
| `https://terrain.reearth.land/cesium-mesh/ellipsoid/layer.json` | 1,410 / `b89d32015b3cc8c1382e1077560093da63aa6176bbf454b491696e7a674f7974` | version 5, geographic/TMS quantized mesh, maxzoom 14, normals/watermask advertised, cache max-age 3600; CORS `*`. |

Terrarium decoding used `R*256 + G + B/256 - 32768` metres. These are transport,
format and finite-value observations near Frankfurt, **not surveyed height,
coverage, mesh, performance or service-uptime validation**. No production SLA was
established. Mapterhorn's Mercator bounds exclude polar caps; an advertised
full-globe adapter bounds field does not prove polar measurements exist.

## What local resampling can do

Two different operations answer this part of the request:

1. **Adaptive reconstruction:** fetch the required source blocks and resample to
   a shared local mesh with more vertices near the aircraft/airport. Use coarser
   distant meshes, geometric-error selection and continuous boundary blending.
   This improves interpolation, silhouettes and rendering; subdividing a 30 m
   DEM into 1 m cells still contains the original information.
2. **Source-driven procedural detail:** use land-cover and vector masks to
   select materials, vegetation, field patterns, roads, water and building
   footprints. Add repeatable texture/normal detail near the camera. This can
   improve perceived realism greatly; it cannot recover the actual unseen rock,
   tree, runway bump or building roof from coarse data. AI/super-resolution
   outputs remain inferred appearance, not measured geography.

A practical proposed material pass uses a small licensed library of grass,
soil, rock, crop, asphalt and roof surfaces, repeated at declared world-metre
scales with variation/blending to hide repetition. Land-cover, slope and vector
masks choose their placement. Fine normal/roughness detail can make nearby
surfaces readable without downloading a unique centimetre image for every place.
Use authored/open material patches or permitted orthophoto extracts; Google's
visual API content is not a source for this texture library. Urban surface
patterns still need buildings for convincing low-level oblique views.

For continuous heights use a declared bounded interpolator; for categorical
land-cover use nearest/class-preserving rules, and aggregate coarse levels
appropriately. Avoid cubic overshoot in a contact surface. GDAL documents
[resampling, NoData, pixel-centre and cross-input edge behavior](https://gdal.org/en/stable/programs/gdalwarp.html).
Its default approximate reprojection error is 0.125 source pixels; exact
transforms or a tighter declared budget are preferable for authored shared
airport/terrain fixtures. This is a proposed method, not a claim that every
resampling library has identical defaults.

Original [geometry-clipmap research](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-2-terrain-rendering-using-gpu-based-geometry)
demonstrates nested grids, incremental updates, transition blending and detail
synthesis. It supports the approach, not a need to replace Cesium's existing
terrain machinery. Reuse its provider/LOD path first. COGs permit efficient
[block/range access](https://gdal.org/en/stable/drivers/raster/cog.html);
[PMTiles](https://docs.protomaps.com/pmtiles/) permits ranged access to archived
tiles; [quantized mesh](https://github.com/CesiumGS/quantized-mesh) supplies a
streamable multiresolution mesh. They solve different storage/rendering steps.

Proposed structures by terrain type:

| Feature | Local refinement | Boundary for training use |
| --- | --- | --- |
| Hills, ridges, valleys | Better source DEM first; adaptive mesh and shading | Do not synthesize terrain clearance obstacles or erase a real ridge. |
| Forest, grass, crops | Land-cover masks, instanced vegetation, nonrepeating materials | Unknown tree heights stay estimates; collision/obstacles require separate evidence. |
| City | OSM footprints, sourced heights/roofs when present, plausible defaults when absent | Mark estimated buildings; do not infer official obstacle data. |
| Roads and water | Traceable vector masks, ribbons/shores, stable distance detail | Bridge/deck height and water levels need separate data; never flatten a whole DEM blindly. |
| Airport | Fine bare-earth DEM, sourced runway/threshold geometry, local materials/markings | No arbitrary noise/displacement on the contact surface; validate wheel/visual alignment. |

Keep coordinate frames and vertical references explicit.
[PROJ vertical transformations](https://proj.org/en/stable/operations/transformations/vgridshift.html)
support source-specific corrections. German DHHN2016 normal heights use an
applicable quasigeoid; EGM2008 orthometric heights use their corresponding geoid.
Neither is interchangeable with WGS84 ellipsoidal altitude merely because all
are called metres. Physics terrain must be pinned independently of camera LOD;
missing data must not become a zero-height plane. Rendering may refine while
physics remains on its accepted snapshot, but discrepancies must be bounded and
visible. Normal maps can add visual roughness without changing ground contact.

## Google Earth and Google Maps routes

| Route | Current verified support | Consequence |
| --- | --- | --- |
| [Google Earth web flight simulator](https://developers.google.com/maps/documentation/earth/flight-simulator) | Experimental; keyboard/mouse flight, streamed high-resolution imagery and buildings; explicitly simplified physics for casual exploration. Satellite mode must be selected for photography. | Immediate way to fly through Google Earth and a visual benchmark. No supported interface found for substituting our JSBSim state, C172 cockpit or training logic into that application. |
| [Google Earth Pro flight simulator](https://support.google.com/earth/answer/148089?hl=en) | Desktop Mac/Windows/Linux; SR22/F-16, keyboard/mouse and joystick. | Separate experience, not our simulator's rendering API. |
| [KML camera tour in Earth Pro](https://developers.google.com/kml/documentation/touring) | A `gx:Tour` playlist can specify camera poses and timed, smooth `gx:FlyTo` transitions; the Earth client interpolates between them. | Proposed inexpensive export of our recorded flight for external visual review. Playback/export alignment and client compatibility must be tested; this is not live cockpit integration or exact fixed-step replay. |
| Google 3D Tiles in CesiumJS | [Official integration](https://developers.google.com/maps/documentation/tile/use-renderer), with credits and key. | Smallest renderer change where eligible. It supplies visual meshes, not an accepted physical DEM. |
| [Maps JavaScript 3D](https://developers.google.com/maps/documentation/javascript/3d/overview) | [Camera API](https://developers.google.com/maps/documentation/javascript/reference/3d-map) includes position, heading, tilt, roll and FOV; [custom glTF models](https://developers.google.com/maps/documentation/javascript/3d/models) have position/orientation. | Candidate separate visual adapter driven by our state. Requires a Google renderer integration, not a Cesium tile-provider swap. Continuous flight-camera behavior is unbenchmarked. |

Maps JavaScript documents its map-centre altitude in metres above mean sea level.
The adapter must resolve that reference, camera/centre distinction and orientation
conventions rather than copy the worker's ellipsoidal coordinates unchanged.
Google's [current desktop tour help](https://support.google.com/earth/answer/148174?hl=en)
also documents loading/playing tours; no KML export or Earth playback was run here.

**EEA constraint:** Google's
[current EEA changes](https://developers.google.com/maps/comms/eea/map-tiles)
exclude satellite Map Tiles and Photorealistic 3D Tiles for projects created
after 2025-07-08 linked to EEA-billed accounts, and older projects leaving the
specified unmodified state. These requests return 403. The distinction is the
project/billing agreement, not the country being flown over. Google suggests
Maps JavaScript 3D and satellite maps as alternatives. Do not assume the user's
actual billing arrangement; if EEA billing applies, test the Maps JavaScript
route rather than plan an unavailable Cesium tile integration.

[Google Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies)
require visible credits, compliant HTTP caching, and prohibit unauthorized
prefetch/offline storage and nonvisual extraction/analysis. Therefore the
ordinary API path must not be treated as permission to extract our own DEM,
collision surface, buildings, procedural textures or AI training set. Independent
overlays need their own data rights. An optional open-source adapter does not
make Google's assets open. Review/video-export rights need separate treatment;
the policy's limited promotional-video permission is not blanket flight-recording
permission. Check the applicable [service agreement](https://cloud.google.com/maps-platform/terms)
and [EEA terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms)
for the actual deployment. No service was activated in this research.

## Cost and hosting snapshot

These are USD public list observations on 2026-11-03, before taxes/custom
agreements; request counts, map loads and transferred GB are different units.

| Option | Published allowance / first paid tier | Material implication |
| --- | --- | --- |
| Open data, self-hosted tiles | Data rights may allow hosting; storage/CDN/egress/operations still cost money. | Version and cache only as each source permits. Do not put a whole planet in Git. |
| OpenFreeMap public | No advertised view/request cap or SLA. Public-service offline extracts ≤3000 tiles or 50 MB, ≤4 parallel requests and identified client; larger extracts need agreement. | Public service terms differ from separately offered planet downloads. |
| [MapTiler Cloud](https://www.maptiler.com/cloud/pricing/) | Free 100k API requests/month; Flex $30/month with 500k requests, $0.15/1000 extra; map-session allowances are separate. The pricing FAQ says third-party SDKs consume tile API requests. | [Cloud terms](https://www.maptiler.com/terms/cloud/) require direct client API access absent agreement; server proxy/cache/export rights cannot be inferred from open client code. |
| [Cesium ion](https://cesium.com/platform/cesium-ion/pricing/) | Community 15 GB/month; Commercial individual $149/month with 150 GB; Premium individual $499/month with 500 GB. | Public/external integration scope needs confirmation under [ion terms](https://cesium.com/legal/terms-of-service). Do not budget the public community site as automatically covered by Community. |
| [Google current list](https://developers.google.com/maps/billing-and-pricing/pricing) | Photorealistic 3D Tiles: 1000 free monthly events, then $6/1000 first tier. Immersive Maps: 5000 free loads, then $7/1000 first tier. | Eligibility remains separate from price. Resolve billable-event definitions before estimating cost per flight hour. |

Google's [usage guide](https://developers.google.com/maps/documentation/tile/usage-and-billing)
describes root-request access covering up to three hours, whereas
[SKU wording](https://developers.google.com/maps/billing-and-pricing/sku-details/maps)
describes a tile-returning event more generally. Do not multiply an assumed child
tile count by a rate, or publish a per-hour estimate, without checking the actual
project's billing metrics. Likewise, measure whether Cesium/MapLibre integrations
consume request-based or session-based provider quotas.

The [OSM standard tile service](https://operations.osmfoundation.org/policies/tiles/)
forbids bulk/offline prefetch; use an eligible provider or own extracts instead.
[OSM data](https://www.openstreetmap.org/copyright) itself has attribution and
ODbL obligations distinct from raster-tile service policy and GPL software.
Provider adapters need their own transport/cache policy; the current same-origin
regional proxy is not a universal permission to proxy commercial tiles.

## Proposed demonstrable sequence

1. **Global exploration baseline:** add an open global 2D vector map and a global
   visual terrain provider, with bounded requests/memory, explicit source
   credits, coverage and failure states. Preserve accepted local physics ground;
   do not imply that a worldwide map already enables worldwide landings.
2. **Better low-altitude regional scenery:** retain official orthophotos and
   fine exercise terrain; add source-driven forest/field/water/road materials
   and selected structures. This is the next reusable improvement to the open
   simulator rather than an effort to manufacture missing photographic detail.
3. **Optional photo-provider comparison:** use the identical recorded route and
   camera in the open renderer, an eligible commercial imagery provider and,
   if appropriate, Maps JavaScript 3D. Test EDFE approach, Odenwald hills and a
   dense city; retain the same physics, controls and instruments.
4. **Expand accepted physics coverage:** source-specific datum reconciliation,
   independent height/edge/slope and runway fixtures, then paired native/render
   validation before enabling landings in new areas.

For each prototype record loaded bytes/requests, p50/p95 frame time and tile
latency, memory, effective ground pixels, source dates, visible/physical height
offset, missing-data behavior, replay behavior and actual service charges. Include
cold cache, fast turns, low-bandwidth loss, near-ground banked views and region
transitions on the reference Mac. Thresholds must be agreed before acceptance;
no performance target or Google-quality result has been passed by this research.

Handoff: choose a bounded visual demonstration from this sequence. Provider
contracts/budget, global imagery consistency, polar/missing coverage, mixed
vertical datums, airport geometry and unrestricted replay/video rights remain
unresolved. Recommendations here do not change SPEC or mark global scenery
implementation complete.
