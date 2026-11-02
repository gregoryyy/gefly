# Compact cockpit, native engine switch, ground collision and airflow sound

Scope: TODO 2.0.17, 2.0.28–2.0.31; R-VIEW-1, R-PANEL-1, R-SIM-8, R-ENG-1,
R-AUDIO-1 and affected R-REVIEW-1 behavior. Base: f151204 (PR #45 merge).
Authors: Codex orchestrator on integration, types/session/trace, layout and shared
records; fov_input/code1 on collision/native ignition and NAV/bearing/RPM;
engine_sound_ui/code2 on collision UI, audio, fuel gauge and component browser
tests; fov_housekeeping on parallel source references/input records and the
small shared reference module.

Frozen implementation SHA-256:
`7ccffbc1f0a6bbf97ef265d93b7f34a131dd18b8ff0b9fc6b3dd4e39cab875a7`.
The 48 changed/new app and simulation source/test paths are sorted, hashed as
path + NUL + bytes + NUL; Markdown excluded. The native runtime built with the
pinned JSBSim v1.3.3/Emscripten toolchain has WASM SHA-256
`e808f898ffb8ff2b50ceb4892ac100de42b08584a9dd95c1de86e2d0f417e594`.

## Independent quality

fov_housekeeping reviews implementation excluding its own reference module and
prose. engine_sound_ui reviews root/code1 integration and references, excluding
its own engine/fuel/audio/collision UI. fov_input reviews root integration and
new code2 audio behavior, excluding its native and navigation implementations
and previously authored audio graph. Final compact panel/fuel quality and specification validation pass on the independently executed nine-viewport and three-fuel-group sequence; its per-file hashes and matrix are in output/flight/independent-final-panel/review-outcomes.json. Rolling/contact audio and chase-shadow affected quality/validation also pass, with prior component results retained only where their source hashes remain unchanged. The final device-suspension guard was source-reviewed against its fresh author actual-browser regression; the earlier ten audio groups and three shadow groups were independently executed.
Cross-provider peer remains pending; these same-provider reviews do not claim
that separate gate.

Repairs found during implementation/review:

- The original fin support underestimated a beveled THREE extrusion. A
  conservative square-root-of-two bevel bound now covers the actual mesh;
  an independent 84-vertex/65,160-pose sweep and spinner regression support it.
- Positive collision masks at step/time zero were accepted. Validation now
  rejects impossible startup/future/partial events and freezes first contact.
- Native range End rounding could select the frame before impact forever.
  Presentation-only floating-point serialization tolerance selects the intended stored frame at endpoints and interior timestamps; a genuinely earlier seek still floors.
- The initial app control-gain adapter dropped the new ignition Boolean.
  Actual browser testing exposed it; propagation and a regression now cover it.
- Live collision frames reused the Review flag to disable pressure/AP controls.
  Separate read-only state locks controls while keeping live/recorded labels
  accurate, including flap configuration.
- Fractional uniform zoom changed the autopilot's natural line boxes. Fixed
  canonical AP line dimensions preserve the shared scale and compact bounds.
- An active touchdown tail survived graph-level time discontinuities. The
  graph now cancels it before establishing a new baseline; actual offline
  forward/backward-jump regressions verify silence. Suspended browser audio
  likewise clears the contact baseline before trusted resume.

## Validation and applicability

Independent collision and native engine control outcomes pass, as recorded in output/flight/independent-collision-engine-audio/review-outcomes.json. Compact panel/fuel validation also passes independently. The wheel-audio and shadow extensions pass affected independent review at the final packet, with the device-suspension guard evidence distinction stated above. Author checks
already exercise real native dynamics and Web Audio, rather than accepting a
rendered static screenshot as flight behavior. Sound-design fixtures are
explicitly distinct from aircraft validation.

| Criterion | Evidence scope |
| --- | --- |
| R-PANEL-1: compact order/alignment/scaling | Strict actual-browser geometry covers nine widths/heights, Review overlap and fresh mobile portals; top NAV1/NAV2 and bottom BRG/RPM; engine before AP/trim/flaps; all controls within columns. At 1440×900 the deck is 388 px, previously 449 px. |
| R-PANEL-1: honest live/recorded gauges | Actual JSBSim RPM and model fuel, fictional TRUE LAB bearing independent of OBS; station passage retains geometric DME while bearing is unavailable. Four NAV faces remain available through the mobile dialog. Fuel scales use symmetric left/right vertical arcs with upright labels; the engine command and running indication sit at the bottom, and flap/trim key buttons use half-sized keycaps. |
| R-SIM-8: native contact and stop | A real 600-step normal-wheel fixture remains flyable; an actual native nose-low contact latches its post-step event and pre-step signed motion, then rejects further integration/controls. |
| R-SIM-8/R-REVIEW-1: inspection/restart | Actual stopped frame/digest stay immutable; Review before/at impact, trusted End seek, camera look, compact collision actions and Flight-menu restart are exercised. |
| R-ENG-1: ignition/start | E and the cockpit switch stage paused commands; native ignition cuts combustion while the propeller windmills. On requests modeled cranking, not InitRunning/RPM forcing. Actual RUN/STOP is distinct from commanded ON/OFF. Mixture/throttle remain independent; native failed-start and from-rest cases are included. |
| R-AUDIO-1: activation/state | Sound defaults off with no context; trusted S/repeat/modifier/editing/menu guards, volume/mute, pause/hidden/reset/error/disposal and selected playing Review are exercised in actual browser audio. |
| R-AUDIO-1: airflow | Actual TAS drives independent broadband wind and a broad bandpass whistle. Whistle gain is zero through a sound-design low-speed onset, then rises with speed; it is not an aircraft operating threshold. Engine-off airflow remains audible, zero airflow is silent, and stopped native combustion gates exhaust despite positive modeled fuel flow. Offline/native real-time RMS, occupied bandwidth, centroid and bounded combined peak are measured. Actual WASM wheel contacts drive rolling/touchdown sound; initial/resumed/seeked frames do not fabricate contact. At matched load, 900 RPM engine-only RMS is 0.00849 and 2400 RPM is 0.04348. |

Evidence is local ignored output under output/flight: ground-collision-source.txt,
ground-collision-browser.*, engine-switch-browser.log, engine-switch-landing.log,
engine-toggle-quality-native.json, ground-collision-quality-geometry.json,
engine-audio-browser.*, panel-layout.*, navigation-aux-browser.json,
fuel-gauge-browser.json and independent-collision-engine-audio/. WAV previews
are original procedural audio, without a human listening acceptance claim.

Limits: flat zero-height ellipsoid; native gear/structure plus declared original
visual body/propeller/fin clearance proxies; discrete contact with up to one step
of penetration. No calibrated damage/safe-load threshold, full terrain/building
mesh solver or continuous collision detection. Native c172x ignition/starter
omits installed battery, priming and duty-limit fidelity. Fuel uses 130 lb/model
tank and the pinned default 6.6 lb/US gal, not C172S usable fuel or reserve data.
RPM uses an upstream 2700 model reference without invented arcs. Bearing is a
fictional true-reference spherical teaching display, not installed NDB/RMI,
magnetic navigation or current published procedure. All audio is uncalibrated
original synthesis, with no microphone, downloaded samples or new services.

## Chase shadow

The existing Cesium renderer supplies native mesh casting onto its current flat
ellipsoid receiver, with soft filtering and no model self-shadowing. The cue is
chase-only, fades below 120 m AGL and is hidden for missing/incompatible receiver
data or an unready visual. It uses the existing fixed sun/date. Actual browser
render comparison changes only the shadow enable flag: the native silhouette is
visible, restoring the flag restores an identical PNG and four more stationary
frames remain byte-identical. Native step, digest and all 14 original values
remain unchanged. High-altitude and cockpit states clear the cue. Independent
execution passes all three groups; artifacts are aircraft-shadow-browser.json
and aircraft-shadow-{native,disabled}.png under output/flight.

## Integrated gates

`just ci` exited 0: 238 repository-tool tests, applicable study/synthetic render
checks, 147 app Node tests plus five Python adapter tests, 84 assurance tests and
11 assessment tests pass. Nine of 23 optional e1-jsbsim Python study cases were
skipped because its Python package is unavailable; the other 14 cases executed.
These skips do not stand in for aircraft physics acceptance; actual JSBSim/WASM
landing, engine and browser fixtures executed separately as described above.
Tracked-content whitespace passes over all 402 indexed paths. `just check` and
`just assure check` pass, with zero assurance errors and existing advisory
warnings; the final diff against origin/main is inspected for new requirements,
completed tasks, source/review additions and preserved historical records.
`npm --prefix app run build` passes. Vite reports large Cesium/MapLibre vendor chunks; no bundle-size or device-performance acceptance is inferred. Publication uses a fresh target fetch and local merge-tree check, followed by the GitHub mergeability result.
