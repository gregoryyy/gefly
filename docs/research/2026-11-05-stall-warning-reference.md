# Stall-warning diagnostic reference

Updated 2026-11-05 10:26 Europe/Berlin; first inspected 09:33 by Codex
`/root/resize_housekeeping` for TODO 2.0.132 / R-ALERT-1. This records source and
historical evidence; it does not resolve the user's reported failure.

## Signal and sound path

The [native bridge](../../studies/e1-browser/sim/bridge.cpp) reads
`systems/stall-warn-norm` through `gf_stall_state()`. The
[build recipe](../../studies/e1-browser/sim/build.sh) pins JSBSim v1.3.3, commit
`66f7fafc07fe13e7ede9db20873030fed2881713`. Its
[upstream aerodynamic implementation](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/FGAerodynamics.cpp#L163-L169)
makes this software warning positive above 0.85 times the model's configured
maximum-lift angle of attack and binds that value to the property. This is a
model-specific software signal, not an IAS switch or accepted C172S horn
calibration. A low airspeed alone does not establish that the signal must be on.

The [browser monitor](../../app/src/flight-warnings.ts) activates STALL when this
finite nonnegative value is greater than zero and validated contact state is
airborne. Contact suppresses it; missing/invalid data is classified unavailable.
At diagnosis start unavailable status remained in hidden DOM. The revised
[annunciator renderer](../../app/src/flight-warnings-panel.ts) now exposes
unavailable cues as N/A. The original mismatch is not established as the cause
of the user's report.

## Delivery update

The [worker](../../studies/e1-browser/sim/worker.js) now observes the unchanged
native warning after each fixed physics step. A
[transport-only peak](../../studies/e1-browser/sim/stall-warning-peak.js)
preserves a genuine positive and its step between state publications, including
when the current published signal is already clear. This metadata neither
changes raw telemetry nor imposes a native warning latch.

The [browser delivery helper](../../app/src/stall-warning-delivery.ts) consumes
live observations and starts a **200 ms wall-time presentation minimum** at
rendering. The light reads **RECENT STALL** when only that minimum remains and
the current native signal is clear. This is a generic visibility/audibility
policy, not an aircraft threshold. Pause, hiding, loading/failure/reset,
unavailable/contact state and disabled delivery cancel pending/held events;
consumed identities prevent replay on re-enable. Review uses the raw recorded
monitor, without replaying live transport peaks or this presentation minimum.
This delivery change does not establish that the exact user session was
reproduced, or validate aircraft-warning calibration.

The [audio controller](../../app/src/engine-audio.ts) starts muted, at volume 0.3.
The documented enable step is **S** or the sound button, with Options volume
above zero and a successful browser audio unlock. Warning tones share this
master control and run only in eligible live flight. Pause, background hiding,
loading/failure/reset and all Review suppress warning sound. The synthetic stall
tone is original, not an installed-aircraft acoustic reference. Default mute is
a fact to inspect, not an assumption about the user's settings.

## What existing evidence establishes

The [2026-11-03 review](../reviews/2026-11-03-flight-warnings.md) records a native
worker/UI STALL episode using a combined idle/nose-up-trim/pull stress fixture;
simple keyboard pull had not reliably reached the native signal. This fixture
is not a flight procedure or aircraft performance test. The
[UI test](../../app/tests/flight-warnings.browser.mjs) watches actual worker data
and rendered status history, so a brief displayed episode can be detected.

The [audio test](../../app/tests/flight-warnings-audio.browser.mjs) supplies
warning states to an offline Web Audio graph and measures waveform envelopes.
Its integrated native-worker cases exercise AP-disconnect wiring; they do not
establish a native stall-to-physical-speaker result. The earlier review explicitly
excludes human listening and physical speaker output. Those historical passes
do not accept today's source or reproduce the user's session.

This housekeeping task ran no flight, audio or model tests. The current
implementation's producer, presentation and integration evidence belongs to
the separate coding/review work; source inspection here is not acceptance.
No aircraft threshold or physics change is claimed by this note.
