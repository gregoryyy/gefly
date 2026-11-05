# Gefly: public terrain, aeronautical data and commercial options

**Research date:** 3 November 2026  
**Scope:** Germany, Austria, Switzerland, Mallorca and Cape Town / Western Cape, with worldwide fallback and commercial options.  
**Product context:** [gregoryyy/gefly](https://github.com/gregoryyy/gefly), an open-source flight simulator with a potential paid hosted edition.

## 1. Decision summary

Detailed regional scenery can be built from public data without depending on Google Earth. Hessen, Austria, Switzerland and Mallorca offer strong combinations of elevation and aerial imagery. Switzerland also supplies extensive 3D building geometry. Cape Town has useful public services, but equivalent commercial redistribution rights were not established.

Aeronautical data is a separate procurement problem. Public-domain airport records and regional VFR datasets are useful foundations. A complete, coherent global IFR database—including procedures and matching charts—is more readily obtained through a licensed supplier.

Recommended direction:

1. Build the open edition around downloadable regional scenery and a versioned navigation dataset with explicit reuse rights.
2. Complete Hessen first; use Switzerland for a visually strong expansion and Mallorca for a geographically bounded scenery package.
3. Offer paid hosting for preparation, streaming, updates, exercises and support. Add commercial scenery and navigation providers as optional integrations.
4. Assess Navigraph for individual flight-simulation users. Obtain separate terms for any institutional or professional training offering.
5. Keep Google imagery optional until availability, permitted use and external-customer licensing are confirmed for the intended integration.

These are architecture and product recommendations. Dataset availability and published terms are sourced below; unresolved rights, coverage and prices are identified explicitly. This review did not benchmark download pipelines or secure supplier agreements.

## 2. Separate the data layers

| Layer | Purpose | Typical input | Important distinction |
| --- | --- | --- | --- |
| Bare-earth terrain | Mountains, valleys, ground contact and terrain clearance | DTM / DGM, often GeoTIFF or classified LiDAR | Grid spacing is not vertical accuracy. |
| Surface height | Trees, roofs and other objects above terrain | DSM / DOM, point clouds | A surface model is not a substitute for bare-earth collision terrain. |
| Ground imagery | Recognisable fields, roads, settlements and airport surfaces | Orthophotos, satellite imagery | Pixel size is not positional accuracy; imagery does not supply reliable façade textures. |
| Buildings and land cover | Urban geometry, vegetation and surface classification | CityGML, vectors, classified LiDAR | LoD2 roofs and walls are not a photorealistic city mesh. |
| Aeronautical database | Airports, radio aids, fixes, routes, airspace and procedures | Structured datasets, AIXM, ARINC 424 or vendor formats | A collection of airport points is not a complete navigation database. |
| Charts | Pilot-facing VFR, en-route, airport and approach information | PDFs, raster tiles, vector chart services | Display rights and underlying data rights can differ. |
| Operational state | Weather, closures, outages, temporary airspace and traffic | METAR/TAF, NOTAM, scenario and traffic feeds | Static navigation data alone does not describe today's operating conditions. |

Public access, zero acquisition price, permission to modify, permission to redistribute, and permission to sell hosted access are different properties. Record each separately.

## 3. Public terrain and scenery

### 3.1 Hessen

Hessen is a practical starting region for a detailed open scenery pipeline. Its official open-data catalogue includes DGM1, DOM1, DOP20, LoD2 buildings, laser-scanning data and landscape models. Its published open-data conditions expressly allow commercial and non-commercial processing, combination and distribution. Retain the exact product licence with each download; ancillary datasets may have different terms. [H1]

| Product | What it provides | Application in Gefly |
| --- | --- | --- |
| DGM1 | Bare-earth elevation on a 1 m grid | Ground geometry, physics elevation and terrain clearance |
| DOP20 | Aerial imagery with 20 cm ground pixels | Ground textures and recognisable visual navigation landmarks |
| LoD2 buildings | Building volumes with generalised roof geometry | Towns, industrial sites and skyline geometry |
| DOM1 / LiDAR | Surface heights and measured points | Vegetation heights and additional reconstruction |
| Basis-DLM | Landscape features and classifications | Roads, water and land-cover masks |

DGM1 and DOP20 are source products, not finished simulator assets. LoD2 adds useful roof and wall geometry but does not provide photographed façades. Runway markings, lighting, signs, obstacles and airport-specific contact surfaces require separate treatment. [H2–H4]

The applicable German Zero licence permits modification and redistribution, including commercial use, without attribution conditions. Other source licences may require attribution; preserving provenance is advisable regardless. Do not assume that a Hessen terrain licence also covers geoid grids, airport charts or third-party scenery. [L1]

### 3.2 Germany beyond Hessen

Comparable data exists through state mapping agencies. A national scenery package is feasible, but requires harmonising downloads, dates, coordinate systems, height references and licences.

| State / source | Relevant products | Published licensing position |
| --- | --- | --- |
| Rheinland-Pfalz | DGM1, orthophotos, surface models, LoD1/LoD2 | DL-DE-BY 2.0; attribution and modification notices required. [DE1] |
| Baden-Württemberg | DGM1, DOP20, surface models, LoD1/LoD2, landscape data | DL-DE-BY 2.0. [DE2] |
| Bavaria | DGM1, DOP20, LoD2 and other open geodata | Relevant product metadata identifies CC BY 4.0; preserve the notice for each selected product. [DE3] |
| Nordrhein-Westfalen | Elevation, imagery, buildings and landscape downloads | Check each product's metadata. This review does not assign one blanket licence to every file in the portal. [DE4] |

This is a verified shortlist, not an audit of all 16 states. The BKG nationwide LoD2-DE product explicitly limits eligible users; its catalogue entry is not an unrestricted open-data offer. State open-data releases are the clearer starting route for Gefly. [DE5]

### 3.3 Austria

BEV supplies a nationwide LiDAR-derived terrain model at **1 m grid spacing**, as well as **20 cm orthophotos**. The terrain product is distributed as GeoTIFF; the current national ALS product uses a European projected coordinate system and an explicitly documented vertical reference. Acquisition dates vary across the mosaic. [AT1–AT2]

The relevant open terrain and orthophoto releases use **CC BY 4.0**. That permits commercial adaptation and redistribution with the required credit, licence link and change notice. Select the open releases rather than assuming that all BEV shop products have identical terms. [AT3, L3]

Local 3D building datasets can supplement the national terrain and imagery. Vienna publishes a generalised LoD2.1 roof model under CC BY 4.0. This review did not establish a comparable nationwide open building package. [AT4]

**Assessment:** a strong option for Alpine and general-aviation scenery; building coverage needs a separate regional selection.

### 3.4 Switzerland

| Product | Coverage and detail | Relevance |
| --- | --- | --- |
| swissALTI3D | National terrain supplied at 0.5 m or 2 m grid spacing | Detailed valleys and mountains; some 0.5 m cells are oversampled from less-dense source measurements. [CH1] |
| SWISSIMAGE | 10 cm in plains and main Alpine valleys; 25 cm over the Alps | High-detail ground texture. [CH2] |
| swissBUILDINGS3D | Extensive national 3D building geometry, including roof shapes | Strong basis for urban scenery; geometry should not be confused with photographic façade textures. [CH3] |

Swisstopo's open-data terms expressly allow commercial use, processing and redistribution with source attribution. Product-specific credits must also be retained. Heavy use of public geoservices can lead to restrictions or a separate agreement. [CH4]

Swisstopo already uses **Cesium Quantized Mesh** for its 3D terrain and exposes 3D content for integration. This reduces format experimentation for Gefly, but does not establish unlimited free production bandwidth. Downloading and hosting permitted derived assets remains a separate deployment choice. [CH5]

**Assessment:** the strongest overall combination of detailed terrain, imagery and buildings among the regions reviewed.

### 3.5 Mallorca / Spain

Spain's PNOA programme provides both imagery and elevation. The Balearics' 2024 third-coverage LiDAR and first-version derived terrain/surface products are marked as published in the September 2026 status table. Third-coverage specifications define a **0.5 m elevation grid**. Older 2 m terrain products are also available. [ES1]

The national imagery status table lists **2024 Balearic orthophotos at 25 cm** as available through the current mosaic. [ES2]

IGN/CNIG publishes a clear **CC BY 4.0** reuse framework, including instructions for attribution of modified products. Use those product downloads and preserve their notices. One regional IDEIB imagery metadata record mixes BY-SA wording with BY attribution examples; do not resolve that inconsistency by assumption. [ES3–ES4]

LiDAR can support building and vegetation reconstruction, but is not itself a finished textured building package.

**Assessment:** a good complete-region demonstrator, combining a bounded island with detailed topography and recent imagery.

### 3.6 Cape Town / Western Cape

Cape Town publishes a **5 m bare-earth Ground Level Map** derived from 2018–2019 LiDAR. The service states approximately 30 cm vertical accuracy and identifies its height reference. This is municipal coverage, not a verified high-resolution model of the entire Western Cape. [ZA1]

NGI produces aerial imagery at **25 cm ground sampling distance** in its more recent acquisition programme. Cape Town also publishes municipal imagery; the 2024 service describes coverage of approximately 30% of the metro. [ZA2–ZA3]

The licensing position is less clear than in the European regions:

- The municipal 2024 imagery description explicitly permits unrestricted use for **non-commercial purposes**.
- NGI identifies its products as state copyright; this review did not establish a broad licence for commercial rehosting and scenery redistribution.
- The elevation service's accessibility does not by itself establish those redistribution rights. [ZA1–ZA4]

**Assessment:** technically attractive, but obtain explicit terms for the chosen elevation and imagery releases before including them in a paid or redistributable package. Confirm coverage independently for Stellenbosch, the Cape Peninsula and any wider Western Cape route.

### 3.7 Worldwide fallback

| Source | Role | Limitation |
| --- | --- | --- |
| Copernicus DEM GLO-30 | Worldwide 30 m elevation baseline | A **surface model** including vegetation and structures, not a consistent bare-earth DTM. Retain its specific licence and attribution. [G1] |
| Sentinel-2 | Broad landscape colour and land-cover input; relevant bands at 10 m | Much coarser than local orthophotos; needs cloud masking and compositing. [G2] |
| OpenStreetMap | Roads, building footprints, water and other features | Variable completeness; ODbL attribution and applicable database share-alike obligations require deliberate handling. Public tile-service access is separate from the data licence. [G3] |

Use these for continuity outside detailed regions. They should not silently replace airport-grade ground data during an exercise that depends on accurate runway contact or obstacle clearance.

## 4. Commercial terrain and imagery

| Provider / product | What it contributes | Commercial decision |
| --- | --- | --- |
| Cesium World Terrain | Prepared global terrain streaming in a format suited to CesiumJS | Convenient coverage, but not uniformly high resolution. Its published coverage table lists Europe broadly at 30 m; local public 1 m data can be materially better. [C1] |
| ArcGIS World Imagery | Global imagery with documented CesiumJS integration | Requires an ArcGIS account and appropriate service entitlement. Check regional resolution, freshness, metering and offline rights. [C2] |
| Google Photorealistic 3D Tiles | Textured 3D surroundings closest to the initial Google Earth concept | Availability and permitted use depend on the access route and agreement. Not an open scenery source. [C3–C4] |
| Vexcel | Advertised 7.5–15 cm orthophotos, elevation products and photorealistic city meshes | Obtain a quote and a coverage sample for each region; advertised product capability does not establish availability everywhere. [C6] |

### Google and Cesium: specific constraints

For direct Google Map Tiles API projects subject to the EEA changes effective from **8 July 2025**, satellite 2D tiles and Photorealistic 3D Tiles are unavailable. Google documents Maps JavaScript 3D as an alternative. That is a different integration route and would require evaluating continuous flight camera control, performance and terms. Existing-project treatment depends on the conditions in Google's notice. [C3]

Cesium separately licenses Google content. Consequently, the direct Google EEA restriction should not be assumed to settle access through Cesium. This review has **not confirmed eligibility for Gefly's intended deployment**. [C4]

The Cesium Google-content terms restrict extraction, rehosting, caching except as expressly allowed, and creation of derived content. They also impose attribution and restrictions on combining content with other maps, and contain high-risk-use provisions mentioning aviation. Confirm the actual simulator use case; do not infer that a consumer entertainment simulator is automatically approved or automatically prohibited. Do not plan to extract Google geometry into an independent physics or offline scenery package. [C4]

Cesium lists commercial plans from **US$149/month for an individual** and **US$524/month for a team**, but expressly directs customers to discuss integration pricing and licensing when solutions are used outside their organisation. These figures are **not a production quote for a public paid simulator**. [C5]

## 5. Aeronautical maps and navigation data

### 5.1 What a realistic environment needs

| Domain | Required information | Simulator behaviour it supports |
| --- | --- | --- |
| Aerodromes | Runway thresholds and elevations, dimensions, surfaces, displaced thresholds, taxiways, lighting and communications | Taxi, take-off, landing and airport procedures |
| Radio navigation | VOR/NDB/DME/ILS locations, frequencies, identifiers, alignment and coverage information | Tuning, identification and instrument guidance |
| Fixes and routes | Waypoints, airway segments, directionality, altitude restrictions and applicable free-route rules | Route planning and en-route navigation |
| Instrument procedures | Departures, arrivals, approaches, missed approaches, holds, leg definitions and constraints | GPS/FMS execution and procedural exercises |
| Airspace | Horizontal and vertical boundaries, class, restrictions and activation | Airspace awareness and entry rules |
| Charts | VFR, IFR en-route, airport, departure, arrival and approach graphics | A readable reference consistent with the simulated database |
| Operational changes | NOTAMs, closures, outages and temporary restrictions | Current or deliberately configured operating conditions |

A chart and a structured procedure serve different functions. Drawing a line through named fixes does not implement turns, intercepts, holds, altitude conditions or missed-approach sequencing.

### 5.2 Source options

| Source | Useful coverage | Reuse and limitations |
| --- | --- | --- |
| OurAirports | Worldwide airports, runways, communication frequencies and radio aids | Public domain. Useful baseline, but its listed exports do not constitute a complete airway, airspace, ILS and IFR-procedure database. [A1] |
| OpenFlightMaps | Regional VFR aeronautical data | Commercial use permitted by its database licence, with attribution and obligations to report errors and enable user feedback. Rendered plates may have separate terms; check region and product coverage. [A2] |
| FAA NASR, CIFP and chart products | Extensive US aeronautical records, structured procedures and published charts | Public downloads make the US a strong implementation and validation region. CIFP is raw ARINC 424, updated every 28 days, and needs processing. Preserve the notices for the exact products used. [A3] |
| EUROCONTROL EAD | European official static data, AIPs, charts and NOTAM services; some wider coverage | A signed agreement governs data access and reuse. Commercialising data or value-added products attracts service charges and royalty provisions. EAD Basic is a limited consultation service. [A4] |
| Navigraph / Jeppesen | Simulation navigation databases and matching chart products | Standard model licences individual end users. Current data requires the appropriate subscription; integration is subject to developer approval and restrictions. [A5–A7] |
| Professional suppliers such as Lufthansa Systems Lido | Worldwide navigation products and chart-related APIs | A procurement candidate for negotiated institutional or redistribution needs. Scope, delivery format, price and Gefly rights remain unquoted. [A8] |
| openAIP | Candidate for additional community aeronautical coverage | Its primary licensing pages/API could not be retrieved in this review. Conflicting secondary descriptions are insufficient to establish Gefly's paid-use rights. Keep it pending direct verification. [A12] |

OurAirports' radio-aid export lists types such as VOR, NDB, DME and TACAN. It should not be treated as a substitute for all localizer/glideslope geometry and procedure coding. [A1]

### 5.3 National publications for the target regions

| Region | Primary reference | Role in the project |
| --- | --- | --- |
| Germany | DFS AIS portal and AIP | Validate airports, procedures, frequencies and airspace. |
| Austria | Austro Control eAIP | Validate Austrian aeronautical information; published copyright applies. |
| Switzerland | Skyguide / skybriefing | Authoritative aeronautical publications; product access varies. |
| Mallorca / Spain | ENAIRE AIP | Spanish airport, en-route and procedure reference. |
| South Africa | SACAA AIP and aeronautical charts | Reference for Cape Town and other South African airports and procedures. |

Source links: [A9]. Access to an official publication does not by itself establish permission to bulk-extract, redistribute or sell its charts or database. National terrain open-data licences do not cover these aviation publications.

### 5.4 Navigraph integration and business-model fit

Navigraph's standard arrangement grants a personal, non-transferable licence to the user. A developer cannot purchase one ordinary subscription and sublicense its data to all Gefly customers. [A5]

The documented website flow permits server-side database use with closer provider coordination and entitlement checks. It distinguishes outdated packages for users without a current subscription from current-cycle access for subscribers. An outdated package is still licensed content, not freely redistributable open data. [A6]

Its published restrictions limit use to flight simulation and exclude professional use under the standard arrangement. They also prohibit chart-like renderings from the navigation-data API and restrict chart-app implementations. Use of a chart API is therefore a separate approved integration, not an automatic consequence of obtaining navigation records. [A7]

**Implication:** a paid consumer Gefly edition with user-connected subscriptions is a candidate. An all-inclusive subscription, stand-alone chart product or flight-school deployment requires a different confirmed rights arrangement.

### 5.5 Updates and reproducibility

AIRAC coordinates significant aeronautical changes on common effective dates spaced **28 days** apart. Charts, procedures, routes, frequencies and simulated facilities should be aligned to a coherent effective dataset. Weather and NOTAM changes follow different timelines. [A10]

Recommended behaviour:

- Show the navigation cycle and scenario date.
- Pin exercises and replay sessions to a known database revision.
- Preserve matching charts where the licence permits; otherwise retain references and entitlement requirements.
- Validate links between procedures, runway identifiers, fixes and radio aids before publication.
- Prevent accidental mixing of current charts with the prototype's historical navigation inventory.
- Offer a documented historical scenario mode rather than silently claiming outdated data is current.

## 6. Data alone does not create realism

### Radio and avionics

Implement receiver behaviour separately from the station inventory: frequency/channel tuning, identification audio, valid/invalid indications, VOR course and TO/FROM logic, ILS geometry, DME slant range and reception limits. DME measures the direct aircraft-to-station distance rather than horizontal ground distance. Published service volumes and approved procedure coverage are relevant inputs. [A11]

For RNAV, add a procedure interpreter that understands supported leg types and aircraft limitations. Unsupported instructions should be explicit rather than approximated invisibly. The autopilot must follow the simulated avionics output, not a separate ideal route.

### Airport and scenery alignment

Keep runway geometry, terrain heights, localizer alignment, glideslope geometry and threshold references consistent. A visually convincing runway texture can still be displaced relative to the navigation database or physically uneven for landing.

Use a stable physical elevation surface. Rendering detail may change with camera distance; aircraft contact and height above ground should not change merely because the graphics engine selects another level of detail.

### Weather, traffic and ATC

NOAA's Aviation Weather Center API supplies worldwide METAR, TAF and SIGMET products, with documented rate limits and bulk cache files. These are useful inputs; translating them into spatial clouds, wind, visibility and turbulence remains simulator work. [W1]

Traffic, ATIS and ATC also need an operational model. Real frequencies do not create real clearances or separation. For initial exercises, use deterministic traffic and controller scenarios. Any later language-model voice interface should verbalise validated scenario state rather than invent procedure names, runway availability or clearances.

## 7. Licensing and commercial packaging

### 7.1 Rights matrix

| Licence / access model | Paid hosted use | Downloadable scenery / data | Main obligations or uncertainty |
| --- | --- | --- | --- |
| DL-DE-Zero 2.0 | Permitted | Permitted | Confirm the exact source product carries this licence. [L1] |
| DL-DE-BY 2.0 | Permitted | Permitted | Provider, licence and dataset attribution; indicate modifications. [L2] |
| CC BY 4.0 | Permitted | Permitted | Attribution, licence link, change notice and preservation of granted freedoms. [L3] |
| Swisstopo OGD terms | Permitted | Permitted | Required source credit and applicable product-specific notices; service capacity is separate. [CH4] |
| OurAirports public domain | Permitted | Permitted | Quality/completeness still need validation. [A1] |
| OpenFlightMaps database licence | Permitted subject to terms | Check selected product and licence | Attribution and error-reporting workflow; plates can differ. [A2] |
| Navigraph standard model | Candidate for approved individual-user integration | No general sublicensing entitlement | End-user entitlement, application restrictions and professional-use boundary. [A5–A7] |
| EAD / commercial supplier contract | As negotiated | As negotiated | External users, derivative outputs and royalties must be covered. [A4] |
| Google content | Only within the applicable agreement | Do not assume permission | Extraction, storage, derivation, mixing and attribution restrictions. [C4] |
| Cape Town imagery described as non-commercial | Not established | Commercial redistribution not established | Obtain specific permission for the proposed package. [ZA3] |

Software and data licences are separate. The open-source simulator can use optional proprietary services without turning those services into open data. Conversely, charging for hosting does not by itself require dual-licensing the software; free-software licences can allow commercial distribution. Any alternate code licence must be evaluated against ownership and dependency obligations. [L4]

### 7.2 Product options

| Offering | Data approach | Value sold |
| --- | --- | --- |
| Free self-hosted edition | Open regional scenery and reusable baseline navigation data | Accessible simulation, source code, local operation and community extensions |
| Paid hosted regional edition | Prepared open data served reliably; documented updates | Convenience, performance, quality assurance, exercises and support |
| Hosted enthusiast edition | Regional or commercial scenery plus approved user-linked navdata/chart access | Larger coverage and more complete avionics/procedure experience |
| Institutional training edition | Contracted data and aircraft/scenario validation appropriate to the use case | Instructor workflows, controlled exercises, support and validation evidence |

The most defensible paid value is the integrated experience: reliable scenery, consistent avionics and procedures, useful exercises, updates and support. Open raw terrain alone provides little exclusivity.

### 7.3 Costs to model

Avoid treating zero-cost source data as zero-cost production. Budget for acquisition automation, reprojection, tiling, geometry conversion, validation, storage, CDN egress and updates. Commercial options add account fees, usage charges, entitlements and potentially royalties.

An illustrative raw-storage calculation: one square kilometre of a 1 m, single-band float32 terrain grid is about **4 MB**; 20 cm RGB imagery for the same area is about **75 MB** before compression, overviews and metadata. These are arithmetic estimates, not measured Gefly package sizes. Source resolution should be retained selectively around airports and other areas where it materially improves the experience.

For vendor quotes, specify external users, geographic coverage, concurrency, streamed volume, offline use, cache duration, derivative meshes, collision use, map combinations and consumer versus institutional use. Published developer plans should not substitute for confirmation of those rights.

## 8. Recommended architecture

Use independent adapters and manifests for each source. Avoid encoding a provider's licence assumptions into a universal asset format.

| Component | Responsibility |
| --- | --- |
| Acquisition adapters | Retrieve selected releases and retain source metadata, terms and checksums. |
| Geospatial preparation | Normalise horizontal and vertical references; validate bounds, nodata, coastlines and seams. |
| Scenery preparation | Produce terrain tiles, imagery pyramids, building meshes and land-cover masks. |
| Navigation preparation | Import a coherent cycle; validate airport/runway/fix/procedure relationships. |
| Physical world | Stable terrain/contact surfaces, navigation signals and scenario conditions. |
| Visual world | Cesium imagery/terrain/buildings with controllable detail and provider-specific attribution. |
| Charts and entitlement | Enforce permitted display, cache and subscription behaviour independently of navigation calculation. |
| Scenario records | Pin data revisions, weather settings, failures and aircraft configuration for repeatable exercises. |

For each dataset, retain at least:

- Source organisation, product ID, download location and acquisition date.
- Survey date or date range; release date; AIRAC cycle where applicable.
- Bounding geometry, native resolution and stated accuracy.
- Horizontal coordinate system, vertical datum, units and transformation method.
- Licence URL and retained notice; attribution text; permitted distribution and cache modes.
- Checksums, transformation version, derived-asset IDs and validation results.

This is a proposed implementation design. It does not imply that Gefly already implements the complete pipeline.

## 9. Implementation sequence and acceptance checks

| Stage | Deliverable | Acceptance condition |
| --- | --- | --- |
| 1. Hessen reference region | DGM1, orthophotos, buildings and selected airports | Visual terrain, physical ground and airport references align; provenance and licences travel with the package. |
| 2. Complete local exercise | Departure, radio navigation, airspace interaction and landing | Radio indications, frequencies, chart references and scenario data agree. |
| 3. Navigation-provider evaluation | Import a representative set of routes and procedures | Holds, turns, altitude constraints and missed approaches execute correctly; unsupported features are reported. |
| 4. Switzerland or Mallorca | Repeat the preparation pipeline on a second region | Source-specific coordinate and licence differences are handled by adapters rather than manual exceptions. |
| 5. Hosted product | Streaming, entitlement, updates and monitoring | Measured cost per session and verified external-user rights support the intended price. |
| 6. Wider coverage | Additional German states, Austria, Cape and optional global services | New regions meet the same data and licensing criteria; no silent quality downgrade inside validated exercises. |

Priorities before committing to suppliers:

1. Resolve Navigraph approval for the browser simulator, charts and intended user model.
2. Confirm Cesium/Google access and terms for the actual billing and distribution arrangement.
3. Obtain Cape Town/NGI commercial reuse terms and exact regional coverage.
4. Select specific open-data releases, including any geoid or transformation grids, and preserve their notices.
5. Measure package sizes, frame times and streamed bytes on representative flights.
6. Define the boundary between consumer learning and any professional training offering.

## 10. Sources

Links identify the primary source pages used in this review unless explicitly described as an unresolved candidate. Product revisions and contract terms should be checked when procuring or ingesting a release.

### Terrain and regional data

- **H1:** [Hessen open-data catalogue and reuse conditions](https://hvbg.hessen.de/geoinformation/open-data).
- **H2:** [Hessen digital terrain models](https://hvbg.hessen.de/landesvermessung/geotopographie/3d-daten/digitale-gelaendemodelle).
- **H3:** [Hessen orthophotos](https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/digitale-orthophotos-true-orthophoto).
- **H4:** [Hessen 3D building models](https://hvbg.hessen.de/landesvermessung/geotopographie/3d-daten/3d-gebaeudemodelle).
- **DE1:** [Rheinland-Pfalz open data](https://lvermgeo.rlp.de/geodaten-geoshop/open-data).
- **DE2:** [Baden-Württemberg open geodata](https://www.lgl-bw.de/Produkte/Open-Data/).
- **DE3:** Bavaria: [DGM1](https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=dgm1), [DOP20](https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=dop20rgb), [LoD2](https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=lod2).
- **DE4:** [NRW geobasis downloads](https://www.opengeodata.nrw.de/produkte/geobasis/).
- **DE5:** [BKG LoD2-DE product and eligibility](https://gdz.bkg.bund.de/index.php/default/3d-gebaudemodelle-lod2-deutschland-lod2-de.html).
- **AT1:** [BEV ALS terrain model](https://www.bev.gv.at/Services/Produkte/Digitales-Gelaendehoehenmodell/ALS-Hoehenraster.html).
- **AT2:** [BEV orthophotos](https://www.bev.gv.at/Services/Produkte/Luftbildprodukte/Orthophoto-Farbe.html) and [national coverage information](https://www.bev.gv.at/en/Services/Products/Remote-Sensing.html).
- **AT3:** BEV metadata examples: [2025 ALS DTM release tile](https://doi.org/10.48677/d12e5cc1-d4cd-4620-8999-2663c62c0ac9), [open orthophoto tile](https://doi.org/10.48677/ee8198db-270e-4ba6-a713-63dbce34d393); [BEV catalogue](https://data.bev.gv.at/).
- **AT4:** [Vienna generalised LoD2.1 roof model](https://www.data.gv.at/datasets/86d88cae-ad97-4476-bae5-73488a12776d?locale=de).
- **CH1:** [swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d).
- **CH2:** [SWISSIMAGE](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10).
- **CH3:** [swissBUILDINGS3D 3.0 Beta](https://www.swisstopo.admin.ch/en/landscape-model-swissbuildings3d-3-0-beta) and [2.0 geometry specification](https://www.swisstopo.admin.ch/en/landscape-model-swissbuildings3d-2-0).
- **CH4:** [Swisstopo terms for free geodata and geoservices](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices).
- **CH5:** [Swiss 3D viewer terrain and building update](https://www.swisstopo.admin.ch/en/3d-viewer-update-data) and [Switzerland in 3D](https://www.swisstopo.admin.ch/en/switzerland-in-3d).
- **ES1:** PNOA LiDAR: [third-coverage status](https://pnoa.ign.es/web/portal/pnoa-lidar/tercera-cobertura), [technical specifications](https://pnoa.ign.es/pnoa-lidar/especificaciones-tecnicas), [downloads](https://pnoa.ign.es/pnoa-lidar/productos-a-descarga).
- **ES2:** [PNOA imagery status](https://pnoa.ign.es/pnoa-imagen/estado-del-proyecto).
- **ES3:** [IGN data policy](https://www.ign.es/web/politica-datos) and [reuse licence](https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf).
- **ES4:** [IDEIB 2024 imagery metadata showing inconsistent licence wording](https://ideib.caib.es/geoserveis/rest/services/imatges/PNOA_2024_BAL_22_25cm/ImageServer/info/iteminfo).
- **ZA1:** [Cape Town Ground Level Map 5 m DEM service](https://cityimg.capetown.gov.za/erdas-iws/esri/GeoSpatial%20Datasets/rest/services/Elevation_CCT_GLM2019_5m_DEM/MapServer).
- **ZA2:** [NGI aerial imagery programme](https://ngi.dlrrd.gov.za/index.php/what-we-do/aerial-photography-and-imagery/35-colour-digital-aerial-imagery-at-0-5m-gsd-2008-2016-and-0-25m-gsd-2017-current).
- **ZA3:** [Cape Town 2024 imagery service and use statement](https://cityimg.capetown.gov.za/erdas-iws/esri/GeoSpatial%20Datasets/rest/services/Aerial%20Imagery_Aerial%20Imagery%202024/MapServer).
- **ZA4:** [NGI maps and state-copyright statement](https://ngi.dlrrd.gov.za/index.php/what-we-do/maps-and-geospatial-information/38-maps-and-charts-digital-raster-or-printed).
- **G1:** [Copernicus DEM products and access conditions](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM).
- **G2:** [Sentinel-2 mission and spatial resolutions](https://sentiwiki.copernicus.eu/web/s2-mission).
- **G3:** [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright).

### Commercial scenery

- **C1:** [Cesium World Terrain coverage and resolution](https://cesium.com/platform/cesium-ion/content/cesium-world-terrain/).
- **C2:** [Esri World Imagery with CesiumJS](https://developers.arcgis.com/cesiumjs/scenes/satellite-basemap-tiles/display-a-scene/).
- **C3:** [Google Map Tiles API changes for EEA customers](https://developers.google.com/maps/comms/eea/map-tiles?hl=en).
- **C4:** [Cesium terms for Google content](https://cesium.com/legal/terms-for-google/).
- **C5:** [Cesium ion plans and external integration notice](https://cesium.com/platform/cesium-ion/pricing/).
- **C6:** [Vexcel imagery, elevation and 3D products](https://vexceldata.com/products/).

### Aeronautical data and weather

- **A1:** [OurAirports downloads and public-domain terms](https://ourairports.com/data/), [data dictionary](https://ourairports.com/help/data-dictionary.html).
- **A2:** [OpenFlightMaps licence overview](https://openflightmaps.org/about/) and [FAQ on commercial use and plate rights](https://openflightmaps.org/faq/).
- **A3:** FAA: [aeronautical products](https://www.faa.gov/data/aero_data), [CIFP](https://www.faa.gov/air_traffic/flight_info/aeronav/productcatalog/digitalproducts/cifp/), [VFR raster charts](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/).
- **A4:** [EUROCONTROL EAD coverage, agreements and charging model](https://www.eurocontrol.int/service/european-ais-database).
- **A5:** [Navigraph licensing model](https://beta.docs.navigraph.com/navigraph-model).
- **A6:** [Navigraph navigation-data API and website flow](https://beta.docs.navigraph.com/navigation-data/api-overview).
- **A7:** [Navigraph developer restrictions](https://beta.docs.navigraph.com/restrictions) and [developer terms](https://beta.docs.navigraph.com/developer-terms-of-service).
- **A8:** [Lido Charting Data API](https://developer.lidowebportal.com/charting-data-api); [CASA listing of aeronautical data suppliers](https://www.casa.gov.au/operations-safety-and-travel/aeronautical-information-management/aeronautical-data-service-providers).
- **A9:** National references: [DFS](https://ais.dfs.de/), [Austro Control eAIP and copyright notice](https://eaip.austrocontrol.at/?lang_cd=en), [Skyguide AIM](https://skyguide.ch/services/aeronautical-information-management), [skybriefing publications](https://www.skybriefing.com/publications), [ENAIRE AIP](https://aip.enaire.es/AIP/), [SACAA AIP](https://www.caa.co.za/aip/), [SACAA charts](https://www.caa.co.za/industry-information/aeronautical-information-aeronautical-charts/).
- **A10:** [ICAO aeronautical information management and AIRAC](https://www.icao.int/airnavigation/aeronautical-information-management).
- **A11:** [FAA AIM: air navigation and radio-aid behaviour](https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap1_section_1.html).
- **A12:** openAIP candidate links: [website](https://www.openaip.net/), [commercial licensing](https://www.openaip.net/commercial-licensing), [API documentation](https://docs.openaip.net/). Current commercial terms were not independently verified in this review.
- **W1:** [NOAA Aviation Weather Center data API](https://aviationweather.gov/data/api/).

### Licence texts and software model

- **L1:** [Data licence Germany — Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
- **L2:** [Data licence Germany — Attribution 2.0](https://www.govdata.de/dl-de/by-2-0).
- **L3:** [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
- **L4:** [GNU: selling free software](https://www.gnu.org/philosophy/selling.en.html).

