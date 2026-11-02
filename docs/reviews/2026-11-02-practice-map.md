# Local practice map and recorded path

Scope: TODO 2.0.4, partial R-WORLD-1/R-REVIEW-1. A local visual practice aid,
not navigation-chart, regional-model or simulator-milestone acceptance.

Authors: Codex orchestrator/integration, practice_map_core/code1 and
practice_map_ui/code2 in parallel; flight_housekeeping maintained application
instructions alongside implementation. Implementation fingerprint SHA-256:
`d2c6a64168cdb1f74c8265dfe397f414e193f5ee528b5ff3911cdcb2da6d0f91`. Sorted paths: app/package-lock.json, app/package.json, app/src/flight-trace.test.ts, app/src/flight-trace.ts, app/src/main.ts, app/src/practice-map-data.test.ts, app/src/practice-map-data.ts, app/src/practice-map.css, app/src/practice-map.ts, app/tests/smoke.mjs, app/vite.config.ts;
each path + NUL + bytes + NUL. Shared prose is excluded.

## Independent quality

Reviewer: Codex flight_housekeeping, excluding its own app README. Reviewed
finite WGS84 conversion, normalized true heading, imagery corner ordering,
frozen trace sampling, bounded 600-point work at most four times per second,
review/live separation, fixed local resource URLs, failure isolation and disposal.
The P2 finding that the full route could be confused with only the elapsed review
segment was fixed: the legend now says “Whole retained path.” Affected review
passed. The MapLibre worker initially failed under Vite prebundling; it now uses
an explicitly bundled worker URL, with affected quality review and actual browser
readiness checks passing. No remaining scoped blocking findings.

## Independent validation

Reviewer: Codex flight_validate; authored no implementation. Actual Chrome with
the local JSBSim worker, including visual inspection of map/path and reset images:

| Behavior | Observed result | Outcome |
| --- | --- | --- |
| Map ready | Local photographs, gold path and heading marker visible | Pass |
| Live flight | Worker advanced to step 556 with map open; 100.635° marker matched 101° true readout | Pass |
| Review | Home showed initial 49.9600° N, 8.6430° E, 082° true; cursor playback left worker at step 556 | Pass |
| Focus and visibility | Zoom/Fit/Follow restored scene focus; close/reopen worked | Pass |
| Compact viewport | Panel and toggle fit at 390px, without horizontal overflow | Pass |
| Failure isolation | Metadata HTTP 503 showed map error; flight advanced to step 78 | Pass |
| Reset | Old path cleared; initial marker/trace start coincided; Review unavailable | Pass |
| Network/errors | Localhost-only requests; no page errors | Pass |

The orchestrator's 22-group actual-browser smoke passed, covering map/live/history
integration and prior controls, imagery and failure behavior. Strict TypeScript,
production UI build and 26 native application tests passed with no native skips.
Rebuildable raw results and screenshots are ignored under output/flight/.

## Limits

Only the existing bounded Hessen photographs are shown. No terrain, airport
elevation, runway/navaid records, chart, procedure or EDDF/100 NM acceptance is
provided. Trace start is the first retained state, not an airport reference point.
The entire retained route stays visible while the marker follows the selected
review time. Up to 600 points approximate the bounded recorded path; reset/reload
clears it. No physics, aircraft model, persistence or external-service integration
changed. MapLibre 6.16.0 is pinned, with its BSD-3-Clause notice retained in source
and production output. Cross-provider peer review remains pending under the
batched cadence; no training credit or full requirement acceptance is claimed.
