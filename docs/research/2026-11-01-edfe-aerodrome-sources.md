# Frankfurt-Egelsbach (EDFE) aerodrome sources

Researcher: Claude Code, researcher role subagent dispatched by the
orchestrator. Date: 2026-11-01 07:22 Europe/Berlin (session clock). Supports
[TODO](../TODO.md) 1.7 and [GAPS](../GAPS.md) Q7/Q10 (first exercise: take-off,
circuit and landing at EDFE). Status: **bounded, access-limited source survey.**
No official AIP/aerodrome chart was retrieved; no fact below is accepted as an
authoritative current aerodrome value.

## Question and method

Which primary sources give EDFE's reference point, elevation, runways, circuit,
frequencies and restrictions; what are their rights; what can a GPL-3.0-or-later,
permissive-preferred project ship versus only reference; and what does the first
circuit fixture need?

No dedicated deep research skill was used; the fallback was structured web search
plus direct retrieval. **Access limitation (consequential):** in this cloud session
the following hosts did not resolve (outside the session's allowed network domains)
and were therefore **not inspected**: `aip.dfs.de`, `ais.dfs.de`,
`egelsbach-airport.com`, `www.edfe.de`, `ourairports.com`, `en.wikipedia.org`,
`openstreetmap.org`/Nominatim, `overpass-api.de`. Only
`raw.githubusercontent.com` (OurAirports' own published GitHub data mirror) was
retrievable. Web-search result summaries were seen but their pages were not
opened; they are recorded below only as **leads**, never as facts. To complete
this note, the session's network settings must allow at least `aip.dfs.de` and
the operator's site, or a person must supply the official AD 2 EDFE / VFR
aerodrome chart extract with its edition.

## Source register

Access date for all: 2026-11-01. "Inspected" means content was actually read.

| ID | Publisher / title | Edition / date | URL | Inspected | Rights / redistribution |
| --- | --- | --- | --- | --- | --- |
| E1 | DFS Deutsche Flugsicherung, AIP Germany (AIP VFR, AD section, EDFE aerodrome chart and text) | Current edition/AIRAC **unknown** (not accessible) | https://aip.dfs.de/ (not resolved) | No | Per prior review of the DFS AIS portal terms ([2026-10-31 note](2026-10-31-eddf-open-foundation.md), S1): no open redistribution grant; automated use restricted; other uses need written consent. **Reference only**; do not ship charts or extracted chart content without written permission. |
| E2 | Aerodrome operator (Hessische Flugplatz GmbH Egelsbach, per OurAirports `home_link`) | Unknown | https://egelsbach-airport.com/ (not resolved) | No | Not reviewed. Assume all rights reserved; **reference only**. |
| E3 | OurAirports open data, GitHub mirror `davidmegginson/ourairports-data` (`airports.csv`, `runways.csv`, `airport-frequencies.csv`, README) | Branch `main`, daily dump, retrieved 2026-11-01 ~07:20 CET; commit SHA not obtainable (GitHub API not enabled for this session) | https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/ | Yes | Publisher releases data to the public domain, no accuracy/fitness warranty (OurAirports data page, as reviewed 2026-10-31 in S3; not re-opened today). **Shippable** with provenance; not authoritative. |
| E4 | OpenStreetMap (aerodrome/runway features) | Not retrieved | https://www.openstreetmap.org/ (not resolved) | No | ODbL 1.0 (S2 of 2026-10-31 note): attribution and share-alike for derived databases. Can be distributed as a separate database beside GPL code; copyleft, so not "permissive". Not inspected for EDFE. |
| E5 | Wikipedia, "Frankfurt Egelsbach Airport" | Not retrieved | https://en.wikipedia.org/wiki/Frankfurt_Egelsbach_Airport | Search snippet only | Text CC BY-SA; secondary source; **do not use as data**. |
| E6 | VATSIM Germany knowledge base, EDFE page | Not retrieved | https://knowledgebase.vatsim-germany.org/books/airfields-germany/page/edfe-frankfurt-egelsbach | Search snippet only | Network-simulation community material, rights unknown; not real-world authority. Lead only. |
| E7 | Other aggregators (airport-data.com, pilotnav.com, airfield.directory, metarcentral.com, windsock.ai, acukwik.com, FlightGear wiki) | Undated | see search leads below | Search snippet only | Unknown/proprietary; leads only, never shipped. |

## Facts from E3 (OurAirports, public domain, not authoritative)

Original units preserved; SI conversions use 1 ft = 0.3048 m exactly.

| Item | E3 value (original) | SI | Notes |
| --- | --- | --- | --- |
| Airport point | 49.96 N, 8.643043 E (`airports.csv` id 2226) | — | Unspecified point; **not** a sourced ARP. Datum assumed WGS-84 (not stated per record). Latitude has only 2 decimals (~±0.6 km resolution in latitude if truncated). |
| Airport elevation | 384 ft | 117.04 m | Datum/reference unstated. |
| Type / name | `medium_airport`, "Frankfurt-Egelsbach Airport", municipality Egelsbach, region DE-HE | — | — |
| Paved runway | 08/26, 4593 × 82 ft, `ASP`, lighted | 1399.9 × 24.99 m | le 08: 49.96027 N 8.629638 E, 371 ft (113.08 m), hdg 84° T; he 26: 49.961282 N 8.651211 E, 385 ft (117.35 m), hdg 264° T, displaced threshold 768 ft (234.09 m). |
| Grass runway | 08R/26L, 2198 × 98 ft, `GRS`, unlit | 669.95 × 29.87 m | 08R: 49.959446 N 8.641075 E, displaced 394 ft (120.09 m); 26L: 49.95986 N 8.650835 E, displaced 624 ft (190.20 m); no elevations; hdg 86°/266° T. |
| Frequencies | `AFIS` "LANGEN INFORMATION" 119.15 MHz; `INFO` "Egelsbach Radio" 118.405 MHz; `RMP` "Egelsbach Apron / Vorfeld" 121.73 MHz | — | 118.405 implies 8.33 kHz channel spacing. Type labels look questionable (see discrepancies). |
| EDDF point (for distance) | 50.026706 N, 8.55835 E, 364 ft (id 2212) | 110.95 m | Not the official EDDF ARP (still unresolved, TODO 1.7). |

E3 contains no traffic-circuit direction, circuit altitude, reporting points,
airspace, PPR, hours or noise-abatement data.

### Derived values (method shown)

Computed with Vincenty's inverse formula on the WGS-84 ellipsoid
(a = 6 378 137 m, f = 1/298.257223563), own script, inputs from E3; 1 NM = 1852 m.

| Pair | Geodesic distance | Initial true azimuth |
| --- | --- | --- |
| EDFE point → EDDF point | 9 588 m = **5.18 NM** | 320.7° T |
| RWY 08 → RWY 26 coordinates | 1 552 m | 85.8° T |
| RWY 08R → 26L coordinates | 702 m | 86.2° T |

The EDFE–EDDF figure is from non-official points; uncertainty is dominated by the
undefined points (hundreds of metres), not the algorithm. Recompute from official
ARPs (E1) before any acceptance test. EDFE lies well inside the EDDF 100 NM
(185 200 m) region regardless.

## Leads only (search summaries, pages not opened, not verified)

- Runway designator: several aggregators still show **09/27** (airport-data.com,
  pilotnav.com); others show **08/26** (airfield.directory, metarcentral,
  FlightGear wiki). Suggests a magnetic-variation redesignation at some unknown
  date; no official notice found.
- Elevation: 385 ft (Wikipedia, Boeing noise page), 384 ft (metarcentral, E3),
  387 ft (flightplandatabase).
- Frequencies: windsock.ai and airports4xp repeat the E3 triplet; metarcentral
  reportedly notes frequency discrepancies in published data.
- Circuit: no circuit altitude, side or reporting points (e.g. named VFR
  entry/exit points) were found; VATSIM material describes runway 26 joining
  procedures without a stated altitude.
- Restrictions: Egelsbach is commonly described as close below/beside the
  Frankfurt CTR/TMA with low circuit and departure limits and noise-abatement
  routes, but **no primary text was read**; do not encode any restriction yet.

## Discrepancies and quality flags

1. **Designator 08/26 vs 09/27** across secondary sources; current official
   designator unverified. E3 headings (84°/264° T) and computed 85.8° T are
   consistent with designator 08/26 under a few degrees of easterly variation,
   but the variation value was not sourced here — this is inference.
2. **Length vs coordinates:** E3 length 1400 m but end coordinates are 1 552 m
   apart (grass: 670 m vs 702 m). The coordinates may be pavement ends rather
   than thresholds, or one value is stale. Do not derive runway geometry from E3.
3. **Displaced threshold placement:** E3 assigns the 768 ft displacement to
   RWY 26; one search summary attributes it to RWY 08. Unresolved.
4. **Elevation:** 371/384/385/387 ft across records; aerodrome vs threshold
   elevation and vertical datum not stated in E3.
5. **Frequency roles:** E3 tags "LANGEN INFORMATION" (an FIS service) as `AFIS`
   and the aerodrome radio as `INFO`; the real roles and whether EDFE has an
   AFIS/aerodrome information service on 118.405 must come from E1.
6. **ARP:** the E3 point is not a designated ARP (same issue as EDDF).

## Gaps (all block fixture acceptance)

- G1 Current official AD 2 EDFE / AIP VFR aerodrome chart, edition/AIRAC, and
  written view of permitted use (E1). Requires network allow-list or user-supplied
  extract; DFS terms forbid scraping.
- G2 Official ARP (WGS-84), aerodrome and threshold elevations, runway
  designators, TORA/LDA/declared distances, displaced thresholds, width, surface,
  slope, lighting.
- G3 Traffic circuit: side per runway, circuit altitude (ft AMSL/QNH), entry/exit
  and reporting points, departure/arrival routes, noise-abatement rules, hours/PPR.
- G4 Airspace context: Frankfurt CTR/TMA lateral/vertical limits near EDFE, any
  RMZ/TMZ, and the exact radio service and frequencies.
- G5 Operator publications (E2) and their rights.
- G6 OSM EDFE geometry (E4) for cross-checking runway centreline positions.
- G7 Magnetic variation source and epoch (e.g. WMM model, year) for the
  magnetic/true distinction in the fixture.

## Proposal for the first circuit exercise fixture

For product/orchestrator; not a decision.

1. **Aerodrome fixture record** with per-field provenance (`source_id`, edition,
   access date, original unit/value, SI value, datum, confidence): ARP, aerodrome
   elevation, each runway end (designator, threshold position and elevation,
   displaced threshold, true and magnetic heading, TORA/LDA, width, surface).
   Public-domain E3 values may seed a **development placeholder**, visibly marked
   "unverified, not from AIP", until E1 values are available under permitted use.
2. **Circuit definition**: runway in use, circuit side, circuit altitude with
   pressure reference (QNH, per the QNH/QFE requirement), downwind/base/final
   geometry, entry/exit points, noise-abatement constraints. No values may be
   filled until G3 is sourced; if only generic teaching geometry is used, label it
   "generic instructional circuit, not the published EDFE circuit".
3. **Radio/airspace context**: frequencies and service names (G4), CTR boundary
   as a do-not-enter constraint for assessment.
4. **Environment for the exercise**: magnetic variation with model/epoch (G7),
   initial wind/QNH, aircraft position on the threshold.
5. **Rights field per record**: `public-domain` (E3, shippable), `ODbL`
   (E4, shippable as separate attributed database, share-alike), `reference-only`
   (E1/E2: store citation and edition, not chart content, unless DFS/operator
   grant written permission).
6. **Acceptance checks**: fixture values match the cited E1 edition; recompute
   EDFE–EDDF distance from official ARPs; re-verify at each AIRAC cycle or on
   edition change.

## Handoff

Confidence: high that E3 contains the values listed; low for their currency or
authority. Next checks: allow `aip.dfs.de`, `egelsbach-airport.com`,
`ourairports.com`, `openstreetmap.org` in the session network settings (or have a
person supply the official chart extract), then complete G1–G7 and resolve the
six discrepancies. Not changed: SPEC, GAPS, TODO, research index (orchestrator
to integrate).
