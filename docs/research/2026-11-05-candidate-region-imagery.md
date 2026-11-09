# Candidate regions: photographic terrain and elevation

Researched 2026-11-05 16:01 Europe/Berlin by Codex researcher
`/root/region_imagery`. Scope: Canaries, Mallorca, Cape Town/Western Cape,
Seychelles and Dubai; the orchestrator covers the other candidates and global
aviation/elevation sources. R-DATA-1/R-WORLD-11 candidate evidence only, not an
integration decision. No deep-research skill/service is available in this session;
this is a structured primary-source web search and document review fallback.

“Free” below distinguishes a free-to-view service from permission to reuse and
redistribute data. Resolutions are publisher descriptions, not independently
measured accuracy. No imagery or elevation files were downloaded or installed.

| Candidate | Elevation candidate | High-resolution photography candidate | Reuse assessment |
| --- | --- | --- | --- |
| Canary Islands | IGN/CNIG MDT05, 5 m ground grid; PNOA second-coverage table also lists Canarias MDT02, 2 m. | SITCAN/GRAFCAN 2024 ortho, 20 cm pixels, downloadable TIFF resources for all seven main islands. | Strong open candidate. Dataset links to Canary government terms, whose current default is CC BY 4.0; IGN elevation is CC BY 4.0. Verify each chosen resource's metadata and attribution. |
| Mallorca | IGN/CNIG MDT05, 5 m; finer PNOA coverage can be selected after tile inspection. | ICGIB 2023 Balearic ortho service, 15 cm pixels from an 18 cm GSD flight; national PNOA 2024 Balearic orthos at 25 cm. | Strong open candidate. ICGIB service explicitly says free use under CC BY 4.0; raw-data distribution conditions are a separate contact step. National PNOA is freely downloadable under IGN terms. |
| Cape region | City of Cape Town 2019 GLM, 5 m bare-earth DEM derived from LiDAR; municipal coverage only. | City public imagery services exist; national NGI reports 0.25 m GSD acquisition since 2017. | Conditional. Availability and detail verified, but a sufficient open redistribution licence for the selected city/NGI raster was not verified. Do not label all Western Cape photography open/free on the evidence below. |
| Seychelles | No national fine-resolution open DTM established in this bounded search; use a separately verified global baseline candidate. | Local Aldabra UAV orthophoto/DEM research datasets exist; no region-wide openly reusable high-resolution mosaic established. | Unverified regional high-resolution option. Free WebGIS viewing does not establish texture redistribution rights. |
| Dubai | No openly reusable municipal high-resolution terrain grid established here; global baseline remains a separate candidate. | Municipal GIS imagery exists as a class of data, but no openly licensed regional orthophoto dataset was verified. | Unverified. An open-data policy or public map by itself is not a raster licence. |

## Inspected source records

All URLs were accessed 2026-11-05. Short excerpts are limited to the essential
licence statements; remaining descriptions are paraphrases.

1. **Ortofotos PNOA anual de 2024**, CNIG, official national catalogue:
   [dataset](https://datos.gob.es/ca/catalogo/e0dat0002-ortofotos-pnoa-anual-de-2024-maxima-actualidad).
   The description identifies 25 cm for Illes Balears and 20 cm for Canarias.
   The [IGN product programme](https://www.ign.es/web/seccion-ortoimagenes)
   describes nationwide orthophoto/MDE production and public downloads/WMS/WMTS.
2. **IGN geographic data licence**, IGN/CNIG, three-page licence PDF, pp. 1–3:
   [licence](https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf).
   It adopts CC BY 4.0, requires producer/product/date attribution and derived-work
   indication, with specified metadata/service attribution. Its default visible
   attribution placement has conditions; assess the chosen product against the
   simulator's attribution presentation before shipping it.
3. **Modelo Digital del Terreno (5 metros) de España**, CNIG national catalogue:
   [MDT05](https://datos.gob.es/es/catalogo/e00125901-spaignmdt05).
   Ground-class LiDAR-derived grid, 5 m spacing, download and WCS; explicitly
   includes Canaries REGCAN95/UTM28; conditions link CC BY 4.0. The
   [second PNOA-LiDAR coverage status](https://pnoa.ign.es/pnoa-lidar/segunda-cobertura)
   lists the Canarias classified cloud and MDT02 available. Exact vertical datum,
   seam behavior and selected tile accuracy need ingestion review.
4. **Ortofoto 20 cm/píxel de Canarias (2024)**, GRAFCAN/SITCAN, created December
   2024, updated August 2025:
   [dataset and seven island TIFF resources](https://opendata.sitcan.es/es/dataset/ortofoto-20-cm-pixel-de-canarias-2024).
   Its licence link leads to the government
   [legal and reuse terms](https://datos.canarias.es/portal/aviso-legal-y-condiciones-de-uso),
   section 3: default CC BY 4.0 unless otherwise specified; commercial and
   noncommercial copying, distribution and adaptation permitted with conditions.
   Caveat: the separate [SITCAN notice](https://opendata.sitcan.es/es/notice)
   still says default CC BY 3.0; follow and archive each dataset's explicit linked
   terms rather than applying an invented uniform licence. Both are attribution
   licences, but resolve/version-pin this metadata discrepancy during ingestion.
5. **Ortofoto Territorial**, IDECanarias:
   [current service description](https://www.idecanarias.es/listado_servicios/ortofoto-territorial).
   Current 10 cm outputs are described as derived from 11 cm GSD using AI methods;
   pixel size is not proof of additional measured detail. Do not substitute that
   claim for the independently described 2024 20 cm product. GRAFCAN's
   [shop](https://www.grafcan.es/servicios/ventas-y-descargas/) also has paid orders
   and a distinct licence; public services, open downloads and shop products must
   not be conflated.
6. **2023 Ortofoto Illes Balears**, ICGIB official service item metadata:
   [metadata](https://ideib.caib.es/geoserveis/rest/services/imatges/GOIB_Ortofoto_2023_IB/ImageServer/info/iteminfo).
   It describes a 15 cm ortho from the 18 cm GSD flight of 29 March–9 May 2023.
   Licence excerpt: “under license CC BY 4.0”; attribution to Institut Cartogràfic
   i Geogràfic de les Illes Balears is required. The metadata separately asks users
   to request raw-data distribution conditions. The
   [current base-map service](https://ideib.caib.es/geoserveis/rest/services/imatges/GOIB_Orto_IB/MapServer)
   credits Orto 2024 / scne.es; that dynamic service's rendered resolution ladder
   is not an acquisition-GSD measurement.
7. **CCT GLM2019 5m DEM**, City of Cape Town municipal service:
   [description](https://cityimg.capetown.gov.za/erdas-iws/esri/GeoSpatial%20Datasets/rest/services/Elevation_CCT_GLM2019_5m_DEM/MapServer).
   Publisher describes 5 m bare-earth DEM, 2018/2019 LiDAR sources, 30 cm vertical
   accuracy, SA Land Levelling Datum with SAGEOID2010; approved July 2023. The
   copyright/credits fields are blank: that does not establish public domain.
   [City imagery/service directory](https://cityimg.capetown.gov.za/erdas-iws/esri/Geospatial%20Datasets/rest/services/)
   indexes imagery and 2/5/10 m elevation products; direct fetch timed out in one
   attempt, while indexed descriptions were available. The open-data portal's
   JavaScript page had no readable licence text in this tool.
8. **National aerial photography programme**, South African NGI:
   [programme](https://ngi.dlrrd.gov.za/index.php/what-we-do/aerial-photography-and-imagery)
   identifies 0.5 m GSD acquisition in 2008–2016 and 0.25 m since 2017. This is
   capture detail, not a verified complete orthomosaic licence or full Western
   Cape coverage assertion. The
   [maps/elevation page](https://ngi.dlrrd.gov.za/index.php/what-we-do/maps-and-geospatial-information)
   confirms digital orthorectified imagery and elevation products, but does not
   provide an open redistribution licence in the inspected text.
9. **Seychelles spatial data policy**, Ministry of Lands and Housing:
   [policy PDF](https://lh.gov.sc/media/documents/NATIONAL_SPATIAL_DATA_SHARING_POLICY.PDF)
   documents spatial-data categories, but was not used to infer a permissive
   licence for a specific raster. A local producer catalogue lists the
   [Aldabra 2022 UAV orthophoto/DEM](https://esploro.umontpellier.fr/esploro/outputs/dataset/Orthophoto--DEM-from-drone-images/99156855309311)
   with DOI 10.5281/zenodo.12522536. Its precise area, resolution and redistribution
   terms were not inspected sufficiently for an acceptance claim; it cannot be
   described as coverage of Mahé/Praslin or all Seychelles.
10. **Dubai GIS Centre law**, Dubai legislation portal:
    [Law 6 of 2001](https://dlp.dubai.gov.ae/Legislation%20Reference/2001/Law%20No.%20%286%29%20of%202001%20Concerning%20the%20Geographic%20Information%20Systems%20Centre.html)
    identifies corrected aerial images and terrain/GIS data as dataset classes.
    It is not an open imagery dataset or licence. The municipal GIS URL could not
    be retrieved by the browsing tool; no absence-of-data claim follows.

## Implication and remaining checks

Spain is the most immediately supportable expansion among this slice: clear
national terrain products, high-resolution island photography and explicit reuse
terms. This is a research recommendation, not a chosen roadmap region. Cape Town
may be attractive if the exact city/NGI raster licence is clarified; the present
finding is availability, not open reuse acceptance. Seychelles and Dubai can
still use global baseline candidates researched separately, without claiming
high-resolution photography.

Before integration, pin selected tile manifests and dates, exact licence and
attribution formula; verify free access/registration and service-use limits;
inspect actual island footprints and gaps; preserve acquisition versus output
resolution; transform horizontal/vertical references consistently; and check
physical/rendered elevation agreement. No nautical chart, aerodrome, current
AIRAC, navigation or aircraft/training validity is established by these sources.
