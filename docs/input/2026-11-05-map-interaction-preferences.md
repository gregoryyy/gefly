# Map interaction, display preferences and flight-plan overlay

Recorded 2026-11-05 09:00 Europe/Berlin by Codex orchestrator.

User:

> map does not need an extra click to activate when already open. the "dark" map can be disabled. leave the function in, though, we may later reuse it.
> reloading the game should preserve terrain mode (vector, photographic; which level of labels shown)
> flight plan should be a transparent overlay, similar to geofs. this can be on the key p.
> map: gps markers should not automatically created, as there is an inflation of this. look at the gps markers on geofs

The orchestrator asked which shortcut should use P, because the implementation
still had an older AP binding there. User:

> a disconnects the autopilot, the same key that enables it. p is free.

The implementation retains A's existing capture/disconnect behavior and assigns
P to the plan. The earlier proposed Shift+P binding is superseded.
