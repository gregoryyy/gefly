# In-session recorded flight state review

Scope: TODO 2.0.3, partial R-REVIEW-1/R-VIEW-1. This is an in-memory state viewer,
not the input-log replay package or milestone acceptance in CONTRACTS section 5.

Authors: Codex orchestrator/integration, flight_trace_core/code1 and
flight_review_ui/code2; flight_housekeeping maintained application instructions
in parallel. Implementation fingerprint SHA-256: `6394c8e79d2bd6bc30769ab671727c09b3d2a7a6465f7b09ee14e48ba8feb980`.
Sorted paths: app/src/flight-trace.ts, its .test.ts, flight-review-controls.ts,
flight-review-controls.css, main.ts, app/package.json and app/tests/smoke.mjs;
each path + NUL + bytes + NUL. Shared prose is excluded.

## Independent quality

Reviewer: Codex flight_housekeeping, excluding its own application README.
The bounded ring retains at most 36,000 samples and 600 simulation seconds,
freezes copied states and captured SI vertical speed, rejects invalid/order-
regressed data without mutation, and releases references on clear. Seven focused
recorder tests passed. No retention or review/live isolation defect was found.

Two P2 findings were fixed and affected review passed: timeline focus previously
suppressed Space/V, and focusing it restored an unrecorded live throttle value.
Review hotkeys now preserve native seeking; the throttle/control positions are
hidden/unset in review. No remaining scoped blocking findings.

## Browser evidence

The orchestrator's twenty-check actual Chrome/JSBSim run passed: Review pauses
and neutralizes the worker; Home shows the initial recorded heading after a turn;
playback advances the cursor without advancing the worker; timeline Space/V work;
returning live restores the true paused state and reset clears review. Prior
settings, views, local imagery and failure-path checks also pass.

Independent validator: Codex flight_validate. Observed historical heading 085→082
and VSI −190→0 while seeking; worker step 280 remained fixed during cursor playback
and view changes. Back to live restored heading 085 and paused scene focus; Resume
advanced to step 317; reset returned to step zero with review unavailable. At
390px the review bar and its controls fit without horizontal overflow. Final
focused confirmation passed: Space advanced the selected cursor from 0 to 0.5001 s
while live step 208 stayed fixed; V switched views with timeline focus retained.
The live throttle stayed hidden/unset throughout seek/play/view changes, then
returned to 69% only after Back to live. No page errors or blocking findings remained.

Strict TypeScript/build and eighteen native application tests passed. Ignored
screenshots/raw output are under output/flight/; replay exports or full simulation
reproducibility are not inferred from this viewer.

## Limits

No input/event log, actual applied controls, configuration replay, persistence,
import/export or encoded video is provided. The UI explicitly labels recorded
trace playback as not re-simulated. Restart/reload clears history; leaving review
returns to the actual live state, never rewinds or restarts the engine. Existing
research-aircraft/geography limits remain. Peer pending under the batched cadence.
