# Current native flap-effectiveness check

Task2.0.172; R-SIM-5/R-AIR-2/R-FID-3. The user asked to
[check flap effectiveness](../input/2026-11-06-flaps-settings.md).
This is a diagnostic of the installed generic1982C172P, not a calibration of the
planned172S. No aircraft, bridge, engine or coefficient changes are proposed.

## Inputs and comparison

The executing WASM is266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc.
Its build metadata pins the original
[JSBSim1.3.3 c172x model](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172x/c172x.xml)
and the local adapter. Reapplying that exact adapter reconstructs the embedded
XML hash cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595.
The mutable prepared working file is not used as proof of the executing model.
The unchanged engine/model and external input remain local study dependencies;
neither their binaries nor the aircraft XML are added to this PR.

All comparisons use the same balanced initial profile,2400lb initial loading,
1000m MSL,1/120s steps and an identical clean settling interval within each speed
group. The32 cases compare0/10/20/30° at requested60/75/85kt CAS for30s with
manual retained clean trim or generic VS0 compensation, plus60/75kt idle
transients for120s with lateral leveling. CAS is not cockpit IAS. A repeated
case checks exact deterministic equality. Paused commands and six bidirectional
actuator legs check command/actual separation and source2/1/1s extension timings.

The admission tests require the complete matrix and matching initial states,
finite telemetry, reached detents and measurable early response. Their tiny
numeric detectability thresholds are not real-aircraft tolerances. Source
arithmetic separately includes the flap-dependent CLalpha and CDwbh tables;
the additive CLDf/CDDf/CmDf rows alone are incomplete.

## Observed effect

At the75kt CAS initial condition, compared with the matching clean case:

| Profile, full30° flap | After4s | After10s |
| --- | --- | --- |
| AP off, retained clean trim | CAS−4.724kt; pitch+4.299°; climb rate+3.561m/s | CAS−15.640kt; pitch difference−0.108° as the transient evolves |
| Generic VS0 compensation | CAS−2.779kt; pitch−0.442°; actual elevator difference+1.059° | CAS−6.988kt |

The native response is substantial. AP compensation masks the pitch response
through elevator movement; it does not disconnect the flaps. At a matched source
state α5°,β0 and ground-effect factor1, the reconstructed static lift subset
increases from1.10824 to1.44450 (+30.34%); the static drag subset increases from
0.0762427 to0.146841 (+92.60%). These are source-function sums, not exported
native force measurements or a complete pitching-moment model. The native body-Z
specific-force channel has a negative sign near level flight; the diagnostic
compares changes without relabeling it as positive lift.

All32 measured cases complete their declared duration, and the six actuator
legs reach the source timings within one native step. No angle-unit or
disconnected-control defect is demonstrated, so there is no evidence-based
reason to boost flap coefficients in this increment.

## Reproduction and limits

With the exact local v5 engine/source inputs installed, run from the repository:

```sh
python3 studies/e1-browser/sim/flap-effectiveness-source.py
node studies/e1-browser/sim/flap-effectiveness-native.mjs
node studies/e1-browser/sim/flap-effectiveness-checks.mjs
node --test studies/e1-browser/sim/flap-effectiveness-checks.test.mjs
python3 studies/e1-browser/sim/flap-effectiveness-source.test.py
```

Use a working Python XML installation (the measured host used3.11.12). Full
traces remain disposable output under `output/flight/flap-effectiveness/`;
the [compact result](../reviews/2026-11-06-flap-effectiveness-root-runtime.json) records their hashes, source pins, criteria and representative measurements. The [publication replay](../reviews/2026-11-06-flap-effectiveness-publication-runtime.json) reproduces the numerical/source values independently. Pure admission/arithmetic tests do not execute or
validate an aircraft. The actual32-case run is separate evidence.

This check establishes a connected, measurably effective implementation. It does
not establish real C172P/172S flap adequacy, CLmax, stall speed, actuator realism
or steady-glide performance. No stall occurs in these transients. The idle cases
end at different airspeeds/attitudes, so their final sink rates are not matched
glide comparisons. Wider aircraft fidelity and handling tasks remain open.
