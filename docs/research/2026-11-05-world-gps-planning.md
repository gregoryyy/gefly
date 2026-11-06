# Worldwide custom GPS planning bounds

TODO2.0.157; [R-NAV-5/R-WORLD-6](../SPEC.md). The
[France failure](../input/2026-11-05-france-gps-fix.md) comes from obsolete
regional checks in the [planning store](../../app/src/map-flight-plan.ts) and
[editor](../../app/src/map-flight-plan-panel.ts). Both had coupled custom points
to the published southern-Germany inventory rectangle.

The repair uses one finite WGS84 coordinate policy for custom fixes, route
endpoints/waypoints, manual entry and map picking: latitude −90…90° and longitude
−180…180°, inclusive. Southern/western points need correct hemisphere labels.
The 64-fix, 30-intermediate-waypoint and 32-route-point bounds, optional names,
anonymous stable IDs, copied provenance and mutation/notification atomicity stay
separate from geography. Invalid input must not consume an identifier.

This does not expand the pinned airport, navaid or historical-fix catalogues.
Their source identities, geographic bounds and coverage labels remain unchanged.
Web Mercator display limits (approximately±85.05° latitude) and the separate
strict±89.5° flight-start latitude also remain; accepting a polar planning point
promises neither rendering nor a supported aircraft start.

The working application already contains map/popup/bearing integration. The
isolated publication increment introduces only planner core/types, editor/styles,
shared validation and their checks. Its main page does not yet wire the full GPS
map UX; that remains a later modular slice. Component evidence must not be
presented as complete-map/native acceptance. No new data source, persistence or
receiver/AP coupling is introduced. Delivered component and separate working-app verification are recorded below.


## Delivered checks and scope

The shared core has22passing tests per tree; TypeScript checks pass. The published
component browser has five passing groups (France, other continents, anonymous
fixes/routes, finite bounds, invalid-input atomicity and hemisphere formatting).
Local artifact `output/flight/world-gps-planner-browser.json`, SHA-256
`b6248d21db76b0a5ffbc39779aa8bfaefcd7aa0373646e8206ecbe6254596ba6`.

Separately the working app's actual Paris/Brest right-click, manual Cape Town,
GPS target and invalid-input workflow passes five groups with unchanged paused
native step/digest/fullstate, AP engagement and four active radio displays.
Root-only proof script `app/tests/world-gps-map.browser.mjs` SHA-256
`ccf6332e38aed6f7052a37fbee2ba3f3fe904cea8a8cd2bec2401c4a6d4ae127`;
local artifact `output/flight/world-gps-map.json` SHA-256
`820cb1289feb3c75808fbb3a7436528159842a54ebe0e27d3c1945e4859c31ee`.
That script/integration is not part of this component-only PR; these are local
records, not claimed fresh-checkout assets. Earlier test Follow mode recentered
a scripted second-location jump; disabling Follow through Fit path fixed the
fixture, without a product change.

Root complete checks596Node+25Python pass, zero skips. Isolated sharedCI passes
491Node+22Python application tests,85assurance and11training tests, with nine
optional JSBSim and one Linux-only repository-tool case skipped on macOS. Skips
are not accepted. Source/editor commits are1c2998c and4b921b0.

[External peer router record](../reviews/2026-11-05-world-gps-peer.json) records
CLI2.1.308/nonzero exit/no review/unknown model. The frozen source packet SHA-256
is`d01863c9732df0a847831ac612d46e03a54cd185cd8691392174cf3aad0679a0`;
no covering external acceptance is inferred. No full published map wiring,
worldwide source inventory, persistence or aircraft/operational fidelity claim.
