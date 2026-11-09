# Map-selected flight start quality review

Reviewed 2026-11-05 13:16 Europe/Berlin by independent Codex quality for
TODO2.0.137 / R-PLAY-2, working tree based on
`700dd5386125f9864a391f85b277cb71da55290a`. Codex implementation authors are
separate from this reviewer. Only this assigned report is written; no production
repair or reviewer browser execution is performed. Cross-provider peer remains
pending; no exact CLI/model identity is inferred.

## Outcome

**Complete bounded quality review: no unresolved blocking source finding.**
The stale-popup and initial-heading repairs below are inspected on the frozen
candidate. Completed browser/native evidence supports the scoped launch behavior;
unexecuted lifecycle/narrow-layout cases are explicitly limited below. Native
build provenance remains unverified independently of actual-runtime observations.

Scope is the new map-start contract/worker/session path, explicit coordinate and
selected-point launch controls, root lifecycle integration, and direct top-bar
access to the current editor. The
[user clarification](../input/2026-11-05-map-flight-start.md) requests the existing
current-plan editor, without a named-plan library. Current SPEC, ARCH/SEC and
existing control/lifecycle boundaries apply. No model/bridge change is reviewed
or approved.

## Findings and resolved boundaries

**Medium, source repaired — removed/replaced popup could dispatch a start.**
Initial `practice-map.ts` used only general readiness/Review guards for
`flyFrom`; a retained button from a removed popup could `.click()` after another
popup had replaced it and reset the flight. Unlike the existing location creation
callback, the new action lacked originating-popup identity. Expected: only the
current connected popup may dispatch. The repair checks popup object identity,
content identity and `isConnected` before closing/launching, for both coordinate
and selected-point popups. Async Review transitions also recheck current guards.
**Closed:** final four-group browser evidence checks both retained coordinate and
selected-point buttons after removal/replacement, with no new worker or native
state change. Review disables both popup types and root dispatch guards reject
stale actions independently of visual availability.

**Medium, repaired — ready could precede the first actual heading.** Independent
validate identified that `ready` could arrive before `latest` state; the initial
root callback substituted 90° when current heading was absent. Expected: no map
start until an actual finite current heading exists. Both `canFlyFrom` and the
root `onFlyFrom` now require `latest` and a finite `latest.heading_rad`, and
normalization uses only that value. **Closed by affected source inspection and
final build**, after the browser run. No forced ready-before-state browser
reproduction is claimed.

The earlier broad phrase “unavailable controls” was clarified by the integration
owner: explicit Fly from here is a new-flight action, like Restart, and may
recover a latched collision. It rejects Review, preparation/loading/faults and
pending practice/continuation. Root rechecks readiness, failure, terrain loading
and scene failure rather than trusting a previously enabled button. This is an
explicit criterion decision, not evidence that collision recovery was tested.

## Correctness and integration reasoning

- `validMapStart` requires exactly four own fields, finite values, strict flight
  latitude limits, bounded normalized longitude/true heading and exactly
  Ground/1000/5000/10000 feet AGL. Session validation precedes replacement of the
  old worker; conflicts with preset, runway or saved-position initialization are
  rejected without changing the existing flight. The request is copied.
- The worker repeats validation before asset I/O, rejects incompatible terrain,
  resume/preset/runway requests, then loads the active physical surface before
  deriving `H + height_agl_ft × 0.3048`. Neither geoid separation, map pixels nor
  an airport's catalogue elevation becomes physical ground. Airborne starts
  explicitly use 90 kt TAS, not CAS/IAS or a selected power percentage.
- Ground reuses the existing native runway-settle initializer, with settled
  motion under the inherited 0.05 m/s criterion, idle throttle and full braking.
  “Ground” means settled wheels; it does not mean the aircraft CG is at zero AGL. Unsuitable/coarse terrain can fail
  visibly rather than relocating to another point or inventing a ground height.
- Explicit launch neutralizes/pauses first, clears prior recording/exercise
  context, replaces the session and stays paused. Restart and loading edits
  retain the selected setup and existing run/pause intent. Continue live clears
  the map-start context and restores its selected recorded native state instead.
  Default initialization remains distinct, with stale worker callbacks ignored.
- Height/coordinate choice alone is inert. The explicit launch command is
  separate from GPS/waypoint/standby-tuning actions; current plan/fix state is
  retained. Popup strings are inert text, controls are native button/select
  elements, availability refresh does not rebuild a coordinate popup's choice,
  and no new global shortcut, provider or persisted schema is added.
- The existing plan toggle is moved beside View and still opens the same
  independent editor, with P retained. Narrow CSS assigns its own grid column;
  desktop interaction is verified by the actual browser run. Narrow geometry is
  source-reviewed only, not runtime-measured here.

## Numerical and fidelity limits

The initially strict native AGL assertion failed and is preserved in
`output/flight/map-start-worker-task137-strict-geodetic.log`. At the 1000 ft
New York fixture, native readback is 304.7982359043 m instead of 304.8 m. Existing
bridge source initializes `ic/h-sl-ft` but active-terrain readback uses
`position/geod-alt-ft`; native ground AGL agrees with reported geodetic altitude
minus the shared physical terrain height. No bridge/model correction is made.

The specification now declares a 0.25 m engineering coordinate/display budget,
not an aircraft accuracy limit or exact initialization promise. Eight actual
native starts recorded a maximum absolute height discrepancy of
**0.0348477427 m**, including coarse terrain H=5989.0879 m and the 10000 ft choice
near 9037.0530 m MSL. All three high-terrain trims reported **−1** (failed trim);
subsequent high-altitude handling is not evaluated and level flight is not
established. AGL arithmetic and paused initialization are not climb/handling
evidence.

Saved positions keep their existing −500..6000 m MSL envelope. In particular,
a high-terrain 10000 ft AGL start can be valid but not saved; neither its launch
setup nor a new persistence format is implied. Coarse mixed-datum terrain,
water/landing suitability, surveyed airport geometry, high-altitude performance
and aircraft/training acceptance remain outside this scope.

The actual native binary is `11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`,
while the build record identifies `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
Execution does not establish executable source/build provenance; matching XML
assets do not close that gap. No native rebuild/retune is accepted here.

## Checks and evidence status

Reviewer executed `node --test studies/e1-browser/sim/map-start.test.mjs`:
**3 passed, zero skipped**. `cd app && node --test src/session.test.ts`:
**67 passed, zero skipped**, output `/private/tmp/gefly-map-start-quality-session.log`.
An initial helper test invocation from the app directory used the wrong relative
path; it did not run and was corrected by the successful root invocation above.

The author native `map-start-worker-task137.json`/log contains eight actual
initializations, all four choices, regional/high-terrain cases, twelve malformed
or incompatible requests rejected before asset I/O, and unchanged paused
step/digest/final state. Only transport is adapted; the reviewer read, but did
not rerun, this native diagnostic. The binary remains unchanged during the probe.

Author browser `map-fly-from-task137-browser.json`/log, process 63569:
**exit 0, four groups, Chrome 156.0.8078.80**. Actual map gestures and native Worker
show direct top-bar current-editor access, selection-only physics invariance,
paused 1000/5000/10000 ft AGL coordinate starts, selected-airport Ground, stale
coordinate/point actions and Review guards. Browser AGL discrepancy is at most
0.01735 m; Ground has all three wheel contacts, brake values 1, throttle 0 and
approximately 0.002754 m/s ground speed. Optional scenery pixels are fixtures;
native initialization and terrain are real. No state replacement is used to make
these launch checks pass. Reviewer inspected the final fixture and evidence,
without independently executing it.

Earlier hidden-Start and close-under-header fixture failures remain preserved
separately and are not counted passes. The corrected harness uses ordinary
resume/dismiss gestures; production was not changed to accommodate those locators.
The final heading availability guard and help text were source-inspected after
the successful browser run, with the final build renewed.

Root integrated checks: **523 Node + 22 Python passed, zero skips/failures**;
production build process 81538 passed after the last heading guard. The native
slice also reports three existing legacy-worker checks passed. These are
integrator/author executions, not independent reviewer browser or full CI claims.

Runtime Restart/loading-edit/Continue/collision-recovery paths specifically with
a map-start setup, narrow top-bar geometry, WebKit/hardware and the full legacy
browser matrix are **not evaluated** here. Their source paths were inspected;
this review does not turn that inspection into executed behavior or replace
independent specification validation. Shared status/publication gates remain with
the orchestrator.

## Frozen artifact identity

- Final integrated packet `output/flight/map-start-task137-integrated-packet.json`,
  SHA-256 `7e4652bfe5141d6ff885c3fb7515fd612cd362e0caba6211a5c70e676bb7772f`:
  independently audited all **43 source/evidence pins** against current bytes.
- Native/session packet `output/flight/map-start-task137-packet.json`, SHA-256
  `1037e740ca73a3ebd86f3f8563a1e5f104d2c4d9602d00032aca27265e354fe0`:
  independently audited all **14 pins**.
- UI packet `output/flight/map-fly-from-task137-freeze.json`, SHA-256
  `064116b6cf4d7d372a0f27de8c8322c537724b5539045430fc2311c4629d7d64`:
  independently audited all **7 pins**. Main's final heading guard is carried by
  the integrated packet, not retroactively attributed to the prior UI execution.
