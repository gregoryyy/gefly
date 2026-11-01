# Initial Mac control profile

Status: user-selected platform/input scope; default bindings and interaction
details below are proposed from the requested GeoFS reference. [SPEC](../SPEC.md)
owns acceptance criteria; [GAPS Q4](../GAPS.md) records the answer and clarification.

## Required and optional inputs

First support a **Mac desktop browser with keyboard and touchpad**. No connected
flight hardware is required to complete the introductory exercise. Optional
hardware is a **yoke or joystick and rudder pedals**, with explicit axis/button
assignment and calibration. An external landing-gear switch is not in the
selected hardware scope. Aircraft-system functionality still follows the selected
actual configuration. A paired iPhone's orientation is an optional control for the
Mac session (R-INPUT-3, GAPS Q16); stand-alone mobile orientation remains a later
capability.

The exact macOS/browser versions, reference Mac/display and supported peripheral
models are foundation choices to document and test; no compatibility is claimed
from choosing the platform alone.

## GeoFS reference to reuse conceptually

Source: [official GeoFS instructions](https://www.geo-fs.com/pages/instructions.php),
Keyboard, Mouse and Joystick/Controller sections, retrieved 2026-10-31. Its listed
controls inform familiar behavior; no GeoFS code, private configuration or user
settings were imported.

| Area | Reference behavior to preserve where applicable |
| --- | --- |
| Keyboard | Arrow pitch/roll; throttle `+`/`-`; `Enter` recenter; `Space` brakes; flap and trim bindings. |
| Touchpad/pointer | Pointer-as-stick, sensitivity/exponential response and inversion controls; a clear way to disengage flight input for menus/cockpit interaction. |
| Input selection | Explicit keyboard, pointer and controller modes, with current mode visible. |
| Coordination assist | GeoFS offers roll/yaw mixing; expose it as an assist, with independent rudder control when appropriate. |
| Controller setup | Detect available hardware, inspect axis/button activity and assign bindings rather than assuming identical devices. |

The table describes the source reference; calibration, persistence, conflict
handling and exact Mac alternatives are Gefly design/acceptance details to refine.
Keep assists separate from the aircraft model. Do not quietly mix roll into yaw
when testing independent rudder/pedal behavior or claiming unassisted control.

## Mac-specific acceptance concerns

Offer discoverable/remappable alternatives for keys absent on the reference Mac
keyboard and handle browser/OS shortcut conflicts. Ensure touchpad use does not
require a middle button, wheel or simultaneous multi-button gesture. Adjusting an
instrument, camera or settings control must not unintentionally move flight axes.
Test focus loss, neutral/recenter, reset and settings restoration. Optional devices
need axis direction/range calibration, conflict handling and safe disconnect
behavior with an explicit keyboard/touchpad fallback. No hardware has been tested
by this documentation update.

E5 and TODO 1.2.1 define the future test matrix/budgets. Preserve the familiar
GeoFS settings model while validating it for the chosen Mac setup and aircraft.
