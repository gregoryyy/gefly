# Complete prior/new application-default comparison

2026-11-05 17:46 Europe/Berlin. Codex orchestrator, measurement by code1 `control_native`. R-INPUT-1/R-SIM-5/R-SIM-11, TODO2.0.153. This supplemental diagnostic leaves the frozen production and diagnostic code unchanged.

Forty actual-native cases compare the prior application (source external load, −0.109375 aileron bias, 1:1 rudder link) with the new defaults (external station unloaded, zero bias, independent rudder). Conditions: initial70/90kt CAS,396.24m MSL,1/120s, AP off, clean flaps, initialization trim power or full power, neutral or±0.1/±0.45 aileron during seconds5–7;60s maximum with a100m safety floor. All40 initial longitudinal trims succeed. Speed and altitude then evolve without stabilization. These fixture inputs are not aircraft coefficients or acceptance tolerances.

| Case | Prior | New |
| --- | ---: | ---: |
|70kt trim power, neutral, bank30s|+40.16°|+14.12°|
|90kt trim power, neutral, bank30s|−15.96°|+15.24°|
|90kt full power, neutral, bank30s|+19.83°|+35.38°|
|90kt trim power, +0.45 pulse, peak body roll rate|34.70°/s|30.20°/s|
|90kt trim power, −0.45 pulse, peak body roll rate|36.48°/s|29.00°/s|

The changes remove inappropriate configuration and default input coupling. They do **not** establish uniformly improved handling or resolve the whole reported instability. Some conditions improve and others worsen; no automatic wings-level or validated C172S behavior is supplied. The earlier35.30°/7s source-loading result used zero bias and must not be represented as the former full application default. High-speed110kt initialization still fails trim in the separate matrix; actuator hysteresis and residual untrimmed roll remain limitations.

Retained local artifacts (ignored; not fresh-checkout assets):

- `output/flight/control-stability-app-comparison.mjs`: SHA256`65041a961ac7b4db2a722e73bd86e3045f87dcca8f7ae7b733b6803fdf281cf6`. It is an exploratory copy of the tracked native harness with the exact prior/new loading, offset and rudder combinations above.
- `output/flight/control-stability-app-comparison.json`: SHA256`8892ca5be60a3320ee4f70bc101fcc10fd9d935afa51f4afcb122253336f1502`; raw timelines retained locally.
- `output/flight/control-stability-app-comparison.log`: SHA256`217758986d9bd20e4c354fb8ff327c5755cb432fa1707637d1aeaf2deb9bd6ea`.

The tracked native and production-handler diagnostic scripts reproduce individual factors. Repeating this exact supplemental whole-configuration matrix requires reconstructing the combinations above or retaining the local exploratory script; it is not a separate tracked automated gate. Native binary provenance is still unverified.
