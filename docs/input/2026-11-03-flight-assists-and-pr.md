# Flight assists, PR and screenshot, 2026-11-03

Recorded by Codex from the user messages on 2026-11-03:

> create a pr for the recent changes.
> a for autopilot given current altitude and heading
> = for toggling speedup mode 1.5x, 2x, 5x, 10x, showing the speedup as overlay on the screen.

> README.md: add a screenshot with the cockpit panels and terrain flying the plane

The orchestrator interprets repeated `=` as cycling 1× → 1.5× → 2× → 5× →
10× → 1×, and A as deliberate current-heading/current-altitude autopilot capture.
These are simulator conveniences, not original KAP 140 hardware controls.

The user also answered the preceding handling-analysis question:

> Touchpad/yoke — overshooting or sudden jumps

That answer clarifies the symptom. The preceding instruction was to analyze
without changing handling; it does not authorize retuning aircraft coefficients
or changing general touchpad behavior as part of these assists.
