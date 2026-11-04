# Runway-practice card and observations

Scope: TODO 2.1.1–2.1.3, partial R-PLAY-1/R-TRAIN-2/R-TRAIN-4/R-REVIEW-1. This is a runnable
practice aid for the generic native 172P, not the accepted Exercise 01, selected
172S model, complete aircraft checklist, published circuit route or landing assessment.

The map's collapsed card identifies the selected prepared runway, objective,
initial idle/parked configuration and controls. The EDFE north circuit is
right-hand for 26 and left-hand for 08, as recorded in the existing
[operator source survey](../research/2026-11-01-edfe-aerodrome-sources.md).
No circuit altitude, speed target or route coordinates are invented. The native
environment remains its no-wind baseline; no live weather report is asserted.

## Sensed event policy

The pure monitor consumes actual worker samples, never interpolated render frames.
Three native wheel weight-on-wheel flags identify contact; all three must be zero
for an airborne observation. Horizontal ground speed is the magnitude of native
forward/side ground velocity. Vertical speed is the negative of native ground-down
velocity; the panel displays it as positive down at contact.

- Establish an initial baseline without creating a takeoff or landing event.
- Confirm a changed contact state after 0.5 continuous simulation seconds. Retain
  the first candidate's timestamp and sampled velocities. Brief bounces do not
  become separate takeoffs or landings.
- After a confirmed landing contact, observe a ground stop after two continuous
  seconds below 0.5 m/s while in contact. Initial parking is never a landing.
- Log a valid structure/proxy collision immediately and latch it until reset.
- Missing/invalid data or a sample gap greater than 0.5 seconds breaks continuity;
  re-establish the baseline without inferring what happened in the gap.
- Retain at most 20 observations. These timing/speed choices are project
  observation policy, not aircraft limits or thresholds for a safe landing.

Touchdown means observed wheel contact anywhere, not a verified runway landing.
Sampled contact velocity is not an independently measured peak impact load.
There is no pass/fail grade or automatic lesson completion.

## Review and limits

Map Stop pauses the flight and retains the observations. A new runway start clears
them. Review reconstructs the monitor from the retained recording prefix through
the selected time, so later observations cannot appear early. The existing
ten-minute recording window and sample continuity limit apply; clipped or sparse
history cannot establish unseen transitions. Live observations remain separate.

Version 1 JSON recordings may include optional `context` with exactly
`{kind: 'runway-practice', version: 1, airport: 'EDFE', runway: '08' | '26'}`.
The trace copies and freezes this small declaration; a new flight resets it.
Malformed or unsupported declared context rejects the recording. Legacy files
without context remain compatible and show unknown runway context, so their card
stays hidden. A contextual import reconstructs observations from that recording's
own retained prefix and identifies its declared runway; it never borrows the live
flight's context or changes native flight state. Review caching distinguishes
recordings by identity even when their timestamps and sample counts match.
Back to live restores the actual session context. Declared context does not verify
that the recorded trajectory was flown at that airport or establish a validated
procedure. Full scenario packages and the full scenario briefing remain open.

## Sensed simulator setup reference

The Setup tab compares the displayed snapshot with this simulator's runway-start
reference. It is an original project aid toward R-TRAIN-4, not a reproduced POH
checklist, aircraft departure procedure or readiness grade. Rows show **Match**,
**Different**, **Unavailable** or **Unsupported**; none can be manually checked
complete, and a different value during flight is expected.

| Row | Expected simulator reference | Observed field / source |
| --- | --- | --- |
| Engine combustion | Running | Actual `engine_running`, not the requested ignition state |
| Applied wheel brakes | Left and right 100% | Both native applied brake-command observations; not the UI parking latch or measured brake pressure |
| Applied throttle | 0% | Native applied `throttle_norm`, not requested slider position or RPM |
| Actual flaps | Displayed 0.0° | Native `flap_rad`, not flap command |
| Trim (raw norm) | Displayed initial setting | Current and launch-reference `pitch_trim_norm` / `pitch_trim_initial_norm`; not an installed take-off mark |
| Autopilot | KAP and legacy channels off | Both `kap_engaged` and `ap_mode` must be present and valid |
| Model electrical | BAT / ALT / AV on | Valid `systems_switch_mask`; independent electrical teaching model, not native circuit telemetry |

The reference comes from the existing
[runway initializer and read-only bridge](../../studies/e1-browser/sim/bridge.cpp),
the app's zero flap-command reset, and
[model electrical defaults](../../app/src/aircraft-systems.ts). The initializer
sets zero throttle, full brakes and a running engine; native model loading resets
the legacy AP, while the [worker](../../studies/e1-browser/sim/worker.js) creates a
fresh KAP controller. The native trim reader supplies the initial simulator setting.
No manufacturer checklist text or aircraft-specific operating limit is added.

Flap agreement uses the displayed 0.1° value, within the existing supported flap
range. Trim agreement uses displayed 0.001 raw-normalized values, with negative
zero normalized for display. These are display-comparison choices, not aircraft
rigging or safety tolerances. Throttle idle and full-brake comparisons are exact;
tiny nonzero/non-full commands remain Different with a bounded percentage label.
Missing, nonfinite, invalid or partial required pairs stay Unavailable. Pilot/
cabin inspections and fuel-selector/run-up equipment stay explicitly Unsupported.

The evaluator reads a snapshot and returns frozen rows, without control writes,
physics changes or remembered completion. Live shows the latest sampled native
values; paused staged controls appear only after a subsequent native echo. The
independent model electrical selections can update while paused without physics.
Review uses its selected recorded floor sample, never current live control values
or future/interpolated frames. Legacy recordings missing these fields remain
Unavailable. A recording's declared runway context does not authenticate its
configuration or make this reference an applicable real-aircraft checklist.
