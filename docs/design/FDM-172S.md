# Project-owned JSBSim 172S model: build and validation plan

Status: **product proposal (E2 preparation), 2026-11-01; not decided, no model built.**
No coefficient, curve or table is given; numbers below are cited-source pointers or
labelled tolerance *proposals* to fix before tuning. Product role, code1 input.

Scope: [EVAL E2](../EVAL.md#e2-does-one-aircraft-configuration-match-its-evidence) and
E1 integration; SPEC R-AIR-1, R-AIR-2, R-SIM-5, R-SIM-6, R-FID-1..4, R-REUSE-1, R-DATA-1/2
([SPEC](../SPEC.md) owns their text). Configuration: classic-panel **Cessna 172S,
s/n 172S9491–172S9809** ([GAPS](../GAPS.md) Q3). Engine: JSBSim v1.3.3 as a replaceable
WASM library; its bundled C172 data is not shipped (Q17). Rights: Q5, including the
2026-11-01 18:43 decision (needed Lycoming IO-360-L2A curve points as cited facts only;
OpenVSP offline, not distributed, results labelled `estimated`).

Evidence base: [aero data survey](../research/2026-11-01-c172-aero-data-sources.md) (IDs
A1–A18, P1–P2), [172S sources](../research/2026-11-01-c172s-fr172-sources.md) (S1b, S5,
S9, S17), the POH value extraction and manifest in branch `data/c172s-poh-values`
(`data/aircraft/c172s-classic/{manifest.json,poh-values.json}`), the shared contracts and
datum/controls note in branch `design/contracts-1-4` (`docs/design/CONTRACTS.md`,
`docs/research/2026-11-01-jsbsim-datum-172s-controls.md`, both pending merge) and the
[E1 JSBSim study](../../studies/e1-jsbsim/README.md).

## 1. Model structure and source class per parameter group

Source classes (recorded per parameter in a provenance sidecar, §1.8):

| Class | Meaning | Required record |
| --- | --- | --- |
| `sourced` | Value read from TCDS, POH/AFM or Lycoming (cited fact) | source ID, revision, page/figure, reading, unit conversion |
| `derived` | Computed from sourced values by a deterministic, reviewed method | method, script path + hash, input IDs |
| `estimated` | Produced by an estimation method: OpenVSP/VSPAERO (offline), DATCOM method, NACA TR-640 scaling, class-II weight/inertia method, or a declared engineering assumption (`method: assumption`) | tool/method + version, input file hash, settings, rationale |
| `plausibility` | Literature for a different variant (A1 NASA TM-80163, A2 KU-M-407-7 1974 172M, A4 NASA CR-2605, A9, A12) | used only as a comparison band; never a model value unless §1.9 applies |

Status `unknown` blocks the dependent milestone, never silently filled. Behaviour
without a 172S source is marked `generic` and shown to the learner (R-FID-2/3).

### 1.1 `fileheader`

Author, `license` GPL-3.0-or-later (SPDX), `reference` per source ID, notes on
configuration, fidelity (`not validated` until E2 passes) and unsupported regimes.
Model version and package hash feed the replay `aircraft` record (CONTRACTS §5).

### 1.2 `metrics`

| Parameter | Source class | Source |
| --- | --- | --- |
| Wing area, span | sourced | S5 §2 C.4 (cross-check S17 Section 1) |
| Mean aerodynamic chord, LE of MAC | sourced | S1b p. 29, S5 §2 C.14 |
| Horizontal/vertical tail area and arm | derived from geometry (§2); estimated where geometry is estimated | OpenVSP model inputs |
| Aerodynamic reference point (AERORP) | derived (quarter-chord of MAC from sourced MAC/LE) | S1b/S5 |
| Eyepoint, visual reference point | estimated (pilot seat station from POH Section 6 + seat geometry) | S17 Section 6; z TBD-src |

### 1.3 `mass_balance`

| Parameter | Source class | Source / method |
| --- | --- | --- |
| Empty mass and empty CG | **unknown** (manifest); candidate: a representative weighing record or POH sample loading, decision Q-1 | S17 Section 6 |
| Occupant, baggage, fuel stations | sourced | S17 Section 6 loading arrangement, S1b/S5 |
| Unusable fuel and its station; oil | sourced | S5 §2 C.7–8, S1b p. 31 |
| Engine dry mass | sourced | S9 (IO-360-L2A) |
| Propeller/spinner mass | unknown; candidate FAA TC P-857 or McCauley data | Q-6 |
| Component mass distribution | estimated (class-II weight fractions, method cited) constrained to sum to the empty mass and CG | method TBD-src |
| Ixx, Iyy, Izz, Ixz | derived from the component build-up of the **empty aircraft about the empty CG** (JSBSim adds pointmasses and tank contents itself) | own script; A1/A2 inertias as plausibility band only (different mass, 172M) |

Ixz sign: the build-up computes the product of inertia in the body frame of CONTRACTS
§1 and states its sign convention; JSBSim's `negated_crossproduct_inertia` attribute
and default are **TODO to verify** in v1.3.3 source with a fixture (S-2 with an
off-axis torque) before Ixz is entered. Point masses for pilot/passengers/baggage are
scenario-set, checked against the TCDS normal-category CG envelope (S1b/S5) before a
run starts.

### 1.4 `ground_reactions`

| Parameter | Source class | Source / method |
| --- | --- | --- |
| Nose and main contact x/y | sourced or derived (POH Section 1 wheelbase/track, Section 6 arms) | S17; TCDS datum |
| Contact z (static height), structural contacts (tail, wingtips, prop) | estimated (geometry §2, public dimensions) | — |
| Spring and damping coefficients | estimated (`assumption`: static deflection target and damping ratio declared before tests; main-gear type to confirm, A10/A11 spring-steel data does not apply if 172S legs are tubular) | Q-4 |
| Static/dynamic/rolling friction, brake | estimated (`assumption`, generic paved dry runway), **fixed and recorded before any test**; never tuned on holdout | judged by M-a and holdout distances |
| Nose-wheel steering range (bungee, differential braking) | sourced | S17 p. 7-12; force law `generic` |

### 1.5 `propulsion`: piston engine, propeller, tanks

| Group | Source class | Source / method |
| --- | --- | --- |
| Rating, max rpm, displacement, cylinders | sourced | S1b/S5, S9 (alternate 180 hp / 2700 rpm rating) |
| FGPiston elements (volumetric efficiency, BSFC, friction, intake/manifold, installed-power factor) | estimated, then calibrated (§3); FGPiston computes power from these, so no XML element is `sourced` from the curve | method record |
| Calibration targets: BHP vs manifold pressure, rpm, altitude | sourced points (only those needed, Q5 18:43), used as targets, not XML values | A14 Lycoming curve 13516-A |
| Fuel-flow target | POH cruise fuel flow (S17 Section 5). A14 Fig. 3-9 (fuel chart) is **not** covered by Q5 18:43; use needs a Q5 extension | S17 |
| Thrust line (engine/thruster location and orient pitch/yaw angles) | estimated (geometry §2); offsets TBD-src | estimated |
| Idle, friction, starter, temperatures | estimated `generic` (engine start is Later in contracts v1) | — |
| Propeller diameter, blades, fixed pitch, static-rpm band | sourced | S1b/S5 |
| Ct(J), Cp(J) tables incl. negative-thrust (windmilling) region at high J | estimated: public-domain NACA TR-640 (A15) two-blade Clark Y data scaled in pitch; static-rpm band, POH cruise rpm and (jointly with drag) glide calibrate the scaling | A15 (not yet read) |
| Propeller inertia | estimated (mass and blade geometry assumption) | Q-6 |
| Tanks: capacity, usable, station | sourced | S5 §2 C.7, S17 Section 6 |

### 1.6 `flight_control`

Channels from normalized controls (CONTRACTS §3) to surface positions. Surface travel
limits sourced (S5 §2 C.21); sign mapping confirmed by fixture U-4, not assumed. Flap
detents sourced (S17 p. 7-13); flap rate TBD-src (else `generic`). Without a
hinge-moment model, pitch trim is an **elevator bias labelled `generic`**; tab travel
(S5) is recorded but not used as a criterion. Actuator lags and control forces are
`generic` (no force-feel requirement in contracts v1).

### 1.7 `aerodynamics` (JSBSim axes DRAG, SIDE, LIFT, ROLL, PITCH, YAW)

All coefficient functions are `estimated` or calibrated; none is 172S-sourced (survey:
no public 172S aerodynamic data exists).

| Axis / term | Primary method | Calibration / check |
| --- | --- | --- |
| LIFT: CL(α), flap increments | VSPAERO on the §2 geometry; section data from the verified airfoil (Q-3) | CLmax per flap calibrated to POH stall speeds |
| LIFT: post-stall shape, hysteresis | `generic` (no source); flagged out-of-envelope beyond the declared α range | — |
| DRAG: CD0, induced factor, flap/gear increments | estimated (VSPAERO + component build-up) | calibrated to POH glide (if extracted) and cruise |
| PITCH: Cm0, Cmα, Cmq, Cmδe, Cmα̇, flap/power effects | VSPAERO/DATCOM method | trim elevator within travel; static-margin sign; A1/A2 bands reported only (§1.9), never a criterion |
| SIDE/ROLL/YAW: β, p, r, δa, δr derivatives | VSPAERO/DATCOM method | U-4 signs and sourced criteria; A1/A2 mode bands reported only (§1.9) |
| Ground effect | estimated (literature method, cited) | take-off/landing holdout |
| Propwash/slipstream on tail, p-factor, torque | estimated or `generic`, labelled | M-d/M-e handling checks |

VSPAERO limitations and the substitute method for each:

| Limitation | Consequence | Substitute |
| --- | --- | --- |
| Inviscid (VLM/panel) | no profile drag, no viscous CL reduction | component drag build-up; calibration |
| No CLmax or stall | cannot give stall speeds or post-stall | section data (Q-3) + POH stall calibration; post-stall `generic` |
| Slotted flaps poorly represented | flap ΔCL, ΔCm, ΔCD unreliable | DATCOM method, stall calibration; labelled |
| No α̇ derivatives (steady solver) | CLα̇, Cmα̇ missing | DATCOM/tail-lag method, labelled |
| Crude propwash (actuator disk) | power effects on tail uncertain | `generic` or estimated, labelled |

Axis conversion: VSPAERO outputs (its stability/body axes, reference area, span,
chord and moment reference point as set in the run) are converted by a tested script
to JSBSim conventions (wind-axis DRAG/SIDE/LIFT, body ROLL/PITCH/YAW about AERORP,
rate terms non-dimensionalised by b/2V or c̄/2V). Unit tests cover axis signs,
reference-point transfer and non-dimensionalisation; fixture U-4 confirms the resulting
control-derivative signs in JSBSim.

### 1.8 Provenance sidecar (code1 proposal)

`provenance.json` next to the XML maps each numeric element (stable XPath id) to class,
source/citation or method record, original value/unit and the tool version. A check
fails if any numeric XML element lacks an entry, lacks an explicit `unit` attribute, or
cites a `plausibility` source as a value without a §1.9 justification. The check runs
in `just check` once the model exists.

### 1.9 Plausibility sources as values (exception rule)

A `plausibility` source may supply a value only if no `sourced`/`derived`/`estimated`
method is feasible, the orchestrator records the justification, the entry is labelled
`estimated (best available, other variant: <ID>)`, and that quantity is excluded from
any claim of 172S agreement. Default: not used. **No parameter is tuned toward A1/A2
bands.** Band comparisons are reported only; any model change made after a band
comparison is recorded with that comparison and classified under this rule.

## 2. Geometry inputs for OpenVSP

| Input | Source | Status |
| --- | --- | --- |
| Span, wing area, MAC, LE of MAC, overall length, height | S5 §2 C.4/C.14, S1b p. 29 | sourced |
| Wheelbase, track, prop ground clearance, three-view dimensions | S17 Section 1 (dimension figure, cite values only) | to extract |
| Datum (firewall lower front face) and stations | S1b/S5; S17 Section 6 | sourced; **waterline (z) datum TBD-src** |
| Wing planform (inboard constant chord, outboard taper), dihedral, incidence, twist | no public primary source found | estimated from public dimensions and rights-cleared drawings (Q-2) |
| Airfoil section | commonly reported NACA 2412, *unverified* | Q-3; NACA section data is public domain once verified |
| Strut, fuselage cross-sections, cowl, fairings | estimated from public dimensions; speed fairings installed per S17 performance note (Q-7) | estimated |
| Tail planforms, control-surface and flap span/chord, flap type | estimated from public dimensions or a rights-cleared drawing | estimated |
| Propeller position and diameter | S5 (diameter); position estimated | mixed |

Public three-view drawings or kits are used only after their rights are recorded and
permit derived measurements; otherwise excluded. No aircraft is available for measurement
(user, 2026-11-02 00:00): geometry not given by TCDS/POH dimensions is **estimated**, labelled as such,
with sensitivity runs bounding its effect. The `.vsp3` geometry file is project-owned (GPL-3.0-or-later) and kept
with the model; VSPAERO runs are reproducible from it, with OpenVSP version, solver
settings and output hashes recorded. OpenVSP itself is never committed or distributed.

## 3. Calibration set, holdout set and acceptance metrics

From the survey's proposal; frozen (fixture file + hash in DONE/RESULTS) **before tuning**.

| Set | Data (source) | Tuned parameters | Metric |
| --- | --- | --- | --- |
| Fixed | TCDS geometry, weights, CG limits, travels, engine/prop limits; computed mass/inertia | none | exact arithmetic checks |
| Calibration | POH stall speeds, rearward CG, flaps 0/10/30, KCAS (P1, Fig. 5-3) | CLmax per flap | CAS at CLmax in a ≤ 1 kt/s power-off deceleration (method to cite, Q-9) |
| Calibration | POH glide (Section 5, **not extracted**) | CD0, induced factor, jointly with the prop windmilling region (glide drag includes it) | best-glide speed and ratio |
| Calibration | POH cruise table (Section 5, **not extracted**) | drag residual, prop pitch scale, installed-power factor, fuel-flow scale | level trim at POH KTAS: rpm, %BHP, fuel flow |
| Calibration | TCDS static rpm band (S1b/S5) | prop pitch/efficiency | full-throttle static rpm inside band |
| Calibration | Lycoming 13516-A needed points (A14) | engine map | BHP at MP/rpm/altitude points |
| **Holdout** | POH max rate of climb, SL and 2,000 ft, 0/20 °C (Fig. 5-6) | none | steady ROC at POH climb speed |
| **Holdout** | POH short-field take-off and landing, SL/1,000 ft, 10/20 °C (Figs. 5-5, 5-11) | none | ground roll, distance to/from 50 ft |
| **Holdout** | S17 max speed at sea level, service ceiling (**needed extractions**: their conditions and the ceiling's rate-of-climb criterion are not in `poh-values.json`) | none | level-flight max KTAS; altitude at the ceiling ROC criterion |
| **Holdout (proposal)** | POH stall speeds, **forward** CG | none | as calibration; tests tail-load/trim modelling |
| Plausibility band | A1/A2 derivatives, mode periods/damping (172M, unnamed 172) | none | reported, not pass/fail |
| Not FDM | POH airspeed calibration (Fig. 5-1) | instrument model | belongs to the avionics package |

Rules: the number of tuned parameters is recorded and kept below the number of
independent calibration points; every tuning step is logged with inputs and result.
The frozen fixture hash covers the case list, conditions, accepted P-labels and the
scripted-pilot technique and gains. Each case declares its mass and CG. Only the POH stall figures state a CG; for the
climb and take-off/landing figures the CG is a declared assumption (labelled, not
sourced), and the harness sets the declared station. POH KIAS figures
are compared after the harness applies the IAS→CAS mapping from `poh-values.json`;
the dynamics model never contains that mapping. Holdout cases run only on a frozen
candidate; a holdout failure is reported, never tuned away. Changing model structure
after a holdout failure is recorded and that case counts as spent; acceptance then
needs the remaining untouched holdouts. If all are spent, a new independent holdout
must be sourced and frozen before acceptance; spent cases are never reused. Extracting glide and
cruise values needs a user decision (the 13:59 rule limits extraction to needed values);
without them, max speed would move into calibration and weaken the holdout (Q-8).

**Tolerance proposals** (product, engineering judgment; P-labels for the orchestrator
to accept, change or reject before tuning; derived from source resolution and stated
conditions, not from the model):

| ID | Case | Proposed tolerance | Basis |
| --- | --- | --- | --- |
| P-1 | Mass, CG, station arithmetic | 1 mm, 0.01 kg | arithmetic only (U-8) |
| P-2 | Calibration stall CAS | ±1 kt CAS | POH tabulation resolution; IAS values flagged inaccurate near stall by the POH, so CAS used |
| P-3 | Calibration cruise | ±2 kt TAS, ±3 %BHP points, ±5 % fuel flow | table resolution plus the POH speed-fairing note |
| P-4 | Static rpm | inside the TCDS band | sourced band, no added margin |
| P-5 | Engine map points | ±2 % BHP | chart reading resolution of extracted points |
| P-6 | Holdout ROC | ±10 % or ±50 fpm, whichever larger | flight-test scatter, new-aircraft condition note |
| P-7 | Holdout max speed | ±3 kt | fairing note plus cruise residual |
| P-8 | Holdout ceiling | ±1,000 ft | low ROC near ceiling amplifies small errors |
| P-9 | Holdout take-off/landing | ground roll ±15 %, total ±20 % | "average piloting technique", scripted technique and assumed gear/brake/friction |
| P-10 | Forward-CG stall (holdout) | ±2 kt CAS | P-2 plus trim-modelling uncertainty |
| P-11 | Calibration glide (M-b) | best-glide speed ±2 kt CAS, glide ratio ±5 % | chart reading resolution; windmilling-prop uncertainty |
| P-12 | M-a static load split, rest | load split ±1 % of weight; at rest drift and speed within E1 F3 budget | CG arithmetic; E1 study |
| P-13 | Gear timestep refinement | ground-roll distance at 1/120 vs 1/480 s within 0.1 % | gear stiffness must not need a smaller dt |
| P-14 | Native vs WASM | per-state difference ≤ max(1e-9 × abs(value), absolute floor per state: 1e-9 m, 1e-9 m/s, 1e-12 rad) over 40 s | E1 observed 2e-13; margin, still a proposal |

Each result reports the residual, the case conditions (mass, CG, atmosphere, power,
flaps, speed reference, source page, interpolation) and the declared uncertainty (E2).

## 4. Test harness and E1 contract integration

- **Harness.** A new `studies/e2-c172s/` study reuses `studies/e1-jsbsim/harness.py`
  conventions: pinned JSBSim 1.3.3 wheel, SI conversion helpers, step-indexed time at
  dt 1/120 s, JSON output, stdlib tests that skip without JSBSim. The aircraft root
  points at the project model (proposal: `data/aircraft/c172s-classic/jsbsim/`), never
  at the wheel's bundled aircraft.
- **Cases.** JSBSim trim at POH cruise points; power-off deceleration for stall;
  steady climb at POH climb speed; level acceleration (max speed); climb sweep
  (ceiling); scripted short-field take-off/landing pilot (technique, gains, rotation
  and flare rules frozen before running; a test driver, not a model parameter); mode
  responses; E1 F1–F4 and fixtures S-1, S-2, U-4, U-8, T-1, R-1, R-6 on the model.
- **Contract integration.** The same XML loads in the WASM build in the Web Worker
  (CONTRACTS §2–§4), with no aircraft logic in the bridge. Locations use the structural
  frame (firewall lower front face, x aft, y right, z up, as JSBSim); explicit `unit`
  attributes keep source units traceable; only the bridge exposes SI. Geodetic IC,
  physical-height datum and no run-time `h-sl` writes per CONTRACTS §1 (U-6). Package
  hash enters replay metadata; native vs WASM uses P-14, not bitwise (E1). Data
  packaging (embedded vs fetched) is a code1 decision with a hash check.

## 5. Licensing and provenance

- Model XML, provenance sidecar, `.vsp3` geometry, scripts and derived tables are
  project-owned, **GPL-3.0-or-later**, with SPDX headers.
- No JSBSim `c172x`/`c172p`/`c172r`, engine or propeller file content is copied,
  adapted or used as a value source. Authors do not consult those files while
  creating values; any later comparison is recorded as plausibility only. Qualification:
  this is not a strict clean room, since the research note already quotes the c172x
  inertias and empty mass as a comparison; those values stay comparison-only.
- OpenVSP (NOSA 1.3) runs offline and is not distributed; only results ship, labelled
  `estimated` with version and inputs. Aeromatic++ output is not used in shipped files
  until a Q5 review of its template content (Q-10). DATCOM is used as a cited method;
  any program use needs its distribution status checked first.
- POH, EASA TCDS and Lycoming data enter only as needed cited points (R-DATA-1, Q5);
  no chart, table or text is reproduced. A15/A1 are US public domain; A2/A4 cite-only.

## 6. Risks and milestones

| Risk | Mitigation |
| --- | --- |
| Drag, propeller efficiency and installed power are confounded in cruise data | glide data for drag; static rpm for the prop at J = 0; joint fit with recorded identifiability |
| Geometry for VSPAERO is unsourced (planform, airfoil, tails) | estimate from public dimensions; sensitivity runs; label estimates |
| Empty mass/CG unknown; inertia untraceable | Q-1 decision; component build-up; A1/A2 band |
| Gear/brake/friction are assumptions, yet drive take-off/landing holdout | declare before testing; P-9 widened band; report technique sensitivity |
| Overfitting or holdout leakage | frozen, hashed holdout; tuned-parameter count; spent-holdout rule |
| Post-stall, spin, icing, failures unsupported | out-of-envelope flags (R-SIM-6); learner-visible labels |
| WASM vs native numeric drift | tolerance-based comparison; same-build replay only |
| Rights of drawings and extracted points | Q5 checks per item; provenance gate |

| Milestone | Content | Exit criteria |
| --- | --- | --- |
| M-a mass/inertia + gear ground roll | metrics, mass_balance, tanks, ground_reactions; aero explicitly empty and labelled | P-1 and U-8 pass for POH sample loadings; static nose/main load split and rest state within P-12; S-1, S-2 pass; towed/braked roll finite with P-13 met; friction values fixed; provenance check passes |
| M-b longitudinal trim/cruise | LIFT/DRAG/PITCH, flaps, elevator, trim bias (`generic`); provisional propulsion and windmilling prop labelled `estimated` | trim converges at all cruise points with elevator inside travel; P-2 stall and P-11 glide residuals met; negative Cmα at the aft CG limit; cruise residuals reported (acceptance in M-d) |
| M-c lateral-directional | SIDE/ROLL/YAW | U-4 signs; 30° coordinated turn trims inside travel; all modes stable, or spiral divergence with time to double amplitude ≥ 20 s (proposal P-15, engineering judgement pending Q-11) and labelled; sourced/holdout criteria only. A1/A2 band comparison reported, never a pass criterion or tuning target |
| M-d engine/prop | Lycoming points, prop tables, fuel flow; joint cruise fit | P-3, P-4, P-5 met (Lycoming points as targets); then single holdout run: P-6, P-7, P-8 |
| M-e handling checks | take-off/landing, power/flap trim changes, stall behaviour, envelope flags; WASM worker run | P-9, P-10 holdout; R-1, R-6 pass in WASM; P-14 native vs WASM; quality and validate reviews; peer pending per Q15; E2 report with residuals and unsupported regimes |

## 7. Open questions (for the orchestrator)

- Q-1 Representative empty mass/CG (POH sample loading example or a labelled assumption; no aircraft weighing is available)?
- ~~Q-2 Approve a measurement campaign?~~ Not possible: no aircraft available; estimates are used. Q-3 Primary
  source for the airfoil section. Q-4 Main-gear construction and tyre size (S17 §7/8).
- Q-5 Waterline (z) datum and level reference. Q-6 Propeller mass/inertia and blade
  geometry (P-857, McCauley, estimate). Q-7 Speed fairings as the default?
- Q-8 Extract POH cruise, glide, max-speed/ceiling conditions (optionally climb
  time/fuel/distance)? Q-9 Cited stall-speed determination method.
- Q-10 Aeromatic++ output or Digital DATCOM use and terms? Q-11 Accept P-1..P-15 and
  the forward-CG holdout? Q-12 File locations (`data/aircraft/c172s-classic/jsbsim/`,
  `studies/e2-c172s/`)? Q-13 Extend Q5 to needed Lycoming Fig. 3-9 points?
