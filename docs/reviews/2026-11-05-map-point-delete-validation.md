# Selected map-point deletion validation

Reviewed 2026-11-05 15:48 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.146;
R-NAV-5. **Pass for bounded custom GPS-fix deletion.** The optional question
about hiding published navaids remains unanswered; this does not accept such
hiding or destructive changes to published data. Cross-provider peer pending.

Read the [request and scoped assumption](../input/2026-11-05-selected-map-point-delete.md),
frozen criterion and applicable project/role rules. Inspected popup/map/store/
search routing, existing model tests, manual probe and actual observations;
independently viewed the referenced-fix screenshot. No reviewer browser or new
tests were run; only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| Delete from selected custom point | The popup offers a native Delete GPS fix button only for a currently owned custom fix matched by ID, coordinates and source. Actual map-created USER-0001 is selected and deleted through that button. | pass |
| Successful deletion clears selection and target | Actual fix count becomes0, marker and popup are absent, and the prior GPS USER-0001 bearing readout becomes the normal selection prompt with its overlay hidden. The store observer refreshes search entries and marker data and clears the custom direct-to target. Main then supplies null to the existing bearing-source fallback. | pass for observed popup/marker/readout; search and cockpit fallback verified by source only |
| Protect plan references with useful error | Actual USER-0002 remains in both fix library and waypoint list after Delete, with a visible inline “Remove this GPS fix from the flight plan before deleting it” alert. Removing the waypoint through the editor allows subsequent deletion; final fix/waypoint collections are empty. Existing model tests additionally verify failed removal preserves the snapshot and unrelated deletion preserves active navigation. | pass |
| Stale selection and published points | Callback checks disposal, current popup/selection/content identity, connection and owned point identity before delegating to existing removeFix. Published airport/NAV/catalogue points have no destructive callback. Errors use inert text and an alert node. | pass by source; stale/published runtime cases not evaluated |
| Preserve flight and source state | The new action delegates only to session planning state and normal input-neutralization handling; published source arrays and aircraft/radio/AP state are not edited. No new native digest, running-flight or Review interaction matrix was executed. | pass by source separation; runtime native invariance not evaluated |

The final packet (`output/flight/map-delete-task146-packet.json`, ignored local evidence) SHA256 is
`11360f6534461ece915ff0f356dd34c4372588dc9de7d1af54dc75e008be61d3`;
all15 current source/document/evidence pins independently match. The renewed
manual probe exits0, errors=[]; it adds only a read-only store-snapshot hook
to the served map module. Initial observations used an incorrect after-delete
readout selector; they remain history. Acceptance uses the corrected actual
readout and hidden-state observations.

Existing17 model tests pass with zero failures/skips; TypeScript and production
build pass, build6.80s. No full legacy browser matrix, narrow/keyboard deletion,
operational navigation or aircraft/training acceptance is implied. No blocking
implementation finding remains within the stated custom-point scope.
