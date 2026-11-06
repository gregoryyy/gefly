# Map zoom keyboard ownership inventory

2026-11-06 15:27 Europe/Berlin. Task 2.0.176; R-WORLD-6 / R-SIM-9.
Author: Codex housekeeping subagent. Source inspection only; no runtime
acceptance or independent implementation review is claimed.

The user reports that `=` still changes simulation speed on the map. The
orchestrator's assigned contract gives the open map ownership of `=` / `+`
(one zoom level in) and `-` (one level out), including numpad equivalents.
This note inventories affected documentation and proposed checks; requirements
and shared status remain with the integration owner.

## Source findings

- `app/src/flight-assists.ts`, `onKey` and `blocked`: the speed shortcut is a
  document-capture listener. Its existing map guard depends on the event target
  being inside `.practice-map-panel` or `.flight-plan-overlay`. Opening the map
  while scene focus remains outside it therefore does not establish map ownership.
  Code2 is adding explicit map-open deferral and `defaultPrevented` handling.
- `app/src/practice-map.ts`: existing container key handlers stop bubbling;
  they cannot prevent an earlier document-capture speed action. Toolbar zoom
  already clamps to MapLibre's minimum/maximum. The new public API should share
  those bounds and safely do nothing until the map is ready.
- The installed, pinned MapLibre keyboard handler at
  `app/node_modules/maplibre-gl/src/ui/handler/keyboard.ts:17` describes `=` / `+`
  as zoom-in, `-` as zoom-out and Shift variants as two zoom levels. Its canvas
  keyboard handling is focus-dependent. The assigned app router instead takes
  one bounded step per press, including Shift-produced characters, and must
  consume the event before MapLibre to prevent a second action.

## Proposed shared-document updates

Line references describe the inspected working tree and may move during integration.

| Location | Finding and proposed integration edit |
| --- | --- |
| [SPEC](../SPEC.md), R-SIM-9, line 242 | The exact rate cycle, `+` decrement and German Shift+Digit0 behavior are presently unqualified. Scope keyboard rate actions to a closed map, preserving explicit rate controls with an open map and independent Review rate. |
| [SPEC](../SPEC.md), R-WORLD-6, line 231 | Add the map-open zoom ownership/guard contract and fixed-state isolation to this authoritative map requirement. Avoid copying the full rate contract here. |
| [SEC](../SEC.md), Right-side flight map, line 409 | Explain that map-open zoom keys are intercepted before flight shortcuts, regardless of scene/canvas/button focus; readiness and repeat handling must not leak digit/throttle events. |
| [SEC](../SEC.md), Convenience autopilot and simulation rate, line 427 | Replace the blanket statement that shortcuts are guarded against read-only Review: AP is unavailable there, but existing tests intentionally change independent replay pacing. Distinguish map zoom in Review from rate commands. |
| [Root README](../../README.md), lines 135 and 140 | Qualify live and replay `=` rate descriptions with map-closed context; describe open-map `=` / `+` / `-` and the retained speed button. |
| [App README](../../app/README.md), shortcut table line 96 and Simulation rate line 251 | Make the same context distinction in the table and prose. State one map zoom step per press and preserve Shift+`=` rate decrement only with map closed. |
| `app/src/flight-assists.ts`, speed title and visible shortcut hint | Review discoverability of the remaining context-sensitive hint. This is integration-owned runtime text, not a housekeeping edit. |

## Existing test applicability

`app/tests/flight-assists.browser.mjs:91–120` checks exact rate cycles, fast
presses, German `=` protecting throttle and Shift+`=` decrement. Lines 183–203
check independent Review pacing. The suite never opens the map: these assertions
remain valid for the closed-map context and do not prove map-open behavior.
Its typing/modifier/repeat/menu/modal guards at lines 122–158 also remain useful.

`app/tests/right-flight-map.browser.mjs` covers map presentation shortcuts,
focus, paused native-state invariance and map interactions, but contains no
`Equal`/zoom-key assertion. No inspected legacy browser assertion requires `=`
to change rate while a map is open. New coverage must test that context explicitly.

## Proposed acceptance evidence

These are checks for the implementation/review owners, not reported passes.

| Context or input | Expected observation |
| --- | --- |
| Open map; scene, canvas or ordinary map button focused | `=` / `+` and numpad add zoom in one level; `-` and numpad subtract zoom out one level, clamped at map bounds. No double MapLibre action. |
| Open map; German Shift+Digit0 yielding `=` | One zoom-in; no rate command, throttle change or pilot-control event. |
| Recognized repeated zoom key while map open | Event consumed; no additional zoom, rate or digit/throttle action. |
| Open map still loading | Recognized key consumed without a zoom/rate/throttle action; ready map accepts the next press. |
| Editable target, Ctrl/Meta/Alt, open modal/top menu, visible credits, or already prevented event | Router performs no zoom and preserves the existing UI/browser ownership of that input. |
| Map closed | Existing live/replay rate cycle, decrement and German-key throttle protection remain intact. |
| Map open; Flight menu rate button clicked | Existing explicit rate command remains usable, subject to its established availability guards. |
| Open map during Review | Zoom changes only map view; playback rate, seek position and native state remain unchanged. |
| Paused live flight during zoom | Worker step, digest, final native state, throttle and rate command count remain unchanged. |
| Router disposed/recreated | No duplicate listeners/actions; disposed routing no longer consumes events. |

## Ownership and evidence limits

Housekeeping writes only this note. Code1 owns the shortcut router and unit
tests; code2 owns FlightAssists deferral and the new browser regression; the
orchestrator owns PracticeMap/main wiring and shared records. No dependency,
source-service, aircraft-model or persistence changes are needed for this task.
Source inspection does not establish browser behavior, physics fidelity or
training suitability. Final integration must record actual checks and reviews.

## Delivered behavior and integration checks

The inventory and proposed checks above are the historical preparation record.
The delivered router runs in document capture before FlightAssists. An open map
owns `=` / `+` / `-`, including German and numpad input, even when focus remains
on the scenery. The shared camera action moves one level within MapLibre's
actual bounds. Loading and repeated input are consumed without delayed actions.
Closed-map keyboard pacing and explicit Flight-menu speed commands remain usable.

The publication checkout's `just ci` passed: 557 Node application tests, 22
application Python tests, 85 assurance tests and 11 training tests. Repository
tooling ran 242 of 243 tests with its platform-specific skip; JSBSim study ran
14 of 23 with nine existing optional skips. The C172S study ran 25 tests.
These are software checks, not aircraft or training acceptance. The working
app's existing `flight-assists.browser.mjs` additionally passed seven groups,
including closed-map speed cycles, German input, AP, replay and restart.

The focused browser evidence uses actual MapLibre and native WASM with fixture
scenery, in both the working app and the isolated publication checkout. The
embedded WebKit browser reported by the user remains untested. Cross-provider
peer remains pending under the agreed batching cadence.


The final [runtime record](../reviews/2026-11-06-map-zoom-keys-runtime.json)
contains separate source pins and eight passing browser groups per context,
including fifteen zoom observations. During running flight, the keys moved zoom
15→16 in total while native steps advanced (working app136→198,
publication134→194); rate remained1× with four rate commands unchanged and
unchanged UI/native throttle. Paused input preserves native step/digest/final state;
Review preserves independent replay speed. This does not claim an identical
running-flight trajectory: map interaction retains its existing control handoff.
The original seven-group run was extended with this live-flight group after CI;
only the browser harness changed, and both focused runs were renewed.
[Quality](../reviews/2026-11-06-map-zoom-keys-quality.md) and
[validation](../reviews/2026-11-06-map-zoom-keys-validation.md) record bounded
independent outcomes and their separate evidence limits.
