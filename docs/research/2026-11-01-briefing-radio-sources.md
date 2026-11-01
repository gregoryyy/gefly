# Briefing data, AFIS radio phraseology and 172S checklist sources

Researcher: Claude Code, product-role subagent doing its own source research per the
[researcher role](../agents/researcher.md), dispatched by the orchestrator.
Date: 2026-11-01, about 12:20–13:30 Europe/Berlin (session clock).
Supports [TODO](../TODO.md) 1.8, [GAPS](../GAPS.md) Q7/Q11 and SPEC R-BRIEF-1,
R-COMM-1, R-AIR-3, R-TRAIN-4 and R-TRAIN-5. Product interpretation is in
[BRIEFING](../design/BRIEFING.md).

Status: **bounded source survey.** Several ICAO documents are behind a paywall and
were not read. Every operational value stays **TBD-src** until it has been checked
against a cited edition. This note decides nothing.

## Questions

1. What is the official code-format reference for METAR/TAF and NOTAM? Where can
   historical reports for EDFE/EDDF come from, and under which rights?
2. Which sources define phraseology at an AFIS aerodrome (EDFE, "Egelsbach
   Information") in English and German? What may an AFIS unit say?
3. Which C172S POH pages cover the checklists for a start at the holding point?

## Method and access log

No dedicated deep-research skill was used. The fallback was web search (results
used as leads only), plus `curl`/`pdftotext` retrieval into the session scratchpad
outside the repository. Downloaded files are untrusted data and are not tracked.

| Time (Europe/Berlin) | Event |
| --- | --- |
| ~12:20 | Downloaded the S17 172S information manual (same copy as the [172S note](2026-11-01-c172s-fr172-sources.md)); read the Section 4 table of contents and checklist pages. |
| ~12:30 | `community.wmo.int/volume-i1` returned 404. The `library.wmo.int` record (B1) resolves for `curl` but is a JavaScript application, and the fetch tool could not resolve the host. **WMO-No. 306 text not read.** Its codes registry (B2) was read. |
| ~12:35 | Read the DWD open-data README, the `/weather/` and `/weather/weather_reports/` listings, and the DWD copyright page (B4–B5). `flugwetter.de` front page read (B6). |
| ~12:40 | NOAA AWC data API page read (B7). EDDF METAR/TAF queries returned data (HTTP 200); the EDFE METAR query (24 h) returned **HTTP 204, no content**. |
| ~12:45 | IEM ASOS archive query for EDDF, 2026-06-01, returned half-hourly METARs; IEM disclaimer read (B8). |
| ~12:50–13:10 | Downloaded and searched NfL 2023-1-2726 (C3) from Eisenschmidt's copy; the Bremen-hosted older copy was refused (HTTP 403). Downloaded ED Decision 2021/014/R, its AMC/GM Amendment 4 annex, change-info and explanatory note from EASA (C2a–C2d). |
| — | ICAO Annex 3, Annex 10 Vol II, Doc 4444, Doc 9432 and PANS-AIM (Doc 10066) are sold by ICAO and were **not retrieved**. The German AIP GEN 3.4 is behind the DFS AIS login, and its terms forbid automated use ([EDFE note](2026-11-01-edfe-aerodrome-sources.md), E1a); **not retrieved**. |

## Source register

All sources accessed 2026-11-01. "Read" means the cited part was actually inspected.

| ID | Publisher / title | Edition / identifier | URL | Read | Rights / use |
| --- | --- | --- | --- | --- | --- |
| B1 | WMO, *Manual on Codes*, WMO-No. 306, Volume I.1, Part A (FM 15 METAR, FM 16 SPECI, FM 51 TAF) | Current edition **not established** (search leads mention a 2019 edition and a superseded 2011/2015 one) | https://library.wmo.int/idurl/4/35713 | No | WMO copyright. Cite only. |
| B2 | WMO codes registry entries "FM 15 - METAR" and "FM 51 - TAF" | Live registry | https://codes.wmo.int/wmdr/DataFormat/FM-15-metar ; …/FM-51-taf | Yes | Their descriptions name B1 as the source. Leads only. |
| B3 | ICAO Annex 3, *Meteorological Service for International Air Navigation* | Edition not checked | ICAO store | No | ICAO copyright. Cite only; it is the normative content, B1 the code form. |
| B4 | DWD Open Data server: README, `/weather/` tree | Live 2026-11-01 | https://opendata.dwd.de/README.txt | Yes | Free, no registration, terms per B5. **No METAR/TAF directory was found** under `/weather/weather_reports/` (`derived, incidents, poi, radiosonde, road_weather_stations, ship, synoptic`) or `text_forecasts` (regional text forecasts). |
| B5 | DWD, "Rechtliche Hinweise / Copyright" | Live | https://www.dwd.de/copyright | Yes | Website content reusable under **CC BY 4.0** with source attribution. All freely accessible geodata, including "meteorological weather and climate information with location reference", are reusable under CC BY 4.0. Third-party content is marked separately. |
| B6 | DWD aviation weather portal flugwetter.de (pc_met) | Live | https://www.flugwetter.de/ | Front page only | "Der Zugriff ist kostenpflichtig" (access is fee-based). Its terms of use were not read. |
| B7 | NOAA Aviation Weather Center, Data API | Live | https://aviationweather.gov/data/api/ | Yes | "Up to the previous 30 days of data"; rate limit 100 requests/min. US-government service, but German reports originate from DWD. Treat as a **retrieval route, not a rights grant** (inference). |
| B8 | Iowa Environmental Mesonet (IEM), ASOS/METAR archive and disclaimer | Live | https://mesonet.agron.iastate.edu/disclaimer.php | Yes | "The materials found on this website are in the public domain and may be used freely by anyone for any lawful purpose"; no accuracy warranty. This statement covers IEM's distribution, not the originator's rights; German reports originate from DWD. Keep IEM attribution as distributor. |
| C1 | ICAO Doc 4444 *PANS-ATM* (Chapter 12 phraseologies), Doc 9432 *Manual of Radiotelephony*, Annex 10 Vol II | Editions not checked | ICAO store | No | Cite only. |
| C2a | EASA, ED Decision 2021/014/R (24 Nov 2021), Amendment 4 to the AMC/GM to SERA (introduces FIS/AFIS phraseologies) | Decision text: "It shall apply from 1 December 2022" (p. 2); sha256 prefix bc46fd0e64599e2e | https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2021014r | Yes | EU agency publication; cite. Later amendments (search leads mention ED Decision 2022/020/R, Amendment 5) **not checked**. |
| C2b | Annex: *AMC and GM to SERA, Issue 1, Amendment 4*, Appendix 1 to AMC1 SERA.14001 | 37 pp.; sha256 prefix 78383a215b578406 | https://www.easa.europa.eu/en/downloads/132543/en | Yes (searched) | As C2a. |
| C2c | Change-info version of C2b | 38 pp.; 0b36014e5d89f2ac | https://www.easa.europa.eu/en/downloads/132544/en | Downloaded, not read | As C2a. |
| C2d | Explanatory Note to ED Decision 2021/014/R | 10 pp.; 8d1a905592bcf462 | https://www.easa.europa.eu/en/downloads/132545/en | Yes (pp. 1–6) | As C2a. |
| C3 | BAF, NfL 2023-1-2726 "Bekanntmachung über die Sprechfunkverfahren" (cancels NfL 2021-1-2304) | Dated 08 FEB 2023, 105 pp.; sha256 prefix 9a1cba0a0e1d8183; copy hosted by Eisenschmidt | https://www.eisenschmidt.aero/media/d7/57/16/1701777386/2023-1-2726-nfl.pdf | Yes (searched; pages below) | German official notice; cite. Do not ship the document. Eisenschmidt's commentary notes errors in some examples ("ZWEI" vs "ZWO"); it is a secondary source. |
| C4 | DFS AIP Germany GEN 3.4 (communication services) and AIP VFR AD EDFE | Not retrieved | aip.dfs.de (login) | No | Reference only ([EDFE note](2026-11-01-edfe-aerodrome-sources.md) E1/E1a). |
| D1 | Cessna Model 172S Information Manual (POH/AFM 172SPHUS), Revision 5, 19 Jul 2004 (S17 in the 172S note) | sha256 420dbdaf5517a7a0…; Section 4 page footers read "Revision 4" | https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf | Yes (Section 4 checklist pages) | Cessna copyright. The title-page notice says it is "for general purposes only" and "will not be kept current". **Cite page numbers and item names only.** Do not reproduce checklists. |
| E2a/E2b | EDFE operator flyer and AFIS letter | See [EDFE note](2026-11-01-edfe-aerodrome-sources.md) | — | Earlier | Reference only. |

## Findings

### 1. Weather report formats and historical access

- **Code form.** METAR, SPECI and TAF are WMO code forms FM 15, FM 16 and FM 51 in
  WMO-No. 306 Vol. I.1 (B2 names B1 as the source). ICAO Annex 3 (B3) sets the
  content and criteria. Neither text was read: group syntax, rounding rules and
  amendment/correction semantics are **TBD-src (B1/B3)** before a parser is accepted.
- **EDFE has no METAR in the international feed checked.** AWC (B7) returned no
  EDFE METAR in 24 h, but EDDF METAR and TAF were available. According to the
  operator (E2b), the EDFE AWOS issues local **MET REPORT/SPECIAL**. Inference: an EDFE
  scenario briefing needs EDDF METAR/TAF (about 5 NM away, per the EDFE note) plus
  a *generated or separately sourced* EDFE local report. A historical archive of the
  EDFE local report has not been found.
- **Historical sources:**
  - IEM (B8) returned EDDF METARs for 2026-06-01, issued at :20 and :50 past each
    hour (observed in the sample). IEM states its site materials are public domain.
  - AWC (B7) holds only 30 days.
  - DWD open data (B4) offers no METAR/TAF directory. DWD's aviation portal (B6) is fee-based.
  - Rights: German reports originate from DWD. B5's CC BY 4.0 grant covers
    *freely accessible* geodata. DWD offers aviation weather through a fee-based
    portal (B6), so it is not established that B5 covers METAR/TAF. IEM's
    public-domain statement covers its own distribution only. **Classify EDDF
    reports as `rights_unknown` (not shippable) until DWD confirms**, and keep both
    the originator (DWD) and distributor (IEM/AWC) attribution.
- **NOTAM:**
  - The format is defined by ICAO PANS-AIM / Annex 15, which was not read (TBD-src).
  - DFS AIS-portal terms forbid automated use and derived works without approval
    (EDFE note, E1a).
  - No open historical German NOTAM archive was identified.
  - Inference: the first scenarios use **generated NOTAM-like training notices**,
    visibly labelled as such.

### 2. Radio phraseology at an AFIS aerodrome

- **AFIS gives information, not clearances.**
  - C2b p. 12, note at §1.2.5: "FIC and AFIS units are entitled only to provide
    information, and to relay clearances and instructions on behalf of ATC units."
  - C2d p. 5: "FIC and AFIS units are not allowed to issue instructions and
    clearances to pilots". 'Warning' phrases are preferred over 'direct' phrases, to
    keep a clear delineation from ATC.
  - C2d p. 5 also finds §1.1.4 (transfer of control/frequency change) applicable
    to ATC only.
  - GM2 Appendix 1 (C2b) says the two rightmost table columns mark whether each
    phrase applies to ATC, FIS or both. The phrases are "not an exhaustive list";
    plain language applies otherwise. **The column ticks were not reliably extracted
    by `pdftotext`; per-phrase AFIS applicability is TBD-src (C2b by visual check).**
- **Relevant C2b sections:**

  | C2b section | Content | Page |
  | --- | --- | --- |
  | §1.1.7 | Traffic information | — |
  | §1.1.9 | Position reporting | — |
  | §1.1.11 | Aerodrome information | — |
  | §1.4.10 | Departure preparation | ~p. 20 |
  | §1.4.14 | In the circuit: pilot reports "(position in circuit, e.g. DOWNWIND/FINAL)"; "LONG FINAL" / "FINAL" note | p. 23 |
  | §1.4.7/§1.4.9 | "RUNWAY VACATED" pilot transmission | pp. 19–20 |

  Clearance phrases (§1.4.11 take-off clearance, §1.4.16 landing clearance) are
  ATC phraseology.
- **Germany (C3).**
  - Language (§5, p. 5): radiotelephony is conducted in English or in the
    language normally used by the ground station; the AIP lists the usable
    languages per station.
  - Call-sign suffix (p. 36): an AFIS unit is "INFORMATION". "RADIO" is for
    uncontrolled aerodromes without AFIS. This is consistent with EDFE's 2025
    change from "Radio" to "Information" (E2b).
  - Annex 1 (from p. 38) gives bilingual German/English tables:

    | C3 Annex 1 section | Content | Page |
    | --- | --- | --- |
    | 1.1.9 | Standortmeldungen (position reports) | p. 48 |
    | 1.1.11 | Flugplatzinformationen (aerodrome information) | p. 49 |
    | 1.4.10 | Abflugvorbereitung (departure preparation) | p. 69 |
    | 1.4.13 | Einflug in eine Platzrunde (joining the circuit) | p. 74 |
    | 1.4.14 | In der Platzrunde (in the circuit) | p. 75 |
    | — | "PISTE VERLASSEN / RUNWAY VACATED" | pp. 68–69 |

    The tables do not mark AFIS applicability.
  - Main text section 20, "Verwenden von Blindsendungen (SERA.14085)", p. 21: blind
    transmission is a communication-failure procedure, not a procedure for operating
    at an aerodrome without AFIS; BRIEFING cites it only for that failure case.
  - EDFE's permitted language(s) are **TBD-src (AIP AD 2 EDFE, C4)**.
- **EDFE procedure** (E2a, earlier note): call INFORMATION at the holding point;
  take-off and landing are at the pilot's discretion, and AFIS gives traffic
  information; call VORFELD after vacating. Frequencies are as in the EDFE note
  (cite-only; AIP check pending).

### 3. 172S checklist pages (D1, Section 4)

Each checklist's page in D1, Section 4, with its relevance to a holding-point start:

| Checklist | Page | Relevance to a holding-point start |
| --- | --- | --- |
| Airspeeds for normal operation | 4-5 | Speed values; not copied here |
| Before Takeoff | 4-15 | 22 items, from parking brake set to brakes release; includes run-up items (magneto check, vacuum gage, engine instruments/ammeter, annunciators, idle check), radios/avionics set, elevator trim and wing flaps set for take-off, and "if installed" items (NAV/GPS switch, autopilot, manual electric trim) |
| Normal Takeoff | 4-15 | 6 items: flaps, full throttle, mixture, nose-wheel lift speed, climb speed, flaps retract |
| Short Field Takeoff | 4-16 | Not in first-exercise scope |
| Enroute Climb | 4-16 | 3 items |
| Descent | 4-16 | Includes "Altimeter — SET" and the flap-speed limits |
| Before Landing | 4-16 | 6 items: seat backs, seats/belts, fuel selector, mixture, landing/taxi lights, autopilot (if installed) |
| Normal Landing | 4-17 | 6 items |
| Balked Landing | 4-17 | 4 items |
| After Landing | 4-17 | 1 item, wing flaps up |
| Securing Airplane | 4-17 | Outside the first exercise |
| Amplified procedures | 4-23 to 4-25 | Before take-off (warm-up, magneto, alternator checks), take-off (power check, wing flap settings, crosswind) |

- **Finding:** D1 has **no "line-up" or "after take-off" checklist**. After-take-off
  actions fall under Normal Takeoff steps 5–6 and Enroute Climb. Any line-up or
  after-take-off list is therefore **generic instructional or school material**, not
  POH.
- **Page revisions:** the Section 4 page footers read "Revision 4", while the title
  page reads "Revision 5 – 19 July 2004". Whether later revisions apply to
  172S9491–172S9809 is unchecked (as already noted in the 172S note).

## Confidence and limitations

- **High:** the AFIS information-only principle (C2b/C2d, EASA text read); the
  German call-sign suffix and language rule (C3); the D1 checklist page locations
  and item names.
- **Medium:** EDFE has no METAR. The evidence is only one 24-hour query to one
  distributor; another distributor or time window may differ.
- **Low or open:**
  - Rights in historical German aviation reports (treated as `rights_unknown`; B5 scope unconfirmed);
  - per-phrase AFIS applicability (column ticks unread);
  - whether later SERA AMC/GM amendments changed the phrases;
  - EDFE language(s);
  - WMO/ICAO code details.

## Proposed next checks

1. A person reads B1 (FM 15/16/51) and B3 for the current edition. Record the group
   syntax, QNH group and units, rounding, and TAF AMD/COR/CNL semantics.
2. Visually check the ATC/FIS columns in C2b for the departure, circuit and vacating
   phrases. Check the current consolidated SERA AMC/GM (Easy Access Rules) for
   amendments after Amendment 4.
3. Read the EDFE AIP AD 2 pages (C4) for permitted languages, AFIS hours and MET
   services (local MET REPORT content and whether it includes QFE).
4. Ask DWD how B5 applies to METAR/TAF redistribution in a GPL project. Confirm
   IEM's provenance for German reports.
5. Instructor review of the phrase set and of the generic line-up/after-take-off items.

## Handoff

Product interpretation and the proposed SPEC/SEC edits are in
[BRIEFING](../design/BRIEFING.md). SPEC, GAPS, TODO and DONE were not changed.
Downloads remain in the session scratchpad only.
