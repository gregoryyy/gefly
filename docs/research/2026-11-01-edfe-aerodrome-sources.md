# Frankfurt-Egelsbach (EDFE) aerodrome sources

Researcher: Claude Code, researcher-role subagent dispatched by the orchestrator.
Date: 2026-11-01, first pass 07:22 and revision 10:06 Europe/Berlin (session clock).
Supports [TODO](../TODO.md) 1.7 and [GAPS](../GAPS.md) Q7/Q10 (first exercise:
take-off, circuit and landing at EDFE). Status: **bounded source survey; the
official DFS AIP VFR text and charts were deliberately not machine-retrieved**
(see access log). Operator and open-data facts are cited. No value is accepted as
authoritative for fixture acceptance until checked against a cited AIP edition.

## Question and method

Which primary sources give EDFE's reference point, elevation, runways, circuit,
frequencies and restrictions? What are their rights? What can a GPL-3.0-or-later,
permissive-preferred project ship, and what can it only reference? What does the
first circuit fixture need?

No dedicated deep research skill was used. The fallback was structured web search
plus direct retrieval with `curl` into a session scratchpad outside the repository.
Search-engine summaries are recorded only as leads.

## Access log

| Time (Europe/Berlin) | Event |
| --- | --- |
| 2026-11-01 07:22 | First pass. `aip.dfs.de`, `ais.dfs.de`, `egelsbach-airport.com`, `ourairports.com`, `en.wikipedia.org` and OSM hosts did not resolve in this session. Only OurAirports' GitHub data mirror was retrieved. |
| 2026-11-01 ~10:03 | The orchestrator reported that session network access was fixed. `ais.dfs.de`, `aip.dfs.de`, `egelsbach-airport.com` and `ourairports.com` became reachable; `www.edfe.de` still timed out (not retried). |
| 2026-11-01 10:03–10:06 | `aip.dfs.de/` redirects to `/IFR`. Both `/ifr` and `/vfr` return an "Ungültiger Login" page that requires DFS intranet access or an Eisenschmidt-shop login. `aip.dfs.de/BasicVFR/` returns 404 at the root. `aip.dfs.de/robots.txt` is `User-agent: * / Disallow: /`. The AIS-Portal terms of use (E1a) prohibit electronic/automated use. **Decision:** the BasicVFR EDFE pages were not fetched (URLs listed under E1). Their content needs to come from a person reading them in a browser, or from DFS written approval. |
| 2026-11-01 10:04–10:06 | Read the operator site (robots.txt allows all): Piloteninfo, Flugbetrieb, Downloads and Impressum pages, plus three PDFs (E2a–E2c). Read the OurAirports EDFE page and data page. |

## Source register

All sources accessed 2026-11-01. "Inspected" means the content was actually read.

| ID | Publisher / title | Edition / date | URL | Inspected | Rights / redistribution |
| --- | --- | --- | --- | --- | --- |
| E1 | DFS, AIP VFR (BasicVFR), EDFE: "AIP AD2", "AIP VFR", "Sichtflugkarte", "Sichtflugkarte Details", "Flugplatzkarte", "Flugplatzkarte Abstellpositionen". Page URLs were taken from the operator's links. | **Unknown** (not retrieved) | https://aip.dfs.de/BasicVFR/pages/P000FD.html, …/P0024D.html, …/P00251.html, …/P00252.html, …/P00253.html, …/P0537B.html | No | See E1a and robots.txt. **Reference only:** cite the page and edition; do not copy charts or ship derived chart works. |
| E1a | DFS AIS-Portal Terms of Use (English and German) | Live; portal footer reads "PilotService 5.6.1 from 06/08/2026" | https://ais.dfs.de/pilotservice/service/information/disclaimer/disclaimer.jsp?lang=en | Yes | Governs the portal and its AIP charts (see "DFS terms" below). |
| E2a | TRIWO Egelsbach Airfield GmbH (operator), flyer "2026-09-Flyer-EDFE-Verfahren-DE.pdf" (2 pp.) | PDF created 2026-08-11; uploaded 2026-09; sha256 prefix a2bfc75c5a9c78d2 | https://egelsbach-airport.com/wp-content/uploads/2026/09/2026-09-Flyer-EDFE-Verfahren-DE.pdf | Yes (text and page-2 render) | The flyer states it "ersetzt nicht die AIP" and is a non-binding supplement. Operator imprint: German copyright; downloads only for private, non-commercial use. **Reference only.** |
| E2b | Operator, "Kundeninformation: Einführung von AFIS-Diensten am VLP Frankfurt Egelsbach durch die TRIAC GmbH" | Letter CM202412-05, dated 2024-12-18; sha256 prefix 23c78280bcd87d32 | https://egelsbach-airport.com/wp-content/uploads/2025/02/Kundeninformation_-Einfuehrung-von-AFIS-Diensten-am-VLP-Frankfurt-Egelsbach-durch-die-TRIAC-GmbH.pdf | Yes | As E2a. Reference only. |
| E2c | Operator web pages: Piloteninfo, Flugbetrieb, Impressum | Live, undated | https://egelsbach-airport.com/piloteninfo/ | Yes | As E2a. Reference only. |
| E2d | Operator, Benutzungsordnung (usage rules), 27-page PDF | Dated 2023-12-21; sha256 prefix f136cefb9a1989af | https://egelsbach-airport.com/wp-content/uploads/2024/01/20231221_Benutzungsordnung_ohne-Unterschrift-2.pdf | Downloaded, **not read**: it is a scanned image with no text layer, and no OCR was run | Reference only. |
| E3 | OurAirports open data, GitHub mirror (`airports.csv`, `runways.csv`, `airport-frequencies.csv`) plus the EDFE web page | Daily dump retrieved 2026-11-01; EDFE page "Last updated 2026-07-03 18:07:31" | https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/ ; https://ourairports.com/airports/EDFE/ | Yes | https://ourairports.com/data/ says: "All data is released to the Public Domain, and comes with no guarantee of accuracy or fitness for use." **Shippable** with provenance; not authoritative. |
| E4 | OpenStreetMap | Not retrieved | https://www.openstreetmap.org/ | No | ODbL 1.0. Can be shipped as a separately attributed database; share-alike applies, so it is not permissive. |
| E5–E7 | Wikipedia, VATSIM Germany knowledge base, aggregators (airport-data.com, pilotnav.com, airfield.directory, metarcentral.com, windsock.ai, FlightGear wiki) | — | see first-pass leads | Search snippets only | Leads only; never ship. |

## DFS terms (E1a, inspected; quoted or paraphrased by section)

- §2: the portal may be used, commercially or not, to support pre-flight planning under § 27 LuftVO / SERA.2010(b). Sharing the use, or selling the services and content for commercial purposes, is not permitted. "The use or operation of the AIS-Portal by means of electronic and/or automated tools is not permitted — exception: AIXM download data. All other uses require the prior written approval of DFS."
- §3: AIP and AIP VFR procedures and charts may be used for navigation. Other portal maps are for information only.
- §8: chart and map material in the portal, AIP IFR and AIP VFR "are protected by copyright… any commercial use… is not permitted. The creation of derived works and the use for purposes other than those listed under Section 2… in particular the use on third-party websites, require the written approval of DFS." The portal's own base map is OSM (ODbL); place names come from GeoNames (CC BY 3.0).
- §11: the content and layout of the website may be duplicated only with prior written approval.

Implication for Gefly (inference, not legal advice):
- **Cite** AIP page IDs and editions.
- **Do not** reproduce, rasterize, trace or redistribute DFS charts.
- **Do not** host AIP-derived chart works on the project site without written approval.
- **Do not** machine-retrieve portal pages. The AIXM download data is the stated exception for electronic use; its own licence was not reviewed.

Individual factual values (for example an elevation) taken by hand from the AIP sit in a grey zone between fact and derived work. Recommendation: before shipping any AIP-sourced values, ask DFS for written approval, or source them independently (OSM/OurAirports) and cite the AIP only for verification.

## Facts by source

### Operator flyer E2a (2026-08/09; non-binding; "does not replace the AIP")

- **Runway magnetic bearings:** "Piste 08 (082°M)" and "Piste 26 (262°M)" (p. 2, header of the departure/arrival tables). An asphalt runway is in use ("Nordplatzrunde 26 (Asphalt)", p. 1).
- **Circuit:** the **north circuit is standard**; a south circuit is available on request (p. 1, "Zusatzinfos").
  - RWY 26 north circuit: right-hand ("rechten Querabflug… rechten Gegenanflug", p. 1).
  - RWY 08 north circuit: left-hand ("links querab, links eindrehen", p. 1).
  - When traffic is heavy, the circuit may be extended east over the forest and/or the downwind extended north towards LIMA, after coordination with EGELSBACH INFORMATION.
  - Avoid overflying towns, but safety takes priority.
  - Final for 08 is short, so descent may begin on downwind. On final for 26, stay south of road K168.
- **Altitudes:**
  - "ALLE AB- UND ANFLÜGE MAX. 1.500ft MSL" (p. 2): all departures and arrivals at most 1500 ft MSL.
  - Arrival for RWY 08 from TANGO: course 238°M, "in 1.300ft MSL in Nordplatzrunde einfliegen" (join the north circuit at 1300 ft MSL; p. 2, confirmed on the page render).
  - **No explicit circuit (pattern) altitude is stated.**
- **Airspace:** "EDFE umgibt eine ATZ / RMZ / TMZ mit AFIS Dienst" (p. 2). The page-2 chart thumbnail shows an ATZ/RMZ/TMZ label with an upper limit of 1500 ft MSL; the label is not legible enough to cite precisely.
- **Reporting/entry points:**
  - Departures: RWY 08 via ECHO (course 090°M) or KILO (154°M); RWY 26 via DELTA (along the A5 to the motorway junction) or TANGO (058°M).
  - Arrivals: RWY 08 via TANGO or DELTA; RWY 26 via KILO (334°M) or ECHO (270°M).
  - YANKEE is for HPA (high-performance aircraft) only.
  - LIMA: inbound coordination with EDDF Tower; outbound coordination with EDFE Vorfeld (p. 2).
  - Point positions are given only as visual landmarks, not coordinates.
- **Radio:** EGELSBACH VORFELD 121.730 MHz; EGELSBACH INFORMATION 118.405 MHz; LANGEN INFORMATION 119.150 MHz (pp. 1–2).
  - Call INFORMATION at the holding point.
  - Call VORFELD after vacating the runway.
  - Call INFORMATION at least 10 minutes before reaching the aerodrome.
  - Take-off and landing are "nach eigenem Ermessen" (at the pilot's discretion); AFIS gives traffic information.
  - Z-flight-plan (VFR→IFR) departures are transferred to LANGEN RADAR.

### Operator E2b/E2c

- **AFIS:** from 2025-01-01, TRIAC GmbH provides AFIS as a certified ANSP under Regulation (EU) 2017/373. The callsign changed from "Egelsbach RADIO" to "Egelsbach INFORMATION". An automatic weather system (AWOS Auto class 4) issues MET REPORT and SPECIAL (E2b p. 1–2).
- **Airspace change notice (E2c):** "ab dem 21. März" (year not stated; the page image was uploaded 2024-04):
  - the lower limit of Frankfurt airspace C was raised from 1500 ft to 2500 ft;
  - a new airspace D (non-CTR) was established around the CTR between 1500 ft and 2500 ft.
- **Operations (E2c):** operator TRIWO Egelsbach Airfield GmbH (Trier).
  - Opening hours "8:00 – spätestens 21:00 Uhr und nach Vereinbarung" (local time assumed).
  - PPR is required for ultralights.
  - Jets/turboprops and SEP/MEP of approach speed category B–C must complete an online briefing.
  - Noise complaints go through fluglaerm-melder.de.
  - The operator states more than 80 000 movements per year.

### OurAirports E3 (public domain, not authoritative)

| Item | Value (original units) | SI (1 ft = 0.3048 m) |
| --- | --- | --- |
| Airport point | 49.96 N, 8.643043 E (not an ARP) | — |
| Elevation | 384 ft | 117.04 m |
| RWY 08/26 | 4593 × 82 ft, ASP, lit. 08: 49.96027 N 8.629638 E, 371 ft, 84° T. 26: 49.961282 N 8.651211 E, 385 ft, 264° T, displaced threshold 768 ft | 1399.9 × 24.99 m; displaced threshold 234.09 m |
| RWY 08R/26L | 2198 × 98 ft, grass, unlit; displaced thresholds 394 ft (08R) and 624 ft (26L) | 669.95 × 29.87 m |
| Frequencies | 119.15 "LANGEN INFORMATION" (typed AFIS), 118.405 "Egelsbach Radio" (typed INFO), 121.73 apron | — |
| EDDF point | 50.026706 N, 8.55835 E, 364 ft (not the official ARP) | — |

### Distance EDFE–EDDF

**Official ARPs not obtained**, so no recomputation is possible. The provisional
value from E3 points is **9 588 m (5.18 NM), initial azimuth 320.7° T**. It was
computed with Vincenty's inverse formula on WGS-84 (a = 6 378 137 m,
f = 1/298.257223563, 1 NM = 1852 m). Uncertainty is dominated by the undefined
reference points (hundreds of metres). E3 RWY 08→26 end coordinates are 1 552 m
apart at 85.8° T; RWY 08R→26L ends are 702 m apart.

## Discrepancies: status

1. **08/26 vs 09/27:** largely **resolved to 08/26** by the current operator flyer (E2a, 082°M/262°M), consistent with E3. The AIP designator, and the date of any redesignation, are still to be confirmed (E1). Aggregators showing 09/27 are stale (inference).
2. **Length vs end coordinates (1400 m vs 1552 m):** **unresolved**. E2 gives no dimensions; AIP declared distances are needed (E1).
3. **Displaced threshold end (26 in E3 vs 08 in a search lead):** **unresolved** (E1).
4. **Elevation (371/384/385/387 ft):** **unresolved**. The operator states none; aerodrome and threshold elevations are needed from E1.
5. **Frequency roles:** **resolved**:
   - 118.405 = EGELSBACH INFORMATION (AFIS, since 2025-01-01; formerly "Radio");
   - 121.730 = EGELSBACH VORFELD;
   - 119.150 = LANGEN INFORMATION (FIS).
   E3's "AFIS" tag on 119.15 and "Egelsbach Radio" name are outdated or wrong.
6. **ARP:** **unresolved**. No official coordinates were obtained.
7. **New:** circuit altitude is not stated in E2a. The 1300 ft MSL join altitude and the 1500 ft MSL ATZ ceiling are known; the published circuit altitude must come from E1.

## Gaps

- G1 AIP VFR EDFE pages (E1): edition/AIRAC and effective date, ARP, elevations, declared distances, displaced thresholds, circuit altitude, the official definition of the ATZ/RMZ/TMZ, and noise-abatement text. Next step: a person reads the six BasicVFR URLs in a browser and records the page ID, edition and values; alternatively, request DFS written approval.
- G2 The AIP year and effective date of the Frankfurt C/D airspace change (E2c gives no year), and the current CTR/D lateral limits relative to EDFE.
- G3 Usage rules E2d (scanned): needs a human read or OCR, for hours, PPR, training-circuit and noise restrictions.
- G4 OSM runway geometry (E4), to cross-check positions independently of the AIP.
- G5 Magnetic variation source and epoch (e.g. WMM) for the 082°M ↔ ~85.8° T relation (inference only).
- G6 Whether a C172S falls in approach category A (inference: yes) and is therefore exempt from the operator's B–C briefing. This must be confirmed from the applicable POH and category definition.

## Proposal for the first circuit exercise fixture

For product/orchestrator; not a decision.

1. **Aerodrome record with per-field provenance** (`source_id`, edition, access date, original value and unit, SI value, datum, confidence, rights class). Fields: ARP, elevation, runway ends, declared distances, displaced thresholds, true and magnetic headings.
   - E3 values may seed a visibly marked "unverified development placeholder".
   - Acceptance requires E1 cross-check values.
2. **Circuit:** runway 26 or 08; **north circuit** (right-hand for 26, left-hand for 08, per E2a); circuit altitude **TBD (E1)**, with a pressure reference of QNH.
   - Assessment constraints: stay at or below 1500 ft MSL inside the ATZ (E2a); avoid towns; for 26, stay south of K168 on final.
   - Use visual-landmark legs only as non-authoritative teaching cues.
   - The south circuit is out of scope.
3. **Radio script:** EGELSBACH VORFELD 121.730 / EGELSBACH INFORMATION 118.405 call sequence (E2a). Model AFIS as information only, not clearances; landing and take-off at pilot discretion.
4. **Airspace:** the Frankfurt CTR/D/C structure as a do-not-enter constraint, once G2 is sourced.
5. **Rights classes:**
   - `public-domain` (E3): shippable;
   - `odbl` (E4): separate attributed database;
   - `reference-only` (E1, E2): store citation, edition and hash, not content.
   - No DFS chart reproduction without written approval (E1a §8).
6. **Re-verification:** on every AIRAC/edition change and whenever the operator flyer changes.

## Handoff

Confidence:
- high that the operator flyer states the circuit side, frequencies, the 1500 ft MSL limit and the reporting points;
- medium for their currency (the flyer is dated 2026-08 and the AIP is not checked);
- low for any geometry or elevation value (E3 only).

SPEC, GAPS, TODO and the research index were not changed; integration is for the orchestrator. Downloads remain in the session scratchpad only, not in the repository.
