# Recorded controls, critical airspeeds and cockpit fitting

Scope: TODO 2.0.20–2.0.22; partial R-AIR-2/R-DATA-1/R-INPUT-1/R-VIEW-1/R-REVIEW-1.
Authors: Codex orchestrator on read-only engine telemetry, state/trace integration,
shared records and regression adaptation; fov_input/code1 on Review UI/shortcut
and browser coverage; panel_scaling/code2 on measured layout/CSS/browser coverage;
fov_housekeeping on source-backed airspeed references/rendering and the immutable
input record. Housekeeping ran alongside both implementation streams.

Implementation SHA-256: `668caed66389cfccb361ea59dd7ac59521097b6cc62f7ca8666eaefd4b009658`.
Sorted paths use path + NUL + bytes + NUL; shared prose is excluded:

app/package.json, app/src/airspeed-markings.test.ts, app/src/airspeed-markings.ts, app/src/autopilot-panel.ts, app/src/cockpit-layout.ts, app/src/engine-panel.ts, app/src/flight-review-controls.ts, app/src/flight-trace.test.ts, app/src/flight-trace.ts, app/src/main.ts, app/src/radio-nav-panel.ts, app/src/session.test.ts, app/src/session.ts, app/src/six-pack.ts, app/src/style.css, app/src/types.ts, app/tests/avionics-smoke.mjs, app/tests/engine-smoke.mjs, app/tests/panel-layout.browser.mjs, app/tests/review-controls.browser.mjs, app/tests/smoke.mjs, studies/e1-browser/sim/bridge.cpp, studies/e1-browser/sim/build.sh, studies/e1-browser/sim/cockpit.js, studies/e1-browser/sim/cockpit.test.mjs, studies/e1-browser/sim/worker.js.

Local research WASM SHA-256:
`c7aa36a51faee51ec4dcfedf29b14ca0537314519e83da48e9fe49277c718d4f`.
Pinned JSBSim/aircraft source and coefficients are unchanged. The getter is outside
the original 14-double dynamics/digest buffer. No generated engine or manual
assets are committed.

## Independent quality

fov_housekeeping independently reviewed the root telemetry/session/trace changes,
excluding its own airspeed work. Pass: optional whole-group validation, finite
values, command bounds, actual differential-surface radians, allowlisted copying,
frozen samples and rejected same-step control rewrites. It ran 41 affected native
tests and actual 240-step WASM runs with/without repeated getters; full state and
digest matched. Root separately verified 120-step read-only invariance.

panel_scaling independently reviewed main/Review UI and portal integration,
excluding its own layout. Pass: selected recorded values, no Review control writes,
restored pending live settings, guarded R toggle, unique disposal and unchanged
worker identity/physics. Its independent run of the four-group actual-worker
Review regression passed.

fov_input independently reviewed the airspeed/profile/source/six-pack and layout
module/CSS, excluding its own main/Review work. Pass: POH Figures 2-1/5-3 and
local PDF hash match the KCAS facts/configuration, installed KIAS values are not
substituted, TAS clears all CAS markings, and source applicability is explicit.
Three native markings tests passed. The layout uses one measured zoom and
canonical faces/fonts/controls, prioritizes primary instruments, reserves Review
space and cleans observers. Nine viewport/portal cases support the affected
responsive behavior. No outstanding quality findings.

## Independent specification validation

trim_validate independently recomputed the implementation hash and passed seven
criterion groups on actual Chrome/JSBSim: CAS arcs/labels and rendered TAS
suppression; exact selected recorded commands/surfaces/brakes/flap/trim/power/mixture;
frozen worker step/digest/full 14-state; R toggle, guards, no restart and staged
restoration; shared scale/content height with eight breakpoint/view cases; fresh
390 px Engine/Radio access; and simulated legacy missing telemetry with
unavailable values. Review overlays and read-only modal access pass.

The mobile screenshot has controls at y110–252, transport y268–400 and deck
y412–844, with no overlap. Evidence: output/flight/review-speeds-layout-independent.json,
review-legacy-independent.json and their PNGs. No outstanding validation findings.
This is UI/state validation, not aircraft or training acceptance.

## Reproducible evidence

- `npm --prefix app test`: source/state/trace/session cases, including old-engine
  absence and rejected partial control groups; localhost tests require socket access.
- `npm --prefix app run test:browser`: actual JSBSim/Chrome integration, recorded
  controls, camera/input, avionics, nine layout viewports, portal transitions and
  fresh mobile. Runtime assets must first be built with `just build-flight-engine`.
- `npm --prefix app run build`, `just check`, `just ci`, `just assure check`
  and `just assure diff HEAD`: integrated build/repository/lineage gates.

Ignored reproducible outputs: review-panel-source.txt, control-telemetry-physics.json,
review-controls-{desktop,mobile}.png, panel-layout.json/png and the browser/CI logs
under output/flight/. Independent validation names its additional evidence below.

## Integrated regression result

The complete `npm --prefix app run test:browser` command passed at the frozen
implementation: eight landing-physics checks, 82 checks across nine Chrome
functional suites, plus the layout suite with nine viewport cases, fresh mobile,
portal transitions and Review spacing. This includes the adapted inline-autopilot
and recorded-throttle expectations. TypeScript and the production UI build pass.
Shared `just ci` passed: 104 app native tests, five Python aircraft-adapter tests,
TypeScript/UI build, 84 assurance tests, 11 assessment tests and repository/study/
render gates. Optional native JSBSim cases remain explicit skips (9 of 23); the
Linux-only fixture is not Mac runtime evidence. Final foundation/assurance
integrity and lineage diff were checked for publication.

## Applicability and remaining limits

The [manufacturer source note](../research/2026-11-02-c172p-airspeed-markings.md)
distinguishes the active research 1982 C172P from the planned C172S, and fixed
KCAS references from installed IAS markings. Stall references use 2400 lb,
forward CG, power off and zero bank. They are not dynamic stall predictions or
accepted JSBSim/aircraft limits. TAS-only engines suppress CAS markings.

Review remains a bounded, session-only sampled-state trace; no full input-event
replay, persistence, video export or training acceptance is established. Legacy
engines without the optional group show unavailable control values. Engine/Radio
collapse at 900 px, NAV at 620 px, with primary instruments and AP/flap/trim inline.
On narrow Review layouts the cockpit scale decreases uniformly to reserve readable
recorded data and timeline space. Modern AP ALT/NAV/APR/REV remain explicitly INOP.
Cross-provider peer remains pending under the existing batched cadence.
