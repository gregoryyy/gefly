# Autopilot altitude explanation correction, 2026-11-03

The orchestrator's initial reply to the altitude question incorrectly made a
final ARM press unconditional. Independent inspection of the existing KAP state
machine and its tests established that selecting a new altitude while AP is
engaged already arms capture. ARM toggles that state, so pressing it again can
disarm capture. The corrected instruction is to check ALT ARM and use ARM only
if that annunciation is absent. ALT-to-VS and a climb/descent rate toward the
target are still needed to leave a current altitude hold.

This corrects the explanation recorded in
[the original question](2026-11-03-autopilot-altitude-clarification.md); it changes
no autopilot logic and records no additional user decision.
