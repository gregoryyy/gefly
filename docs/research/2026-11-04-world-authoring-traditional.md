# World authoring: public geodata to detailed 3D scenery

Researcher: Codex, 2026-11-04. Research/proposal only; no assets imported, tools installed, performance measured or source accuracy validated. Complements the separate AI-authoring research.

## Recommendation

Build one **2 × 2 km EDFE scene**, then a separate Darmstadt urban patch, before expanding around the 100 NM region. Combine measured terrain and building shells with reusable procedural materials and vegetation; stream the result through existing CesiumJS. This offers recognizable geography and convincing low-altitude detail without promising Google Earth coverage or precision.

Here **geospecific** means an object placed/shaped from evidence about that actual location. **Geotypical** means plausible regional appearance—roof tiles, facade styles, tree species, field variation—without evidence that each detail exists there. Record these separately per layer/object. A finely tessellated roof or 4K material can improve rendering while adding no positional or historical accuracy.

## Available source layers

| Source | Useful contribution | Important limit |
| --- | --- | --- |
| Hessen DGM1 | Bare-earth terrain, nominal 1 m grid | Grid spacing is not guaranteed vertical accuracy; preserve source height datum and edition. |
| Hessen DOM1 | Roof/tree-top surface; compare with DGM to estimate above-ground height | A surface is not a clean building mesh, tree inventory or safe obstacle database. |
| Hessen DOP20/TrueDOP | 20 cm ground-resolution aerial appearance and alignment checks | Nadir imagery does not supply facade textures; dated imagery can disagree with buildings. |
| Hessen LoD2 CityGML | Real building footprints, height and generalized roof geometry | No assumption of windows, facade detail, airport equipment or surveyed obstacle completeness. |
| OpenStreetMap | Roads, waterways, land use, footprints and some roof/height tags | Uneven coverage and inferred defaults must remain identifiable. |

HVBG lists DGM1, DOM1, DOP20 and LoD2 through its [official service inventory](https://hvbg.hessen.de/geoinformation/geodateninfrastruktur/geoportal-hessen/inspire-standardisierte-geodatendienste). [DGM1 metadata](https://opendata.hessen.de/de/dataset/atkis-dgm-1), [DOM1 metadata](https://opendata.hessen.de/de/dataset/oberflachenmodell-dom-1), [DOP20 metadata](https://www.geoportal.de/info/0b30f537-3bd0-44d4-83b0-e3c1542ca265) and [Hessen LoD2 metadata](https://www.govdata.de/suche/daten/3d-gebaudemodell-he-lod2?ids=7037c1d0-83e7-4bdc-bbd7-b372bfcd10f7) establish the product distinction. Observed license declarations differ: DOM1/DOP20 list DL-DE-Zero-2.0 while that LoD2 catalog entry lists DL-DE-BY-2.0. Pin the actual downloaded edition and its terms; do not assign one blanket Hessen license.

DACH expansion is dataset-specific. [Hamburg publishes LoD3.0](https://www.hamburg.de/politik-und-verwaltung/behoerden/behoerde-fuer-stadtentwicklung-und-wohnen/aemter-und-landesbetrieb/landesbetrieb-geoinformation-und-vermessung/produkte-und-dienstleistungen/geodaten-des-lgv/3d-stadtmodell-244116); this does not establish LoD3 availability near EDFE. [Vienna's open building model](https://www.wien.gv.at/stadtplanung/baukoerpermodell-daten-beziehen) is labelled LoD1.4, under CC BY 4.0 with its specified attribution. [swissBUILDINGS3D 3.0 Beta](https://www.swisstopo.admin.ch/en/landscape-model-swissbuildings3d-3-0-beta) supplies roof geometry/overhangs; [swisstopo's terms](https://www.swisstopo.admin.ch/en/faq-free-geodata) permit commercial use with source attribution, under its own conditions rather than a presumed Creative Commons license. CityGML/CityJSON are data representations, not guarantees of detail: [CityJSON explains its CityGML relationship and conversion path](https://www.cityjson.org/).

## Proposed traditional pipeline

1. **Acquire and normalize offline.** Freeze source URLs, dates, hashes, coverage, licenses, horizontal CRS and vertical datum. Crop each pilot patch; validate geometry, units, roof orientation, tile seams and terrain registration. Reuse the project's ellipsoid/geoid boundary rather than treating national height values as ellipsoid heights.
2. **Build evidence-backed geometry first.** Preserve LoD2 roofs where available; fall back to OSM extrusion only where necessary. Mark missing heights or inferred roof forms explicitly. Drape roads/water carefully, retaining bridges and preventing duplicate buildings. Keep DGM-based physics terrain and runway/contact geometry separate from decorative scenery; never substitute the DOM or a photogrammetric visual mesh as contact ground.
3. **Add geotypical detail deterministically.** Use repeatable material families, texture atlases, normal/roughness maps, facade/window rules and instanced vegetation constrained by land-use masks. Exclude runways, roads and buildings from scattering. Regional asset variation improves appearance; it does not establish real tree/obstacle positions. Blender's [point-distribution node](https://docs.blender.org/manual/en/4.3/modeling/geometry_nodes/point/distribute_points_on_faces.html) is an existing procedural building block.
4. **Compile browser assets.** Export glTF/GLB, produce spatial chunks with simplified distant representations and instance repeated objects. [3D Tiles](https://github.com/CesiumGS/3d-tiles/blob/main/specification/README.adoc) provides hierarchical streaming with glTF content. Cesium's [tileset API](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html) exposes screen-space-error and memory controls. Renderer and format are not source data, and neither automatically generates good LODs or correct georeferencing.

## Three reuse candidates

| Candidate; license checked 2026-11-04 | Recommended role | Constraint |
| --- | --- | --- |
| [BlenderGIS](https://github.com/domlysz/BlenderGIS); [GPL v3 text](https://raw.githubusercontent.com/domlysz/BlenderGIS/master/LICENSE) | Offline DEM/GeoTIFF/OSM import, georeferenced authoring and artist corrections | Test compatibility with the selected Blender version; advertised older minimum versions are not current compatibility proof. Source services retain their own rights. |
| [OSM2World](https://www.osm2world.org/); [current MIT license](https://raw.githubusercontent.com/tordanik/OSM2World/master/LICENSE.txt) | Reuse tagged roads/buildings, procedural details and PBR materials; exports glTF/GLB | Pin a reviewed revision: current license must not be projected onto every older release. Inspect bundled asset licenses separately. |
| [3DCityDB V5](https://github.com/3dcitydb/3dcitydb); Apache-2.0 | Later persistent CityGML inventory, provenance and spatial queries | PostgreSQL/PostGIS infrastructure; unnecessary for the first small patch and not a complete scenery-to-3D-Tiles compiler. |

Tool licenses do not relicense inputs or output assets. [OSM is ODbL](https://www.openstreetmap.org/copyright); assess derivative-database and attribution obligations before publishing merged datasets. Keep source layers separable and independently attributed.

The first demonstration should inspect buildings, terrain seams and ground alignment from approach height and near the ground, then report actual download size, GPU/memory cost and frame time on the reference Mac. No numerical performance or accuracy acceptance threshold is established by this research. AI-generated appearance may later fill declared geotypical gaps; it must not silently replace real geometry, runway data or obstacle facts.
