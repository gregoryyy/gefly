# Simulation-speed badge above the flight map

TODO2.0.156; R-SIM-9/R-UX-2.

The [speed badge stylesheet](../../app/src/flight-assists.css) originally used
z-index3 while the sibling [flight map](../../app/src/practice-map.css) uses6,
so the open map covered the badge. The bounded fix raises the badge to7, below
the top bar's8 and modal dialogs. Position and pointer pass-through remain
unchanged; no engine, control, data source or dependency changes are needed.

Independent component browser acceptance is recorded below. No permanent tests are added for this reversible CSS change.
The isolated branch is stacked on [PR87](https://github.com/gregoryyy/gefly/pull/87).
Cross-provider review remains peer pending; prior blocked Claude attempts do not
establish acceptance of this change.


Component verification passes in Chrome156.0.8078.80 at1440×900 and390×844:
SIM10×/REPLAY2× paint above the open map, map clicks pass through, topbar/modal
priority and map-closed visibility hold. Computed layers are badge7/map6/topbar8.
Both screenshots were inspected. This excludes full simulator, real source tiles
and WebKit acceptance. No permanent test was added for this one-property change.
Local ignored artifact `output/flight/speed-overlay-browser.json`, SHA-256
`957f195cf051e33c9fdc4c8bde8e330628cd75683ca2224b7704dbb868e303ee`.

A fresh external Claude CLI2.1.308 attempt returned a nonzero exit, no review and
unknown model identity. [Router record](../reviews/2026-11-05-speed-overlay-peer.json).
Its frozen source revision is5a18ec5 and packet SHA-256
`71e8fce6314e9a12f79e5230f6a2853f8de82af0f377fe79c435d2e027908360`.
Peer quality/validation remain blocked, not passed; this is a draft UI increment.

Shared `just ci` passes:469Node+22Python app tests,85assurance and11training
tests. Nine optional JSBSim cases and one Linux-only repository case skip on
macOS; they are not accepted. No new permanent tests were introduced.
