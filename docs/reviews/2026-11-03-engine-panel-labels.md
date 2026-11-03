# Compact engine panel: independent quality and validation

Reviewer: Codex subagent `engine_labels_quality`, 2026-11-03.
Scope: TODO 2.0.53, R-PANEL-1 and the selected-state/read-only portion of
R-REVIEW-1, based on main `9960c6a`. The reviewer did not author the implementation
or tests. This same-provider review does not replace the batched external peer.

## Quality

**Pass after repairs.** The first responsive-layout execution found engine
controls extending below the 344px panel. Measurement showed an explicit shared
44px heading height defeating the proposed min-height reduction. The coders
moved model fuel quantities beside the dial, tightened the four readout rows and
applied a fitted 32px heading height. Renewed checks retain the 88px fuel dial,
100px power-lever tracks and shared cockpit height without clipping controls.

The initial small LOW text was raised to 8 SVG units. The two corner labels were
replaced by a common centered legend inside the dial; independent mirrored arcs,
triangle markers and per-tank LOW badges remain. Final desktop, mobile and
controlled low-fuel screenshots were visually inspected. Labels, readings and
units are legible on individual lines, and fuel badges fit their quantity row.

The quarter-tank comparison is explicitly a generic presentation reference,
not new aircraft data, an installed annunciator threshold or a usable-fuel
reserve. Existing quantity/unit conversion, worker state and control semantics
are preserved. Missing fuel hides dynamic LOW indications and remains INOP;
recorded quantities drive the same read-only presentation. No new dependency,
service, aircraft coefficient or runtime data source was introduced.

## Executed evidence and validation

| Criterion | Observed evidence | Result |
| --- | --- | --- |
| R-PANEL-1 single-line readouts | Actual desktop, standalone presentation fixture and mobile dialog keep OIL PRESS, OIL TEMP, FUEL FLOW and EXHST GAS label/value/unit on single, nonoverlapping rows | Pass |
| R-PANEL-1 fuel references | Two mirrored lower-quarter arcs/markers; independent LOW badges at the exact quarter boundary and below, absent immediately above; empty/full/unequal/overrange cases exercised | Pass for generic display reference |
| Availability and R-REVIEW-1 | Missing fuel stays INOP with no fabricated LOW; selected recorded quantities update badges, controls stay read-only and callbacks remain unchanged | Pass for exercised presentation contract |
| Compact responsive layout | Ten viewport cases plus fresh-mobile portals; controls stay inside columns and the desktop deck remains below the existing 390px bound | Pass |
| Native-state isolation | Actual native fuel quantities drive live display; staged paused E and presentation/dialog interactions leave worker step, digest and final state unchanged | Pass for exercised paused-state contract |
| Installed aircraft limits/fidelity | No applicable low-fuel threshold, reserve, flight-training or full aircraft validation performed | Not evaluated; not claimed |

Independently executed, after the final source repairs and completion of the
orchestrator's npm installation phase:

- `node app/tests/fuel-gauge.browser.mjs`: four groups pass.
- `node app/tests/panel-layout.browser.mjs`: ten viewport cases and fresh-mobile
  portals pass, including Review layout checks; zero reported page errors.

Tests use actual Chrome, JSBSim WASM and terrain, with local scenery fixtures;
controlled quantity cases are explicitly presentation fixtures. Native WASM
SHA-256: `ff073b7fd8ee4966a7fac508cc0cdc86c33ed678c12648495bfab3e741aaa15c`.
Screenshots: ignored `output/flight/engine-panel-reference.png`,
`engine-panel-mobile.png` and `engine-panel-low-reference.png`. Renewed logs:
`output/flight/engine-labels-{fuel,layout}-browser-renewed.log`.
Shared CI and production build are orchestrator-owned checks, not independently
executed by this reviewer.

## Reviewed snapshot

At 2026-11-03 11:00 Europe/Berlin, froze seven sorted
`path + NUL + lowercase SHA-256(file bytes) + newline` records. Packet SHA-256:
`a97c0ef872d8e233cfc3942e6d4f50b20208a5ca7ceeedb50858a10f95f64d12`.
Inventory: ignored `output/flight/engine-labels-quality-packet.json`.

```text
app/README.md
app/src/engine-panel.css
app/src/engine-panel.ts
app/tests/fuel-gauge.browser.mjs
app/tests/panel-layout.browser.mjs
docs/SPEC.md
docs/input/2026-11-03-engine-panel-labels.md
```

Covered byte changes require affected review renewal. Shared status and this
review prose are outside the source packet. External-provider peer review remains
pending; no external CLI/model identity or acceptance is asserted here.
