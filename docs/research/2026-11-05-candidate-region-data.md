# Regional scenery and aviation data coverage candidates

Researched 2026-11-05 by Codex orchestrator root, with the separate
[regional imagery research](2026-11-05-candidate-region-imagery.md) by
region_imagery. Primary-source availability assessment, not an integration,
selected roadmap region, accepted asset licence or navigation-fidelity claim.
Cape region is interpreted as Cape Town/Western Cape, South Africa.

Extended 2026-11-06 by Codex orchestrator with `country_sources`,
`aviation_sources` and `coverage_housekeeping`: national scenery sources and
airport/runway/frequency/navaid/fix/ILS coverage. TODO 2.0.148;
R-DATA-1/R-WORLD-11/R-NAV-1/R-NAV-2/R-NAV-3. This is the maintained comparison;
the linked regional notes retain detailed source findings. Research uses primary
publisher pages and existing inspected notes; no bulk datasets were imported.
Listed resolutions are grid/pixel spacing, not measured accuracy or a simulator
rendering promise. Open downloads, licensed access and consultation-only sources
are distinguished below. Recommendations do not select implementation regions.

## Shared global baseline

[OurAirports open downloads](https://ourairports.com/data/) provide worldwide
public-domain airport, runway, communication-frequency and radio-navaid CSVs.
They are community records without a fitness/accuracy guarantee, not a current
AIRAC/procedure or complete ILS geometry package. All eight candidate regions can
use this baseline; individual facilities and fields require regional inspection.
Airport records are not complete detailed airport scenery/building assets.

[Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)
provides global 30 m and 90 m products. The
[GLO-30 licence](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf)
permits reproduction, distribution, public communication and adaptation without
fees, with attribution, modification and disclaimer obligations. Its sampling is
not a vertical-accuracy statement. It is a DSM including vegetation/buildings,
not a surveyed bare-earth runway surface. Access routes may need registration;
selected edition footprints, voids, vertical datum and service limits require
an ingestion review. Do not assume the separate European 10 m product is open
to the general public under the 30 m licence.

[Sentinel-2](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2)
provides free optical data with visible bands at 10 m. It offers a low-detail
photographic fallback over these latitudes, requiring cloud/mosaic processing;
it is not sub-metre aerial photography. The
[ESA WorldCover composites](https://esa-worldcover.org/en/data-access) are a
separate prepared 10 m option with their own attribution/edition metadata.

## Candidate comparison

| Region | Airport/navaid baseline | Elevation candidate | High-resolution photographic candidate |
| --- | --- | --- | --- |
| Cape Town/Western Cape | OurAirports | Global 30 m; city 5 m bare-earth grid exists but open redistribution not verified | City/NGI imagery exists; selected raster reuse rights not verified |
| Canary Islands | OurAirports | IGN 5 m; listed 2 m coverage | Open 2024 20 cm ortho for seven main islands |
| Mallorca | OurAirports | IGN 5 m | National PNOA 2024 25 cm; 2023 ICGIB 15 cm service from 18 cm capture, raw distribution conditions separate |
| Seychelles | OurAirports | Global 30 m | No verified region-wide reusable high-resolution mosaic in this bounded search |
| Lesser Antilles | OurAirports | Global 30 m; French islands IGN RGE ALTI 1 m | French islands IGN BD ORTHO, typically 20 cm; no chain-wide uniform open mosaic established |
| Japan | OurAirports | GSI 10 m nationwide; 5 m and 1 m where available | GSI orthophotos, commonly 20/40 cm acquisition; mixed seamless mosaic, source/area varies |
| California | FAA NASR plus OurAirports | USGS 3DEP 10 m; 1 m where available | Public-domain NAIP, primarily 60 cm; edition/local resolution varies |
| Dubai | OurAirports | Global 30 m | No openly reusable regional high-resolution orthophoto verified in this bounded search |

Spain/Cape/Seychelles/Dubai evidence and exact resource/licence distinctions are
in the regional note. Unknown regional imagery rights are not an absence claim.

## National scenery expansion, 2026-11-06

These extend the original eight destinations rather than replacing them. National
products can contain gaps, mixed survey years and different vertical references.
All new national adapters remain candidates; the existing German regional and
global integrations are described separately below.

| Country | Elevation candidate | Photographic candidate and access boundary |
| --- | --- | --- |
| Germany | Existing regional BKG/state DGM sources; finer state products require their own footprints/metadata | Existing bounded state imagery adapters; not a uniform national high-resolution mosaic. See [regional sources](2026-11-03-dynamic-region.md). |
| France | IGN [RGE ALTI](https://www.data.gouv.fr/datasets/rge-alti-r), 1/5 m bare-earth grids | [BD ORTHO](https://geoservices.ign.fr/bdortho), typically 20 cm; [RGE catalogue](https://www.data.gouv.fr/datasets/referentiel-a-grande-echelle-rge) identifies Licence Ouverte. Mainland and overseas products have separate coverage/editions. |
| Austria | BEV ALS DGM 1 m; older Geoland 10 m alternative | [basemap.at orthophoto](https://basemap.at/orthofoto/) 29 cm nationwide / 15 cm selected regions. BEV edition/datum and attribution checks remain as recorded in [national-source research](2026-11-05-swiss-austria-terrain-sources.md). |
| Switzerland | swissALTI3D 0.5/2 m; swissALTIRegio 10 m includes a cross-border buffer | [SWISSIMAGE](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10) 10 cm plains/main valleys, 25 cm Alps. [National-source research](2026-11-05-swiss-austria-terrain-sources.md) records OGD terms, LN02 conversion and mixed foreign datums; finer spacing can be oversampled. |
| Spain | IGN/CNIG [MDT02](https://data.europa.eu/data/datasets/spaignmdt02?locale=es) 2 m and MDT05 5 m; selected coverage matters | [PNOA services](https://pnoa.ign.es/web/portal/pnoa-imagen/visualizadores-y-servicios-web); island photography/CC BY terms are detailed in [regional imagery](2026-11-05-candidate-region-imagery.md). |
| Netherlands | [AHN](https://www.ahn.nl/open-data) 0.5 m bare-earth and coarser grids, open data | [AHN/Beeldmateriaal imagery](https://www.ahn.nl/beeldmateriaal-vanaf-nu-vrij-beschikbaar) and [PDOK](https://app.pdok.nl/viewer/) 25/8 cm layers. Pin the actual edition/footprint/licence; a viewer layer list is not evidence that every year has every resolution nationwide. |
| Denmark | [Danmarks Højdemodel](https://www.klimadatastyrelsen.dk/groen-omstilling-og-klimasikring/klimasikring/danmarks-hoejdemodel), freely available 0.4 m terrain/surface grids | Fine national orthophoto access/redistribution not independently accepted in this extension; do not extend mainland DHM coverage to Greenland/Faroe Islands by inference. |
| Norway | [Kartverket](https://www.kartverket.no/api-og-data/terrengdata) terrain grids 1/10/50 m, GeoTIFF and services | Fine imagery has separate source/rights arrangements; this elevation finding does not authorize reuse of every Norge i bilder image. Inspect selected coverage/licence. |
| Finland | NLS 2/10 m elevation through [MapSite](https://www.maanmittauslaitos.fi/en/e-services/mapsite) | Open NLS orthophotos; [WCS description](https://www.maanmittauslaitos.fi/ortokuvien-ja-korkeusmallien-kyselypalvelu/tekninen-kuvaus) lists 0.5 m imagery and 2 m terrain, free API with key/terms. Restricted 5-point laser data is a separate product, not the open raster. |
| United Kingdom | EA [1 m bare-earth DTM](https://ckan.publishing.service.gov.uk/dataset/lidar-composite-digital-terrain-model-dtm-1m), about 99% of England | England is not the whole UK. Scotland/Wales/Northern Ireland and photographic reuse need separate product checks; no uniform open UK high-resolution imagery accepted here. |
| USA | [USGS 3DEP](https://www.usgs.gov/3d-elevation-program/about-3dep-products-services) approximately 10 m broad coverage and 1 m products where published; seamless 1 m rollout is in progress | [NAIP](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer) public-domain CONUS downloads, primarily 0.6 m; newer/local products vary. California is included; do not infer NAIP coverage/rights for all other territories from a mixed imagery basemap. |
| New Zealand | [LINZ open elevation](https://www.linz.govt.nz/products-services/data/types-linz-data/elevation-data/access-elevation-data), 1 m LiDAR-derived models where covered | [LINZ aerial imagery](https://www.linz.govt.nz/products-services/data/types-linz-data/aerial-imagery) covers about 95%: typically 20–30 cm rural / 5–20 cm urban, with open reuse. Survey dates vary; 10 m satellite mosaics provide a separate full-country fallback. |
| Japan | GSI 10 m broad coverage and 1/5 m where available | GSI aerial sources and Survey Act/edition exceptions remain as detailed below; no uniform sub-metre acquisition date or unrestricted bulk redistribution inferred. |
| Luxembourg | ACT [2024 LiDAR](https://data.public.lu/fr/datasets/lidar-2024-releve-3d-du-territoire-luxembourgeois/) 0.5 m DTM/DSM COG, nationwide | [Winter 2025 orthophoto](https://data.public.lu/fr/datasets/orthophoto-officielle-du-grand-duche-de-luxembourg-edition-hiver-2025/) at most 10 cm GSD nationwide plus border buffer; both selected product pages explicitly CC0. Strong open candidate. |
| Belgium | [Flanders DHMV II](https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/het-digitaal-hoogtemodel/digitaal-hoogtemodel-vlaanderen-ii) 1/5 m terrain; [Wallonia 2021–2022 MNT](https://geoportail.wallonie.be/catalogue/a004e570-99d6-4fe5-b83d-49b774409278.html) 0.5 m | Regional mosaic required. Flanders product includes 10 cm 2013–2015 photography and declares open data; pin selected resource terms. Walloon terrain is CC BY 4.0; no new Walloon photo edition accepted here. |
| Poland | [GUGiK NMT](https://www.geoportal.gov.pl/pl/dane/numeryczny-model-terenu-nmt/) 1/5 m terrain; distinct PL-KRON86-NH/PL-EVRF2007-NH height families | [Orthophotos](https://www.geoportal.gov.pl/pl/dane/ortofotomapa-orto/) 5/10/25 cm by edition/area. Official pages permit free download and any-purpose use. Strong candidate, not uniform latest 5 cm coverage. |
| Czechia | [ČÚZK open data](https://ags.cuzk.cz/opendata/) DMR5G/DMR4G; DMR5G is a terrain TIN, not a 0.18 m grid | Orthophotos are included in the [CC BY 4.0 open-data policy](https://cuzk.gov.cz/Uvod/Produkty-a-sluzby/Otevrena-data/Otevrena-data-zakladni-informace.aspx); original aerial-survey/archive photos have exceptions. Pin delivery height reference and selected product spacing. |
| Sweden | New [Markhöjdmodell download API](https://geotorget.lantmateriet.se/geodataprodukter/markhojdmodell-nedladdning-api), replacing old Grid1+/WCS products | Ortofoto download through Geotorget; [open products use CC0](https://www.lantmateriet.se/sv/geodata/vara-produkter/avgiftsfria-produkter/oppna-data/). Current product metadata needs pinning; do not reuse retired endpoint/resolution/licence assumptions. |
| Slovenia | [GURS](https://www.e-prostor.gov.si/podrocja/drzavni-topografski-sistem/daljinsko-zaznavanje/) 1 m LiDAR terrain used for ortho; [new 2023–2025 national LiDAR](https://www.gov.si/novice/2026-06-03-lidarski-podatki-za-celotno-slovenijo-dostopni-v-pregledovalniku-3d-podatkov/) ground products/points delivered in LAZ | Nationwide 25/50 cm orthophotos, varying capture years. Availability established; exact selected redistribution terms remain unverified. New LAZ delivery is not already a ready 1 m COG. |
| Portugal | [DGT mainland LiDAR release](https://www.dgterritorio.gov.pt/levantamento-lidar-de-portugal-continental-0?language=en) 0.5/2 m DTM/DSM | [DGT catalogue](https://cdd.dgterritorio.gov.pt/) for ortho/terrain. June 2025 release reported 90% available; current completeness, selected ortho edition/terms still need inspection. Mainland finding excludes Azores/Madeira. |
| Canada | [NRCan HRDEM/CanElevation](https://open.canada.ca/data/en/dataset/957782bf-847c-4644-a757-e383c0057995) 1/2 m southern LiDAR terrain, different northern sources | Official indexed record states Open Government Licence–Canada and progressive coverage, without project-edge matching. Direct catalogue fetch returned 403; evidence is official search text. No uniform national open sub-metre photo mosaic verified. |
| Australia | [Geoscience Australia ELVIS](https://www.ga.gov.au/scientific-topics/national-location-information/elvis-elevation-information-system), regional LiDAR/terrain mosaics 5 m or finer | Most ELVIS data use CC BY, but exact custodian/footprint terms vary. Limited imagery in catalogue; photography needs state/local review. No uniform fine national coverage inferred. |
| Italy | [Lombardy DTM](https://www.geoportale.regione.lombardia.it/en/metadati?_detailSheetMetadata_WAR_gptmetadataportlet_identifier=r_lombar%3Adfc98d60-5f02-4a2b-8113-5ad24cc53a9c&_jsfBridgeRedirect=true&p_p_id=detailSheetMetadata_WAR_gptmetadataportlet&p_p_lifecycle=0&p_p_mode=view&p_p_state=normal), 5 m regional mosaic, CC BY 4.0 | Mixed source ages/detail, including local 1 m LiDAR; not nationwide coverage. Other regions and photographic rights require individual entries. |

Spain also publishes a finer [third-coverage PNOA 0.5 m bare-earth COG product](https://pnoa.ign.es/pnoa-lidar/productos-a-descarga).
This extends the 2/5 m options above; it does not establish complete 0.5 m national
or island coverage. Luxembourg, Poland, Czechia and Belgium are particularly
clear new ingestion candidates; this is a research priority inference, not a
user-selected rollout order.

## Aviation source layers

Good airport coverage, good pavement coverage and good receiver/procedure data
are separate deliverables. The worldwide community inventory can be useful even
where finer scenery or published navigation data is absent. An airport point,
OSM runway or map label must not silently create an ILS transmitter, frequency,
IFR fix, procedure, airport elevation or operational-status claim.

| Source | Useful coverage and fields | Access/reuse and remaining limits |
| --- | --- | --- |
| [OurAirports](https://ourairports.com/data/) | Worldwide airport identifiers/positions/elevations, runway metadata, COM frequencies and radio navaids, nightly CSV exports | Public domain, without accuracy/fitness guarantee. Strong worldwide inventory baseline; not a complete IFR-fix, airway, procedure or ILS antenna/GS geometry dataset. File download date is not each record's effective date. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Worldwide mapped runway/taxiway/apron/building geometry, with locally variable completeness | ODbL attribution/database obligations; public endpoint policies remain separate. Use for source-labelled ground scenery, not published navigation authority. Existing [on-demand generator](2026-11-06-on-demand-airports.md) does not itself expand the airport/NAV inventory. |
| [FAA NASR](https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/) | US cyclic airports, runways, frequencies, navaids, fixes and ILS-related groups | Strong official machine-readable candidate; pin effective cycle and field definitions. Airport operational/service status and absent components must remain explicit. |
| [FAA CIFP](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/) | Raw ARINC 424 v18; airports/runways, VHF/NDB/ILS, terminal/en-route waypoints, airways, SID/STAR and approach records; 28-day updates | Requires a real parser and component/procedure interpretation. Download includes an error-notification agreement; select the applicable non-operational simulator use/redistribution terms rather than treating the download as an agreement-free endpoint. |
| [France SIA AIRAC database](https://www.sia.aviation-civile.gouv.fr/produits-numeriques-en-libre-disposition/les-bases-de-donnees-sia.html) | France and overseas aeronautical database exports in XML_SIA/AIXM 4.5, AIRAC cycles | Free product with explicit [Licence Ouverte](https://www.sia.aviation-civile.gouv.fr/pub/media/news/file/l/i/licenceopendata-vf_2.pdf), including redistribution/transformation/commercial use with SIA/update-date credit. Strong structured-data candidate. [Product 11/26](https://www.sia.aviation-civile.gouv.fr/donnees-aeronautiques-xml-airac-11-26.html) is effective 29 October–25 November 2026; account/checkout, actual export feature completeness and schema mapping were not exercised. This does not extend the licence to every chart on the SIA website. |
| [OpenFlightMaps](https://openflightmaps.org/faq/) | Regional VFR aerodromes, navaids, reporting points and airspace; structured OFMX/OpenAir/CUP candidates | Conditional. [Existing assessment](2026-11-06-openflightmaps-overlay.md) records that full linked GUL retrieval returns 404, a current edition is unselected and rendered products can have separate rights. Do not promise worldwide coverage or complete IFR procedures. |
| [openAIP](https://www.openaip.net/) | Potential worldwide airport/navaid/airspace/reporting-point enrichment | Conditional: current official terms/schema retrieval failed 402; API-key authentication is not a verified free redistribution licence. Do not substitute third-party licence claims or assume anonymous/unlimited access. |
| [Historical FlightGear/NAV810](2026-11-03-rhein-main-navigation.md) | Reusable simulator VOR/NDB/DME/LOC/GS and fix datasets, dependent on exact selected file | Current Gefly receiver package uses the pinned 2013.10 GPL-2.0-or-later source. A new repository commit is not a new AIRAC; GS heights in later FlightGear files can be scenery-adjusted. Do not claim current global coverage from the existing regional subset. |
| [EUROCONTROL EAD](https://www.eurocontrol.int/service/european-ais-database) | European AIP/static information and a broader global minimum static database | Registered EAD Basic is limited consultation, not a free redistributable global B2B feed. State/provider IP and access agreements apply. See [AIS/AIM directory](https://www.eurocontrol.int/articles/ais-online) to find the national publisher; directory entries themselves can be outdated. |

### Official national verification and export routes

These are reference/export discovery routes, not blanket permission to scrape
or redistribute. The [EUROCONTROL AIS/AIM directory](https://www.eurocontrol.int/articles/ais-online)
links the national services below; directory existence alone is not an inspection
of a current AIP edition, export schema or licence. OurAirports remains the
immediately reusable community baseline in each country while official exports
are investigated. No portal account was registered and no provider was contacted.

| Country/area | Publisher or route | Ingestion disposition |
| --- | --- | --- |
| France, French overseas territories | SIA database above; SIA AIP/eAIP | Open AIRAC XML candidate; inspect actual feature/component coverage. This can improve French Caribbean coverage, not the entire Lesser Antilles chain. |
| USA/California | FAA NASR/CIFP above | Official cyclic machine-readable candidate; implement inventory/receiver data before attempting procedure execution. |
| Austria | [Austro Control eAIP](https://eaip.austrocontrol.at/) and [spatial data infrastructure](https://data.austrocontrol.at/) | Public consultation; commercial reproduction/processing requires written authorization. No blanket open simulator redistribution grant established. |
| Switzerland | [Skyguide AIM](https://www.skyguide.ch/services/aeronautical-information-management) | AIP/VFR reference and AIXM 5.1/other aeronautical data on request; negotiated feed candidate, no open redistribution grant verified. Swisstopo terrain openness does not transfer to Skyguide data. |
| Spain, Mallorca, Canaries | ENAIRE AIP, linked from the AIS directory | Official verification route; exact structured export/reuse terms remain unverified. IGN terrain terms do not license ENAIRE charts/data. |
| Germany | DFS AIP/digital data, linked from the AIS directory | Existing [DFS access/rights assessment](2026-11-03-flight-map.md) applies; portal automation prohibition and AIXM exception are distinct from reuse permission. |
| United Kingdom | NATS AIS, linked from the AIS directory | Official UK AIP/reference route; current structured export/access and redistribution terms remain unverified. England terrain coverage does not establish UK-wide aviation-data reuse. |
| Belgium/Luxembourg; Netherlands | skeyes joint AIP; LVNL AIS | National reference routes from the directory; selected data-export rights not verified. |
| Denmark; Norway; Sweden; Finland | Naviair AIM; Avinor IAIP; LFV IAIP; Fintraffic AIS | National reference routes from the directory; scenery licences do not establish aviation-data reuse. |
| Czechia; Poland; Slovenia; Portugal; Italy | ANS CR AIS; PANSA AIS; Slovenia Control AIM; NAV Portugal AIS; ENAV AIS | National reference routes from the directory; examine a specific export/edition and licence before integration. |
| South Africa/Cape region | [SACAA aeronautical information](https://www.caa.co.za/industry-information/aeronautical-information/) and ATNS AIM route | Official airport/en-route reference; a reusable bulk feed/redistribution grant was not established here. |
| Seychelles; UAE/Dubai; Japan; Canada; Australia; New Zealand; non-French Lesser Antilles | Resolve the relevant state/territory in the worldwide AIS/AIM directory | Follow the current national AIS/AIP publisher; availability/registration and exports vary. No single Caribbean authority or assumed open global procedure feed. |

An X-Plane-compatible file format is not an asset licence. [X-Plane's data documentation](https://developer.x-plane.com/docs/data-development-documentation/)
requires inspecting source/copyright per file; current commercial navigation
packages do not inherit an old Robin Peel GPL grant. Historical simulator data
can be an explicitly dated fallback, not a silent substitute for current AIRAC.

For official source inspection, AIP AD sections normally describe aerodromes and
their facilities; ENR 4 covers radio navaids/significant points and ENR 3 routes.
Use the actual country's contents, amendments and component records, not a
general section name as proof that a particular field or reusable export exists.

### Proposed coverage strategy

1. Build versioned regional slices of a pinned worldwide OurAirports snapshot for
   airport/runway/COM/radio-navaid discovery. Reconcile duplicates by source ID and
   provenance rather than replacing source records with an untraceable merge.
2. Keep OSM visual surfaces separate. Cache accepted bounded region packages;
   missing taxiways or failed requests remain missing/unavailable, never invented.
3. Add richer official or open regional navigation packages where rights and
   fields are established. Resolve fixes, LOC/GS/DME pairing, true/magnetic course,
   datum and channel support before connecting a package to instruments/AP.
4. Keep each package's source, licence, acquisition/effective dates, region,
   component completeness and hashes. Report unavailable/stale/unsupported layers
   separately. Do not combine different AIRAC cycles into a claimed coherent
   procedure set or treat a successful request as verified worldwide completeness.
5. Preserve the current working terrain/receiver path while adding optional data
   adapters. National heights need explicit horizontal/vertical transforms, seam
   checks and identical native/rendered contact sampling; finer national data
   takes precedence over Copernicus, then the coarse last fallback.

## Additional primary sources

- [FAA NASR](https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/):
  cyclic US airport/NAV/ILS and other aeronautical groups; California can use an
  official machine-readable source rather than only community records. Select
  an explicit cycle, inspect fields/conditions, and distinguish operational
  service status from simulator source availability.
- [USGS 3DEP](https://www.usgs.gov/3d-elevation-program/): products free without
  use restrictions; [product resolutions/downloads](https://www.usgs.gov/faqs/what-types-elevation-datasets-are-available-what-formats-do-they-come-and-where-can-i-download)
  include 10 m seamless and 1 m projects; do not infer uniform 1 m coverage.
- [USGS NAIP service](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer):
  primarily 0.6 m natural-colour imagery; describes free public-domain downloads
  for CONUS. [California services](https://wildlife.ca.gov/Data/GIS/Map-Services)
  list specific editions/resolutions. Selected-footprint inspection still needed.
- [IGN RGE open-data record](https://www.data.gouv.fr/datasets/referentiel-a-grande-echelle-rge)
  identifies BD ORTHO and RGE ALTI under Licence Ouverte. Official
  [Guadeloupe notice](https://www.guadeloupe.developpement-durable.gouv.fr/donnees-publiques-ign-en-acces-libre-a3448.html)
  confirms free high-resolution BD ORTHO and Etalab 2.0. The
  [IGN programme](https://www.ign.fr/files/default/2024-03/plan-activites-ign-2024.pdf)
  describes 20 cm orthophotos and delivered Guadeloupe/Martinique coverage.
  [RGE ALTI delivery specification](https://geoservices.ign.fr/sites/default/files/2021-07/DL_RGEALTI_2-0.pdf)
  lists 1/5 m grids and Guadeloupe, Martinique, Saint-Barthélemy, Saint-Martin
  territories. These facts do not establish all Lesser Antilles coverage.
- [GSI DEM download help](https://service.gsi.go.jp/kiban/app/help/): 10 m DEM10B
  nationwide, finer 5/1 m coverage maps, registration required for downloads.
  [GSI imagery acquisition map](https://www.gsi.go.jp/KOUKYOU/BasicSurveys_Area.html)
  identifies 20/40 cm photographic acquisition, not uniform current coverage.
  [GSI tile catalogue](https://maps.gsi.go.jp/development/ichiran.html) provides
  orthophoto/seamless sources and area/source-specific credits. Live tile use in
  apps is permitted with attribution under listed conditions; downloaded survey
  results and derived redistribution may have additional Survey Act procedures.
  [GSI terms](https://web2.gsi.go.jp/ENGLISH/page_e30286.html) preserve these
  exceptions. Do not treat every visible basemap tile as an unrestricted asset.

## Current Gefly versus candidate integration

Updated 2026-11-06: [worldwide OurAirports discovery](2026-11-06-ourairports-integration.md)
now bundles 86,343 airports, 48,411 runways, 30,394 COM records and 11,008 radio navaids
in source-pinned regional packages with worker-based global search. The original
[731-entry regional inventory](../../app/public/airports/manifest.json) remains a
fallback, including closed fields/heliports. Coupled radio navigation remains
[Rhein-Main NAV810 2013.10](../../app/public/navdata/README.md), not current worldwide
AIRAC or procedures. The optional on-demand OSM surface path is separate visual
geometry. National fine terrain/photography candidates above remain unimported.

The original 2026-11-05 assessment treated 30 m Copernicus as a proposal. That status
is superseded: the current app has [optional Copernicus fine-source loading](2026-11-05-copernicus-native-integration.md)
and a [separate bounded distant overview](../reviews/2026-11-06-terrain-overview-validation.md),
with valid regional heights taking precedence and the existing coarse world grid
as last fallback. Availability, source holes, cache/continuity limits and fidelity
remain explicit. This is not national high-resolution integration or surveyed
runway contact terrain. No country or aviation dataset listed in this extension
was downloaded or installed by this research.
