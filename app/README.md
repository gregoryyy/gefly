# Browser flight prototype

Fly an airborne JSBSim research aircraft with keyboard, touchpad or on-screen
controls, a compact flight deck and cockpit/chase views. CesiumJS displays Hessen
aerial imagery in a bounded practice area around an approximate EDFE starting point. This is an experimental
slice toward the [first browser exercise](../docs/TODO.md), not a completed or
validated PPL exercise.

## Run locally

From the repository root:

```sh
npm --prefix app ci
just build-flight-engine   # first run: downloads the pinned SDK and JSBSim sources
just fly
```

Open the local URL printed by the development server, then select **Start flight**.
The application loads paused so the aircraft cannot fly away while you inspect
the controls. Starting or resetting uses the same airborne initial state near
approximate EDFE coordinates: 1,300 ft of study altitude and 90 kt true airspeed.

The engine build reuses the [existing browser study recipe](../studies/e1-browser/sim/README.md).
Its generated WASM and bundled research-model data stay in ignored local build
directories; they are not committed or supplied as a public simulator download.
A missing or failed engine build is an error, not a switch to scripted flight.

## Controls

| Input | Action |
| --- | --- |
| Arrow up/down | Push nose down / pull nose up |
| Arrow left/right | Ailerons |
| A / D | Rudder |
| W / S | Increase / decrease throttle |
| Space | Start / pause / resume |
| R | Reset flight |
| V | Switch cockpit / chase view |

Press and hold the on-screen flight buttons, or drag the virtual joystick to
control pitch and roll; releasing returns the stick to neutral. Touchpad users
can operate these controls with the pointer. The flight deck displays control
positions. Flight buttons return keyboard focus to the scene; range controls
retain focus for accessible adjustment. Losing window focus pauses the flight
and releases held inputs. Optional flight hardware and phone orientation are
later work.

Open **Controls** in the header to adjust pitch, roll and rudder sensitivity from
25% to 150%. **Default** uses 100% on all three axes; **Gentle** uses 50% pitch,
50% roll and 70% rudder. Opening the dialog pauses flight. Changing settings,
selecting **Done**, or pressing Escape does not resume it; use **Start flight**
or **Resume flight** when ready. Closing the dialog returns keyboard focus to
the flight scene.

To compare the response, start a flight, open **Controls**, select **Gentle**,
then **Done** and **Resume flight**. Try a small stick movement or a brief held
button input. Repeat with **Default** to compare. Sensitivity settings last for
the current page session; restarting the flight with R preserves them. They
change input response, not the aircraft's physics or calibration.

The visible **study roll offset** starts at the existing E1 fixture's empirical
−0.109375 aileron input to counter this generic model's initial roll-off. Adjust
it to zero for unassisted roll input. It is an experimental assist, not a sourced
aircraft trim value. Sensitivity changes do not scale this offset.

## Imagery and network access

CesiumJS 1.146.0 displays a bundled, openly licensed starter photograph from the
official Hessen HVBG dataset. The detailed approximately 3 × 2.8 km footprint is bounded
by 8.62–8.66° E and 49.95–49.975° N around EDFE. A coarse 512-pixel regional overview covers 8.4–8.9° E / 49.8–50.1° N
beyond the detailed foreground. Both photographs load once from the local
application; it does not depend on the live WMS or swap detail tiles while flying.
Outside the detail footprint the scene labels the coarse overview; outside the
overview footprint it reports missing photographic coverage.

[Source bounds, request, image hash and license](public/imagery/SOURCE.json) are
versioned with the asset. The [ATKIS DOP20 dataset](https://opendata.hessen.de/de/dataset/atkis-dop-20)
is published under [Data licence Germany – Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
The source image date is unknown; this is not current airport or chart information.
This small starter scene does not implement the EDDF/100 NM region.

Application, engine and imagery requests are local. There are no application
telemetry, account, provider/AI or learner-record uploads. Source refresh is a
separate deliberate update rather than a runtime dependency.

## What the prototype represents

- Dynamics run in the existing JSBSim module Web Worker at a fixed 1/120 s step,
  independently of rendering.
- The local study model is JSBSim's generic `c172x` (172P research configuration),
  **not the selected project-owned 172S**. Its model/data rights and applicability
  remain as documented in the study; it is not redistributed here.
- Aerial imagery is draped on the WGS-84 ellipsoid. There is no actual elevation
  model or accepted EDFE airport-height alignment. Imagery does not establish
  authoritative runway geometry, navigation data or chart material.
- Airspeed is **TAS**, not indicated airspeed. Heading is **true**, not magnetic.
  The altitude is the study's JSBSim height output with an unresolved local datum;
  it is not a QNH/QFE pressure-altimeter simulation.
- Aircraft handling, cockpit instrumentation and approach/landing behavior have
  not been validated for flight training. QNH/QFE/standard pressure, navigation,
  checklists, radio and a scored circuit remain future increments.

See [ARCH](../docs/ARCH.md), [SPEC](../docs/SPEC.md) and
[contributor rules](../AGENTS.md) for the intended simulator and source boundaries.

## Verify

```sh
npm --prefix app run build     # strict TypeScript and UI bundle; excludes research runtime
npm --prefix app test          # worker/session lifecycle and input validation
npm --prefix app run test:browser  # real JSBSim; local engine and installed Chrome required
```

Node.js 24.2+ is required. The browser check starts its own temporary server on
127.0.0.1:5174 and writes ignored screenshots to `output/flight/`. Set `CHROME` to
an executable path if Chrome is not installed in its usual location. `just fly`
uses 127.0.0.1:5173. Without `just`, invoke the study build with
`bash studies/e1-browser/sim/build.sh output/flight/engine-build`, then
`npm --prefix app run dev`.
