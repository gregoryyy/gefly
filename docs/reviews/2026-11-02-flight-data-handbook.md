# Flight-path and ground-reaction data; aircraft reference handbook

Scope: TODO 2.0.23–2.0.24; partial R-SIM-3/R-VIEW-1/R-REVIEW-1/R-AIR-2/R-DATA-1.
Authors: Codex orchestrator on integration/shared records; fov_input/code1 on
flight-gradient/panel/tests; panel_scaling/code2 on handbook/UI/tests;
fov_housekeeping on parallel input/source research and diagram facts.

Implementation SHA-256: `7769179693ac760eda7869b220e3964f6d6bc7478f92befd1c310ee0647208a8`.
Sorted paths, path + NUL + bytes + NUL, excluding shared prose:

app/package.json, app/src/aircraft-handbook-data.ts, app/src/aircraft-handbook.css, app/src/aircraft-handbook.ts, app/src/flight-path-gradient.test.ts, app/src/flight-path-gradient.ts, app/src/flight-path-ground.css, app/src/flight-path-ground.ts, app/src/main.ts, app/tests/flight-data.browser.mjs, app/tests/handbook.browser.mjs, app/tests/review-controls.browser.mjs.

## Independent quality

panel_scaling independently reviewed flight-gradient and panel source, excluding
its own handbook. Pass: horizontal hypot from captured heading-aligned velocities,
negative NED down for upward speed, divide-before-percent arithmetic, explicit
finite/range and low-speed outcomes, source-backed normal strut load, selected
recorded values and correct display conversions. Five native gradient groups
and TypeScript checks passed.

fov_housekeeping independently reviewed root integration and the flight-data /
handbook UI, excluding its own diagram data/research. Pass with no findings:
selected-state/null/legacy behavior, modeless shortcut/focus/layout handling,
Handbook pause/no-resume, escaped HTTPS sources and local-only SVG/table assets.
It independently ran gradient tests/TypeScript/diff checks and inspected browser
evidence and screenshots.

fov_input independently reviewed Handbook UI and the authored data/source facts,
excluding its own flight panel and Review regression. It visually checked POH
pages 19/22/23/80/105 and pinned XML contacts, data/diagram conditions and units,
then inspected the final four-diagram mobile/desktop renders. Renewed quality
passes without findings, including the clarified load-factor/VA references.
The orchestrator separately reviewed the code1-authored Review-test repair: it
seeks inside two actual sample times, verifies the native slider stays inside
that interval and checks the exact displayed step before all prior assertions.
This review excludes the orchestrator-authored UI/integration from acceptance.

## Independent specification validation

trim_validate independently recomputed the frozen hash and passed six actual
Chrome/JSBSim criterion groups, with no implementation authorship:

- Ground flight-path gradient, horizontal/vertical speed and all three wheels'
  contact/load/compression/slip/structure indications match selected immutable
  recorded states. Actual landing rebound +2.6% correctly indicates climb.
- Independent rendered fixtures show +10% climb, -5% descent, low groundspeed
  unavailable below 1 m/s, and missing ground values as unavailable.
- Flight Data stays modeless without pausing live flight or changing deck size;
  keyboard containment, close/Escape/focus and frozen Review full physical state,
  step and digest pass.
- Handbook pauses live flight or Review playback; closing never resumes or seeks.
  R and other modal shortcuts are isolated. Requests stay local.
- Fresh 390 px layout provides the SVG diagrams, tables, scrolling and close;
  the original three-figure coverage is renewed below for the fourth figure.
- Manufacturer POH pages 2-7/6-14 and 2-4/5-12 were visually checked independently;
  PDF/model hashes and all six structural contact coordinates match the source.

Evidence: output/flight/data-handbook-independent.json and corresponding recorded /
mobile gear PNGs. Source PDF renders are disposable local extraction artifacts.
No PDF or page image is shipped.

### Clarified flight-envelope validation renewal

At the final 12-path hash, trim_validate independently checked a fresh actual
four-diagram Handbook and POH pages 19/23. Four CAS and three load-factor dashed
guides match their transformed chart coordinates; accessible tables contain the
exact normal-category factor and weight/VA rows with KCAS distinct from KIAS.
There is no filled polygon, stall/gust curve or fabricated live point. Mobile
chart x36–354 fits its dialog; chart/tables/close and no horizontal overflow pass.
Previous six groups remain applicable, with diagram count updated to four.
Evidence: envelope-independent.json and desktop/mobile PNGs in output/flight.
No outstanding validation findings; this does not accept a full V-n envelope.

## Reproduction and regression evidence

`npm --prefix app test` passes 109 native tests plus five aircraft-adapter tests.
TypeScript passes. New actual-worker browser suites pass four Flight Data groups
and three Handbook groups. The former checks landing/live/recorded data, units,
frozen Review and mobile/shortcut behavior; the latter checks sources/tables,
modal pause/focus/Review and local-only mobile diagram access.

Commands: `node app/tests/flight-data.browser.mjs`,
`node app/tests/handbook.browser.mjs`, and the existing smoke, Review-controls and
panel-layout suites. Build the local research engine before browser checks. No
new engine getter, worker state field, dynamics coefficient or runtime dependency
is added in this increment. Existing smoke regression passes 26 groups, recorded-control regression passes
four groups, and layout regression passes nine viewport cases plus portal/Review
checks. The Review regression initially exposed Chrome rounding an exact range
timestamp below a sample boundary; the corrected test seeks strictly inside the
actual captured-frame interval and checks the displayed step while retaining all
recorded-value/physics assertions. Product floor-seek behavior was correct.
Shared `just ci` passed: 109 app native tests, five Python aircraft-adapter tests,
TypeScript/UI build, 84 assurance tests and 11 assessment tests, plus repository/
study/render gates. Optional native JSBSim cases remain explicit skips (9 of 23),
and the Linux-only fixture is not Mac runtime evidence. Final foundation/assurance
integrity and lineage diff were checked for publication.

## Source boundaries and limits

[Diagram-source note](../research/2026-11-02-c172p-handbook-diagrams.md) and
[airspeed note](../research/2026-11-02-c172p-airspeed-markings.md) document the exact
active research 1982 C172P variant, sources, hashes and reference conditions.
The handbook draws original vectors from numeric facts; it includes a normal
CG reference and published flight-envelope load-factor/speed references, not a
live loading calculator or complete approved V-n envelope. Normal category
2400 lb flaps-up +3.8/−1.52 and flaps-down +3.0 are reference limits. VA values
97/91/81 KCAS at 2400/2000/1600 lb remain separate from KIAS. Negative flaps-down,
stall/gust boundaries, current load-factor points and damage thresholds are not
inferred. Guides are unfilled and distinctly labeled as reference quantities. The 1500 lb plot floor is a crop,
not a certified minimum weight. Model structural coordinates use inches with
+X aft, +Y right, +Z up, distinct from CG arm and flight/body frames.

Flight-path percent is ground-relative slope, not pitch, aerodynamic glide ratio
or ILS deviation. Positive is climb and negative descent. The 1 m/s horizontal
speed floor is display policy. Wheel load means the current model strut
compression reaction, not complete contact-force vector, component stress,
structural damage or an accepted aircraft load limit. Review stays a sampled
trace. Aircraft/training acceptance and cross-provider peer remain outside this
bounded increment; peer is pending under the existing cadence.
