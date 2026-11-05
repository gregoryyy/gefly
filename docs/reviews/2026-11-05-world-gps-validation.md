# Worldwide GPS validation

2026-11-05 22:25 Europe/Berlin. Independent Codex validate; no implementation,
reviewer browser or added tests. Reviewed isolated source
`4b921b03ec87a6c7960c38be19da67511dbe36ec` and matching working-app modules.

**Bounded pass** for the [France correction](../input/2026-11-05-france-gps-fix.md)
under [R-NAV-5](../SPEC.md). The published slice introduces planner
store/types/editor/CSS/helper; it does **not** wire the complete map/popup/bearing
workflow into its main page. Working-app evidence below is separate.

| Criterion | Observed | Outcome |
| --- | --- | --- |
| Worldwide creation/assignment | One helper accepts finite numeric latitude±90°/longitude±180°, inclusive, across createFix/createWaypoint/setPoint/manual/picked fields. France, western/southern locations and endpoints covered. | Pass — component |
| Atomic rejection and bounded identity/provenance | Invalid coordinates/types preserve snapshot/callback count/ID sequence;64fixes/30waypoints/32route points, anonymous labels and copied immutable provenance retained. Regional catalogue validators unchanged. | Pass — source/22unit cases |
| Editor and picked-position semantics | Five Chrome156component groups verify explicit creation, hemispheres and invalid dispatch. Invalid picks retain previous visible fields with an error; they do not create points. | Pass — component |
| Bearing edge cases | Wrapped/clamped spherical distance; coincident, same-pole and ambiguous antipodal courses are null. Missing/nonfinite heading leaves heading error unavailable. Dateline short-arc fixture passes. | Pass — source/unit |
| Actual working-app France workflow | Trusted Paris/Brest right-clicks create anonymous fix/waypoint; manual Cape fix and GPS target work. Invalid form preserves store. Read-only snapshot instrumentation; paused native step/digest/full vector, AP engagement and four active radio displays remain unchanged. | Pass — working app only |
| Published complete-map integration and wider runtime | Main/map/popup/bearing wiring is absent from this component PR. No running/Review/device matrix, real tile availability, operational GPS/AP or polar rendering acceptance. | Not evaluated |

Reviewed supplied assertions/results:22same core cases pass in each tree;
TypeScript passes. Root596Node+25Python pass without skips. Isolated CI passes
491Node+22Python/85assurance/11training;9/23optional JSBSim and1Linux-only repository
check skipped, not accepted. External peer blocked; no covering acceptance. No blocking local finding.

Planning limits do not expand Web Mercator±85.05113° or strict flight-start±89.5°.
Full-app proof fixtures cartography/optional-source failure; Follow was explicitly
disabled before repositioning. No native build-provenance/fidelity claim.

Matching SHA-256: [store](../../app/src/map-flight-plan.ts)
`e3ed31707d8d5580aa716dd3d10fd6fe0f5fad1f80158b4011df84611029d4e2`;
[helper](../../app/src/map-coordinates.ts)
`05d880f07f321146220a1ab766c6eca5d18cb1b9b0761eeb4ea03fce26b8f025`;
[editor](../../app/src/map-flight-plan-panel.ts)
`45be0a5fea032a9e5942e57392b9834fe223b9e1c1719a574a1d10c39ff3492b`.

Ignored local-only evidence under `output/flight/` requires retention:

- Isolated `world-gps-planner-browser.json`: `b6248d21db76b0a5ffbc39779aa8bfaefcd7aa0373646e8206ecbe6254596ba6`.
- Root `world-gps-map.json`: `820cb1289feb3c75808fbb3a7436528159842a54ebe0e27d3c1945e4859c31ee`.
- Isolated `world-gps-ci.log`: `1316a1de42d3b31179140302be9bf877f447c513292fd066f23453fd346105f2`.

Reproduce component/root fixtures from their respective `app` directories with
`node tests/world-gps-planner.browser.mjs` / `node tests/world-gps-map.browser.mjs`;
root script SHA-256 `ccf6332e38aed6f7052a37fbee2ba3f3fe904cea8a8cd2bec2401c4a6d4ae127`.
