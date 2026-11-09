# Chase distance and return-to-aircraft camera

Initial source inventory prepared 2026-11-06 14:13 Europe/Berlin by Codex
housekeeping `chase_housekeeping` for Task2.0.174/R-VIEW-1/R-INPUT-1. Completed
implementation and independently reviewed evidence are recorded below; SPEC and
the shared task records remain authoritative.

## Delivered behavior and renderer correction

The implementation now extends chase radius from 31.953 m to 20,000 km. Scroll
changes distance; hold-drag retains the existing orbit including a true overhead
pole. Double-click returns to 30 m behind and 11 m above the current aircraft heading,
including when only zoom changed. Cockpit lens FOV and the separate overview
distance remain independent. Camera gestures remain page-local preferences.

Independent review rejected the first loose browser assertion: at 20 Mm the actual
Cesium camera gaze missed the aircraft by about 65.8 km, although the pure orbit
math was exact. Installed Cesium converts direction/up through heading-pitch-roll
with a near-pole heuristic. The new camera-pose helper validates the complete
pose, establishes an identity frame and assigns its orthonormal public camera
basis directly, avoiding that lossy conversion. It uses no private renderer API.
Five regression cases exercise the actual installed Cesium Camera in Node.

The [runtime record](../reviews/2026-11-06-chase-overview-runtime.json) preserves
separate working-app and publication runs. Each passes four browser groups and
32 actual external-camera gaze evaluations, with vector errors below 1e-10.
Both actual overhead directions are approximately [0, 0, −1]. The native worker
continues to follow the real moving target; paused and Review camera operations
preserve live native state. The tests also cover zero-angle double-click,
modifier/horizontal/editable/dialog guards, cockpit FOV and overview independence.
Independent [quality](../reviews/2026-11-06-chase-overview-quality.md) and
[validation](../reviews/2026-11-06-chase-overview-validation.md) accept this bounded camera increment. Scenery pixels are fixtures: these results do not establish terrain coverage,
aircraft fidelity or performance across devices.


## Intended interaction

The agreed implementation contract extends Chase from its existing close camera
to an Earth-scale distance. The normal camera remains 30 m horizontally behind and
11 m above the aircraft, a radial distance of approximately 31.953 m. Vertical scene
scroll changes Chase distance up to 20,000 km; moving the orbit above the aircraft
provides a top-down overview. Heading-relative camera placement continues to use
the current aircraft position and heading.

Double-click in Chase returns to the normal close, behind-aircraft position by
resetting orbit angles and distance. The lens FOV is retained. The callback must
run even when the orbit angles are already zero, because a user may have changed
only distance. The separate Terrain overview view remains available. Cockpit
scroll continues to change lens FOV; the existing overview scroll continues to
change its own distance. The ordinary Escape/reset and pointer look behavior
remain governed by their existing contracts.

This is a camera change. It does not change the native aircraft, simulation rate,
recording, saved Options or control gains. Existing look gestures can neutralize
held yoke input; the zoom itself must not issue a new steering command. Existing
scene/map/dialog input boundaries and renderer source budgets remain applicable.
Wider views may exercise normal renderer loading; this work does not add a new
terrain source or establish worldwide detail/fidelity.

## Documentation and help inventory

| Location at inspection | Existing wording or behavior | Proposed integration action |
| --- | --- | --- |
| SPEC, R-VIEW-1, line 212 | Separate overview distance 50 m–20,000 km, followed by “Cockpit/chase retain their FOV controls.” | Retain overview and replace the last clause with per-view behavior: cockpit lens FOV; bounded chase distance and top-down orbit; Chase double-click returns close behind the current aircraft. |
| SEC, lines 270–275 | Bounded page-local scene wheel preference with modal/modifier/UI exclusions and no simulation input. | Clarify that the bounded value is lens FOV in cockpit and distance in external views. Preserve the existing source, input and storage boundaries. |
| README, lines 145–147 | Double-click/Escape center the view; all vertical scene scroll changes FOV. | Distinguish Chase double-click’s close return from cockpit centering; explain Chase/overview distance scroll and cockpit FOV. |
| README, lines 249–250 | All vertical scene scrolling adjusts camera FOV. | Update this second instruction as well, avoiding conflicting quick-start descriptions. |
| app/README, lines 143–151 | The 20–100° FOV control explicitly works in cockpit and chase. | Keep the cockpit lens values; document Chase distance, top-down orbit and double-click return separately. |
| main.ts pointer-mode help near lines 1268–1273 | Generic “double-click: front” hints. | Use a Chase-specific “double-click: chase” or equivalent label when Chase is selected, including paused/Review inspection. |
| main.ts scene `aria-description` near line 1412 | Central scene interaction help. | Check whether its instructions need the same view-specific zoom/reset explanation. |

Line numbers describe this source inspection and may move during parallel edits.
Historical raw inputs and older review records should retain their original
wording; a current instruction should supersede them rather than rewrite history.

## Existing regression expectations

`app/tests/fov-smoke.mjs` lines 159–169 check that a selected lens FOV survives a
Chase switch, resize and return to cockpit. Those expectations remain valid:
distance zoom need not change the lens. The later active-yoke wheel test near
lines 208–209 runs after the script switches back to cockpit and continues to test
cockpit FOV changes without changing steering. No direct existing assertion that
wheel input changes FOV while Chase is selected was found in the inspected test
files. The broad prose descriptions require updating even though these tests do
not need that semantic change.

`aircraft-orientation.test.ts` has an existing FOV-independence test for Chase
pose; it remains useful. Existing pointer browser tests check that trusted
double-click resets look, restores the pre-pair yoke mode/relative anchor,
neutralizes final axes and does not write live inputs in Review. Adding a
distance-reset callback must preserve those properties.

## Proposed verification checklist

Every row below is planned, not evaluated by housekeeping.

| Check | Observable evidence needed |
| --- | --- |
| Close-camera compatibility | Zero look/default distance still places the camera 30 m behind and 11 m above for cardinal headings. |
| Distance zoom | Eligible vertical scrolling changes actual Chase camera radius, spans the declared bounds and leaves lens FOV unchanged. Pixel/pose evidence distinguishes the rendered camera from a HUD-only change. |
| Top-down orbit | The upper orbit pole looks toward the current aircraft with finite, perpendicular camera direction/up axes at close and Earth scale. |
| Double-click return | Both a changed orbit and a distance-only change return to normal close Chase; use the current aircraft heading, including a subsequent heading change. |
| Pointer semantics | The browser click pair restores the original yoke mode/reference and leaves no stuck capture, steering command or extra callback. |
| Other views | Cockpit FOV zoom and the separate overview distance retain their own values and guards. |
| Input isolation | Horizontal, Ctrl/Meta/Alt, map, modal and editable gestures do not invoke Chase zoom. |
| State isolation | Paused native step/digest/state remain unchanged during camera operations; Review inspection does not issue live flight inputs. |
| Live follow | At least one actual running-worker case confirms the close returned camera follows current aircraft position/heading rather than an old snapshot. |

No browser, native replay or model-fidelity test was executed for this note. No
dependency, asset or source-license change is proposed.
