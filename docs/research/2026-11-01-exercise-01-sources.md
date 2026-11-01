# First exercise (EDFE circuit) objective, tolerance and procedure sources

Status: focused source research for the draft [EXERCISE-01](../design/EXERCISE-01.md).
EASA and POH facts below are **verified** by reading the cited pages; aerodrome
circuit facts come from the operator flyer and remain **unverified against the AIP**.
Not an instructor review, not a training-credit assessment and not a data pack.
Researcher: Claude Code, product-role subagent doing its own source research
(dispatched by the orchestrator).
Accessed: 2026-11-01 13:05–13:30, Europe/Berlin.
Scope: TODO 1.5; GAPS [Q7](../GAPS.md) (first exercise and review partner) and
[Q10](../GAPS.md) (runway/circuit); R-TRAIN-1, R-TRAIN-2, R-TRAIN-5, R-FID-2,
R-FID-3, R-REVIEW-1.

## Question and method

1. Which current EASA documents state the PPL(A) objectives for take-off, circuit,
   approach and landing, and which numeric skill-test tolerances exist?
2. Which classic-panel 172S manufacturer values (speeds, flap settings, limits,
   technique) apply to those phases?
3. What does the EDFE operator publish about the circuit and its altitudes?

No deep research skill or service ran. Fallback: direct retrieval with `curl` into a
session scratch directory outside the repository, conversion with `pdftotext
-layout`, and reading of the cited pages. Figures were not inspected visually.
Search snippets were not used as evidence.

## Source register

| ID | Title | Publisher | Revision / date | URL | Rights | Status |
| --- | --- | --- | --- | --- | --- | --- |
| X1 | Easy Access Rules for Aircrew (Regulation (EU) No 1178/2011), PDF, 2,046 pages | EASA | **Revision from October 2026**, PDF created 2026-10-16; SHA-256 prefix `408931502d78a572` | [EASA download 115485](https://www.easa.europa.eu/en/downloads/115485/en) via the [EAR Aircrew page](https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-aircrew) | Copyright notice p. 2–3: "© European Union, 1998-2026"; re-use of EUR-Lex legal documents permitted with source credit. EASA disclaimer (p. 4): consolidated text is not the authentic legal source. Cite and quote short provisions; the Official Journal remains authoritative | **Read** (pp. 160–163, 243, 248–250) |
| S17 | Cessna Model 172S Information Manual (reprint of POH/AFM 172SPHUS, Rev 5, 19 Jul 2004) | Cessna Aircraft Company; copy hosted by a flying club | SHA-256 prefix `420dbdaf5517a7a0` (identical to the copy in the [172S sources](2026-11-01-c172s-fr172-sources.md)) | [befa.org copy](https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf) | Cessna copyright 1998; general-purpose information manual, not kept current; third-party hosting grants no reuse right. **Facts cited by page; no text, table or checklist reproduced** | **Read** (pp. 2-4, 2-5, 4-5, 4-15 to 4-17, 4-24, 4-25, 4-32, 4-33, 5-12, 5-13) |
| E2a | Operator flyer "2026-09-Flyer-EDFE-Verfahren-DE.pdf", TRIWO Egelsbach Airfield GmbH | Operator | PDF created 2026-08-11; SHA-256 prefix `a2bfc75c5a9c78d2` (same as the [EDFE sources](2026-11-01-edfe-aerodrome-sources.md)) | [operator PDF](https://egelsbach-airport.com/wp-content/uploads/2026/09/2026-09-Flyer-EDFE-Verfahren-DE.pdf) | Operator copyright; private, non-commercial download; "does not replace the AIP". **Reference only** | **Re-read** (pp. 1–2, text layer) |
| E1 | DFS AIP VFR EDFE pages | DFS | unknown | see [EDFE sources](2026-11-01-edfe-aerodrome-sources.md) E1 | Terms forbid automated access | **Not read** (needs a person or DFS approval) |

Per-page revision marks seen in S17: p. 2-4 "July 8/98"; p. 2-5 "Revision 4"; p. 4-5 "May 30/00"; pp. 4-15,
4-17, 4-24, 4-33 "Revision 4"; p. 5-12 "July 8/98". The title page states Rev 5; later
revisions applicable to 172S9491–172S9809 were not checked (open point carried over).

## Findings: EASA (X1)

**Training syllabus, AMC1 FCL.210 PPL(A) Training course** (ED Decision 2025/002/R),
pp. 162–163:

- Exercise 12 "Take-off and climb to downwind position" lists pre-take-off checks,
  into-wind take-off, safeguarding the nose wheel, crosswind take-off, drills during
  and after take-off, short/soft-field technique and noise abatement.
- Exercise 13 "Circuit, approach and landing" lists circuit procedures (downwind and
  base leg), powered approach and landing, safeguarding the nose wheel, effect of wind
  on approach and touchdown speeds and use of flaps, crosswind approach and landing,
  glide/short/soft/flapless landings, missed approach and go-around, noise abatement.
- Exercise 12/13 "Emergencies" (abandoned take-off, simulated engine failure after
  take-off, rejected landing and go-around, missed approach, engine failure/restart).
- No numeric performance standard is attached to these exercises.

**Skill test, FCL.235** (Regulation (EU) 2025/134), p. 243: the test is divided into
sections; failure in any item fails the section (pass-mark rules (c)(1)–(4)).

**AMC1 FCL.235 Skill test**, contents for a PPL(A) (ED Decision 2011/016/R), p. 248:

- (b): checks follow the authorised checklist for the aeroplane; performance data for
  take-off, approach and landing are calculated from the operations or flight manual.
- (c) "Flight test tolerance": the applicant demonstrates the ability to operate the
  aeroplane within its limitations, complete manoeuvres with smoothness and accuracy,
  exercise good judgment and airmanship, apply aeronautical knowledge and maintain
  control so that the outcome is "never seriously in doubt".
- (d) "The following limits are for general guidance. The FE should make allowance for
  turbulent conditions and the handling qualities and performance of the aeroplane
  used": height, normal flight **±150 ft**; heading or tracking of radio aids, normal
  flight **±10°**; speed, take-off and approach **+15/–5 kt**; all other flight regimes
  **±15 kt** (engine-failure values apply to multi-engine aeroplanes only).
- Section 1 includes pre-take-off procedures, take-off and after-take-off checks and
  aerodrome departure procedures; Section 2 defines medium turns as 30° bank (p. 249);
  Section 4 includes aerodrome arrival, crosswind landing "if suitable conditions
  available", touch and go and go-around from low height (pp. 249–250).

Interpretation (inference): the numeric limits are examiner guidance for a real
aeroplane, not a pass/fail algorithm; using them in a simulator is an instructional
adaptation and does not make the exercise a skill test or give credit.

## Findings: Cessna 172S (S17, page-cited facts)

| Fact | Value (original units) | Page |
| --- | --- | --- |
| Basis of normal-operation speeds | 2,550 lb maximum weight, usable at lesser weight | 4-5 |
| Normal climb out after take-off | 75–85 KIAS | 4-5 |
| Normal take-off checklist climb speed | 70–80 KIAS | 4-15 |
| Lift nose wheel (normal take-off) | 55 KIAS | 4-15 |
| Take-off flaps | 0°–10°; more than 10° not approved for take-off | 4-15, 4-25 |
| Retract 10° take-off flaps | after obstacles are cleared and 60 KIAS reached | 4-25 |
| Best rate of climb (sea level) / best angle (sea level) | 74 KIAS / 62 KIAS | 4-5 |
| Normal approach, flaps up / flaps 30° | 65–75 KIAS / 60–70 KIAS | 4-5, 4-17 |
| Flap extension in descent/approach | 0°–10° below 110 KIAS; 10°–30° below 85 KIAS | 4-16, 4-17 |
| VFE | 107 KCAS / 110 KIAS (10°); 85 KCAS / 85 KIAS (10°–30°) | 2-4 |
| VNO / VNE | 126 / 160 KCAS; 129 / 163 KIAS | 2-4 |
| Maximum engine speed | 2700 RPM; full-throttle static 2300–2400 RPM | 2-5 |
| Before starting engine | fuel selector BOTH; fuel shutoff ON (pushed in) | 4-11 |
| Starting engine (battery) | master ON; auxiliary fuel pump ON for priming then OFF; ignition START, released when the engine starts; avionics master ON after start | 4-12 |
| Before take-off | mixture rich, fuel selector BOTH, trim and flaps set for take-off, brakes release | 4-15 |
| Before landing | fuel selector BOTH, mixture rich, landing/taxi lights on | 4-16 |
| Normal landing | touchdown main wheels first; lower nose wheel gently; minimum braking | 4-17 |
| Touchdown technique | power off, main wheels first; avoid steep slips with flaps > 20° | 4-32 |
| Balked landing | full throttle, flaps to 20°, 60 KIAS | 4-5, 4-17, 4-33 |
| Crosswind take-off | minimum flaps; accelerate slightly above normal, lift off briskly, then turn into wind for drift | 4-25 |
| Crosswind landing | minimum flaps for field length; wing-low method gives best control | 4-33 |
| Demonstrated crosswind | 15 kt, "not a limitation" | 4-5, 4-33, 5-13 |
| Stall speed, 2,550 lb, power off, wings level, most rearward CG | flaps up 48 KIAS / 53 KCAS; flaps 30° 40 KIAS / 48 KCAS; KIAS approximate | 5-12 |

Internal discrepancy: climb speed 75–85 KIAS (p. 4-5) versus 70–80 KIAS (p. 4-15
checklist). The pages carry different revision marks. Not resolved here.

Not found in S17 (searched Sections 2, 4, 5): a circuit or downwind speed, a touchdown
sink-rate limit, a tail-strike pitch angle, a flare height or a touchdown-zone length.

## Findings: EDFE circuit (E2a, cite-only)

- North circuit is standard; south circuit on request. Runway 26 north circuit is
  right-hand; runway 08 is left-hand. Bearings 082°M / 262°M (pp. 1–2).
- Runway 26 legs are described by landmarks only: straight ahead to the A5 motorway
  (not overflown), right crosswind before it, right downwind along the forest clearing
  towards the white fire tower at the southern edge of Langen, base turn over the A661,
  final south of road K168 (p. 1). Runway 08: final is short, so descent may begin on
  downwind (p. 1).
- All departures and arrivals at most 1500 ft MSL; arrival for 08 from TANGO joins
  the north circuit at 1300 ft MSL; EDFE has an ATZ/RMZ/TMZ with AFIS (p. 2).
- At the holding point call EGELSBACH INFORMATION 118.405 MHz; take-off and landing at
  the pilot's discretion; AFIS gives traffic information (p. 1).
- **No circuit altitude, no circuit dimensions and no coordinates** are stated.

## Implications for product (proposal)

- Use X1 (d) limits as labelled "skill-test guidance" for downwind height, leg heading
  and take-off/approach speed, with persistence allowance for turbulence.
- Do not compare simulated CAS with KIAS targets: the IAS–CAS gap is about 5 kt at
  low speed (p. 5-12). ~~Block IAS criteria until Fig. 5-1 is extracted~~ (superseded
  2026-11-01, below); use the KCAS column of p. 2-4 for limit gates.
- Use S17 values as the aircraft-procedure targets and limits for the 172S classic
  configuration (R-FID-3), keeping the 70–80/75–85 discrepancy visible.
- Anything not covered (crosswind-turn height, touchdown zone, sink rate, centreline
  limits, stabilised gate) is an instructional proposal requiring instructor review.
- Circuit altitude, runway geometry and thresholds wait for the AIP (EDFE note G1).

## Unresolved

- Instructor review partner (GAPS Q7) and whether a German ATO's circuit standards
  apply instead of generic proposals.
- AIP VFR EDFE circuit altitude, thresholds and declared distances.
- Applicable POH revision for 172S9491–172S9809 and the climb-speed discrepancy.
- ~~The 172S airspeed-calibration curve (S17 Section 5, Fig. 5-1, not extracted)~~
  extracted 2026-11-01 (addendum below). Still open: flaps-20° calibration (not in S17)
  and the VFE flaps-10° 107/109 KCAS conflict.

## Addendum 2026-11-01: extracted POH values

Source: data/aircraft/c172s-classic/poh-values.json (arriving with PR #17,
values_version 0.1.0, draft) and its research note `2026-11-01-c172s-poh-values.md`
on the same branch. Used by Exercise 01 as follows (product proposal):

- Fig. 5-1 (p. 5-9), normal static source, flaps 0°/10°/30°, 50–110/50–90/50–80 KIAS:
  assessment IAS derived from `sim.cas_mps` by linear interpolation between the
  extracted points (instructional derivation, label CAL). An out-of-table sample at a
  band edge that coincides with the table edge reports below/above band (monotone
  reading); other out-of-table samples and untabulated flap settings → not evaluated.
  Further POH points (e.g. 40 KIAS at flaps 10°/30°, 85 KIAS at flaps 30°) exist but
  are not extracted (extraction-share rule).
- Stall speeds (p. 5-12, 2,550 lb, power off, wings level): stall-margin warning in
  KCAS with an IP threshold; not a stall gate. Flaps in transit 0°–10° use the
  flaps-0° value. The 30° and steeper bank stall speeds on p. 5-12 are not extracted.
- VFE flaps 10°: p. 2-4 gives 107 KCAS, Fig. 5-1 gives 109 KCAS at 110 KIAS; the
  exercise keeps the conservative 107 KCAS (IP).
- Take-off/landing distances (pp. 5-14, 5-23/5-24) are short-field technique only:
  plausibility bounds, not pass/fail.

Handoff: SPEC, EVAL, GAPS, TODO and DONE were not changed. Downloads stay in the
session scratchpad; nothing copyrighted was added to the repository.
