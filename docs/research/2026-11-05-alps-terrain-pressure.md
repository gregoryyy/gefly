# Alps terrain and unavailable-pressure diagnostic

Observed 2026-11-05 22:35 Europe/Berlin by Codex, housekeeping support for
TODO 2.0.158, alongside separate terrain-source and renderer investigations.
This note covers the pressure symptom under R-AIR-3/R-SIM-2; it does not accept
terrain accuracy, aircraft dynamics or an instrument model.

The user places the **NO PRESSURE** screenshot in the flight after the Swiss
terrain-wall screenshot, saying they are “probably related”. The reported
flight's actual starting altitude and raw pressure are unavailable. A causal
connection between the screenshots is therefore unestablished.

## Reproduced pressure failure

At 47.15° N, 8.45° E, the unchanged local native engine supplies both read-only
pressure functions. The production worker nevertheless suppresses the entire
altimeter group for a normal 3,000 m airborne launch. This occurs without any
browser or renderer, with terrain disabled and with bundled world terrain enabled.

| Requested launch altitude, m | Initial native pressure, Pa | Converted pressure altitude, m | Native launch QFE inside selectable range? |
| --- | --- | --- | --- |
| 500 | 95,461.783 | 499.917 | Yes |
| 1,200 | 87,718.430 | 1,199.733 | Yes |
| 1,900 | 80,493.248 | 1,899.395 | Yes |
| 2,000 | 79,501.785 | 1,999.334 | No |
| 3,000 | 70,121.450 | 2,998.552 | No |
| 6,000 | 47,217.772 | 5,994.321 | No |
| 10,900 | 23,058.760 | 10,881.338 | No |
| 11,200 | 21,997.665 | Unavailable: outside converter envelope | No |

The direct probes use native initialization, 45 m/s true airspeed and 120 actual
fixed steps at 1/120 s. They retain the installed loading/model configuration;
this is not a matched flight-performance fixture. The 500–6,000 m cases report
successful trim and remain within 0.008 m of their initialized heights after one
second. The 10,900 and 11,200 m cases report failed trim and are included only
for pressure availability, not achievable aircraft performance. Native pressure
and ideal pressure altitude need not equal the geographic height exactly; no
calibration claim follows from their difference.

The real production worker transport then shows:

- Flat 500 m launch: all six pressure/altimeter fields are present.
- Flat 3,000 m launch: all six fields are absent at step zero. Applying standard
  pressure is rejected with “Pressure setting unavailable or outside practice bounds.”
- Streaming-terrain 3,000 m launch: the same omission/rejection, with a successful
  trim and `world-with-optional-southern-germany-v1` profile.
- Fresh flat 500 m launch afterwards: all six fields return, with no setting rejection.

The transport uses local assets and deliberate HTTP 404 responses for optional
`/scenery/` requests; there is no external DEM request or rendered surface in this
probe. It does not establish what source mix the user's particular flight loaded.

## Source cause and display behavior

[Worker initialization](../../studies/e1-browser/sim/worker.js) initializes launch
QFE from native static pressure, then requires `validSetting(qfe_pa)` before
creating **any** altimeter references. `validSetting` is the separate 80,000–110,000 Pa
practice **setting** range. Its lower boundary corresponds to 1,948.989 m on the
[ideal pressure scale](../../studies/e1-browser/sim/altimeter.js), whereas the
static-pressure converter supports pressure heights from −2,000 through 11,000 m.
A usable current sensor is thus incorrectly made dependent on whether the launch
QFE could be selected on the practice subscale. With null references, every later
worker update returns before reading pressure; this is an initialization gate,
not a transient missing sensor value at 3,000 m.

The current [native bridge source](../../studies/e1-browser/sim/bridge.cpp) reads
`atmosphere/P-psf` and converts psf to Pa without accessing renderer state. The
executing binary's provenance remains unverified, but its actual pressure
functions and finite outputs were exercised here. No missing native export,
explosive ascent or renderer is required to reproduce this specific failure.
An actual out-of-envelope trajectory could independently suppress indication;
the 11,200 m probe demonstrates that separate converter path. Neither such a
trajectory nor a terrain-contact impulse has been observed for the user's flight.

On sensor/reference failure, worker `updateAltimeter()` first clears its published
fields. The [panel](../../app/src/pressure-altimeter-panel.ts) replaces the current
indication on each state, redraws without hands, disables pressure controls and
closes its dialog when data is unavailable. Source inspection therefore finds no
retained previous needle or silently invented geometric altitude. The displayed
“check supported range or rebuild engine” is generic and does not identify the
reproduced QFE gate. These UI observations are source review, not a new browser test.

## Proposed bounded repair

Separate current pressure-sensor availability from whether the launch QFE can be
selected. Preserve supported standard/QNH indication at high launch altitudes,
retain truthful launch-datum metadata, and explicitly disable/explain an
out-of-range launch-QFE preset. Keep the selected-setting practice bounds and the
static-pressure converter's supported envelope unchanged. Add real-worker startup
regressions above and below the launch-QFE threshold.

The [continuation validator](../../studies/e1-browser/sim/continue-flight.js)
currently also restricts recorded `altimeter_qfe_pa` to the selected-setting range.
If lower launch-QFE reference metadata is published, its continuation validation
must be reconciled explicitly; UI/types/trace currently require that reference to
be finite and positive rather than selectable. Do not make accepted recording
references inconsistent across fresh startup and continuation. No runtime fix,
model coefficient, binary rebuild or requirements change is made in this note.

## Evidence and limits

Reproduction: `node output/flight/alps-pressure-probe.mjs` from the repository root.
The ignored local diagnostic script has SHA-256
`62c040d012c4b0272ea2c65c2d476b935d45f0fd3295e08b45da205df522f09a`;
its JSON result at `output/flight/alps-pressure-results.json` has SHA-256
`26f2dd11c88c74f769a2689a8512b8a2e9b750803b6f0e114b7ed4bf2ab508ee`.
The JSON records the exact inputs, raw sensor values, native state and worker
observations. These scratch artifacts are local evidence, not shipped inputs.

The executing `studies/e1-browser/sim/dist/jsbsim.wasm` is 1,768,907 bytes,
SHA-256 `11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`.
Its stale build record describes a different 1,768,911-byte binary, SHA-256
`4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
No reproducible-build or validated 172S claim is made. Model applicability remains
the generic installed c172x research model, as inventoried in [SBOM](../SBOM.md).

Inspected inputs: worker SHA-256
`486599e53658fb80d7a8a2f5e93041264f2713e265b4812d8124e28ccc45e7fa`;
altimeter helper `926376cc3eece4b6ae59a0a8d59a0ebe0593b899aef24072776775a6172dc6e3`;
bridge source `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a`;
panel `283c420a705c1edc9e99ba835ac66affe313dd59f5539f9ace8276559cb74eac`.
Later runtime edits require renewed affected checks.

`node --test studies/e1-browser/sim/altimeter.test.mjs`: six tests pass, zero
skipped. Those existing tests cover conversion/settings and unsupported pressure,
but miss the high-altitude startup gate. The diagnostic's four production-worker
startup/setting assertions pass and reproduce that gate. No browser, full-flight,
terrain fidelity, pressure installation/calibration or independent acceptance
review is claimed.

## Delivered pressure repair (Task159)

The later source repair separates supported raw launch-reference pressure from
selectable practice settings. It keeps the six-field group available at tested
3,000/5,000 m launches, retains QFE metadata in JSON and continuation, and rejects
out-of-subscale QFE selection without a setting or native-state change. The panel
explains and disables that QFE shortcut while QNH, standard and manual settings
remain usable. Missing APIs and the original atmospheric envelope still clear
unavailable data; no native binary, atmosphere, integration step or ABI changed.

Reproduce the modular branch checks with `npm --prefix app run test:pressure-start`
after providing the existing local research engine. Actual worker/WASM cases cover
four high-altitude starts with terrain on/off, a 500 m launch QFE zero, an 11,200 m
unsupported pressure, two-frame JSON roundtrip and native continuation. The real
browser component uses a dedicated production Worker at 3,000 m with terrain off;
manual/QNH/STD preserve paused native state and all engaged AP fields. Unsupported
QFE dispatch is disabled; Review/read-only/unavailable guards and low-altitude QFE
remain functional. This is component integration, not full cockpit or aircraft
calibration acceptance.

On the modular branch, `output/flight/pressure-start-worker-task159.json` SHA-256
`4e346e354ba4f3c50f20e1097b38bf96854d11f555b196c188839ebe893f680e`
and `output/flight/pressure-start-browser.json` SHA-256
`52e1b05cf8670f55266d91eabb47f8aa6f1693a48beea2ab437e6be88cfd4682`
record passing observations. Production source hashes are worker
`936cbf6516ac11d56be84c49bbbf683e43eaffa458a575c3dc660b7f2f8fd96f`,
continuation `eaaa62e88cdbc12e84081aa064dca5a8b04436492e9b2dd1c8172a46e4047820`,
panel `ac77e0f5ba3df8bb5285aa3bf8cd6943d36520770b6116059a79847e8eded7bc`.
The working app has additional unpublished worker features; its pressure panel
and regression are identical and its separate real-browser three-group run passes.
The original diagnostic above describes pre-repair inputs and remains historical.
Native build provenance is still unverified; no terrain/pressure causal claim.
