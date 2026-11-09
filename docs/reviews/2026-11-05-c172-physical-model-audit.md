# C172 physical-model audit

Prepared 2026-11-05 11:18 Europe/Berlin by Codex orchestrator for TODO 2.0.133.
This is the author's integrated diagnostic, with independent quality/validation
in separate reports. No production controls, model coefficients, adapters,
engine binary or aircraft selection changed.

The [initial report](../input/2026-11-05-c172-physical-model.md) concerns weak
power, climb stalls and ineffective flaps. The
[follow-up](../input/2026-11-05-c172-low-speed-followup.md) requests direct
reproduction and identifies 40–50 kt at the event; it does not establish the
starting airspeed or its reference.

## What was reproduced in the game

The real application was operated through its controls in fresh browser contexts:
full throttle, flaps up, native default loading, A engagement, selected altitude
10000 ft, VS mode with capture disarmed, then actual UP buttons selecting each
climb demand. A read-only Worker observer forwarded all responses unchanged.
Scenery imagery was a test fixture; native aircraft states, loading, controls and
terrain responses were not injected. Airspeed below is the native **CAS** used by
the cockpit, not a claim of installed IAS or TAS. Rates distinguish selection
from measured response.

| Requested VS | Observed result over about 180 simulated seconds |
| --- | --- |
| 400 ft/min | Minimum 88.30 kt CAS; final 92.09 kt, actual approximately 401 ft/min. No native stall warning. |
| 600 ft/min | Minimum/final 80.55 kt CAS; final actual approximately 559 ft/min. No native stall warning. |
| 1000 ft/min | Fell below 50 kt at 81.48 s, then produced a genuine native warning at 166.22 s / 41.34 kt, with pitch 20.80 degrees and actual climb approximately 604 ft/min. Full throttle and flaps up were confirmed. |

The 1000 case's maximum bank reached 33.7 degrees, so it is not a wings-level
steady performance test. It reproduces the reported low-speed band and warning
through the game; it does not establish the exact original flight or an accepted
aerodynamic stall criterion. Requested climb can exceed the achieved response
while airspeed is spent. This result does not establish that every climb fails.

A small pointer command of -0.04 produced **no actual elevator movement** and
therefore supplies no manual pitch-response evidence. A separate effective
-0.16 command moved the actual elevator, was released near 8 degrees pitch and
observed for 60 seconds: minimum CAS 67.98 kt, no native warning. Bank reached 68.59 degrees,
preventing treatment of that case as a controlled straight climb.

Evidence: ignored `output/flight/c172-browser-task133-original-four.{json,log,browser.mjs}`
and `c172-browser-task133-manual-effective.{json,log,png}`. Original four-case and
renewed manual-only runs exited zero; the independent reports pin their bytes.

## Confirmed configuration and model concerns

**The active model is a generic 1982 C172P, not the planned C172S.** The existing
WASM embeds JSBSim v1.3.3 at commit
`66f7fafc07fe13e7ede9db20873030fed2881713`, the c172x model, eng_io320 and a
project-prepared generic windmilling propeller. Nominal engine data is 160 hp at
2700 RPM. This is not an accepted 172S/180 hp installation; the
[source reference note](../research/2026-11-05-c172-performance-audit.md) keeps
P/S engines, propellers, weights and performance conditions separate.

**The default is overweight for the P reference and carries outboard ballast.**
Native loading confirms exactly 2480 lb: empty 1454, six payloads totaling 766,
and fuel 260. This includes an 80 lb source station called PesticideBomb at
144 inches to the right. Native lateral CG is approximately 4.227 inches right.
The cited P normal takeoff/landing limit is 2400 lb; the S's different limit
cannot validate this P case. Removing only the external load produces 2400 lb.
It also materially changes lateral handling; the application's fixed empirical
roll offset must not be mistaken for a validated aircraft trim solution.

**Actual engine output exceeds the nominal rating.** In four full-power,
clean, generic level-hold cases initialized at 400/1000 m, measured engine output
is approximately 236/219 mechanical hp and propeller speed approximately
3085/3065 RPM. Applied throttle 1, automatic mixture and actual engine running
are sampled and checked. These are native engine power properties, not inferred
from the throttle lever. Thrust is approximately 1420/1330 N; the TAS-based
propulsive-efficiency proxy is approximately 0.45, not a calibrated propeller
curve or exact local-axis efficiency.

Pinned [FGPiston.cpp](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/propulsion/FGPiston.cpp)
ties power-hp to computed HP. An explicit bsfc value supplies ISFC in its engine
calculation; maxhp is not a hard power limiter. The pinned engine supplies bsfc
0.32, while the propeller adapter changes power/thrust tables from the source
propeller. This establishes an inconsistent rating/operating envelope, not a
single proven cause or a justified new coefficient. A power boost would not be
an evidence-backed repair.

**Two alpha-dependent static lift terms are active and summed.** The pinned
[aircraft model](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172x/c172x.xml)
contains both CLwbh and CLalpha as direct LIFT-axis functions.
[FGAerodynamics.cpp](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/FGAerodynamics.cpp)
loads and sums both. At alpha 0.2 rad, beta zero, clean flaps, hysteresis zero and
unit ground-effect factor, their normalized static contributions are 1.22 and
0.8543042, totaling 2.0743042 before elevator/rate terms. The source-table audit
shows overlapping alpha lift; it does not prove author intent, an erroneous
duplicate or the cause of the user's flight. No term was removed. Powered trim
below a published **power-off** stall speed is not a matched-condition proof.

**Elevator neutral is history-dependent in this model.** The source actuator
sets hysteresis width 0.05 rad. Its half-width is 0.025 rad, large enough to
swallow the first small pointer command. After the effective pull and release,
the same trim and zero command settle at an elevator angle 0.025 rad below the
initial angle. This is directly observed backlash behavior, not an invented
control failure or an accepted C172 actuator characteristic. It warrants
control-model calibration before assigning the climb problem only to power.

## Flaps and sustainable climb

The flap path is connected: UI degrees / 30, normalized worker command, native
kinematic scaling to degrees, then degree-based lift/drag/pitch tables. Actual
UP/10/20/30 positions and source traverse times (2 s, then 1 s per adjacent
10-degree step in either direction) match the existing model within one native
step. Actual initial flaps are up. Fourteen native trajectories show changed pitch, speed, climb and specific
force, alongside active source lift/drag terms; individual aircraft lift/drag
forces were not exported or isolated. There is no reproduced unit or disconnected-flap
fault. This does not validate the tables against the aircraft.

A separate native speed-seeking diagnostic at about 75 kt CAS, initialized at
1000 m and observed late in the climb, measured:

| Loading, clean flaps | Mean measured climb | Mean actual altitude in that observation window |
| --- | ---: | ---: |
| Default 2480 lb | 2.560 m/s (504 ft/min) | 1456 m |
| Same without external load, 2400 lb | 2.766 m/s (545 ft/min) | 1491 m |
| Two occupants, no rear/baggage/external load, 2044 lb | 3.530 m/s (695 ft/min) | 1623 m |

For the original loading, the same starting conditions and a 75-CAS speed
command with 0/10/20/30-degree flaps give approximately 2.560/1.947/1.386/0.982 m/s. Configuration changes reduce
climb headroom in these fixtures. The source's best-rate chart is flaps-up; it
provides no flap-down acceptance target.

The 43-case native matrix repeats exactly. Six deliberately low-speed
speed-controller cases fail settling and remain **controller limitations**, not
physical-model failures. Direct 45/50-CAS initial trim and level-recovery cases
accelerate under full power; default 40-CAS trim fails and cannot establish a
steady reference. Native fixtures use legacy heading/VS servos and, where
stated, a diagnostic outer controller; they are distinct from real app KAP tests.

## What this audit accepts and what remains

This audit accepts the measured diagnostic observations, source/data tracing and
reproduction of low-speed loss under sustained higher VS demand. It does **not**
accept C172 performance fidelity, stall speeds, actuator realism or the current
model as a validated 172S. Pressure altitude, outside temperature, installation
IAS conversion and independent aircraft tolerances were not matched; manufacturer
climb-table acceptance is therefore not established.

Corrections should first establish a deliberate ordinary loading/trim baseline,
then calibrate the engine/propeller combination and overlapping lift/actuator
behavior against applicable sources. Preserve powered, flap, low-speed and
windmilling regressions together so one correction does not hide another.
Any future IAS/VS safeguards must be specified separately from physics and
installed KAP fidelity. No arbitrary horsepower increase, flap multiplier or
removed lift term is selected by this diagnostic.
