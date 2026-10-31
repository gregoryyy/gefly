# EDDF region, open data and reusable flight dynamics

Researcher: Codex `geofs_research`. Accessed: 2026-10-31 15:17 Europe/Berlin;
time from the session clock. Status: bounded source survey, no data ingestion,
browser-engine build, chart extraction, account creation or model acceptance.

## Question and method

What can support a free, open-source, flight-school-oriented community web site,
starting with EDDF and a 100 NM radius, while reusing existing physics/models and
allowing an LLM to help author flight experiences with real navigation/map assets?

Used primary publisher/project documents and original repositories. No dedicated
deep research skill was available; structured web retrieval is the disclosed
fallback. Searches covered German AIS/chart access and reuse, EDDF ARP provenance,
open geographic/elevation/airport data, JSBSim/FlightGear models and actual WASM
projects. A search result or an old mirrored chart was not accepted as a current
official airport reference. Recommendations below are proposals for product and
architecture, not decisions selecting a dependency or legal conclusions.

## Source register

Live pages are undated unless stated; no release/commit or dataset snapshot has
been selected for implementation. Audit exact artifacts before adoption.

| ID | Primary source and inspected scope | Finding / practical limit |
| --- | --- | --- |
| S1 | [DFS AIS portal terms](https://ais.dfs.de/pilotservice/service/information/disclaimer/disclaimer.jsp?lang=de), §§2–3; public terms inspected, not an authenticated chart session. | Portal access does not establish an open redistribution grant. Terms restrict automated/electronic portal use except AIXM datasets, and other uses require written consent. Do not build an LLM scraper or assume a free community site is automatically permitted. |
| S2 | [OpenStreetMap copyright/licensing](https://www.openstreetmap.org/copyright) and [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/), live. | OSM data uses ODbL, with attribution and applicable database obligations. The public tile service is a separate, capacity-limited service; free data does not mean an unrestricted bulk/offline tile backend. |
| S3 | [OurAirports open data](https://ourairports.com/data/), live; page lists airport/frequency data modified 2026-10-30. | Publisher releases data to the public domain with no accuracy/fitness guarantee. Candidate airport/runway/frequency/navaid inventory, not an authoritative procedure/chart or current-NOTAM source. |
| S4 | [Copernicus DEM collection](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM), [GLO-30 license](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf), and [view-service notice](https://dataspace.copernicus.eu/news/2026-7-17-copernicus-dem-30m-view-service-license-acceptance), dated 2026-07-17. | GLO-30/GLO-90 offer free-license candidates with attribution/conditions. The product is a surface model including vegetation/buildings. Access method, registration and exact instance matter; 30 m view access changed from 2026-07-28. EEA-10 has different eligibility. |
| S5 | [EUROCONTROL EAD service](https://www.eurocontrol.int/service/european-ais-database) and [EAD Basic description](https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/ead-solutions/ead-basic/), live. | Official AIS research/access route. Basic is described as a demonstration not connected to the operational database, unsuitable for operational use; registration/free consultation is not an open-data redistribution license or a freshness guarantee. |
| S6 | [JSBSim original repository](https://github.com/JSBSim-Team/jsbsim), live master/README and legal notice. | C++ dynamics engine, LGPL-2.1, with standalone/headless operation and XML aircraft definitions; Aeromatic generates definitions. Named aircraft models are expressly approximations for education/entertainment. Pin a revision and validate the aircraft independently. |
| S7 | [0x62/jsbsim-wasm](https://github.com/0x62/jsbsim-wasm), original project README/build/license notices; no package installed. | Concrete browser/Node WASM integration candidate using Emscripten, rather than an assumed port. Author warns of early development; wrapper is MIT while bundled JSBSim/WASM and patches retain LGPL terms. Not built or performance-tested here. |
| S8 | [FlightGear C172P original repository](https://github.com/c172p-team/c172p), live master README/file inventory and GPL-2.0 package notice. | Reusable model/system/cockpit reference candidate with XML, Nasal, models, sounds and textures. Package notice does not replace a per-file/asset/dependency rights and portability audit. Not automatically a standalone browser aircraft. |
| S9 | [NIST SI guide, chapter 5](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-5-units-outside-si), nautical-mile conversion table. | One international nautical mile is 1852 m; therefore 100 NM is exactly 185.2 km. This conversion does not supply the region's center or geodesic algorithm. |

## EDDF and the first territory

The user selected EDDF plus a 100 NM radius, not worldwide scenery. Proposed
definition: a geodesic disk of radius **185,200 m**, on a declared Earth reference
ellipsoid, centered on the **current official EDDF aerodrome reference point**.
Keep center source/revision, radius/unit, boundary method and dataset extents in a
versioned territory manifest. Test points inside, outside and on the boundary.
Distinguish the detailed EDDF airport core from regional coverage and completeness.

**Current EDDF ARP coordinates remain unresolved.** No applicable current official
AD 2.2/airport chart was retrieved in this survey. Old DFS charts mirrored on
third-party sites and generic airport coordinates appeared in search; neither was
accepted as the current designated ARP. Do not substitute a terminal/map centroid,
OurAirports point or an LLM-generated coordinate silently. Obtain an authorized,
applicable official record, identify any multiple reference points and record the
selection before fixing a precise implementation boundary. No DFS portal
automation or chart download was performed after reviewing S1 restrictions.

The manifest should identify which airports, runway geometry/elevations, landmarks,
terrain, navaids, fixes, airspace and permitted chart/procedure material actually
exist inside the region. Having a basemap does not establish full coverage of any
aviation layer. Declare missing/stale/approximate coverage and source dates.

## Real map material without assuming unrestricted charts

S2/S3/S4 can support genuinely geographic presentation: sourced roads/landmarks,
terrain and airport inventory. They are not interchangeable with official
aeronautical charts, obstacle databases, approach procedures or live briefings.
The project must review provider terms, extract dates, precision and vertical
datums, and compare selected airport/runway/elevation cases to applicable evidence.
Surface-model heights must not silently become runway elevations or operational
obstacle clearances. Actual EDDF-region tiles and quality have not been checked.

Separate three products: original source data, the generated map/chart presentation,
and fictional teaching additions. A generated presentation can use real underlying
data; it is not automatically fictional. Conversely, plausible-looking labels or
AI-enhanced terrain are not authoritative facts. Preserve provenance and clearly
identify invented fixes, procedures, notices or modifications. Do not describe a
teaching rendering as an official current chart merely because its identifiers are real.

The initial region can be bounded and useful without promising a global commercial
imagery subscription or unrestricted official-chart redistribution. A free/open
application still needs a chosen code license, source notices, service funding and
separately compatible data/asset/provider rights. S1 and S5 are important research
routes, but not established permission to bundle their charts into an open repository.

## Reuse before new physics

Prefer evaluating an existing engine and applicable aircraft model behind Gefly's
simulation adapter before writing a replacement dynamics engine. S6 supports
headless reference tests and separates executable physics from XML configuration.
S7 provides a concrete browser path to evaluate. Compare native/headless versus
WASM state traces, fixed steps, input signs, units, load time, memory, error handling
and timing headroom on the selected browser/device. No candidate is selected yet.

Treat engine, aircraft coefficients/system definitions, cockpit geometry/textures,
audio and integration wrapper as distinct license/provenance items. FlightGear's
aircraft package can depend on FlightGear properties/runtime scripts; establish
what can be reused directly and what requires an adapter or reimplementation.
Audit exact file notices and dependencies before copying. Preserve required source,
license and modification notices for the actual distribution model.

Existing model names and Aeromatic-generated estimates are starting points, not
verified performance for Gefly's selected C172 variant. Apply independent fixtures,
applicable POH/AFM/system references and declared tolerances before aircraft-specific
acceptance. Avoid tuning and accepting against the same reference cases.

## LLM-assisted experience creation

Proposed authoring flow: user/instructor describes an objective and territory;
the LLM proposes a structured scenario referencing catalogued real assets; a
validator resolves identifiers, coverage, versions, rights and geometry; product/
instructor review accepts the scenario; the runtime executes deterministic state.
Store the proposed changes, source references, model/configuration and acceptance
evidence. Route unavailable data to an explicit gap instead of fabricating it.

LLM interaction can explain or revise the proposal, but must not invent authoritative
fix positions, runway elevations, frequencies, airspace, NOTAMs, chart minima or
aircraft parameters. It must not scrape restricted sources or call arbitrary URLs
from untrusted chart text. Keep declarative scenarios separate from executable code.

Review outcome: enough to define a bounded source/reuse study and authoring contract;
not enough to accept the EDDF center, region coverage, map rights pack, browser
engine integration or aircraft fidelity. Next work: authorized ARP evidence,
region source manifest and rights review, pinned reusable-engine/model candidates,
small headless/WASM comparison and one instructor-reviewable scenario.
