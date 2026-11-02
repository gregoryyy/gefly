# Browser flight prototype

Fly an airborne JSBSim research aircraft with keyboard or touchpad input, a
procedural 3D scene, cockpit/chase views and basic flight instruments. This is an
experimental vertical slice toward the [first browser exercise](../docs/TODO.md),
not a completed or validated PPL exercise.

## Run locally

From the repository root:

```sh
npm --prefix app ci
just build-flight-engine   # first run: downloads the pinned SDK and JSBSim sources
just fly
```

Open the local URL printed by the development server. The engine build reuses the
[existing browser study recipe](../studies/e1-browser/sim/README.md). Its generated
WASM and bundled research-model data stay in ignored local build directories;
they are not committed or supplied as a public simulator download. A missing or
failed engine build is an error, not a switch to scripted flight.

The flight starts airborne near an approximate EDFE reference point, at 1,300 ft
of study altitude and 90 kt true airspeed. Reset returns to this initial state.

## Controls

| Input | Action |
| --- | --- |
| Arrow up/down | Push nose down / pull nose up |
| Arrow left/right | Ailerons |
| A / D | Rudder |
| W / S | Increase / decrease throttle |
| Space | Pause / resume |
| R | Reset flight |
| V | Switch cockpit / chase view |

Use the on-screen touchpad control to enable the virtual stick; its position
controls elevator and ailerons. The display shows the current control positions. Clicking flight buttons returns keyboard focus to the scene; range controls retain focus for accessible adjustment. The visible **study roll offset** starts at the existing E1 fixture’s empirical −0.109375 aileron input to counter this generic model’s initial roll-off. Adjust it to zero for unassisted roll input. It is an experimental assist, not a sourced aircraft trim value.
Optional flight hardware and phone orientation are later work.

## What the prototype represents

- Dynamics run in the existing JSBSim module Web Worker at a fixed 1/120 s step,
  independently of rendering.
- The local study model is JSBSim's generic `c172x` (172P research configuration),
  **not the selected project-owned 172S**. Its model/data rights and applicability
  remain as documented in the study; it is not redistributed here.
- Ground, runway and buildings are illustrative procedural geometry. The ground
  is a flat sea-level reference, not actual EDFE terrain, airport elevation,
  runway geometry or navigational chart material.
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
npm --prefix app test          # worker/session lifecycle, input validation, served engine path
npm --prefix app run test:browser  # real JSBSim; local engine and installed Chrome required
```

The browser smoke also serves a temporary runtime copy without
`dist/jsbsim.{mjs,wasm}` (through `GEFLY_FLIGHT_RUNTIME`) and checks the build hint.
Only the failed `dist/jsbsim.mjs` import is exercised; a missing `jsbsim.wasm`
alone is not separately covered.

Node.js 24.2+ is required. The browser check starts its own temporary servers on 127.0.0.1:5174 and 5175 and writes ignored screenshots to `output/flight/`. Set `CHROME` to an executable path if Chrome is not installed in its usual location. `just fly` uses 127.0.0.1:5173. Without `just`, invoke the study build with `bash studies/e1-browser/sim/build.sh output/flight/engine-build`, then `npm --prefix app run dev`.
