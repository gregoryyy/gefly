# Cessna 172 aerodynamic, propulsion, mass and gear data sources (E2 preparation)

Status: source survey for the project-owned 172S JSBSim model. **No coefficient, curve
or table was extracted into the repository**; this note lists what each source contains,
its rights and its applicability. Nothing here validates a model.
Researcher: Claude Code subagent `researcher`, dispatched by the orchestrator.
Accessed: 2026-11-01 18:10–18:25 Europe/Berlin (session clock, UTC+1).
Scope: [EVAL E2](../EVAL.md), GAPS [Q3](../GAPS.md) (172S s/n 172S9491–172S9809, classic
panel), [Q5](../GAPS.md) (non-proprietary, permissive preferred) and [Q17](../GAPS.md)
(JSBSim engine; its bundled C172 data not shipped); R-DATA-1, R-REUSE-1.

## Question

Which openly usable sources give Cessna 172 (ideally 172S/172R/172P family) aerodynamic,
propulsion, mass/inertia and landing-gear data suitable for a JSBSim flight dynamics
model; what are their rights and applicability to the 172S; and which sources should
serve as calibration versus independent holdout under the E2 rule?

## Method

No deep-research skill or service ran; disclosed fallback: structured primary-source
investigation. NASA Technical Reports Server (NTRS) was searched through its public
citation API (`ntrs.nasa.gov/api/citations/search`, queries "Cessna 172", "Suit Cannaday
high-winged", "Smetana light aircraft stability derivatives", "full-scale mockup light
single-engine high-wing", "Hartman Biermann Clark Y propellers", "Quest for performance
Loftin"). Web searches (US-only search service) located theses, the UIUC model pages, the
Lycoming manual and McCauley listings. Documents were downloaded to a session scratch
directory outside the repository, converted with `pdftotext -layout`, and table pages
whose text layer was unreadable (microfiche OCR) were rendered with `pdftoppm` and read
visually. JSBSim files were read from `raw.githubusercontent.com` at tag `v1.3.3`
(`66f7fafc`). Nothing downloaded was executed.

Labels: **verified** = read in the cited document (page/table given); *unverified* =
search snippet or secondary statement only; *inference* = researcher reasoning.

Not reachable: `history.nasa.gov` (DNS refused by session policy; the same SP-468 was
read from NTRS instead), `repozitorij.fsb.unizg.hr` (HTTP 418), `lycoming.com` manual
URLs (404; a third-party copy was read). No access control was worked around.

## Source register

SHA-256 prefixes of downloaded files are given for reproducibility.

| ID | Citation | URL | Rights / redistribution | Status |
| --- | --- | --- | --- | --- |
| A1 | Suit, W. T.; Cannaday, R. L.: *Comparison of Stability and Control Parameters for a Light, Single-Engine, High-Winged Aircraft Using Different Flight Test and Parameter Estimation Techniques.* NASA TM-80163, Langley, Sep 1979, 58 pp. (`5b66ccfea58e2842`) | [NTRS 19800001985](https://ntrs.nasa.gov/citations/19800001985) | NASA employee work: US government work, no US copyright (17 U.S.C. § 105); NTRS lists it publicly available | **Read** (summary, Table I, list of tables, references) |
| A2 | Clarke, R.; Shane, D. (PIs Roskam, J.; Rummer, D. I.): *Progress Report on Phase III: Development of a Simple, Self-Contained Flight Test Data Acquisition System.* KU-M-407-7, Univ. of Kansas, NASA Grant NSG-4019, Apr 1982, 243 pp. (`b53d7985644fd873`) | [NTRS 19820015371](https://ntrs.nasa.gov/citations/19820015371) | Grantee report (university author): **not** automatically public domain; NTRS hosts it publicly. Cite facts; do not copy tables | **Read** (§6.2, Table 6.2 p. 91, Table 6.3 p. 97 image, references) |
| A3 | Clarke, R.; Roskam, J. et al.: *A simple, low cost application of a flight test parameter identification system.* AIAA 82-1312, Aug 1982 | [NTRS 19820055558](https://ntrs.nasa.gov/citations/19820055558) | AIAA copyright; no NTRS download | Not read (citation only); conference version of A2 |
| A4 | Roesch, P.; Harlan, R. B.: *A Passive Gust Alleviation System for a Light Aircraft.* NASA CR-2605, MIT, Oct 1975, 136 pp. (`86093c2f127a9def`) | [NTRS 19760002914](https://ntrs.nasa.gov/citations/19760002914) | Contractor report; university authors; publicly available on NTRS. Cite facts only | **Read** (Appendix A, Table A-1 text) |
| A5 | Balakrishnan, A. V.; Maine, R. E.: *Improvements in Aircraft Extraction Programs.* NASA CR-145090, 1976, 97 pp. (`7d7851f5de5593fc`) | [NTRS 19770006100](https://ntrs.nasa.gov/citations/19770006100) | Contractor report; cite only | **Read** (abstract, results headings) |
| A6 | Smetana, F. O.; Summey, D. C.; Johnson, W. D.: *Riding and Handling Qualities of Light Aircraft — A Review and Analysis.* NASA CR-1975, 1972, 412 pp. (`0471b7989c31700d`) | [NTRS 19720018355](https://ntrs.nasa.gov/citations/19720018355) | Contractor report; cite only | Searched: contains Cessna **182** data, no Cessna 172 by name |
| A7 | Smetana, F. O. et al.: *Flight Testing Techniques for the Evaluation of Light Aircraft Stability Derivatives.* NASA CR-2016, 1972, 116 pp. (`33ca820e2e35e252`) | [NTRS 19720017341](https://ntrs.nasa.gov/citations/19720017341) | As A6 | Searched: method reference; Cessna 182 mentioned, not 172 |
| A8 | Greer, H. D.; Shivers, J. P.; Fink, M. P.: *Wind-Tunnel Investigation of Static Longitudinal and Lateral Characteristics of a Full-Scale Mockup of a Light Single-Engine High-Wing Airplane.* NASA TN D-7149, 1973, 160 pp. (`ee7407ec6fae04ae`) | [NTRS 19730016341](https://ntrs.nasa.gov/citations/19730016341) | NASA work, US public domain | Searched: aircraft not identified as a Cessna; type unverified |
| A9 | Loftin, L. K.: *Quest for Performance: The Evolution of Modern Aircraft.* NASA SP-468, 1985 (`941335684a40be89`) | [NTRS 19850023776](https://ntrs.nasa.gov/citations/19850023776) | NASA work, US public domain; figure 6.5 is a manufacturer photo ("[mfr]") | **Read** (ch. 6 Skyhawk passage) |
| A10 | Littell, J. D.: *Crash Tests of Three Cessna 172 Aircraft at NASA Langley's Landing and Impact Research Facility.* NASA/TM-2015-218987, Nov 2015 (`f56188a5d5ec2b37`) | [NTRS 20160001629](https://ntrs.nasa.gov/citations/20160001629) | NASA work, US public domain | **Read** (aircraft identity, gear notes) |
| A11 | Jackson, K. E.; Fasanella, E. L.; Littell, J. D.; Annett, M. S.; Stimson, C. M.: *Simulating the Impact Response of Three Full-Scale Crash Tests of Cessna 172 Aircraft.* NASA/TM-2017-219599 (`51c9c4d8a5fcf34f`) | [NTRS 20170007187](https://ntrs.nasa.gov/citations/20170007187) | NASA work (one co-author at NIA, a contractor; treat as cite-only until checked) | **Read** (§4.3 gear tests, Table 2) |
| A12 | Scott, J. (advisor Selig, M.): *Cessna 172 Simulation Model* (linear and nonlinear), UIUC Applied Aerodynamics Group web pages, last updated 10 Apr 2000 | [FlightGear mirror index](https://de3mirror.flightgear.org/fgdata/fgdata_2020_3/Aircraft-uiuc/models/cessna172/index.html), [linear](https://de3mirror.flightgear.org/fgdata/fgdata_2020_3/Aircraft-uiuc/models/cessna172/linear.html) | No licence stated on the pages; references page 404. Cite only | **Read** (index, linear page) |
| A13 | JSBSim `aircraft/c172x/c172x.xml`, `c172p/c172p.xml`, `c172r/c172r.xml`, `engine/eng_io320.xml`, `engIO360C.xml`, `prop_75in2f.xml`; `utils/aeromatic++/Aircraft.cpp` | [JSBSim v1.3.3](https://github.com/JSBSim-Team/jsbsim/tree/66f7fafc) | Aircraft data **not shipped** (Q17); see [E1 survey](2026-11-01-e1-engine-stack-candidates.md). Aeromatic++ source header: LGPL-2.1-or-later | **Read** (headers, mass block, CDo note) |
| A14 | Lycoming: *Operator's Manual O-360, HO-360, IO-360, AIO-360, HIO-360 & TIO-360 Series*, P/N 60297-12, 8th ed., Oct 2005 (pages revised to Mar 2009), 152 pp. (`150de015b2d1bce7`) | [EAA chapter 245 copy](https://chapters.eaa.org/eaa245/-/media/3B5A3308519148D58C389A05AEEC001F.ashx) (lycoming.com URLs tried returned 404) | "©2005 by Lycoming. All rights reserved." Third-party hosting grants nothing. Cite facts; no curve digitisation into the repo without a rights decision | **Read** (operating-conditions table, Fig. 3-9, Fig. 3-25 image) |
| A15 | Hartman, E. P.; Biermann, D.: *The Aerodynamic Characteristics of Full-Scale Propellers Having 2, 3, and 4 Blades of Clark Y and R.A.F. 6 Airfoil Sections.* NACA TR-640, 1938 | [NTRS 19930091715](https://ntrs.nasa.gov/citations/19930091715) | NACA work, US public domain | Located, not read |
| A16 | McCauley / Textron Aviation part record for 1A170E-JHA7660 | [Textron parts](https://ww2.txtav.com/Parts/PartSearch/PartsDetail/1A170E-JHA7660) | Manufacturer page | *Unverified* (snippet: 76 in, "pitch 60", elliptical tip). No blade geometry or performance data found publicly |
| A17 | OpenVSP / VSPAERO | [OpenVSP](https://github.com/OpenVSP/OpenVSP) | NASA Open Source Agreement 1.3 (LICENSE read) | Tool candidate, not a data source |
| A18 | Theses: Univ. Blida 2012 (Merzougui, Chegrani; C172 derivatives by FORTRAN vs AAA); Univ. Liège 2022 (Hinojo Fernandez; panel-method longitudinal derivatives "like the Cessna 172"); Univ. Zagreb FSB 2021 (Ivanković; JSBSim aerodynamics section); Embry-Riddle (1/3-scale 1986 172P) | [Blida](https://di.univ-blida.dz/jspui/handle/123456789/2945), [Liège](https://matheo.uliege.be/handle/2268.2/16143), [Zagreb](https://repozitorij.fsb.unizg.hr/islandora/object/fsb:6667/datastream/PDF) | Licences unchecked | *Unverified* (snippets); Zagreb PDF returned HTTP 418 |
| P1 | Cessna 172S Information Manual (POH/AFM 172SPHUS Rev 5, 19 Jul 2004), S17 of the [172S sources](2026-11-01-c172s-fr172-sources.md); extraction in branch `data/c172s-poh-values` (`docs/research/2026-11-01-c172s-poh-values.md`, `data/aircraft/c172s-classic/poh-values.json`, commit `fd2cf9f`) | see S17 | Cessna copyright; cited values only (R-DATA-1) | Existing extraction, inspected for scope here |
| P2 | FAA TCDS 3A12 Rev 80 (S1b) / EASA IM.A.051 Iss. 11 (S5); Lycoming EASA IM.E.032 (S9) | see [172S sources](2026-11-01-c172s-fr172-sources.md) | FAA: US public domain; EASA: cite only | Already verified there |

## Findings by data group

### Aerodynamics (stability and control derivatives, polars)

- **A1, NASA TM-80163 (flight test, maximum likelihood and regression).** Verified:
  longitudinal and lateral-directional derivatives of an unnamed four-place, strut-braced
  high-wing, fixed-tricycle single-engine airplane, at three trim IAS 31.6, 40.7 and
  54.2 m/s (61, 78, 104 kt), trim/full/idle power, flaps 0, and two c.g. positions for
  static tests (28.8 % c and one other). Contents: Table IV longitudinal parameters per run
  (CL, Cm, CD/CX/CZ derivatives in α, q, δe), Table V Cramér–Rao bounds in percent
  (roughly 0.2–11 %), Tables VII–VIII lateral parameters (CYβ, Clβ, Clp, Clr, Clδa, Clδr,
  Cnβ, Cnp, Cnr, Cnδa, Cnδr …), Table IX mode periods/time to half amplitude, Table X
  comparison values from CR-1975. Units: SI and per radian. The report does not name the
  aircraft. *Inference (strong):* it is a Cessna 172, because A2 (p. 96) compares its
  results with "flight test results obtained by NASA Langley on a Cessna 172 (Reference
  4)", reference 4 being this TM, and the Table I inertias equal A2's in slug·ft² (below).
  Model year and engine are not given.
- **A2, KU-M-407-7 (flight test, MMLE).** Verified (§6.2 p. 88): test aircraft a **1974
  Cessna 172M, N12800**, weighed at Cessna Pawnee Division on 3 Feb 1981; rear seat
  removed; experimental category for the tests. Table 6.3 (p. 97, image) summarises 18
  longitudinal manoeuvres (CL ≈ 0.11–1.11) with derivatives in α, q, δe and Cramér–Rao
  bounds; Table 6.4 the 17 lateral-directional manoeuvres; Figs. 6.17–6.18 compare with
  A1. Units per radian, body axes.
- **A4, NASA CR-2605 (DATCOM estimate plus wind tunnel).** Verified (Appendix A, Table A-1):
  "Cessna 172 parameters … derived by the procedures given in the Air Force DATCOM, except
  for the rotary derivatives which were taken from NASA CR-1975 in which Cessna 182
  parameters were developed"; NASA later supplied wind-tunnel data from a **six-foot-span
  model of the Cessna 172**, shown in a test column for some entries (lift-curve slopes,
  flap effects). Model year unspecified. The wind-tunnel source report itself was not
  located.
- **A5, NASA CR-145090.** Verified: re-analysis of Cessna 172 flight data from NASA LaRC
  (probably the A1 campaign, *inference*) to study estimator behaviour; method evidence,
  not a better data set.
- **A9, NASA SP-468 (performance-derived estimate).** Verified (ch. 6, Skyhawk passage):
  Skyhawk gross weight 2,300 lb, wing loading 13.1 lb/ft², power loading 15.3 lb/hp,
  zero-lift drag coefficient 0.0319, (L/D)max 11.6. This is a 1970s, 150 hp-class Skyhawk
  (*inference* from 2,300 lb × 1/15.3), not a 172S. JSBSim `c172x` cites this chapter for
  its CDo (A13, verified).
- **A12, UIUC linear model.** Verified: lists a full linear derivative set and geometry
  (b 35.8 ft, c̄ 4.9 ft, S 174 ft²) whose "source" column is the simulation code
  `c172_aero.c`; flight conditions "not available". Secondary, untraceable to measurement;
  use only as a plausibility comparison.
- **A6/A7/A8.** Light-aircraft method and data reports; the derivative tables are for a
  Cessna 182 (A6), and A8's mockup is not identified as a Cessna. Useful for method and
  trend checks only.
- **Wing section.** *Unverified:* the 172 wing is commonly reported as NACA 2412; a
  primary source (Cessna drawing or a verified airfoil-usage list) is still needed before
  using NACA section data (public domain) for lift-curve or stall shaping.
- **No public 172S-specific aerodynamic data was found.** All flight-test derivative sets
  above concern earlier 172 models (172M or unnamed) with 2,300 lb-class gross weight,
  O-320-family engines, smaller span/area (174 ft² vs 175.5 ft² for the 172S per S5) and
  different propellers. The airframe shape is closely related (*inference*), so these sets
  are suitable as **structure, priors and plausibility bands**, not as 172S values.

### Mass and inertia

| Source | Aircraft | Mass | Ixx | Iyy | Izz | Ixz | Method |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A2 Table 6.2 p. 91 | 1974 172M, N12800 | 2,098 lb (65.21 slug) | 1029 slug·ft² | 1092 | 1891 | 0 | "Taken from Reference 3" (KU Phase II report, not read) |
| A1 Table I | unnamed (172, *inference*) | 837.93 kg | 1395 kg·m² | 1480 | 2563 | 123 | "manufacturer's data on the subject aircraft" |
| A12 / A13 | "Cessna 172" (UIUC); JSBSim c172x/p/r | 2,300 lb (UIUC); c172x empty 1,454 lb | 948 slug·ft² | 1346 | 1967 | 0 | code/unknown provenance |

*Derived (unit conversion, 1 slug·ft² = 1.35582 kg·m²):* A1's 1395/1480/2563 kg·m² equal
1029/1092/1890 slug·ft², i.e. the same manufacturer values as A2, although the stated
masses differ (1,847 lb vs 2,098 lb) and only A1 has a non-zero Ixz (≈ 91 slug·ft²). The
inertias therefore do not correspond to a stated loading. The JSBSim/UIUC set differs
markedly (Iyy +23 %) and has no traceable source. A search result citing a Wolfram
System Modeler library ("Cel 2019") with different SI values was not inspected.

Implication: no measured 172S inertia exists in open sources. Build the 172S mass model
from component masses and positions (empty mass, engine 268 lb dry for IO-360-L2A from
S9, fuel/oil/occupants at POH/TCDS stations), compute inertias, and use A1/A2 only as a
cross-check band at comparable loading. Record the result as `derived` with method.

### Propulsion

- **Engine (A14, Lycoming 60297-12).** Verified: Figure 3-25 "Sea Level and Altitude
  Performance – IO-360-L2A", Lycoming curve no. **13516-A**, maximum-power mixture, fuel
  minimum 91/96, rated power 160 hp at 2400 rpm; sea-level part shows brake hp vs absolute
  manifold pressure (18–29 inHg) for 1600–2700 rpm, altitude part shows full-throttle
  power to 24,000 ft pressure altitude with a temperature correction formula
  (HP ∝ √((460+Ts)/(460+T))). Figure 3-9 is "Part Throttle Fuel Consumption – IO-360-L2A".
  The operating-conditions table gives, for the L2A, normal rated 2400 rpm/160 hp,
  75 % cruise 2180 rpm/120 hp/8.8 gal/h, 65 % 2080 rpm/104 hp/7.6 gal/h. Applicability:
  the 172S uses the L2A's **alternate 180 hp / 2700 rpm rating** (S5, S9); the chart is
  drawn for the 160 hp rating but contains 2700 rpm lines. Whether the 172S installation
  (induction, exhaust) matches the uninstalled curve must be calibrated against POH
  cruise tables. Copyright: facts citable; digitising the curve into the repo needs an
  explicit rights decision (Q5) or an independent derivation.
- **Propeller (A16, P2).** Verified from TCDS: McCauley 1A170E/JHA7660 fixed pitch,
  75–76 in, static rpm 2300–2400 at full throttle. No public blade geometry, pitch
  distribution or Ct/Cp map was found. Options: (a) generic two-blade fixed-pitch
  coefficients from NACA TR-640 (A15, public domain, Clark Y sections, full-scale tests)
  scaled in pitch to meet the static-rpm band and POH cruise rpm; (b) blade-element design
  with an open tool once geometry is measured on an aircraft (a measurement campaign,
  not yet planned); (c) JSBSim `prop_75in2f` is reference only (not shipped).
- **JSBSim engine files (A13).** `eng_io320.xml` (160 hp) and `engIO360C.xml` (180 hp)
  are generic; not traceable to Lycoming curves; reference only.

### Landing gear

- No open source gives 172S gear stiffness, damping or tyre data. Geometry (wheel
  positions) can come from POH Section 6 weight-and-balance drawings and S5 dimensions
  (cite-only); not yet extracted.
- **A11 §4.3 (verified):** quasi-static test of a C-172 **spring-steel** main gear strut,
  2,500 lb vertical load → 2.87 in vertical displacement (test fixture: upper end fixed,
  lower end free horizontally); nose-gear oleo drop tests performed (data shown as
  figures). A10 (verified): the 1958 C-172 used 0.7 in spring-steel legs, while the
  1974 172M had **tubular** main gear. *Inference:* the spring-steel value does not apply
  to the 172S (tubular legs, *unverified* for 172S; check POH Section 7). JSBSim gear
  parameters will therefore be engineering assumptions, declared and documented before
  any comparison with ground-run holdout data.

### Tools for project-owned estimation

- **Aeromatic++** (A13, JSBSim `utils/aeromatic++`, LGPL-2.1-or-later per source header):
  generates a first JSBSim skeleton from geometry/mass/engine inputs; outputs are
  generic estimates, not 172S data.
- **OpenVSP/VSPAERO** (A17, NOSA 1.3): geometry-based derivative estimation; NOSA is
  OSI-approved but not GPL-compatible as code. Using it as an external tool whose
  numeric outputs we record is distinct from distributing it; Q5 review still needed.
- **USAF Digital DATCOM** (used by A4): *unverified* distribution status; not checked.

## Calibration versus holdout proposal (for product/orchestrator)

E2 requires holdout cases kept apart from tuning. Proposed split, to be fixed **before**
tuning starts:

| Use | Data | Tuned parameters |
| --- | --- | --- |
| Fixed inputs (not tuned) | TCDS geometry, weights, c.g. limits, control travels, engine/propeller limits (P2); computed mass/inertia | — |
| Calibration | POH stall speeds (Fig. 5-3, already extracted in P1) | CLmax per flap setting |
| Calibration | POH cruise performance table (Section 5, **not yet extracted**): rpm, %BHP, KTAS, fuel flow at several altitudes | CD0/induced-drag factor, propeller pitch scaling, installed-power factor |
| Calibration | TCDS static rpm 2300–2400 at full throttle | propeller pitch/efficiency |
| Calibration | Lycoming curve 13516-A (A14) | engine power vs MP/rpm/altitude |
| **Holdout** | POH maximum rate of climb (Fig. 5-6, extracted in P1) | none |
| **Holdout** | POH short-field take-off and landing distances (Figs. 5-5, 5-11, extracted in P1), after declaring gear/brake/friction assumptions | none |
| **Holdout** | S17 introduction summary: max speed 126 kt at sea level, service ceiling 14,000 ft | none |
| **Holdout (plausibility band only)** | A1/A2 derivatives and mode characteristics (short period, phugoid, Dutch roll, roll, spiral) | none; different variant, so a band, not a pass/fail tolerance |
| Instrument model, not tuning | POH airspeed calibration (Fig. 5-1, extracted in P1) | IAS↔CAS mapping |

If the cruise table is not extracted, the max-speed point would have to move into
calibration, weakening the holdout; prefer extracting cruise values (cited facts only).
Time/fuel/distance-to-climb and glide figures (POH, not yet extracted) are further
holdout candidates.

## Rights summary

- NASA employee works (A1, A8, A9, A10; A11 mostly): US public domain; quoting tables
  is generally permitted in the US, but per AGENTS/R-DATA-1 extract only what is needed,
  with citation. Other jurisdictions not analysed.
- NASA contractor/grantee reports (A2, A4, A5, A6, A7): copyright may remain with the
  authors/institutions; treat as cite-only facts.
- AIAA paper (A3), Lycoming manual (A14), Cessna POH (P1), EASA TCDS: copyrighted; cite
  facts; no copying of tables, figures or text; curve digitisation needs a decision.
- UIUC pages (A12), JSBSim aircraft/engine/propeller files (A13), theses (A18): no clear
  open licence for the data, or not shipped by decision; reference only.

## Unresolved questions and next checks

1. Identify the aircraft, year and engine of A1 (NASA LaRC test aircraft) and obtain
   KU Phase II report KU-FRL-407-6 (A2 reference 3) for the inertia origin.
2. Locate the NASA six-foot-span Cessna 172 wind-tunnel report cited in A4.
3. Read NACA TR-640 (A15) and decide the generic propeller approach; consider a propeller
   geometry measurement.
4. Verify the 172S wing section and main-gear construction from primary sources.
5. Extract POH cruise performance and glide values (cited facts) to complete the
   calibration/holdout split.
6. Q5 decision on digitising Lycoming curve 13516-A, and on using NOSA-licensed OpenVSP
   as an external estimation tool.
7. Product to set tolerances per case from source uncertainty (A1 Cramér–Rao bounds,
   POH reading resolution) before any tuning.

## Handoff

For product/orchestrator: no open source provides 172S-specific aerodynamic, propeller,
inertia or gear data. A defensible E2 model combines TCDS/POH fixed data, a computed mass
model, earlier-172 flight-test derivatives as structure and plausibility bands, a
Lycoming-curve engine and a calibrated generic fixed-pitch propeller, tuned on stall and
cruise data and judged on a predeclared holdout of climb, take-off/landing, maximum speed
and ceiling. Every coefficient so produced is `derived` or `assumed`, with provenance.
