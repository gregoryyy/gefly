# Progress log

Times use Europe/Berlin; timestamps come from the execution clock. New entries go
above previous entries. This log records implementation, not simulator validity.

## 2026-11-04 20:08 — Correct KAP evidence scope, stale ALT display, shortcuts and terrain mode

TODO: 2.0.108–2.0.111; R-AP-1/R-AP-2/R-WORLD-6/R-WORLD-7/R-UX-2/R-AIRPORT-1.
Agent: Codex integration and actual port5173 inspection; glide_model controller
and shortcut changes; glide_cases browser implementation/observations;
glide_housekeeping independent evidence audit and source quality review.

**Implementation notes**

The running unmocked app reproduced A showing HDG/ALT with a locked0FPM selector
while paused. ALT now ends that stale VS page immediately, preserving intentional
BARO timing. Eighteen focused controller tests pass. The renewed actual cockpit
case uses A, immediate unblurred altitude entry, ALT and UP/DN, asserting visible
VS/FPM/ALT ARM against worker state before a240sim-second native flight. Full pilot
power produced mean517.6FPM (range505.3–534.2) for the500FPM command, capture at116s,
and final altitude error3.01m with −9.72FPM. This is a calm default-fixture
engineering check, not installed KAP performance. The existing seven-group
AP/shortcut/Replay case passes with current menu access. Independent source
quality review passes; cross-provider peer pending.

Removed the generated Option/Alt–Shift catalogue: comma opens/closes the map,
period cycles landmarks, and overlap is click-only. Existing map and overlay
browser checks pass. Exclusive vector mode hides every photo/raster layer,
including late arrivals; the actual official-tile case observed22 rendered vector
tiles with no failed tiles. Missing tiles expose neutral relief. Dependencies are
now independently installed in each checkout; the actual5173 server is running
this source. No new airport models are included here.

**Deviations**

Historical native/panel observations were bounded results, not evidence that all
current cockpit workflows worked. Their TODO records now say so; broader current
KAP usability remains open in2.0.111 and full installed fidelity in2.0.14. The
legacy NAV/audio/CWS browser groups were not rerun for this change. No servo gains,
worker behavior or flight physics were changed. A second root investigation was
invalidated by live reload during editing and is not acceptance evidence.

**Insights**

Test displayed modes and sustained native response through the user's exact
control sequence. Injected displays and direct-native fixtures can miss an
integrated failure. A dependency-install step through a shared node_modules
symlink broke the live checkout; never share a mutable install between checkouts.
Keep builds and checks separate from the user's running dependency tree.

## 2026-11-04 19:03 — Make A switch autopilot off

TODO: 2.0.103; R-AP-2.
Agent: Codex integration and airport-work isolation; glide_model two-file toggle;
glide_cases actual keyboard/menu/native checks; glide_housekeeping source review.

**Implementation notes**

A now captures current heading/altitude when AP is off, and explicitly disconnects
when engaged or capture is pending. The menu names the actual on/off action.
Existing P/panel behavior, input guards and steering reference remain intact.
TypeScript and the existing seven-group flight-assists Chrome case pass: native
on/off/on, both servo outputs zero and LCD OFF, paused state unchanged, panel and
menu actions, and shortcut/Review guards. The nine-group pointer case also passes
A-off servo release with center-marker retention, typed ARM, takeover and CWS.
Independent source review passes;
cross-provider peer pending.

**Deviations**

No KAP mode law, worker, servo or aircraft-physics changes. Pending airfield and
terrain work is preserved in an isolated checkout, outside the running AP fix.

**Insights**

A was implemented as repeated capture, while the user's explicit requirement is
an on/off toggle. Validate the actual shortcut sequence, not just the underlying
capture API. Keep unfinished scenery out of the user's working simulator while
repairing controls.

## 2026-11-04 18:26 — Keep edited altitude armed after its ARM click

TODO: 2.0.102; R-AP-1.
Agent: Codex integration and timer-free gesture cleanup; glide_model panel fix;
glide_cases actual before/after browser; glide_housekeeping independent source review.

**Implementation notes**

Reproduced the clarified symptom: HDG/ALT stay engaged while typing2500 and
clicking ARM dispatches select-altitude762 followed by arm, cancelling the
selection's auto-arm. Remember pre-blur button intent within the panel and
consume only that same gesture's redundant toggle. Retain intent until click,
with explicit gesture/lifecycle cleanup instead of a timing-dependent expiry.
TypeScript and the existing nine-group actual Chrome case pass: the edited
selection stays armed, a subsequent ARMED press cancels, and knob, steering-center,
AP handoff, keyboard takeover and CWS paths remain passing. Source review passes;
peer pending.

**Deviations**

Only autopilot-panel behavior changes. No worker, KAP mode law, input-controller,
flight-physics or aircraft-data edits. Delayed compatibility-click timing was
not directly simulated; no such runtime acceptance is claimed.

**Insights**

The user's clarification distinguishes this ARM failure from the separate
pointer-disconnect regression. A knob-based check missed the natural typed-entry
commit: validate editing the field and clicking the requested action directly,
including the blur/change/click sequence, before concluding the reported issue is fixed.

## 2026-11-04 17:53 — Center steering in the visible flight window

TODO: 2.0.101; R-INPUT-1.
Agent: Codex integration; glide_model two preset defaults and existing unit check;
glide_cases actual geometry/interaction browser check; glide_housekeeping BOOT
insight and independent source review.

**Implementation notes**

Enable the existing fixed-center mode by default rather than retaining a clicked
relative anchor near the window bottom. Both marker and neutral input already use
the same scene rectangle, excluding the cockpit and docked map. Relative mode
remains an explicit Options choice. Seventeen settings cases, TypeScript and the
existing browser case pass: bottom activation centers at720,270, resize at640,268,
and docked map at384.797,268; native step stays0 during geometry checks. Existing
relative, AP/ARM, keyboard takeover and CWS paths still pass. Source review passes;
cross-provider peer pending.

**Deviations**

Only the two preset booleans change runtime behavior. No geometry, pointer gesture,
AP, worker or physics algorithm changes; pointer source edits are comments only.

**Insights**

The user reports unpredictable regressions from small requests, undoing earlier
work and making the simulator unreliable. Modular design must contain changes
rather than spreading them through shared UI/input helpers. Record this as a
design defect, preserve working behavior at adjacent boundaries, and avoid
unrelated refactors or process expansion. Added the durable lesson to BOOT.

## 2026-11-04 17:47 — Keep AP engaged while reaching its controls

TODO: 2.0.100; R-AP-1/R-INPUT-1.
Agent: Codex pointer/AP integration; glide_model session contract; glide_cases
actual browser regression; glide_housekeeping independent source review.

**Implementation notes**

Passive touchpad-yoke motion no longer disconnects AP while capture is pending
or confirmed. Keep the selected steering marker/reference; allow held CWS and
explicit keyboard/stick takeover. Session capture reports dispatch acceptance,
and rejected commands clear pending handoff and show the worker's reason.
Thirty-six session cases, TypeScript and the existing eight-group Chrome pointer
case pass. Immediate motion after A, crossing the scene to ARM, actual arming,
selector auto-arm/cancellation, keyboard takeover and held CWS/release all pass.
Assurance integrity passes; independent source review passes; peer pending.

**Deviations**

The shared CI attempt did not complete (exit101 while disk space was critically
low); it is not a pass. Reclaimed disposable ignored build/GIS dependencies;
source and simulator runtime remain intact. No KAP mode logic or physics changes.

**Insights**

Retaining yoke selection also retained pointer authority, allowing the next
ordinary pointer movement to disconnect AP. Verify the user's complete action
sequence through the next cockpit interaction, rather than stopping at capture.

## 2026-11-04 17:28 — Retain the steering center through routine controls

TODO: 2.0.99; R-INPUT-1.
Agent: Codex main integration; glide_model pointer controller; glide_cases actual
browser regression; glide_housekeeping independent source review.

**Implementation notes**

Routine neutralization now zeros axes while retaining selected yoke mode,
reference and view. Disabled menu/dialog handling does the same. Explicit Off,
focus loss, restart, failure/collision and Review still cancel steering. Unchanged
pointer coordinates cannot restore stale commands; actual re-entry remains
authoritative. Twenty pointer cases and TypeScript pass. Actual Chrome confirms
the same marker through Start, pause/resume, menu dismissal, Options Save and AP
capture without re-clicking steering on. Root inspected the live screenshot;
independent source review passes. Cross-provider peer pending.

**Deviations**

No physics, camera scaling or marker appearance changes.

**Insights**

One shared helper conflated releasing inputs with forgetting the user's selected
steering mode. The previous browser check clicked steering back on after Start,
masking that loss; it now verifies retention directly through real transitions.

## 2026-11-04 17:19 — Keep grounded flight running through contact proxies

TODO: 2.0.98; R-SIM-8.
Agent: Codex integration; glide_model collision policy; glide_cases existing
braking browser; glide_housekeeping independent source review.

**Implementation notes**

Use native wheel support from before each step to suppress collision stopping
once a wheel is already on the ground. Missing/invalid support cannot grant the
exemption; all wheels airborne re-arms detection. Raw contact geometry and native
forces stay unchanged. Fourteen contact cases, TypeScript and the existing
ten-group actual Chrome braking case pass. Full-brake flat/public rolls finish
3600 steps with exactly matching native state/digest; a direct airborne impact
still latches at296 with pre-step wheel flags all zero. Independent source review
passes; cross-provider peer pending.

**Deviations**

This changes the stopping policy, not the aircraft's damage or wheel physics.

**Insights**

A proxy overlap during ground roll must not be treated as a new landing impact.
Pre-step support distinguishes those cases without a new speed threshold.

## 2026-11-04 17:03 — Continue collisions and prioritize ordinary flying

TODO: 2.0.95–2.0.97; R-SIM-8/R-REVIEW-1/R-PLAY-1/R-UX-2/R-INPUT-1.
Agent: Codex panel/menu integration; glide_model collision worker/session/tests;
glide_cases Options layout and existing browser updates; glide_housekeeping
independent source quality and actual flight-launch validation.

**Implementation notes**

Collision ×/Continue acknowledges the current contact without resetting native
pose, time, fuel or history. Same-part contact is ignored only until separation;
new/later contacts remain active. 49 focused cases and the existing actual Chrome
collision case pass: impact303 is retained in JSON, acknowledgement preserves
its native frame and the same worker advances to304 without immediate re-latch.

Flight begins with runway choice, Takeoff, Landing and Fly a circuit. Research
fixtures are secondary; normal practice clears stale research presets. Actual
Takeoff08/26, Landing08/26 initial geometry, landing Restart, Circuit08/26 fitted
guides and research-to-Landing transition pass. Landing is an approximate3NM,
90kt clean initial condition at threshold terrain plus geometric3-degree height;
power/configuration remain manual, with no published-approach or grading claim.

Options has compact Controls/Scenery/Sound and collapsed Advanced groups.
Desktop/mobile screenshots inspected; actual Save, Escape/outside rollback,
advanced-control access and sound enable/mute rollback pass. TypeScript and
shared CI pass (nine optional Python study checks remain skipped). Independent
source quality/scoped validation pass; cross-provider peer pending.

**Deviations**

Collision acknowledgement does not repair or teleport the aircraft. Recorded
collision × only dismisses information; it never resumes the live simulation.
No new native build, physics coefficients, data sources or dependencies.

**Insights**

Ordinary flight actions must precede research fixtures. Explicit preset clearing
prevents a selected contact study from silently changing the next practice start.

## 2026-11-04 16:27 — Repair imagery loading and manual nosewheel steering

TODO: 2.0.91–2.0.94; R-WORLD-5/R-WORLD-9/R-AIRPORT-1/R-INPUT-1/R-PLAY-1/R-AP-1.
Agent: Codex UI/integration; glide_cases actual imagery/cache repair;
glide_model steering adapter and native/browser cases; glide_housekeeping
independent source quality and actual AP/terrain-control validation.

**Implementation notes**

Visible photo requests bypass SW interception, obsolete background loads abort
without cancelling foreground demand, and warming waits for visible scenery.
Reserve HTTP capacity for workers and import map-renderer code before photography.
Real cache-enabled photography loads 54 regional JPEGs plus live photos without
failures. Real map textures render from nine BKG vector tile URLs with zero
failures; remaining tiles continue streaming. Root inspected the actual map screenshot. Map renderer code loads before photo traffic; browser connections remain available for worker downloads.

The generic upstream Autopilot system overwrote manual nose steering every FCS
step. Prepared adapter v4 appends manual steering after it, preserving the source
10-degree geometry, friction and aerodynamic coefficients. Actual wheel angle
now retains the commanded ±3.5 degrees; symmetric 5 kt coasts turn about ±12 degrees
in three seconds. Six adapter cases, eight actual runway/browser groups and five
parking/rudder groups pass, including taxi turns and a full-power takeoff.

View → Terrain / Alt+Shift+J synchronizes with Options and the map. Actual AP
panel engagement, selector autoarming, ARM cancellation/rearming and VS commands
pass; ARM/ARMED state and titles now explain the source-prescribed toggle. Seven
regional imagery units, the cache cancellation browser case and TypeScript pass.
Independent source quality and scoped validation pass. Shared CI passes with local
server permissions; the earlier default-sandbox run could not bind its runtime
test listeners. Cross-provider peer pending.

**Deviations**

No new feature or aircraft-performance calibration. Imagery uses native HTTP
caching for visible photographs; complete offline/photo coverage is not claimed.
The user's intermittent no-acceleration report stopped reproducing during this
work; both fresh and saved-ground runs accelerate in the actual app. No invented
startup fix is claimed. Local WASM was rebuilt; other checkouts need the normal
flight-engine build to obtain steering adapter v4.

**Insights**

Command telemetry and high-speed aerodynamic yaw hid failed wheel steering.
Verify low-speed motion through complete physics steps. Real tile rendering,
cancellation and worker loading matter beyond UI flags or mocked imagery.

## 2026-11-04 14:41 — Consolidate merged cockpit fixes for main

TODO: 2.0.87–2.0.90. Agent: Codex integration.

**Implementation notes**

PRs #80/#81 were merged into feature branches; main still lacked their fixes.
Prepare one direct-main integration PR with the identical reviewed product bytes.
TypeScript passes; prior scoped browser evidence remains applicable.

**Deviations**

No new feature or code change. Main delivery still awaits this integration PR.

**Insights**

Target main directly for subsequent independent fixes; merged PR status alone
cannot establish that its changes reached main.

## 2026-11-04 14:22 — Remove duplicate Aircraft systems menu

TODO: 2.0.90; R-SYS-1. Agent: Codex implementation/integration;
glide_model existing browser checks; glide_housekeeping independent source review.

**Implementation notes**

Remove Systems from View; keep inline left controls on desktop and a direct
collapsed panel opener on narrow screens. TypeScript and all five existing
systems browser groups pass, including mobile access and Review invariance.
Independent source review passes; cross-provider peer pending.

**Deviations**

No systems-model change or broad suite rerun; include this cleanup in cockpit PR #81.

**Insights**

Responsive access belongs to the same panel rather than a duplicate menu entry.

## 2026-11-04 14:17 — Drag zoomed cockpit content without control jumps

TODO: 2.0.89; R-PANEL-1/R-INPUT-1. Agent: Codex implementation/integration;
glide_model existing browser checks; glide_housekeeping independent review.

**Implementation notes**

Drag enlarged panel backgrounds/headers to any content edge. Remove automatic
focus panning; buttons, levers and OBS faces keep their own gestures. Existing
zoom bounds, fixed deck/flight-view height and double-click reset remain usable.
TypeScript and the existing Chrome layout case pass across 13 viewports and fresh
mobile loading, including bottom access, controls retaining position and pointer
release/re-entry. Bottom-access screenshot inspected. Independent source quality
and scoped validation pass; cross-provider peer pending.

**Deviations**

Only the existing affected browser case ran, without a broad flight/CI rerun.
No dynamics, aircraft data or dependencies changed.

**Insights**

Focus-triggered panning moved controls during interaction. Explicit background
dragging provides access without repositioning the control being operated.

## 2026-11-04 14:00 — Touchpad rudder and nosewheel linked by default

TODO: 2.0.88; R-INPUT-1. Agent: Codex implementation/integration;
glide_model existing tests; glide_housekeeping independent source review.

**Implementation notes**

Enable the existing bank/rudder assist by default, preserving manual rudder
priority and the option to disable it. TypeScript, 21 focused input tests and all
five existing parking/rudder Chrome groups pass, including actual touchpad inputs
reaching native rudder. Independent source review passes; cross-provider peer pending.

**Deviations**

No dynamics or wheel coefficients changed; this fixes input linking, without
claiming new low-speed taxi calibration. Broad flight/CI suites were not rerun.

**Insights**

The touchpad supplied bank alone while the existing rudder/nosewheel link was off.

## 2026-11-04 13:56 — Options dismissal without saving

TODO: 2.0.87; R-UX-2. Agent: Codex implementation/integration;
glide_model existing regression; glide_housekeeping independent review.

**Implementation notes**

Options retains live previews, with explicit Save. Outside clicks and Escape
restore the opening gains/preferences, roll correction and audio volume. Both
press and release must be outside: padding clicks and slider drag-out stay open.
TypeScript and the focused existing Options regression pass in actual Chrome;
a separate Chrome probe confirms Escape rollback. `just check` and
`just assure check` pass. Independent source quality and scoped validation pass;
cross-provider peer pending.

**Deviations**

Only the affected browser block ran; the full flight suite and broad CI were not
rerun for this dialog change. No aircraft dynamics or dependencies changed.

**Insights**

Dismissal must restore controls added by the main application as well as settings
owned by the dialog itself.

## 2026-11-04 13:37 — Reconcile caching with merged flight and terrain work

TODO: 2.0.82; R-WORLD-9. Agent: Codex integration; glide_housekeeping review.

**Implementation notes**

Merge main through PR #76 into caching PR #78. Preserve the complete main browser
check list plus cache checks, the 108-tile terrain specification and chart access,
and sorted tasks 77–85. All 138 parent DONE entries retain their complete bodies.
TypeScript, 15 focused cases, actual Cache Storage browser, scaffold and assurance
checks pass (zero assurance errors; existing warnings retained).

**Deviations**

PR #79 still reports open on GitHub; no unmerged place-lookup code is pulled into
this integration. No broad CI or aircraft-fidelity acceptance.

**Insights**

Resolve conflicting records by task/requirement identity, preserving complete
entries rather than interleaving headings and paragraphs.

## 2026-11-04 13:26 — Right-click place lookup

TODO: 2.0.86; R-WORLD-7/R-INPUT-1. Agent: Codex UI/integration;
glide_cases source lookup; glide_model existing browser check;
glide_housekeeping independent source review.

**Implementation notes**

With labels enabled, right-click terrain for the nearest mapped name/distance.
Use actual globe picking and three bounded source tiles; cache results, cancel
superseded requests and separate empty data from unavailable names. Off preserves
the existing context-menu handling; sky sends no query. Mac Ctrl-click does not start a
pointer-yoke gesture. TypeScript, 11 source cases and 19 existing pointer cases
pass; independent source review passes. The existing Chrome landmark case passes
actual ground lookup, sky/Off no-query guards and paused native-state invariance.
Cross-provider peer pending.

**Deviations**

Lookup samples source anchors, not an exact address or exhaustive reverse geocoder.
No new public geocoder, dependency, native model change or broad CI run.

**Insights**

Pick rendered ground rather than inventing a location from a sky/ellipsoid hit.

## 2026-11-04 13:13 — Warm the expanded northern and western region

TODO: 2.0.82; R-WORLD-9. Agent: Codex integration.

**Implementation notes**

Extend imagery candidates to 7–10°E / 49–51.5°N and terrain candidates to
7–10°E / 49.25–51.5°N. Existing manifests still filter unavailable terrain
assets before requests. Five focused coverage tests pass; the actual 108-tile
terrain and provider extension are in PR #76.

**Deviations**

No expanded source rights, physical coverage or full-radius availability is
inferred from the warm plan alone.

**Insights**

Keep preload extent aligned with installed source manifests and display coverage.

## 2026-11-04 13:10 — Terrain beyond the Taunus and chart access

TODO: 2.0.84/2.0.85; R-WORLD-5/R-CHART-1. Agent: Codex integration;
glide_cases terrain compiler/data and chart sources; glide_model runtime;
glide_housekeeping independent review.

**Implementation notes**

Add 66 actual height tiles for 108 total (14,377,824 bytes), west to 7°E and
north to 51.5°N. Original 42 tile hashes remain unchanged; all 195 shared edges
match. Native WASM rebuilt; six-location native comparison has zero H mismatch,
with at most nine resident tiles. New Flight presets and location persistence
cover Westerwald/Lahn/Marburg/Kassel; northern Hessen photography retains source
footprints and map fallback. Flight map Charts opens OFM VFR and DFS AIP sources.
TypeScript, 51 focused terrain/session/location cases and nine proxy cases pass.
The existing native/Cesium browser case passes all six presets, 0.25 m mesh
agreement, map/Review isolation, chart links and missing/corrupt fail-closed paths.
[Review](reviews/2026-11-04-beyond-taunus.md); peer pending.

**Deviations**

Aeronautical charts remain publisher-hosted. Working OFM raster tiles do not
establish product reuse rights; full current terms and publication metadata were
unavailable. Embedded chart/airspace/procedure layers remain TODO 2.0.85.1.
DGM200 is broad relief, not surveyed airport/obstacle detail.

**Insights**

Keep source geometry and old tile bytes stable while extending the streaming
matrix, and update the native ID limit, rendering and saved-location fences together.

## 2026-11-04 12:48 — Prioritize visible map loading

TODO: 2.0.83; R-WORLD-6/R-WORLD-5. Agent: Codex integration; glide_cases proxy;
glide_model map request priority; glide_housekeeping independent review.

**Implementation notes**

Use BKG WMTS tiles; separate map and aerial job/network pools and promote
queued visible requests, including deduplicated loads. Eight proxy cases and
TypeScript pass. Actual MapLibre map readiness observed at 2.138 s on the running
local server. [Review](reviews/2026-11-04-map-loading-delay.md); peer pending.

**Deviations**

One map-renderer timing is not a full cold-app budget or reproduction of every
40-second case. Tests use existing Python 3.11/Pillow dependencies; no new package.

**Insights**

Cached background requests must still allow urgent demand to promote proxy work.
The related browser-cache fix is in PR #78.

## 2026-11-04 12:48 — Let visible maps promote background loads

TODO: 2.0.82; R-WORLD-9. Agent: Codex implementation; glide_housekeeping review.

**Implementation notes**

Separate visible pending requests from warming and bypass HTTP coalescing only
when the same background URL is pending. Preserve cache hits and ordinary dedup;
allow the proxy's visible priority promotion. Existing real Cache Storage browser
case passes with the added visible-request observation; independent source review
passes. Companion proxy/map changes are in PR #76; peer pending.

**Deviations**

No full-map latency guarantee or broad test rerun.

**Insights**

Browser HTTP coalescing can hide request priority even after worker dedup is split.

## 2026-11-04 12:35 — Step down simulation speed

TODO: 2.0.47; R-SIM-9. Agent: Codex implementation; glide_housekeeping review.

**Implementation notes**

Shift+= / + steps 10× → 5× → 2× → 1.5× → 1×, clamped at 1×,
for live and Review. Flight menu shows the shortcut; Shift-click also decrements.
German Shift+0 producing = remains speed-up. TypeScript and the existing actual
native-worker flight-assists browser check pass, including guards and paused-state
invariance. Independent glide_housekeeping source/coverage review passes with no
findings; peer pending.

**Deviations**

No new rates or broad test suite; fixed-step dynamics remain unchanged.

**Insights**

Character and physical-key matching must distinguish shifted US + from German =.

## 2026-11-04 12:24 — Distance-based scenery loading and persistent cache

TODO: 2.0.82; R-WORLD-9/R-WORLD-5/R-WORLD-7.
Agent: Codex integration/cache; glide_cases geographic planner and independent
cache review; glide_model labels; glide_housekeeping design and scoped review.

**Implementation notes**

Warm map/imagery/vector and hash-identified terrain tiles around the simulated
position; use 60/20/2 km enabled label tiers. Replan after movement, stop old
queued warming and bound persistent public responses to 128 MiB/512 entries
(landmarks 24 MiB/96), with source freshness and LRU eviction.
TypeScript and 29 focused unit cases pass. Actual Cache Storage browser checks
pass reuse/reload, sharing, expiry, exclusions, hash identity, two warm slots and
label eviction. Real Vite terrain headers/hash rejection/storage smoke passes;
existing Cesium/native landmark flight/replay browser passes (67 name requests).
[Review](reviews/2026-11-04-scenery-cache.md); cross-provider peer pending.

**Deviations**

No broad CI rerun. Radius targets remain subject to source coverage and budgets;
this is not offline application support or expanded physical terrain coverage.

**Insights**

Persistent caching must honor source freshness and validate actual server headers.
Content-hash URLs preserve terrain integrity across deployments; cache persistence
must not delay visible-demand responses.

## 2026-11-04 12:07 — Aircraft dynamics and cockpit feasibility

TODO: 2.0.81; R-SCOPE-1/R-REUSE-1.
Agent: Codex integration; glide_cases gliders; glide_model light aircraft;
glide_housekeeping airliners and scoped independent review.

**Implementation notes**

Compare all requested types for exact variants, primary manuals, open FDM/system
reuse, cockpit scope, license limits and missing whole-envelope data. Preserve
C172-first scope and link the study from ROAD and the research/input indexes.
Independent documentation review is recorded in the [report](reviews/2026-11-04-aircraft-feasibility.md).
`just check` passes; assurance reports zero errors (existing warnings retained).
No runtime tests or aircraft validation. Peer pending.

**Deviations**

Some current manuals and vendor SDK/rights terms were unavailable; these remain
explicit gaps. No aircraft package or copyrighted manual was imported.

**Insights**

Available look-alike models can be the wrong variant. Public performance tables
and complete-looking panels do not establish full-envelope flight fidelity.

## 2026-11-04 11:44 — Takeoff loading and native fuel consumption

TODO: 2.0.80; R-SIM-11/R-REVIEW-1.
Agent: Codex integration; glide_cases native loading/fuel; glide_model dialog and
session/trace; glide_housekeeping scoped independent review.

**Implementation notes**

Flight → Weight & fuel (Alt+Shift+W) edits six source-model loads and initial
left/right fuel, with explicit Apply/restart. Show native mass, remaining/used
fuel and flow. Restart preserves the selection; modern recordings preserve
loading, and legacy continuation explicitly uses original model payload.
Native proof shows 300 kg added payload reduces acceleration; 30 s powered operation
uses 0.388 L and reduces mass 0.307 kg. One browser case verifies real configuration,
fuel/mass decrease and retained restart settings. TypeScript passes; no broad CI
rerun. [Review](reviews/2026-11-04-aircraft-loading-fuel.md); peer pending.

**Deviations**

Source defaults, including the generic model's auxiliary load, are retained;
no certified 172S loading limits or fuel-performance calibration are claimed.

**Insights**

Reuse native fuel delivery and mass balance. Ignition off alone does not imply
zero fuel flow when the model's propeller is windmilling.

## 2026-11-04 11:26 — Collision-panel Flight menu

TODO: 2.0.79; R-UX-2.
Agent: Codex integration; glide_cases one-line fix; glide_model existing browser
regression; glide_housekeeping scoped review.

**Implementation notes**

Reveal the top bar before opening Flight and focusing Restart. The existing
collision browser passes visibility/focus and actual restart. [Review](reviews/2026-11-04-collision-flight-menu.md).

**Deviations**

None; no physics or input change. Peer pending.

**Insights**

An open details element is still invisible inside a hidden header.

## 2026-11-04 11:14 — Low-speed ground-collision grace zone

TODO: 2.0.78; R-SIM-8.
Agent: Codex integration; glide_cases policy; glide_model existing test;
glide_housekeeping scoped review.

**Implementation notes**

Ignore collision stopping only when pre-impact groundspeed is below 10 kt and
downward speed below 2.5 kt. Raw contacts and wheel physics are unchanged.
Existing collision module: 12 tests pass; no new harness or broad suite.
[Scoped review](reviews/2026-11-04-ground-collision-grace.md); peer pending.

**Deviations**

None. The bounds are simulator policy, not real-aircraft damage limits.

**Insights**

Use pre-impact speed so an impact slowing the aircraft cannot conceal itself.

## 2026-11-04 11:06 — Continue live from a replay frame

TODO: 2.0.77; R-REVIEW-1/R-SIM-4.
Agent: Codex orchestrator integration; glide_cases native reconstruction;
glide_model session/trace/controls; glide_housekeeping independent scoped review.

**Implementation notes**

Continue live starts a new native branch from selected pose, velocities/rates,
controls, fuel, engine and supported avionics state. Retain the earlier trace,
drop its future and accept complete imported frames. A candidate worker must
initialize successfully before replacing the original paused flight. Back to
live keeps its existing behavior; unavailable frames explain why.
Native cases, TypeScript and the existing replay browser check pass, including
an imported middle frame and actual subsequent flight. [Scoped review](reviews/2026-11-04-replay-continue-live.md)
passes. Full CI was not rerun after the user's request for less unnecessary
process; peer remains pending.

**Deviations**

This reconstructs initial conditions, not hidden integrator/thermal/contact
history. Incomplete, damaged and unsupported transient frames stay view-only.

**Insights**

Use the native first frame, preserve applied controls without reapplying UI gains,
and keep the original worker until reconstruction succeeds.

## 2026-11-04 10:33 — Native browser fullscreen

TODO: 2.0.76; R-VIEW-1/R-INPUT-1/R-REVIEW-1.
Agent: Codex orchestrator integration; glide_cases fullscreen controller;
glide_model menu/browser integration; glide_housekeeping independent review.

**Implementation notes**

F and View toggle native document fullscreen, including cockpit/map panels and
body-mounted dialogs. Labels follow actual browser state; handle busy, rejected
and unavailable requests, guarded shortcuts and cleanup. Existing responsive
layout adapts without resetting flight. TypeScript and five actual browser check
groups pass, including running flight, paused/Review state, instrument bounds and
failure fixtures. [Scoped independent review](reviews/2026-11-04-browser-fullscreen.md)
passes; cross-provider peer remains pending.

**Deviations**

Physical browser Escape exit was not evaluated: headless Chrome did not perform
that browser action. Native fullscreenchange synchronization and F/API exit are
verified; no CSS fullscreen substitute or keyboard lock is added.

**Insights**

Fullscreen the document rather than just the scene canvas so dialogs and cockpit
controls stay in the same browser fullscreen context.

## 2026-11-04 10:23 — Quieter direction cues and full vertical look

TODO: 2.0.75; R-VIEW-1/R-INPUT-1/R-REVIEW-1.
Agent: Codex orchestrator integration; glide_cases camera/pointer mapping;
glide_model direction-cue gating/browser checks; glide_housekeeping independent review.

**Implementation notes**

Keep the forward crosshair; show extra L/R/U/D/B cues at 25° actual camera/body
separation and hide them at 22°, avoiding near-front clutter and threshold
flicker. Accelerate outer vertical pointer travel toward the scene edges and map
outer camera angles to true poles while preserving central drag response, default
views, analytic camera orientation and retained look on release.

Independent pointer/orientation units pass 28 cases. Eight actual Cesium/native
browser groups pass, including front-only views, hysteresis, centered cockpit
U/D at the drag limits, FOV/resize and paused/Review native-state isolation.
Shared CI passes with nine existing study cases skipped, not passed.
[Independent scoped review](reviews/2026-11-04-view-marker-visibility-poles.md)
records quality and visual validation; peer remains pending.

**Deviations**

Chase retains its heading/horizon-relative orbit: its poles are world vertical,
while cockpit poles align with the aircraft's actual U/D axes at any attitude.
No flight-control, avionics or physics change.

**Insights**

Reaching a real camera pole requires accounting for the default viewing offset
as well as pointer travel. A nominal angle limit alone left U/D unreachable.

## 2026-11-04 10:10 — Faint active yoke-center marker

TODO: 2.0.74; R-INPUT-1.
Agent: Codex orchestrator integration; glide_cases neutral-point query;
glide_model marker/UI and browser checks; glide_housekeeping independent review.

**Implementation notes**

Show a faint 14px ring/dot at the actual active neutral pointer reference. Keep
the relative anchor through borrowed look; follow scene resizing in centered
mode. Hide when off, unavailable, outside the scene or in Review. The marker is
noninteractive and decorative; observing its position changes no control state.
Focused pointer units pass 18 cases; the real-pointer browser passes six groups
with native paused-state isolation. [Independent quality/validation](reviews/2026-11-04-yoke-center-marker.md)
passes; cross-provider peer pending.

**Deviations**

None. No new settings, input semantics or physics changes.

**Insights**

Render the authoritative neutral point separately from the projected aircraft
nose so looking around cannot suggest a shifted steering reference.

## 2026-11-04 10:01 — World-authoring research and planned scene pipeline

TODO: 2.0.73; R-WORLD-8/R-WORLD-3/R-AUTHOR-1/R-DATA-1.
Agent: Codex orchestrator synthesis/shared documents; glide_cases traditional
geospatial/procedural research; glide_model AI/neural research;
glide_housekeeping independent documentation quality and scope validation.

**Implementation notes**

Add world authoring to ROAD, ARCH and SPEC: real map/terrain/building layers,
regional geotypical materials and vegetation, deterministic scene compilation,
streamed glTF/3D Tiles, editable preview and community packages. Record a bounded
2 × 2 km EDFE demonstrator, then authoring preview, optional LLM recipe A/B on a
1 km² subset and an optional captured/neural landmark as unchecked work.

[Research synthesis](research/2026-11-04-world-authoring.md) links primary-source
traditional and AI assessments. Compare tool/data/model/asset rights separately,
current Cesium Gaussian-splat streaming, geotypical versus measured geometry and
source resolution versus accuracy. UrbanWorld2.0 is an architectural reference,
not a cleared dependency: its named Hunyuan model excludes EU use. Preserve
physics/navigation authority separately from decorative or captured scenery.

Shared CI passes with nine existing JSBSim study cases skipped, not passed;
foundation/link and assurance checks validate document integrity only. The
[scoped independent review](reviews/2026-11-04-world-authoring.md) records research
quality/coverage. No new runtime, asset import, model/provider selection or
performance benchmark is delivered. Cross-provider peer remains pending.

**Deviations**

Implementation tasks remain unchecked. The user's existing untracked public-data
research file was read for context and left untouched. No paid service, model
weight or world dataset was activated or added.

**Insights**

High-resolution appearance and geographic truth are different outputs. Ground
imagery/footprints alone cannot establish unseen facades; regional procedural
rules can fill visual gaps while retaining an explicit distinction from measured
facts. Browser splat support makes a bounded capture experiment plausible but
does not create source coverage or collision geometry.

## 2026-11-04 09:46 — Stable KAP climbs, CWS and saved flight location

TODO: 2.0.71/2.0.72; R-AP-1/R-INPUT-1/R-REVIEW-1/R-UX-5.
Agent: Codex orchestrator UI/integration; glide_cases controller/native response;
glide_model location/session implementation and independent UI review;
glide_housekeeping primary research and independent integrated quality/validation.

**Implementation notes**

Persist a bounded last live regional position/altitude/heading and ground/airborne
mode locally. Reload restores paused through native initialization; airborne
launch uses 90 kt, ground launch settles the gear at rest with brakes set.
Restart clears the saved location. Review/import/collision frames cannot replace
it; corrupt or denied storage falls back safely.

The v3 generic pitch adapter adds rate damping and changes PID gains. In the
powered calm-air 500 FPM fixture, the 30–90 s climb range improves from 264–737 to
453–481 FPM. Preselect captures ALT at 125 s; pressure-altitude error near 240 s
improves from +13.66 to +2.47 m. The selector immediately restores the altitude
page; UP first reveals a hidden VS and later taps adjust it. Optional held CWS
releases native servos while retaining modes; release synchronizes current VS or
ALT. Clear live axes before CWS release and before Review inhibits live input.
Older recordings show missing CWS state as unknown.

[Independent review](reviews/2026-11-04-flight-location-kap140-cws.md) records
quality and specification validation. Native climb/reset, CWS/worker, existing
AP/descent/MSL, panel/live browser, location reload, units, build and shared CI
pass. Nine existing JSBSim study cases remain skipped, not passed. Assurance
check reports zero errors; lineage diff is inspected before publication.

**Deviations**

This is location persistence, not a dynamics checkpoint. CWS is an optional
KAP140 fit with primary generic-system evidence; installation on this selected
172 is unverified. Generic servo tuning is not installed-aircraft calibration.
Cross-provider peer remains pending; no milestone or training acceptance claimed.

**Insights**

Measure the aircraft trajectory as well as mode annunciations: lit VS/ALT alone
did not reveal sustained surging. Native target capture may complete between UI
observations; browser tests must accept that valid transition and await rendered
LIVE state before changing an independent radio fixture after Review.

## 2026-11-04 09:13 — Floating OSM labels over the terrain

TODO: 2.0.70; R-WORLD-7/R-INPUT-1/R-REVIEW-1/R-DATA-1.
Agent: Codex orchestrator integration; glide_cases OSM decoder/source/proxy,
glide_model Cesium labels/scene and browser evidence, glide_housekeeping source
research and independent quality/specification review.

**Implementation notes**

Period and View cycle Off, Places, Landmarks and Detailed. Render source-marked
names above terrain-sampled coordinates with ground dots, bounded density,
collision/horizon/depth culling and linked attribution. Off makes no name-tile
requests; cancellation/epoch guards prevent stale results. A fixed OpenFreeMap
OSM edition supplies bounded cumulative neighborhoods through reused vector-tile
decoders; preserve their notices in source and UI builds.

Separate four-request BKG/OpenFreeMap pools prevent terrain loading from starving
names, with shared cache/job bounds and reserved queue capacity. Rank bounded
candidates before applying the cap so nearby objects are retained. Independent
data/proxy tests, actual browser live/Review/off/failure checks and shared CI pass.
The final Darmstadt capture shows 57 actual street/POI names over visible BKG
vector streets/buildings/parks. Source and separate outcomes are recorded in the
[review](reviews/2026-11-04-osm-landmark-labels.md).

**Deviations**

The public capture has 22 name tiles loaded and five unavailable, explicitly
marked degraded. BKG has 32 loaded and zero failed; 20 farther requests remain
queued while visible foreground is cartographic. This is bounded on-demand
mapping, not all OSM names, verified obstacle heights, a historical Review map or
an offline database. No native aircraft, terrain elevation or navigation state
changes. Peer pending. The main-targeted PR also contains the still-pending PR73
view/zoom/shortcut work, avoiding another feature-branch-only merge.

**Insights**

Independent map services need independent bounded queues. A label source can be
correct yet fail to appear when blocked behind unrelated texture requests.
Preserve a warm view when checking cartography; cold early captures can show
fallback imagery despite a correctly enabled map layer.

## 2026-11-04 08:13 — O for Options, I for the menu bar

TODO: 2.0.69; R-UX-2/R-INPUT-1. Agent: Codex orchestrator integration;
glide_cases bar shortcut/browser checks, glide_model Options shortcut,
glide_housekeeping independent affected review.

**Implementation notes**

O opens Options even with the title bar hidden; I toggles that bar. Update the
visible shortcut, start hint, documentation and browser helpers. The existing
browser suite passes typing, modal, modifier/repeat, hidden/shown-bar and disabled
Review guards. The legacy Alt+Shift+O alias remains functional.

**Deviations**

None. Prior view/zoom implementation remains unchanged; peer pending.

**Insights**

Keep the Options opener independent of whether its menu button is visible.

## 2026-11-04 08:06 — View reset, body-direction cues and focused cockpit zoom

TODO: 2.0.68; R-INPUT-1/R-PANEL-1/R-VIEW-1/R-REVIEW-1.
Agent: Codex orchestrator integration; glide_cases view gestures/projection and
browser checks, glide_model cockpit zoom/layout and browser checks,
glide_housekeeping independent quality and specification validation.

**Implementation notes**

Double-click the scenery to center the view while restoring the yoke mode and
reference from before the click pair; input stays neutral until actual movement.
Project L/R/U/D at 90 degrees and B at 180 degrees from the aircraft nose against
the actual camera, retaining the existing forward crosshair and edge cues.
Markers remain noninteractive and hide behind the camera hemisphere.

Keep the cockpit area and flying-view split fixed while zooming 1–3× around the
pointer in both dimensions. Clip enlarged instruments below the panel heading,
clamp pan against blank top space, retain focused controls through unrelated
layout notifications and reveal keyboard-focused controls. Double-click housing
or a noninteractive face to restore fit; native controls/OBS gestures retain
ownership. Both relative/centered touchpad modes, paused state and Review are
covered by actual browser checks. Independent units, view/gesture, responsive
focus and FOV/native-state checks pass; source pins and separate review outcomes
are in the [review](reviews/2026-11-04-view-markers-panel-focus.md).

**Deviations**

This replaces the earlier growing-panel zoom with the user's fixed-area crop.
Interactive control surfaces are excluded from the panel reset gesture. Ordinary
pointer presses still neutralize borrowed yoke input; camera reset does not issue
flight commands or move its reference. No dynamics or training-fidelity change
is claimed. Cross-provider peer pending.

**Insights**

A useful instrument zoom must preserve the flying area while letting the operator
focus on a small control. Resize notifications caused by control text must not
reset that focus unless the actual fitted layout changes. A browser double-click
contains two prior clicks, so centering alone cannot preserve yoke references.

## 2026-11-04 07:28 — Bring merged flight-control and circuit increments to main

TODO: 2.0.67/2.1.4; R-INPUT-1/R-VIEW-1/R-PLAY-1/R-TRAIN-5.
Agent: Codex orchestrator integration; glide_housekeeping independent merge audit.

**Implementation notes**

GitHub merged PR70 into the map-terrain branch and PR71 into the flying-controls
branch; main at e2bef5a contained only PR69. Merge the completed branch b87e022
onto current main without conflicts, preserving complete DONE entries and all
previous source/review evidence. The integration tree before this log entry is
byte-identical to b87e022; no product implementation changes are introduced.
Publish the consolidated result with main as its explicit PR target.

**Deviations**

The two GitHub merged states did not establish delivery to main. Existing scoped
quality/validation reports still cover identical source bytes; full circuit and
cross-provider acceptance remain unclaimed. Re-run shared CI and assurance on
the integrated revision.

**Insights**

Verify actual main ancestry after stacked merges. Retarget dependent PRs to main
once their parent is merged before asking for the next merge.

## 2026-11-04 03:13 — Optional north-circuit guide on the flight map

TODO: 2.1.4; R-PLAY-1/R-TRAIN-5/R-WORLD-6/R-REVIEW-1. Agent: Codex
orchestrator integration; glide_cases pure circuit geometry/tests, glide_model
map controls/rendering/browser checks, glide_housekeeping provenance and
independent quality/specification review.

**Implementation notes**

Add an initially off Circuit guide and Fit circuit action for prepared EDFE
08/26 practice. Draw five north-side legs with direction labels over the existing
map, preserve the flown path, and highlight the nearest finite segment from the
selected live or recorded position. Current flight context outranks map selectors;
unknown recordings do not borrow live context. Invalid positions clear the cues.
Reuse the approximate runway geometry, including the displaced 26 threshold.
Keep cue generation and map fitting independent of native physics and recorded
context. Geometry checks and existing airport/map regressions pass; the
[bounded review](reviews/2026-11-04-practice-circuit.md) records final browser
observations, quality and separate criterion outcomes.

**Deviations**

The one-nautical-mile width and departure/final extensions are instructional
proposals. This generated schematic is not EDFE's published route and supplies
no altitude, speed or obstacle-clearance instruction. Nearest leg does not mean
flown leg, circuit completion or a grade. This does not complete milestone 2,
the source-geometry research or aircraft/exercise validation. Peer pending.

**Insights**

A useful practice aid can show the circuit structure while keeping generated
geometry distinct from the actual flight path and published navigation data.
Review must resolve its own runway context before choosing a guide.

## 2026-11-04 02:58 — Taller flying view and retained drag look

TODO: 2.0.67; R-INPUT-1/R-VIEW-1. Agent: Codex orchestrator integration;
glide_cases pointer behavior/tests, glide_model cockpit layout/browser checks,
glide_housekeeping independent quality and specification validation.

**Implementation notes**

Reserve 60% of application height for the flying scene on supported desktop
windows, fit both cockpit rows with the same scale and constrain panel zoom to
that reserve. Relative and centered touchpad modes now retain and accumulate
camera look after release, toggles, pause and focus loss. Preserve yoke anchors,
neutral release and authoritative pointer re-entry; Escape/restart explicitly
center the view. Update the flight-view hint and size the narrow Review stack
from the playback bar’s measured height instead of a fixed offset. Actual browser checks exercise
default-mode retained look and unchanged native paused state, alongside the
responsive panel, centered-mode and FOV/zoom regressions. Scoped outcomes and
limits are in the [review](reviews/2026-11-04-flying-view-controls.md).

**Deviations**

The vertical-area request is interpreted as the flying scene above the cockpit;
the optional circular stick overlay retains its size. Instruments scale down on
short windows to provide that space. No flight dynamics or control gains change.
Cross-provider peer pending.

**Insights**

Camera retention must be independent of the selected yoke reference mode. A
small fixed scenery reserve can leave insufficient vertical flying room when
panels are sized primarily by window width.

## 2026-11-04 02:42 — Regional map texture without terrain labels

TODO: 2.0.66.1; R-AIRPORT-1/R-WORLD-3/R-WORLD-6/R-DATA-1.
Agent: Codex orchestrator scene/map integration; glide_cases implemented the
MapLibre imagery provider, glide_model the fixed-source proxy/style, and
glide_housekeeping source research and independent quality/validation review.

**Implementation notes**

Replace the sparse EDFE-only Vector landscape with official regional map content
rendered without symbol/text layers onto the existing physical terrain. Preserve
normal Map/Aerial background in the flight map; retain photography beneath missing
or loading cartographic tiles. Use one bounded offscreen renderer, cached fixed
BKG tile/sprite routes, a pinned derived style and visible linked attribution.
Actual official tiles outside EDFE and settled same-pose 3D comparisons show roads,
land cover, water and town footprints without labels. Provider eight-group and
proxy six-group independent checks pass; whole-scene comparison, failed-service
fallback, native-state isolation, existing airport/replay and build checks pass.
Integrate main 18e52fe, preserving all exercise tests, selected-state forwarding
and complete shared records; renew affected browser/build/review evidence.
[Review](reviews/2026-11-04-map-terrain.md) records scoped outcomes. Versioned
run observations retain exact source hashes and live-data limitations.
Retain full JSON-pointer extraction for the imported 15,988-node style with a
20,000-node bound; preserve depth 48 and test both overflow boundaries.

**Deviations**

The source is basemap.de vector cartography, not an erased TopPlusOpen raster.
Initial loading can show photography; upstream recovery and global/detail/aircraft
acceptance are unclaimed. Germany map coverage does not extend the physical
terrain region. The native model and terrain elevations are unchanged. Peer pending.

**Insights**

A mode toggle that hides the regional base cannot be satisfied by a small airport
extract. Verify actual rendered pixels and settled foreground coverage, not just
option flags or a few loaded tiles; keep photography as a transparent-layer fallback.

## 2026-11-04 01:56 — Sensed runway-setup checklist

TODO: 2.1.3; R-PLAY-1/R-TRAIN-4/R-REVIEW-1. Agent: Codex orchestrator
integration; glide_cases implemented evaluator/tests, glide_model the tabbed UI
and browser test, glide_housekeeping independent quality/validation review.

**Implementation notes**

Add Briefing/Setup/Events views to the practice card. Seven sensed comparisons
show actual engine, applied brakes/throttle, flaps, launch trim, AP and model
switch values against the simulator start reference. Missing data stays unknown;
unsensed pilot/cabin/fuel/run-up checks remain unsupported. Review consumes only
the selected recorded frame. No checklist interaction changes aircraft settings.
The bounded popover keeps the first rows visible and preserves cockpit space.
Build, seven evaluator groups, five new actual-browser groups and the existing
seven-group airport/replay suite pass. Independent review repaired keyboard
access during Review and initial table visibility; see
[review](reviews/2026-11-04-practice-setup.md). Current bounded run/review evidence
is registered in assurance without rewriting historical input hashes.

**Deviations**

This is a generic simulator launch reference, not a complete aircraft checklist,
pilot confirmation, readiness grade or validated 172S procedure. Raw trim and
model electrical indications retain their stated fidelity limits. Full exercise
and aircraft acceptance remain open. Cross-provider peer pending.

**Insights**

Test whether the learner can actually see and reach the displayed rows, beyond
checking their DOM values. Keep replay seeking authoritative while making all
practice tabs reachable by keyboard, and distinguish applied controls from
paused requests and the unrecorded parking-brake latch.

## 2026-11-03 23:26 — Portable runway context in flight recordings

TODO: 2.1.2; R-PLAY-1/R-REVIEW-1. Agent: Codex orchestrator integration;
glide_cases implemented trace schema/tests, glide_model browser cases, and
glide_housekeeping independent source/quality/validation review.

**Implementation notes**

Version-1 JSON optionally retains a copied, immutable EDFE 08/26 declaration.
Contextual imports restore their own briefing/event log; legacy files remain
unknown. Strict metadata validation rejects malformed extensions before import.
Review caching includes recording identity, and Back to live restores the original
session context. Build, 33 trace tests and both actual browser suites pass,
including same-clock synthetic contact changes and frozen native state checks.
Current bounded run/review records are registered in assurance; previous pinned
observations retain their original source hashes and historical freshness status.

**Deviations**

The declaration does not establish actual runway use, aircraft/weather provenance,
a complete scenario package or training acceptance. Full circuit and engine-off
glide correction remain open. Cross-provider peer pending.

**Insights**

A replay cache needs recording identity alongside timestamps and sample count.
Portable context belongs to the recording, while native state stays owned by the
live session. Legacy data must remain unknown rather than borrow current settings.

## 2026-11-03 16:45 — Runway practice briefing and sensed flight events

TODO: 2.1.1; R-PLAY-1/R-TRAIN-2/R-REVIEW-1. Agent: Codex orchestrator
integration; glide_cases implemented the pure monitor/tests, glide_model the
card, and glide_housekeeping independently reviewed the integrated feature.

**Implementation notes**

Add a compact EDFE north-circuit briefing and actual wheel-contact event log.
Confirm lift-off/contact, distinguish initial parking from a post-landing stop,
retain collision priority, and handle missing/sparse telemetry without invented
transitions. Review reconstructs only the retained sample prefix; imported JSON
without runway context hides the card. Reset clears events. Native takeoffs in
both directions, nine monitor groups and seven browser integration groups pass;
production build passes. Independent bounded review is in
[the review report](reviews/2026-11-03-runway-practice.md).
Register pinned airport-play and new practice observations plus a separate scoped
review in assurance; unavailable embedded-model closure and acceptance remain
explicit. No criterion is promoted merely by registering passing observations.

**Deviations**

TODO 2.0.52 remains open: an exact FlightGear propeller candidate worsened actual
native cases and was withdrawn, with the original WASM restored byte-for-byte.
The maintained shutdown/restart/read-only/reset regression was strengthened.
This increment does not deliver a full circuit assessment, checklist, official
route/altitude, native landing validation or portable exercise metadata. Peer pending.

**Insights**

An open-source candidate still needs native behavior checks before reuse. Keep
observed contact events separate from a landing grade; reconstruct Review from
confirmed sample prefixes, and invalidate caches when retained live history changes.

## 2026-11-03 14:12 — Airport surfaces, runway play, COM and vector scenery

TODO: 2.0.43, 2.0.62, 2.0.64–66 delivered for EDFE; 2.0.63 partially delivered.
Agent: Codex orchestrator/native/UI integration; airport_scenery and airport_com
implemented disjoint scenery/data/UI slices and independently reviewed root integration scopes.
R-AIRPORT-1/2, R-PLAY-1, R-COMM-2.

**Implementation notes**

Add sharp runway/markings/taxiway/apron surfaces, sourced OSM vector surroundings,
shared Options/map scenery choice and optional clearly illustrative practice lights.
Map Start prepares EDFE08/26 on native gear at rest, idle engine and parking hold;
Stop retains recorded Review. Add hash-pinned COM records, map selection/filters,
explicit standby/swap and valid 8.33 channel-name handling. Preserve source credits.
Build, focused model/session tests, full app unit/runtime checks, actual native
public-terrain starts/holding/takeoffs in both directions and end-to-end Chrome
start/stop/COM/vector/replay checks pass. Visual runway screenshot inspected.
Reviews found/fixed coarse-timestep settling, inherited EDDF setup, vector setting
inconsistency and flat-study overlay leakage. Cross-provider peer remains pending.

**Deviations**

Runway geometry is approximate and prepared only at EDFE. No surveyed pavement,
installed PAPI/lighting/obstacle verification, wind-responsive windsock, current
COM service, ATC or automated circuit/landing assessment. Generic practice lights
remain separate from real equipment. Native aircraft fidelity is unchanged.

**Insights**

Validate the stationary gear state before presenting time zero, keep visual detail
independent of collision data, and preserve channel designators rather than rounding
an 8.33 service into a different 25 kHz channel.

## 2026-11-03 12:45 — Bounded panel zoom and refreshed flight image

TODO: 2.0.61; R-PANEL-1/R-VIEW-1. Agent: Codex, direct implementation.

**Implementation notes**

Grow the deck upward during zoom so both instrument rows stay vertically inside
it, cap magnification by viewport height and preserve scenery space above. Bound
horizontal two-finger panning to the instrument edges and restore the fitted
layout on zoom-out/resize. Build and actual Chrome maximum zoom, repeated pan,
AP interaction, fit restoration, camera isolation and paused native-state checks
pass. Keep a directly projected SVG trace visible independently of map-worker
updates, and avoid rebuilding unchanged path data. Map interaction, projection
and selected-recording/native-isolation checks also pass. Capture the actual browser flight for the README; image-specific evidence
and credits are in docs/images/README.md.

**Deviations**

Enlarged columns can require horizontal scrolling. Public imagery coverage and
capture-time availability remain limited; this image is not a scenery benchmark.
Peer pending.

**Insights**

Keep the vertical instrument rows visible by changing the deck viewport together
with magnification; clamping translation alone still clips gauge faces.

## 2026-11-03 12:23 — Left-hand aircraft systems panel

TODO: 2.0.60; R-SYS-1/R-PANEL-1/R-REVIEW-1. Agent: Codex, direct implementation.

**Implementation notes**

Add a left column with BAT/ALT, avionics, exterior-light, pitot-heat and panel-light
buttons, plus digital bus volts, battery amps and load. Use a separate instantaneous
teaching circuit model with explicit generic load estimates and sourced nominal
supply/interlock conventions. Keep all panel columns on one scale and height;
View / Alt+Shift+Y provides compact-screen dialog access. Record switch masks,
validate JSON values and show immutable selected switches during replay; old
traces stay unavailable. Build, 30 focused model/trace cases and actual Chrome
paused controls/native-state invariance, circuit response, layout, replay and
mobile access pass. Panel screenshot visually inspected.

**Deviations**

Electrical values are estimates, not native telemetry. No depletion, recharge
transients, installed-current calibration, low-RPM generation, external-light
rendering, avionics failures, starter restrictions or pitot icing coupling.
Cross-provider peer pending.

**Insights**

Separate circuit selection, modeled power and actual native aircraft effects.
Do not infer a powered circuit merely from a selected switch or invent old data.

## 2026-11-03 12:15 — Radio stack spacing and LAB removal

TODO: 2.0.59; R-PANEL-1/R-NAV-4. Agent: Codex, direct implementation.

**Implementation notes**

Give both inline receivers equal flexible height and distribute their controls
through each unit; keep Stations at the bottom. Remove the LAB checkbox and its
obsolete cockpit description. Retain legacy trace semantics, with old synthetic
browser regressions using an explicit test-only fixture instead of a shipped control.
Build/typecheck and actual Chrome layout checks at 1440/1200/1024 px plus a mobile
dialog pass. Visually inspect the panel screenshot; COM tuning/swap and the real
historical station directory, receiver flags and read-only Review checks pass.

**Deviations**

The extra KAP flight regression hit a Chrome runtime/display failure; no claim of
that suite passing. An auxiliary screenshot write also hit temporary disk exhaustion.
Legacy navigation semantics remain for archived recordings/tests. Peer pending.

**Insights**

Distribute spare height within receiver units, keeping controls grouped, rather
than leaving the whole stack compressed at the top.

## 2026-11-03 12:08 — Replay arrows and playback speed

TODO: 2.0.58; R-REVIEW-1/R-SIM-9. Agent: Codex, direct implementation.

**Implementation notes**

Capture replay Left/Right before focused widgets, seek one second backward/forward,
allow key repeats and clamp at trace bounds. Preserve play/pause intent while
seeking. Add independent replay speed at 1×/1.5×/2×/5×/10× through =, Flight and
the replay bar; label the overlay REPLAY. Keep live pacing and worker inputs intact.
Build, focused transport cases and actual Chrome seeking, rate cycling, 5× clock
progression and frozen native-state checks pass.

**Deviations**

Playback speed changes the recorded-state clock, not the native physics step or
renderer frame rate. Modifier shortcuts retain their normal routing. Peer pending.

**Insights**

Replay transport must own arrows before native slider/map keyboard handling.

## 2026-11-03 12:03 — Near-rest parking-brake contact

TODO: 2.0.57; R-SIM-8/R-INPUT-1. Agent: Codex, direct implementation.

**Implementation notes**

Reproduced full braking applied near 2 m/s: the illustrative propeller proxy
penetrates the ground plane by up to 3.6 cm as the nose strut compresses, below
1 m/s and without native structural contact. Allow up to 5 cm prop-proxy settling
only with all wheels supported, horizontal speed ≤1 m/s and |vertical speed|
≤0.2 m/s. Keep raw clearance, native dynamics and other contact checks intact.
Build, 11 contact cases and actual native/worker braking regression pass, including
near-rest full braking, unchanged state/digest and retained high-speed/impact stops.

**Deviations**

This is an illustrative collision-proxy tolerance, not aircraft propeller clearance
or structural-damage validation. Cross-provider peer remains pending.

**Insights**

Distinguish low-energy settling of approximate visual geometry from native
structure contact; avoid masking every collision merely because braking is active.

## 2026-11-03 11:59 — Pointer-centered cockpit zoom

TODO: 2.0.56; R-PANEL-1/R-INPUT-1. Agent: Codex, direct implementation.

**Implementation notes**

Two-finger up/down over the cockpit magnifies/restores the panel around the
pointer, bounded to 1–3× fitted size. Keep enlarged controls interactive, clip
within the deck, restore fit on resize and leave scenery FOV independent.
Build and actual Chrome pointer-anchor, enlarged AP click, fit restoration,
scene FOV and paused native-state regression checks pass.

**Deviations**

No physics changes. Cross-provider peer review remains pending.

**Insights**

Use one panel transform so instruments, hit targets and labels scale together.

## 2026-11-03 11:52 — Recording files, live return and map overlap

TODO: 2.0.55; R-REVIEW-1/R-VIEW-1. Agent: Codex, direct implementation.

**Implementation notes**

Save/load versioned SI JSON traces from Flight or replay controls. Validate frame
values, order, count and duration before switching to a separate read-only loaded
trace; keep the live recording and native worker intact. Back to live restores
prior flying/paused intent. Load required bundled, hash-checked regional terrain
for recorded views. Comma toggles map overlap; M and N retain map/parking roles.

Build and 30 focused trace/transport cases pass. Actual-browser download/import,
invalid-file rejection, seek/live return, frozen native-state preservation and
map-overlap/parking-brake isolation pass.

**Deviations**

JSON stores recorded samples, not a native physics checkpoint. Retain the existing
ten-minute/36,000-frame bounds and a 256 MB file limit. Peer review remains pending.

**Insights**

Keep loaded review data separate from the current flight so returning live never
rewinds or replaces native physics.

## 2026-11-03 11:30 — Moving chase controls and normal AP clicks

TODO: 2.0.54; R-VIEW-1/R-REVIEW-1/R-AP-1. Agent: Codex, direct implementation
and focused checks under the user's request for proportionate small-change work.

**Implementation notes**

Split the original visual into fixed sections and seven hinged surface nodes.
Actual native left/right aileron, elevator, rudder and flap radians drive their
local rotations in live flight and selected replay; no control input or dynamics
is synthesized. Missing older values reset the visual pose rather than retaining
live deflections. Normal AP clicks now represent the physical engagement press;
long presses still fire once, with immediate disconnect and read-only guards.

Production build passes. Focused browser checks verify each surface changes
visible pixels and neutral restores identical pixels at frozen physics/world
state; native controls, replay seeking and ordinary live AP engagement/disconnect
pass. The maintained KAP panel gesture/availability suite passes. Screenshots are
under ignored output/flight/control-surfaces-{neutral,deflected}.png.

**Deviations**

Hinge locations and exterior shapes are illustrative visual geometry, not a new
calibrated aircraft model. Browser AP click behavior is an explicit interaction
convenience. Cross-provider peer review remains pending.

**Insights**

Use the existing recorded actuator telemetry and a focused rendered check. Keep
this small interaction increment separate from broader physics or process work.

## 2026-11-03 11:13 — Refresh PR #56 and lead ROAD with the product vision

TODO: 0.22 and 2.0.51 integration follow-up; no additional runtime feature scope.
Agent: Codex subagent `engine_labels_markup` resolves PR #56 in an isolated
worktree and owns integration records/checks. `engine_labels_style` rewrites ROAD
as a product vision in parallel. Codex orchestrator owns the user conversation,
review and publication. Existing cross-provider peer findings remain open.

**Implementation notes**

Merge main `9e12eb4` into PR #56 head `18084f6`. Reconcile the three conflicts:
retain warning documentation alongside the sound-activation retry explanation;
union both parents' complete test commands; keep warning-frame/one-shot audio
alongside bounded resume, late-recovery and native test seams. Use explicit runtime
TypeScript imports so main's direct Node audio tests can load the combined module.
Preserve all 96 PR-parent and 100 main-parent DONE sections with unchanged bodies.
Order the whole warning task before the distinct, still-open glide task.

ROAD now leads with the accessible browser flying experience, progressively
realistic aircraft/procedures, professional material and the open flight-school
community. Its visible increments retain weather, traffic, navigation, COM, world
reconstruction, AI authoring, partnerships, financing and distinct licence tracks.
Tooling and gates are confined to a brief supporting closing section.

Focused warning/audio tests pass 31 cases; TypeScript/production build and
assurance integrity pass. The shared run passes 293 Node, 84 assurance and 11
assessment cases; nine of 23 existing native-study cases remain skipped. Its
application phase initially fails because this worktree selects a broken local
Homebrew Python 3.15/Expat installation. Renewing that phase with the existing
working Python 3.11 passes all 293 Node and both six-case Python adapter suites.
The initial full command's exit 1 is retained in the log, not called a passing run.
The orchestrator independently passes 19 focused Node cases, the maintained
warning browser groups with an actual native STALL indication, and both warning
audio groups using Web Audio and live-worker autopilot disconnects. Independent
inspection of all three conflict resolutions and ROAD against the user brief
finds no blocking merge defect; this is bounded integration acceptance only.

**Deviations**

Native bridge/build/model-preparation bytes match main exactly. Reuse the existing
actual generated WASM after checking its SHA-256 rather than rebuild unchanged
native code. No new aircraft physics, warning thresholds, sound calibration,
provider permission, training acceptance or source-rights clearance is claimed.
The existing low-RPM/stopped-prop glide limitation and Q24 remain unresolved.

**Insights**

**Scope drift:** Small product requests expanded into unnecessary workflow,
documentation and branch-management work, delaying the queued improvements.

**Preference for meaningless process:** I treated extra handoffs, bookkeeping
and repeated checks of unaffected behavior as progress. They consumed time
without advancing the requested result. Deliver small runnable changes, batch
minor edits and keep verification proportional to the behavior changed.

The audio conflict needs both state paths: taking one side loses either warning
frames or bounded activation recovery. A new isolated worktree can select a
different Python runtime than the normal workspace; record environmental failures
and renew the affected phase explicitly. A vision should describe the pilot and
community experience before its supporting development discipline.

## 2026-11-03 11:01 — Compact engine readings and low-fuel reference marks

TODO: 2.0.53 complete for this R-PANEL-1/R-REVIEW-1 increment.
Agent: Codex orchestrator owns shared requirements/status and integration.
`engine_labels_style`/code1 implements layout and gauge styling;
`engine_labels_markup`/code2 implements markup, fuel presentation and browser
regressions. `engine_labels_records` records input in parallel.
`engine_labels_quality` independently reviews quality and validates the result.
Cross-provider peer remains pending under the existing batched cadence.

**Implementation notes**

OIL PRESS, OIL TEMP, FUEL FLOW and EXHST GAS now each keep label, value and unit
on one compact line. Move fuel quantities beside the dial, retain 88px fuel
geometry and equal 100px throttle/mixture travel, and keep controls within the
existing panel height. Add mirrored amber lower-quarter arcs/markers, a central
LOW reference and independent per-tank LOW badges. Selected Review quantities
drive the same display; unavailable data hides the badges instead of inventing
low fuel. No flight dynamics, fuel state or recorded controls change.

Shared CI passes 280 app, 84 assurance and 11 assessment cases; nine of 23 native
study cases remain explicitly skipped. TypeScript/production build pass. After
the compact-layout repair, renew the build and independent actual-browser fuel
suite (four groups) and panel layout (ten viewports plus mobile portal lifecycle).
Desktop/mobile screenshots and controlled low-quantity fixtures are inspected.
See [review](reviews/2026-11-03-engine-panel-labels.md).

**Deviations**

The lower quarter is an explicitly declared generic model display reference,
not an installed aircraft low-fuel annunciator threshold or fuel reserve.
Native fuel consumption and existing model/source limitations remain unchanged.

**Insights**

Single-line rows alone did not guarantee panel containment: viewport checks found
overflow below the engine column. Moving quantities beside the dial and fixing
the effective heading height reclaimed space without shrinking lever travel.

## 2026-11-03 10:43 — Generic propeller windmilling; glide gap remains

TODO: 2.0.52 **partial, still open**; R-SIM-10 is not fully accepted.
Agent: Codex orchestrator owns native diagnostics/build metadata, integration,
requirements and shared records. `glide_native`/code1 creates actual native glide
and repeat/reset regressions; `glide_controls`/code2 audits controls and implements
source-pinned propeller preparation/tests. `glide_research_records` researches
sources and records the input in parallel. `glide_quality` independently reviews
quality and validates the bounded increment. Cross-provider peer remains pending.

**Implementation notes**

Confirm the original generic propeller stops after engine shutdown and loses its
drag. Reuse fixed-pitch CP/CT formulas from pinned Aero-Matic source in an ignored
local propeller copy; retain geometry/inertia/Mach corrections and record the
direct-drive design-RPM adaptation. Native shaft dynamics now sustain windmilling
and negative thrust in the verified nominal cases. Add guarded read-only N/W/J/
rad/s diagnostics and exact-reset checks. Keep the remaining stopped/low-RPM
drag limitation visible, with no invented high-advance data or imposed sink rate.

Integrate newly merged main `9960c6a`, retaining both package test sets, complete
DONE records and source-rights disclosures. Fresh native and production builds
pass. Shared CI passes 280 app, 84 assurance and 11 assessment cases plus both
six-case Python adapter suites; nine of 23 native-study cases remain skipped.
Independent native and actual-browser checks cover shutdown/restart, read-only
diagnostics, deterministic reset, engine controls and native approach capture.
The glide suite reports seven nominal cases and one explicitly unaccepted
low-speed idle case. See [review](reviews/2026-11-03-engine-off-glide.md) and
[sources](research/2026-11-03-engine-off-glide.md).

**Deviations**

This is a partial generic-model improvement, not a calibrated C172 glide polar.
In matched 60–120 s diagnostics at initial 2,500 m/35 m/s TAS, retained-throttle
shutdown improves from 13.986:1 to 12.560:1; at 45 m/s, 12.118:1 to 10.532:1.
These finite windows include speed/phugoid transients. Initial 35 m/s with idle
throttle still loses useful propeller drag outside the coefficient-table envelope
and remains unaccepted. Aircraft-specific fidelity, full R-SIM-10, broader source
rights and peer gates remain open; generated runtime/model assets are not shipped.

**Insights**

Positive-only propeller power coefficients can erase drag even when ignition
commands are correct. RPM/force sign checks alone falsely accepted tiny numerical
remnants; native algorithm/table-envelope checks expose the remaining case.
An isolated original-propeller negative control fails the intended regression.

## 2026-11-03 10:21 — Resolve PR #52 against current main

TODO: 0.21 integration follow-up; the batched peer findings remain open.
Agent: Codex orchestrator owns the merge, package scripts and shared records.
`resolve52_ui` and `resolve52_runtime` reconcile disjoint UI/runtime paths;
`resolve52_records` preserves source documentation in parallel.
`resolve52_quality` independently checks quality and specification behavior on
the frozen source packet; this is not an external-provider peer acceptance.

**Implementation notes**

Merge main `a655bc9` into PR #52 head `eb7e5b7`. Preserve receiver-package
attestation, degraded EDDF startup, missing-data handling and bounded retry fixes
alongside streamed terrain, the flight map, parking/rudder controls, centered
touchpad and flight assists. Contact sampling uses the streamed terrain gradient.
Combine live imagery fallback and whole-pyramid failure disclosure. Retain both
parents' package commands and every complete historical DONE entry/body.
Record the existing direct demonstrable-increments instruction with its recording
date, resolving Q25 without inventing an original timestamp or new approval.

Shared CI passes: 280 app, 84 assurance and 11 assessment cases; nine of 23 native
study cases remain explicitly skipped. Fresh native build, native bridge check,
TypeScript and production build pass. Actual-browser smoke, flight-assists and
centered-touchpad suites pass. Independent review passes 140 focused unit tests
and browser checks for unavailable/mismatched worker navigation, streamed region,
native approach capture and parking/rudder controls. See the bounded
[review and frozen packet](reviews/2026-11-03-pr52-conflicts.md).

**Deviations**

No full peer batch acceptance, missing-property/name-reordering native fault
injection, aircraft fidelity or training approval is claimed. Q24 source rights,
TODO 0.19/0.21 and reopened 1.14.1 remain unresolved. Browser map/photo pixels use
local deterministic fixtures; native physics and DEM integration are actual.

**Insights**

Resolving text markers alone misses integration faults: the auto-merged contact
helper still selected the old fine-only gradient. Combined runtime checks and
explicit parent-by-parent record/script comparisons preserve behavior and history.

## 2026-11-03 10:01 — Stall/terrain warnings and autopilot-disconnect audio

TODO: 2.0.51 complete for bounded R-ALERT-1 simulator cues.
Agent: Codex orchestrator integrates actual-state monitors, display/audio, native
UI tests, shared records and publication. `flight_warning_signals`/code1 builds
monitor/panel/tests; `flight_warning_audio`/code2 implements same-context sounds,
edge tracking and waveform/native tests in parallel. `flight_warning_housekeeping`
updates input/control/security docs. `flight_warning_quality` independently
reviews quality and validates runtime/source correspondence. Cross-provider peer
remains pending under the existing batched cadence.

**Implementation notes**

Add compact STALL/TERRAIN annunciators with non-color active/unavailable states.
Stall follows the native model's software warning; terrain is a declared generic
local CG-AGL closure cue with hysteresis, not a terrain-ahead/obstacle scan.
Keep native inputs/physics unchanged, reset derivatives at discontinuities and
use independent live/Review monitors. Review recomputes recorded telemetry cues,
not recorded annunciator history. New steady stall/pulsed terrain/descending AP
sounds share the existing Web Audio context, S/default-off and volume. Observe
actual KAP engagement 1→0 once, with no initial/off/seek/reset/unmute backlog;
new sounds are suppressed for pause, hidden/loading and all Review states.

Shared CI passes 253 app/84 assurance/11 assessment tests; nine of 23 existing native
study cases remain skipped. TypeScript/build and authored UI/audio checks pass.
Independent checks pass 13 pure warning tests, four actual native/UI groups,
20 offline waveform/lifecycle cases plus real P/manual and Q/automatic disconnect,
12 legacy engine/wind/rolling/contact/audio lifecycle groups and 8 KAP tests. Source
and cue limits are explicit; see [review](reviews/2026-11-03-flight-warnings.md).
Final 11-path runtime/test/package packet:
`94d392ca5a81090e665b35a1cc602d9ac5e31a7f3ce37e9178628d3ee4bc20e8`.

**Deviations**

These are generic simulator awareness cues, not installed stall-switch/TAWS/KAP
acoustics or aircraft-safe envelopes. Terrain does not distinguish a planned
landing or include obstacles. A stress fixture uses existing nose-up trim and
combined pilot inputs to trigger the native stall signal; it is not a flight
procedure. Earlier insufficient-input and menu-overlap harness attempts were
corrected without changing physics or warning thresholds. DOM transition history
reliably captures a brief actual warning instead of requiring it to remain active
in a later snapshot. No physical-speaker listening or training acceptance claimed.

**Insights**

Missing stall data initially disturbed repeated valid terrain frames in the
hysteresis band; independent terrain caching and new regressions fix this.
The user's altitude question exposed an incorrect explanation, not a KAP logic
change: selecting altitude while engaged auto-arms capture. Check ALT ARM and
press ARM only if absent; pressing it again disarms. Correct the handbook and
retain the original question plus explanation correction as separate input records.

## 2026-11-03 09:20 — Expanded product vision and roadmap

TODO: 0.22 complete for documentation capture and consistency only.
Agent: Codex orchestrator integrates SPEC/licensing interpretation, decision
history, task status and publication. `road_vision_product` refines ROAD;
`road_vision_housekeeping` records the original input and updates IDEA in parallel;
`road_vision_validate` independently reviews documentation quality and validates
coverage. Cross-provider peer remains pending under the existing cadence.

**Implementation notes**

Record the full user roadmap and align ROAD, IDEA and confirmed direction:
maximum practical browser realism with minimal prerequisites, just-fly through
licence exercises, instruments/procedures and professional references. Cover
community flying/contributions/forum; open-platform partnerships and candidate
financing; coherent weather/traffic; navigation/planning/terrain-projected markers;
COM1/COM2; HUD/transparent instruments/phone orientation/checklists; and regional
Hessen-to-open-DACH-to-later-world expansion. Include the named source candidates,
Google Earth discussion and procedural/semantic/geotypical scenery research.

Keep the free version free and GPL-3.0-or-later. Record optional premium licensed
map/navigation services and AI-cost support without selecting prices, providers,
contracts or a closed-source variant. Distinguish separately licensed service
access from the non-proprietary bundled-asset policy; no restricted dataset is
copied or licensed by this note. Correct stale region/navigation/autopilot status
while preserving the existing first-exercise, aircraft, phase and licence gates.

Independent review finds all ten user themes covered and no blocking
quality/consistency issue. Local link/index and whitespace checks pass; see
[review](reviews/2026-11-03-road-vision.md). No application code, dependencies,
service configuration, project licence file or runtime acceptance changes.

**Deviations**

This is a roadmap update. Capabilities, partnerships, premium subscriptions and
providers remain planned/candidates until individually scoped and verified.
Existing bounded regional prototypes do not complete EDDF/100 NM or DACH coverage;
no weather/traffic/communication service, community deployment, commercial rights
or new qualification/training approval is claimed.

**Insights**

The optional commercial-service direction needs an explicit boundary from the
open/free distribution policy. Recording that distinction now avoids treating a
provider name or a roadmap idea as a redistribution grant or selected agreement.
The roadmap preserves demonstrable increments rather than turning the full vision
into an immediate implementation checklist.

## 2026-11-03 09:09 — Optional centered touchpad and persistent view

TODO: 2.0.50 complete for the bounded R-INPUT-1/R-REVIEW-1 increment.
Agent: Codex orchestrator owns main wiring, contextual hint, explicit new-flight
reset, shared requirements/status and publication. `centered_pointer_core`/code1
implements pointer mode/lifecycle and tests; `centered_pointer_options`/code2
implements Options/settings and the actual-app browser suite.
`centered_pointer_housekeeping` updates raw input/control/security documentation
in parallel. `centered_pointer_quality` independently reviews quality and
validates the integrated criteria. Cross-provider peer remains pending under the
existing batched cadence; no external provider acceptance is claimed.

**Implementation notes**

Options adds the initially off, session-only Centered touchpad controls mode.
Neutral is the current visible scene midpoint, independent of activation/drop
positions and recalculated from current bounds on movement/re-entry. Click still
toggles yoke control. Hold-drag borrows the pointer with neutral axes and accumulates
camera look. Release, pause, focus loss, Options and ordinary cancellations keep
the angle; Escape in the scene and new-flight reset explicitly center it. Release
stays neutral until actual motion or authoritative re-entry. Preserve default
relative control, Review read-only behavior, sensitivity presets and the existing
150 px input travel/gains. No physical trackpad-contact reading is claimed.

Shared CI passes 240 app, 84 assurance and 11 assessment tests; nine of 23 existing
native-study cases remain explicitly skipped. TypeScript/build pass. The six
new authored browser groups pass after test-only observer/readiness repairs.
Independent review passes 32 focused tests, all six new browser groups, three
legacy relative-pointer groups and four additional rendered-camera/live-native
cases. Live center produces native aileron −0.109375 (the existing study offset)
and elevator zero; a +75/−75 px displacement produces .140625/.2. Camera checks
retain the changed actual forward-marker projection through release/Options/blur,
and Escape restores baseline. Paused step/digest/final state stay identical.
See [review](reviews/2026-11-03-centered-touchpad.md).
Final nine-path source/test/package packet:
`4f9ddb1df233553af7584c30e60116be42c0e97beb934dbc2de02f3b0436db72`.

**Deviations**

The browser supplies viewport pointer positions, not the physical center of a
trackpad: the implementation interpretation is recorded in the input note.
Default behavior remains unchanged. No general sensitivity retuning, aircraft
physics change, hardware calibration or training approval is accepted.
Earlier map/parking PRs merged into feature branches after their prerequisite
merged to main; this publication brings those already-reviewed increments and
this option onto current main together.

**Insights**

Paused sessions deliberately stage commands without posting them to the worker.
Tests distinguish observed staged commands from actual frozen native state and
renew live native application separately. Vite formatting and lazy-map readiness
needed observer repairs, not product changes. Independent rendered-marker checks
cover the actual camera in addition to its requested look metadata.

## 2026-11-03 08:53 — Parking brake and optional linked rudder

TODO: 2.0.49 complete for the bounded R-INPUT-1/R-REVIEW-1 increment.
Agent: Codex orchestrator owns integration, compact brake controls, shortcut,
shared requirements/status and publication. `ground_controls_settings`/code1
implements the command mapping, Options checkbox and pure tests;
`ground_controls_browser`/code2 implements actual-browser/native regression checks.
`ground_controls_housekeeping` updates input/control/security documentation in
parallel. `ground_controls_quality` independently reviews quality and validates
specification behavior. Cross-provider peer remains pending under the existing
batched cadence; no external provider review is claimed.

**Implementation notes**

Add the N-toggle parking brake beside held B wheel braking in the existing
compact row. Full native parking braking bypasses the adjustable wheel gain;
the latch survives release/pause/focus/Options but clears on flight restart.
Guard N and disable the button for unavailable/collided/Review states. Review
retains recorded applied braking and explicitly marks the unrecorded latch
unknown rather than inferring it. Preserve native mechanics instead of freezing
position or velocity.

Options adds an initially off, session-only Link rudder to aileron checkbox.
Map deliberate roll before the experimental roll correction, with the pinned
model's opposite rudder sign; nonzero manual rudder overrides, and sensitivity
presets preserve the chosen link. Reuse the existing rudder-to-nosewheel coupling.
Actual native ground-turn cases verify turning direction without new aircraft
coefficients or installed-aircraft calibration claims.

Shared CI passes with 233 app tests, 84 assurance tests and 11 assessment tests;
nine of 23 existing native-study cases remain explicitly skipped. TypeScript,
build and all five new actual-browser/native groups pass. Independent checks pass
41 focused control/session tests, the maintained five-group browser rerun and
extra paused keyboard/layout/held-B/Review cases after the label repair, plus
eight legacy ground-braking browser groups. The
[review](reviews/2026-11-03-parking-rudder.md) records current outcomes and limits.
Frozen eight-path runtime/test/package packet:
`39076da0e3c9df6c9322d43e4f7e56f0774e4f9166b5720e6a9ff2bfa9bdc67b`.

**Deviations**

No native steering change was required: the bridge already maps rudder to the
model's steer command. The rudder link is a simulator input assist, not a claim
of mechanical linkage. Parking-latch history is unavailable in Review; actual
left/right braking remains recorded. No parking-force limit, anti-tip assist,
aircraft-fidelity or training acceptance is added.

**Insights**

Independent layout measurement caught the long wheel label crossing into the
parking button. Short WHEEL/PARK labels retain full accessible names and the
same row height; renewed ON/OFF/Review checks cover 1440 and 1024 px. Paused
latching and settings changes retain identical native step/digest/final state.

## 2026-11-03 08:36 — Right-side flight map and southern Germany source inventory

TODO: 2.0.48 complete for the bounded R-WORLD-6/R-NAV-3/R-NAV-4/
R-REVIEW-1 increment. Agent: Codex orchestrator owns integration, shared status,
airfield loader, map rendering, keyboard routing, screenshot and publication.
`flight_map_data`/code2 implements the map-only NAV compiler/assets/loader and
expanded map proxy; `flight_map_layout`/code1 implements responsive docking,
bounded-label styles and browser checks. `flight_map_research` investigates public
sources; `flight_map_quality` provides parallel source housekeeping and independent
quality/specification validation. Cross-provider peer remains pending under the
existing batched cadence; this entry does not claim an external peer review.

**Implementation notes**

M/marked View menu opens a public-data map on the right of the flying view,
with the whole retained flight path, actual position/true heading, nautical scale,
Follow/Fit/pan controls and Review marker. Preserve the full-width cockpit and
bounded narrow-screen controls. README includes a visually inspected actual
flight/map screenshot with public BKG tiles and source credits. Optional layers and initial background tile
failures do not block local aircraft/path overlays; initialize on style readiness.

Select all 731 OurAirports source entries in the five user-confirmed states,
including 244 heliports and 41 closed facilities, with type/state-code search,
reported elevations and distinct closed labels. Keep all points in the GPU layer,
bounding nearby DOM labels to 80 and directory results to 100. Add 144 source-dated
community radio beacons and 66 historical German LOC/ILS parents with 61 GS/six
separate DME points. Preserve source positions, kHz/MHz, dates, notices and licenses.
These map-only references do not replace the radio receiver/worker package.

Shared CI passes with 229 app tests, 84 assurance tests and 11 assessment tests;
nine of 23 existing native-study cases remain explicitly skipped. TypeScript,
build, six proxy checks and the two authored browser suites pass. Independent
quality/validation passes 16 focused checks, three maintained browser suites,
full-source airport/NAV comparisons and four actual-app optional-data/cold-tile/
held-tile failure cases. Affected lifecycle checks and build were renewed after
the style-ready repair. See [review](reviews/2026-11-03-right-flight-map.md).
The reviewed 24-path runtime/test/source packet is
`b840f38479d7c2d452878e046f893ca350a071f7e9e3c00db341f0592ae80849`.

**Deviations**

The NAV source has no state membership field: its declared German geographic
envelope includes adjoining-state context, while airport selection is exactly
the five states. Community snapshots are not current AIS or an official operating
inventory; LOC/ILS data remains historical 2013.10. Broader map bounds do not
expand physical terrain or photography. No current chart, procedure, NOTAM,
installed-aircraft fidelity or general touchpad handling acceptance is implied.
The initial sandbox CI attempt failed only because local runtime tests could not
bind loopback; the authorized loopback-capable rerun passed.

**Insights**

Real public-service screenshot capture exposed a dependency on initial tile
loading that immediate raster fixtures missed; cold failed and indefinitely held
tile tests now independently verify overlay availability. Full-source comparison
establishes completeness relative to the pinned community selection, separately
from operational completeness. Correct the two previous entries' headings from
07:51/07:30 to 06:51/06:30: their original UTC clock values were converted using
UTC+2, while Europe/Berlin on 3 November is UTC+1. Their complete bodies and raw
inputs are preserved.

## 2026-11-03 08:35 — Close the quality review of the peer fixes (TODO 0.21)

TODO: 0.21 in progress. Agent: Claude Code orchestrator; code2 subagent (fixes);
quality subagent (two rounds, final verdict accept).

**Implementation notes**

- **Quality review:** confirmed the fixes from the 08:05 entry.
- **Medium F55 regression, fixed:** EDDF ILS practice restarted with failing or
  mismatched navdata threw inside `onReady` and left the session half-ready. The
  approach setup now runs only on a navdata match, through `eddfPracticeReady`;
  otherwise the flight starts without it and shows a notice.
- **Runtime evidence:** the [record](reviews/2026-11-03-runtime-evidence.md) was taken at
  main `b3a7538`, before the fixes, as a headless Linux software-rendering run, not
  reference-platform acceptance.
  - JSBSim WASM built with pinned emsdk and JSBSim commits.
  - All native and engine tests passed, including 23 of 23 e1-jsbsim tests.
  - 2 of 26 browser suites passed; 22 timed out at about 1 frame per second and count
    as not evaluated.
- **avionics-smoke:** its GS INOP failure was a stale test after PR #49's live GS flag;
  it is updated.

Checks: 240 app tests passed; `npm run check` passed; `utils/ci/run.py --require-node`
exit 0 (e1-jsbsim 9 of 23 skipped); assure 0 errors.

**Deviations**

- Part of code2's in-progress fix was swept into the orchestrator's docs commit
  `1205774` by a shared-worktree `git add -A`. The history is kept; the full fix spans
  `1205774`, `e7be2c2` and `27c3810`.
- Open low items:
  - in degraded EDDF mode the worker keeps the approach NAV settings while the radio
    panel does not show them (both warnings are visible);
  - `bridge-native.mjs` does not exercise the NaN or name-binding paths;
  - the fitted control column has −4.5 px slack at 1440 px.
- Browser rows stay blocked until a GPU or reference-Mac run. Peer pending (Codex,
  TODO 0.19).

## 2026-11-03 08:05 — Fix the Claude peer-review findings for Codex PRs #39–#50 (TODO 0.21)

TODO: 0.21 in progress; 1.14.1 reopened (F66; 1.14 stays ticked with an open-child warning); GAPS Q24 and Q25 opened.
Agent: Claude Code orchestrator; code1 (simulation, worker and KAP 140), code2 (app
interface and tests) and housekeeping (records, licences, README) subagents.

**Implementation notes**

- **code1** (F16, F24, F25, F39, F45–F50, F54, worker side of F55):
  - **KAP 140:** a selector entry uses the page that was showing when entry started, so
    a BARO entry never becomes an altitude. HDG survives cancelling an armed NAV. Loss
    alerts clear on disconnect. Invalid sensors latch a generic `kap_sensor_fault` and
    disconnect, labelled generic.
  - **Collision:** contacts are matched by c172x name. When contact data is
    unavailable the collision fields are omitted, never sent as `collision_mask: 0`. A
    detected contact is never dropped.
  - **Bridge:** missing properties become NaN, and the JS layer drops the whole group.
  - **Worker:** `ready` reports `navdata_sha256`/`navdata_error`.
- **code2** (F3, F7–F10, F21, F22, F27–F29, F31, F32, F36, F37, F40, F41, UI side of
  F55, F57–F65, F67; F2, F13, F14, F26 already resolved):
  - **Interface:**
    - the rudder sign convention is recorded and tested;
    - Review shows NO DATA for missing recorded fields;
    - navdata hashes are compared, with a visible fail-closed alert;
    - an imagery failure notice and a cancellable, bounded tile queue;
    - audio retry is bounded, and the sound-off hint is visible.
  - **Cockpit CSS:** keycap button text 10 px (key glyph 8 px, 18 px high at scale 1),
    labels at least 7 px at scale 1 (about 5.6 px effective at 390 px), cascade cleanup.
  - **Tests:** the missing-engine smoke test derives the worker's static import graph.
  - **Rights labels:** the app source objects carry `rights: unresolved (GAPS Q24)`.
- **housekeeping** (F4, F5, F19, F20, F32, F33, F34, F42–F44, F51–F53, F56):
  - **Provenance:** imagery editions are recorded as unknown, the overview photo is in
    the notices, research-note source tables are added, and the C172P POH and JSBSim
    values are labelled "rights unresolved".
  - **Audit:** a fresh npm audit (0 vulnerabilities, 07:36).
  - **Notices:** Python package licences added.
  - **Navdata:** the EDDF centre is pinned to an OurAirports record, with the first
    builder tests.
  - **README and SEC:** match the current controls.
- **Orchestrator:** GAPS Q24 (rights basis, user decision) and Q25 (confirm the
  increments rule from F6), the TODO 1.14.1 rewording, the CI-claim correction below,
  and README behaviour notes.

Checks: see the integration entry's PR. code1 ran native engine tests against a local
engine build (landing-physics, autopilot-native, kap140-worker, navigation-worker,
bridge-native and kap140-panel.browser passed). The full-app browser suites time out
on a click in this container, and do so on unmodified main too, so they count as not
evaluated.

**Deviations**

- The F55 fail-closed rule also disables regional guidance for an older local runtime;
  rebuild it.
- F61 keycaps are 18 px high (the column limit), short of the reviewer's ~24 px target.
- The fixes are Claude-authored, so they go to the Codex review (TODO 0.19).

## 2026-11-03 08:05 — Correct hosted-CI claims for PRs #43–#45 (TODO 0.21)

TODO: 0.21 in progress; corrects records for 2.0.9 through 2.0.27. Agent: Claude Code
orchestrator; housekeeping subagent.

**Implementation notes**

The CI claims in these entries were local results only:
- 2026-11-02 18:32 (#43);
- 20:06, 20:28, 20:50, 21:07 and 21:22 (#44);
- 21:40 (#45).

Hosted Foundation runs on main failed in the Browser application unit job at
`src/field-of-view.test.ts:74` (AssertionError true !== false):
- 41493487096 at `4a98ed5` (#43);
- 41520958345 at `f857801` (#44);
- 41522096307 at `f151204` (#45).

`7610edc` (#46) fixed the test, and 41573985279 at `c852694` was the first green run.
Those PRs merged on red hosted CI. The earlier entries are kept unchanged, and their
local claims cannot be checked because no raw local output is tracked. See peer
findings F11, F15, F18, F23, F30, F35 and F38 in the
[peer review](reviews/2026-11-03-codex-prs-39-50-peer.md).

**Deviations**

None.

## 2026-11-03 07:26 — Claude peer review of Codex PRs #39–#50 (TODO 0.21)

TODO: 0.21 in progress. Agent: Claude Code orchestrator; peer dispatcher subagent;
external reviewer: fresh Claude CLI 2.1.317 processes (model evidence
`claude-opus-5-5`, not backend attestation) via `utils/peer_review.py`.

**Implementation notes**

- **Packets:** 27, frozen at `b3a7538`. They cover every changed path of PRs #39, #40,
  #43, #44, #45, #46, #49 and #50, the Codex merge resolutions `5c49da8` and `5ef7357`,
  cumulative CSS, and renewals of the 2026-11-01 #28b and #30 blocked rows.
- **Runs:** a dry run, then a real run for each, with a 900 s timeout. No timeouts.
- **Result:** 26 blocked, 1 changes_required. There were 6 high and 61 medium findings.
  The dispatcher checked them all: 53 verified, 7 already resolved or of limited impact,
  4 partly refuted, 3 refuted.
- **High findings:**
  - hosted CI was red for #43–#45 until `7610edc`, while their DONE entries claim CI
    passed;
  - no rights basis is recorded for the POH-scan and JSBSim-derived app values;
  - a KAP 140 selector entry is read using whichever page is showing when it is
    committed;
  - the fitted-cockpit keycap text is 4 px.
- **#28b renewal:** the AS8 DONE restoration passes; the 1.14.1 ownership record fails.
- **#30 renewal:** stays blocked without a recorded engine build and `test:browser`
  run.
- **Gate:** the local gate passed (202 app tests; e1-jsbsim 9 of 23 skipped). Hosted
  run 41579252408 on `b3a7538` passed.
- **Report:** [peer review](reviews/2026-11-03-codex-prs-39-50-peer.md) and
  [JSON](reviews/2026-11-03-codex-prs-39-50-peer.json).

**Deviations**

No browser or native run evidence is recorded, so the runtime criteria stay blocked.
No fixes yet. The Claude-authored #32–#37 are excluded and left for the Codex review
(TODO 0.19).

## 2026-11-03 06:51 — Streamed regional flights, quiet overlays and flight assists

TODO: 2.0.44, 2.0.45 and 2.0.47 complete for the bounded R-WORLD-5/R-UX-2/
R-AP-2/R-SIM-9 increment. Agent: Codex orchestrator integrates and owns status,
session/history and publication. `terrain_stream`/code1 implements terrain
streaming/native/render contracts; `airport_map`/code2 implements airport map and
the bounded scenery proxy; `region_sources` researches sources and independently
checks non-authored data/native/render behavior. `overlay_controls` implements
floating-panel/title/menu behavior; `browser_adapt` updates legacy browser flows.
`rate_worker`/code1 implements AP capture and pacing; `flight_assists_ui`/code2
implements their menu/keyboard/overlay and browser tests; `region_housekeeping`
updates inventories/setup/network/rights docs alongside implementation.
`increment_quality` independently reviews and validates the final affected code,
source carry-forward and browser behavior. Cross-provider peer remains pending;
no external review of this packet is claimed.

**Implementation notes**

Stream 42 hash-pinned BKG DGM200/GCG tiles over the declared region with nine
resident native tiles and bounded visited renderer history. Share exact edge
nodes and a derivative-aware fine/coarse feather; add Darmstadt, Odenwald and
Spessart flights, source-limited live public map/photography and 103 sourced
community airport points. Keep imagery gaps transparent, resource use bounded,
and provider/source/age/datum/production-hosting limits explicit. Source compiler
and shipped-edge integrity now have a regression check.

Hide top bar and flight controls initially, add O and marked menu shortcuts,
and require deliberate activation of half-opacity floating panels. A releases
manual UI control and captures one authoritative HDG/ALT frame; repeated A
recaptures. = cycles requested 1/1.5/2/5/10× pacing with a confirmed on-screen
rate and separately labeled recorded Review metadata. Keep native integration
at 1/120 s, preserve pause/loading intent, and reset new flights to 1×. German
Shift+0 = does not reach throttle idle. No sensitivity/aircraft-coefficient
retuning or general touchpad handling fix is included.

Shared CI passes, including 219 app tests; nine of 23 existing native-study tests
remain explicitly skipped. Build and five proxy tests pass. Independent checks
pass 65 targeted tests, eight real-WASM groups, regional native/worker cases and
three affected integrated browser suites. At equal steps all five rate fixtures
produce identical native state/digest. Independent one-second Node pacing was
1004/669/503/202/102 ms, without dropped steps; this is not a universal browser
speed guarantee. See [final review](reviews/2026-11-03-flight-assists.md) and
[regional review](reviews/2026-11-03-streamed-region.md). The final 116-path
runtime/test packet is
`55fcea2cd15cd82963e9196e11883342dd7f552876ffadd01c7017e283fbe042`.

README now shows an actual, visually inspected Chrome flight at 19.05 simulation
seconds, with real terrain/imagery, chase aircraft and cockpit panels. No mocked
pixels or image editing were used. Source credits remain visible; some live
requests reported degraded coverage. The image and [provenance](images/README.md)
are separate from the runtime review packet.

**Deviations**

Regional assets cover the documented rectangle, not full EDDF/100 NM or global
landings. DGM200/derived transitions are not surveyed airport geometry; source
age and unknown photo capture dates remain explicit. The live proxy requires
Pillow and the development server/equivalent endpoints; a static build alone is
not the deployable simulator. Browser interaction tests use explicitly labeled
imagery fixtures; source-response checks and the README screenshot use real
data. Native dialog-close/next-frame races were repaired in browser tests, then
independently rerun; they did not require product changes.

**Insights**

Global-quality appearance, physical ground correctness and control feedback are
separate acceptance concerns. The reported touchpad overshoot/sudden jumps remain
unresolved: new overlay hand-off and heavier rendering warrant measurement, while
the same default airborne native fixture remains unchanged. Rate changes must
alter scheduling rather than enlarge integration steps; convenience AP capture
must sample the worker and remain distinct from original avionics semantics.

## 2026-11-03 06:30 — Global scenery and Google Earth research

TODO: 2.0.46 complete for research only. Agent: Codex orchestrator integrates;
`global_sources` researches open/commercial world data, terms and pipelines;
`google_flythrough` researches Google Earth/Maps routes; independent
`scenery_research_review` checks primary claims and request coverage, including
the final material-library addition. Same-provider review passes at note hash
`545d5c4db55699bb6bc11c25f8809463ae1b37b00f4fdcb5f67d81cd31be8b35`;
cross-provider peer remains pending. See [note](research/2026-11-03-global-scenery.md)
and [review](reviews/2026-11-03-global-scenery-research.md).

**Implementation notes**

Record global terrain/vector/photo alternatives, local adaptive reconstruction
and procedural materials, source-specific datum limits, service/cache rights and
dated costs. Identify Google's current experimental web flight mode, EEA tile
availability restriction, Maps JavaScript visual-adapter alternative and a
proposed external KML tour export. Actually fetch two public terrain metadata
responses and decode one 512 px Frankfurt-area terrain tile; record exact hashes
and format results. No provider account, billing or runtime integration added.
Input records/index preserve this request and the preceding regional/overlay
instructions. Register 2.0.44/2.0.45 as still in integration, without promoting
targeted tests to completed publication.

**Deviations**

No dedicated deep-research service is installed; use structured primary-source
web research and upstream code inspection. Research acceptance does not pass
global terrain accuracy, visual quality, flight performance or landing fidelity.
The separate regional/overlay working-tree changes still need their integrated
completion gates; this entry does not claim them delivered.

**Insights**

Resampling supplies more samples, not missing measurements. Open global terrain
is practical, but mixed datums and surface-versus-ground distinctions matter for
contact physics. Reusing Google visuals would preserve our own flight model only
through a supported visual API integration; the Earth application's casual flight
mode is a separate experience. A hybrid open baseline with finer local exercise
regions remains the recommendation, not a selected paid provider.

## 2026-11-03 05:33 — Detailed regional textures and compact radio station discovery

TODO: 2.0.33 and 2.0.42 complete for bounded R-WORLD-4/R-NAV-4/R-PANEL-1/
R-DATA-1/R-REVIEW-1. COM directory remains planned in 2.0.43.
Agent: Codex orchestrator/integration; texture_provider/code1 implements the bounded
provider/tests; texture_assets/code2 implements ingestion/assets/tests; radio_layout
implements the parallel radio slice. texture_research performs parallel research/
input housekeeping and independent quality/spec validation of non-authored code,
assets, source transformations and browser behavior. Its own prose is excluded
from self-approval. Root inspects the adopted source grant and integrated artifacts.

**Implementation notes**

Ship 723 openly licensed local orthophoto tiles around Egelsbach, Frankfurt and
the eastern approaches: 70,489,589 derived JPEG bytes (67.2 MiB), from 200 raw WMS
source groups. Web Mercator levels 10–14 cover 8.48–8.80°E/49.93–50.12°N; selected
level 15 areas provide approximately 1.54 m output pixels, with approximately 3.07 m
regional pixels. Source dates remain unknown; source 20 cm is not output 20 cm.
Capture exact raw requests/hashes, adaptive 512/1024/2048px grouping and crop/JPEG 85
transformations. The view loader validates bytes/hashes/dimensions, deduplicates
requests, caps six fetches/64 source images and crops the correct ancestor on
missing detail. Preserve coarse/relief fallback and the separate 0.75 m EDFE overlay.

Fix the Cesium imagery LOD interaction: exact-zero finest terrain error becomes
Infinity and then integer level 0. A numerical 1e-6 m display floor selects detailed
imagery while preserving exact shared/native height samples; it is not an accuracy
claim. A trial 0.25 m floor failed near-ground refinement and was replaced.

Compact the radio stack within its existing shared column height. Stations keeps
search/nearby filters and close control in a reachable header while only results
scroll; use live/recorded position, 50 NM proximity, distance order and explicit
missing-position state. Backdrop/Escape dismiss and restore focus; standby/swap
and read-only Review remain intact. Record the confirmed KAP 140 target separately.

Independent quality/specification pass at 741-path packet
`decb6d47407d90400cf480a312610d0364bfd76bf853e61732d5d19ba712393a`:
verify all 723 hashes and independently regenerate every tile from all 200 actual
raw source groups;11 provider/assets/terrain tests, four compiler tests, actual
Chrome GPUlevel 15/512px, cache64/fetch6, exact stable screenshots, zero measured
camera drift and unchanged state. Radio interaction and seven independent full-
cockpit viewport cases pass; root's maintained layout test passes ten viewports.
Actual full-app EDDF/APR/GS/Review and public terrain/contact/guard/failure checks
pass. The public-terrain test now waits for worker pause acknowledgment before
capturing its contact frame; runtime behavior is unchanged. Shared CI passes 202
app tests, six adapter tests and foundation/assurance/training gates; nine of 23
existing native study tests remain explicitly skipped. Build, scaffold and
assurance pass. See [independent review](reviews/2026-11-03-regional-textures.md).

**Deviations**

Ingestion required adaptive smaller requests after slow WMS metatiles and a
storage interruption; the user freed space. The bounded tile budget is 80 MiB,
with quality 85 retained. Full 100 NM, native20 cm output, buildings, live external
imagery and current chart/airport acceptance remain separate. COM discovery is
queued with source/currentness and 8.33 kHz applicability work; no ATC service is
invented. External Claude CLI 2.1.193 times out after 180 s with no report/model
identity. Its earlier runtime packet is not final coverage; peer remains pending.

**Insights**

GPU-level checks caught a coarse-LOD bug that schema/source tests could not.
A software rendering floor must avoid both division by zero and unwanted mesh
refinement. Keep screenshot comparisons bounded and acknowledge worker pause
before comparing recorded physical frames.

## 2026-11-03 04:47 — Confirmed KAP 140 equipment target

TODO: 2.0.40 confirmed equipment target; remaining 2.0.14.
Refs: R-AP-1.
Agent: Codex orchestrator; no subagents needed for this decision-only record.

**Implementation notes**

Preserve the exact question/answer in a new immutable input record and update
GAPS/R-AP-1 to distinguish the confirmed two-axis/preselect equipment target
from the previous assumption. Retire the obsolete fictional-only navigation
condition in that same current decision paragraph. No runtime change.

**Deviations**

Serial-specific installation, firmware applicability and accepted fidelity remain
unresolved; the confirmation does not accept the generic servos or historical data.

**Insights**

An equipment choice and validation of its simulation are separate decisions.

## 2026-11-03 02:56 — Historical Rhein-Main radio navigation and EDDF ILS practice

TODO: 2.0.41 complete as bounded R-NAV-4 and partial R-NAV-1/R-NAV-2/R-DATA-1/
R-REVIEW-1. Full current regional data, official boundary and installed avionics
fidelity remain open. Agent: Codex orchestrator/integration; ap_native/code1 on
shared signals/loader/worker and native tests; engine_sound_ui/code2 starts gauge
work, then nav_ui/code2 completes instruments/directory/browser fixture after a
provider capacity failure; ap_research performs parallel source research/input;
nav_review independently checks source completeness, code/security/numerics and
specification/browser behavior. Research prose is not independent acceptance.
Cross-provider peer remains pending under the existing cadence; preceding Claude
CLI attempts timed out without a review, and this increment claims no new peer pass.

**Implementation notes**

Ship a redistributable NAV810 cycle 2013.10 snapshot: 31 VOR-family sources,
39 localizers and 16 standalone DMEs around a provisional community EDDF point.
Preserve explicit paired GS/DME antennas, station magnetic calibration, DME bias,
original notice/license and corresponding source subset. Conflicting components
and overlapping co-channel sources fail closed. Shared geometry drives both NAV
receivers and fixed-step NAV1/AP guidance; hash-verified local packages freeze on
load. The compact Stations directory loads standby frequencies with explicit swap.
NAV1 gains GS cross-needle/flag; bearing and DME availability remain independent.
Flight → historical EDDF 25C starts a source-derived five-NM intercept over public
terrain with IFCW111.55/NAV1 and FFM114.20/NAV2. Paused tuning and recorded Review
retain coherent controls and source-derived indications.

Independent source audit preserves all 70 VOR/LOC parents and all 52 DME source
rows from the 241-row extent, including ambiguous components. Native IFCW APR/GS
tracks for ten seconds with decreasing deviations; full-app Chrome demonstrates
paused first OBS, both receivers, real terrain, APR/GS capture and read-only Review.
Existing LAB gesture/mobile/bearing/Review and five-group AP flight regressions
pass. One concurrent headless AP run timed out; sequential retry passes unchanged.
Shared CI passes 195 app Node tests, six adapter tests and foundation/assurance/
training gates; nine of 23 existing native study tests remain explicitly skipped.
Build, scaffold, assurance and reproducible compiler output pass. See
[review evidence](reviews/2026-11-03-rhein-main-navigation.md).

**Deviations**

The source edition is historical, not current AIRAC/NOTAM/service status. The
approximate 100 NM extent is not the verified official-ARP R-REGION-1 boundary;
normal terrain still covers only the existing smaller package. NDB/markers are
inventoried but unsupported. Reception sectors/geometry and generic AP servos are
uncalibrated; no published procedure, installed receiver or approach fidelity is
accepted. Only three EDDF ILS records have paired DME; absent components stay off.

**Insights**

Nearest antenna cannot identify the operating runway on reused ILS frequencies.
Source receivability must also remain independent of OBS ambiguity and station
passage, so changing OBS cannot select another transmitter. Explicit flight presets
must establish panel tuning before the first state without invoking gated live input.

## 2026-11-03 02:10 — KAP 140 operating controls, two-axis guidance and altitude alerts

TODO: 2.0.40 complete as bounded R-AP-1/R-INPUT-1/R-REVIEW-1 operating logic;
2.0.14 remains open for deeper installed fidelity and navigation coverage.
Agent: Codex orchestrator/integration; ap_native/code1 on native adapter,
operating/alerter modules and existing regression updates; engine_sound_ui/code2
on panel/audio/new browser fixtures; ap_research on parallel source research and
independent quality/validation of non-authored implementation. Own research/input
and original worker-proof source are excluded from independent self-approval;
root reviews the adopted fixture, and independent checks cover root additions.
Actual Claude CLI peer attempt times out at 180 s without a report/model identity;
external peer remains pending.

**Implementation notes**

Replace the roll-only box with source-scoped KAP 140 two-axis/preselect controls:
AP hold-to-engage into ROL/current VS, HDG, current-pressure ALT capture, separate
selected altitude/ARM, UP/DN and BARO. DG arming computes its intercept and source
loss falls back visibly. REV is LOC-only; conditional GS capture accepts above
or below. Native pitch reuses pinned JSBSim gains with MSL/VS wiring and a true
OFF output gate. Actual flight climbs, captures selected altitude and tracks a
fictional VOR course. Independent altitude alerts produce the 1000/200 ft cues
and five original warning tones through the existing sound preference. Paused
settings, retained manual override, atomic telemetry and recorded Review remain
coherent; the compact panel stays 140 px.

Independent quality/validation pass at the frozen 37-source packet: 25 browser
groups, eight native-worker checks and targeted source/unit evidence. Native VOR
intercept ends at normalized CDI 0.0474 after 180 simulated seconds. Shared CI
passes 184 app Node tests, six adapter tests and the foundation/assurance/training
suites; production build passes. Source hashes, criteria and caveats are in
[the review](reviews/2026-11-03-kap140.md).

**Deviations**

Generic servos/capture tuning are not installed KAP performance. TRUE DG and LAB
VOR remain teaching substitutions; real LOC/GS/GPS services, hardware PFT,
electrical/autotrim/fault behavior and aircraft-specific calibration are open.
Warning timbre and silent selector-reset policy are simulator conventions.
Physical audio output is unverified: the host default audio clock stalls even
with bare sine; native silent-sink/Offline tests render actual PCM while keeping
production device settings unchanged. Nine optional Python JSBSim study cases
and one live-provider tool test remain skipped. This is not milestone/release or
training-credit acceptance.

**Insights**

Separate operating-state logic, source validity, pressure references and physical
servo response. ALT capture and the selected altitude are distinct controls.
Check actual course convergence and native output instead of accepting lit mode
buttons. Test gesture releases, retained pilot input and telemetry compatibility;
keep sound-event counters distinct from rendering and replay seeks.

## 2026-11-03 00:50 — Adjustable wheel-brake command for ground rollout

TODO: 2.0.38 complete as a bounded R-INPUT-1/R-SIM-8/R-REVIEW-1 correction.
Agent: Codex orchestrator/integration; fov_input/code1 on command gain/settings;
engine_sound_ui/code2 on actual native/worker/UI regression; fov_housekeeping on
parallel input/source review and independent quality/validation. Independent
review excludes its own raw-input prose. Cross-provider peer remains pending.

**Implementation notes**

B/the brake button now use a visible 25% command initially, adjustable from
0–100% in Options. Full input previously compressed the research model nose
strut enough for both the illustrative and source-model propeller to intersect
the ground. Normal flat/public 3600-step rolls at the selected default stop with
collision zero and exact unchanged-native final state/digest. Explicit maximum
braking and intentional nose impacts retain collision stops. Paused controls,
presets, restart persistence and recorded Review pass eight actual-browser groups,
independently rerun with eleven focused input tests. Missing recorded brake
telemetry displays unavailable. Shared CI, production build, foundation and
assurance pass; [the review](reviews/2026-11-03-ground-braking.md) binds the frozen
source and scopes. The correction updates existing PR #47.

**Deviations**

The 25% input preference is not a calibrated pedal force or aircraft braking
limit. Native physics, collision geometry and WASM are unchanged. Full-command
gear/propeller behavior needs source-applicable strut/end-stop and braking
validation; open TODO 2.0.39 records that remaining fidelity work. Nine optional
Python JSBSim study cases and one live-provider tool test remain skipped.

**Insights**

Compare geometry against actual dynamic CG before dismissing a contact as a
false positive. A digital control should expose its commanded strength. Keep
input usability distinct from acceptance of the underlying aircraft model, and
preserve unavailable historical values rather than inventing zero.

## 2026-11-03 00:29 — Fly real public terrain around Egelsbach and the Taunus

TODO: 2.0.32, 2.0.34 and 2.0.35 complete as bounded R-WORLD-2/R-DATA-1/
R-SIM-3/R-INPUT-1/R-AUDIO-1/R-ENG-1 increments, with affected Review/shadow checks.
Agent: Codex orchestrator/integration; fov_input/code1 on native terrain and
pointer midpoint; engine_sound_ui/code2 on rendered terrain and audible spool;
fov_housekeeping on parallel source/input research. Independent quality and
validate: fov_housekeeping on non-authored implementation; code2 independently
reviews root/code1 integration, with own renderer/audio excluded. Root/code2
check primary-source facts separately from housekeeping-authored research.
Cross-provider peer pending: actual Claude CLI packet review timed out at 180 seconds with no report/model identity. This is an increment, not milestone acceptance.

**Implementation notes**

Bundle hash-pinned public Hessen elevation and BKG quasigeoid data for the
Egelsbach/Frankfurt/Taunus patch. Native wheels/structural supports sample the
physical height/slope surface; Cesium uses the same triangle interpolation with
explicit height conversion. Corruption and coverage exits stop safely without
flat fallback. Flight → Taunus ridge flight demonstrates relief; Review and
chase shadow retain the correct receiver. A 3000×1800 airport photograph improves
local detail to about 0.75 m/pixel. Hold-look release preserves the yoke midpoint.
Actual RPM now drives an audible rotation layer during native start/coast-down.

Independent checks include full-grid source reproduction, 41 geoid holdouts,
actual native callbacks, four public-terrain, three renderer and three pointer
browser groups, plus eleven actual audio groups. Shared CI, production build,
foundation and assurance pass with explicit optional study skips. Existing
collision/shadow and interactive smoke regressions pass. Frozen source/data
hashes, reviewer scopes and evidence are in [the review](reviews/2026-11-03-public-terrain.md).

**Deviations**

This is roughly 32×55 km with overview terrain, not full 100 NM or survey-grade
airport elevations. Finest loaded near-ground rendered mesh differs by less than
the predeclared 0.25 m implementation budget; this is not DEM accuracy. A local
triangle-plane/discrete-step body proxy does not establish full mesh collision
or damage limits. Photo coverage remains local; regional tiling, procedural
materials and structures remain open TODO 2.0.33/2.0.36/2.0.37. Audio is original
uncalibrated synthesis; airborne windmilling follows real model RPM. Nine optional
Python JSBSim study cases and one live-provider tool test are skipped, not passed.

**Insights**

Keep physical vertical datum separate from rendered ellipsoid height, and bind
collision/rendering to the same interpolation. Verify the loaded GPU texture and
mesh, since provider metadata alone cannot establish actual detail. A camera
gesture must not redefine a flight-input anchor. Audible rotational harmonics
can expose actual native coast-down without inventing a physics ramp.

## 2026-11-02 23:18 — Compact classic cockpit, landing cues and synchronized sound

TODO: 2.0.17, 2.0.28–2.0.31 complete as bounded R-PANEL-1/R-SIM-8/
R-ENG-1/R-AUDIO-1/R-VIEW-1/R-REVIEW-1 increments.
Agent: Codex orchestrator/integration; fov_input/code1 on native collision/
ignition, bearing/RPM and chase shadow; engine_sound_ui/code2 on collision UI,
audio and fuel instrument; fov_housekeeping on parallel inputs/references.
Independent quality: fov_housekeeping on non-authored code; reciprocal scoped
code1/code2 reviews and orchestrator review of shared model references.
Independent validate: fov_housekeeping, excluding its constants/prose.
Cross-provider peer pending.

**Implementation notes**

Delivered NAV1/NAV2 over true-reference fictional LAB bearing/DME and actual
propeller RPM; added a symmetric round L/R model fuel gauge, engine-before-AP
column order, bottom engine ON/RUN indication, half-size flap/trim key buttons
and equal column edges. The desktop deck is 388px rather than 449px while main
round faces remain 140px. Uniform scaling and mobile portals remain usable.
Native non-wheel/body/propeller/fin contact freezes its exact first event;
normal wheels retain JSBSim reactions. Review/camera inspection and Flight-menu
restart remain available. E controls ignition/starter, independent of mixture
and S sound preference. Sound defaults off; actual engine/airflow/ground motion
produce engine, broadband high-speed whistle, rolling and per-wheel touchdown
sounds. Idle is quieter; paused/seeked/suspended audio cannot invent impacts.
Chase view adds a genuine soft native mesh shadow on the existing ellipsoid;
restored/four stationary renders are identical, with physics frozen.

Frozen implementation hash and detailed execution/reviewer scopes are in
[the review](reviews/2026-11-02-ground-collision-engine-wind.md). Native checks
pass 147 Node tests plus five Python tests. Actual-browser checks cover the
new cockpit, engine, Review, contact, sound and shadow behavior. Production build, shared CI and final assurance pass; nine optional Python
JSBSim study cases are unavailable, explicitly recorded in the review.

**Deviations**

Flat-ground discrete collision proxies do not establish damage thresholds or
full terrain/building collision. Fuel/RPM references are for the pinned generic
c172x; LAB is a fictional TRUE station. Ignition/starter omits installed electrical
and checklist fidelity; all audio is original, uncalibrated sound design. Shadows
use the existing fixed sun and compatible flat receiver, fading above low flight.
The final audio-device suspension guard is independently source-reviewed with
author native-browser evidence; the other ten audio groups are independently run.

**Insights**

Separate actual running/contact observations from requested engine controls and
sound preferences. Preserve live/recorded labels separately from read-only locks.
Decimal UI serialization needs presentation-only tolerance at stored Review
frames. Hosted Node 24 also exposed a Boolean capture-listener cleanup
difference; matching the registration options object fixes it, with all four
focused tests passing on Node 24 and Node 26. Native renderer shadows provide a ground cue without a second physics
model or an extra asset/service.

## 2026-11-02 21:40 — Hear procedural engine and propeller sound

TODO: 2.0.27 complete as a bounded R-AUDIO-1/R-REVIEW-1 increment.
Agent: Codex orchestrator/integration; fov_input/code1 on synthesis/parameters,
engine_sound_ui/code2 on controls/browser coverage, with fov_housekeeping on
parallel inputs/source research. Independent quality: fov_housekeeping on code,
excluding its prose; fov_input on main/UI, excluding its core. Validate:
trim_validate, no implementation authored. Cross-provider peer pending.

**Implementation notes**

Added original Web Audio exhaust pulses, mechanical rumble and filtered
blade-pass airflow driven by actual RPM, manifold pressure and fuel flow.
Trusted Start/Resume/ReviewPlay/Space or sound-control gestures activate audio;
no context is created on load or synthetic UI activation. Quick mute stays
beside the clock, including Review, with volume under Options. Playing Review
uses selected captured engine state; pause/seek/hidden/failure/reset/paused
Review silence output, and teardown closes the graph. Zero/missing/invalid
engine state stays silent; fuel cutoff removes exhaust while actual rotating
propeller mechanical/airflow layers can remain. No sample downloads, microphone,
recording, network, runtime dependency or dynamics/state-field change.

Fixed two review findings before acceptance: partial graph-construction failure
now closes/discards its context before serialized retry, and focused quick-mute
keyboard events cannot issue flight commands. Current controls require trusted
click/input activation. Native tests pass 122 plus five adapter tests. Seven
actual Chrome groups and independent signal/state/mobile checks pass; shared
runtime OfflineAudioContext renders verify harmonics, bounded maximum-volume
peaks (.288 author / .2576 independent) and stopped/paused/missing silence.
Selected Review RPM follows captured samples and audio controls preserve full
physical state, step and digest. Existing Review4/engine9/layout9-viewport
regressions pass. Shared CI passes UI build, 84 assurance and 11 assessment tests
plus repository/study/render gates; optional JSBSim9-of-23 and Linux-only checks
remain explicit skips. See [review evidence](reviews/2026-11-02-engine-audio.md)
for frozen source hash, reviewer exclusions and local WAV/JSON evidence.

**Deviations**

This is a procedural piston/propeller approximation, not an acoustic calibration
or recording of an installed aircraft. Physical-speaker/headphone listening,
Safari/hardware audio and actual OS backgrounding were not independently
accepted; visibility-policy gating and real browser output were checked.
Failure/retry/disposal author evidence was inspected separately by validate.

**Insights**

A shared runtime/offline graph lets tests verify real PCM and spectrum rather
than only audio-status flags. Playback must remain separate from simulation and
synchronously gated before hidden-page rendering can stop. Browser activation
and keyboard isolation belong to the sound controls as well as Start/Resume.

## 2026-11-02 21:22 — Visualize spatial wing airflow-angle estimates

TODO: 2.0.25 complete as a bounded R-SIM-7/R-VIEW-1/R-REVIEW-1 diagnostic;
actual sectional separation remains 2.0.26. Agent: Codex orchestrator on telemetry
and integration; fov_input/code1 on pure calculations/tests, panel_scaling/code2
on SVG/UI/browser coverage, with fov_housekeeping alongside on input/research.
Independent quality: fov_housekeeping on implementation, excluding its prose;
fov_input on root integration/UI, excluding its helper. Validate: trim_validate.

**Implementation notes**

View → Stall awareness shows six wing reference regions with local kinematic
flow-angle estimates, numeric headroom and below/near/at-reference labels. Actual
air-relative body velocity/angular rates/current CG drive V + omega × r at
declared span sampling stations. The model's common positive alpha-max/85% warning
reference drives diagnostic colors. Tail/fuselage remain hatched unknown;
positive-only/negative-boundary limits are visible. Low, reversed, missing or
overflowed local flow stays unavailable. Raw global warning remains uncapped;
hysteresis is distinct. Live/selected recorded states share one read-only view.

The 13-field getter is outside the original 14-double dynamics/digest buffer.
Independent 240-step runs with/without reads match full physics/digest. Original
source/coefficient values and the aircraft adapter remain unchanged. Independent
quality and actual Chrome validation pass frame/cross-product math, six numeric
comparisons within 1e-12 rad, actual roll differences (left outer −0.739° versus
right outer 3.657°), immutable Review, missing/reference fixtures, mobile,
keyboard/focus, overlay exclusion and unchanged cockpit height. Actual sectional
stall physics is not accepted by these checks.

Focused browser suite passes three groups; existing Flight Data4, Review4 and
smoke26 regressions pass. Shared CI passes 118 native tests, five adapter tests,
UI build, 84 assurance and 11 assessment tests plus repository/study/render gates.
Optional JSBSim9-of-23 and Linux-only checks remain explicit skips. A new trace
test's extensionless runtime import was corrected before the full suite passed.
See [review evidence](reviews/2026-11-02-spatial-stall-awareness.md) for exact
source/engine hashes, review exclusions and reproducible evidence. Peer pending.

**Deviations**

The lumped research model does not expose part-specific separation, so this
increment deliberately shows a labeled body-relative AoA proxy rather than
asserting local stall onset. All stations share a positive global reference;
below-reference does not mean safe/attached flow. Wing twist, induced flow,
downwash and local flap/aileron/tail boundaries require the source-applicable
regional model/data work retained in TODO 2.0.26. No new forces or damage limits.

**Insights**

Actual rotational motion makes regional differences inspectable without changing
flight dynamics. Distinguishing a computed airflow proxy from an aerodynamic
separation model prevents a visually detailed diagram from overstating fidelity.

## 2026-11-02 21:07 — Inspect flight path, gear reactions and aircraft reference diagrams

TODO: 2.0.23–2.0.24 complete as bounded R-SIM-3/R-VIEW-1/R-REVIEW-1/
R-AIR-2/R-DATA-1 increments. Agent: Codex orchestrator/integration; fov_input/code1
on flight gradient/data panel, panel_scaling/code2 on the handbook, with
fov_housekeeping alongside on immutable input and source facts. Independent
quality: panel_scaling/fov_housekeeping on flight data/root integration;
fov_input on Handbook/data, excluding own code; orchestrator on the code1-authored
Review-test precision repair only. Independent validation: trim_validate.

**Implementation notes**

View → Flight data opens a compact modeless panel with signed ground-relative
flight-path percent, horizontal/vertical ground velocity and actual per-wheel
contact, compression, strut load and slip plus structure contacts. It follows
the selected live/recorded state without changing physics or cockpit height.
Low groundspeed and missing data remain unavailable, never synthetic zeroes.

View → Aircraft handbook pauses live flight or Review playback and displays
four original vector references with accessible tables: normal-category CG
loading, published flight-envelope factor/speed guides, CAS limits and model
gear geometry. The user's clarification prioritizes loading/flight envelope.
Closing stays paused. Manufacturer/JSBSim sources, conditions, units and hashes
are explicit; no manual pages/images or network document fetch are added.

New Chrome checks pass four Flight Data groups and three Handbook groups,
including landing/recorded values, frozen full state/step/digest, modeless
shortcuts, pause/no-resume, four diagrams, mobile and local-only requests.
Existing smoke26, Review4 and layout9-viewport/portal regressions pass. A flaky
exact-timestamp seek was traced to Chrome range decimal rounding; the test now
seeks inside an actual frame interval and verifies its exact selected step.
The product's floor-seek behavior remains unchanged. Independent actual Chrome
validation passed six groups plus three affected envelope/source/mobile checks.
Shared CI passed 109 native tests, five adapter tests, UI build, 84 assurance and
11 assessment tests plus repository/study/render gates. Optional JSBSim9-of-23
and Linux-only checks remain explicit skips. See
[review evidence](reviews/2026-11-02-flight-data-handbook.md) for exact source hash,
reviewer exclusions and reproducible evidence. Cross-provider peer pending.

**Deviations**

Flight-path percentage is ground-track slope, not ILS deviation or aerodynamic
glide ratio. Wheel loads are modeled normal strut reactions, not full force
vectors, stress or damage limits. Handbook figures apply to the generic research
1982 C172P and do not accept the planned C172S. Published envelope guides do not
invent missing stall/gust boundaries, negative flaps-down limits, a filled
approved V-n operating region or live loading/load-factor points.

**Insights**

Existing captured telemetry can make landing behavior inspectable without
altering dynamics. Separating original reference plots from live aircraft
inferences preserves useful Handbook diagrams while documenting missing data.
Native range serialization needs interval-based tests for floor-seek behavior.

## 2026-11-02 20:50 — Show recorded controls and critical speeds in a fitted cockpit

TODO: 2.0.20–2.0.22 complete as bounded R-AIR-2/R-DATA-1/R-INPUT-1/
R-VIEW-1/R-REVIEW-1 increments. Agent: Codex orchestrator; fov_input/code1 on
Review, panel_scaling/code2 on layout, with fov_housekeeping alongside on inputs
and sourced airspeed references. Independent quality: fov_housekeeping on root
telemetry; panel_scaling on main/Review; fov_input on airspeed/layout, excluding
each reviewer's own code. Independent validation: trim_validate.

**Implementation notes**

Airspeed shows explicit 1982 C172P CAS-reference arcs, VS0/VS1/VFE/VFE10/VNO/VNE
values and source/configuration details; TAS fallback suppresses CAS markings.
Read-only model telemetry records throttle, normalized pilot commands and actual
left/right aileron/rudder angles, alongside existing elevator/trim/flap/brakes/
mixture/avionics. Review shows selected captured values, including narrow-screen
power readouts. R toggles Review with editing/menu/dialog/repeat guards; restart
stays in Flight. Exit restores staged live settings without restarting or stepping.

A shared measured zoom scales inline faces/fonts/levers together and fits panel
height to content: 449 px at 1440×900, previously 500. Engine/Radio collapse at
900 px, NAV at 620; primary instruments and AP/flap/trim retain priority. Fixed
heading heights align flap/trim travel within one pixel. Review reserves scene
space for recorded controls and transport without overlapping the header.

Full Chrome suite passed: 82 functional checks across nine suites, plus nine
layout viewport cases/fresh-mobile/portal transitions and eight landing-physics
checks. Independent actual Chrome/WASM validation passed seven criteria groups,
including unavailable legacy data, selected-frame values and frozen full physical
state/step/digest. Repeated telemetry reads preserve actual WASM results. Shared
CI passed 104 native tests, five adapter tests, TypeScript/UI build, 84 assurance
and 11 assessment tests plus repository/study/render gates. Optional JSBSim
9-of-23 and Linux-only checks remain explicit skips. See
[review evidence](reviews/2026-11-02-review-panel.md) for exact source hash,
authorship exclusions and evidence. Peer pending under the batched cadence.

**Deviations**

Critical speeds are fixed manufacturer KCAS references, with declared reference
weight/CG/configuration, rather than installed IAS arcs or dynamic stall/model
acceptance. Review remains a sampled trace, not input-event replay. No manual
images, runtime dependencies or generated aircraft assets are redistributed.

**Insights**

Preserving live staged controls separately from recorded values prevents Review
from silently changing Resume behavior. One canonical layout scale protects main
instrument size when secondary panels collapse; content fitting removes stale
fixed-height space. Conventional IAS arcs must not be copied onto a CAS gauge.

## 2026-11-02 20:28 — Keep the nose-direction cue aligned while looking around

TODO: 2.0.19 complete as a bounded R-VIEW-1/R-INPUT-1/R-REVIEW-1 increment.
Agent: Codex orchestrator/integration; fov_input/code1 on pure perspective
projection/tests and forward_ui/code2 on the overlay, with fov_housekeeping
maintaining app instructions in parallel. Independent quality: fov_housekeeping,
excluding its own prose. Independent validation: trim_validate.

**Implementation notes**

Replaced the fixed scene crosshair with aircraft body-forward direction projected
through the actual Cesium camera axes and vertical FOV. Looking right moves the
marker left, looking left moves it right; FOV/view/resize and displayed recorded
states recompute it. Offscreen directions in front get a bounded edge chevron;
behind-camera/invalid projections hide. Header-safe placement and a short-view
clipping origin keep cues useful on narrow scenes. The overlay remains pointer
transparent, above Review/virtual controls and below Map/header UI.

Independent geometry verification compared actual ENU-to-ECEF camera projection
with screen positions (720→467.205 / 972.795), edge36, release, recorded seeking,
FOV, chase and desktop/mobile resizing. Physics state, step and digest stayed
unchanged. A mobile Review screenshot found same-z occlusion, resolved by z5;
actual timeline clicking through the visible cue passed. An optional Cesium
fovy type needed narrowing, now guarded with unavailable projections hidden.

Shared `just ci` passed: 98 app native tests, five aircraft-adapter tests,
TypeScript/UI build, 84 assurance tests, 11 airspeed assessment tests and
repository/study/render gates. Optional native JSBSim cases remain explicit
skips (9 of23) and the Linux-only fixture is not Mac runtime evidence. Focused
actual Chrome projection and existing FOV regressions passed five groups each,
with independent affected runtime checks. See
[review evidence](reviews/2026-11-02-forward-marker.md). Final foundation and
assurance integrity/diff were rechecked for publication.

**Deviations**

Peer pending under the batched cadence. This is a body-direction orientation
cue, not flight path, pilot input or an installed/certified aircraft HUD.
Behind-camera directions hide and foreground Map/header retain priority.
Existing aircraft, scenery and training limits remain unchanged.

**Insights**

The actual vertical FOV and camera basis are needed to place a direction cue;
a fixed screen point or direct pointer offset cannot preserve it through view,
zoom and viewport changes. DOM visibility alone missed the mobile Review-bar
occlusion; the final pixel/stacking and click-through checks caught it.

## 2026-11-02 20:06 — Classic cockpit, compact controls and landing-practice checkpoint

TODO: 2.0.10–2.0.13, 2.0.15/2.0.16/2.0.18 complete as bounded prototype
increments. R-INPUT-1/R-VIEW-1/R-REVIEW-1/R-NAV-1/R-SIM-1/R-SIM-5 remain
partial. Agent: Codex orchestrator; trim_core/code1 and fov_input/code2 on
parallel disjoint implementation streams, with fov_housekeeping on app/source
instructions and later separate pointer work. Independent quality:
fov_housekeeping excluding its own pointer/prose, and trim_core covering pointer
code excluding its own engine/NAV work. Independent validation: trim_validate.

**Implementation notes**

Added elevator trim preserving startup trim, compact matching vertical trim and
four-stop flap levers, Slash startup restore, Q/W rudder and consistent nosewheel
steering. Throttle/mixture are vertical in the engine unit; AP is above flap/trim.
Ready controls work while paused: selected settings persist, physical state/time
stays frozen and Resume applies queued commands. Recorded Review stays read-only.

The eight enlarged round faces form a 2×4 grid with a separate rounded six-pack
panel, matching column heights and shared metal/housing finishes with original
screw details. Dual COM/NAV units, independent OBS, original NAV cards/CDI/flags
and opt-in fictional LAB guidance are synchronized with recorded settings. OBS
supports accelerated hold, captured drag and keyboard adjustment, including
multi-turn/event-partition invariance. Yoke mode/anchor survives pointer exit;
Review look persists through release and seeking. Restart is in Flight, controls
in View, and explanations in Options. Postflight pause uses unobstructed header
Resume; map controls remain accessible.

Four flat-ground contact studies expose actual upstream wheel compression,
load, slip and structural contacts without replacement wobble forces. Landing
fixtures retain selected descent/side/bank conditions; the renderer uses actual
geodetic height while the original 14-value dynamics ABI remains unchanged.
See [independent review](reviews/2026-11-02-elevator-trim.md) and
[source applicability](research/2026-11-02-landing-and-radio.md).

At integrated source commit 2cc0f96, shared `just ci` passed: 92 app native tests,
five aircraft-adapter tests, TypeScript/UI build, 84 assurance tests, 11 airspeed
assessment tests and repository/study/render gates. Optional native JSBSim cases
remain explicit skips (9 of 23), not passes; the platform-specific Linux fixture
is likewise not Mac runtime evidence. Seven actual Chrome suites passed 73
check groups, plus eight deterministic 120/240 Hz landing cases and repeats.
Browser runs were split after updating obsolete flap-button test selectors;
all final suites passed on unchanged integrated implementation. Foundation and
assurance integrity/diff were checked again for final documentation. Main's
merged TypeScript 7.0.2 update was integrated locally with no content conflicts.

**Deviations**

Peer pending under the batched cadence. Generic c172x remains research data,
not accepted C172S training fidelity. LAB is fictional true-reference geometry,
COM is a legacy 25 kHz subset, and real navaid/ILS/8.33 kHz communication,
component damage, surveyed landing terrain and physical hardware/OS-focus
acceptance remain open. Per the user's PR-first instruction, the third bearing
display/round RPM/fuel row, engine/AP-column swap and ALT/NAV/APR/REV guidance
are subsequent TODO 2.0.14/2.0.17 work; disabled mode buttons are not completion.
No Flightvectors poster bitmap was redistributed.

**Insights**

Actual browser checks found portal queries that failed only on a fresh mobile
load, stylesheet import-order overrides and overlapping pause/map controls;
a desktop resize alone missed those cases. Paused control positions must be
separated from actual applied engine state. Multi-turn OBS dragging must retain
full accumulated travel before reducing equivalent course deltas modulo360.

## 2026-11-02 18:32 — Adjust camera FOV with two-finger scene scrolling

TODO: 2.0.9 complete as a bounded camera-input increment; R-INPUT-1/R-VIEW-1
remain partial. Agent: Codex orchestrator; fov_input/code1 and fov_scene/code2 in
parallel, with fov_housekeeping on app instructions. Independent quality:
fov_housekeeping (excluding its own prose); validation: altimeter_validate.

**Implementation notes**

Scene vertical scrolling adjusts actual perspective FOV from 20 to 100 degrees,
starting at 60, with an on-screen angle readout. It works in cockpit/chase,
paused flight and Review. FOV persists through view/resize/flight-reset actions;
reload restores the default. Yoke/look and aircraft state remain separate.
Ctrl/Meta/Alt/pinch, horizontal and UI/map/dialog scrolls bypass the FOV control.

TypeScript/UI build, 70 native tests, five adapter tests and five focused Chrome
check groups passed. Actual wheel/pixel checks preserve paused physical state,
WASM digest and active yoke/input values. Fixed Cesium consuming bubbling wheel
events by capturing eligible scroll first. A compact shorter-desktop pause gate
also restores access to the view buttons. Affected reviews passed; see
[review evidence](reviews/2026-11-02-field-of-view.md).

**Deviations**

Peer pending. Browser wheel input is verified; physical finger hardware was not
automated. FOV is a page-local viewing preference, not recorded aircraft state.
Existing generic-aircraft and training-fidelity limits are unchanged.

**Insights**

Native canvas event delivery must be checked in the actual renderer: isolated
input tests could not reveal Cesium consuming events before a bubbling handler.

## 2026-11-02 18:10 — Fly a classic six-pack with real controls and basic autopilot

TODO: 2.0.6/2.0.7 complete as bounded cockpit/control increments; affected
requirements remain partial. Agent: Codex orchestrator; classic_camera/code1,
classic_sixpack/code2 and classic_pointer on disjoint implementation paths, with
classic_research maintaining sources/application instructions in parallel.
Independent quality: classic_research (excluding its own prose); independent
validation: altimeter_validate.

**Implementation notes**

Corrected aircraft glTF/ENU axes and added temporary cockpit/chase look. The
standard six-pack uses actual CAS, attitude, pressure altitude, ideal turn/ball,
true heading and derived VSI. Short scene click toggles relative yoke; held drag
looks around, with explicit release/cancel/focus behavior. Flap detents and held
wheel brakes operate existing model controls. Numbers 1–9 set 10–90% throttle,
0 selects idle; correction is shown as percent left input with Off/default presets.

Added actual RPM/MAP/oil/EGT/fuel readouts, manual/model-auto mixture and source
wings-level/true-heading roll AP. A pinned, default-on mixture gate is prepared
only in an ignored aircraft copy; original coefficients/source remain intact and
build hashes identify the adaptation. Raw pilot input disconnects AP; the study
roll correction is suspended under AP. Recorded review captures engine/config
values with controls disabled. Mobile header and live engine dialog fit narrow
screens without hiding Controls/Pause.

TypeScript/UI build, 65 native tests, five adapter tests and browser suites of
26 base/eight classic/nine engine groups passed. Independent actual-browser
validation checked source values, aircraft orientation, brake invariance in
flight, flap traversal, pointer modes, mixture cutoff, AP heading/level response,
manual authority, review/reset, missing data and mobile behavior. Partial-state,
zero-MAP and header-clipping findings were fixed and affected reviews passed.
See [review evidence](reviews/2026-11-02-classic-flight-controls.md).

**Deviations**

Peer pending. Generic model telemetry and roll AP are not installed C172S
fidelity. Legacy altitude hold remains disabled because its source wiring and
state behavior need separate work; no ALT/NAV/approach or autothrottle is claimed.
True heading, ideal CAS/turn display, unaccepted terrain/airport datum and
unvalidated landings remain explicit limitations. Ground braking is not air drag.

**Insights**

Source reuse still needs integration checks: the generic model's automatic
mixture would overwrite a manual knob, and two independent AP streams must not
compete. Visible values and actual flight response must agree before a control
is described as implemented.

## 2026-11-02 16:29 — Adjust pressure and read the altimeter in flight review

TODO: 2.0.5 complete as a bounded pressure-practice increment; R-AIR-3/R-REVIEW-1
remain partial. Agent: Codex orchestrator; altimeter_core/code1 and altimeter_ui/code2
in parallel, with altimeter_research maintaining sources/application instructions.
Independent quality: altimeter_research (excluding its own prose); independent
validation: altimeter_validate.

**Implementation notes**

Added a three-pointer pressure altimeter with actual JSBSim ambient pressure,
manual settings, hPa/inHg display and QNH/launch-QFE/standard teaching shortcuts.
The pure ideal ISA model runs in the fixed-step worker. Read-only pressure exports
preserve the original 14-value dynamics state/digest. Paused knob adjustments do
not advance flight; the last trace frame can replace only instrument values,
preserving physical/environment fields and VSI. Review displays recorded settings.

Build, 39 native tests and all 26 actual-Chrome smoke groups passed. Independent
browser validation confirmed pressure values, zero at the launch datum, unchanged
physics/digest, modal controls, history/reset, compact layout and unavailable-data
fallback. Fixed a range/rebuild hint and negative-zero formatting; affected reviews
passed. The inherited Vite 8 manualChunks-object build failure was corrected using
supported Rolldown code splitting. Reordered complete inherited DONE records to
repair the integration-order check, preserving their contents. See [review evidence](reviews/2026-11-02-pressure-altimeter.md).

**Deviations**

Peer pending. Launch QFE references the airborne launch point, not EDFE elevation;
QNH is the fixed engine atmosphere reference, not operational weather. This ideal
instrument does not model C172S installation errors/limits or complete the circuit,
full replay/event contracts, pressure procedures or training-fidelity gates.

**Insights**

Pressure practice becomes tangible when the learner can change an indication
while the real aircraft state and dynamics digest remain fixed.

## 2026-11-02 14:56 — Integrate PR 35 with the current flight interface

TODO: 0.21 / 1.6 integration only. Agent: Codex orchestrator; pr35_vite/code1 and
pr35_smoke/code2 resolved disjoint application conflicts in parallel, with
pr35_housekeeping on application instructions and record preservation.
Independent quality and validation: pr32_merge_review.

**Implementation notes**

Retained the extracted research-runtime middleware and real missing-engine smoke
case alongside main's Cesium asset serving/build copying, control settings and
recorded-state review tests. The native test command includes both branches'
tests. Preserved complete DONE records and TODO status; corrected SBOM's obsolete
statement that Cesium integration was still future work.

Strict TypeScript/UI build and all 22 native tests passed. The real-engine Chrome
smoke passed all 20 check groups, including the actual missing-module 404 case.
The first run exposed queued state messages racing the settings pause baseline;
the test now allows the existing pause-settling interval before checking a frozen
worker step. Product behavior was unchanged; affected independent review passed.

**Deviations**

This is merge integration, not renewed acceptance of the historical peer packets
or the foundation milestone. Existing peer-pending and blocked outcomes remain.

**Insights**

A clean conflict resolution must preserve both the newer flight interface and
the negative runtime test; choosing either whole side would lose coverage.

## 2026-11-02 14:50 — Reconcile PR 32 with current main

TODO: 1.6 integration only. Agent: Codex orchestrator; pr32_merge_review performs
independent quality and validation of the merge resolution.

**Implementation notes**

Merged current main into fix/m1-contracts. Preserved both branches' complete DONE
records in descending date order, and retained TODO 2.0.1–2.0.3 alongside the
expanded milestone 2 scope in 2.1. Contract changes and user decisions are retained.
Independent quality and validation passed: every parent record is intact, task
status is preserved, and the original contract/input files are unchanged.

**Deviations**

This resolves integration conflicts; it does not accept the pending foundation,
model or training milestones. Existing peer-pending dispositions remain.

**Insights**

Merging complete dated records avoids attaching one branch's body to the other
branch's heading or deviations.

## 2026-11-02 14:47 — See the aircraft and retained flight path on a practice map

TODO: 2.0.4 complete as a bounded map increment; R-WORLD-1/R-REVIEW-1 remain partial.
Agent: Codex orchestrator; practice_map_core/code1 and practice_map_ui/code2 in
parallel, with flight_housekeeping on application instructions. Independent
quality: flight_housekeeping, excluding its own README; validation: flight_validate.

**Implementation notes**

Added a lazy MapLibre panel using the existing bundled Hessen photographs,
true-heading aircraft marker, whole retained route, zoom and Fit/Follow controls.
Review seeking moves the marker to the selected historical state while live
physics stays paused. Bounded immutable sampling plots at most 600 points at
four updates per second; reset clears the path. Map failures leave flight usable.
MapLibre is pinned with its complete license retained in source and build output.

Strict TypeScript/build, 26 native tests and 22 real-browser check groups passed.
Independent actual-browser validation confirmed visible imagery/path, heading,
review isolation, focus, compact layout, reset and failure isolation. Fixed the
Vite worker URL initialization failure and the ambiguous route legend; affected
quality review passed. See [review evidence](reviews/2026-11-02-practice-map.md).

**Deviations**

Peer pending. This is a limited visual practice aid, not a navigation chart,
accepted airport/runway data, real terrain or the EDDF/100 NM region. It changes
no aircraft physics and does not complete the first circuit or training gates.

**Insights**

A selected-time marker and an explicitly labeled whole retained route let a
learner compare a turn with its path without rewinding the live engine.

## 2026-11-02 12:36 — Review the recorded flight without rewinding physics

TODO: 2.0.3 complete as a bounded state-review increment; R-REVIEW-1 remains partial.
Agent: Codex orchestrator; flight_trace_core/code1 and flight_review_ui/code2 in
parallel, with flight_housekeeping on app instructions. Independent quality:
flight_housekeeping, excluding its own README; independent validation: flight_validate.

**Implementation notes**

Added Review, a timeline, playback and Back to live. Copied state samples and
captured vertical speed feed both views/instruments while the real worker stays
paused. Returning live restores its actual state and requires explicit Resume.
A bounded immutable ring retains up to ten simulation minutes/36,000 samples;
restart/reload clears it. No unrecorded control positions are shown in review.

Strict TypeScript/build, eighteen native tests and twenty actual-browser checks
passed. Quality found timeline hotkey suppression and a live throttle leak;
both were fixed and affected quality review passed. See the scoped
[review evidence](reviews/2026-11-02-flight-state-review.md).

**Deviations**

Peer pending. This is recorded state viewing, not input-driven re-simulation,
configuration/event replay, persistent recordings or video export. The aircraft
model, geography and training-fidelity limits are unchanged.

**Insights**

Keeping a paused live worker separate from the review cursor makes rewind useful
without silently changing the flight the learner will resume.

## 2026-11-02 12:08 — Adjust control sensitivity in the running simulator

TODO: 2.0.2 complete as a demonstrable input increment; R-INPUT-1 remains partial.
Agent: Codex orchestrator; code1/control_settings_core and code2/control_settings_ui
implemented disjoint paths in parallel, with flight_housekeeping updating app
instructions. Independent quality: flight_housekeeping, excluding its own README;
independent validation: flight_validate.

**Implementation notes**

Added a Controls dialog with pitch, roll and rudder sensitivity sliders, Gentle
and Default presets. Opening it pauses real JSBSim time; Done/Escape returns
flight focus without resuming. Settings survive flight reset and remain local to
the current page. Pure bounded gain mapping preserves the former defaults,
throttle and the separate study roll offset. No aircraft dynamics were changed.

Strict TypeScript/build and eleven native tests passed. Seventeen real-browser
checks passed, including actual paused engine time, preset/custom gains, defaults,
reset preservation, keyboard range adjustment and native close-event focus.
The browser check waits for the asynchronous native close event before checking
focus, rather than treating the intermediate restored opener as the final state.
The project rules now retain the user's priority for demonstrable increments.
See [settings review](reviews/2026-11-02-control-sensitivity.md) for scoped evidence.

**Deviations**

Peer pending. This is an input preference, not aircraft rig calibration, improved
model fidelity, optional flight hardware support or acceptance of the full input
requirement. It adds no stored preferences, replay or training-credit claim.

**Insights**

A small settings panel provides a direct in-flight comparison while keeping the
physics model and source assumptions unchanged.

## 2026-11-02 10:05 — Prepare the handover to Codex

TODO: 0.19 handed over (deferred, due before milestone 1 acceptance). Agent: Claude Code
orchestrator.

**Implementation notes**

Added the [Claude → Codex handover](handover/2026-11-02-claude-to-codex.md). It covers:
- the PR merge order #33 → #32 → #34 → #35 → #36 → #37 (merge commits only);
- the Codex peer review of the Claude-authored batch since `3faf9c8`, with suggested
  packets and focus points;
- the renewed #28b/#30 packets (TODO 0.21);
- the decided and blocked milestone 2 state;
- environment notes.

**Deviations**

Peer pending (batched).

## 2026-11-02 10:02 — Make flight controls visible and stabilize the scene

TODO: 2.0.1 complete as an experimental usability/visual increment.
Agent: Codex orchestrator; code1/flight_ui_v2 and code2/flight_scene_v2 in parallel,
with flight_housekeeping maintaining application instructions and scene_sources
researching official imagery. Independent quality: flight_housekeeping (excluding
its own README); independent validation: flight_validate.

**Implementation notes**

Replaced the marketing overlay with a compact flight deck, explicit Start/Resume,
visible hold buttons and a draggable stick with pointer capture/release. Initial
flight stays paused until started; focus loss clearly exposes Resume. Keyboard
and slider interaction remain available, with actual control-position feedback.

Replaced procedural scenery with Cesium and bundled, openly licensed official
Hessen starter/overview photographs. Source bounds, requests, unknown acquisition
dates, image hashes and DL-DE Zero terms accompany the assets. Camera/aircraft
visuals consume JSBSim state without modifying dynamics. Fixed the misapplied
credit styling that shrank the canvas, removed resizing from the render loop,
and removed adaptive imagery swaps/live-service dependence.

Strict TypeScript/build, five session tests and fourteen real-Chrome integration
checks passed. Independent affected validation observed both images ready in
652 ms, full canvas coverage, actual button/stick flight response, localhost-only
requests and no differences in two paused pixel comparisons. Source-image failures
are visible and nonfatal. See the scoped [quality/validation report](reviews/2026-11-02-flight-controls-imagery.md).

**Deviations**

The live WMS's adaptive queue, oversized-image XML errors and request timeouts
failed the attempted live-loading approach; those runs are not passes. The final
scene uses a small detailed photograph plus a coarse overview, not the planned
EDDF/100 NM region, real terrain, accepted airport elevation or validated 172S
model. Research aircraft data is not redistributed. Peer pending; no simulator
milestone, training credit or public deployment is accepted.

**Insights**

An obvious flight-control affordance and a stable source snapshot make the
prototype usable; passing worker tests alone cannot establish that experience.

## 2026-11-02 09:49 — Add a sorted-log merge driver for DONE

TODO: none (process tooling, user-approved 2026-11-02). Agent: Claude Code
orchestrator; code1 subagent (implementation); quality subagent (three rounds,
final verdict accept).

**Implementation notes**

- `utils/merge/sorted_log.py` merges `docs/DONE.md` three-way per `## ` entry and
  keeps the result newest first.
  - It conflicts only when both sides changed the same entry differently, on delete
    vs change, and on overlapping preamble edits.
  - It falls back to `git merge-file` for duplicate headings, existing markers, an
    entry removed on both sides with additions, and parse failures.
  - Headings inside code fences are ignored. The original text is kept.
- `.gitattributes` maps DONE to the driver and the append-only input index to
  `merge=union`.
- `check.py` checks that every input record is listed exactly once. This added the
  missing `2026-11-01-tool-layout.md` index line.
- `just setup` registers the driver, with a guard that falls back to
  `git merge-file --diff3` when the script or python3 is missing, and
  `recursive=text`.
- SDLC "Log merges" explains why GitHub's web merge and conflict editor are not used
  for DONE.
- On real history, merges that conflict with plain git merge cleanly and match the
  recorded results.

Checks: 189 unit tests OK; check.py exit 0; `utils/ci/run.py --require-node` exit 0
(passed with skipped checks: e1-jsbsim 9 of 23); assure 0 errors.

**Deviations**

GitHub's web merge does not run custom drivers, so the orchestrator re-syncs branches
locally. Peer pending (batched).

## 2026-11-02 08:20 — Estimate S17 indication gaps from FlightGear c172p

TODO: 2.1 inputs. Agent: Claude Code orchestrator; researcher subagent; quality
subagent (two rounds; final verdict accept, 10 of 10 spot checks against c172p matched).

**Implementation notes**

Follows the GAPS Q23 update of 08:01. Manifest 0.3.0 adds S14, FlightGear c172p
`63ba8527` (GPL-2.0-or-later per LICENSE, CONTRIBUTING.md and file headers;
`facts_only`, numbers only, nothing copied). The value files are re-pinned.
indication-loading-values 0.2.0 holds these estimates, all 172P-applicable:
- dial ranges for the tachometer, oil pressure, oil temperature, fuel quantity, vacuum
  and ammeter;
- the EGT scale (°F, 25 °F per division);
- the Hobbs display and time base;
- the low-fuel basis (total content).

S17 values still govern where they exist. Checks: validate_manifest exit 0; 180 unit
tests OK (1 skipped); `assure check` 0 errors.

**Deviations**

Still TBD-src (FlightGear has no answer): the fuel-flow range, tach-time counting,
sender-fault detection and the annunciator switch-label serial. Quality fixes (08:40): S14 is marked `estimate_only`/`172P`, and
both validators enforce estimate-only use and the variant named in `applicability`;
`hash_basis` added; manifest 0.3.1, value files re-pinned. Peer pending (batched).

## 2026-11-02 08:01 — Record FlightGear for S17 gaps; Codex review deferred

TODO: 0.19 deferred. Agent: Claude Code orchestrator.

**Implementation notes**

The user's answer is recorded ([input](input/2026-11-02-flightgear-gaps-codex-deferred.md)).
GAPS Q23 now says the S17 gaps follow the FlightGear Cessna 172 model, labelled
`estimated`, with that model treated as another variant and its licence recorded
first. TODO 0.19 is marked deferred.

**Deviations**

Peer pending (batched) for the Claude-authored batch #32–#36.

## 2026-11-02 07:58 — Extract 172S engine/fuel/electrical indications and POH sample loading

TODO: 2.1 inputs; 1.3.2 empty mass/CG source. Agent: Claude Code orchestrator;
researcher subagent (extraction from S17 Rev 5 page images; SHA-256 prefix
`420dbdaf5517a7a0` matched); quality subagent (three rounds, 13 of 13 spot checks
matched, final verdict accept).

**Implementation notes**

- New `data/aircraft/c172s-classic/indication-loading-values.json` and its schema.
  - It holds the 18 `ind` engine, fuel and electrical indications with S17 Fig. 2-3
    markings. The Section 2 tachometer arcs govern, and p. 7-20 is a recorded
    conflict.
  - It holds the Fig. 6-5 sample loading: 1642 lb basic empty weight, 62.6 × 1000
    lb-in moment, and a derived arm of 0.96836 m, labelled as a sample and not a
    weighed aircraft. It also holds the Fig. 6-3 station arms.
- The validator now:
  - checks exact and affine unit conversions;
  - checks marking units and their order;
  - recomputes the arm, with a tolerance capped at 0.5 %;
  - requires that `governs` points to a recorded conflict, and that electrical
    indications carry an `inclusion` decision.
- The CLI negative tests now copy the manifest bytes.
- Research note added.

Checks: `validate_manifest.py` exit 0; 177 unit tests OK (1 skipped); `assure check`
0 errors.

**Deviations**

- TBD-src: dial ranges, EGT scale, hour-meter counting, the basis of the low-fuel
  threshold, and the serial at which the annunciator switch labels change.
- The manifest `empty_mass` field still needs a follow-up bump that points to the
  sample.
- This branch includes fix/m1-tooling (#34) and fix/m1-records (#33).
- Peer pending (batched).

## 2026-11-02 07:36 — Record the S17 list, electrical and tachometer decisions

TODO: 2.1 scope refined. Agent: Claude Code orchestrator; researcher subagent
(extraction), quality subagent (13 of 13 spot checks against S17 matched; changes
requested).

**Implementation notes**

The user accepted three recommendations ([input](input/2026-11-02-s17-lists-electrical-tach.md)):
- the whole S17 Fig. 2-3 and Fig. 6-3 lists as cited facts (a Q5 exception);
- the ammeter and the low-voltage annunciator in `ind`;
- the Section 2 tachometer arcs as governing.

GAPS Q5 and Q23 record them. fix/m1-contracts (#32) declares the decided `ind` set in
SCENARIO-CONTRACTS §4 and adds the CONTRACTS §1 unit suffixes.

**Deviations**

The extraction branch (data/s17-ind-wb) is in rework after the quality review. Peer
pending (batched).

## 2026-11-02 07:16 — Record the accepted Q23 proposals

TODO: 2.1 scope set; 1.3.2 empty mass/CG source decided. Agent: Claude Code orchestrator.

**Implementation notes**

The user accepted all Q23 recommendations ("yes to proposals. go on";
[input](input/2026-11-02-q23-proposals.md)). Recorded in:
- GAPS Q23 (status column updated) and Q5;
- TODO 2.1: milestone 2 = circuit flight, sensed checklist items, static briefing and
  engine/fuel indications in `ind`; text radio in phase 3;
- fix/m1-contracts (#32): CONTRACTS §10 and SCENARIO-CONTRACTS marked agreed, Q-S3 and
  Q-S8 decided, FDM-172S Q-1 = POH sample loading, labelled;
- fix/m1-tooling (#34): manifest S5/S9 `facts_only`, version 0.2.2, value files
  re-pinned.

**Deviations**

The `ind` digest layout still waits for the researcher's S17 Section 7 engine/fuel
list. Peer pending (batched).

## 2026-11-02 00:53 — Claude peer review of Codex PRs #27–#30 and fixes (TODO 0.21)

TODO: 0.21 in progress (#28b and #30 packets to renew). Agent: Claude Code orchestrator; peer
dispatcher subagent (fresh Claude CLI 2.1.316 per packet; model evidence
`claude-haiku-5-5` and `claude-opus-5-5`), code2 subagent (fixes), quality subagent
(three rounds, final verdict accept).

**Implementation notes**

Report: [peer review](reviews/2026-11-01-codex-prs-27-30-peer.md) and
[JSON](reviews/2026-11-01-codex-prs-27-30-peer.json), five packets frozen at main
`396553c` (#28 split into 28a tooling and 28b docs). Router results: #27 accept;
#28a changes_required; #28b and #30 review_blocked (material withheld, not defects);
#29 accept. There were no critical or high findings.

The fixes in this PR:
- `status.ts` counts a DONE completion only per task ID. Exception or pending wording
  cancels it; "peer pending" and "pending merge" still count as complete. A ticked
  parent's record covers its subtasks, and a ticked parent with open subtasks gets
  the warning `done-parent-open-children`.
- `evidence.ts` checks that a cited source applies to the aircraft variant, using
  known 172 model designators (case-insensitive; `S/N` is not read as a variant).
- The SBOM CesiumJS row now says it is not adopted in the application yet.
- The missing-engine smoke test serves a runtime copy without `dist/jsbsim.*`.
- New `app/runtime.ts` and its tests prove that the `build-flight-engine` output is
  the path `just fly` serves.

Other #28b findings are handled in their own PRs: the CI text in #34, the E14 clash in
#32, and the BRIEFING IDs match the SPEC edits in #33.

Checks on Node 24: the assure suite passed 83 of 83; `assure check` reported 0 errors;
the app suite passed 9 of 9; `utils/ci/run.py --require-node` passed with skipped
checks (e1-jsbsim 9 of 23).

**Deviations**

- The real-engine browser smoke test was not run (no engine build and no Chrome here):
  not evaluated.
- Known limitations: the completion check still passes some unlisted negative wording
  ("failing tests", "needs review"); 172I is not recognised; negated designators
  ("not the 172S") are still read as naming the variant; "unstated" sources are
  lenient (L3); `app/runtime.ts` is not type-checked (L6).
- The fixes are Claude-authored, so they need the Codex peer review (TODO 0.19 batch).
  The #28b and #30 packets need renewal with the withheld material.

## 2026-11-02 00:30 — Apply foundation-review tooling fixes (TODO 1.6)

TODO: 1.6 in progress. Agent: Claude Code orchestrator; code1 subagent implemented.

**Implementation notes**

The manifest validator rejects duplicate JSON keys. Value files pin the manifest by id,
`manifest_version` and `manifest_sha256` (SHA-256 of the file bytes), and the schemas
require these fields. The CI runner has an app npm phase (`npm ci --ignore-scripts`);
an install failure counts as a skip only when the output shows a network or certificate
error, and `--require-node` makes it a failure. test_run skips Node-dependent cases on
Node older than 24.2 instead of failing. Dependabot watches `/app` npm weekly. EVAL
CI2/CI5, SBOM and SEC text match. Checks on Node 24: 152 unit tests OK;
`utils/ci/run.py --require-node` passed with skipped checks (e1-jsbsim 9 of 23).

**Deviations**

In this sandbox, `npm ci` needs `npm_config_cafile` because of the proxy certificate.
Peer pending (batched).

## 2026-11-02 00:25 — Contract fixes and renewed foundation review (TODO 1.6)

TODO: 1.6 in progress. Agent: Claude Code orchestrator; a renewed quality/validate
subagent re-checked the merged contract and record fixes.

**Implementation notes**

Branch fix/m1-contracts (separate PR) fixes the review blockers B1–B4 in CONTRACTS
§10 (derived `setting_ref`, `sim_core`/`env_core`, worker-computed `ind`, single
worker `seq` allocator, one rights enum, JCS/SHA-256 hashing), the VFE detent bands
and phone-loss `fallback` source across SCENARIO-CONTRACTS, EXERCISE-01 and
PHONE-CONTROL. The renewed review found B1–B4 fixed and seven low items. They are now
fixed: §9 is marked as applied, the v1 `seq` text is kept apart from the v1.1
proposal, `sim_core` naming, phone proposals use `proposal_id`, the EXERCISE-01 flap
selection points to the AA2 radian bounds, the proposed EVAL section no longer reuses
E14, C17 is in order, and Q16/TODO/study text says Apple M1 Pro.

**Deviations**

v1.1 contracts remain proposals until accepted (Q23 Q-S7). Peer pending (batched).

## 2026-11-02 00:21 — Apply foundation-review record fixes (TODO 1.6)

TODO: 1.6 in progress; 1.2.1.1 and 0.21 added. Agent: Claude Code orchestrator; the
TODO 1.6 quality and validate subagents produced the findings.

**Implementation notes**

Applied the proposed SPEC edits (R-SIM-3, R-SIM-4 from CONTRACTS §9 plus the v1.1
worker rules, R-COMM-1 AFIS information-only, R-BRIEF-1 failure states); removed stale
stack/prototype text from SPEC and CONCEPT; reconciled GAPS Q16 to the measured M1
Pro, fixed the stale PR #24 reference; added GAPS Q23, a register of the open design
questions from SCENARIO-CONTRACTS, FDM-172S, EXERCISE-01, BRIEFING and PHONE-CONTROL;
added TODO 1.2.1.1 (real-terrain re-test) and 0.21 (Claude review of Codex PRs
#27–#30).

**Deviations**

Contract and tooling fixes are on separate branches; user scope decisions (Q23) open.
Peer pending (batched).

## 2026-11-02 00:03 — Remove the aircraft measurement campaign from the 172S plan

TODO: E2. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

The user has no aircraft and asked to stay in scope. FDM-172S no longer proposes a
measurement campaign: geometry beyond TCDS/POH dimensions and the empty mass/CG are
estimated, labelled and bounded by sensitivity runs; Q-2 is closed.

**Deviations**

This change reached PR #24's branch after it merged, so it lands here instead.

## 2026-11-01 23:27 — Resolve PR 29 against merged browser prototype

TODO: 1.5.2 and 2.0 retained with their distinct scope.
Agent: Codex orchestrator; independent integration quality/flight_housekeeping
and validation/flight_validate review the merge.

**Implementation notes**

Integrated main a450894 after PR #30 into the existing assessment-airspeed PR.
Resolved the single DONE conflict by complete dated records, preserving both
parents' record bodies in chronological order. Quality also caught and corrected
a stale README statement that still called the browser application future work.
Browser and training implementations
are unchanged by the conflict resolution; their combined CI registration remains.
The shared local gate passed, including eleven training tests; existing optional
study and platform skips remain explicit. Added the user's required pre-PR fetch,
local mergeability check, conflict resolution and post-publication recheck to SDLC.

**Deviations**

Peer pending under the existing cadence. This integration does not validate
additional aircraft behavior or accept a simulator milestone.

**Insights**

Recheck older open PRs when main advances, and merge complete progress records
rather than independently accepting adjacent conflict fragments.

## 2026-11-01 23:21 — Fly the local browser prototype

TODO: 2.0 complete as an experimental slice; 1.3.2–1.3.4 and the first-exercise gates remain open.
Agent: Codex orchestrator; flight_engine/code1 and flight_scene/code2 implemented
independent paths in parallel, with flight_housekeeping maintaining app instructions.
Independent quality: flight_housekeeping (excluding its own README); independent
validation: flight_validate.

**Implementation notes**

Added an actual browser application: procedural 3D scenery, cockpit/chase views,
keyboard and touchpad controls, live TAS/attitude/study-altitude/heading/VSI displays,
throttle, pause and restart. The existing JSBSim worker owns fixed 1/120 s steps;
there is no replacement UI physics or scripted-flight fallback. The visible,
adjustable study roll offset reuses the E1 input fixture, not aircraft coefficients.
`just build-flight-engine` builds ignored local research assets; `just fly` starts
localhost:5173. npm versions and integrity hashes are locked. Browser CI checks the
UI build and lifecycle tests without downloading or distributing model assets.

The strict build, five session tests and ten-check actual-Chrome smoke passed.
Independent browser validation exercised controls, focus release, reset, view-state
preservation, missing runtime and WebGL failure. The ten-second assisted baseline
remained airborne with maximum bank 4.26°. Both review findings were fixed and
rechecked. See the scoped [quality/validation record](reviews/2026-11-01-browser-prototype.md).

**Deviations**

This local prototype advances the product while the project-owned 172S model and
official EDFE data remain incomplete. It uses the generic research model locally,
procedural geography, TAS and the study altitude datum. It does not supply validated
PPL handling, QNH/QFE, navigation, circuit assessment or a public deployment. The
production UI bundle excludes the restricted research runtime. Peer pending;
no simulator milestone or release is accepted.

**Insights**

Connecting the working study to controls and a flight deck supplies a usable place
to test each next realism increment. Short browser smoke checks expose integration
failures that isolated helpers cannot reveal.

## 2026-11-01 22:55 — Implement the bounded assessment-airspeed foundation

TODO: 1.1.3, 1.5.1 and 1.5.2 complete; parent 1.1/1.5 remain open.
Agent: Codex orchestrator; product/airspeed_product, code1/airspeed_mapper,
code2/airspeed_adapter and housekeeping/airspeed_housekeeping; independent
quality/airspeed_quality and validate/airspeed_validate.

**Implementation notes**

After PR #28 merged, selected the existing CAL IAS reconciliation and a narrow
mapping/data-adapter slice. Product froze AA1–AA6 before parallel implementation.
The pure TypeScript mapper uses the 16 existing normal-static POH anchors,
source-backed SI interpolation and the declared instructional detent rule.
Invalid/unsupported and out-of-table samples have no numeric IAS. The repository
adapter preserves source identity, conditions/citations and draft/not-validated
labels in a detached frozen bundle. Its caller-declared byte hash is format-
checked, not independently bound to the parsed object by the adapter.

Fixed the Exercise 01 replay wording: derived CAL IAS stays outside `ind` and
the digest, with future source/mapping/evaluator pins. Added readonly contracts,
a private ESM source boundary and separate fail-closed Node CI coverage without
package installation. Source JSON and aircraft values are unchanged. Root
integration caught and repaired skipped sparse-array entries in source validation.

The full local gate passed: 141 Python tool tests discovered, 140 executed with
one Linux-only skip; 25 E2 tests; 14 E1 tests with nine optional-engine skips;
72 assurance tests; 11 training tests with zero skips; render/integrity/whitespace
checks. Strict local no-emit TypeScript checking passed using the existing
Propeller compiler. Independent reviewers found no blocking defect and recorded
additional malformed-input and interpolation probes. See E15 in RESULTS and
[quality](reviews/2026-11-01-assessment-airspeed-quality.md) /
[validation](reviews/2026-11-01-assessment-airspeed-validation.md).

**Deviations**

Peer pending under the batched cadence. This completes the bounded component,
not the full exercise/scenario specification, a browser application, recorder,
ASI model or target-band classifier. The rounded-SI versus exact-knot comparison
policy remains open before band classification. Data applicability/rights and
physical or educational validity are not established by structural adaptation
or numerical availability. All 14 seeded MVP criteria remain planned.

**Insights**

Keep assessment derivation separate from the cockpit instrument model. Preserve
operational availability, source labels and approval as different states, and
make the caller's source-byte binding responsibility explicit.

## 2026-11-01 22:14 — Reconcile PR 27 with the assurance and CI layout

TODO: 1.3.1 complete; 1.15 retained; 1.3.2–1.3.4 remain open.
Agent: Codex orchestrator; code1/peer_runner, code2/peer_registration and
housekeeping on disjoint integration paths. Independent quality and validate
review the resulting integration separately.

**Implementation notes**

Merged main `aeb5d3f` after PR #27 into the PR #28 branch at `e8d0a07`.
Resolved DONE by complete dated entries against both parents and their merge
base: all 50 feature entries are byte-preserved, and the complete incoming E2
entry is inserted chronologically. Task 1.3.1 now records the merged calculation
tool and synthetic fixtures; its aircraft-specific follow-up tasks remain open.
Utilities documentation retains the relocated tooling and adds the E2 study.

The relocated runner includes both E1 and E2 study suites plus assurance.
Its production functions retain their previous ASTs; the E2 registry addition
and incoming zombie-aware timeout-test helper are preserved. All 38 CI test
identities from the two parents remain present. The five E2 files remain
byte-identical to merged main. The shared local gate passed 138 executed Python
tool tests with one Linux-only skip, 25 E2 tests, 14 E1 tests and 72 assurance
tests; nine optional JSBSim tests were also skipped. Synthetic rendering,
assurance integrity and tracked whitespace passed. See independent
[quality](reviews/2026-11-01-pr27-integration-quality.md) and
[validation](reviews/2026-11-01-pr27-integration-validation.md).

**Deviations**

Peer pending for this integration and the merged E2 groundwork under the batched
cadence. Earlier assurance/layout peer reports cover their recorded revisions,
not this later merge. Calculation readiness supplies no aircraft-specific inputs,
JSBSim tensor adapter, M-a acceptance, validated model or simulator milestone.

**Insights**

A task ID collision needs one reconciled scope and state. Preserving whole
progress entries and comparing both parents avoids pairing a heading with an
unrelated implementation or deviations body.

## 2026-11-01 21:42 — Organize assurance and CI tooling under utils

TODO: 1.15 complete. Agent: Codex orchestrator; code1/peer_runner,
code2/peer_registration and housekeeping on disjoint paths. Independent quality,
validation and scoped external peer dispositions are recorded separately below.

**Implementation notes**

Moved the assurance runtime, tests and pinned upstream core to `utils/assure/`.
Grouped the CI runner, structural checker, Node reporter and CI tests under
`utils/ci/`; its Python package preserves recursive discovery from `utils`.
The `just` commands retain their names. Updated root detection, workflow paths,
inventory destinations, output guards, current documentation and source links.
Canonical assurance documents/catalog stay in `docs/assure/`; all 13 reused
Propeller files retain their original bytes and original source identities.
Committed pre-relocation snapshots remain readable without worktree fallback.

The shared local gate passed: 137 Python tooling tests, 72 assurance tests,
synthetic rendering and 14 executed study tests. Nine optional JSBSim checks
were skipped because the engine package is unavailable. Tracked-content
whitespace passed on 208 paths. The relocated checker and CLI were exercised
from an unrelated directory. Five historical review navigation links are pinned
to their recorded source revisions; their commands, findings and outcomes remain
unchanged. Request: [input](input/2026-11-01-tool-layout.md).

**Deviations**

This is a tooling layout change. Simulator requirements, aircraft values and the
14 planned/zero accepted MVP criteria retain their existing scope. Independent
[quality](reviews/2026-11-01-tool-layout-quality.md),
[validation](reviews/2026-11-01-tool-layout-validation.md) and
[peer](reviews/2026-11-01-tool-layout-peer.md) records carry their own outcomes;
prior peer acceptance is historical evidence for its earlier revision.

**Insights**

Moving Python tests into a directory also requires a discoverable package.
Historical revision inspection needs an explicit old-layout reader, while
current checks must not silently accept a missing new-layout inventory.

## 2026-11-01 21:05 — Complete bounded assurance adoption and status reconciliation

TODO: 1.14 complete. Agent: Codex orchestrator; product, code1/peer_runner,
code2/peer_registration and housekeeping on disjoint paths, then independent
quality and validate. PR: [#28](https://github.com/gregoryyy/gefly/pull/28).

**Implementation notes**

The new tracker reuses 13 byte-preserved pure Propeller files from commit
99dc6005. Gefly adapters derive requirements, tasks, decisions, progress,
commit/file/test identities and aircraft JSON-pointer provenance. Catalog
relationships distinguish outcomes, certainty, freshness and acceptance.
All 14 seeded MVP criteria remain planned, with no accepted claims. Archived
measurements retain three recorded passes, one failed step-cost observation and
their incomplete-provenance limits.

Local checks passed 137 tooling tests, 72 assurance tests and 14 study tests;
nine optional JSBSim tests were explicitly skipped. Both hosted Python jobs
passed the same implementation at 2900ca38. Seven independent quality findings
prompted rejection/impact/ledger/report regressions; affected checks and reviews
were renewed. Current status contradictions and the damaged FDM progress entry
were reconciled from decisions/data/Git history. See [RESULTS](RESULTS.md) and
the [quality](reviews/2026-11-01-assurance-quality.md) /
[validation](reviews/2026-11-01-assurance-validation.md) records.

**Deviations**

This accepts bounded tooling and its documented limits, not aircraft fidelity,
an MVP or the entire foundation. Historical references and archival provenance
remain advisory warnings; skips remain skips. No new flight run was performed.
The [scoped external peer disposition](reviews/2026-11-01-assurance-peer.md) is
recorded separately under the existing batched cadence; older peer coverage in
TODO 0.19 remains open. No database, hooks, extra agent or runtime package added.

**Insights**

A passing test file is not proof that it declares tests. Accepted evidence must
remain valid after dependency resolution, and field-level impact must include
whole-file pins. Status records are now included in the assurance review snapshot;
generated review records remain outside it to avoid self-referential hashes.

## 2026-11-01 20:40 — Adopt bounded assurance (integration in progress)

TODO: 1.14.1 complete; 1.14.2–1.14.4 in progress. Agent: Codex orchestrator;
product, code1/peer_runner, code2/peer_registration and housekeeping on disjoint
paths; independent quality review started, integrated validation pending.

**Implementation notes**

Recorded Q22 and R-ASR-1 through R-ASR-5 with AS1–AS8. Reusing pinned Propeller
pure lineage code with Gefly adapters, catalog evidence/freshness checks and the
shared offline CI gate. Reconciled current decisions and data availability,
restored the complete FDM progress entry from the last correct main revision,
and normalized two legacy progress records without changing their observations.

**Deviations**

Integration and independent checks are in progress; this entry does not accept
unreviewed implementation, an aircraft model or the MVP. Earlier peer coverage
remains separate and TODO 0.19 open. No database, hooks or new agent role added.

## 2026-11-01 19:35 — Prepare E2 component mass and inertia calculations

TODO: 1.3.1; E2 preparation only. Agent: Codex orchestrator; code1/e2_math,
code2/e2_cli and housekeeping/e2_docs in parallel; independent local quality/e2_quality
and validate/e2_validate. User switched the builder to Codex and reviewer to Claude.

**Implementation notes**

Added the stdlib [mass-properties study](../studies/e2-c172s/README.md): positive
component masses, common-reference body-axis CGs and intrinsic inertia tensors
produce total mass, CG and a parallel-axis tensor. Strict JSON CLI retains the raw
input hash and an explicit unvalidated-input label. Synthetic fixtures cover
analytic bodies, off-axis products, scaling, translations, physicality and errors.
The shared gate runs the new study and rejects a failing E2 suite. Final local
gate: 134 tool tests, 25 E2 tests, 14 E1 tests and synthetic render check passed;
9 optional JSBSim engine tests skipped.

Fixed the existing CI timeout test's Linux liveness check: a killed zombie is
terminated even when container PID 1 does not reap it. Live-child detection and
actual process-group timeout checks remain exercised; production cleanup is unchanged.
Local quality found a low-severity extreme mass/position order-sensitivity case;
the calculation now selects a deterministic largest-mass reference, with regressions.

**Deviations**

No sourced 172S coefficients or mass values, structural/JSBSim tensor adaptation,
gear model, aircraft acceptance, or milestone-2 implementation. M-a and TODO 1.3
remain open. Claude peer review pending; the Claude CLI is absent in this instance.
The [handoff evidence](reviews/2026-11-01-e2-mass-properties.md) distinguishes local
reviews from the pending opposite-provider gate.

**Insights**

A zero-inertia point-mass fixture can verify tensor signs without borrowing an
aircraft model. Separate calculation readiness from the missing aircraft evidence.

## 2026-11-01 19:06 — Repair post-merge records; record stack, fuel-chart and tolerance answers

TODO: 1.1.2, 1.2.3, 1.4 complete. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

After the user merged PRs #9–#23 with "accept both" conflict resolutions, DONE.md had
truncated, mixed and out-of-order entries. Rebuilt it from the complete per-entry
versions in main's history (44 entries, newest first; Exercise 01 entry no longer
carries the iPhone and briefing bodies). Checked GAPS (unique headings; Q15 answers
restored to newest first), README (stale "variant and stack open" sentence), TODO
(merged/reviewed statuses), AGENTS and ARCH (stack). Recorded the user's answers:
Q17 web stack (CesiumJS, three.js fallback, MapLibre, TypeScript, JSBSim worker), Q5
Lycoming fuel-chart points, Q21 FDM tolerance proposals accepted as working proposals.

**Deviations**

Other files were checked for duplicated lines and conflict markers only, not
re-reviewed line by line. Peer pending (batched).

## 2026-11-01 19:00 — Extract Lycoming power points and POH cruise/glide values

TODO: E2 data. Agent: Claude Code orchestrator; researcher/housekeeping subagent.

**Implementation notes**

New `data/aircraft/c172s-classic/performance-values.json` with its own schema:
Lycoming 60297-12 ratings (p. 2-2) and selected sea-level power points read from
curve 13516-A (p. 3-40) with reading uncertainty; POH cruise at 2000 ft (p. 5-19)
and best-glide speed and distance (glide ratio derived). Lycoming manual registered
as a facts-only source (manifest 0.2.0); validator extended, 21 tests (112 total).

**Deviations**

2300 rpm has no chart curve (unknown); the chart is for the 160 hp rating and an
uninstalled engine; the glide figure is a single line, so one reading carries its
whole content — flagged for the user against the no-piecemeal rule. Not yet reviewed.
Peer pending (batched).

## 2026-11-01 18:49 — Plan the project-owned JSBSim 172S model (E2)

TODO: E2 preparation. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [FDM-172S](design/FDM-172S.md): JSBSim block structure with a source class
(sourced, derived, estimated, plausibility) for every parameter group and a
per-parameter provenance file with a CI check; OpenVSP geometry inputs; calibration
vs frozen holdout sets (glide added for drag, forward-CG stall to holdout); proposed
tolerances P-1..P-10; a `studies/e2-c172s/` harness reusing E1 and the WASM worker;
licensing; milestones M-a..M-e with exit criteria. No coefficient values.

**Deviations**

Plan only; blockers: empty mass/CG (Q-1), geometry gaps (planform, airfoil, tail),
tolerance acceptance (Q-11). Cruise/glide extraction is already authorised and
running. Not yet reviewed. Peer pending (batched).

## 2026-11-01 18:46 — Select model size and reasoning effort per task

TODO: 0.20 complete. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Per the user (GAPS Q20), AGENTS, BOOT (dispatch section) and the agent workflow now
require the orchestrator to choose model tier and reasoning effort per task by
difficulty and risk, with reviews at least at the tier of the reviewed work and no
model identifiers in repository files. This is a recorded change to the agent rules.

**Deviations**

No runtime configuration changed; native Codex registrations still set no model.

## 2026-11-01 18:45 — Record the valid CesiumJS run on the reference Mac

TODO: 1.2.3 in progress. Agent: Claude Code orchestrator (no subagents); run by the
user on the reference Mac (Apple M1 Pro GPU, 120 Hz), Chrome 156.

**Implementation notes**

CesiumJS 1.146.0 with the JSBSim stream after the canvas fix: median 8.3 ms, p99
9.4 ms, 2 missed vsyncs, heading check pass; both render budgets pass. With the
earlier three.js result, both candidates meet the budgets.

**Deviations**

Smaller window (739×817) than the three.js run, CSS resolution only, no real terrain
or imagery tiles. Renderer choice awaits the user. Peer pending (batched).

## 2026-11-01 18:26 — Fix Codex review findings on PRs #4–#6

TODO: 0.19 in progress. Agent: Claude Code orchestrator; code1 subagent. Findings
from the Codex local review (report `docs/reviews/2026-11-01-first-claude-prs.md` on
branch docs/first-claude-pr-review-evidence).

**Implementation notes**

1. The JSBSim study's stationary and cost fixtures now fail on any `run()` returning
   False or not advancing sim time by dt; 7 fake-FDM tests (no jsbsim needed).
2. `studies/e1-jsbsim/requirements.txt` pins jsbsim 1.3.3 and numpy 2.5.4 with
   hashes (CPython 3.13 manylinux x86-64 only); README uses
   `pip install --require-hashes -r …`. Fresh-venv install verified; recorded F1
   digests unchanged.
3. SPEC, README and CONCEPT now state JSBSim is selected (Q17), separate from the
   open model, rendering and hosting choices.

**Deviations**

Formal peer acceptance stays blocked: the Codex CLI failed to initialise on a
read-only filesystem; a re-run with an updated packet is needed. Hashes cover one
platform only; the original run's numpy version was not recorded.

## 2026-11-01 18:21 — Survey open Cessna 172 aerodynamic data for the E2 model

TODO: E2 preparation. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

Added [C172 aero data sources](research/2026-11-01-c172-aero-data-sources.md): no
open 172S-specific aero, propeller, inertia or gear data found. Usable earlier-model
sources: NASA TM-80163 flight-test derivatives (public domain, aircraft identity
inferred), KU-M-407-7 1974 172M identification (cite-only), consistent inertia sets,
NASA CR-2605 DATCOM estimates, NASA SP-468 drag/L-D; Lycoming IO-360-L2A curve is
copyrighted; no public McCauley 1A170E data. Proposed calibration vs holdout split.

**Deviations**

No coefficients added. Needs Q5 decisions (digitising the Lycoming curve, OpenVSP
licence) before a model can be built. Not yet reviewed. Peer pending (batched).

## 2026-11-01 18:18 — Draft scenario and review contract extension v1.1

TODO: 1.9 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [SCENARIO-CONTRACTS](design/SCENARIO-CONTRACTS.md) as a minor extension of
CONTRACTS v1: one-directional scenario record (package, briefing, catalog snapshot,
aircraft manifest, environment), shared event envelope with logged/derived and digest
group per event type, review record with re-simulated seek, a code1/code2 field
ownership table for milestone 2, and 15 reconciled naming conflicts across the
CONTRACTS, BRIEFING, EXERCISE-01, EXPERIENCES and PHONE-CONTROL drafts.

**Deviations**

Orchestrator accepts C3 (`magvar_east_rad` JS-computed, `ind` group, consistent with
the WASM-only `sim` digest rule) and C5 (altimeter state holds the set pressure; the
reference is scenario-expected plus a derived match, since the knob only sets a
pressure) as technical consistency fixes within Q18; the user can revise them. Not
yet reviewed. Peer pending (batched).

## 2026-11-01 18:16 — Record local review of first Claude PRs

TODO: 0.19 in progress. Agent: Codex orchestrator; first_pr_docs_review.

**Implementation notes**

Performed independent local source inspection. Reviewed Claude PRs #4–#6 at `48b2991`; three medium findings
remain unresolved. [Report](reviews/2026-11-01-first-claude-prs.md) includes
reproductions, validation scope and frozen packet hash. The fresh Codex CLI
failed before reviewer initialization on the read-only filesystem; formal peer
acceptance remains blocked and TODO 0.19 stays open. No product fixes made.
Current foundation CI passed 41 tests; study tests passed 7 and skipped 9.

**Deviations**

Formal peer initialization failed; the local review is not a passed peer gate.

## 2026-11-01 16:47 — Draft the paired-iPhone control specification

TODO: 1.13 in progress. Agent: Claude Code orchestrator; product subagent (with source
research).

**Implementation notes**

Added [PHONE-CONTROL](design/PHONE-CONTROL.md) and its
[source note](research/2026-11-01-phone-control-sources.md). Proposal: direct WebRTC
data channel on the local network (unordered, no retransmission, no STUN/TURN), a
short-lived encrypted pairing mailbox, single-use QR code plus a 6-digit code
confirmed on both devices, mapping into the CONTRACTS input boundary with staleness
and replay rejection, and keyboard/touchpad fallback.

**Deviations**

Draft; iOS orientation needs an HTTPS page, so hosting (open) blocks it; sensor rate
and latency unmeasured, budget values are proposals; not yet reviewed. Peer pending
(batched).

## 2026-11-01 14:07 — Extract cited 172S POH values

TODO: 1.3/1.5 support. Agent: Claude Code orchestrator; researcher/housekeeping
subagent.

**Implementation notes**

Per the user's decision, extracted only needed POH (172SPHUS Rev 5, S17) values as
cited facts into `data/aircraft/c172s-classic/poh-values.json` (66 tabulated numbers
checked against rendered pages): airspeed calibration points for the Exercise 01
bands (p. 5-9), stall speeds (p. 5-12), short-field take-off/landing distances at
2,550 lb near EDFE elevation (pp. 5-14, 5-23/24), climb (p. 5-17), and paraphrased
correction notes. Separate schema, extended validator, 25 POH tests (19 initial, 6 after review) and a
[research note](research/2026-11-01-c172s-poh-values.md).

**Deviations**

POH gives short-field distances only; VFE 10° KCAS differs between p. 2-4 (107) and
p. 5-9 (109), recorded as pending; applicability of later POH revisions to
172S9491–9809 unchecked; not yet reviewed. Peer pending (batched).

## 2026-11-01 13:59 — Confirm the height datum; contracts v1 agreed

TODO: 1.4 complete pending merge. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

The user accepted the physical-height convention (GAPS Q18 O-3); CONTRACTS no longer
marks it pending. With Q18 resolved and three review rounds closed, contracts v1 is
the agreed basis for parallel product coding.

**Deviations**

Peer pending (batched); geoid grid full hashes and terrain beyond Hessen remain open.

## 2026-11-01 13:34 — Draft scenario briefing, AFIS radio and checklist scope

TODO: 1.8 in progress. Agent: Claude Code orchestrator; product subagent (with source
research).

**Implementation notes**

Added [BRIEFING](design/BRIEFING.md) and its
[source note](research/2026-11-01-briefing-radio-sources.md): snapshot briefing
schema validated against scenario time with explicit failure states; QNH/QFE/STD flow
into the environment; a later live adapter frozen into replay; AFIS (information, not
clearances) text-radio scope with AI text limited to proposing intents; POH checklist
items classified by modeled state. EDFE has no METAR in the checked feed, so briefings
pair EDDF METAR/TAF with a generated EDFE report.

**Deviations**

Draft; WMO-No. 306, ICAO Annex 3/Doc 4444/9432 and DFS AIP not read; not yet
reviewed. Peer pending (batched).

## 2026-11-01 13:31 — Draft Exercise 01 acceptance criteria

TODO: 1.5 in progress. Agent: Claude Code orchestrator; product subagent (with source
research).

**Implementation notes**

Added [EXERCISE-01](design/EXERCISE-01.md): holding-point start with engine running,
12 phases with measures, units and state fields, pass/fail/feedback rules, assists,
replay markers and environment cases; and its
[source note](research/2026-11-01-exercise-01-sources.md). Tolerances are labelled by
source: EASA AMC1 FCL.235 skill-test guidance (used as instructional adaptation),
C172S POH (page-cited), EDFE operator material (cite-only), or instructional proposal
pending instructor review.

**Deviations**

Draft, not frozen: runway, instructor reviewer, AIP circuit data and the POH climb-
speed discrepancy are open; not yet reviewed. Peer pending (batched).

## 2026-11-01 13:29 — Draft the 172S classic-panel aircraft manifest

TODO: 1.3 in progress. Agent: Claude Code orchestrator; housekeeping subagent.

**Implementation notes**

Added `data/aircraft/c172s-classic/manifest.json` (v0.1.0, fidelity not validated):
serials 172S9491–172S9809, IO-360-L2A, McCauley propeller, masses and speed limits
only where page-cited, with SI and original units, R-DATA-2 status, uncertainty and
a source register with rights and hashes. Conflicting sources (VFE CAS, utility ramp
mass) are recorded as unknown with both readings. JSON Schema, stdlib validator and
15 tests added to the shared gate.

**Deviations**

Draft; FAA 3A12 Rev 88 and engine TCDS 1E10 not read; avionics fit TBD; not yet
reviewed. Aircraft data: peer pending (batched), required before milestone acceptance.

## 2026-11-01 13:07 — Draft the flight-experience package and LLM boundary

TODO: 1.10 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [EXPERIENCES](design/EXPERIENCES.md): declarative versioned package (no code,
unit- and reference-bearing values, per-value provenance status), stable-ID source
catalog starting with `eddf-100nm`/EDFE, LLM boundary (draft and catalog lookup
only), nine validation stages with failure codes, review states with author ≠
reviewer, security rules, and an EDFE circuit example with every real value TBD.

**Deviations**

Draft; cites the holding-point start from branch `design/contracts-1-4` (not yet on
main); runway in the example is illustrative; Q13 provider open; not yet reviewed.
Peer pending (batched).

## 2026-11-01 13:06 — Draft the pilot-qualification profile contract

TODO: 1.12 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [QUALIFICATIONS](design/QUALIFICATIONS.md): sourced-value model with per-field
status and source register, profile schema (jurisdiction, authority, full
qualification, privileges, objectives→exercises, aircraft-manifest references,
mandatory no-training-credit flag), 12 invalidity rules, versioning, a draft EASA
PPL(A)/C172S example and placeholder SPL/ultralight shapes bound to Q14.

**Deviations**

Draft; most PPL values unverified until Part-FCL sections are read; Q14 choices not
made; proposed SPEC edits not applied; not yet reviewed. Peer pending (batched).

## 2026-11-01 13:06 — Add study checks to the shared CI gate

TODO: 1.1.2 in progress. Agent: Claude Code orchestrator; code1 subagent.

**Implementation notes**

`utils/ci.py` now runs the `studies/e1-jsbsim` tests in a separate interpreter
(fails on missing/empty/failing/import errors, reports skips) and
`check-synthetic.mjs` with node; a missing node is reported as a skip and the final
line says "passed with skipped check". Hosted CI uses `--require-node` with the
runner's preinstalled Node.js. 8 new negative/positive tests (49 tool tests total).

**Deviations**

Local only: hosted run and independent review pending. Peer pending (batched).

## 2026-11-01 12:58 — Draft shared contracts v1

TODO: 1.4 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [CONTRACTS](design/CONTRACTS.md): SI units and frames with conversion
boundaries, fixed 1/120 s step and step-index clock, pilot-sense input schema with
applied-step logging, three-layer state (sim/instruments/teaching), replay metadata
with seed set before RunIC, 17 sourced fixtures, versioning and a v0.1→v1 message
table. Proposed SPEC wording for R-SIM-3/R-SIM-4 is not applied.

**Deviations**

Draft only; nine open questions (O-1..O-9) need decisions; not yet independently
reviewed. Peer pending (batched).

## 2026-11-01 12:56 — Record M1 render runs; fix the hosted Cesium page

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator (no subagents); runs
by the user on the reference Mac (WebGL: Apple M1 Pro, 120 Hz), Chrome 156.

**Implementation notes**

three.js with the JSBSim stream: median 8.3 ms, p99 9.4 ms at 120 Hz: both render
budgets pass (1232×817 viewport, CSS resolution). CesiumJS run invalid: 300×150 px
drawing buffer because the host CSP blocks `widgets.css`; added inline canvas CSS
and an invalid-run guard, republished the page (version 2). Recorded the hosted
launcher and its file map under `studies/e1-browser/hosted/` for later repeats.

**Deviations**

Cesium repeat pending. GAPS Q16 says M1; the GPU string says M1 Pro (to confirm).
Peer pending (batched).

## 2026-11-01 12:53 — Record the reference M1 worker benchmark

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator (no subagents); run
performed by the user on the reference MacBook Pro M1, Chrome 156.

**Implementation notes**

Stored the user's JSON under `studies/e1-browser/results/`. Missed steps 0.33 per
10 s, latency p95 16.9 ms and same-build replay pass; paced step-cost p99 800–1000 µs
exceeds 830 µs as measured but is limited by 100 µs timer coarsening (page not
cross-origin isolated); unpaced compute ≈ 15 µs per step. Replay digest equals the
container's for the same WASM build.

**Deviations**

Render runs on the M1 pending; step cost to be re-measured cross-origin isolated.
Peer pending (batched).

## 2026-11-01 12:33 — Validate the E1 browser check; publish the M1 test page

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator; validate subagent.

**Implementation notes**

Local validate at `15dbd83`: no acceptance claim from the container; status labels
match results. Documentation fixes applied: render ranges reconciled and labelled
not evaluable, latency/replay qualified as preliminary, seed and extra `ready.build`
fields and synthetic-source validation recorded as v0.1, status lines updated, CPU
headroom and R-SIM-2 deferred to the reference run. Published a private test page
for the reference M1/Chrome run (artifact, built WASM included) and added a visible
results panel to the render pages.

**Deviations**

Acceptance blocked until the reference M1/Chrome run. The hosted page is not
cross-origin isolated and may block CesiumJS run-time loads. Peer pending (batched).

## 2026-11-01 12:13 — Review and fix the E1 browser check

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator; quality, code1 and
code2 subagents.

**Implementation notes**

Local quality: 2 medium and 10 low findings; contract tightened by the
orchestrator (true heading, 8.3 ms missed-step definition with lag reporting,
refresh-relative frame budget, input echo at s+1), code fixes by code1/code2;
renewed review at `b4581b6`: all fixed except CDN SRI (accepted for the study).
Container results: latency and replay pass; missed-step budget fails (2.7–3.3 per
10 s, 45 ms max lag, none dropped); step-cost p99 unstable (485–905 µs).

**Deviations**

Container results are preliminary; reference M1/Chrome run outstanding. Validate not
run. Peer pending (batched).

## 2026-11-01 12:02 — Build the E1 browser check (worker + render)

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator; code1 (sim) and
code2 (render) in parallel on disjoint paths against a frozen contract; quality
review running.

**Implementation notes**

code1: JSBSim v1.3.3 WASM (emsdk 6.0.13) in a module Web Worker at fixed 1/120 s;
container run: p99 paced step 485–505 µs, 0 missed steps, input-to-state p95
18.8–20.1 ms, identical replay digest. code2: CesiumJS 1.146.0 (no ion) and
three.js 0.187.0 pages with a shared frame meter and synthetic circuit at EDFE.
Orchestrator integration: module-worker fix; both pages run on the JSBSim stream
at ≈ 60 Hz. Contract deviations recorded as v0.1 proposals.

**Deviations**

Software GL in the container makes render numbers meaningless for the budget;
reference M1 run outstanding. Peer pending (batched; see GAPS Q15).

## 2026-11-01 11:54 — Adopt proclens's batched peer-review cadence

TODO: 0.18 updated; 0.19 added. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Per the user, adopted proclens's review-gate logic (`gregoryyy/proclens` main
`3d671a3`): peer review every few PRs, one review per revision range since the last
peer-reviewed revision, *peer pending* in between, plus its packet-egress rule.
Updated GAPS Q15 (per-PR scope struck), SDLC, AGENTS, SPEC R-AGENT-7, agent
workflow, peer role and PR template. proclens has no hooks; nothing to adopt there.
Router and tests unchanged: proclens's copies are gefly's own with only naming edits.

**Deviations**

**Peer pending** for Claude-authored work merged since `3faf9c8` (PRs #4, #5, #6) and
this change; Codex CLI unavailable in this cloud session. Last recorded peer review:
Claude on Codex-authored CI work (PR #3 at `397a1b0`).

## 2026-11-01 11:38 — Select JSBSim as the dynamics engine

TODO: 1.2.3 partly decided. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

User decision (GAPS Q17): JSBSim, with LGPL-2.1 accepted as a copyleft exception
under Q5; bundled C172 data not shipped; no licence outreach. Recorded in input,
GAPS, ARCH, SBOM, AGENTS and TODO. Rendering/map/language remain proposals pending
the browser check.

**Deviations**

Treating JSBSim as a separately replaceable WASM library is an orchestrator design
note for LGPL compliance, not a user statement.

## 2026-11-01 11:18 — Review and fix the E1 study slice

TODO: 1.2.2 in progress. Agent: Claude Code orchestrator; quality, code1 and
researcher subagents.

**Implementation notes**

Integrated the [E1 candidate survey](research/2026-11-01-e1-engine-stack-candidates.md).
Local quality returned 2 medium and 5 low findings on the JSBSim study (non-JSON
stdout, mixed cost metrics, unpinned reproduction, test gaps, edge cases, doc
assumptions). code1 and the orchestrator fixed them; renewed quality review at
`4a28775` reports all seven fixed. Corrected cost: run-only 364–588×, with-I/O
238–413× real time (one recorded run of 3 repeats).

**Deviations**

Study code only; no product dynamics code, so the cross-provider peer gate does
not apply (GAPS Q15) until an engine is integrated. No validate pass yet; E1
decision (1.2.3) awaits the user's Q5 ruling on JSBSim's LGPL-2.1.

## 2026-11-01 11:11 — Run the JSBSim fixed-step E1 study

TODO: 1.2.2 started. Agent: Claude Code orchestrator; code1 subagent.

**Implementation notes**

Added `studies/e1-jsbsim/` (README with predeclared budgets, harness, tests, WASM
driver). JSBSim 1.3.3 with the bundled generic `c172x` (not the 172S): bit-identical
determinism within one build; timestep refinement 1/120 vs 1/480 s differs by
≤0.042 m altitude over 40 s (first-order convergence); ground rest and trim pass;
15–31 µs per step. An emscripten build runs repeatably under Node 22 but differs
from native at ~1e-13 relative, so replay must re-run on the same build.

**Deviations**

Measured on a cloud Intel Xeon, not the reference M1 Mac; no browser, latency or
force/torque fixtures yet. Study tests run with `python -m unittest discover -s
studies/e1-jsbsim` (11 tests with JSBSim, 6 skipped without); `utils/ci.py` does
not discover them. Not yet independently reviewed.

## 2026-11-01 11:00 — Record reference platform and paired-iPhone control

TODO: 1.2.1 refined; 1.13 added. Agent: Claude Code orchestrator; researcher and
code1 subagents running the E1 study in parallel on separate paths.

**Implementation notes**

GAPS Q16: MacBook Pro M1, current macOS, Chrome latest first (Safari second).
Added R-INPUT-3 for optional orientation control from a paired iPhone, with a
SEC threat row and CONTROLS note.

**Deviations**

Chrome desktop is Blink, not WebKit; both are recorded. Transport, pairing and
latency budget for the phone control are open.

## 2026-11-01 10:27 — Select the first 172S configuration

TODO: 1.3 in progress. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

The user accepted the researcher's proposal: Cessna 172S serials 172S9491–172S9809
with the classic panel. Recorded in a new input record, GAPS Q3, SPEC and TODO 1.3.

**Deviations**

Avionics/radio fit, flight-manual revision and FR172 sub-model remain open.

## 2026-11-01 10:11 — Verify 172S sources; FR172 still open

TODO: 1.3 in progress. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

With network access enabled, the researcher verified the 172S against EASA TCDS
IM.A.051 Issue 11 and a public copy of FAA TCDS 3A12 Rev 80, with page citations,
and recorded two small discrepancies between them. The NAV III (G1000) manual
title page puts G1000 at 172S9810 and on. The researcher proposes 172S9491–9809
as the first classic configuration.

**Deviations**

FAA DRS returned 403 to non-browser downloads; no workaround was attempted.
Current FAA 3A12 Rev 88, A18EU (FR172), 1E10 and Continental engine sheets were
not read directly. FR172 values remain unverified. Downloaded PDFs stay in the
session scratchpad, not the repository.

## 2026-11-01 10:08 — Complete EDFE source survey with operator material

TODO: 1.7 in progress. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

After the user enabled network access, the researcher retrieved the operator's
(TRIWO Egelsbach Airfield GmbH) published pilot information: runway 08/26, north
circuit standard, reporting points, frequencies and altitude limits, all cite-only.

**Deviations**

DFS AIP pages were deliberately not downloaded: DFS terms forbid automated tools
and derived works without written approval. Official AIRAC values, ARP, elevations
and circuit altitude remain open.

## 2026-11-01 07:25 — Add 172S/FR172 source survey

TODO: 1.3 started. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

Integrated the researcher's note. Leads: FAA TCDS 3A12 (172S, IO-360-L2A), A18EU
(Reims FR172E–K, several Continental IO-360 variants); no sourced classic/G1000
serial cutoff. JSBSim verified on GitHub: no 172S/FR172 model; C172 files carry
mixed LGPL/GPL and "not to be sold" terms.

**Deviations**

FAA/EASA hosts were blocked by the session network policy; no TCDS was opened and
every aircraft value is an unverified lead. No values were adopted into SPEC or data.

## 2026-11-01 07:24 — Resolve PR #4 quality/validate findings; add EDFE source survey

TODO: 1.7 started. Agent: Claude Code orchestrator; quality, validate and researcher
subagents (same provider, local).

**Implementation notes**

Local quality (needs changes) and validate (accept after fixes) reviewed `c1da267`.
Fixed: restored the 07:04 input record and moved the 07:08 follow-up to a new
record; labelled orchestrator additions to the third-party policy and the Q7/Q12
readings as interpretations; removed the unsourced FR172/172S engine/propeller
claims; propagated the 172S-first order; corrected the DCO relicensing statement
and added the Propeller-holder caveat; added an SBOM license-compatibility check;
cleared stale license/airport wording in AGENTS, CONCEPT, TRAINING, BOOT and
GAPS A9; history/strikethrough and TODO order fixes. The researcher's EDFE note
is integrated: official DFS AIP and operator hosts were unreachable, so only
OurAirports values (non-authoritative) were obtained.

**Deviations**

The fixes have not had a renewed independent review. Per GAPS Q15 this
documentation-only PR is outside the cross-provider peer scope. RESULTS.md keeps its
historical "licensing remains Q5" line unchanged.

## 2026-11-01 07:22 — Scope the cross-provider peer gate

TODO: 0.18 complete. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Per the user's direction (GAPS Q15), the peer gate applies to integrated milestones,
simulation/data/avionics/assessment code, security-relevant or agent tooling and
release candidates; documentation-only decision records, research notes and
bookkeeping do not need it. Updated SDLC, AGENTS, SPEC R-AGENT-7, agent workflow,
peer role and PR template. PR #4 is therefore outside the peer scope.

**Deviations**

The exact scope boundary is an orchestrator interpretation of the user's statement.

## 2026-11-01 07:04 — Record aircraft, license, first-exercise, airport and community answers

TODO: 0.9 complete; 0.10.2 recorded; 1.3, 1.5, 1.7 and 1.11 refined.
Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Preserved the user's answers in a new input record and GAPS. Q5 resolved:
GPL-3.0-or-later for original material (`LICENSE` added from the existing
`LICENSES/` text) and a non-proprietary, permissive-preferred third-party policy
in SBOM. Q12 resolved as deferred to roadmap phase 3. Partial answers: Q3
(Reims FR172 and/or 172S as distinct engine configurations from public FAA/EASA
documentation), Q7 (first exercise: take-off, circuit, landing) and Q10 (first
airport Frankfurt-Egelsbach, EDFE). Propagated to SPEC, ROAD, ARCH, IDEA,
CONCEPT, README, THIRD_PARTY_NOTICES and TODO.

**Deviations**

Records decisions only; no aircraft data, aerodrome data or simulator code.
The GPL-3.0-*or-later* variant and the "it fried on" reading are orchestrator
interpretations awaiting user confirmation. No independent quality/validate or
peer review was run for this documentation change.

## 2026-10-31 21:51 — Add and independently review repository-tool CI

TODO: 1.1.1 complete; parent 1.1 remains open for simulator-stack gates.
PR: [#3](https://github.com/gregoryyy/gefly/pull/3).
Agent: Codex orchestrator; geofs_research and product_refinement before parallel
code1/peer_runner, code2/peer_registration and housekeeping; independent quality
and validate, then an actual external Claude peer. Source snapshot:
`c4adb297d57e3ab77dc37879144ada84d582566c7b2e7dd645a23d903c786506`.

**Implementation notes**

Added `just ci` / `utils/ci.py` as one offline gate for scaffold checks, nonempty
tool tests and whitespace in all tracked current files, including clean
checkouts. Added pinned read-only GitHub Actions, Python 3.11/3.15 jobs and weekly
reviewed action-update proposals. E0-CI, contributor instructions, security and
source/license inventory describe acceptance and limits.

Quality found two medium inherited-Git-environment defects in fixture writes and
production file coverage. Both were fixed and independently reproduced as
resolved using disposable repositories; the suite grew from 18 to 41 tests.
Clean local checkouts invoked from unrelated directories pass on Python 3.11.12
and 3.15.2. The repaired-source hosted PR matrix passes all 41 tests on Python
3.11.17 and 3.15.1. Local validation and Claude CLI 2.1.193, reporting
claude-haiku-4-5-20251001, accepted the bounded criteria with no remaining findings.
See [RESULTS](RESULTS.md) and [peer evidence](reviews/2026-10-31-ci-peer.md).

**Deviations**

This completes the existing repository-tool slice, rather than selecting a
simulator stack. Parent 1.1 retains runtime lint/types/dependency/test work. Hosted
patches differ from local versions; action pins do not make runner/interpreter
inputs hermetic. The peer inspected recorded evidence without running commands.
No simulator, aircraft/training validation, branch protection, fork/main-push
event or updated PDF is claimed. All original aircraft/license/provider decisions
remain in their existing scope.

**Insights**

An empty working-tree diff cannot prove tracked content has valid whitespace.
Git environment variables can override a subprocess working directory, so both
the gate and its fixtures must neutralize repository/index redirection.

## 2026-10-31 17:17 — Add and exercise the independent opposite-provider peer

TODO: 0.17 complete. PR: [#2](https://github.com/gregoryyy/gefly/pull/2), following merged #1.
Agent: Codex orchestrator; product_refinement, peer_runner, peer_registration and
housekeeping on disjoint paths, then independent local quality/validate and an
actual external Claude peer. Model reported by the external CLI:
claude-haiku-4-5-20251001; CLI 2.1.193.

**Implementation notes**

BOOT/AGENTS and the active workflow now define nine roles. Peer adds Claude
quality/specification review for Codex work and the reciprocal Codex route for
Claude work. Added the canonical role, both native dispatchers, a bounded packet
router, tests and recipes, R-AGENT-7 (50 stable IDs), process/security/dependency
and PR evidence conventions. No model alias or local subagent is represented as
an external provider. Missing access/identity/evidence blocks; findings remain
separate from criterion validation and final orchestrator acceptance.

Local checks pass: 65 Markdown records, nine native Codex definitions plus a
Claude dispatcher, 18 offline tests and whitespace. Local quality's revision-
whitespace bug was fixed and rechecked. The first live Claude attempt timed out
and was not passed. A completed Claude review found only missing justfile context;
its follow-up accepted full-header/argument evidence with no findings. Actual
reports, scope, snapshots, provider/model and limitations are in the
[cross-provider record](reviews/2026-10-31-cross-provider-peer.md).

Publication recorded 2026-10-31 17:23 Europe/Berlin: rebased onto merged main, pushed
`chore/cross-provider-peer` and created draft PR #2. Source content remains the
reviewed snapshot; only bookkeeping/review-evidence files changed afterward.

**Deviations**

Cross-provider evidence covers this new peer addition, not every older roadmap
change or simulator implementation. Claude inspected packets and recorded test
outputs, without independently running commands. The reverse live Codex route and
native agent discovery were not exercised; offline routing/previews cover those
adapters. Existing configured model/authentication was used without install,
account change, permission bypass, unrequested posting or PDF generation.

**Insights**

A peer can refuse incomplete context even when code is correct; preserve both
the original concern and its resolution. Process success, reviewer recommendation
and provider/coverage acceptance are different observations. Fresh other-provider
execution is stronger than renaming a local role or choosing another model alias.

## 2026-10-31 15:49 — Add sailplane and ultralight pilot-qualification roadmap tracks

TODO: 0.16 complete; future profile contract in 1.12. PR: [#1](https://github.com/gregoryyy/gefly/pull/1), documentation refinement.
Agent: Codex orchestrator; geofs_research, product_refinement and independent quality/validate.

**Implementation notes**

Preserved the user's ROAD request and added distinct sailplane/ultralight tracks,
R-TRAIN-6, GAPS Q14, the profile-contract task, E12 coverage gates and a linked
primary-source research note. Each future profile identifies jurisdiction,
authority, full qualification/category, applicable source editions, privileges,
prerequisites, aircraft/equipment and exercises. Common infrastructure may be
reused while category-specific controls/physics and lessons need their own
reference cases and qualified review. The initial C172/EASA PPL direction stays
first; no order relative to CPL was imposed for the new tracks.

`just check` passes for 61 Markdown records/eight roles; SPEC has 49 unique IDs,
with the original 48 retained in relative order. Whitespace checks pass.
Independent quality and validation accepted documentary coverage with no findings.
The existing draft PR's title/body will be updated to describe its full controls,
briefing and qualification-roadmap scope.

**Deviations**

No sailplane/ultralight model, course or qualification eligibility is validated.
EASA sailplane SPL/Part-SFCL and German national ultralight rules are source
references, not user-selected jurisdictions/categories. Source compilation/date
and amendment-verification limits are explicit; current syllabus acceptance is a
future gate. No software-license choice, source data import or PDF build occurred.

**Insights**

Pilot-qualification profiles need full jurisdiction/category identifiers; an
acronym alone can be ambiguous. Sharing a simulator platform, maneuver or aircraft
component does not establish syllabus equivalence or training-credit transfer.

## 2026-10-31 15:43 — Resolve Mac controls and scenario-first briefing decisions

TODO: 0.10.1 and 0.15 complete. Branch: `docs/mac-controls-scenario-briefings`.
Agent: Codex orchestrator; product_refinement, independent quality and validate.

**Implementation notes**

Recorded the user's Q4/Q11 answers and hardware clarification in an immutable
input record, resolved both GAPS entries and propagated decisions into SPEC,
CONCEPT, ARCH, ROAD, TRAINING, EVAL, TODO and README. Required first input baseline:
Mac desktop keyboard/touchpad. Optional hardware: yoke/joystick and rudder pedals
only. GeoFS-inspired settings are sourced in [CONTROLS](design/CONTROLS.md);
mobile orientation remains later. Q11 accepts versioned historical/generated
scenario briefings first, evaluated at scenario time and frozen for review; the
live-data adapter remains optional later work.

`just check` passes for 59 Markdown records/eight roles; all 48 requirement IDs
remain unique and unchanged. Whitespace checks pass. Independent quality found no
issues. Validate accepted documentary coverage and requested README preserve the
word “optional”; that wording was corrected and independently rechecked. Preparing
a branch commit and draft PR; main remains at the published initial foundation.

**Deviations**

This updates requirements and design only; no controller, Mac browser, weather
feed or simulator runtime has been tested. Exact Mac/macOS/browser versions,
peripheral models, performance budgets and provider choices remain technical
foundation selections. GeoFS settings are reused conceptually from its official
instructions, without importing source code or private settings. No PDFs rebuilt.

**Insights**

A fixed first input baseline does not imply universal peripheral/browser support.
Historical/generated briefings need scenario-time validity and preserved inputs;
their usefulness does not depend on a live feed being available.

## 2026-10-31 15:33 — Publish the initial foundation to a new public GitHub repository

TODO: 0.8.1/0.8.2 complete. PR: initial bootstrap publication.
Agent: Codex orchestrator; prior bounded publication review by quality.

**Implementation notes**

Created [gregoryyy/gefly](https://github.com/gregoryyy/gefly) as a new public
repository and pushed `main`. GitHub reports PUBLIC, nonempty, default branch
`main`. `git ls-remote origin refs/heads/main` matched initial foundation commit
`2b4d76f90e1eaed2c5c3e352ef839e271135e328` after the successful push. Added `origin` and tracking for `main`.
The initial commit contains 75 source/document files, including preserved upstream
notices/license text; generated PDFs/caches are ignored. `git diff --cached --check`
passed with a targeted `.gitattributes` rule preserving the exact upstream GPL
file's original CRLF line endings. Gitleaks reported no leaks and structural
checks passed. This follow-up bootstrap record captures the observed publication;
subsequent feature development uses branches/PRs under the normal project rules.

**Deviations**

There is still no runnable simulator or selected project-wide license for original
Gefly material. Propeller-derived bootstrap files retain GPL-3.0-or-later as
recorded in THIRD_PARTY_NOTICES. No hosted application, datasets or LLM service
was deployed by creating the repository. The default whitespace check initially
flagged the verbatim upstream license's CRLF endings; the file-specific attribute
preserves that text without weakening source-file checks.

**Insights**

The public repository and initial content are now available independently of
future implementation choices. Publication is supported by GitHub visibility,
default-branch and remote-hash observations rather than an inferred push result.

## 2026-10-31 15:31 — Prepare the initial public repository publication

TODO: 0.8.1 complete; 0.8.2 publication in progress. PR: initial bootstrap.
Agent: Codex orchestrator; independent bounded review by quality.

**Implementation notes**

The user explicitly authorized a commit and push to a new public repository once
the initial content was ready. Verified GitHub authentication as `gregoryyy` and
that `gregoryyy/gefly` did not exist before creation. The completed structure and
48-requirement specification retain their prior independent reviews. The bounded
publication review found no blockers in candidate paths, input scope, provenance
or implementation claims. `just check` passes for 57 Markdown records and eight
native roles. Gitleaks 8.30.1 directory scan with full redaction reported no leaks.
Generated PDFs, stamps, caches and secrets patterns are excluded from Git.

Upstream Propeller README declares GPL-3.0-or-later. Preserved those terms for
its derived BOOT/build/PDF files, retained attribution and dated adaptations,
added [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), and copied the upstream GPL
license text byte-for-byte into `LICENSES/`. A project-wide license for original
Gefly material remains Q5. Publication target: `https://github.com/gregoryyy/gefly`;
initial default branch `main`. Actual creation/push verification follows below
when observed.

**Deviations**

No application implementation or deployment is part of publication. Initial
bootstrap publication may include its verification record in a follow-up bootstrap
commit; subsequent development uses feature branches and PRs. Sandbox authentication
initially appeared invalid; the normal local keyring worked with the required
execution permission. No credential was copied into the repository.

**Insights**

Public visibility, retained upstream licenses and a final license for original
project material are distinct records. A local secret scan and file inventory are
publication checks, not proof of simulator fidelity or complete license compliance.

## 2026-10-31 15:25 — Accept the expanded product, roadmap and architecture records

TODO: 0.11–0.14 complete. PR: none; local uncommitted refinement.
Agent: Codex orchestrator; independent quality and validate subagents.

**Implementation notes**

[Quality](reviews/2026-10-31-product-refinement-quality.md) reports no unresolved
findings. [Validation](reviews/2026-10-31-product-refinement-validation.md) accepts
documentary coverage of all 21 new themes/requirements and preservation of the
original 27 IDs (48 total). The user directions, research distinctions, proposed
sequencing and implementation decisions are linked across SPEC, CONCEPT, TRAINING,
ROAD, ARCH, EVAL and GAPS. Both reviewers independently matched the final 64-file
substantive hash `39b4e72b35672cd890a7deca86cfc5f6a5f9959c1575474945b9840d1f54f09a`. Quality's low pressure-setting wording concern
was corrected from “standard preset” to “standard-pressure setting” and rechecked.
Final `just check` passes for 55 Markdown records and eight native role definitions.
Exact review scope, evidence and limits are in [RESULTS](RESULTS.md) and the reports.

**Deviations**

The changed artifact is research and documentation. No simulator/community site,
EDDF region geometry, live data service, LLM authoring runtime or adopted flight
engine/model is claimed complete. The engine/aircraft fit, official EDDF center,
source/asset rights, exact open-source license, hosting and AI provider remain
open. Earlier bootstrap reviews and PDF builds retain their historical scope;
current document updates were checked structurally and independently reviewed,
not rebuilt as PDFs.

**Insights**

A small aircraft catalog can combine easy browser access with deeper instrument
practice. Source-backed regional experiences and reusable open dynamics are
compatible with the user direction, while community publication and AI authoring
need explicit provenance, review and reproducibility boundaries. Coverage of a
requirement in a specification is not evidence of its runtime implementation.

## 2026-10-31 15:21 — Refine GeoFS-inspired training, community and regional architecture

TODO: 0.11/0.13 complete; research/review work in 0.12/0.14 in progress. PR: none.
Agent: Codex orchestrator; subagents: geofs_research and product_refinement.

**Implementation notes**

Preserved the expanded user input and answers. Added source research on GeoFS
capabilities/community and EDDF regional data/open-engine reuse. Product added
21 stable requirements (48 total), preserving the original 27. Updated concept,
training journey, architecture, roadmap, evaluations, source/security inventory
and decision records. User chose classic instruments before glass, QNH/QFE/standard,
a free/open-source flight-school community, LLM-created regional flight experiences,
EDDF/100 NM and reuse of open physics engines/models. `just check` passed for
53 Markdown documents/eight native roles; requirement/whitespace checks passed.
The substantive pre-review snapshot has 64 files and SHA-256
`f501ccb6f4814528ff16b75a08016ce6aa1d0122cadf308275d5869ddd279347`; bookkeeping/reviews/generated files are excluded by the
same path/bytes hashing convention as the bootstrap reviews.

**Deviations**

These are documentary requirements and architecture updates, not a new simulator,
community site, generated region, LLM integration or adopted engine. Current
GeoFS instructions already document some reported features; research labels
presence/uncertainty rather than asserting product-wide absence. Community
reports are a small, versioned convenience sample. Official current EDDF ARP
coordinates and dataset/chart rights remain unresolved; no guessed center or
restricted chart pack was accepted. Exact license/provider/hosting choices remain
open. Previous bootstrap reviews/PDF smoke builds describe their old snapshot;
updated documents have not been rebuilt as PDFs in this task.

**Insights**

The comparison is about usable cockpit/training depth, not a list of supposedly
absent navigation features. Generated maps may render real data; fictional facts
must stay distinct. Open-engine reuse reduces duplicated work but does not certify
an aircraft model. LLM authoring needs sourced assets and validated scenario state.

## 2026-10-31 15:07 — Accept the project structure and agent workflow

TODO: 0.7 complete; 0.8 local setup complete. PR: none. Agent: Codex orchestrator;
independent subagents: quality and validate. Earlier creation used researcher,
product and housekeeping. No code1/code2 simulator implementation was run.

**Implementation notes**

[Quality](reviews/bootstrap-quality.md) found no blocking defects.
[Validate](reviews/bootstrap-validation.md) accepted the nine foundation criteria
and the documented fidelity progression, leaving future simulator criteria not
evaluated. Both reviewed the same 58-file substantive snapshot; its hash and
actual checks are in their reports and [RESULTS](RESULTS.md). Validation requested
explicit test observations in this log; those were added and rechecked. Final
`just check` passes for 47 Markdown documents and eight native role definitions.
Two representative PDF smoke builds and their four-page visual review passed;
incremental reuse and the missing-browser failure path behaved as documented.

**Deviations**

This is a local uncommitted scaffold on `bootstrap/project-foundation`, with no
remote, selected source license or runnable simulator. Exact aircraft fit, target
controls/device, first exercise and stack decisions remain open in GAPS. Full
PDF batch, optional rendering paths and live agent discovery remain untested.

**Insights**

The requested workflow is concrete and reviewable: canonical prompts, native
registrations, dispatch/return contracts, parallel implementation/housekeeping
ownership and distinct independent review gates. Static configuration and a
project specification establish a foundation, not validated aircraft behavior.

## 2026-10-31 15:05 — Verify local checks, document builds and Git setup

TODO: 0.7 verification portion; 0.8 local Git setup. PR: none; no remote or commits.
Agent: Codex orchestrator. Independent quality and validate reviews are in progress.

**Implementation notes**

`just check` passed for 45 Markdown documents and eight native agent definitions.
`just reqs` listed 27 requirements. Recipe parsing/source discovery passed. Built
`docs/IDEA.md.pdf` (one A4 page) and `docs/agents/README.md.pdf` (three A4 pages),
rendered and visually inspected all four pages with no observed clipping/overlap.
Repeating both builds reported `up to date`. A deliberately missing CHROME path
failed with exit 2 and actionable guidance. Ignore checks cover generated output,
stamps and secrets while preserving `.env.example`. Initialized Git and switched
to `bootstrap/project-foundation`; no commits or remotes. Exact commands,
environment and limitations are in [RESULTS](RESULTS.md).

**Deviations**

Sandboxed Chrome startup and Git metadata creation initially failed; retries with
the required local execution permissions succeeded. Pandoc reports an inherited
`--mathml` deprecation warning but produces PDFs. Only two representative PDFs
were built; full batch, Mermaid and LaTeX paths were not evaluated. Live native
agent discovery, aircraft physics, avionics and training outcomes remain untested.
No dependencies were installed and no source license or remote was selected.

**Insights**

Document/check tooling is usable independently of the future runtime stack.
Structural agent configuration checks establish parsed definitions and references,
not live discovery or operating-system permission enforcement. Independent reviews
must assess the completed scaffold without treating future simulator criteria as
already satisfied.

## 2026-10-31 15:02 — Establish the Gefly foundation

TODO: 0.1–0.6. PR: none; local bootstrap, remote undecided (GAPS Q6).
Agent: Codex; model/reasoning configuration not independently recorded. Subagents:
researcher, product and housekeeping, with disjoint file ownership.

**Implementation notes**

Preserved the original brief and user answers. Imported and adapted BOOT with
source hash and upstream-example boundaries. Created the initial product,
architecture, security, evaluation, process, plan and dependency records. Added
eight canonical role prompts and native Codex TOML registrations, parallel coding
and housekeeping ownership, separate quality and specification-validation gates,
source research and check/document recipes. User selected C172, EASA PPL first,
web application similar to GeoFS. Runtime directories contain scope notes.

**Deviations**

Source license, remote and actual simulator implementation are not selected or
completed. Propeller-specific trackers/hooks and native Claude agent wrappers are
optional source examples, not installed features. A dedicated deep research skill
was unavailable; researcher disclosed focused multi-source primary research.
Scaffold checks and document-build observations are recorded after execution.

**Insights**

Existing browser simulation and progressive lessons mean the proposed advantage
must be evaluated. Aircraft family identity is insufficient for real controls,
avionics and physics: exact configuration, applicable sources and independent
reference cases are required. Source survey is not aircraft validation.
