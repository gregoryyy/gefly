# View resets, direction markers and instrument-focused zoom

Recorded 2026-11-04 07:53 Europe/Berlin by Codex orchestrator. Original send time is not reconstructed.

> double click to reset view to front. double click to reset panel to normal out of zoom.
>
> on the view cadd 90 degree markers L and R, as well as U, D and B for up down backwards view.
>
> zoom on panel is too restricted. the idea was to zoom in on particular instruments. the panel area stays the same, but zoom can be into instruments, with restriction that the top panel to top instrument distance has a maximum.

Implementation interpretation: markers reference aircraft body axes; panel zoom keeps its existing area and crops enlarged instruments, with a maximum 12 CSS pixel empty top gap. Panel reset uses housing/noninteractive instrument faces so native controls retain their input semantics.
