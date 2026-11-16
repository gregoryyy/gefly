# Engine-off propeller: NACA TR-641 negative region

Recorded 2026-11-09 by Claude Code subagent (code1/researcher role) for TODO 2.0.52,
R-SIM-10 and R-ENG-1. Scope: the [user report](../input/2026-11-03-engine-off-glide.md)
("glide factor is like a sailplane"), the open low-RPM limitation of the
[first correction](2026-11-03-engine-off-glide.md) and the
[rejected follow-up](2026-11-03-engine-off-followup.md). No deep-research skill ran;
this is a bounded primary-source and native-model investigation.

## Reproduction (before)

Native WASM built from main `cbdf0f9` in an isolated worktree, propeller adapter
`gefly-generic-fixed-pitch-windmilling-v1`. `engine-off-glide-native.mjs`, 2,500 m
initial MSL, flaps up, native longitudinal trim, lateral levelling only, 60–120 s
window after shutdown. Values are finite-window diagnostics, not a steady polar.

| Initial TAS | Mode | Glide ratio | Height loss rate | Mean thrust | Shaft speed |
| --- | --- | ---: | ---: | ---: | ---: |
| 35 m/s | ignition off / mixture cutoff, trim throttle | 12.56 | 2.83 m/s | −91 N | 888 rpm |
| 35 m/s | ignition off, closed throttle | 13.99 | 2.54 m/s | 0 N | 0 rpm (stopped) |
| 45 m/s | ignition off / mixture cutoff, trim throttle | 10.53 | 4.33 m/s | −120 N | 1,252 rpm |
| 45 m/s | ignition off, closed throttle | 10.17 | 4.49 m/s | −156 N | 1,139 rpm |

A separate, uncommitted pre-change (v1) 240 s energy-budget probe (mass 1,125 kg)
at 40 m/s TAS, about 68 KIAS at that height, gave an energy-based glide ratio of
11.96 with throttle at its trim setting and 11.58 at closed throttle. Airframe drag
inferred from the energy loss and the reported propeller thrust was about 815 N, so
the airframe alone corresponds to about 13.5:1. The stopped-propeller case was
about 14.3:1. Those 40 m/s cases stay inside the unchanged Aero-Matic rows (J 1.21
and 1.38), and the committed v2 long-duration fixture below reproduces them.

## Root cause in the propeller model

[FGPropeller.cpp](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/propulsion/FGPropeller.cpp)
(pinned v1.3.3, unchanged on upstream `master` when checked on 2026-11-09) computes
`J = V/(nD)`, `Thrust = CT(J)·n²·D⁴·ρ` and
`PowerRequired = CP(J)·n³·D⁵·ρ`. Its tables clamp at the last row. The v1 prepared
tables end at J = 1.4 (`C_THRUST`) and J = 1.6 (`C_POWER`) because the Aero-Matic
fixed-pitch branches end there. As a windmilling propeller slows, J rises past
the table end. The clamped coefficient then makes the windmilling torque and drag
fall as n² instead of with the airflow (V²). Once below the table end, the native
dead-engine loss can no longer be balanced. In
[FGPiston.cpp](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/propulsion/FGPiston.cpp)
`doEnginePower`, that loss is a constant 1.5 hp default static-friction power, which
is a torque that grows as 1/RPM, plus manifold pumping. The shaft then stops, and a
stopped propeller has zero JSBSim force. Closed throttle adds pumping loss, so the
closed-throttle 35 m/s case crossed this boundary.

## Source: NACA Report 641

[Hartman and Biermann, *The Negative Thrust and Torque of Several Full-Scale
Propellers and Their Application to Various Flight Problems*, NACA Report 641,
1938](https://ntrs.nasa.gov/citations/19930091716) is the negative-region companion
of the NACA Report 640 propeller data that Aero-Matic cites. The NTRS record lists
distribution PUBLIC with copyright determination GOV_PUBLIC_USE_PERMITTED. Served
PDF SHA-256 is `281d1e2845088e51a12253e678a89bc1b4abd1742d36e155761e02dcea8d9c77`.
It has a 436-byte NTRS prefix; the embedded 24-page PDF is
`3a67650a5fc5fff31343c64b424eb3e06a6a9085347b55f6e8017c3e95742527`.

Figure 3 (printed page 3) gives cross-faired `Tc = Te/(ρV²D²)` and
`Qc = Q/(ρV²D³)` against `nD/V` from the locked propeller (`nD/V = 0`) to the zero
crossings. The test article was a 10 ft, 2-blade Clark Y Navy propeller (5868-9)
on a radial-engine nacelle in the 20 ft tunnel. `Te` is effective thrust, net of the
slipstream's body-drag change. Because these coefficients use V², they stay finite
as n → 0; they convert exactly to the JSBSim forms as `CT = Tc·J²` and
`CP = 2π·Qc·J²`.

Applicability caveat: `Te` is effective thrust, net of the slipstream-induced
drag change of the test radial-engine nacelle. Applying `Tc` as JSBSim shaft
thrust therefore carries that installation-specific nacelle effect into a model
with a different cowling.

Rights: NACA, a U.S. federal agency, authored and published the report in 1938.
The NTRS record metadata (checked 2026-11-09) lists distribution PUBLIC and
copyright determinationType GOV_PUBLIC_USE_PERMITTED, with belongsToUsGov false
and no third-party material flagged. Only numeric readings are stored.

The 15° and 20° (at 0.75 R) curves were digitized from a 5x PDFKit render using
grid-calibrated pixel column scans and traces. Each reading was checked against
labels, zero crossings and visual crops. They are recorded with provenance and an
uncertainty statement in
[`naca-tr641-figure3.json`](../../studies/e1-browser/sim/naca-tr641-figure3.json).
Only numeric readings are stored, not page images.

## Change

Adapter `gefly-generic-fixed-pitch-windmilling-v2` keeps the hash-pinned Aero-Matic
rows unchanged and appends converted TR-641 rows after their last advance ratio,
up to J = 100 (`nD/V = 0.01`). The rows use a 1.1 geometric J spacing, so JSBSim's
linear interpolation of the quadratic CT/CP stays within about 0.25 %. It does
not extrapolate beyond the digitized locked-to-zero domain. The blade-angle curve
is the one whose zero-torque advance ratio is nearest the Aero-Matic zero-power
advance ratio. That is J 1.077, and 20° gives J 1.082, versus 0.866 for 15°, so
shaft power is continuous where the tables join. The adapter records each join
mismatch, the Aero-Matic end value against the TR-641 value converted at the same J,
in its metadata and `build-info.json`. It rejects a join that differs by more than
a documented 25 % plausibility bound, which is not a fitted value. For 20° the
mismatch is +9.9 % for CT at J 1.4 (−0.0460 versus −0.0511), leaving a slope kink,
and −3.1 % for CP at J 1.6 (−0.0659 versus −0.0639). The 15° curve would be
rejected: its CT mismatch is +46.7 %. In their overlap the TR-641 20°
values and the Aero-Matic values agree within about 11–15 % for CT (J 1.2–1.4) and
3–12 % for CP (J 1.4–1.6; at J = 1.6, −0.064 versus −0.066). Relative differences
are larger near the zero crossings (CP at J 1.2: −0.020 versus −0.013). The data-file hash is pinned in the adapter,
and the build records data, script, prepared-model and WASM hashes.

Rows at or below the old table ends are byte-identical. Powered flight, the
retained-throttle shutdown cases and all fixtures that stay below J 1.4 therefore
reproduce the previous native digests exactly.

## Results (after)

| Initial TAS | Mode | Glide ratio | Height loss rate | Mean thrust | Shaft speed |
| --- | --- | ---: | ---: | ---: | ---: |
| 30 m/s | ignition off / mixture cutoff, trim throttle | 12.18 | 2.49 m/s | −81 N | 672 rpm |
| 30 m/s | ignition off, closed throttle | 13.31 | 2.28 m/s | 0 N | stopped (**not accepted**) |
| 35 m/s | ignition off, closed throttle | 11.92 | 2.99 m/s | −138 N | 717 rpm (TR-641 rows) |
| 35 m/s, 45 m/s | other modes | unchanged | unchanged | unchanged | unchanged |

The former 35 m/s closed-throttle counterexample now windmills within the 60–120 s
window. In that window it uses the TR-641 thrust and power rows (maximum J 1.68
after shutdown). The restart fixture now coasts at about 716 rpm instead of a
stopped shaft.

The committed harness also runs 420 s closed-throttle descents from 2,500 m and
reports a 180–240 s energy-based glide diagnostic:

| Initial TAS | Mode | Shaft speed every 60 s (rpm) | Stop | Energy glide 180–240 s |
| --- | --- | --- | --- | ---: |
| 35 m/s | closed throttle | 2,231 · 716 · 703 · 694 · 537 · 0 · 0 · 0 | at 252 s, 1,759 m; **not accepted** | 12.00 |
| 40 m/s | closed throttle | 2,355 · 985 · 938 · 920 · 907 · 892 · 877 · 863 | none | 11.58 |
| 40 m/s | ignition off, throttle at trim | 2,355 · 1,102 · 1,062 · 1,046 · 1,036 · 1,025 · 1,014 · 1,003 | none | 11.97 |

**15° sensitivity.** I ran this once with a temporary local edit that forced the
15° curve and bypassed the join bound; it was reverted and not committed. Cases
inside the Aero-Matic rows are unchanged. 35 m/s closed throttle gives 11.13:1
(−203 N, 720 rpm) instead of 11.92:1, and stops at 305 s instead of 252 s.
30 m/s with ignition off gives 12.11:1 instead of 12.18:1. The 30 m/s closed-throttle
case stops in both. The curve choice therefore moves the closed-throttle glide by
about 7 %, but it does not change the conclusions.
Ignition-off, mixture-cutoff, native starter restart and the second shutdown keep
their contract, and the exact reset/digest repeat holds.

## Limitations and remaining causes

- **Glide ratio stays above the 172S reference.** The selected 172S Figure 3-1
  reading is about 9.1:1 at 68 KIAS ([POH values](2026-11-01-c172s-poh-values.md)).
  The generic C172P model reaches 10.2–12.6 in the finite windows. The dominant
  remainder is the pinned `c172x` airframe polar (about 13.5:1 without propeller
  force at 68 KIAS). For context only, a secondhand quotation of Loftin, NASA
  SP-468, gives the Skyhawk (L/D)max as about 11.6. Matching 9.1:1 with propeller
  drag alone would need about 400 N, well beyond the TR-641 locked or braked range
  for this diameter. Correcting the airframe polar is a separate, source-gated task;
  no glide-ratio tuning was done.
- **Closed throttle at low speed still stops the shaft.** At or below about
  35 m/s TAS (about 60 KIAS at 2,500 m) the native dead-engine loss exceeds the
  TR-641 windmilling torque after some minutes of descent: at 30 m/s within the
  first minute, at 35 m/s after about 250 s. At 40 m/s it keeps windmilling for at
  least 420 s. That loss is constant
  static-friction power plus pumping, with no non-running FMEP. JSBSim then applies
  no locked-propeller force (TR-641 gives `Tc` ≈ −0.024 at `nD/V = 0`). Both
  outcomes need native-model changes outside table preparation. A stopped shaft
  also cannot re-enter windmilling without the starter.
- **Applicability.** TR-641 tested a 10 ft Navy propeller on a radial nacelle in
  1938; the McCauley 1C160 (P) and 1A170E (S) propellers are not characterized.
  Blade-angle selection uses model continuity; geometric pitch is not measured. The
  15° curve stays in the data file; the one sensitivity run is reported above.
  Readings carry the stated digitization uncertainty and the authors'
  cross-fairing. The radial-nacelle effective-thrust caveat above applies.

## Handoff

Proposed follow-ups for the orchestrator:

1. Audit the `c172x` clean drag polar against citable C172P sources (POH glide
   figure, SP-468 primary text) before any airframe change.
2. Evaluate a native dead-engine friction-torque model and locked-propeller force
   (JSBSim upstream issue or local patch).
