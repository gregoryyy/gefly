# Research index

Research clarifies gaps and requirements; it does not decide the product or silently alter SPEC. The researcher owns bounded notes; product interprets evidence and the orchestrator records decisions with user answers where needed.

| Note | Questions and use | Status |
| --- | --- | --- |
| [Foundation sources, 2026-10-31](2026-10-31-foundation-sources.md) | Existing simulators, EASA/FAA references, aircraft/avionics sources and dynamics candidates | Initial focused primary-source research; not a completed aircraft data pack |
| [GeoFS strengths, gaps and community, 2026-10-31](2026-10-31-geofs-gap-analysis.md) | User observations versus official capabilities, original community leads, FlightGear reference and pressure/traffic-system terminology | Focused follow-up; evidence labels and limitations in note; no claim of representative survey or hands-on feature validation |
| [EDDF regional data and open engines, 2026-10-31](2026-10-31-eddf-open-foundation.md) | Official airport-center/100 NM geometry, basemap/elevation/nav/chart rights, reusable dynamics/models/browser adapters and LLM asset grounding | Candidate sources only; official current ARP and exact provider/model choices unresolved; no region data or engines installed |
| [Pilot-qualification tracks, 2026-10-31](2026-10-31-license-training-tracks.md) | Sailplane SPL/Part-SFCL and national ultralight licensing, category/privilege distinctions and profile identifiers | Reference frameworks only; jurisdiction/category and current amendment/syllabus acceptance remain track-specific gates |
| [Frankfurt-Egelsbach (EDFE) sources, 2026-11-01](2026-11-01-edfe-aerodrome-sources.md) | First-exercise aerodrome: reference point, elevation, runways, circuit, frequencies, rights and fixture needs | Operator pilot information retrieved (runway 08/26, north circuit, reporting points, frequencies; cite-only); DFS AIP not retrieved because its terms forbid automated access; official AIP values still open |
| [Cessna 172S and Reims FR172 sources, 2026-11-01](2026-11-01-c172s-fr172-sources.md) | Type-certificate, engine and propeller sources, classic-panel production range, FR172 sub-models, JSBSim model rights | 172S verified (EASA IM.A.051 Iss. 11, FAA 3A12 Rev 80 copy; classic panel up to 172S9809); FR172/A18EU still unverified (FAA DRS refused non-browser access); JSBSim has no 172S/FR172 model |
| [Cessna 172S POH values, 2026-11-01](2026-11-01-c172s-poh-values.md) | Selected S17 (172SPHUS Rev 5) values for Exercise 01: normal-static airspeed calibration in its IAS bands, stall speeds, short-field take-off/landing near EDFE and ISA, climb; plus engine calibration points (Lycoming 60297-12 ratings, curve 13516-A sea-level points, fuel curve 13518 points), cruise at 2000 ft ISA and maximum glide; rights, extraction shares and EU database-right assessment | Verified on page images; facts only, selective; data in `data/aircraft/c172s-classic/poh-values.json` and `performance-values.json`; normal-technique distances not in S17; no 2300 rpm Lycoming curve; VFE 10° KCAS discrepancy and manual revision open |
| [172S engine/fuel indications and sample loading, 2026-11-02](2026-11-02-172s-engine-fuel-ind-and-sample-loading.md) | S17 Sections 2/6/7: every engine and fuel gauge, counter and annunciator of the classic panel with Figure 2-3 markings, triggers and proposed `ind` field order; sample-airplane basic empty weight/moment, derived arm, datum and station arms | Verified on page images; facts only; data in `data/aircraft/c172s-classic/indication-loading-values.json`; sample, not a weighed aircraft; Figure 2-3/6-3 whole lists accepted as a Q5 exception; Figure 2-3 tachometer arcs govern (p. 7-20 conflict recorded); dial ranges open |
| [E1 engine and stack candidates, 2026-11-01](2026-11-01-e1-engine-stack-candidates.md) | Open FDMs (JSBSim, YASim), browser/WASM adapters, CesiumJS/three.js/MapLibre, open terrain/imagery for EDFE, license compatibility with GPL-3.0-or-later | Desk survey; nothing built here (see studies/e1-jsbsim); JSBSim C172 data not shippable; some German geodata licenses unverified (hosts unreachable) |
| [C172 aero, propulsion, mass and gear data sources, 2026-11-01](2026-11-01-c172-aero-data-sources.md) | Open sources for the project-owned 172S JSBSim model (E2): NASA/KU flight-test derivatives, inertias, Lycoming IO-360-L2A curve, propeller and gear gaps, rights, calibration versus holdout split | Desk survey; no coefficients extracted; no open 172S-specific aero/propeller/inertia/gear data found; earlier-172 data usable as structure and plausibility bands only |
| [Briefing data, AFIS radio and 172S checklists, 2026-11-01](2026-11-01-briefing-radio-sources.md) | TODO 1.8 / Q7/Q11: METAR/TAF/NOTAM format references and historical access/rights, EASA SERA AFIS and German NfL phraseology sources, 172S POH Section 4 checklist pages | WMO-No. 306/ICAO docs and DFS AIP not read; EDFE has no METAR in the feed checked; AFIS information-only principle verified (EASA); per-phrase AFIS applicability and EDFE language TBD |
| [First exercise sources, 2026-11-01](2026-11-01-exercise-01-sources.md) | EASA PPL(A) Exercises 12/13 and AMC1 FCL.235 skill-test tolerances, 172S POH normal-procedure speeds/limits, EDFE operator circuit facts for [EXERCISE-01](../design/EXERCISE-01.md) | EASA (EAR Aircrew Oct 2026) and POH pages verified; AIP circuit altitude/geometry not read; no instructor review |
| [JSBSim height datum and 172S controls, 2026-11-01](2026-11-01-jsbsim-datum-172s-controls.md) | GAPS Q18 O-3/O-7: JSBSim v1.3.3 `h-sl`/`geod-alt`/terrain datum, ground callback, geoid choice (GCG2016, EGM2008) and conversion point; classic-panel 172S cockpit controls and detents for a circuit from the holding point | JSBSim source read (heights are WGS-84 ellipsoidal, no geoid); controls verified against POH 172SPHUS Rev 5 copy (cite-only); altimeter units, trim/flap actuation details unconfirmed |
| [Paired-iPhone control sources, 2026-11-01](2026-11-01-phone-control-sources.md) | R-INPUT-3/TODO 1.13: DeviceOrientation secure-context, permission and visibility rules, iOS WebKit, WebRTC data channels vs WebSocket on a LAN (ICE/mDNS, no STUN/TURN), QR/short-code pairing patterns, wake lock | Specifications and RFCs read; nothing run on devices; sensor rate, latency, private-CA and mDNS behaviour on iOS unverified |
| [Dynamic region sources, 2026-11-03](2026-11-03-dynamic-region.md) | Bounded DGM200, cross-state photography and airport inventory evidence | Source research and small public-service probes; regional implementation acceptance is separate |
| [Global scenery, local detail and Google Earth, 2026-11-03](2026-11-03-global-scenery.md) | Global streaming, local reconstruction/materials, Google Earth/Maps routes, EEA availability, rights and costs | Primary-source investigation and small actual terrain-service probes; no global implementation or training-fidelity acceptance |
| [Public-data flight map, 2026-11-03](2026-11-03-flight-map.md) | BKG context maps, airport/navigation overlays, OpenFlightMaps, openAIP and DFS reuse paths | Official-source review supports the bounded existing-data map increment; current chart/airspace services and third-party tile rights remain separately gated |

| [Engine-off glide sources, 2026-11-03](2026-11-03-engine-off-glide.md) | Native propeller drag and settled-glide diagnostic boundaries | Generic C172P source limitation; exact selected-aircraft fidelity remains unaccepted |

## Method and note format

Use available deep research skills when the task and environment support them; discover and read their instructions first. If unavailable, disclose the fallback and use a structured multi-source web investigation. Never claim a skill, tool, source access or verification that did not run. No dedicated deep research skill is installed in the current session.

Frame a note around one question with affected GAPS/requirement/task references, search strategy and queries, primary sources and alternatives, exact versions/dates/sections, access time, applicability, data rights, disagreements, verified findings, inferences, confidence and unresolved issues. Follow source links and evaluate the documents rather than relying on snippets. Aircraft facts require applicable aircraft/avionics configurations and units; curriculum facts require current authority documents. Record source metadata and provenance before creating data fixtures.

End with proposed implications, limitations and a handoff to product/orchestrator. Prefer linked documents and permitted extracts; do not check in copyrighted manuals without authorization. Reference notes by stable relative links; maintain this index when integrating them.

- [Engine-off follow-up, 2026-11-03](2026-11-03-engine-off-followup.md): rejected FlightGear propeller candidate; actual native failures retained, no physics change accepted.

- [Label-free terrain cartography, 2026-11-04](2026-11-04-label-free-map-terrain.md): official vector-map source, label removal, Germany coverage, actual tile probes and attribution.

- [2026-11-04 — OSM landmark source and rights](2026-11-04-osm-landmark-labels.md)

- [Aircraft feasibility: realistic dynamics and complete cockpits](2026-11-04-aircraft-feasibility.md) — requested electric, glider, aerobatic, PA-28 and airliner candidates; primary sources, exact variants, reuse rights and missing validation data.

- [2026-11-05: Terrain horizon cliffs](2026-11-05-terrain-horizon-cliffs.md) — exterior transition, source/renderer separation and bounded runtime evidence.

- [2026-11-05: Copernicus native/data foundation](2026-11-05-copernicus-native-integration.md) — bounded source service/native integration and independent decoder/runtime evidence; broader gates remain open.

- [2026-11-05: Alps terrain and pressure diagnosis](2026-11-05-alps-terrain-pressure.md) — source/pressure separation and bounded high-altitude app repair.

- [2026-11-06: Neutral-control merge regression](2026-11-06-neutral-controls-regression.md) — actual app command reproduction, bounded zero-start repair and remaining native-model limits.

- [2026-11-06: Generic-model initial airborne equilibrium](2026-11-06-airborne-model-balance.md).

- [2026-11-06: Centered-yoke resize handoff](2026-11-06-yoke-resize-handoff.md).
