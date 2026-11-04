# Portable recorded runway context: independent review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-03 23:25 Europe/Berlin**.
Scope: TODO 2.1.2, the portable runway-context slice of R-REVIEW-1 and the existing
runway-practice card. Implementation authors are the Codex orchestrator and
`glide_cases`; browser test author is `glide_model`. The reviewer independently
inspected their source and executed the trace tests. The reviewer's design-document
paragraph and earlier PR65 observation JSON, plus root-owned catalog/status/run
records, are outside this independent acceptance scope.

## Quality outcome

**Pass for the frozen implementation and tests; no unresolved scoped blocker.**

The optional version-1 context is a small declaration with exactly four own keys:
`kind`, `version`, `airport`, `runway`. Only `runway-practice`, numeric version 1,
EDFE and runway 08/26 are accepted. Arrays, null, missing/extra fields, other
literals and non-JSON extension mechanisms are rejected. Accessor and prototype
checks do not execute supplied getters. JSON strings remain data; context neither
constructs URLs nor dispatches simulator commands.

Construction and replacement copy/freeze context. Invalid replacement is checked
before clearing samples, preserving the original trace. Clipping retains context;
ordinary clear removes it. Absent legacy context remains null and is omitted on
re-export. A declared malformed context rejects the whole import before frame
validation; it is never silently converted into a known live runway.

The integration writes context only for prepared EDFE runway starts. Review reads
context and observations from the same selected trace. Its event cache includes
trace identity, time and count, so equal-size recordings at equal times cannot
share cached progress. Imported context does not become live session state.
The notice identifies a recording's declared/unknown context, and the Review card
states that aircraft/weather provenance is not captured. This declaration does
not verify airport coordinates, trajectory, installed equipment or flight quality.

One test-adequacy finding was repaired: changing only the declared runway while
retaining identical samples could not detect stale cached progress, because the
runway label is computed separately. The renewed browser case retains identical
counts/times but uses explicitly synthetic all-airborne contact fields, verifies
ground → airborne → ground → airborne across imports, and preserves native-state
checks. It does not claim a new actual takeoff. The file loader waits for its
finally-cleared input value after each load, avoiding stale-notice races.

No native dynamics, physics checkpoint restoration, dependencies or model data
are changed by this implementation. Existing file/frame bounds remain in force.
This is not a complete import-security or whole-application audit.

## Evidence and validation outcome

Independently executed:

- `node --test app/src/flight-trace.test.ts`: **33 passed, 0 failed, 0 skipped**.
  Five added groups cover both directions, legacy absence, malformed/extended
  context, transactional failure, copying/freezing, clipping and non-JSON objects.
  Local stdout: `output/flight/recorded-runway-context-quality-unit.log`.

The browser author executed the following suites on the final sources; this
reviewer inspected their assertions and completed stdout rather than claiming
independent browser execution:

- `node app/tests/airport-play.browser.mjs`: **seven groups passed**, including
  portable context, differing same-bounds observations, malformed import,
  native-state isolation, legacy behavior and return to live. Chrome
  **156.0.8078.80**; `output/ci/runway-context-airport-browser.log`.
- `node app/tests/replay-files.browser.mjs`: **passed**, including context-free
  ordinary flights, legacy card hiding, invalid JSON, read-only seek and restoring
  flying/paused intent with the same worker.
  `output/ci/runway-context-replay-browser.log`.

Map and imagery pixels use deterministic local fixtures; the browser suites use
actual native worker state. Native step, digest and final state remain equal
through valid/invalid imports, seeking and return to the paused live flight.

| Bounded criterion | Expected / observed | Outcome |
| --- | --- | --- |
| R-REVIEW-1 / portable context | Context for both supported runways round-trips with immutable states; root records only the prepared runway declaration. | **Pass** |
| R-REVIEW-1 / strict import boundary | Invalid fields, arbitrary command fields, unsupported airport/runway/version, missing values, symbols, accessors and inappropriate prototypes are rejected; current history and Review selection survive rejection. | **Pass** |
| R-REVIEW-1 / historical isolation | Each imported recording supplies its own context and recorded prefix. Same-count/time recordings with distinct contact observations refresh the card. | **Pass** |
| R-REVIEW-1 / native isolation | Actual native step/digest/final state remain frozen during import/seek; Back to live restores the real session's runway 08 after imported 26. | **Pass** |
| R-REVIEW-1 / legacy compatibility | Existing version-1 files without context remain loadable and unknown; no runway is invented and their card remains hidden. | **Pass** |
| Full scenario provenance and training acceptance | Aircraft/model/weather provenance, authenticated trajectory/airport matching, complete scenario packages, full circuit assessment and selected-172S fidelity are not established. | **Not evaluated / not accepted** |
| External-provider peer | No external-provider review performed for this increment. | **Peer pending** |

These outcomes concern portable context and read-only observations. They do not
renew historical evidence by changing its pins or accept the full R-REVIEW-1
scenario-provenance scope.

## Frozen source packet

Reviewed working-tree source based on
`05ec1ca515548436ba81f7b86da432ddbf693fd0`.
Packet SHA-256:
`74cd9941fe0fc82d6cae934f718b931eeac22a6bdde4c73792f622f85150c404`.
Calculated over sorted `path + NUL + lowercase SHA-256(file bytes) + newline`;
ignored inventory: `output/flight/recorded-runway-context-review-packet.json`.
Changes to a covered byte require renewed affected review.

```text
app/src/flight-review-controls.ts
app/src/flight-trace.test.ts
app/src/flight-trace.ts
app/src/main.ts
app/src/practice-map.ts
app/src/runway-practice-panel.ts
app/src/runway-practice.ts
app/tests/airport-play.browser.mjs
app/tests/flight-actions.mjs
app/tests/replay-files.browser.mjs
```
