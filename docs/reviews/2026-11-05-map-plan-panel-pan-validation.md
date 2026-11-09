# GPS map plans and cockpit-panel pan validation

Reviewed 2026-11-05 00:43 Europe/Berlin by independent Codex `validate`.
The validator authored neither implementation nor acceptance tests. Scope:
TODO 2.0.123 / R-NAV-5 and TODO 2.0.124 / the bounded pan slice of R-PANEL-1,
following the [GPS/plan request](../input/2026-11-05-map-gps-flight-plan.md)
and [panel-pan request](../input/2026-11-05-panel-pan.md). Earlier panel reviews
remain historical; the latest request supersedes their drag/pan restrictions.

Recommendation: **pass for both bounded local increments at the recorded
freeze**. No unresolved in-scope specification failure remains. This is separate
from quality, cross-provider peer, milestone/release or aircraft/navigation
fidelity acceptance. Peer remains pending.

## Reviewed artifact and evidence

Working-tree base: `700dd5386125f9864a391f85b277cb71da55290a`; the reviewed
working tree is not a committed revision. Final SHA-256 inputs:

| Input | SHA-256 |
| --- | --- |
| `app/src/map-flight-plan-types.ts` | `b7bd211e2381cd1041f93a59b74779cb501909e4aae2aad239a3f0babcd439fa` |
| `app/src/map-flight-plan.ts` | `65ec74a6eb0e069dbc98f2e507cf640e15ec96c10ce9ca49af022f9401c3cfe6` |
| `app/src/map-flight-plan.test.ts` | `c8b90e3ac0baf370f10c4a0d5d0c173fb8c0fa990eabbc34305cff13ff4dcecd` |
| `app/src/map-flight-plan-panel.ts` | `7088106b3cb1fcea6c7bc3d6b7ebd2bccb44521c95ad6bf7cdfaae4467a6a494` |
| `app/src/map-flight-plan-panel.css` | `126feb51462c3381901afb76bee1b73186d1b9751c32e3e178998762d525999f` |
| `app/src/practice-map.ts` | `4a61a289ed1a48599bcf3f8af868655fbd35136db06df490ec19f210b94c3236` |
| `app/src/map-point-popup.ts` | `71b27b734af9f155e69db1c5a5b2553dd5983a7e9e883857c0ebcc95950958a0` |
| `app/src/practice-map.css` | `125e4c0b78cd67adb0c655e44f85b96ce01d604b4ef05b10a24066dd74260bd9` |
| `app/src/panel-zoom.ts` | `3acb570345a152745ec0bdb2b46551aad6f34e63d53fb91b1d000438ca49e0ce` |
| `app/src/panel-zoom.test.ts` | `e268d22e534310d8b308047e58ccc98205842d26f3cdc4b2e7cd8bdcca3d332a` |
| `app/src/cockpit-layout.ts` | `c9df3027f19a4d01d1834f7556864a2d869f205eb360d96ea8f5e6c4e455114b` |
| `app/src/style.css` | `42d274d346684ecded44e5fac0901c1b7a5add0f38b87ec8713c275783aec906` |
| `app/tests/map-flight-plan.browser.mjs` | `de8b3a7079ab94b3bd0152e67cb3686047b69b6de92e9685935d789c673bc1cd` |
| `app/tests/panel-layout.browser.mjs` | `96e4555de2f0941c28e770d57e3fbbeb11bad8f00c45203edd678202c6f77933` |
| `app/tests/fov-smoke.mjs` | `0656b67b168c23944ca9083c22d121f6435c4f86a38bea505b6b3244d148f579` |
| `docs/SPEC.md` | `5c02e117eb5fd1b550c14936737d0d84e054991c40ccb2e0079944903aff36d6` |

The validator independently executed
`node --test src/map-flight-plan.test.ts src/panel-zoom.test.ts` from `app/`:
**26 tests pass, zero skipped** (12 plan cases and 14 panel geometry cases).
No dependency installation or shared CI was started by this reviewer.

The integration owner executed and confirmed exit 0 for the final
`node tests/map-flight-plan.browser.mjs`, `node tests/panel-layout.browser.mjs`
and `node tests/fov-smoke.mjs` from `app/`, plus the existing twelve-group
right-map regression. The validator inspected their source and final artifacts,
not merely the exit summaries. It did not claim to have executed those entire
browser suites independently. The final application suite reports 439 Node
cases and two six-case Python suites passing, with the final UI build passing.
These are integration-owner results, separate from the 26 independent cases.

| Local evidence under `output/flight/` | SHA-256 |
| --- | --- |
| `map-flight-plan-browser.json` | `dfa5dbcff671e6c5098eea5e5e5ab0c8c55f0239bc077030720a059f74187d6f` |
| `panel-pointer-zoom.json` | `6172a637182ba5dd9888b6edb08b785a280e71b740f9e77cbeba4b1914fa123f` |
| `panel-layout.json` | `6e51a26d27a48217edfc7137e4e1c7c75ef1e61664a1def2bd40b67709c17192` |
| `panel-pan-review-independent.json` | `10549e4fe64f8d06cbf5f043f685090a23df0fbc1b1090b1cf031ccb98a4b2a7` |

Browser logs: `map-flight-plan-browser.log`, `map-flight-plan-legacy-map.log`,
`panel-drag-browser.log` and `panel-drag-fov-browser.log`. They use Chrome
156.0.8078.80, actual local application/WASM state and deterministic scenery
pixels. No imagery or operational navigation accuracy is inferred. These are
disposable local artifacts, not a hosted CI or publication result.

## Independent numerical and Review checks

For a separate spherical numerical oracle, the validator built the synthetic
route `(49.96°N,8.643043°E) → (50°N,8.8°E) → (50.1°N,9°E) →
(50.2°N,9.2°E)`. It independently computed distances from unit-vector dot products
and the spherical law of cosines, and bearings from local east/north tangent
vectors, using the declared 6,371,000 m sphere and 1 NM = 1,852 m. Each model leg
agrees within 1e-8 NM/degree:

| Leg | Distance NM | Initial course TRUE |
| --- | ---: | ---: |
| 1 | 6.518540885 | 68.321167186° |
| 2 | 9.772519742 | 52.016476833° |
| 3 | 9.759838786 | 51.958374358° |

Independent total: 26.050899414 NM. This checks arithmetic and units, not an
ellipsoidal route, surveyed fix or usable real-world procedure. Cardinal,
coincident, missing-heading and antipodal/polar cases are also covered by the
independently executed model suite.

The validator separately exercised a fresh actual 1440×900 browser/WASM session
on local port 5288 using the existing scenery fixture. It ran beyond step 30,
paused, entered Review, zoomed the VSI, dragged the housing and scrolled
horizontally. The trusted drag moves the surface exactly **(+50, −30) CSS px**;
horizontal scrolling moves it **(−180, 0) CSS px**. Each inspected position fills
the frame vertically. Panel/scene rectangles and camera FOV remain unchanged;
actual native step is 52 before and after, with digest `2f7c638539e0b435` and
identical native final state. Review stays active, with no stale drag flag or
uncaught browser error. The reproducible procedure is recorded here because this
was a bounded independent inline browser probe, not a new repository test file.

Independently checked final panel records contain 13 control anchors and
**2,354 sampled animation frames** across desktop, short-window and mobile cases.
Every sampled frame obeys the vertical limits; maximum rounding gap is
0.000062 CSS px, below the 1 px allowance. The real-browser assertions include
horizontal/vertical edge reachability, OBS gesture isolation, captured-pointer
release/cancel/blur/lost-capture and released-buttons cleanup, and accidental
click suppression. Actual Review panning is additionally covered by the
independent probe above.

## R-NAV-5 criterion matrix

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Named custom WGS84 fixes | Regional coordinate/name validation, stable custom IDs/provenance, at most 64 fixes; map picking requires explicit creation | pass: independent model bounds/count/atomicity cases; actual form errors, inert labels, selectable markers and map-pick/confirm path. Picked coordinates match the actual map event; requested fractional screen pixels allow 1.5 px browser rounding |
| Direct-to readouts | Aircraft-to-target line, true bearing/NM and separate actual heading/difference; unavailable/coincident direction never fabricated | pass: independent cardinal/ambiguity arithmetic, separate vector oracle, actual GPS line coordinates/readout; source uses the validated shared aircraft frame |
| Ordered complete plan | Start, up to 30 waypoints and destination from custom or source points; leg course/NM and total, no zero-length activation | pass: independent 32-point/ordering/duplicate-coordinate-identity and invalid-leg cases; actual published EDFE start plus custom points, ordered route features and total/leg UI; numerical oracle above |
| Edit, fit and explicit navigation | Reorder/remove, select/next/stop/clear; edits stop active plan navigation; direct-to retains draft but stops plan navigation | pass: independent transition tests; actual reorder/removal/Navigate/Next/Fit/Clear and direct-to-mode assertions; Stop/leg-selection UI actions map to the tested model transitions |
| Identity, provenance and deletion | Preserve coordinates/source when identifiers repeat; reject deleting referenced custom points; avoid stale deleted targets | pass: duplicate-source model cases and referenced deletion failure; final browser covers custom-marker and flagless plan-marker popup deletion after clear. `openPoint` normalizes live custom identity using ID/coordinates/source label |
| Session scope and safe controls | Close/reopen retains state; reload has no persistence; labels inert and controls keyboard reachable | pass: actual close/reopen, inert SVG-looking label, narrow editor focus stability; model has only immutable in-memory state; source uses labeled native form/buttons and textContent, with map keyboard isolation |
| Live, paused and Review | Remain usable in each context; Review shows current plan against selected recorded position | pass: paused native invariance, actual live switch from Alpha to distinct Bravo while flight/AP/radios remain unchanged, current-plan/recorded-position Review labels and interaction; plotting uses the shared selected frame |
| Tile/source failure and source filters | Editing/direct-to survive independent map/optional-source failures; filtering does not corrupt plans/active targets | pass: actual 503 map tiles and 404 optional catalogue context creates custom endpoints, activates a complete route and observes a rendered planned line; Fixes filtering hides source markers/search rows while preserving current GPS target and planned route |
| Aircraft/radio/recording isolation and scope labels | No tuning, AP engagement, aircraft/terrain/recording mutation, new key binding or operational receiver/planning claim | pass: actual paused step/digest/final-state invariance and retained AP/radio values; source introduces presentation-only planning callbacks and current-session/current-plan labels. Existing map regression passes; no GPS/FMS/AP coupling or wind-corrected heading acceptance |

## R-PANEL-1 / TODO 2.0.124 criterion matrix

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Zoomed drag and horizontal scrolling | Noninteractive housing pans in both axes; horizontal scrolling moves left/right; at 1× it does not pan | pass: independent exact screen-delta/1× helper cases; actual captured housing drags and horizontal edge-reaching gestures across three viewports; independent Review movement above |
| Shared pan bounds and retained zoom | Every pan preserves content/frame limits and pointer zoom/reset behavior | pass: 14 independent helper cases including repeated edges/reversals; all 2,354 observed frames fill the vertical frame; actual zoom anchors, 1×/double-click/resize resets and unchanged panel/flying heights retained |
| Control gestures remain separate | Native controls, editable elements and OBS faces do not start background pan; focus/entry do not move panel | pass: shared explicit interactive guard, actual OBS no-pan and AP/control regressions; no focus-pan handler added |
| Drag termination and accidental clicks | Release/cancel/blur/lost capture and released buttons end movement/capture; following click cannot act accidentally | pass: renewed actual captured-pointer cases and released-buttons regression, no movement after termination, no stuck capture or following click. Source aborts when the primary button is no longer held |
| Paused/Review/native/camera isolation | Presentation-only pan works in paused flight and Review without changing FOV/native state/control authority | pass: final FOV/native browser suite plus independent Review drag/horizontal pan with identical actual native state, digest, step, camera and frame |
| Responsive baseline and existing behavior | Keep fitted panel and reachable controls/openers across viewports | pass: retained thirteen-viewport geometry/portal matrix, fresh-mobile check, original pointer-zoom and camera/map/dialog/yoke tests |

## Findings and remaining limits

The missing primary-button release guard found during validation was repaired;
the affected captured-pointer case was renewed. A stale custom-popup issue found
in quality review was repaired and renewed; identity normalization also covers
flagless route snapshots, as the final additional browser case demonstrates.
Early map-pick reference rounding and deliberate first-click overlay activation
failures were not counted as passes; the final fixture uses actual click
coordinates and explicit activation while retaining strict behavior assertions.

Both requested increments pass at the final hashes. Plan/fix storage is limited
to the page session; Review planning is current overlay state, not captured
historical plan state. Distances/courses are spherical visual aids. No current
procedure, wind correction, receiver/FMS, AP coupling, aircraft fidelity,
training credit or complete historical test-suite acceptance is established.
Cross-provider peer remains pending. Changes to reviewed inputs invalidate the
affected outcomes and require renewed validation.

## TODO 2.0.125 addendum: anonymous fixes and prominent plan

Reviewed 2026-11-05 00:58 Europe/Berlin by independent Codex `validate`,
following the [anonymous-fix/prominent-plan request](../input/2026-11-05-anonymous-fixes-prominent-plan.md)
and the updated R-NAV-5 criterion. This addendum supersedes the earlier map
input/evidence hashes for this affected slice; the earlier observations remain
historical. Recommendation: **pass for the bounded local TODO 2.0.125 increment**.
The validator authored neither the implementation nor these acceptance fixtures.

The validator independently executed `node --test src/map-flight-plan.test.ts`
from `app/`: **14 pass, zero skipped**. It also inspected and independently ran
`node output/flight/anonymous-plan-card-check.mjs`: exit 0. That focused real
Chrome/component check imports the actual model/editor/card and covers blank and
explicit anonymous creation, named input/focus retention, generated labels and
flags, non-automatic map-pick creation, inert text, card route/summary/actions,
Review and picking states, visible errors, narrow bounds and disposal. It uses a
delegated action fixture rather than aircraft state; native isolation is covered
by the final integrated browser evidence below.

The final inspected `map-flight-plan-browser.json` reports **pass**, ten groups,
no errors, Chrome 156.0.8078.80. The corresponding final log also reports pass.
Its source asserts the card is visible before the extended menu is opened,
opens that editor through Edit plan, navigates and advances from the card, and
creates/navigates anonymous `USER-0006` on a 390 px viewport. All eight earlier
map groups are retained, including live/paused/Review, failed sources, stale
popup cleanup and native/AP/radio invariance. The integration owner confirmed
the twelve-group legacy map regression, FOV suite, **441 Node + 12 Python**
tests and application build pass; the validator inspected their final logs.
These integration results are distinct from the independently executed checks.

The validator visually inspected the actual desktop map screenshot and the
focused narrow card/editor screenshot. The bordered card presents start →
destination, leg count, total NM and enabled/disabled actions; the actual map
shows the cased cyan route and S/number/D point labels. Narrow text wraps inside
the card without horizontal overflow. The focused screenshot's deliberate
editor-error fixture is a tested error presentation, not an integrated failure.

| R-NAV-5 / TODO 2.0.125 criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Optional name and explicit anonymous choice | Blank/spaces or the anonymous checkbox creates a uniquely identified generated-label fix; named creation remains supported | pass: independent 14-case model suite and actual focused form check; blank/spaces create successive `USER-…` labels with `anonymous: true`, named fixes retain trimmed names; integrated narrow checkbox path creates and navigates `USER-0006` |
| Identity, provenance and existing bounds | Anonymous fixes retain custom/session provenance, coordinates, count/region limits and route identity; invalid attempts are atomic | pass: independent tests cover immutable flags, rejected malformed names/coordinates, 64-fix cap, non-reused IDs after deletion, unchanged active navigation for library additions, and referenced anonymous-fix deletion rejection |
| Persistent prominent card | Map-visible card shows start/destination, leg count/total and navigation state without locating the extended menu | pass: actual integrated card visible while menu is hidden; desktop visual inspection and focused 390 px card geometry/readouts; card is attached directly to the map viewport and updated from the shared planning snapshot |
| Direct editor and navigation access | Edit/Fit/Navigate/Next/Stop are available with valid enabled states; header opens editor without a key chord | pass: actual integrated Edit/Navigate/Next and existing map Fit behavior; independent focused card dispatch/model transitions verify all five actions, disabled incomplete-plan actions, Stop, errors and disposal; header button delegates the same inspected `edit-plan` branch, which opens/focuses the editor |
| Prominent route and point roles | Contrasting route casing and clearly marked start, numbered waypoints and destination | pass: actual desktop screenshot plus inspected MapLibre layers: 8 px dark casing beneath cyan 3.5 px/yellow active 5 px route; actual plan markers display S, waypoint number or D with readable bordered labels |
| Current Review plan and map picking | Card identifies current planning state during Review and does not obstruct position picking | pass: focused actual UI asserts `Current plan · Review`, hides card during picking and restores it after picking without automatically creating a fix; integrated retained Review test checks selected recorded position and native-state invariance |
| Keyboard, inert labels, session/native boundaries and regressions | Native labeled controls/inert text; retained page-session planning and no aircraft/AP/radio/terrain/recording or key-binding change | pass: focused native inputs/buttons, retained focus and HTML-looking inert text; source uses textContent and existing delegated planning actions, adds no key binding/storage/native command; renewed ten-group integrated map, legacy map and FOV results preserve the existing bounded behavior |
| Unaffected panel pan | No pan implementation change or newly claimed broader panel acceptance | pass for unchanged-input retention: panel helper/test, cockpit layout and shared panel CSS hashes exactly match the accepted TODO 2.0.124 inputs above; no repeat of the unchanged panel suite was needed for this map increment |
| Operational navigation, aircraft/training fidelity and cross-provider peer | Separate acceptance would be required | not evaluated: no such acceptance is claimed; cross-provider peer remains pending |

### TODO 2.0.125 frozen inputs

Working-tree base remains `700dd5386125f9864a391f85b277cb71da55290a`.
SHA-256 at the affected review freeze:

| Input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `d67f8b5228a3eba02d0f157201e4ac208ef8786aee2477c03497588adb169a87` |
| `docs/input/2026-11-05-anonymous-fixes-prominent-plan.md` | `5956477537b678fdf9ffe991f8c146eb09a7ad6772731587e5dc067c3b3ec1e7` |
| `app/src/map-flight-plan-types.ts` | `da6fdc4608ae4c9d25b7ef2124a3c0469df3dec990b48aa1a0793a690c28e55a` |
| `app/src/map-flight-plan.ts` | `ed882292f331b9d633daf95744db2a82b7dbc11370190313f9586a10f41e2ed0` |
| `app/src/map-flight-plan.test.ts` | `544380a94ac2f7be080302e36ec69a36b18dd4335e72066c52a70f2ca2fe000a` |
| `app/src/map-flight-plan-panel.ts` | `ec52d3990b2242ab89d5cbf19cbcb380a1510665aad4991b73b204ccd0e6db03` |
| `app/src/map-flight-plan-panel.css` | `34af1d7285da34738161e921271233c19ef3db098bfb1e874fb115e47e94bd0e` |
| `app/src/practice-map.ts` | `b99cb0a7c23dc8c673b2eb38b77b8d9f66e50bae63049f42d2d683a23b5a7ee9` |
| `app/src/practice-map.css` | `83761b3ab7607491260e9d4a143b4fc30a47a73fb1d935368bbbf95cad6c4fe9` |
| `app/tests/map-flight-plan.browser.mjs` | `f34a21bfcfed6f24f865fea33404667ddb012b1b0eca033bc88c80e3e17b1fe8` |
| `app/tests/flight-actions.mjs` | `588ce4ae5a929cd8aea7c64f2af64e0b28427fbf9d8a0c2e9085f7ef09b1dff8` |
| `app/tests/right-flight-map.browser.mjs` | `d42f16bc8d6b8b43e706219b9d78b23d0be850208d5210050c26c8a29841aa80` |
| `app/tests/fov-smoke.mjs` | `e55aba7e5f3934d358db2cebe235611df42c75692f8c8e07277068ea8e532319` |

The shared browser helper now selects a bare canvas position outside the card;
the map-pick fixture still compares the actual native map event coordinates.
That fixture adaptation does not replace a position/state assertion with an
assumed coordinate. Final local evidence hashes under `output/flight/`:

| Evidence | SHA-256 |
| --- | --- |
| `map-flight-plan-browser.json` | `87bf99e2fa8769330074f0e9c064e3f90337b4938860f3e43e4d22badb5648fc` |
| `anonymous-plan-card-check.mjs` | `15fd517b5370a8457e24011405ef5a122236f89c31aba1d9a5644e716888fab3` |
| `anonymous-plan-unit.log` | `e9af8de185bcd4576ca0523bc8d5ba06dbfbb5e20acf1d80223c01d20d9e4515` |
| `anonymous-plan-build.log` | `b810896b86c40c3ced2059305086182c9aebe95fb70c639e0fe90cefef3cd9b1` |
| `anonymous-plan-legacy-map.log` | `29a6b593f8e85fb6a69fde08ebc7c441116d84ec28a3b13c801401a471119e90` |
| `anonymous-plan-fov.log` | `28585652556eac1889a0f51a5f2320bbc9cacf4232fb62c7539598a64bf43c76` |

No unresolved affected failure was observed. All previously stated session,
current-plan Review, spherical visual-aid and operational/fidelity limitations
remain applicable. This local result does not establish hosted CI, publication
or the separate cross-provider peer gate.
