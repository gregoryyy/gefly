# Delete a selected map point

Recorded 2026-11-05 15:44 Europe/Berlin by Codex orchestrator.

> map/navaid, select there should have a deletion option

Implementation assumption pending optional clarification: expose Delete GPS fix
when a user-created point is selected on the map. Reuse the existing session
store deletion policy: a point referenced by a flight plan must be removed from
the plan first. Published source navaids are not removed from source data.
An optional question asks whether published navaids should also support hiding.
