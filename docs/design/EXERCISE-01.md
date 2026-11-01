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
| **POH+ST** | Composite: one POH target speed with the ST +15/−5 kt (take-off/approach) or ±15 kt band applied around that single target. Choosing one target inside a POH range is itself IP. |
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
| Initial configuration | Fuel selector BOTH and shutoff ON (POH p. 4-11); master ON, auxiliary fuel pump OFF after start, ignition BOTH (START spring-returns), avionics master ON (POH p. 4-12, p. 7-22); mixture rich, trim and flaps set for take-off, parking brake set (POH p. 4-15); flaps 0° (IP within 0°–10°); altimeter at scenario QNH | POH as cited; trim index **TBD-src** |
| Runway | **Proposed default RWY 26**, second case RWY 08 | IP; open question (below) |
| Circuit | North circuit: right-hand for 26, left-hand for 08 | OPR p. 1 |
| Circuit altitude | **AIP**; development placeholder 1300 ft MSL (operator join altitude for 08 arrivals), visibly labelled unverified | OPR p. 2; AIP TBD-src |
| Altitude ceiling | 1500 ft MSL. The operator states it for "all departures and arrivals"; applying it to the whole circuit is an inference | OPR p. 2 + IP inference |
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
| Indicated airspeed | `ind.asi_ias_mps` | POH targets are KIAS. IAS needs the S17 Fig. 5-1 airspeed calibration (**TBD-src**); the IAS–CAS gap is about 5 kt at low speed (48 KIAS = 53 KCAS, POH p. 5-12). **All IAS-based criteria are blocked until the calibration is extracted**; `sim.cas_mps` is never compared with a KIAS value |
| Calibrated airspeed | `sim.cas_mps` | Used only for limit gates against the POH **KCAS** column (p. 2-4): VNE 160 KCAS, VFE 107 KCAS (10°), 85 KCAS (10°–30°) |
| Indicated altitude | `ind` altimeter indicated altitude (exact field name **TBD** in contracts `ind`) with `setting_pa`, `setting_ref` = QNH | Used for the downwind ±150 ft tolerance (feedback); a mis-set altimeter is reported separately |
| Derived: QNH-reference altitude | `h_qnh_ref_m` (proposed name; field to be agreed in the contracts `ind` group) = altitude a correctly set altimeter would show: ICAO standard-atmosphere pressure–altitude relation evaluated for `env.p_static_pa` with the scenario QNH as zero reference (DEF) | Used for the 1500 ft ceiling **gate**: the operator limit is flown on a QNH altimeter, so true height (`sim.h_msl_m`) would misjudge it in non-standard temperature. Independent of the learner's own setting; derivation and constants recorded with the result for replay |
| Height above runway | `sim.h_msl_m` − threshold elevation (AIP) | DEF; `sim.h_agl_m` near runway |
| Derived: vertical speed | `vs_mps` = −`sim.vd_mps` | Derived, not stored in `sim`; derivation and evaluator version recorded with the result so replay re-derives it |
| Derived: ground speed, track | `gs_mps` = √(`vn_mps`² + `ve_mps`²); `track_true_rad` = atan2(`ve_mps`, `vn_mps`) wrapped to [0, 2π) | As above |
| Heading | `sim.heading_true_rad` | Magnetic only for display via `env.magvar_east_rad` |
| Runway true bearing | From the AIP (**TBD-src**), or the operator magnetic bearing (082°M/262°M, OPR p. 2) converted with the recorded `magvar_east_rad`, labelled "derived from OPR" | Source recorded in the scenario; OurAirports true headings are placeholders only |
| Attitude | `sim.phi_rad`, `sim.theta_rad` | |
| Angle of attack, sideslip | `sim.alpha_rad`, `sim.beta_rad` | Balance feedback; stall-warning model **TBD-src** |
| Position | `sim.lat_rad`, `sim.lon_rad` → runway frame (along-track `x_rwy_m` from landing threshold, lateral `y_rwy_m`, right positive) | DEF; runway frame from scenario navigation snapshot |
| Configuration | `sim.flap_rad`, applied `flaps_detent`, `throttle`, `mixture`, `fuel_selector`, `parking_brake`, brakes | |
| Engine | `sim.prop_radps` → RPM | |
| Ground contact | weight-on-wheels per gear (field name **TBD** in contracts) | Order of main/nose contact |
| Wind | `env` wind NED vector | Headwind/crosswind components relative to runway true bearing (DEF) |
| Teaching | `teach.phase`, `teach.events[]`, `teach.findings[]` (proposed names) | Annotations only; never read by `sim`/`env`/`ind` |

## Phases and measures

Phase transitions are detected from state and recorded as events with `step`.
Detection thresholds are DEF/IP and part of the review.

| Phase | Entry (DEF/IP) | Observable measures (units) | Criteria (label) |
| --- | --- | --- | --- |
| P0 Holding point | Run start | Configuration per initial state; parking brake | Pre-take-off items as POH p. 4-15 shown as checklist (R-TRAIN-4); sensed vs acknowledged distinguished |
| P1 Line-up | Parking brake released, aircraft moves onto runway | Lateral offset `y_rwy_m`; `sim.heading_true_rad` − runway true bearing at start of roll | Feedback only: within ±10° (IP) |
| P2 Take-off roll | Throttle > 0.9 and `gs_mps` increasing | Flap setting; throttle; mixture; lateral offset; nose-wheel steering use | **Gate**: flaps ≤ 10° (POH p. 4-15, 4-25: > 10° not approved). **Gate**: main gear remain on runway surface (geometry AIP). Feedback: full throttle (POH p. 4-15), mixture rich (POH, field < 3000 ft) |
| P3 Rotation | Nose-gear weight off | IAS at nose lift-off (KIAS) | Target 55 KIAS (POH p. 4-15), +15/−5 kt (POH+ST) → 50–70 KIAS. **Blocked** until IAS calibration |
| P4 Initial climb | All gear off ground | IAS, pitch, bank, `track_true_rad`, flap retraction speed | Target 75 KIAS (IP choice inside POH 70–80, p. 4-15; p. 4-5 says 75–85, unresolved), +15/−5 kt (POH+ST) → 70–90 KIAS. 10° flaps retracted not below 60 KIAS (POH p. 4-25). IAS items **blocked** until calibration. `track_true_rad` within ±10° of runway true bearing until the crosswind turn (ST "tracking" limit applied to a visual track, IP adaptation) |
| P5 Crosswind | First turn toward circuit side | Turn height above runway (ft); bank (°) | Turn height **TBD** (instructor; operator gives only a landmark). Bank ≤ 30° (IP; 30° is the skill-test "medium turn", X1 p. 249) |
| P6 Downwind | Second turn completed; track within 30° of reciprocal runway track (DEF) | Indicated altitude (`ind`) vs circuit altitude (ft); `track_true_rad` vs reciprocal runway true bearing (°); IAS; before-landing items | Indicated altitude ±150 ft about circuit altitude (ST; altitude AIP). `track_true_rad` within ±10° of the reciprocal true bearing (ST "tracking" adapted, IP). IAS ±15 kt about a target (ST); target **TBD** (no POH circuit speed); blocked until calibration. Before-landing items fuel BOTH, mixture rich (POH p. 4-16). **Gate**: `h_qnh_ref_m` ≤ 1500 ft = 457.2 m (OPR + IP inference); margin 0 ft unless the instructor sets one (any margin is IP) |
| P7 Base | Third turn | Bank; `sim.cas_mps` vs flap setting; descent | **Gate** (all phases): `sim.cas_mps` ≤ VFE from `sim.flap_rad`: 107 KCAS for 0° < flap ≤ 10°, 85 KCAS for flap > 10° (POH p. 2-4, KCAS column). The POH bands meet at 10°; assigning exactly 10° to the 107 KCAS band and a 0.5° detent tolerance are IP. No VFE gate at 0°. Bank ≤ 30° (IP) |
| P8 Final | Track within 30° of runway track and lateral offset < 1 runway width × 4 (DEF/IP) | IAS; flap; lateral offset; descent path; configuration gate | Flaps 30°: target 65 KIAS (IP choice inside POH 60–70, p. 4-17), +15/−5 kt (POH+ST) → 60–80 KIAS. Flaps up: target 70 KIAS (IP inside POH 65–75, p. 4-5), → 65–85 KIAS. Intermediate flap targets **TBD**. IAS items blocked until calibration; VFE gate as P7. Approach-stability gate at a height **TBD** (IP: 300 ft above threshold, configuration set, IAS within tolerance, bank ≤ 15°; all IP) |
| P9 Flare | Height above threshold < 30 ft (DEF/IP) | Throttle; pitch; sink rate; IAS | Throttle idle by touchdown (POH p. 4-32 "power off") — feedback. Flare height threshold IP |
| P10 Touchdown | First main-gear contact | Gear contact order; `vs_mps` at contact; along-track `x_rwy_m`; lateral offset; drift (track − heading); bank | **Gate**: main wheels before nose wheel (POH pp. 4-17, 4-32). **Gate**: touchdown at or beyond the landing threshold (AIP geometry) and within the first third of LDA (IP; LDA AIP). Lateral: all gear within runway edges (**Gate**, geometry AIP); feedback when \|`y_rwy_m`\| > ¼ runway width (IP). Sink rate: feedback threshold and hard-landing gate **TBD** (no POH value); not evaluated until sourced or set by the instructor |
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
- **Not completed, unsafe** (any of): `sim.cas_mps` above VFE (107/85 KCAS) or VNE
  (160 KCAS), or 2700 RPM exceeded (POH pp. 2-4, 2-5); take-off with flaps > 10°;
  runway excursion; nose-first or off-runway touchdown; `h_qnh_ref_m` above 1500 ft
  (OPR + IP inference). Stall, hard-landing and structural gates stay **TBD**
  (stall-warning model and limits not sourced) and are reported "not evaluated".
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

Checklist rights (R-TRAIN-4): checklist items in the exercise are short paraphrases
with POH page references; no Cessna checklist text, figure or layout is reproduced.

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
6. Extract the S17 Fig. 5-1 airspeed calibration (unblocks all IAS criteria).
7. Exact `ind` altimeter and weight-on-wheels field names in contracts v1.
