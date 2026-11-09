# Flap-effectiveness diagnostic: independent quality and validation

Reviewed 2026-11-06 13:45 Europe/Berlin by Codex agent
`/root/world_airport_client`, at the orchestrator's explicit independent-review
assignment. This reviewer authored the separate settings work, not the flap
diagnostic. Scope: Task2.0.172, R-SIM-5/R-AIR-2/R-FID-3, diagnostic only. No
implementation, model or coefficient was edited in this review.

## Current renewed outcome — 2026-11-06 13:50

**Quality: no blocking findings in the bounded diagnostic.** Q1–Q3 below are
resolved in the current checker/tests, and all three original mutations were
independently rerun against the actual observations and rejected. This reviewer
changed no implementation files. Initial findings and their original evidence
remain in the historical sections below.

**Separate validation: the declared software diagnostic passes.** This accepts
command/actuator connectivity, matched generic-model comparisons, explicit units,
source-subset arithmetic and admission integrity. It does not accept the full
R-SIM-5/R-AIR-2/R-FID-3 requirements, selected-C172S behavior, aircraft-specific
flap magnitude, stall-speed or steady-glide fidelity.

| Current artifact | SHA-256 |
| --- | --- |
| Repaired checker | `81de366344b8b5d59ec94fb10f25f9e6f5fbb551aed0cbb4a7f98c0741419096` |
| Repaired checker tests | `68f4fe43c341f4bffe706245034080cd24e1a1f318e62aea51267f3b1d3e9613` |
| [ROOT compact measurements](2026-11-06-flap-effectiveness-root-runtime.json) | `0b0b4b6f9a2985a05589ae34d9ff37f92c534962e1f130623e022408f1e39805` |
| [Publication replay record](2026-11-06-flap-effectiveness-publication-runtime.json) | `7fbf696b0f1700745ae2482156a948d3ec425532f93eeba30350f5bb96575839` |
| [Completed research](../research/2026-11-06-flap-effectiveness.md) | `d766dc35046ffeec4a61ce38933786aa57d5e9018fe0c691e035b4158e7739ff` |
| ROOT package registration | `62e6a65f19740077158ffbcad2fa95ebe1a5dac66c978902c1bd301476fe36aa` |
| Publication package registration | `60804fb5cbe326dc8e7b6717f3081beadeb4c3fafaf496804c444824af3eeb99` |

Native/source diagnostic and arithmetic-test hashes are unchanged from the
initial table. The current checker/tests match the publication checkout
`/private/tmp/gefly-flap-effectiveness` byte-for-byte. The versioned ROOT compact
record is byte-identical to the regenerated summary in ignored output.

| Renewed criterion | Expected versus independently observed | Outcome |
| --- | --- | --- |
| Q1 configuration identity | Exact complete case object must agree with identifier; flap10→clean substitution and CAS/profile/duration edits now reject | **Pass** |
| Q2 source timing | Six exact legs require2/1/1/1/1/2s and the audited traverse requires0/2/1/1s; wrong-but-equal100s values now reject | **Pass** |
| Q3 observation time | Finite nonnegative times must be on the1/120s grid, inside observed/final duration and unique/sorted by step; originalInfinity mutation and added malformed-time fixtures reject | **Pass** |
| Current actual evidence | Repaired admission accepts both ROOT and publication32-case artifacts without altering observations | **Pass** |
| Publication replay comparison | Independently compared every parsed value after removing only native `generated_at` and source `mutable_prepared_excluded_sha256` | **Pass:** all other values equal; numerical/model/source pins are identical |
| Runtime component provenance | Native, bridge, adapter, reconstructed XML and source audit remain pinned; mutable working XML is excluded | **Pass for inspected artifacts** |
| Units, controllers and source coefficients | CAS/units, manual versus VS0 versus lateral-only contexts, static-subset versus native-force distinction remain as inspected initially | **Pass for this diagnostic** |
| Test registration | Publication `npm test` adds exactly the new Node prefix and Python suffix to its base script; existing commands preserved; optional command runs source audit→native→admission | **Pass, source inspection:** actual10Node+3Python targeted tests pass |
| Completed research claims | Labels generic1982C172P, compares transient effects, explains AP compensation/body-Z sign and explicitly excludes real adequacy/stall/steady glide | **Pass, source/artifact comparison** |
| Historical threshold preregistration; aircraft acceptance | No new evidence establishes a frozen real-aircraft tolerance plan or applicable calibrated reference cases | **Not evaluated**, not inferred from this diagnostic pass |

The publication native raw artifact is
`df6b527ec5eafdd85bded61bfd529ade4a1c39ade74336bd36a2428e061b4364`;
its source audit is
`6037623ad6c3457945a0ec463391702517942ea49f10176205ebcaca02cea1fe`.
Its regenerated summary is
`0481bf62c5bfd4176a2369c115cfba122a8ad7000b04c65db103e74208e5766b`.
The orchestrator executed the separate publication replay; this reviewer
independently checked its artifacts, equality exceptions and repaired admission,
without rerunning the full native32-case loop. This is not cross-provider review,
whole-repository CI, publication-commit acceptance or training validation.

## Historical initial snapshot and evidence — 2026-11-06 13:45

| Artifact | SHA-256 |
| --- | --- |
| `flap-effectiveness-native.mjs` | `297492a6071d3924ed45b5a56ae79f276fa3dc963281f124cacdc01299609096` |
| `flap-effectiveness-source.py` | `4e260eeea6485acd2ad2b8ecbfffa42e52dcbce19d94600c0d9d13ed50dc10df` |
| `flap-effectiveness-checks.mjs` | `ab40386ee15c4f08fc69aadd69a1083caf4b39cd3e0947cbd148cee85f5bfd8e` |
| `flap-effectiveness-checks.test.mjs` | `b03bb8986cb3f2cc80e08e06593446b85e260fd82b80983c3b51c7657f7c7e8b` |
| `flap-effectiveness-source.test.py` | `5861c4c33c3b301f2e2441d720b44cf46c4da509806babd94e20a1cefb698d7e` |
| Native observations, `output/flight/flap-effectiveness/native.json` | `d1841ec4690599f7650e239f08c11295d7958ae1e49f67eb1d35719ebe306fe3` |
| Source audit, `output/flight/flap-effectiveness/source.json` | `b217e5abaac3284318a213778a2ed4fa230ad5d1dc87c432dfff1deabf89dc0e` |
| Compact summary | `2499389bbc390034f2a2eba68a424dec3c5a259d79e5c0436acabe5d807b51fe` |
| Independently reconstructed executing XML | `cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595` |

Source paths are under `studies/e1-browser/sim/` unless stated otherwise. The
initial local source-research draft (superseded by the
[completed research](../research/2026-11-06-flap-effectiveness.md)), actual bridge ABI and reconstructed XML were inspected. Every file listed in the native
artifact's `source_hashes` was independently hashed and matched the current file,
including installed WASM `266f2016…` and its build record. The mutable prepared
working XML is correctly excluded as an executing-model identity.

## Historical initial quality findings

Outcome at this snapshot: **needs changes in evidence admission**. The inspected
actual observations support a connected, measurable model response; the following
reproductions concern what the checker can incorrectly admit as equivalent
evidence. They do not demonstrate a fault in the current aircraft binary.

### Q1 — Medium: matrix labels are not bound to executed configuration

At `flap-effectiveness-checks.mjs:33`, only `config.id` is checked against the
32-case matrix. The destructured `cas_kt`, `profile`, `flap_deg` and `duration_s`
at line42 are not independently matched to that identity.

Reproduction against the actual artifacts: take
`75cas-manual-trim-flap10`, set `config.flap_deg=0`, then set every sample's
`flap_command_norm` and `flap_actual_deg` to0. The checker admits the changed row
under its unchanged flap10 label. Its positive-effect condition is bypassed
because the actual configuration field is now0.

Expected: exactly bind all configuration fields and duration to each declared
case; reject a clean command substituted for any nonzero-flap case. Add a
negative fixture that keeps the matrix label intact.

### Q2 — Medium: a consistently incorrect actuator time is accepted

At `flap-effectiveness-checks.mjs:35`, the checker compares `reached_s` to the
reported `duration_s`, without tying either value to the source traverse.

Reproduction: change the first actuator row's `duration_s` and `reached_s` to100.
The checker admits it, despite the pinned source's0→10-degree segment taking2s.
The existing negative fixture changes only `reached_s`, so does not exercise
this consistently incorrect expectation.

Expected: verify2/1/1/1/1/2s for the declared six legs, preferably against the
audited traverse, and reject wrong-but-equal reported/reached durations.

### Q3 — Medium: sample times need finite, step and duration validation

At `flap-effectiveness-checks.mjs:49`, time uniqueness and increasing order do
not establish finite values, the1/120s grid or the declared diagnostic interval.

Reproduction: append a copy of the clean60kt row's last sample with
`tau_s=Infinity`. The actual-artifact checker still admits it. Numeric flight
fields remain finite, but the observation's independent variable is invalid.

Expected: require finite nonnegative sample times on the fixed-step grid and
inside both the declared duration and observed final interval. Retain mandatory
early-time coverage and reject invalid/inconsistent final records.

## Historical initial specification validation

| Criterion | Expected | Observed and outcome |
| --- | --- | --- |
| Executing model provenance | Source/adapter reconstruction matches installed binary metadata | **Pass, inspected evidence:** exact XML hash reconstructed independently; all native source-file hashes match. This is not a fresh native rebuild. |
| Fixed-step units and speed reference |1/120s integration; explicit degrees/radians, m/s, knots and CAS | **Pass, source/evidence inspection:** bridge exposes CAS in m/s; diagnostic uses1852/3600 and radians conversion consistently. It labels ideal CAS, not calibrated installed IAS. |
| Comparable cases | Same clean initialization/loading/history within each comparison; complete32-case output | **Pass for existing observations:** exact starting state vectors match across flaps/profiles for a speed; initial loading is2400lb with legacy outboard load zero. **Fail for general admission:** Q1 permits a mislabeled configuration. |
| Command and actuator path | Command changes without paused integration; actual flaps reach0/10/20/30 degrees with declared timing | **Pass for existing observations:**39 native command checks are asserted by the harness; actual six legs reach2/1/1/1/1/2s with maximum position error about1.4e-13degree. **Fail for general admission:** Q2. Paused native calls were inspected, not independently re-executed here. |
| Finite bounded observation interval | Finite telemetry and valid time grid/window | **Pass for existing inspected observations; fail for general admission:** Q3. |
| Model flap effects | Nonzero model response above declared numerical detectability guards | **Pass for existing observations:** all24 nonzero-flap manual/VS/idle cases have an early change relative to their matched clean case. At nominal75CAS, manual flap10 differs at4s by−4.20ktCAS,+4.97degrees pitch,+3.69m/s climb. These are transients, not aircraft calibration. |
| AP confounding separated | Manual and controller-compensated results are not combined as one physical comparison | **Pass, source/evidence inspection:** manual disables both generic AP channels; VS0 uses lateral/vertical servos; idle uses lateral only. Measured actual elevator differences show compensation. No installed KAP140 response acceptance follows. |
| Static source arithmetic labelled accurately | Actual source tables/axes; distinguish subset coefficients from native forces and net pitch | **Pass:** alpha-degrees table lookup is multiplied by alpha-radians; legacy lift/drag tables use their declared axes.16 static points are reproduced independently. CL/CD are explicitly subsets at beta0/ground-effect1; direct negative CmDf is not asserted to predict the net attitude response. |
| Numerical guards versus aircraft tolerances | Detectability is not a real-aircraft performance band | **Pass for stated scope:**1e-6g and1e-5degree/kt guards are numerical admission choices only. A separately timestamped preregistration before observation was **not evaluated**; no aircraft conclusion depends on a preregistration claim. |
| Stall-speed or steady-glide fidelity | Applicable reference cases/conditions and stabilized comparisons | **Not evaluated:** no case triggers native stall warning; idle final CAS differs between flap settings. The current results do not establish flap-down stall speeds, steady glide ratios or that the real C172P/S effect magnitude is sufficient. |
| No coefficient/runtime repair | Diagnosis does not silently retune the aircraft | **Pass for reviewed diagnostic slice:** tools read the existing installed model and create ignored observations; no model/bridge change is part of this slice. |

## Historical initial checks and limitations

- `PATH=/Users/gregor/.pyenv/versions/3.11.12/bin:$PATH python3 studies/e1-browser/sim/flap-effectiveness-source.test.py`:3 arithmetic tests pass.
- `node --test studies/e1-browser/sim/flap-effectiveness-checks.test.mjs`:7 admission tests pass, but omit Q1–Q3.
- Independently executed `reconstruct()` and `audit()` without writing model data:
  exact executing XML hash and16 static source points reproduced. At5degrees alpha,
  the selected lift subset is1.1082423886 clean and1.4444957391 at30degrees flap.
- Independently hashed artifacts/source and ran actual-artifact admission plus
  the three mutations above; all three incorrect variants were admitted.

The bridge's pilot-normal specific-force body-Z telemetry is near−1g in the clean
flight. The admission uses absolute changes; it must not be described as a direct
positive native lift measurement. All32 inspected trajectories reach their
declared30/120s durations. The single exact native repeat is evidence for that
one case, not universal determinism or an independent32-case rerun.

No full native diagnostic, browser flap flight, aircraft-specific reference
calibration, global CI, publication revision or cross-provider review was run by
this reviewer. Renew affected findings and outcomes after changes; do not treat
this initial report as acceptance of repaired or ported files.
