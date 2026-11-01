# Exercise 01: take-off, circuit and landing at EDFE

Status: **product draft for TODO 1.5, 2026-11-01. Not frozen.** Freezing needs the
user's decisions and a qualified flight-instructor review (GAPS [Q7](../GAPS.md)).
[SPEC](../SPEC.md) owns the requirements (R-TRAIN-1, R-TRAIN-2, R-TRAIN-3, R-TRAIN-4,
R-TRAIN-5, R-FID-2, R-FID-3, R-REVIEW-1, R-SIM-2, R-SIM-4, R-EVAL-1); this document
proposes the exercise definition and criteria that SPEC/EVAL would reference.
Sources: [exercise sources](../research/2026-11-01-exercise-01-sources.md) (X1 EASA,
S17 POH, E2a operator), [EDFE sources](../research/2026-11-01-edfe-aerodrome-sources.md),
[172S sources](../research/2026-11-01-c172s-fr172-sources.md). State field names follow
the contracts v1 draft `docs/design/CONTRACTS.md` on branch `design/contracts-1-4`
(not yet on main).

## Source labels

Every number below carries one label. No unlabelled number is a criterion.

| Label | Meaning |
| --- | --- |
| **ST** | EASA AMC1 FCL.235 (d) skill-test limit (X1 p. 248). EASA calls these "general guidance" for an examiner, with allowance for turbulence and aircraft handling. Used here as an instructional adaptation; it is **not** a skill test. |
| **POH** | Cessna 172S POH/AFM 172SPHUS Rev 5 (S17), page cited. Applies to the classic-panel 172S 9491–9809 only as far as that revision applies (open point). |
| **OPR** | EDFE operator flyer E2a (2026-08), cite-only, "does not replace the AIP". |
| **AIP** | Value required from the DFS AIP VFR EDFE (not read; **TBD-src**). |
| **IP** | **Instructional proposal pending instructor review.** Product choice with rationale; not sourced; may change at review. |
| **DEF** | Measurement definition (how a quantity is computed), not a tolerance. |
| **TBD** | No value proposed; needs a source or instructor input. |

## Learner objective

Fly one complete visual circuit in the classic-panel 172S at Frankfurt-Egelsbach:
line up from the holding point, take off, fly the standard north circuit and land
to a full stop on the runway, maintaining control, staying within aircraft
limitations and the aerodrome's altitude limit, and following the POH normal
procedures. Maps to EASA AMC1 FCL.210 PPL(A) Exercises 12 and 13 (X1 pp. 162–163),
items: pre-take-off checks, into-wind and crosswind take-off, safeguarding the nose
wheel, circuit procedures (downwind and base), powered approach and landing, effect
of wind and use of flaps. Glide, short/soft-field, flapless landings, emergencies and
noise-abatement procedures are not in this exercise.

## Exercise definition

| Item | Proposal | Label / status |
| --- | --- | --- |
| Aircraft | `c172s-classic-9491-9809`, 2,550 lb or less, mass/CG within limits | Q3; mass case **TBD** (E2) |
| Model fidelity | JSBSim with an instructional C172 model until a 172S model passes E2; labelled "generic C172 dynamics, not validated 172S" | R-FID-3; 172S sources note |
| Start | Runway holding point, **engine running** (GAPS Q18 O-8 on contracts branch) | User decision |
| Initial configuration | Mixture rich, fuel selector BOTH, shutoff ON, fuel pump OFF, ignition BOTH, master and avionics on, trim set for take-off, flaps 0°, parking brake set, altimeter set to scenario QNH | POH p. 4-15; trim index **TBD-src** |
| Runway | **Proposed default RWY 26**, second case RWY 08 | IP; open question (below) |
| Circuit | North circuit: right-hand for 26, left-hand for 08 | OPR p. 1 |
| Circuit altitude | **AIP**; development placeholder 1300 ft MSL (operator join altitude for 08 arrivals), visibly labelled unverified | OPR p. 2; AIP TBD-src |
| Altitude ceiling | 1500 ft MSL for all departures and arrivals | OPR p. 2 |
| Pressure reference | QNH | EDFE note; R-AIR-3 |
| Radio | Holding-point call to EGELSBACH INFORMATION 118.405 MHz is shown as a briefing item only; not assessed (R-COMM-1 later) | OPR p. 1 |
| Traffic | None | IP |
| Completion | Full stop on the runway, parking brake or brakes held | IP |
| Geometry source | Runway ends, thresholds, widths, LDA: **AIP**; OurAirports values only as labelled development placeholders | EDFE note E3 |

Ground-track cues for legs (motorway A5, forest clearing, fire tower, A661, K168) are
operator landmarks without coordinates; any drawn circuit line is a **generated
teaching cue**, not published geometry.

## State fields used

Assessment reads only per-step recorded state, never interpolated display values
(contracts §2), so a replay re-evaluates to the same result (R-SIM-4, R-REVIEW-1).

| Quantity | Field | Note |
| --- | --- | --- |
| Indicated airspeed | `ind.asi_ias_mps` | POH speeds are KIAS; needs the S17 Fig. 5-1 calibration (**TBD-src**). Until then assess `sim.cas_mps` and label "CAS, not IAS" |
| Indicated altitude | `ind` altimeter indication with `setting_pa`, `setting_ref` | Height criteria use indicated altitude at QNH; `sim.h_msl_m` cross-checks setting errors |
| Height above runway | `sim.h_msl_m` − threshold elevation (AIP) | DEF; `sim.h_agl_m` near runway |
| Vertical speed | `vs_mps` (−`sim.vd_mps`) | |
| Ground speed, track | `gs_mps`, `track_true_rad` from NED velocity | |
| Heading | `sim.psi_true_rad` (contracts §1 also names `heading_true_rad`; align) | Magnetic only for display via `magvar_east_rad` |
| Attitude | `sim.phi_rad`, `sim.theta_rad` | |
| Angle of attack, sideslip | `sim.alpha_rad`, `sim.beta_rad` | Balance feedback; stall-warning model **TBD-src** |
| Position | `sim.lat_rad`, `sim.lon_rad` → runway frame (along-track `x_rwy_m` from landing threshold, lateral `y_rwy_m`, right positive) | DEF; runway frame from scenario navigation snapshot |
| Configuration | `sim.flap_rad`, applied `flaps_detent`, `throttle`, `mixture`, `fuel_selector`, `parking_brake`, brakes | |
| Engine | `sim.prop_radps` → RPM | |
| Ground contact | weight-on-wheels per gear (contract field name **TBD**) | Order of main/nose contact |
| Wind | `env` wind NED vector | Headwind/crosswind components relative to runway true bearing (DEF) |
| Teaching | `teach.phase`, `teach.events[]`, `teach.findings[]` (proposed names) | Annotations only; never read by `sim`/`env`/`ind` |

## Phases and measures

Phase transitions are detected from state and recorded as events with `step`.
Detection thresholds are DEF/IP and part of the review.

| Phase | Entry (DEF/IP) | Observable measures (units) | Criteria (label) |
| --- | --- | --- | --- |
| P0 Holding point | Run start | Configuration per initial state; parking brake | Pre-take-off items as POH p. 4-15 shown as checklist (R-TRAIN-4); sensed vs acknowledged distinguished |
| P1 Line-up | Parking brake released, aircraft moves onto runway | Lateral offset `y_rwy_m` and heading error at start of roll | Feedback only: aligned within ±10° of runway heading (IP) |
| P2 Take-off roll | Throttle > 0.9 and `gs_mps` increasing | Flap setting; throttle; mixture; lateral offset; nose-wheel steering use | **Gate**: flaps ≤ 10° (POH p. 4-15, 4-25: > 10° not approved). **Gate**: main gear remain on runway surface (geometry AIP). Feedback: full throttle (POH p. 4-15), mixture rich (POH, field < 3000 ft) |
| P3 Rotation | Nose-gear weight off | IAS at nose lift-off (KIAS) | Target 55 KIAS (POH p. 4-15); feedback window +15/−5 kt (ST adapted) → 50–70 KIAS |
| P4 Initial climb | All gear off ground | IAS, pitch, bank, track, flap retraction speed | Target 70–80 KIAS (POH p. 4-15; p. 4-5 says 75–85, unresolved); tolerance +15/−5 kt about the range (ST) → 65–95 KIAS. 10° flaps retracted not below 60 KIAS (POH p. 4-25). Track within ±10° of runway track until crosswind turn (ST adapted to ground track, IP) |
| P5 Crosswind | First turn toward circuit side | Turn height above runway (ft); bank (°) | Turn height **TBD** (instructor; operator gives only a landmark). Bank ≤ 30° (IP; 30° is the skill-test "medium turn", X1 p. 248) |
| P6 Downwind | Second turn completed; track within 30° of reciprocal runway track (DEF) | Indicated altitude vs circuit altitude (ft); heading vs reciprocal (°); IAS; before-landing items | Height ±150 ft about circuit altitude (ST; altitude AIP). Heading ±10° of reciprocal runway heading after wind correction (ST adapted, IP). IAS ±15 kt about a target (ST); target **TBD** (no POH circuit speed). Before-landing items fuel BOTH, mixture rich (POH p. 4-16). **Gate**: never above 1500 ft MSL (OPR) |
| P7 Base | Third turn | Bank; IAS vs flap setting; descent | Flaps 10°–30° only below 85 KIAS, 0°–10° below 110 KIAS (**Gate**, POH pp. 2-4, 4-16). Bank ≤ 30° (IP) |
| P8 Final | Track within 30° of runway track and lateral offset < 1 runway width × 4 (DEF/IP) | IAS; flap; lateral offset; descent path; configuration gate | IAS target 65 KIAS within the POH 60–70 KIAS flaps-down range (POH p. 4-17), tolerance +15/−5 kt (ST) → 60–80 KIAS, upper bound also below VFE 85 (POH p. 2-4). Approach-stability gate at a height **TBD** (IP: 300 ft above threshold, configuration set, IAS within tolerance, bank ≤ 15°; all IP) |
| P9 Flare | Height above threshold < 30 ft (DEF/IP) | Throttle; pitch; sink rate; IAS | Throttle idle by touchdown (POH p. 4-32 "power off") — feedback |
| P10 Touchdown | First main-gear contact | Gear contact order; `vs_mps` at contact; along-track `x_rwy_m`; lateral offset; drift (track − heading); bank | **Gate**: main wheels before nose wheel (POH pp. 4-17, 4-32). **Gate**: touchdown at or beyond the landing threshold (AIP geometry) and within the first third of LDA (IP; LDA AIP). Lateral: all gear within runway edges (**Gate**, geometry AIP); feedback when \|`y_rwy_m`\| > ¼ runway width (IP). Sink rate: feedback threshold **TBD** (no POH value); hard-landing fail **TBD-src** |
| P11 Rollout and stop | All gear on ground | Nose-wheel lowering; braking; lateral offset; stop position | Nose wheel lowered gently, minimum braking (POH p. 4-17) — feedback. **Gate**: stop on the runway surface. Stopped = `gs_mps` < 0.3 m/s for 2 s (DEF/IP) |

Heading/altitude excursions are counted only when outside tolerance continuously for
more than 3 s (IP), reflecting the ST allowance for turbulence; gate exceedances
(limits, runway excursion, ceiling) count immediately.

## Pass, fail and feedback rules

- **Completed**: every gate passed and the aircraft stopped on the runway.
- **Not completed, safe**: the learner discontinues with a go-around (POH balked
  landing: full throttle, flaps to 20°, 60 KIAS, pp. 4-5, 4-17) or abandons the
  take-off before lift-off and stops on the runway. Recorded as a safe decision, not a
  failure (IP; aligned with X1 Exercises 12/13 "abandoned take-off", "go-around").
- **Not completed, unsafe** (any of): VFE, VNE (163 KIAS) or 2700 RPM exceeded (POH
  pp. 2-4, 2-5); take-off with flaps > 10°; runway excursion; nose-first or off-runway
  touchdown; 1500 ft MSL exceeded; stall (stall-warning/stall model **TBD-src**);
  structural or contact-limit flag from the model.
- **Tolerances (ST/IP)** produce graded feedback (within / outside, by phase), not a
  pass mark. The exercise reports no score; ST values do not make it a skill test.
- Feedback names the phase, the measured value with units (kt, ft, °, ft/min), the
  criterion and its label, and links to the replay marker. It never presents an IP or
  generated explanation as aircraft or regulatory authority (STYLE).
- Every result records the evaluator version, criterion-set version and labels, so a
  changed tolerance re-evaluates old recordings explicitly instead of silently.

## Assists and fidelity disclosure

The briefing and debrief show: aircraft model id and status (generic C172 dynamics
until E2 acceptance), POH revision used, missing IAS calibration (CAS substitute),
placeholder aerodrome geometry and circuit altitude (until AIP), generated weather,
and every active assist (roll→yaw mixing, input smoothing, pause, simplified brakes)
(R-FID-2). A run with an assist that alters control authority is labelled "assisted";
assists never change limits or criteria. Result text carries the R-TRAIN-3 notice:
simulator practice, no training credit or regulatory approval.

## Replay and debrief markers

Event markers with `step`: run start; parking brake release; start of take-off roll;
rotation; lift-off; flap changes; each circuit turn start/end; downwind abeam
(along-track sign change, DEF); before-landing items sensed; stability gate; flare
start; each gear contact; nose-wheel contact; stop; go-around or abandoned take-off;
every tolerance excursion start/end and gate violation. The debrief shows the flown
track against the teaching-cue circuit, IAS/altitude/vertical speed traces with
tolerance bands and labels, and control/configuration traces (R-REVIEW-1).

## Environment cases

| ID | Conditions | Label |
| --- | --- | --- |
| ENV-0 | Calm, no turbulence, ISA temperature at field, scenario QNH; generated briefing marked "generated" | IP; R-BRIEF-1 |
| ENV-1 | Light crosswind, steady, from the right of RWY 26, magnitude **TBD** (proposal 5 kt 90° to runway, well below the 15 kt demonstrated value, POH p. 4-33, "not a limitation", p. 5-13) | IP |
| ENV-2 | ENV-1 with light turbulence | Later; seed recorded |
| ENV-3 | RWY 08 left-hand circuit, calm | IP |

## Out of scope

Training credit, logbook or ATO approval claims; engine start and taxi (GAPS Q18
O-8); radio exchange assessment; traffic; south circuit; touch-and-go; short, soft,
glide and flapless landings; emergencies and engine failure; night; vacating and
after-landing checks; the Reims FR172. The real procedure follows the current AIP and
operator rules; this exercise does not replace them.

## Proposed SPEC/EVAL edits (not applied)

- R-TRAIN-5 acceptance: add "the first circuit exercise's criteria, sources and labels
  are frozen in `design/EXERCISE-01.md` at a stated version after instructor review;
  ST/POH/OPR/AIP-labelled values cite their source; IP values record the reviewer."
- R-TRAIN-2: add that assessment re-evaluates identically from the replay record and
  records evaluator and criterion-set versions.
- New EVAL section (E7 or a dedicated E14) "Does Exercise 01 assess what it claims?":
  scripted input fixtures (nominal circuit; flaps 20° take-off; VFE exceedance; long
  touchdown; nose-first touchdown; go-around; 1500 ft exceedance; ENV-1 crosswind)
  with expected gate/feedback outcomes fixed before execution, plus re-evaluation
  equality on replay; instructor walkthrough recorded in RESULTS.
- E3: name Exercises 12/13 (AMC1 FCL.210, EAR Aircrew Oct 2026) as the objective.

## Open questions

1. Instructor review partner (Q7): who, with which qualification (FI(A)), and does a
   German ATO's circuit standard override IP values?
2. Runway: default RWY 26 (right-hand) or RWY 08 (left-hand, short final)?
3. AIP circuit altitude, thresholds, LDA and width: person-read citation or DFS
   permission (EDFE note G1).
4. Which POH climb speed applies (70–80 vs 75–85 KIAS), and which POH revision?
5. Crosswind-turn height, downwind target speed, stability-gate height, touchdown
   zone, sink-rate feedback and ENV-1 magnitude: instructor values.
6. Assess on CAS until the 172S airspeed calibration is extracted, or block speed
   criteria?
