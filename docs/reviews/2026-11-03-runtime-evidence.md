# Runtime evidence: engine build and native/browser suites at b3a7538

Recorded 2026-11-03 07:31–08:18 Europe/Berlin (execution clock) by a Claude Code
subagent (claude-opus-5-5) working for the Claude orchestrator. The orchestrator
asked for this record to answer the blocked rows in the
[Claude peer review of Codex PRs #39–#50](2026-11-03-codex-prs-39-50-peer.md)
([JSON](2026-11-03-codex-prs-39-50-peer.json)). Machine-readable results:
[2026-11-03-runtime-evidence.json](2026-11-03-runtime-evidence.json).

**Scope and limits.** This is a **headless Linux run with software WebGL
(SwiftShader)**. It is **not** the reference Mac platform and is **not**
reference-platform acceptance. The code revision is main `b3a7538`. The parallel
fixes started after the peer review are not included. The checkout HEAD
`facbfbb` differs from `b3a7538` only in `docs/DONE.md`, `docs/TODO.md` and
`docs/reviews/*`. A failed or unreached check here is not a pass. A suite that
failed on this platform is also not proof of a product defect. This record gives
no simulator-fidelity, aircraft, training or milestone acceptance.

## Environment

| Item | Value |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS, Linux 6.18.44 x86_64, 4 CPUs, 15 GiB RAM, no GPU |
| Node / npm install | v24.22.1 (`/opt/node24`); `npm ci --ignore-scripts` exit 0, 0 vulnerabilities |
| Python | 3.13.18; scratch venv with `jsbsim==1.3.3`, `numpy==2.5.4` from `studies/e1-jsbsim/requirements.txt --require-hashes` |
| Playwright | 1.64.1 (app lockfile); the suites use `channel: 'chrome'` |
| Browser | Google Chrome for Testing 153.0.8010.12, **headless** (`HeadlessChrome/153.0.0.0` UA) |
| WebGL | WebGL 2.0. Renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`: **CPU software rendering** |
| Build tools | emsdk 6.0.13, cmake 3.28.3, g++ 13.3.0 |
| Network | Agent HTTPS proxy with CA bundle `/root/.ccr/ca-bundle.crt`; TLS verification on |

## 1. Engine build: pass

`just` is not installed. The `build-flight-engine` recipe was therefore run directly:

```text
bash studies/e1-browser/sim/build.sh /tmp/claude-0/…/scratchpad/e1work   # exit 0, 2 min 5 s
```

| Record | Value |
| --- | --- |
| emsdk tool commit | `d7b4130688bfa348392b921ab04015aa15c4f154` (pinned), SDK 6.0.13 |
| emcc | `6.0.13 (e13ee988ce3d87a738dd8f3661d02223308c412a)` |
| JSBSim | `v1.3.3`, commit `66f7fafc07fe13e7ede9db20873030fed2881713` (checked by the script) |
| Flags | `-O2 -fwasm-exceptions` |
| `dist/jsbsim.wasm` | 1752475 bytes, SHA-256 `50b7c373bc634ddfb75bbd8570b2da8e4404eefe6ab7b20d72e8053bd1354c07` |
| `dist/jsbsim.mjs` | SHA-256 `97f2c4c2bb4454b00300fbcd9320f2315f11317d0cf3f007ea3b12294ffb7855` |
| `dist/build-info.json` | SHA-256 `741347bf02234b3b06b6da83a926239d1e926aabed8eebfcabc27261c91d946b` |
| Aircraft adapter | `gefly-c172x-mixture-pitch-ap-v2`; script `5f9dcf09…7485`; source c172x `b736f4b7…1840` → prepared `f0dad1b5…9219`; AP source `1e83fec3…e570` → prepared `e128be76…bd9c` |

The full adapter hashes are in the JSON file. The WASM hash differs from the
2026-11-01 E1 results (`ec4a73ec…78a4`). The bridge has changed since then, so a
different hash is expected. Reproducibility of this hash on another host was
not tested.

## 2. Native and engine tests without a browser: all pass

| Command (cwd) | Exit | Result |
| --- | --- | --- |
| `npm test` (`app`) | 0 | node:test **202/202 pass**, 0 fail, 0 skipped; `prepare-aircraft.test.py` 6 OK |
| `python -m unittest -v test_harness` (`studies/e1-jsbsim`, native JSBSim 1.3.3 wheel) | 0 | **23/23 OK, 0 skipped** (the gate skips 9 of these because it has no `jsbsim`) |
| `node tests/landing-physics.mjs` (`app`) | 0 | 8 checks pass |
| `node ../studies/e1-browser/sim/autopilot-native.mjs` | 0 | `"result":"pass"` |
| `node ../studies/e1-browser/sim/kap140-worker.mjs` | 0 | `"result":"pass"`, 8 checks |
| `node ../studies/e1-browser/sim/navigation-worker.mjs` | 0 | `"result":"pass"` |
| `node studies/e1-browser/sim/terrain-native.mjs` | 0 | `"result":"pass"`, 3 checks |
| `g++ -std=c++17 -Wall terrain-grid.test.cpp && ./a.out` | 0 | `PASS terrain triangular interpolation, cell gradients, ECEF normals, boundaries and malformed grids` |

These runs exercise the WASM build in Node, the native wheel and the C++ grid.
They do not use a browser. Key raw lines:

```text
landing-physics: all 8 runs finite | all 8 repeat exactly including dynamics digest and telemetry |
  higher initial sink yields higher early peak strut load | sideways yields larger early wheel slip |
  banked right wheel contacts before left and more bank than baseline |
  rudder/steering rollout direction consistent | invalid preset codes rejected |
  14-double original dynamics state retained
  steering: rudder_norm -0.35 -> heading_change_rad +0.0271; 0 -> -0.0013; +0.35 -> -0.0298
autopilot-native: {"result":"pass","terrain_hold_m":1193.88,"vs_climb_m":29.38,
  "capture_change_m":-10.10,"altitude_after_90s_m":1233.36}
kap140-worker: held applied raw override rejects KAP and legacy engagement ... |
  actual fixed-step climb generates altitude-alert state/event; paused BARO creates no historical
  tone or physics movement | actual native VOR intercept arms, captures and converges inside the
  CDI band within 180 simulated seconds   (8 checks)
navigation-worker: station IFCW, initial_cdi 0.224 -> after_10s 0.152, initial_gs 0.143 -> -0.067,
  navdata rhein-main-nav810-2013-10-v1 sha256 762c93b3…e1d1 historical:true
terrain-native: copied physical-height plateau initializes CG 123m / AGL 3m and native wheel contacts
  support it | outside initialization fails closed; boundary failure commits no state, digest or step
  and never falls back to flat ground | clearing terrain restores the prior 240-step flat-fixture
  digest exactly  (wasm_sha256 50b7c373…4c07, boundary_step 585)
e1-jsbsim: Ran 23 tests in 3.707s  OK
```

During `test_child_process_and_reset_identical`, the e1-jsbsim run printed
`ERROR: unable to open the file /tmp/e1-jsbsim-out-…csv => Output to this file is
disabled.` The test still passed. This message is JSBSim's own output notice.

## 3. Actual-browser suites (`test:browser`): 2 pass, 24 fail

`npm run test:browser` chains its 30 commands with `&&`, so it stops at the first
failure (`smoke.mjs`). To record every suite, each command was run separately
from `app/`, in script order, with `PATH=/opt/node24/bin:$PATH` and a 1200 s cap.
Four of the 30 commands are Node-only and are listed in section 2. Of the 26
browser suites, **2 pass and 24 fail**. Counting `landing-physics` and the three
native-worker scripts, the whole script gives **6 pass / 24 fail**.

| Suite | Exit | Time | Failure (first error, location) |
| --- | --- | --- | --- |
| `kap140-panel.browser.mjs` | 0 | 8 s | pass, 8 checks |
| `regional-nav.browser.mjs` | 0 | 8 s | pass: "standby and swap on both receivers, LOC/GS/bearing flags and read-only Review passed" |
| `smoke.mjs` | 1 | 94 s | click timeout 30 s, `smoke.mjs:69` (`#view-menu > summary`) |
| `classic-smoke.mjs` | 1 | 65 s | click timeout, `flight-actions.mjs:4` (`#start`) |
| `engine-smoke.mjs` | 1 | 198 s | click timeout, `flight-actions.mjs:4` via `engine-smoke.mjs:122` |
| `kap140-flight.browser.mjs` | 1 | 71 s | click timeout, `:74` (`#ap-engage`) |
| `fuel-gauge.browser.mjs` | 1 | 134 s | click timeout, `:54` |
| `fov-smoke.mjs` | 1 | 344 s | `page.screenshot` timeout 30 s, `:94` |
| `pitch-trim.browser.mjs` | 1 | 77 s | click timeout, `flight-actions.mjs:4` |
| `pointer-yoke.browser.mjs` | 1 | 257 s | click timeout, `flight-actions.mjs:4` |
| `avionics-smoke.mjs` | 1 | 45 s | **AssertionError** `:113`: `#nav1-gauge .nav-gs-inop` not visible |
| `navigation-input.browser.mjs` | 1 | 119 s | click timeout, `:80` |
| `navigation-aux.browser.mjs` | 1 | 88 s | click timeout, `flight-actions.mjs:4` |
| `regional-nav-flight.browser.mjs` | 1 | 93 s | click timeout, `:26` |
| `forward-marker-smoke.mjs` | 1 | 176 s | `locator.evaluate` timeout, `:42` |
| `aircraft-shadow.browser.mjs` | 1 | 59 s | click timeout, `:45` |
| `review-controls.browser.mjs` | 1 | 93 s | click timeout, `:76` |
| `panel-layout.browser.mjs` | 1 | 123 s | click timeout, `:86` |
| `flight-data.browser.mjs` | 1 | 61 s | click timeout, `:64` |
| `handbook.browser.mjs` | 1 | 60 s | click timeout, `:54` |
| `stall-awareness.browser.mjs` | 1 | 63 s | click timeout, `:72` |
| `engine-audio.browser.mjs` | 1 | 52 s | click timeout, `:93` |
| `ground-collision.browser.mjs` | 1 | 85 s | click timeout, `:85` (`restart`) |
| `ground-braking.browser.mjs` | 1 | 42 s | click timeout, `:147` |
| `terrain-renderer.browser.mjs` | 1 | 70 s | `Actual Cesium terrain mesh did not settle`, `"tilesLoaded":false`, `"levels":[4,4,4]`, `:49` |
| `public-terrain.browser.mjs` | 1 | 45 s | click timeout, `:64` |

**Likely cause of the timeouts.** This is a diagnosis, not a proven cause.
Playwright reports the target element as "visible, enabled and stable", but
"performing click action" never finishes. A separate diagnostic probe loaded the
full Cesium scene at 1440×900. The probe started the flight with an untrusted
programmatic click, which is valid for diagnosis only. It measured
`requestAnimationFrame`:

```text
paused 5 s: 5 frames, max gap 1467 ms | flying 10 s: 6 frames in 11455 ms, max gap 2667 ms |
one page.screenshot: 12373 ms
```

The scene runs at about 0.5–1 frame/s under SwiftShader. Trusted input and
screenshots wait for rendering frames, so the suites' 30 s action timeouts are
plausibly exhausted by the renderer. On this platform, the 22 timeouts therefore
neither pass nor fail the behavior they test. They are **not evaluated**. The
`terrain-renderer` failure has a similar plausible cause: Cesium tiles were still
loading.

**Failure that needs triage.** The `avionics-smoke.mjs:113` failure is a value
assertion, not a timeout: the NAV1 glide-slope INOP marker is not visible. It may
be a product regression or a stale test after the PR #49/#50 GS-needle changes.
This record does not decide which. The failure goes to the coders.

**Partial runtime observations before a failure.** These are not suite passes.
`smoke.mjs` reached line 68 before it failed. Up to that line: the page loaded on
the local dev server; `#start` became enabled; the status was `Paused` until the
trusted Start click; the status then became `Flying` with more than 5 worker
states; the initial state had `step > 0` and TAS between 40 and 55 m/s.
`engine-smoke.mjs` recorded one check ("engine telemetry, display units and
explicit roll-offset wording"). Its trusted `E` key toggled `#engine-switch`
while paused, and the paused step did not advance before its failing resume
click.

## 4. Effect on the peer review's blocked rows

The criterion text below is quoted in shortened form from the review JSON
(`packets[].external_report.review.validation[]`). This record does not change
any row's status. Re-adjudication belongs to independent reviewers. Evidence
named "supplied" is now available to them. Rows not listed under (a) or (b)
remain blocked as reviewed.

**(a) Evidence now supplied: native/worker-side execution**

- `r30` **B4** "recorded browser smoke / real-JSBSim run evidence". Supplied:
  the real JSBSim build record (pinned commits and hashes) and passing
  Node/WASM runs. Still missing: a passing browser smoke run.
- `p44-controls` "2.0.12 / R-SIM-5: four explicit flat-ground presets…" and
  "2.0.12: nosewheel steering routed consistently with rudder". Supplied: the
  recorded `landing-physics.mjs` output (8 checks, steering table above). The
  UI preset selection is not covered.
- `p44-controls` "2.0.12: structure-contact indication". Not supplied: the
  script still asserts no structure mask, as the review noted.
- `p50-terrain` "R-WORLD-2 / 2.0.32: JSBSim uses physical DHHN2016 heights in an
  immutable, preloaded native callback…" and "R-WORLD-2 / R-SIM-8: coverage
  exits fail closed in the worker/native step". Supplied: the recorded
  `terrain-native.mjs` and `terrain-grid.test.cpp` output. The worker half and
  the `public-terrain.browser.mjs` half are not covered, because that suite
  failed with a timeout.
- `p50-kap` "2.0.40 / R-AP-1: native controllers reuse pinned generic JSBSim
  gains with MSL/VS wiring…". Supplied: the `autopilot-native.mjs` and
  `kap140-worker.mjs` passes. `p50-kap` "2.0.40: independent 25-group browser
  validation and native-worker checks…": the native-worker half is supplied;
  `kap140-flight.browser.mjs` failed with a timeout.
- `p49-code` "2.0.41 / R-NAV-4: native-worker evidence and independent
  actual-browser validation (APR/GS capture…)". Supplied: the native-worker
  half (`navigation-worker.mjs`, `kap140-worker.mjs` VOR intercept).
  `regional-nav-flight.browser.mjs` failed with a timeout.
- `p43-app`/`p43-sim` 2.0.7 mixture and AP rows. Supplied: execution of the
  build with adapter `gefly-c172x-mixture-pitch-ap-v2` and the "build-info
  hashes" the review asked for. The browser halves are not covered.

**(b) Evidence now supplied: actual-browser suites that passed**

- `p50-radio` "2.0.42 / R-NAV-4, R-REVIEW-1: preserve standby/swap and read-only
  Review", `p49-code` "2.0.41 / R-NAV-4 + R-REVIEW-1: paused tuning and read-only
  recorded Review…" and `p44-nav` "2.0.13 / R-INPUT-1: radio box UI tuning, swap…".
  Supplied: the `regional-nav.browser.mjs` pass, for the swap/standby/Review
  part only. `avionics-smoke.mjs`, the suite named by the `p44-nav` row,
  **failed** with an assertion (see above).
- `p50-kap` "2.0.40 / R-REVIEW-1: immutable recorded Review of KAP state".
  Supplied: the `kap140-panel.browser.mjs` pass, for the panel-side Review
  release/disable checks only. Five-tone audio events are not covered.

**(c) Still blocked: no passing runtime evidence from this run**

- All scene, GPU, layout, pointer, audio and Review-playback rows whose suites
  failed with timeouts here. Examples:
  - p39-app: 2.0.1 hold buttons/stick; Cesium scene/imagery; 2.0.2; 2.0.3.
  - p40: 2.0.4.
  - p43-app: 2.0.5 actual-browser validation.
  - p44-core: pointer-yoke and 2.0.22 panel rows.
  - p44-controls: 2.0.10, 2.0.16 and 2.0.18.
  - p44-nav: 2.0.15.
  - p44-review: 2.0.19, 2.0.20, 2.0.23, 2.0.24 and 2.0.25.
  - p45: 2.0.27.
  - p46-collision: 2.0.28 and 2.0.31.
  - p46-engine: 2.0.29 and 2.0.30.
  - p50-terrain: GPU mesh and Taunus flight.
  - p50-input: 2.0.35 and 2.0.38.
  - p50-imagery: 2.0.33.
  - css: 2.0.22 height below 449 px, and column alignment.
  - r30: B3 controllable flight, missing runtime and missing WebGL. The smoke
    run failed before the missing-engine (`smoke.mjs:236`) and no-WebGL
    (`smoke.mjs:239`) blocks.
- All rows blocked for missing packet content, source excerpts, licences or
  withheld review files. Runtime evidence cannot address these. Examples: the
  docs-packet (1)/(4)/(5) rows, R-DATA-1 provenance, M2 lockfile and p50-imagery
  `compile.py --verify`, which this run did not execute.

## Next step to unblock the browser rows

Run the same commands on the reference Mac with a hardware GPU and Chrome. The
alternative is a Linux host with GPU-backed WebGL. Keep the raw output. Triage
`avionics-smoke.mjs:113` first, because that failure does not depend on the
platform. Increasing timeouts or forcing clicks would change the test contract,
so that is a decision for the test owners.
