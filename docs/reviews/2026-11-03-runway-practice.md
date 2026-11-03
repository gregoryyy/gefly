# Runway practice card and observed events: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-03 16:42 Europe/Berlin (affected browser-test review renewed at 16:44)**.
Scope: the new EDFE practice card and observed gear-contact log, a partial
TODO 2.1 increment toward R-TRAIN-2/R-TRAIN-5 and R-REVIEW-1, alongside existing
R-PLAY-1. The reviewer did not author the model, tests, UI or integration.
The reviewer authored the separate historical PR65 observation JSON; that file
and its catalog/acceptance claims are **outside this review**.

## Quality review

**Pass for the frozen bounded implementation, with repaired findings.**

- The monitor reads actual native wheel-WOW, ground-relative velocities and
  collision masks. It does not infer contact from altitude, command brakes,
  change physics or award a successful landing. Initial parking/airborne samples
  establish a baseline without invented transitions.
- The declared observation policy uses 0.5 s contact dwell, 2 s below 0.5 m/s
  for a post-contact stop, a maximum 0.5 s sample gap and 20 retained events.
  These are project observation rules, not aircraft limits. Gaps/missing data
  break continuity; copied snapshots cannot mutate retained history.
- A **medium finding**, collision status lost following missing telemetry, was
  repaired. A valid collision mask now takes precedence even with unavailable
  motion data, missing values stay absent and the collision remains latched
  until reset/backward-time reinitialization. The renewed unit case passes.
- A misleading observed-stop label was repaired to **Stopped after landing**;
  it no longer claims the running exercise was stopped by the map action.
- Review iterates only real recorded states through its selected cursor, never
  interpolated frames or future samples. A freshness finding about the bounded
  trace cache was repaired by invalidating it on new live recording. Imported
  traces lacking runway context hide the card instead of inheriting live EDFE
  metadata. Runway restart resets the monitor/cache.
- The card uses native details/summary interaction, text status, bounded body
  scrolling and textContent for dynamic strings. The change adds no dependency,
  live data feed, imported executable content or model coefficient.

No remaining blocker was found within these paths. This is not a whole-application
security, accessibility or performance audit.

## Executed and inspected evidence

Independently executed by this reviewer:

- `node --test app/src/runway-practice.test.ts`: **9 passed, 0 failed, 0 skipped**.
  Covers contact dwell/bounces, touchdown, post-contact stop, missing/nonfinite
  data, gaps, collision priority, snapshot isolation, reset and trace-prefix
  reconstruction. Local log: `output/flight/runway-practice-quality-unit.log`.
- `node app/tests/runway-native.mjs`: **passed both EDFE directions**, exercising
  the actual native worker model/public terrain and new monitor. Each stationary
  start/takeoff emits exactly one confirmed lift-off, without false parking,
  touchdown or collision events. Local result:
  `output/flight/runway-practice-quality-native.json`.

The orchestrator ran the production build and actual Chrome integration; this
reviewer inspected their final source and stdout rather than claiming an
independent browser execution. `output/ci/practice-browser.log` records seven
passing groups on **Chrome 156.0.8078.80**: both runway starts, COM standby/swap,
vector options, acceleration, Stop/Review guards, and the new collapsed briefing,
runway-direction change, ground status and recorded Review badge. The seventh
group saves the real trace JSON, imports it, verifies the card is hidden without
recorded runway context, then verifies Back to live restores the session’s runway
08 card. This affected test change was independently inspected after its final
passing browser run; application/model bytes are unchanged from the first packet. Map/imagery
pixels use local fixtures; native state and DEM packages are actual. An earlier
browser attempt failed during changing source; only the final run is supporting
evidence. The production build log is `output/ci/practice-build.log`.

## Scoped specification validation

| Requirement / bounded criterion | Expected and observed | Outcome |
| --- | --- | --- |
| R-TRAIN-2 / discoverable initial briefing | Before a runway start, the compact card declares objective, idle engine/parking brake, no-wind baseline, controls and generic-model/approximate-geometry limits. Browser assertions and source inspection agree. | **Pass for this card** |
| R-TRAIN-5 / sourced circuit direction | EDFE 26 shows right-hand north circuit; 08 shows left-hand north circuit, as recorded in the [operator-source survey](../research/2026-11-01-edfe-aerodrome-sources.md). No invented route, altitude/speed target or operational chart is presented. | **Pass for the direction/briefing slice** |
| R-PLAY-1 / sensed lift-off and contact | Native WOW transitions, dwell and actual ground-relative velocity generate copied observed events. Initial parking creates none. Actual native takeoffs pass; synthetic transition/bounce/stop cases pass. | **Pass for observed-event behavior** |
| R-REVIEW-1 / historical isolation | Review reconstructs the retained prefix up to the cursor; early prefixes lack future landings. New live samples invalidate the cache, restart resets it, loaded traces with unknown runway context hide the card. | **Pass for inspected integration and executed model cases** |
| R-REVIEW-1 / missing telemetry and collision | Missing motion stays unavailable; known collision masks take priority and remain latched. Repaired adversarial cases pass. No grade is generated. | **Pass** |
| R-TRAIN-2/R-TRAIN-5 / full lesson and debrief | No frozen circuit geometry/criteria, checklist assessment, runway-boundary detection, successful full native circuit/landing demonstration or learning-outcome validation was performed. | **Not evaluated / not accepted** |
| Cross-provider peer and aircraft fidelity | No external-provider review, accepted 172S performance or training credit established. | **Peer pending / not evaluated** |

Touchdown timestamps/velocities come from the first sample of a subsequently
confirmed contact run. The event becomes visible only after the required dwell
is present in the selected trace prefix. A sensed stop does not stop integration,
prove runway location or establish a safe landing. Synthetic landing tests are
not a demonstrated complete native circuit.

## Frozen source packet

The native WASM remains the existing PR65 build:
`06f044fd1176c52e3f0d2da38a542cc69c0d312ffa296db6e0d0d96cc13a4ddf`.
The rejected propeller candidate is not used by these passing checks.

Packet SHA-256:
`65a330147a168150ccf250e2bffef63b6ae30e06b20c3e44b5fa7ac465cabf0f`.
Calculated over sorted `path + NUL + lowercase SHA-256(file bytes) + newline`.
The ignored inventory is `output/flight/runway-practice-review-packet.json`.
Any covered byte change requires renewed affected review. Shared status/catalog
edits and observation JSON are outside this source packet. The previous packet
`ab259ba51d46e235e89a8f4cc769f3cb935d7de3cb7a3bd8153d969512bfce51`
is superseded only by the added imported-context browser case; its implementation
and independent unit/native results remain applicable.

```text
app/package.json
app/src/airport-play-controls.ts
app/src/flight-trace.ts
app/src/main.ts
app/src/practice-map.ts
app/src/runway-practice-panel.css
app/src/runway-practice-panel.ts
app/src/runway-practice.test.ts
app/src/runway-practice.ts
app/src/types.ts
app/tests/airport-play.browser.mjs
app/tests/runway-native.mjs
```
