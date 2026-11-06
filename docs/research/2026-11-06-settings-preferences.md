# Saved Options across reload and Restart

Task2.0.173; R-INPUT-1/R-UX-2. User
[request](../input/2026-11-06-flaps-settings.md), 6 November2026.

Saved Options now restore on this browser origin/device: pitch, roll, rudder
and brake gains; coordinated rudder; centered touchpad; practice PAPI;
experimental roll correction; sound mute and volume. The separate existing
display record retains terrain mode, label detail and map palette. New flights
retain these choices. Startup applies them before creating the controls/scene;
it does not start flight or unlock Web Audio. A previously saved experimental
roll correction is deliberate, defaults to zero and remains suspended by AP.

Options still previews changes in memory. Save snapshots all Options values;
Escape/outside dismissal restores the opening values. Reload during a preview
loads the last saved snapshot. Sound toggles outside Options save immediately.
No held keys, axes, throttle, flaps, trim, aircraft loading, camera gesture or
recording is stored in this preference record. Existing location/AP persistence
is a separate acknowledged-state mechanism.

`gefly.settings-preferences.v1` accepts an exact versioned schema within1024
UTF-8 bytes. It checks every finite range and boolean, rejects extra/flight
fields and preserves zero/false. Corrupt, future, oversized or inaccessible
storage falls back to detached defaults without preventing session changes.
Storage failure does not automatically resume a flight or permit audio access.
Data remains in origin-local storage until replaced or browser site data is
cleared; there is no network path. The view record remains limited to display
preferences and does not receive control gains.

The publication port also installs the pre-existing bounded display-preference
helper, because current main did not yet contain its local working-app wiring.
It retains existing palette metadata without adding a new palette UI.

The [runtime record](../reviews/2026-11-06-settings-preferences-runtime.json) preserves the working-app and publication browser evidence. Independent outcomes are recorded with the task's review records. Model coefficients and native physics are unchanged.

The [renewed publication record](../reviews/2026-11-06-settings-preferences-merged-runtime.json) reruns all nine browser groups and CI after integrating the subsequently merged pointer and balanced-start changes from main. Earlier publication records remain historical.
