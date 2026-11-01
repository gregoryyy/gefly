# Shared simulation contracts v1

Status: **agreed v1 (+ v1.1 proposals).** v1 design choices decided by the user
(GAPS Q18, 2026-11-01 13:00; §8); §10 holds the v1.1 additive proposals revised
after the TODO 1.6 review (2026-11-01), not yet agreed. Shared contracts
for parallel coding (R-SIM-2..6, R-INPUT-1..3, R-REVIEW-1, R-BRIEF-1, R-REUSE-1).
[SPEC](../SPEC.md) owns requirement text; the study contract v0/v0.1 in
[E1 browser](../../studies/e1-browser/README.md) is evidence, not authority. Engine:
JSBSim v1.3.3 as a replaceable WASM library (Q17); aircraft: classic-panel 172S
9491–9809 (Q3); code in `packages/contracts/` ([ARCH](../ARCH.md)), one writer per
change, integrated by the orchestrator.

Marking: **TBD-src** = value or behavior needs a cited source before use; no number
may be filled in from memory, another C172 variant or AI output (R-DATA-2).
**Proposal** = product choice not yet decided. **Later** = outside contract v1.0.

Reference-Mac evidence: `studies/e1-browser/README.md`, "Results on the reference
M1/Chrome" (merged, PR #9); one user-run session, preliminary. Hardware attribution
(MacBook Pro 14", reported Apple M1 Pro, 120 Hz) follows GAPS Q16.

## 1. Units and frames

**Internal units are SI**: m, s, kg, N, Pa, K, rad, m/s, rad/s, kg/m³. Angles are
radians. Heading/track ψ ∈ [0, 2π); pitch θ ∈ [−π/2, π/2]; roll φ ∈ (−π, π].
Field names carry their unit suffix (`_m`, `_mps`, `_rad`, `_pa`, `_k`, `_kg`).

Conversion boundaries (convert once, test round trips):

| Boundary | Where | Rule |
| --- | --- | --- |
| JSBSim English units (ft, ft/s, kt, deg, slug, lbf, psf, °R, in) | WASM bridge (C++), as in `bridge.cpp` | Nothing outside the bridge sees JSBSim units or property names |
| Aircraft structural/station frame | Aircraft package loader / bridge | See *structural frame* below |
| Display units (kt, ft, ft/min, hPa, inHg, °C, US gal, rpm) | `app/` presentation only | Instrument models output SI; dials/labels convert |
| External data (METAR/TAF, AIP, charts: deg, kt, ft, hPa, "wind from") | Scenario/briefing importer | Stored in the scenario package in SI, with original value and unit kept for display |

Conversion constants are exact definitions or conventional values from
[NIST SP 811](https://www.nist.gov/pml/special-publication-811): ft = 0.3048 m,
NM = 1852 m, kt = 1852/3600 m/s, lb = 0.45359237 kg, lbf = 4.4482216152605 N,
inHg (conventional, 0 °C) = 3386.389 Pa, °R = 5/9 K. Standard sea-level pressure
101 325 Pa and the standard atmosphere come from ICAO Doc 7488 (edition to cite).

Frames and sign conventions:

| Frame | Definition |
| --- | --- |
| Geodetic | WGS-84 ellipsoid (NGA TR8350.2): `lat_rad` **geodetic** (never geocentric), `lon_rad` east-positive; heights per *Heights* below |
| ECEF | WGS-84 Earth-centered, Earth-fixed, metres; x through (0°, 0°), z north pole |
| Local NED | Tangent plane at the current geodetic position: x north (true), y east, z down. Authoritative velocity frame |
| Local ENU | Render/map boundary only (CesiumJS/three.js); never stored as sim state |
| Body | Origin at the current CG; x forward, y right wing, z down. Rates p, q, r right-handed about x, y, z |
| Euler | Z-Y-X (ψ, θ, φ) from NED to body; φ > 0 right wing down, θ > 0 nose up |
| Structural | Origin at the sourced datum (lower front face of firewall, [172S sources](../research/2026-11-01-c172s-fr172-sources.md), S1b/S5); x aft, y right, z up, metres (TCDS station convention, as JSBSim's structural frame). **CG and mass items are expressed here**, never relative to the body origin |
| Scenario/runway | Runway threshold point + true bearing, from the scenario's navigation snapshot |

**Heights.** Finding ([datum/controls note](../research/2026-11-01-jsbsim-datum-172s-controls.md), Part A): JSBSim v1.3.3 has **no geoid**; `h-sl`,
`geod-alt`, terrain elevation and AGL all refer to the WGS-84 ellipsoid (radial vs
normal direction differ by millimetres), and the atmosphere is evaluated at
`h-sl`. Feeding true ellipsoidal heights would evaluate the atmosphere about 48 m
too high near EDFE, conflicting with QNH/QFE realism.

**Height convention (orchestrator proposal from the researcher's recommendation;
user-confirmed (GAPS Q18, 2026-11-01 13:59)):** JSBSim runs on **physical heights treated as its
ellipsoid height** (DHHN2016 normal heights in Germany, EGM2008 orthometric
heights elsewhere).

- `h_msl_m` = JSBSim `position/geod-alt-ft` × 0.3048 (physical height).
- `h_agl_m` from a **terrain ground callback in C++ inside the WASM bridge** that
  serves DGM1 (Hessen) heights **unchanged** (already DHHN2016), so terrain, field
  elevations and atmosphere share one datum. The callback is a pure function of
  location with tiles loaded before stepping (no asynchronous fetch in a step).
- `h_ell_m = h_msl_m + ζ(lat, lon)`, computed **outside the dynamics** (in the
  worker's JS, every step; `ind` digest group, §4, §10.2) and never fed back: **GCG2016**
  quasigeoid inside Germany (BKG, CC BY 4.0 per PROJ-data, attribution required),
  **EGM2008** elsewhere and outside GCG2016 coverage (NGA, public domain). Model
  ids and grid hashes are recorded in `env`. Renderers (CesiumJS) receive `h_ell_m`.
- Initial position: `ic/lat-geod-rad`, `ic/long-gc-rad`, then `ic/h-sl-ft` from
  `h_msl_m` (this order keeps the geodetic latitude); geodetic latitude only
  (`type="geod"` in an `<initialize>` file; JSBSim's XML default is geocentric,
  0.19° ≈ 21 km off at 50° N). Read-back via `geod-alt` within U-6 tolerance. The bridge **never writes `position/h-sl-ft` at
  run time** (it shifts geodetic latitude).
- `h_pressure_m` is pressure altitude from static pressure (standard atmosphere).

Coverage: DGM1 covers **Hessen only**; terrain for the rest of the 100 NM region
(Rhineland-Palatinate, Bavaria, Baden-Württemberg etc.) is **TBD-src**. Switching
from GCG2016 to EGM2008 at the German border makes `h_ell_m` step by up to
≈ 0.26 m (note, Part A); rendering must tolerate it. Still open: WGS-84 vs ETRS89
horizontal offset (≈ 1 m, not computed) and the vertical reference of German AIP
elevations (**TBD-src**). DGM1 rights follow SBOM/R-DATA-1. Field, threshold and airport reference elevations remain separate
scenario fields ([ARCH](../ARCH.md)).

Direction references: `heading_true_rad` and `track_true_rad` (from NED ground
velocity) are authoritative. Magnetic values are **derived**: `magvar_east_rad`
(east positive), `heading_mag = heading_true − magvar_east`. The magnetic model is
NOAA/NCEI [World Magnetic Model](https://www.ncei.noaa.gov/products/world-magnetic-model)
**WMM2025** (GAPS Q18); the scenario records model, coefficient file hash, epoch
and the decimal date used. Charts/runways that publish their own variation keep it
as a separate cited field. Compass/DG errors are instrument behavior (TBD-src).

Speeds are never a bare `speed`: `cas_mps` and `tas_mps` (dynamics air data),
`eas_mps` (derived), `gs_mps` (horizontal NED ground velocity), `vs_mps` (−vd,
positive up). **IAS is an instrument indication** (`ind.asi_ias_mps`) from a
pitot-static instrument model (**TBD-src**, S17 Section 7). The POH airspeed
calibration points (S17 Fig. 5-1, p. 5-9) are sourced in
[poh-values.json](../../data/aircraft/c172s-classic/poh-values.json); the
evaluator-only assessment mapping `cal_ias_mps`/`cal_ias_valid` derived from them is
frozen in [Assessment airspeed](ASSESSMENT-AIRSPEED.md) and implemented in
`packages/training/assessment-airspeed.ts` (adapter `airspeed-calibration.ts`,
types `packages/contracts/assessment-airspeed.ts`; PR #29). It is not an instrument
model and is outside `ind` (SCENARIO-CONTRACTS C4).
Wind is an NED vector of air-mass velocity (blows *toward*); "from" directions
exist only at the briefing/display boundary.

Pressure references (R-SIM-3, R-AIR-3): altimeter state stores `setting_pa` and
`setting_ref ∈ {QNH, QFE, STD}`; `setting_ref` is derived, not an input (§10.1).
The display unit (hPa/inHg) is a presentation preference in `app/`, recorded in run
metadata, never instrument state or digest content; the installed instrument's
subscale unit is an aircraft configuration fact (GAPS Q3). STD
means `setting_pa = 101325`. QFE requires the scenario's declared QFE datum
(aerodrome or threshold elevation, **TBD-src**, EDFE AIP). The 172S altimeter scale
units and setting range are **TBD-src** (not stated in S17 p. 7-43; depends on
the installed instrument and US/EU configuration, GAPS Q3). The reference is a
recorded label; the knob only sets a pressure (no invented mode switch).

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
- Pause: no steps run; `step` is frozen. Inputs received while paused are stamped
  for the next step to run and are **not counted late** (§3). Resume rebases `t0`
  without a catch-up burst.
- Reset: ends the current recording; a new run starts at `step = 0` from the
  scenario initial conditions with a new `run_id`, re-applying every seed (§5).
- Review seek **re-simulates from step 0** (GAPS Q18). JSBSim state
  snapshot/restore is considered only if measured seek time is too slow; it would
  then need its own equality fixture against re-simulation.

**State stream and display (decided, GAPS Q18).** On the reference Mac (E1
evidence, 120 Hz display) three.js rendered at 120 fps while the worker streamed
state at 60 Hz, so every second frame repeated a step. Decision: the worker streams
at **`state_hz` = 60**; the renderer **interpolates between the two latest states
for display only** (attitude by quaternion slerp, position geodetic-aware). The
display refresh rate is **measured and recorded per run**, never assumed 60 Hz.
Interpolated or extrapolated values never feed back into simulation state,
instrument models, training assessment, digests or replay files; with tracing on,
each frame records the step pair and interpolation fraction it displayed.
Input-to-photon latency including the interpolation delay is measured in E1/E5.

## 3. Input schema

Inputs are **device-independent normalized controls**, produced at one boundary
(the input module in `app/`) from device profiles. The simulation sees only this
schema. Pilot-sense conventions (product), mapped to JSBSim signs in the bridge.
Contract v1.0 covers the first exercise, which **starts at the runway holding
point with the engine running** (GAPS Q18): no engine start or taxi from parking.

Control facts below are cited by page from POH/AFM 172SPHUS Rev 5 (S17) as
extracted in the [datum/controls note](../research/2026-11-01-jsbsim-datum-172s-controls.md), Part B (cite, not copy; GAPS Q18 O-7).

| Field | Range | Positive / meaning | Kind / source / status |
| --- | --- | --- | --- |
| `pitch` | [−1, 1] | control wheel aft (nose-up command) | continuous; cable/linkage (p. 7-6); elevator up 28°/down 23° (S5 §2 C.21) |
| `roll` | [−1, 1] | control wheel right (right wing down) | continuous; ailerons up 20°/down 15° (S5) |
| `yaw` | [−1, 1] | right rudder pedal forward | continuous; rudder 16°10′ each way (S5); nose-wheel steering via pedals, spring bungee ≈ 10° each side, up to 30° with differential braking (p. 7-12); bungee force law **TBD-src** |
| `brake_left`, `brake_right` | [0, 1] | toe brake applied | continuous; hydraulic disc per main wheel, pilot/copilot pedals interconnected (p. 7-29) |
| `parking_brake` | {0, 1} | set | discrete; handle under left panel, set with pedals applied (p. 7-29) |
| `throttle` | [0, 1] | full forward = open | continuous; push-pull with friction lock (p. 7-19); travel **TBD-src** |
| `mixture` | [0, 1] | 1 = full rich, 0 = idle cutoff (full aft) | continuous, no intermediate detents stated (p. 7-19) |
| `pitch_trim` | [−1, 1] | wheel aft = nose-up trim | continuous; manual wheel on pedestal with indicator (p. 7-6, p. 7-12); travel, turns and take-off mark **TBD-src**; electric trim only if installed (not modeled) |
| `flaps_detent` | {0, 1, 2, 3} | 0°, 10°, 20°, 30° | discrete; electric, slotted-panel lever with stops at 10°/20°/30° (p. 7-13; S5 travel 0–30°); extension/retraction time and lever behaviour (spring-return vs follow-up) **TBD-src** |
| `ignition` | {OFF, R, L, BOTH, START} | rotary key, clockwise | discrete (p. 7-22); START spring-returns to BOTH; **START use is Later** (O-8) |
| `master_bat`, `master_alt` | {0, 1} | up = ON | discrete; split rocker, right half BAT, left half ALT (p. 7-33) |
| `avionics_master_1`, `avionics_master_2` | {0, 1} | up = ON | discrete; split rocker, one section per avionics bus, from s/n 172S8704 (p. 7-34); **optional/Later** for R-AIR-2 tests in v1.0 |
| `fuel_selector` | {LEFT, BOTH, RIGHT} | — | discrete; no OFF position (p. 7-24, p. 7-26) |
| `fuel_shutoff` | {ON, OFF} | ON = pushed in | discrete (p. 7-12, Fig. 7-6) |
| `aux_fuel_pump` | {0, 1} | on | discrete; FUEL PUMP switch, off for normal take-off (p. 4-12, Fig. 7-7A) |
| `pitot_heat` | {0, 1} | on | discrete (p. 7-41); effect requires an icing model, otherwise labeled unsupported; **optional/Later** for R-AIR-2 tests in v1.0 |
| `alt_static` | {0, 1} | 1 = pulled on (cabin static) | discrete (p. 7-41); static-error effect **TBD-src**; **optional/Later** for R-AIR-2 tests in v1.0 |
| `lights` | set of {BCN, LAND, TAXI, NAV, STROBE} | on | discrete (p. 7-37, Fig. 7-7A); panel order **TBD-src**; visual effect only; **optional/Later** for R-AIR-2 tests in v1.0 |
| `xpdr_mode` | {OFF, SBY, TST, ON, ALT} | — | discrete; KT 76C (p. 7-46, Sect. 9 Suppl. 2); detent order **TBD-src**; no ATC effect in v1.0 (labeled); **optional/Later** for R-AIR-2 tests in v1.0 |
| `altimeter_setting_pa` | finite, bounded | — | discrete instrument knob (p. 7-43); range/units **TBD-src** |
| starter cranking, priming, taxi from parking | — | — | **Later** (engine start/taxi, GAPS Q18 O-8) |

The holding-point initial state implied by the before-take-off checklist (p. 4-15,
cited not copied): engine running, master and avionics on, fuel selector BOTH,
shutoff ON, fuel pump OFF, ignition BOTH, mixture rich, trim and flaps for
take-off (0°–10°); parking brake per scenario. **Carburettor heat is absent**: the
engine is fuel injected (S17 p. 1-4) with an automatic alternate air door
(p. 7-22) and no carb-heat control in the panel list (Fig. 7-2). Radios (KX 155A,
KMA 26) and optional ADF/GPS/KAP 140 stay outside v1.0 until the avionics fit is
decided (GAPS Q3); S17 is Rev 5 (2004) and later applicable revisions are unchecked.

The JSBSim sign mapping is **not** assumed: in the native
[E1 JSBSim study](../../studies/e1-jsbsim/README.md) fixture F2 the climb used an
elevator command of −0.05 from trim, which suggests JSBSim's elevator sign is
opposite to `pitch`; fixture U-4 must confirm every axis.

Input event (one per change, partial fields allowed; unspecified fields hold their
last value):
`{v: "1.0.0", seq, step, applied_step, wall_ms, source, controls: {…}, assists?: {…}}`

- `seq` is a strictly increasing integer per run (v1); the v1.1 proposal §10.3 has
  the worker assign it on acceptance; `source` is the profile id (`keyboard`, `pointer`,
  `gamepad:<id>`, `script`, `fallback` (v1.1: automatic device-loss handling at the
  input boundary, §10.4); `iphone` is Later, TODO 1.13).
- **Application rule (v0.1 adopted):** an event targeting `step: s` applies
  immediately before the integration from `s` to `s+1` and first appears in state
  `s+1`. If the worker has already passed `s` while running, it applies before the
  next step and is counted late. Ties at one step resolve by `seq`; later fields win.
- The worker writes `applied_step` into the **input log**; replay uses only
  `applied_step` and `seq`, never `wall_ms` (latency metadata only).
- Non-finite or out-of-range values are rejected with an `error`, not clamped.

Device profiles (keyboard/touchpad, optional yoke/pedals) own calibration, dead
zone, sensitivity/exponential, inversion and key repeat. The paired-iPhone profile
(R-INPUT-3) stays in TODO 1.13 and enters later through this same boundary
(GAPS Q18). Coordination assists (roll→yaw mixing) are applied at the boundary,
logged as the resulting controls, and their settings are recorded in the run
metadata (R-FID-2). Raw device samples are not logged ([SEC](../SEC.md)). Device
loss produces an explicit `source_lost` event and the fallback profile's next
value; no silent hold of a stale axis (v1.1 clarification for a bounded, visible,
logged hold: §10.4).

## 4. State schema

Every snapshot: `{v: "1.0.0", run_id, step, sim: {…}, env: {…}, ind?: {…}, teach?: {…}}`.
Four layers, separately owned (AGENTS design rules):

| Layer | Owner | Authority | Digest group |
| --- | --- | --- | --- |
| `sim` | `packages/simulation/` (code1) | Authoritative dynamics state, **computed inside WASM** | `sim` |
| `env` | `packages/simulation/` env module (code1) | Environment at the aircraft; WASM-computed fields authoritative | `sim` (WASM fields); `ind` (JS fields) |
| `ind` | `packages/avionics/` (code2), **run inside the worker every step** (§10.2) | Derived from `sim`/`env` + instrument state at the same step | `ind` |
| `teach` | `packages/training/` (code2) | Annotations only; never read by `sim`, `env` or `ind` | none |

**Digest rule:** only values produced inside WASM enter the `sim` digest group.
Every value computed in JavaScript — `magvar_east_rad`, `zeta_m`, `h_ell_m` and the
JS-computed `ind` fields — enters the `ind` group; WASM-computed instrument values
may also be declared in `ind` (§10.2).

`sim` fields (SI, frames per §1): `lat_rad`, `lon_rad` (geodetic), `h_msl_m`
(JSBSim-native physical height), `h_agl_m` (terrain callback); `phi_rad`, `theta_rad`, `heading_true_rad`; NED velocity `vn_mps, ve_mps,
vd_mps`; body velocity `u_mps, v_mps, w_mps`; body rates `p_radps, q_radps,
r_radps`; body accelerations and specific force; `alpha_rad`, `beta_rad`,
`cas_mps`, `tas_mps`; mass `mass_kg`, CG position `cg_struct_m` (structural frame,
§1), fuel per tank `kg`; engine `prop_radps` plus the engine values the instrument
set needs (TBD-src); control positions as **applied commands** (normalized) and
**surface positions** (`elevator_rad`, `aileron_l/r_rad`, `rudder_rad`,
`flap_rad`, `trim_tab_rad`); weight-on-wheels `wow_nose`, `wow_main_l`,
`wow_main_r` (SCENARIO-CONTRACTS C2); `flags` (out-of-envelope,
trim failure, non-finite guard; R-SIM-6).

`env` fields: static pressure `p_static_pa`, temperature `t_static_k`, density
`rho_kgpm3`, sea-level reference pressure/temperature of the atmosphere model,
wind NED vector, turbulence model/intensity setting, terrain elevation below the
aircraft (DGM1 tile id and hash); JS-computed (`ind` group): `magvar_east_rad`
(WMM2025, with model id and decimal date), `zeta_m`, `h_ell_m` with
geoid/quasigeoid model id (GCG2016 or EGM2008) and grid hash.

`ind` (instrument indications): ASI IAS, altimeter indication with setting and
reference, VSI, attitude indicator, heading indicator/compass, tachometer,
engine/fuel gauges. The 172S classic instrument set is TBD-src (S17 Section 7);
the declared field list and its blocking open item are in SCENARIO-CONTRACTS §4.
`ind` gets its **own digest** so instrument divergence is detectable during review
(R-REVIEW-1). Because `ind` is computed in JavaScript, whose `Math` functions are
not specified bit-exactly across engines, the `ind` digest is comparable only on the
same browser engine and version.

The worker stream sends a subset (`sim_core`, §10.2) at 60 Hz; full snapshots are
available on request and at checkpoints. Non-finite state stops the run with an
`error` naming field and step.

## 5. Replay metadata (R-SIM-4, R-REVIEW-1)

A replay record is a declarative package (validated on import, [SEC](../SEC.md)):

| Section | Contents |
| --- | --- |
| `contract` | `contract_version` (semver, e.g. `1.0.0`), `digest_layout` version |
| `build` | JSBSim tag + commit, emsdk/emcc version, compile/link flags, bridge source revision (Gefly commit), `wasm_sha256`, `wasm_bytes`, **`js_bundle_sha256`** (worker, glue and simulation/avionics JS), **browser engine and version** (e.g. Blink/Chrome 156), user agent |
| `aircraft` | Model id (e.g. `c172s-classic-9491-9809`), package version and sha256, source manifest reference (R-AIR-1), fidelity/limitations labels |
| `ic` | Initial position/attitude/velocity in §1 frames, configuration (flaps, trim, fuel, mass), trim request and result |
| `seed` | Every JSBSim seed property set and read back (below) |
| `env` | Atmosphere model, QNH/temperature, wind/turbulence settings, WMM2025 coefficient hash and date, DGM1 tile hashes, GCG2016/EGM2008 grid hashes |
| `scenario` | Scenario/briefing package id, version, sha256; navigation edition; weather/NOTAM snapshot hashes (R-BRIEF-1) |
| `run` | `run_id`, dt rational, `max_catchup`, assists/fidelity settings, device profiles used, measured display refresh rate |
| `inputs` | Ordered input log (§3) with `applied_step` — **the authoritative replay content** |
| `digests` | Rolling and checkpoint digests per group (below) |
| `trace?` | Optional downsampled `sim`/`env`/`ind` trace for viewing without re-simulation (GAPS Q18); labeled "recorded trace, not re-simulated"; never overrides the input log |

**Seed handling.** JSBSim v1.3.3 seeds a shared `std::default_random_engine`
through `simulation/randomseed` (default 0; implementation-defined generator and
distributions), has separate `atmosphere/randomseed` and sensor seeds, accepts a
clock-based `seed="time_now"`, and does not re-seed on reset. Source citations:
[datum/controls note, JSBSim seed handling](../research/2026-11-01-jsbsim-datum-172s-controls.md#jsbsim-seed-handling).
**Rule:** the bridge sets
`simulation/randomseed`, and any separate seed properties, after `LoadModel` and
before `RunIC` and trim, and again after every reset; it records each value it
read back.

**Digest definition (`digest_layout` 1, decided GAPS Q18).** Encoding per step:
`step` as uint64 little-endian, then the group's fields in schema order — reals as
IEEE-754 binary64 little-endian, booleans as uint32 0/1, enums as uint32 of the
schema's code table, `flags` as a uint32 bitmask (all little-endian). The `sim`
group bytes are **produced inside WASM**; JavaScript only relays them, because JS
`Math` is not bit-reproducible across engines.

- **Rolling digest:** FNV-1a 64 (offset basis 14695981039346656037, prime
  1099511628211), initialized once at run start and updated with every completed
  step's bytes, never reset within a run. Cheap divergence detection. The E1
  study `bridge.cpp` uses 1469598103934665603 (last digit missing), so **study
  digests are not standard FNV-1a**; product code uses the standard constant and
  does not copy study code.
- **Checkpoints** every 120 steps (and at the final step):
  `C_k = SHA-256(prev ‖ uint32 digest_layout ‖ step bytes ‖ group bytes)`, where
  `prev` is the previous checkpoint's 32-byte digest of the same group, and for
  the first checkpoint the SHA-256 of the canonical replay header (`contract`,
  `build`, `aircraft`, `ic`, `seed`, `env`, `scenario`). Checkpoints localize
  divergence and **detect corruption**; unkeyed hashes do not protect against
  deliberate tampering.
- `sim` and `ind` groups each have their own rolling digest and checkpoints.
  Any change to fields, order, encoding or units is a new `digest_layout`.

Cross-build policy: re-simulation comparison **requires** identical
`wasm_sha256`, `js_bundle_sha256`, aircraft package hash, scenario hash, seeds, dt
and input log; the `ind` group additionally requires the same browser engine and
version. One reference-Mac session (E1 study) reproduced the cloud
container's WASM replay digest for the same build and inputs; this is an
observation, **not a guarantee**, and fixture R-7 rechecks each released build.
Native and WASM digests differ (E1 JSBSim study). A mismatching build opens the
record in trace-only mode or reports "not comparable"; cross-build tolerance
comparison follows EVAL and is never called bitwise deterministic.

## 6. Independent reference fixtures

Fixture values come from cited sources or analytic results. A fixture's author is
not the implementer of the code under test (quality, validate or an assigned
non-implementing coder); the researcher proposes sourced values and the orchestrator
assigns. Tolerances are fixed before execution (R-EVAL-1).

| ID | Category | Value source | Owner (proposal) |
| --- | --- | --- | --- |
| U-1 | Unit conversions and round trips (ft, kt, NM, lb, lbf, inHg, °R) | NIST SP 811 exact/conventional factors | quality |
| U-2 | Geodetic ↔ ECEF ↔ NED | WGS-84 (NGA TR8350.2); published test data, e.g. GeographicLib test sets | code2 (tests code1) |
| U-3 | Euler/body sign conventions; pitch range | Analytic rotations | code2 |
| U-4 | Control direction: each normalized axis → JSBSim command → surface sign/rate | Analytic sign expectation; travel limits S5 §2 C.21 | validate |
| U-5 | Magnetic variation (env module) | WMM2025 report test values | validate (env module is code1's) |
| U-6 | JSBSim height semantics: `h-sl` ≈ `geod-alt` (\|Δ\| < 0.02 m below 3,000 m); `h-agl` = `geod-alt` − terrain (default callback); geodetic-latitude IC preserved; no run-time `h-sl` writes | JSBSim v1.3.3 source and checks in the datum/controls note, Part A | validate |
| U-9 | Geoid/quasigeoid ζ at fixture point exactly 49.96000° N, 8.64000° E (ETRS89/WGS-84; near EDFE, not an aerodrome reference): GCG2016 ≈ 47.80 m, EGM2008 ≈ 48.00 m (rounded, informative); reference values regenerated at full precision. GCG2016 − EGM2008 (−0.26…−0.09 m) is informative only | PROJ 9.8.1 / pyproj 3.8.0 **bilinear** grid interpolation of `de_bkg_gcg2016.tif` and `us_nga_egm08_25.tif`, full SHA-256 pinned with the fixture (datum/controls note). Tolerance **1 mm** for the same grid and method (implementation agreement, not model accuracy) | validate |
| U-7 | Pressure altitude, QNH/QFE/STD indication | ICAO standard atmosphere; EDFE elevation TBD-src | validate (R-AIR-3) |
| U-8 | Structural-frame CG from datum and mass items | TCDS datum/CG range (S1b/S5) | quality |
| S-1 | Static/no-force: at rest, brakes set, no wind | Analytic: zero velocity, drift within E1 F3 budget; specific force = −g | quality |
| S-2 | Known accelerations: specified force/moment input | Analytic (F = m a, M = I α) with model mass/inertia | quality |
| T-1 | 172S trim/steady cases (cruise, climb, stall reference) | **TBD-src**: POH S17 cited conditions; holdout cases kept apart (E2) | product + researcher |
| R-1 | Same-build replay: two runs, reset-and-rerun, fresh worker | Self-consistency; both digest groups identical | validate |
| R-2 | Input timing: on-time vs late events, ties by `seq`, paused inputs not late | §3 rule | quality |
| R-3 | Render-rate independence (R-SIM-2): same input log at 30/60/120 Hz render, interpolation on/off | Digests identical; no render data in digests | validate |
| R-4 | Overload: forced missed/dropped steps leave the trajectory step-identical | §2 | quality |
| R-5 | Non-finite/out-of-range input and state rejection (R-SIM-6, SEC) | §3/§4 | quality |
| R-6 | Ten-minute numerical-boundedness suite (R-SIM-6) | §4 flags | validate |
| R-7 | Cross-platform same-build digest (Xeon/Linux headless vs reference Mac/Chrome) | Observation, reported not required | validate |
| R-8 | Seeds: same seed + turbulence on → same digest; different seed → different digest; reset re-seed → equals fresh run; `time_now` rejected | §5 seed rule | quality |
| R-9 | Seek: re-simulated state at a chosen step equals the recorded checkpoint | §2, §5 | validate |

## 7. Versioning and transport

- `contract_version` is semantic `MAJOR.MINOR.PATCH`; every message and replay
  record carries it as `v` (e.g. `"1.0.0"`). **Major** for any change of meaning,
  unit, frame, sign or digest layout; **minor** for additive optional fields (e.g.
  engine-start controls, the iPhone profile); **patch** for documentation. Readers
  reject an unknown major and ignore unknown optional fields of a known major.
- A replay record is valid only with the same major and `digest_layout`.
- `ready` reports `contract_version`; the main thread refuses a mismatched worker.

The v0.1 → v1 worker-message mapping is in [Appendix A](#appendix-a-v01--v1-worker-messages).

## 8. Decisions (GAPS Q18, user, 2026-11-01 13:00)

| ID | Question | Outcome | Applied in |
| --- | --- | --- | --- |
| O-1 | State streaming vs display rate | Render-side interpolation for display only; state stream 60 Hz; never in digests or replay | §2 |
| O-2 | Magnetic model | WMM2025 | §1, §4 |
| O-3 | Geoid/MSL datum | Researcher establishes JSBSim `h-sl` datum; geoid then chosen to match. Found: ellipsoid, no geoid; physical-height convention with GCG2016/EGM2008 is an **user-confirmed (GAPS Q18, 2026-11-01 13:59)** | §1, §4, U-6, U-9 |
| O-4 | Digest scheme | Per-step FNV-1a 64 + SHA-256 checkpoints every 120 steps | §5 |
| O-5 | Review seek | Re-simulate from step 0; snapshot/restore only if too slow | §2, R-9 |
| O-6 | Recorded trace | Optional downsampled trace allowed; input log stays authoritative | §5 |
| O-7 | 172S control list | Researcher extracts from POH Section 7 (cite, not copy). Done (datum/controls note, Part B); remaining items TBD-src | §3 |
| O-8 | First exercise start | Starts at the runway holding point, engine running; engine start/taxi Later | §3 |
| O-9 | Paired iPhone | Stays in TODO 1.13, not v1.0 | §3 |

## 9. SPEC acceptance edits (applied in SPEC R-SIM-3/R-SIM-4, PR fix/m1-records)

R-SIM-3, replace the acceptance text with:

> Shared contracts (CONTRACTS, linked from SPEC as `design/CONTRACTS.md`) declare
> SI internal units, WGS-84/ECEF/NED/body/structural frames, Euler and control sign
> conventions, distinct IAS/CAS/TAS/ground speed, true heading with a recorded
> magnetic-variation model and epoch, distinct height references and the altimeter
> pressure reference (QNH/QFE/standard). Boundary tests cover unit conversion,
> control direction, frame transformations and magnetic variation against sourced
> reference values. Engine units are converted only at the engine bridge and
> display units only at presentation boundaries.

R-SIM-4, replace the acceptance text with:

> Same build (identical WASM and JavaScript bundle hashes), aircraft package,
> scenario package, recorded seeds, fixed time step and input log with applied
> step indices yield identical rolling and checkpoint digests of the
> authoritative state, including after reset and seek; instrument digests
> additionally require the same browser engine and version. The replay record
> holds the build, aircraft, scenario, environment, seed and assist metadata
> defined in the shared contracts. Same-build results on different platforms are
> checked and reported, not guaranteed; cross-build comparison uses an explicitly
> documented tolerance and is not called bitwise deterministic. Render rate and
> presentation interpolation do not affect digests.

## 10. v1.1 additive contracts (Proposal, after TODO 1.6 review)

Minor version `1.1.0`, with [SCENARIO-CONTRACTS](SCENARIO-CONTRACTS.md) (events,
scenario and review records). These rules fill v1 placeholders or fix ownership;
they change no v1 field meaning, unit or encoding. They are valid only while no
`digest_layout` 1 code exists (true on 2026-11-01: the `app/` prototype implements
no contract digest); later changes of this kind need `digest_layout` 2 (§7).

### 10.1 Altimeter reference without an extra input

`setting_ref` is **derived**: the worker copies the scenario record's
`environment.pressure.expected_setting_ref` at `init`; it is constant for the run
and no input changes it. Whether the learner's `setting_pa` matches the briefed
QNH, QFE or STD value is the evaluator-derived `altimeter.changed.matches`
(tolerance GAPS/Q-S2), outside the digests. `setting_unit_display` is presentation
(§1) and is not in `ind`. Why this option: a v1 reader and a v1.1 reader encode the
same `ind` bytes from the same scenario record and input log. An optional v1.1
`altimeter_setting_ref` input would break that, because a v1 reader ignores unknown
optional fields (§7) and would encode a different `setting_ref`; declaring the input
required within v1.1 does not help, since v1 readers still ignore it, so it would be
a major change. A learner's declared reference, if wanted, is a later logged session
event outside the digests (**Later**).

### 10.2 Worker-computed `ind` and `sim_core`

The worker computes `ind` **every step**, never the main thread. After the
integration from step `s` to `s+1` it: (1) takes the WASM-produced `sim` bytes for
`s+1`; (2) computes the JS `env` fields (`magvar_east_rad`, `zeta_m`, `h_ell_m`)
from `sim[s+1]`; (3) calls each instrument model from `packages/avionics/` as a pure
step function `(ind_state[s], sim[s+1], env[s+1], controls applied at s, scenario
constants) → (ind_state[s+1], ind[s+1])`; (4) encodes the `ind` group and updates
its digests (§5). Instrument state (lags, gyro drift, needle dynamics) is per-step
worker state, so `ind` is per-step digestible and stateful; reset re-initialises
it from `init`. Instrument modules use no DOM, wall clock, timers, I/O, async or
`Math.random`, and read only their arguments. A value computed inside WASM may
belong to the `ind` group (e.g. engine/fuel indications, SCENARIO-CONTRACTS Q-S8);
the worker still encodes it there. The main thread only renders streamed `ind`;
display-only needle interpolation follows §2. Ownership: code1 owns the worker step
loop and encoding; code2 owns the instrument modules behind the declared list
(SCENARIO-CONTRACTS §4).

`state` message at `state_hz` 60: `{v, run_id, step, sim_core, env_core, ind}`,
carrying the latest completed step; `ind` is the full declared list. `sim_core`
serves rendering and UI only; digests always use the full per-step state inside the
worker.

| `sim_core` field | Unit / frame |
| --- | --- |
| `lat_rad`, `lon_rad` | rad; WGS-84 geodetic, east positive (§1) |
| `h_msl_m`, `h_agl_m` | m; physical height (§1); height above terrain callback |
| `phi_rad`, `theta_rad`, `heading_true_rad` | rad; Euler Z-Y-X, NED → body |
| `vn_mps`, `ve_mps`, `vd_mps` | m/s; local NED |
| `p_radps`, `q_radps`, `r_radps` | rad/s; body |
| `elevator_rad`, `aileron_l_rad`, `aileron_r_rad`, `rudder_rad`, `flap_rad`, `trim_tab_rad` | rad; surface positions, signs as fixed by U-4 |
| `prop_radps` | rad/s |
| `wow_nose`, `wow_main_l`, `wow_main_r` | 0/1 |
| `flags` | uint32 bitmask (§4) |

`env_core`: `h_ell_m` (m, WGS-84 ellipsoidal, for renderers) and `magvar_east_rad`
(rad, east positive, for magnetic display).

### 10.3 Single `seq` allocator (owner: code1)

The worker owns the run's only `seq` counter. The main thread **proposes** inputs
and logged events (SCENARIO-CONTRACTS §2) as `{v, proposal_id, step?, …}` without
`seq`; `proposal_id` is a main-thread correlation counter, never replay content. On
acceptance the worker stamps `step` (§3; E1 for events), `applied_step` and the
next `seq`, appends the entry to the input or session log, and replies
`accepted {proposal_id, seq, applied_step}`; a rejected proposal gets
`error {proposal_id, code}` and consumes no `seq`. `run.started` takes the first
`seq`. Acceptance order is the order proposals arrive on the worker's message port;
ties at one step resolve by `seq` (§3). The worker allocates consecutively; readers
still accept gaps (v1 rule). Derived events carry `seq: null`. Appendix A's
`input {v, seq, …}` becomes `input {v, proposal_id, step, …}` at transport level;
the logged input keeps the v1 fields.

### 10.4 Device-loss fallback (GAPS Q19)

On loss of an input device (first case: the paired phone) the input boundary
logs `input.source_lost` and shows a visible warning. Keyboard/touchpad are active
**immediately** and may override any axis **during the hold**; their inputs are
ordinary events with their own `source`. Mapped axes that were not overridden
hold their last value for 0.5 s (no event needed: unspecified fields hold, §3),
then one input with `source: "fallback"` centres them. The 0.5 s is measured at
the input boundary; replay uses the logged `applied_step`. This bounded, visible,
logged hold clarifies v1 §3's "no silent hold". Auto-pause on loss is a
**Proposal** (optional setting, default off), not decided by Q19 and not part of
v1.1.

### 10.5 Rights classes (one enum)

Aircraft manifests (`rights.redistribution`), the source catalog, briefing items,
experience packages and scenario `nav_entry.rights_class` use this enum:

| Class | May be stored and shipped | Never stored or shipped |
| --- | --- | --- |
| `public_domain` | Values, text, figures; jurisdiction recorded in the basis | — |
| `open_licence` | As the licence allows: `{spdx, attribution, share_alike}`; attribution shown | Use beyond the licence |
| `permission` | As the written grant on record states (scope, date) | Use beyond the grant |
| `facts_only` | Individual values as cited facts: value, unit, page citation | Text, tables, figures, layout; whole or piecemeal charts (Q5 no-piecemeal rule) |
| `reference_only` | Catalog id, kind, edition hash, source-document hash and citation | Any value, text or derived chart, in records, logs, caches, traces or exports |
| `rights_unknown` | Author/local view only | Blocks shipping and export |

Mapping of existing labels: manifest `public_domain_us` → `public_domain` (basis
keeps "US; other jurisdictions not analysed"), `facts_only` and `reference_only`
unchanged; EXPERIENCES `public-domain` → `public_domain`, `open-attribution` →
`open_licence`, `odbl` → `open_licence {spdx: ODbL-1.0, share_alike: true}`
(separate attributed database), `project` → `open_licence {spdx:
GPL-3.0-or-later}`, `permission` and `reference-only` → same class; BRIEFING's
`rights_unknown` item state is this class. **Flag for the data owner (not changed
here):** manifest sources S5 (EASA TCDS IM.A.051) and S9 (EASA.IM.E.032) are
`reference_only` yet supply cited values; `data/aircraft/c172s-classic/README.md`
already treats EASA TCDS as "reference and cite facts only", i.e. `facts_only`. The
dated Q5 answers cover POH and Lycoming facts only, so reclassifying S5/S9 needs an
orchestrator Q5 record first; until then their values cannot ship under this enum.

### 10.6 Canonical hashing

- **JSON objects** — catalog `entry_sha256`, aircraft `manifest_hash`, package
  `content_hash`, scenario-record, briefing-snapshot, session-log and evaluator-pin
  hashes: SHA-256 over the UTF-8 bytes of the RFC 8785 (JCS) serialization,
  lowercase hex (64 characters). The object's own hash field is omitted before
  hashing; referenced objects enter through their hash fields. Input must be I-JSON
  (RFC 7493): no duplicate keys or non-finite numbers, integers beyond ±2⁵³ as
  strings.
- **Aircraft model package** `package_sha256`: the JCS hash of
  `{files: [{path, bytes, sha256}]}` sorted by `path` in code-point order, each file
  `sha256` over its raw bytes (XML is not canonicalised).
- **Raw-byte SHA-256** stays for pinned files: `wasm_sha256`, `js_bundle_sha256`,
  grids, tiles, source documents and the poh-values source-byte pin of
  [Assessment airspeed](ASSESSMENT-AIRSPEED.md).
- **No per-value hashes of `reference_only` content.** A hash over a short value
  (frequency, elevation, bearing) can be brute-forced and would disclose it.
  Records hold catalog id, kind, edition and the edition hash only; a user-supplied
  local copy is verified by its source-document hash. A run that uses locally
  resolved `reference_only` values produces a **local-only** record (its state and
  trace derive from those values): export and sharing are refused.

## Appendix A. v0.1 → v1 worker messages

| v0.1 (study) | v1 (product) | Change |
| --- | --- | --- |
| `init {dt_s, aircraft: "c172x", ic, state_hz}` | `init {v, dt: {num, den}, aircraft: {id, sha256}, ic, env, seeds, scenario, state_hz: 60}` | Rational dt; aircraft hash; seeds and environment explicit |
| implicit trim in `init`, `ready.trim` | `ic.trim` request; `ready.trim {status, values}` | Trim requested, not implicit |
| `input {step, wall_ms, elevator, aileron, rudder, throttle}` | `input {v, seq, step, wall_ms, source, controls, assists?}` | Pilot-sense names; partial fields; discrete controls; `seq` |
| application rule (v0.1 text) | unchanged; worker logs `applied_step`; paused inputs not late | Log carries applied step |
| `run {until_step?}`, `pause`, `stop` | `run`, `pause`, `reset`, `stop` | `until_step` test-only; `reset` re-seeds |
| `ready.build {jsbsim_tag, jsbsim_commit, emsdk, wasm_bytes, wasm_sha256, flags}` | same + `contract_version`, bridge revision, `js_bundle_sha256` | Main thread adds browser engine/version |
| `state {step, t_s, lat_rad, lon_rad, alt_msl_m, roll_rad, pitch_rad, heading_rad, tas_mps, …}` | `state {v, run_id, step, sim_core, env_core?, ind?}` | Explicit height fields; `heading_true_rad`; `t_s` derived |
| `stats` (benchmark) | `stats {missed, dropped, max_lag, max_batch, late_inputs, digests, checkpoint}` | Product overload reporting |
| `burst`, `stats.step_cost_us` array | test harness only | Not product |
| `error {message}` | `error {v, code, field?, step?, message}` | Machine-readable code |
