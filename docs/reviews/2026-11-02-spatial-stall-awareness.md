# Spatial wing airflow-angle estimates

Scope: TODO 2.0.25, partial R-SIM-7/R-VIEW-1/R-REVIEW-1. Actual regional
stall/separation remains TODO 2.0.26. Base implementation: 71d8a70.
Authors: Codex orchestrator on read-only telemetry/shared integration;
fov_input/code1 on pure spatial calculations/tests; panel_scaling/code2 on the
original SVG/accessible panel/browser test; fov_housekeeping on parallel inputs
and primary-source research. Independent quality: fov_housekeeping on code,
excluding its research/input; fov_input on root integration/UI, excluding its
helper/tests. Independent validation: trim_validate, no implementation authored.

Implementation SHA-256:
`7b15ab2a8dc46a0708404ad1020e20341b24ba7341b1f8c3c1e5369cf65ae6e1`.
Sorted paths use path + NUL + bytes + NUL; shared prose excluded:

app/package.json, app/src/flight-trace.test.ts, app/src/flight-trace.ts, app/src/main.ts, app/src/session.test.ts, app/src/session.ts, app/src/spatial-stall.test.ts, app/src/spatial-stall.ts, app/src/stall-awareness-panel.css, app/src/stall-awareness-panel.ts, app/src/types.ts, app/tests/stall-awareness.browser.mjs, studies/e1-browser/sim/bridge.cpp, studies/e1-browser/sim/build.sh, studies/e1-browser/sim/cockpit.js, studies/e1-browser/sim/cockpit.test.mjs, studies/e1-browser/sim/worker.js.

Local research WASM SHA-256:
`caf1ca1a99ebae3134ba266bb5efb36c21022aff6ac17873e8eb37107b40f4f6`.
The pinned JSBSim/model source and coefficients are unchanged. No generated
engine/model data or external artwork is committed.

## Independent quality

Both scoped reviewers pass without remaining findings. Frame/units follow the
pinned source: body air-relative motion, aerodynamic angular rates and actual
structural CG in SI; aft/right/up coordinates convert to CG-relative body
forward/right/down. Six reference-span stations compute Vair + omega × r and
atan2(local down, local forward). Common positive alpha-max/85% references do not
claim section-specific critical angles or measured separation. Negative-angle
stall boundaries are explicitly unavailable as a physical inference.

The optional 13-field group is atomic and finite, with an uncapped nonnegative
software warning and separate 0/1 hysteresis state. Session/trace copy allowlisted
values, freeze samples and reject partial groups or same-clock airflow rewrites.
An additional independent trace probe preserved prior samples across paused
radio changes and rejected forged/removed/partial airflow metadata. Old engines
without the getter remain unavailable. Rendering never feeds the engine.

Independent tests: six pure helper groups plus 44 session/trace/cockpit groups
pass without skips. The rebuilt WASM getter returns 13 finite initialized values
and does not mutate the original 14-state/digest. With/without repeated reads,
240-step runs match exactly (digest d013ca88bdd835c9); pre-initialization getters
stay NaN. Evidence: output/flight/stall-awareness-quality-getter.json includes
method, result, engine hash and individual source hashes.

An extensionless mixed runtime import in the new trace test was caught and
fixed before the full native run; it was a test-loading error, not an engine
change. Final app native suite passes 118 tests plus five Python adapter tests;
TypeScript passes. UI/source reviewers inspected actual desktop/mobile and
reference-fixture screenshots, lifecycle/focus/escaping, read-only selected state,
unknown regions and positive-reference limitations.

## Browser evidence and validation

The focused actual Chrome/JSBSim browser suite passes three groups: actual atomic
airflow drives all six numeric readings; actual roll produces left/right
kinematic differences and selected Review remains immutable; isolated presentation
fixtures cover reference bands/raw warning/missing/zero/low/reverse flow. At
p=0.3888159351894479 rad/s, actual left outer proxy is -0.7386951087 degrees and
right outer 3.6567814274 degrees. The selected recorded sample is step 20; full
physical state, step and digest remain frozen. Fresh 390 px layout passes.
These observations validate the diagnostic calculations/UI, not sectional stall.

Ignored evidence: stall-awareness-browser.json; stall-awareness-actual-roll.png,
stall-awareness-mobile-review.png and stall-awareness-reference-fixture.png under
output/flight. Reproduce with `node app/tests/stall-awareness.browser.mjs` after
`just build-flight-engine`; `npm --prefix app test` covers pure/state/trace tests.
Independent trim_validate passes four frozen-source criterion groups. It
recomputed all six station estimates from actual motion/current CG within
1e-12 rad, checked real roll and Home/End immutable Review with unchanged full
physics/step/digest, and independently inspected source frame/warning semantics.
Actual 1200 px and mobile layout, overlay exclusion, keyboard/Escape/focus and
unchanged deck height pass. Separate rendered fixtures include uncapped warning
2.75, reference bands, low/reverse flow, per-station/all-station overflow and
legacy missing telemetry; unavailable values remain unknown. Evidence:
output/flight/stall-independent.json and roll/mobile PNGs. No outstanding
validation findings; actual sectional stall physics is not accepted.

Existing Flight Data (four groups), Review controls (four) and smoke (26)
regressions pass with the new telemetry/panel integrated. Shared `just ci` passed: 118 app native tests, five Python adapter tests,
TypeScript/UI build, 84 assurance tests and 11 assessment tests plus repository/
study/render gates. Optional JSBSim cases remain explicit skips (9 of 23), and
the Linux-only fixture is not Mac runtime evidence. Final foundation/assurance
integrity and lineage diff were checked for publication.

## Limits and acceptance boundary

The [primary-source note](../research/2026-11-02-spatial-stall-awareness.md)
identifies the lumped research C172P model and why its unused 14/50 right-tip
helper is not reused. Reference-line stations are a visualization choice, not
measured aerodynamic-part centers. The diagram uses a common positive global
reference: below-reference does not mean safe or attached flow, and at-reference
does not assert a section has stalled. Tail and fuselage remain unknown.

Wing twist/chord/incidence distributions, induced flow/downwash, spatial wind
gradients and local flap/aileron/tail behavior are unresolved. Low/reversed local
flow and numeric overflow stay unavailable per station; one invalid station does
not fabricate others. Actual regional separation/aircraft fidelity/training
acceptance requires the separate TODO 2.0.26 model/data/reference work. The
read-only proxy adds no aerodynamic forces or structural-damage thresholds.
Cross-provider peer remains pending under the existing cadence.
