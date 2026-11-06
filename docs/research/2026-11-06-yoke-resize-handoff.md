# Centered pointer pickup after layout movement

The reported local handling issue occurs atlocalhost:5173 andSIM1×; see the
[recorded context](../input/2026-11-06-local-handling-context.md). This repair
addresses one reproduced input discontinuity underR-INPUT-1/TODO2.0.153.
It does not accept the broader aircraft handling task.

A fresh actual ROOT app/Worker/WASM diagnostic narrowed1440px to1100px.
The next1px pointer movement near the former center commanded+.5aileron.
The current scene center had shifted170px. Published pointer mapping is
absolute relative to that current center; a fixed gain reduction cannot remove
the discontinuity. No aircraft coefficients or gains change here.

The controller now notices a changed midpoint both in the animation frame and
before pointer mapping. It sends neutral pointer axes, retains the visible
marker at the new center, and waits until the pointer enters that ring.
The pickup event itself stays neutral. The7CSSpx radius is the existing14px
marker footprint, not a flight-model tolerance or continuing control dead zone.
A brighter ring and center-to-steer hint explain the handoff. Held keyboard
commands remain independent. Relative mode, drag-look, cancellation and existing
ordinary pointer reentry behavior retain their established semantics.

Author verification:22pointer unit tests and TypeScript pass. The actual app,
Worker and native engine browser test passes3groups including resize pickup,
marker/hint, zero native commands after1px movement, held keyboard continuity
and ordinary+.05aileron after15px movement once centered. Scenery pixels and
read-only command observers are fixtures; this is Chrome156.0.8078.80 with a
fresh profile, not the user's embedded VSCode browser or physical trackpad.
Independent quality and validation reports provide their own scope/results.

The separate native zero-command bank drift is outside this pointer repair.
Cross-provider peer review remains pending under the existing cadence.
