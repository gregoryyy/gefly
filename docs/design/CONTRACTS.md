# Shared simulation contracts v1

Status: **product proposal for TODO 1.4, 2026-11-01; not yet accepted by the
orchestrator.** It defines the shared contracts that code1 and code2 must agree on
before parallel product coding (R-SIM-2, R-SIM-3, R-SIM-4, R-SIM-6, R-INPUT-1..3,
R-REVIEW-1, R-BRIEF-1, R-REUSE-1). [SPEC](../SPEC.md) owns requirement text; this
document owns contract detail. The study contract v0/v0.1 in
[E1 browser](../../studies/e1-browser/README.md) is evidence, not product authority.
Engine: JSBSim as a replaceable WASM library (GAPS Q17). Aircraft: classic-panel
172S, serials 172S9491–172S9809 (GAPS Q3). Code location: `packages/contracts/`
([ARCH](../ARCH.md)); one writer per change, integrated by the orchestrator.

Marking: **TBD-src** = value or behavior needs a cited source before use; no number
may be filled in from memory, another C172 variant or AI output (R-DATA-2).
**Proposal** = product choice open to orchestrator/user decision.

## 1. Units and frames

**Internal units are SI**: m, s, kg, N, Pa, K, rad, m/s, rad/s, kg/m³. Angles are
radians; headings/tracks are normalized to [0, 2π), bank/pitch to (−π, π].
Field names carry their unit suffix (`_m`, `_mps`, `_rad`, `_pa`, `_k`, `_kg`).

Conversion boundaries (convert once, test round trips):

| Boundary | Where | Rule |
| --- | --- | --- |
| JSBSim English units (ft, ft/s, kt, deg, slug, lbf, psf, °R, in) | WASM bridge (C++), as in `bridge.cpp` | Nothing outside the bridge sees JSBSim units or property names |
| JSBSim structural frame (x aft, y right, z up, inches) | Aircraft package loader / bridge | Mass/CG exposed in body axes, metres, from the sourced datum (lower front face of firewall, [172S sources](../research/2026-11-01-c172s-fr172-sources.md)) |
| Display units (kt, ft, ft/min, hPa, inHg, °C, US gal, rpm) | `app/` presentation only | Instrument models output SI; dials/labels convert |
| External data (METAR/TAF, AIP, charts: deg, kt, ft, hPa, "wind from") | Scenario/briefing importer | Stored in the scenario package in SI with the original value and unit preserved for display |

Conversion constants are exact definitions or conventional values from
[NIST SP 811](https://www.nist.gov/pml/special-publication-811): ft = 0.3048 m,
NM = 1852 m, kt = 1852/3600 m/s, lb = 0.45359237 kg, lbf = 4.4482216152605 N,
inHg (conventional, 0 °C) = 3386.389 Pa, °R = 5/9 K. Standard sea-level pressure
101 325 Pa and the standard atmosphere come from ICAO Doc 7488 (edition to cite).

Frames and sign conventions:

| Frame | Definition |
| --- | --- |
| Geodetic | WGS-84 ellipsoid (NGA TR8350.2): `lat_rad` geodetic, `lon_rad` east-positive, `h_ell_m` above ellipsoid |
| ECEF | WGS-84 Earth-centered, Earth-fixed, metres; x through (0°, 0°), z north pole |
| Local NED | Tangent plane at the current geodetic position: x north (true), y east, z down. Authoritative velocity frame |
| Local ENU | Render/map boundary only (CesiumJS/three.js); never stored as sim state |
| Body | Origin at CG; x forward, y right wing, z down. Rates p, q, r right-handed about x, y, z |
| Euler | Z-Y-X (yaw ψ, pitch θ, roll φ) from NED to body; φ > 0 right wing down, θ > 0 nose up |
| Scenario/runway | Runway threshold point + true bearing, from the scenario's navigation snapshot |

Heights are distinct fields: `h_ell_m`, `h_msl_m` (needs a named geoid model;
**TBD**: JSBSim's `h-sl` datum versus EGM2008 must be established by fixture
U-6), `h_agl_m` (terrain model named in the scenario), `h_pressure_m` (pressure
altitude from static pressure, standard atmosphere). Field, threshold and airport
reference elevations stay separate scenario fields ([ARCH](../ARCH.md)).

Direction references: `heading_true_rad`, `track_true_rad` (from NED ground velocity)
are authoritative. Magnetic values are **derived**: `magvar_east_rad` (east
positive), `heading_mag = heading_true − magvar_east`. The scenario records the
model, coefficients file and epoch, and the decimal date used. Proposal: NOAA/NCEI
[World Magnetic Model](https://www.ncei.noaa.gov/products/world-magnetic-model)
WMM2025 (valid 2025–2030), evaluated once per scenario position update by the
environment module; charts/runways that publish their own variation keep that value
as a separate cited field. Compass/DG errors are instrument behavior (TBD-src).

Speeds are never a bare `speed`: `cas_mps` and `tas_mps` (dynamics, air-data),
`eas_mps` (derived), `gs_mps` (horizontal NED ground velocity), `vs_mps` (NED −vd,
positive up). **IAS is an instrument indication** (`ind.asi_ias_mps`) derived from
the pitot-static model and the POH airspeed calibration (**TBD-src**, S17 Section 5).
Wind is an NED vector of the air-mass velocity (blows *toward*); "from" directions
exist only at the briefing/display boundary.

Pressure references (R-SIM-3, R-AIR-3): altimeter state stores
`setting_pa` and `setting_ref ∈ {QNH, QFE, STD}` plus `setting_unit_display ∈
{hPa, inHg}`. STD means `setting_pa = 101325`. QFE requires the scenario's declared
QFE datum (aerodrome or threshold elevation, **TBD-src** per EDFE AIP). The 172S
altimeter scale units and setting range are **TBD-src** (S17 Section 7). A mode is
a recorded reference, not invented hardware: the knob sets a pressure only.

## 2. Time and step

- Fixed `dt` = **1/120 s**, stored as the rational `{num: 1, den: 120}` (E1 study;
  1/120 has no exact binary64 value). Changing dt is a new replay configuration.
- **The integer step index `step` is the authoritative clock.** `t_s = step · dt`
  is derived; JSBSim's accumulated `sim-time-sec` is diagnostic only.
- Pacing: step `n+1` is due at `t0 + (n+1)·dt` wall time; at most `max_catchup`
  steps (study: 12 = 100 ms) run per tick. A step is **missed** if it starts more
  than one step period after its due time; a deficit beyond `max_catchup` is
  **dropped** from the wall schedule: wall time slips, no integration step is
  skipped, so replay stays step-exact. Missed/dropped counts, max lag and max batch
  are reported in `stats` and shown to the learner when non-zero (STYLE: overload
  visible). Real-time factor < 1 is a visible state, never a changed dt.
- Pause: no steps run; `step` is frozen; inputs received during pause are stamped
  for the next step to run (§3). Resume rebases `t0` without a catch-up burst.
- Reset: ends the current recording; a new run starts at `step = 0` from the
  scenario initial conditions with a new `run_id`. Review seek re-simulates from
  step 0 (JSBSim full-state snapshot/restore is unproven; open question O-5).

**State stream and display rate (decision proposal, 2026-11-01 evidence).** On
the reference Mac (WebGL reports Apple M1 Pro; 120 Hz display) three.js rendered
120 fps while the worker streamed state at 60 Hz, so every second frame repeated a
step. The display refresh rate is **measured per run** and recorded; 60 Hz is
never assumed. Options:

| Option | Behavior | Cost/risk |
| --- | --- | --- |
| A. Configurable `state_hz` (e.g. 120 to match a 120 Hz panel, ≤ 1/dt) | Each frame can show a fresh step | Doubles `postMessage` traffic; frames still alias against step timing; no help when the display exceeds 1/dt |
| B. Render-side interpolation between the two latest states | Smooth at any refresh; `state_hz` can stay 60 | Adds up to one state period of display latency; attitude needs quaternion slerp, position geodetic-aware lerp |

Proposal: **support both, default B with `state_hz` 60**, keep A selectable and
measure input-to-photon latency for both in E1/E5 before fixing the default.
Hard rule for either: interpolated or extrapolated values are **presentation
only**; they never feed back into simulation state, instrument models, training
assessment, digests or replay files, and every displayed frame records which
`step` pair it was derived from when tracing is on.

## 3. Input schema

Inputs are **device-independent normalized controls**, produced at one boundary
(the input module in `app/`) from device profiles. The simulation sees only this
schema. Pilot-sense conventions (product), mapped to JSBSim signs in the bridge:

| Field | Range | Positive means | Kind |
| --- | --- | --- | --- |
| `pitch` | [−1, 1] | yoke aft (nose-up command) | continuous |
| `roll` | [−1, 1] | yoke right (right wing down) | continuous |
| `yaw` | [−1, 1] | right rudder pedal forward | continuous; also nose-wheel steering where modeled (TBD-src) |
| `brake_left`, `brake_right` | [0, 1] | toe brake applied | continuous |
| `parking_brake` | {0, 1} | set | discrete |
| `throttle` | [0, 1] | full forward | continuous |
| `mixture` | [0, 1] | full rich | continuous; idle-cutoff position TBD-src |
| `pitch_trim` | [−1, 1] | nose-up trim | continuous; wheel travel/rate TBD-src |
| `flaps_detent` | index | larger index = more flap | discrete; travel 0–30° sourced (S5 §2 C.21); **detent set and positions TBD-src** (S17) |
| `ignition` | {OFF, R, L, BOTH, START} | key position | discrete; positions TBD-src (S17 Section 7) |
| `master_bat`, `master_alt` | {0, 1} | on | discrete; split-switch arrangement TBD-src |
| `fuel_selector` | enum | — | discrete; positions TBD-src |
| `fuel_shutoff` | {0, 1} | open | discrete; TBD-src |
| `aux_fuel_pump` | {0, 1} | on | discrete; TBD-src |
| `altimeter_setting_pa` | finite, bounded | — | discrete instrument knob; range TBD-src |

Not listed: **carburettor heat** — the IO-360-L2A is a fuel-injected engine, so no
carb-heat control is expected; confirm in S17 Section 7 before closing. Radios,
lights, avionics and the KAP 140 option are outside the first circuit contract
until the avionics fit is decided (GAPS Q3). The JSBSim sign mapping is **not**
assumed: the E1 study's climb used a negative `elevator-cmd-norm`, which suggests
JSBSim's sign is opposite to `pitch`; fixture U-4 must confirm each axis.

Input event (one per change, partial fields allowed; unspecified fields hold their
last value):
`{v: "1.0", seq, step, applied_step, wall_ms, source, controls: {…}, assists?: {…}}`

- `seq` is a strictly increasing integer per run; `source` is the profile id
  (`keyboard`, `pointer`, `gamepad:<id>`, `iphone`, `script`).
- **Application rule (v0.1 adopted):** an event targeting `step: s` applies
  immediately before the integration from `s` to `s+1` and first appears in state
  `s+1`. If the worker has already passed `s`, it applies before the next step and
  is counted late. Ties at one step resolve by `seq`; later fields win.
- The worker writes `applied_step` into the **input log**; replay uses only
  `applied_step` and `seq`, never `wall_ms` (latency metadata only).
- Non-finite or out-of-range values are rejected with an `error`, not clamped.

Device profiles (keyboard/touchpad, yoke/pedals, paired iPhone per R-INPUT-3)
own calibration, dead zone, sensitivity/exponential, inversion and key repeat.
Coordination assists (roll→yaw mixing) are applied at the same boundary, logged
as the resulting controls, and their settings are recorded in the run metadata
(R-FID-2). Raw device samples, including iPhone orientation, are not logged by
default ([SEC](../SEC.md)). Device loss produces an explicit `source_lost` event
and the fallback profile's next value; no silent hold of a stale axis.

## 4. State schema

Every snapshot: `{v: "1.0", run_id, step, sim: {…}, ind?: {…}, teach?: {…}}`.
Three layers, separately owned (AGENTS design rules):

| Layer | Owner | Authoritative? | Content |
| --- | --- | --- | --- |
| `sim` | `packages/simulation/` (code1) | Yes; enters digests | Fields below |
| `ind` | `packages/avionics/` (code2) | Derived from `sim` + instrument state at the same step | ASI IAS, altimeter indication, VSI, attitude/heading indicators, DG/compass, tachometer, engine/fuel gauges; instrument set TBD-src (S17 Section 7) |
| `teach` | `packages/training/` (code2) | No; never read by `sim` or `ind` | Exercise phase, criteria status, annotations, assist labels, debrief markers |

`sim` fields (all SI, frames per §1): `lat_rad`, `lon_rad`, `h_ell_m`,
`h_msl_m`, `h_agl_m`; `phi_rad`, `theta_rad`, `psi_true_rad`; NED velocity
`vn_mps, ve_mps, vd_mps`; body velocity `u_mps, v_mps, w_mps`; body rates
`p_radps, q_radps, r_radps`; body accelerations and specific force (for
instruments and fixtures); `alpha_rad`, `beta_rad`, `cas_mps`, `tas_mps`;
air data at the aircraft `p_static_pa`, `t_static_k`, `rho_kgpm3`, wind NED;
mass `mass_kg`, CG body position `cg_m`, fuel per tank `kg`; engine `rpm` stored
as `prop_radps`, plus the JSBSim-modelled engine values that the instrument set
needs (TBD-src); control positions as **applied commands** (normalized) and
**surface positions** (`elevator_rad`, `aileron_l/r_rad`, `rudder_rad`,
`flap_rad`, `trim_tab_rad`); gear contact/weight-on-wheels per gear; `flags`
(out-of-envelope, trim failure, non-finite guard, R-SIM-6). Magnetic variation and
the altimeter setting are environment/instrument state, carried in `env` and
`ind` respectively, and recorded in replay.

The worker stream sends a subset (`sim.core`) at `state_hz`; full snapshots are
available on request and at checkpoints. Non-finite state stops the run with an
`error` naming field and step.

## 5. Replay metadata (R-SIM-4, R-REVIEW-1)

A replay record is a declarative package (validated on import, [SEC](../SEC.md)):

| Section | Contents |
| --- | --- |
| `contract` | `contract_version` (this document), `digest_layout` version |
| `build` | JSBSim tag + commit, emsdk/emcc version, compile/link flags, bridge source revision (Gefly commit), `wasm_sha256`, `wasm_bytes` |
| `aircraft` | Model id (e.g. `c172s-classic-9491-9809`), package version and sha256, source manifest reference (R-AIR-1), fidelity/limitations labels |
| `ic` | Initial position/attitude/velocity in §1 frames, configuration (flaps, trim, fuel, mass), trim request and result (`status`, values) |
| `seed` | `simulation/randomseed` value set **before** `RunIC` and read back; project PRNG algorithm + seed (proposal: one named PRNG in the worker; none in render/UI) |
| `env` | Atmosphere model, QNH/temperature, wind/turbulence settings, magnetic model/epoch/date, terrain/geoid model ids |
| `scenario` | Scenario/briefing package id, version, sha256; navigation edition; weather/NOTAM snapshot hashes (R-BRIEF-1) |
| `run` | `run_id`, dt rational, `max_catchup`, assists/fidelity settings, device profiles used, measured display refresh, browser UA (informational) |
| `inputs` | Ordered input log (§3) with `applied_step` |
| `digests` | Checkpoints and final digest (below) |
| `trace?` | Optional downsampled `sim`/`ind` trace for viewing without re-simulation; labeled "recorded trace, not re-simulated" |

Digest definition (`digest_layout` 1, proposal): the canonical byte layout is the
schema-ordered `sim` fields as IEEE-754 binary64 little-endian. Per-step rolling
**FNV-1a 64** over that layout detects divergence cheaply (as in the study);
**checkpoints** every 120 steps store `SHA-256(prev ‖ step ‖ layout bytes)` to
localize divergence and protect integrity. Any change to fields, order or units is
a new `digest_layout`.

Cross-build policy: re-simulation comparison **requires** identical `wasm_sha256`,
aircraft package hash, scenario hash, seed, dt and input log. Same-build results
across platforms were observed identical (same digest on Intel Xeon/Linux and
Apple M1/macOS, Chrome; E1 browser M1 results) but are **not guaranteed**; a
cross-platform fixture (R-7) checks each released build. Native vs WASM digests
differ (E1 JSBSim study). A mismatching build opens the record in trace-only mode
or reports "not comparable"; cross-build tolerance comparison follows EVAL and is
never called bitwise deterministic.

## 6. Independent reference fixtures

Fixture values come from cited sources or analytic results; authors of a fixture
are not the implementers of the code under test (quality/validate or an assigned
non-implementing coder; researcher proposes sourced values; orchestrator assigns).
Tolerances are fixed before execution (R-EVAL-1).

| ID | Category | Value source | Owner (proposal) |
| --- | --- | --- | --- |
| U-1 | Unit conversions and round trips (ft, kt, NM, lb, lbf, inHg, °R) | NIST SP 811 exact/conventional factors | quality |
| U-2 | Geodetic ↔ ECEF ↔ NED | WGS-84 (NGA TR8350.2); published test data, e.g. GeographicLib test sets | code2 (tests code1) |
| U-3 | Euler/body sign conventions | Analytic rotations | code2 |
| U-4 | Control direction: each normalized axis → JSBSim command → surface sign/rate response | Analytic sign expectation; travel limits from S5 §2 C.21 | validate |
| U-5 | Magnetic variation | WMM2025 report test values | code1 (tests env module) |
| U-6 | Height datums (ellipsoid/MSL/AGL) and JSBSim `h-sl` meaning | WGS-84 + named geoid model values | researcher → quality |
| U-7 | Pressure altitude, QNH/QFE/STD indication | ICAO standard atmosphere; EDFE elevation TBD-src | validate (R-AIR-3) |
| S-1 | Static/no-force: at rest on ground, brakes set, no wind | Analytic: zero velocity/drift within E1 F3 budget; specific force = −g | quality |
| S-2 | Known accelerations: specified force/moment input | Analytic (F = m a, M = I α) with model mass/inertia | quality |
| T-1 | 172S trim/steady cases (cruise, climb, stall reference) | **TBD-src**: POH S17 cited conditions; holdout cases kept apart (E2) | product + researcher |
| R-1 | Same-build replay: two runs, reset-and-rerun, fresh worker | Self-consistency; digests identical | validate |
| R-2 | Input timing: on-time vs late events, ties by `seq`, pause/resume | Contract §3 rule | quality |
| R-3 | Render-rate independence (R-SIM-2): same input log at 30/60/120 Hz render and both stream options | Digests identical; no render data in digests | validate |
| R-4 | Overload: forced missed/dropped steps leave the trajectory step-identical | Contract §2 | quality |
| R-5 | Non-finite/out-of-range input and state rejection (R-SIM-6, SEC) | Contract §3/§4 | quality |
| R-6 | Ten-minute numerical-boundedness suite (R-SIM-6) | Contract §4 flags | validate |
| R-7 | Cross-platform same-build digest (Xeon/Linux headless vs M1/Chrome) | Observation, reported not required | validate |

## 7. Versioning and transport

- `contract_version` is semantic: **major** for any change of meaning, unit, frame,
  sign or digest layout; **minor** for additive optional fields; **patch** for
  documentation. Every message and replay record carries `v`. Readers reject an
  unknown major and ignore unknown optional fields of a known major.
- A replay record is valid only with the same contract major and `digest_layout`.
- `ready` reports `contract_version`; the main thread refuses a mismatched worker.

v0.1 → v1 worker messages:

| v0.1 (study) | v1 (product) | Change |
| --- | --- | --- |
| `init {dt_s, aircraft: "c172x", ic, state_hz}` | `init {v, dt: {num, den}, aircraft: {id, sha256}, ic, env, seed, scenario, state_hz}` | Rational dt; aircraft package hash; seed and environment explicit |
| implicit trim in `init`, `ready.trim` | `ic.trim` request; `ready.trim {status, values}` | Trim requested, not implicit |
| `input {step, wall_ms, elevator, aileron, rudder, throttle}` | `input {v, seq, step, wall_ms, source, controls, assists?}` | Pilot-sense names; partial fields; discrete controls; `seq` |
| application rule (v0.1 text) | unchanged; worker logs `applied_step` | Log carries applied step |
| `run {until_step?}`, `pause`, `stop` | `run`, `pause`, `reset`, `stop` | `until_step` test-only; `reset` added |
| `ready.build {jsbsim_tag, jsbsim_commit, emsdk, wasm_bytes, wasm_sha256, flags}` | same + `contract_version`, bridge revision | — |
| `state {step, t_s, lat_rad, lon_rad, alt_msl_m, roll_rad, pitch_rad, heading_rad, tas_mps, …}` | `state {v, run_id, step, sim.core, ind?}` | `alt_msl_m` → explicit height fields; `heading_rad` → `psi_true_rad`; `t_s` derived |
| `stats` (benchmark) | `stats {missed, dropped, max_lag, max_batch, late_inputs, digest, checkpoint}` | Product overload reporting |
| `burst`, `stats.step_cost_us` array | test harness only | Not product |
| `error {message}` | `error {v, code, field?, step?, message}` | Machine-readable code |

## 8. Open questions for the orchestrator

- O-1 Default state streaming: interpolation (B) with 60 Hz vs `state_hz` matching
  the display (A) — decide after E1/E5 latency measurement (§2).
- O-2 Magnetic model: adopt WMM2025 (proposal) or IGRF; per-scenario fixed
  variation acceptable for the first circuit?
- O-3 Geoid/MSL model and JSBSim `h-sl` datum; terrain model for AGL (E6, U-6).
- O-4 Digest scheme: FNV-1a 64 per step + SHA-256 checkpoints every 120 steps.
- O-5 Review seek: always re-simulate from step 0, or invest in verified
  JSBSim state snapshot/restore for checkpoints?
- O-6 Store an optional downsampled trace in replay records (size/privacy)?
- O-7 Exact 172S control list and detents (flaps, ignition, master, fuel,
  mixture cut-off, trim) need S17 Section 7 extraction by researcher (Q3 avionics fit).
- O-8 Does the first exercise include engine start/taxi (GAPS Q7)? It decides
  whether ignition/fuel/master controls are in v1.0 or a minor addition.
- O-9 Is the paired-iPhone profile (R-INPUT-3) in v1.0 or the 1.13 minor version?

## 9. Proposed SPEC acceptance edits (not applied)

R-SIM-3, replace the acceptance text with:

> Shared contracts (CONTRACTS, linked from SPEC as `design/CONTRACTS.md`) declare SI internal units,
> WGS-84/ECEF/NED/body frames, Euler and control sign conventions, distinct
> IAS/CAS/TAS/ground speed, true heading with a recorded magnetic-variation model
> and epoch, distinct height references and the altimeter pressure reference
> (QNH/QFE/standard). Boundary tests cover unit conversion, control direction,
> frame transformations and magnetic variation against sourced reference values.
> Engine units are converted only at the engine bridge and display units only at
> presentation boundaries.

R-SIM-4, replace the acceptance text with:

> Same build (identical WASM hash), aircraft package, scenario package, recorded
> seed, fixed time step and input log with applied step indices yield identical
> checkpoint and final state digests, including after reset. The replay record
> holds the build, aircraft, scenario, environment, seed and assist metadata
> defined in the shared contracts. Same-build results on different platforms are
> checked and reported, not guaranteed; cross-build comparison uses an explicitly
> documented tolerance and is not called bitwise deterministic. Render rate and
> presentation interpolation do not affect digests.
