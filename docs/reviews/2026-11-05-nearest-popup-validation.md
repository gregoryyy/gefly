# Nearest-popup dismissal validation

Reviewed 2026-11-05 12:49 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO 2.0.136;
R-WORLD-7. **Pass for bounded source-level acceptance; browser behavior was not
executed.** Cross-provider peer remains pending.

Read the [raw request](../input/2026-11-05-nearest-popup-dismissal.md), current
SPEC criterion, production diff and surrounding lookup lifecycle. Only this
report was written; no source changes, new tests or browser runs were made.

| Criterion | Expected versus inspected evidence | Result |
| --- | --- | --- |
| Outside pointer press, including controls that stop bubbling | Document `pointerdown` capture calls `hideLookup()` when a visible popup does not contain the target. This precedes target/bubble handlers and applies across scenery and UI. | pass by source inspection |
| Preserve normal action and interior use | The outside handler calls neither `preventDefault()` nor `stopPropagation()`. Contained targets are excluded, preserving interior interaction; the explicit close button still dismisses. | pass by source inspection |
| Pending/stale lookups | Dismissal aborts and clears the active request, then hides the box. Existing success/error handlers reject aborted or superseded requests; late completion cannot reopen that request's popup. | pass by source inspection |
| Disposal and discoverability | Disposal removes the same capture listener and cancels lookup work. Root/app README help both describe outside-click dismissal and the close button. | pass by source inspection |
| Actual pointer routing, clicked-action delivery and delayed network races | No browser exercise was run at this revision. The unchanged existing landmark fixture was syntax checked; it does not establish new dismissal behavior. Native/yoke/view-state invariance was not measured anew. | not evaluated |

The frozen packet (`output/flight/nearest-popup-task136-packet.json`, ignored local evidence)
SHA256 is `12087ed4b4a168583a8a29b6305f0c6425da7039ce80e668ef1661acdf3097e5`;
all six pins independently match. Production `landmark-labels.ts` SHA256 is
`26d9d2520edae09639ee66f6bac87ca72c4b26c32728fda9528b2030c9c34d22`.
The production build passes in `nearest-popup-task136-build.log`; a build is not
browser interaction evidence. No blocking source finding remains. Wider
R-WORLD-7 behavior, device coverage, physics and publication are not accepted
by this small review; shared records/gates belong to the orchestrator.
