# Control-stability independent quality review

2026-11-05, Europe/Berlin. Independent Codex quality reviewer, not an
implementation author. Actual Claude cross-provider review returned blocked;
renewed peer acceptance remains partial/pending.

## Artifact and outcome

No blocking implementation finding for the bounded configuration/input repair.
Reviewed isolated branch `fix/control-stability`, production revision `e826d19`
against `700dd5386125f9864a391f85b277cb71da55290a`, plus documentation-only
revision `214e2891aaf0438e4216dceefa4d898ccfa16d19`.
Affected renewal reviewed at `7512d608c86784bf8e67ca77ab8f99ae9ba1e2b8`:
diagnostic coverage/assertions, explanatory UI text/comment, SPEC diagnostic
wording and supplemental comparison only. Runtime loading and control mapping
are functionally unchanged.

The repair removes two inappropriate fresh-flight defaults together: an external
80 lb load located 12 ft right, and a constant −0.109375 aileron command. The
unvalidated fixed aileron/rudder link becomes opt-in. It does not establish stable
hands-off flight, corrected high-speed equilibrium or calibrated C172 handling.

## Source findings

No critical, high or medium code defect was established.

- [Loading](../../studies/e1-browser/sim/loading.js) introduces a separate frozen
  `FLIGHT_DEFAULT_LOADING`; only `external_kg` changes. Historical
  `DEFAULT_LOADING`, station metadata, explicit user configuration and recorded
  loading remain intact. Worker initialization configures the load before native
  initialization/trim. Continuation selects recorded loading first; old recordings
  without the group retain the previous native source fallback. An explicit null,
  malformed or nonfinite loading object still fails validation rather than
  silently using the new default.
- [Main input integration](../../app/src/main.ts) starts the study offset and its
  slider at zero. The legacy offset remains an explicit experiment; AP exclusion
  is unchanged. [Control mapping](../../app/src/control-settings.ts) retains
  validation, gains, signs, clamps, manual rudder priority and explicit opt-in
  linking. Both fresh presets default to independent roll/rudder; no aerodynamic
  coefficient, damping, integration step or device sensitivity is retuned.
- The loading editor uses the same fresh default and labels the external station's
  lateral position. Numeric data stays in the existing kg/m³ boundaries; the
  disclosure and link note use inert text and add no resource/network path.
- Documentation inconsistency identified during review—ARCH still required all
  original source defaults—was corrected at `214e289`. The current ARCH and SEC
  distinguish legacy loading from fresh loading and state the initially zero
  study offset. No reviewer implementation edit was made.

## Independent checks and evidence quality

Executed `node --test app/src/control-settings.test.ts app/src/session.test.ts
app/src/flight-trace.test.ts`: **88 passed, zero skips**. These cover the changed
input defaults and existing session/recording compatibility; mocked session tests
are not treated as native handling proof.

An independent in-process invocation of the real worker/native runtime rejected
four loading inputs (`null`, empty object, NaN external load, extra key) without
publishing state. Fresh and explicit legacy launches then produced step-zero
states with respectively 0 and 36.2873896 kg external load and zero lateral
command. Both default objects remained frozen. This read-only diagnostic created
no repository test or evidence overwrite.

Independently repeated four native 90 kt initial-CAS, trim-power cases for seven
seconds at 1/120 s. Their bank values matched the supplied diagnostic to below
1e−12 degrees:

| External loading | Constant aileron | Bank at 7 s |
| --- | ---: | ---: |
| Legacy 80 lb | 0 | +35.303439° |
| Legacy 80 lb | −0.109375 | −3.949512° |
| Unloaded | 0 | +4.225015° |
| Unloaded | −0.109375 | −36.132418° |

This supports changing loading and offset together. It does not isolate mass
from the accompanying CG/inertia/trim changes. The +35.303439° case is source
loading with **zero** bias, not the former full application default. The first exploratory invocation
incorrectly expected successful trim status 0; the runtime uses 1. Correcting
that diagnostic assertion produced the four matching results above.

Initially inspected the supplied 48 native configurations, their exact repeat,
and the production-handler/native five-case loading/continuation harness. CAS is
matched at initialization, not held throughout the flight; full-power cases
retain the earlier trim, and trajectories stop at contact/100 m diagnostic floor
or 60 seconds. Diagnostic case count is not a calibrated stability envelope.
The renewal below identifies the expanded final artifacts; original 48-case
evidence is preserved under `control-stability-native-pre-peer.*`.

The supplied Chrome 156 parking/rudder run reports six passing groups, including
native initial payload, unbiased roll/release, explicit linking/manual priority,
paused-state isolation, Review restrictions and actual native ground-steering
direction. It does not test user-perceived airborne oversteer. Integration-owner
logs record **408 Node plus 12 Python passes, zero skips**, and a successful
3.19-second build. The broader `control-ci.log` subsequently completed with
“Foundation CI: passed with skipped checks”; nine of 23 JSBSim study tests were
skipped. This precedes report integration and does not establish final
publication approval. No reviewer browser was run.

## Residual limits and identities

At 90 kt, unloaded/neutral trim-power motion still reaches +15.241° bank by
30 seconds; the 0.45 two-second roll command still produces a large bank. Actual
aileron deflection can persist after a zero command because of model actuator
hysteresis. Every initial 110 kt case reports trim status −1: those trajectories
cannot support a trimmed high-speed stability claim. These remain model/handling
limitations, not resolved by this PR. No aircraft control-force or hardware
calibration, full maneuver envelope, older-binary regression causality, training
fidelity or real-aircraft certification is accepted.

Actual WASM remains
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`;
the neighboring build record identifies `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
Executing-byte observations do not verify its source/build identity. No binary
or model replacement was performed.

Selected independently checked SHA-256 identities:

| Path | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/loading.js` | `b36361f5d73f4681e987c6eaf52472e59df6fa404e03b4cc8dc13bcc179d7957` |
| `studies/e1-browser/sim/worker.js` | `20c60a4341f098103a555ec24292b734a9b0898fc6318e11291c0d4bd069bfcf` |
| `app/src/main.ts` | `5e8d48d3c85ebe8bd6218004edb4aeefe2406b79c74add3a1cd3cc3f031104ca` |
| `app/src/control-settings.ts` | `9f79f1e84f4a81dd0d467ff06cddebd604bec87fff0a7a8e017e2b836fb9435d` |
| `studies/e1-browser/sim/control-stability-native.mjs` | `1b1cbf2efd6c9a124977c7bdbbc06925c81a1589e327bfc43ccde86d8be56b78` |
| `studies/e1-browser/sim/control-stability-worker.mjs` | `9ecdad618ac979e966187b9981a735994fea03c3e11d04b458c5d8412686da10` |
| `output/flight/control-stability-native-pre-peer.json` | `553efc5d7a4bf0d46c256e9a33b7ff4e97f96810cc800b58d263238f2ade35c0` |
| `output/flight/control-stability-native.json` | `a472e3f1c2581c86e8eb129240d6d1619cf2d1285f0f045e6b178d5674b3b67a` |
| `output/flight/control-stability-worker.json` | `8eeb52f6a2f33ae9774aedb5bc4055bf038beaa31d2b6152ba40f6cec8546626` |
| `output/flight/control-stability-app-comparison.json` | `8892ca5be60a3320ee4f70bc101fcc10fd9d935afa51f4afcb122253336f1502` |
| `output/flight/control-parking-rudder-final.log` | `be843f8fa4e273d70561c7ee7a0bbf161c39f15073145556be9e50aafe7529f0` |
| `output/flight/control-unit.log` | `a46e152c82ac0c30e5183b7718550b2ad876544c5e7839ae61e0eaf4f1d85703` |
| `output/flight/control-build.log` | `43855f57a030518f3834e91ec1be3c3b0c3feaaa989eaf094a47ef1a0cdcd26b` |

Ignored `output/` artifacts are local retained evidence, not fresh-checkout
assets. Reproduction uses the tracked native/worker diagnostic scripts and
`node tests/parking-rudder.browser.mjs` from `app`, with the local engine/runtime,
browser and documented dependencies available. The integration owner owns final
shared-document, assurance and publication gates.

## Affected renewal at 7512d60

No additional blocking implementation finding from the narrow changes.
Independently read the full diagnostic diffs and verified the final 64-case JSON
contains the original 48 results **exactly unchanged**, plus 16 distinct signed
independent-axis cases: aileron/rudder ±0.1, 70/90 kt initial CAS and trim/full
power. The harness now asserts successful trim status 1 at 70/90 kt, separately
expects −1 at 110 kt and excludes those failed initializations from equilibrium
interpretation. Added assertions check the uncommanded axis remains zero,
commanded actual surface sign and released commands. These are command-response
diagnostics, not aircraft stability tolerances.

The final five-case handler/native harness immediately precedes the missing-group
legacy continuation with a different 72 kg pilot, unloaded external station,
zero rear/baggage loads and reduced fuel. It then checks all six source payloads,
empty mass, capacities/density, recorded tank contents, reconstructed total mass
and missing historical fuel-use baseline. This closes the former weak test where
stale source-default loading could accidentally pass. It runs the production
message handler in Node with native WASM, **not a dedicated Worker transport**;
the parking browser supplies the separate real-Worker evidence. The reviewer
audited the revised code/data and all six current native-note hashes, rather
than re-executing the complete 64-case sweep.

Before/after measured WASM hashes agree; the new artifact pins `loading.js` too.
This replaces a hardcoded “not rebuilt” diagnostic assertion and establishes
only file identity during that run, not earlier build history or source identity.
The supplied renewed `control-parking-rudder-final.log` reports the same six
groups passing after the note/comment update. Its hash matches the earlier
console output because the reported results are identical; this is a supplied
new execution, not a reviewer browser rerun. Earlier 88-test and native
four-comparator reviewer results remain applicable to unchanged behavior.

Reviewed the separate tracked
[whole-configuration comparison](../research/2026-11-05-control-stability-app-comparison.md)
and its local 40-case artifact. It compares the full former defaults with the
new defaults and shows **mixed** results: for example 90 kt trim-power bank at
30 seconds changes −15.96° to +15.24°, while full-power bank changes +19.83° to
+35.38°. It does not support uniformly improved handling. The exploratory
comparison script is local ignored evidence, not a fresh-checkout automated gate;
no total instability-resolution claim follows.

The [external peer disposition](2026-11-05-control-stability-peer.md) records
actual Claude execution against the earlier frozen packet and its blocked
quality/criterion result. The strengthened evidence addresses named gaps for
this local review; it does not turn that external result into acceptance.
Packet omissions and uncovered behavior remain peer limitations until renewed.
Final CI on the renewed revision was still running at this review renewal;
earlier completed CI is historical evidence, with its nine study skips retained.
