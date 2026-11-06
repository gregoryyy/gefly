# Autopilot: keyboard and touchpad input

2026-11-06 21:22 Europe/Berlin, clock-derived. Author: Codex
`/root/ap_input_records`, acting as housekeeping alongside implementation.
This note records a source inspection and a proposed interpretation; it is not
acceptance evidence, a test result or a declaration of completed behavior. The
orchestrator owns requirements, task status and integration.

## Request and observed source paths

The [user request](../input/2026-11-06-ap-keyboard-input.md) reports that
keyboard input disconnects the autopilot while touchpad input does not, and
asks that keys not disconnect it. The following describes the inspected working
source before this change; it is not a reproduction of the user's exact flight.

In [main.ts](../../app/src/main.ts), the touchpad yoke callback ignores movement
while autopilot capture is pending or KAP is engaged, unless CWS is held. The
same file combines held keyboard and on-screen button axes with the stick in
`publishInput`, sends an explicit KAP disconnect for nonzero raw axes while AP
is active outside CWS, and flags those axes as a pilot override. The held
Quote/Backslash trim shortcuts advance the pitch-trim target in the animation
loop. In the [worker](../../studies/e1-browser/sim/worker.js), an engaged KAP
also disconnects on a pilot override or changed trim outside CWS; held raw
input can reject a new engagement. [pilot-controls.ts](../../app/src/pilot-controls.ts)
documents the arrow and Q/W axis mappings. These observations concern the
current source implementation, not a claim about installed KAP hardware.

## Proposed interpretation and checks

A candidate consistent with the touchpad behavior is to ignore keyboard
steering and keyboard trim inputs while AP is engaged or capture is pending,
except while CWS is held. Explicit AP/A disconnect remains available; throttle,
flaps and brakes are separate controls and should remain usable. The user did
not specify an individual key list or how manual control should be handed off,
so the precise policy is an implementation assumption for the orchestrator to
confirm in the scoped requirements.

An inhibited held key must not unexpectedly take effect after AP disconnect or
a CWS transition solely because key-repeat events continue; require release
before treating it as a new manual command. Check engagement, capture-pending,
held-key repeat and release, CWS hand-flying and release, and paused and live
states. A browser test should observe both AP state and applied controls, not
merely whether a disconnect command was sent. Separately verify that throttle,
flap and brake controls remain usable and that explicitly disconnecting AP
works. Existing worker override and sensor-loss behavior should retain its
separately scoped tests. These are proposed checks, not recorded passes.

[R-AP-1 and R-AP-2](../SPEC.md) currently describe deliberate manual override
and the explicit capture shortcut. Any accepted policy change belongs in the
orchestrator-owned specification and should distinguish keyboard behavior from
other inputs, CWS and the worker's existing safety behavior. No aircraft
fidelity, training-credit or regulatory claim follows from the UI change.
