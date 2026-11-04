# Sensed simulator setup: independent review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 01:54 Europe/Berlin**.
Scope: TODO 2.1.3, a simulator-start reference slice toward R-TRAIN-4, with
R-REVIEW-1 isolation and existing runway-practice behavior. Core author is
`glide_cases`; UI/browser author is `glide_model`; integration author is the
Codex orchestrator. The reviewer did not author these paths. The reviewer's own
new Setup-policy section in `docs/design/RUNWAY-PRACTICE.md` is excluded from
independent acceptance; the orchestrator reviewed that documentation separately.
Shared status, catalog and recorded-run JSON claims are also outside this review.

## Quality outcome

**Pass for the frozen bounded implementation, after affected repairs.**

The pure evaluator reads the supplied snapshot and returns frozen rows without
input mutation, I/O, simulator calls, completion memory or automatic checkboxes.
Engine combustion uses actual running state, throttle/brakes use applied native
commands, flaps use actual position, and trim compares current and launch-reference
normalized settings. AP requires both KAP and legacy observations; electrical
state is explicitly the independent teaching model. Missing/nonfinite/invalid
fields and incomplete required pairs remain Unavailable instead of invented zero.
Unsupported pilot/cabin and fuel-selector/run-up checks never become matches.

The seven references match the existing native runway initialization and app
configuration defaults. Flap/trim agreement follows declared display precision
(0.1° and 0.001 raw norm), not an aircraft tolerance or installed take-off mark.
Throttle/brake comparisons are exact and tiny differing values remain readable.
No manufacturer checklist text, aircraft coefficient or new model is introduced.

Two findings were repaired and re-reviewed:

- **Keyboard access:** plain Review arrows must continue seeking the recording.
  All tabs are therefore Tab-reachable during Review and Space/Enter can select
  them; live tabs retain arrow/Home/End navigation. The final browser assertion
  verifies Review Right seeks while Setup stays selected, with native state fixed.
- **Initial visibility:** the first inline layout placed the table below the
  visible map area. The final bounded body is anchored above its unchanged
  summary, exposing the rows immediately while preserving cockpit/map height.
  Tests now inspect real overflow-port geometry before any initial scroll and
  prove the last row remains reachable. Final live and Review captures were
  visually inspected; the live capture shows seven Match and two Unsupported
  rows with the cockpit visible. The summary closes the body to reach covered
  map controls; normal clicks are used in the regression.

Dynamic values use textContent. Semantic table headers, explicit text statuses,
linked tab/panel roles and visible focus support the inspected interaction.
No unresolved blocker remains in this scope. This is not a whole-application
accessibility, security or small-screen certification.

## Evidence and scoped validation

Independently executed by this reviewer:

- `node --test app/src/practice-setup.test.ts`: **7 passed, 0 failed, 0 skipped**.
  Exercises matches/mismatches, actual-versus-requested state, missing/invalid
  pairs, display boundaries, model mask rules and immutable reevaluation.
  Local log: `output/flight/practice-setup-quality-unit.log`.

The UI author executed the final actual Chrome suite; this reviewer inspected
its source, completed stdout and captures rather than claiming independent browser
execution. `node app/tests/practice-setup.browser.mjs` passed **five groups** on
**Chrome 156.0.8078.80**, including actual native startup/change echoes, paused
keyboard inspection, recorded synthetic settings, missing legacy groups and
return to live. Native step, digest and final state remain fixed during Setup
inspection/import/seek. Map/imagery pixels use deterministic local fixtures;
native worker state is actual. Local stdout: `output/ci/practice-setup-browser.log`.
Captures: `output/flight/practice-setup-live.png` and
`output/flight/practice-setup-review.png`.

The orchestrator's renewed existing airport browser suite passed seven groups,
and the production build passed after the final CSS repair. Those are integration
checks run by the orchestrator, not additional independently executed evidence.

| Bounded criterion | Expected / observed | Outcome |
| --- | --- | --- |
| Partial R-TRAIN-4 / simulator reference | Seven labeled sensed rows compare against original simulator startup references; unsupported inspections remain explicit, with no grade or completion claim. Native startup and pure cases agree. | **Pass** |
| Partial R-TRAIN-4 / recoverable differences | Actual engine/throttle/flaps/brake echoes show Different; a fresh runway start restores Match. Evaluation itself writes no control or physics state. | **Pass** |
| R-REVIEW-1 / selected historical state | Main supplies the selected recorded floor sample through the map. Synthetic imported settings replace live readings; returning live restores actual current readings. | **Pass** |
| R-REVIEW-1 / unavailable history | Null/legacy/malformed values and partial pairs stay Unavailable; no live fallback or matching-zero fabrication. Actual import regression passes. | **Pass** |
| R-REVIEW-1 / isolation | Inspection, tab navigation, import and seek retain frozen native step/digest/final state. Review arrows preserve seek priority. | **Pass** |
| Compact usable UI | Initial rows are visible without discovering an offscreen table; first/last rows are reachable and closing the summary restores access underneath. Final geometry assertions and visual inspection pass. | **Pass for tested desktop viewport** |
| Full aircraft checklist / lesson acceptance | No complete POH procedure, manual pilot confirmation workflow, aircraft-specific take-off configuration, full circuit assessment or selected-172S fidelity established. | **Not evaluated / not accepted** |
| External-provider peer | No external-provider review performed for this slice. | **Peer pending** |

A Match concerns this displayed simulator-start reference only. Different values
in flight are expected. Paused native command changes require a later native echo;
model electrical selections can update independently. These checks do not establish
safe departure, operational compliance or training credit.

## Frozen source packet

Reviewed working tree based on `47cea7c04ea7822a0987f8a8fc857393920c17c3`.
Packet SHA-256:
`936e109566d3dd643ebddd0567d0b2f9240d20cac9cf1879ed2eab155deeee35`.
Calculated over sorted `path + NUL + lowercase SHA-256(file bytes) + newline`;
ignored inventory: `output/flight/practice-setup-review-packet.json`.
Changed covered bytes require renewed affected review. Shared documentation,
evidence JSON and catalog records are outside this packet.

```text
app/package.json
app/src/aircraft-systems.ts
app/src/flight-trace.ts
app/src/main.ts
app/src/practice-map.ts
app/src/practice-setup.test.ts
app/src/practice-setup.ts
app/src/runway-practice-panel.css
app/src/runway-practice-panel.ts
app/src/types.ts
app/tests/airport-play.browser.mjs
app/tests/flight-actions.mjs
app/tests/practice-setup.browser.mjs
studies/e1-browser/sim/bridge.cpp
studies/e1-browser/sim/worker.js
```
