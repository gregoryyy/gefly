# Engine-off glide: independent quality and validation

Reviewer: Codex subagent `glide_quality`, 2026-11-03, Europe/Berlin.
Scope: TODO 2.0.52, R-SIM-10, engine shutdown/restart (R-ENG-1), new diagnostic
units/read-only behavior (R-SIM-3) and same-build reset (R-SIM-4), at the integrated source after merging current main `9960c6a` into feature
commit `19367b6`. Earlier source and negative-control runs based on `a655bc9`
are identified separately below. The reviewer did not author the implementation, fixtures or research.
This is a same-provider bounded integration review, not the external peer gate
or acceptance of the selected C172S aircraft.

## Quality findings

**Source quality passes for a bounded partial improvement; full glide validation
is not accepted.** An initial six-case nominal glide suite passed, but adding
idle-throttle shutdown at initial 35 m/s exposes a remaining near-stopped
propeller case. Tiny positive rotation and negative force must not count as
sustained windmilling. The stronger fixture uses JSBSim's own 0.01 rev/s regular
advance-ratio branch boundary rather than an invented aircraft tolerance. The
orchestrator retained this failure and TODO 2.0.52 open, with no unsupported
high-advance extrapolation or tuning to hide it. The source-backed nominal
improvement is suitable for a labelled local prototype increment; it does not
complete R-SIM-10 or justify real-aircraft training use.

The first proposed requirement reused existing R-SIM-9 (simulation pacing).
The orchestrator corrected the new requirement to R-SIM-10, preserving the old
identity. No remaining duplicate was observed in the corrected specification.

The preparation tool reads only hash-pinned local source, parses the generic
Aero-Matic fixed-pitch branches without executing PHP, and leaves the upstream
checkout unchanged. The direct-drive design-point power coefficient is
dimensionless: `HP * 550 / (rho * (RPM/60)^3 * D^5)` in consistent customary units.
The source density is a generator design-point input, not a frozen runtime
atmosphere. Original blade count, diameter, inertia and Mach corrections remain;
full CP/CT replacement also changes powered forces and is documented as generic.
No glide-ratio tuning or velocity/sink override was found.

The bridge reports actual guarded native thrust in N, shaft power in W, advance
ratio and propeller rad/s. Missing/uninitialized properties remain NaN. The
conversion from mechanical horsepower uses 550 ft·lbf/s and exact boundary
factors. The reader does not alter native state or rolling digest in the
independent execution below.

## Independently executed evidence

- `python3 studies/e1-browser/sim/prepare-propeller.test.py`: six tests pass,
  including synthetic source/error cases, independent Decimal design-point
  arithmetic, deterministic preparation, metadata hashes and source immutability.
- `node --test studies/e1-browser/sim/engine.test.mjs studies/e1-browser/sim/simulation-rate.test.mjs`:
  eight tests pass, zero skips.
- Initial six-case `engine-off-glide-native.mjs`: passes for powered,
  ignition-off and mixture cutoff from 35 and 45 m/s with retained trimmed
  throttle, 2,500 m initial MSL altitude and lateral leveling only. These are
  TAS values, not the POH's IAS, and the source aircraft is generic c172x.
- Final strengthened `engine-off-glide-native.mjs` renewal: exit zero with
  **seven nominal cases passing and one model fixture explicitly not accepted**.
  The 35 m/s idle case is classified from its actual low-RPM/high-advance state,
  not from positive numerical crumbs; its known limitation is not a pass. The
  complete repeated native case/digest matches exactly. Evidence:
  `output/flight/glide-quality-final-cases.json`.
- Independent ignored `output/flight/glide-quality-native.mjs`: passes actual
  shutdown, native restart, second shutdown, diagnostic read-only behavior and
  exact state/propulsion/digest checkpoint equality across identical fixed-step
  resets. It also confirms build metadata binds the final preparation script.
- Renewed integrated `app/tests/regional-nav-flight.browser.mjs`: five groups pass,
  including actual native APR/GS capture, source/terrain preset and read-only
  Review.
- Renewed integrated `app/tests/engine-smoke.mjs`: eleven groups pass, including
  missing-data group rejection from merged PR #52, actual E and
  cockpit shutdown/restart, paused staging, mixture cutoff, throttle commands,
  heading response, overrides and recorded read-only engine state.

Browser checks used actual Chrome **156.0.8078.80**, native WASM and DEM packages;
map/photo pixels use deterministic local fixtures. Both suites check no page
errors or external destinations. They were rerun after CI's npm-install phase
finished to exclude dependency-install overlap. Final integrated native WASM
SHA-256:
`b2dcf7a3056d60867db41d94cb468fbbe77f46ed4327b101eb1535ef3d65a6d6`
(**1,756,399 bytes**). The final eight-case native suite and independent
shutdown/restart/read-only/reset harness were also renewed on this exact binary.
All per-case metrics and repeated digest were observed equal to the pre-merge
run; this is an observation on these builds, not a cross-build guarantee.
Final renewed logs are `output/flight/glide-quality-integrated-*.json`.

The pre-merge binary was
`31288b5db29c0bf6dfb038c213793b37d7ce8416739a4065730411efcc7473d8`
(1,756,923 bytes); its earlier checks remain historical evidence only.

Before the main refresh, the reviewer separately compiled that source bridge and prepared aircraft
against the **original** propeller in ignored
`output/flight/glide-original-prop-bin/`; final `sim/dist` was not modified.
The glide regression fails on the intended ignition-off sustained-windmilling
assertion, rather than on a missing export. Negative-control WASM SHA-256:
`0d77c043754bcc8ad9bcec60a7e744d67d7b9e73224f22d8e8f26e5b3fd6335f`.
This establishes that the nominal regression detects the original model defect.
A separate measurement-only run omits that failed predicate to record the
baseline; it is explicitly not a passing regression.

Matched 60–120 s windows, with retained trim throttle, give approximately:

| Initial TAS | Original propeller glide | Revised generic propeller glide | Revised mean thrust |
| --- | --- | --- | --- |
| 35 m/s | 13.986:1 | 12.560:1 | −91 N |
| 45 m/s | 12.118:1 | 10.532:1 | −120 N |

Original mean RPM/thrust are zero in both windows. The new 45 m/s idle-throttle
case gives roughly 10.174:1 and −156 N, but initial 35 m/s idle still decays below
the regular advance-ratio branch and returns approximately 13.988:1. Ratios are
finite-window diagnostics with phugoid/speed changes, not accepted steady C172
polars. The roughly 9.1:1 selected-172S source reference is not a test threshold.

Raw commands/results are retained under ignored `output/flight/glide-quality-*`
and `output/flight/glide-original-prop-*`. Shared CI, typecheck/build and assurance
are orchestrator-owned; they were not independently run by this reviewer.
Source/record whitespace checks pass. Independent parent-by-parent command
inclusion confirms both feature and main test entry points survived the package
conflict: 40 browser/native commands and both aircraft/propeller Python tails.
The SBOM retains main's rights-unresolved material and the complete generic
propeller paragraph. Complete DONE section comparisons preserve all 94 feature
parent entries and all 99 main entries with unchanged bodies; later integration
entries are separately owned by the orchestrator.

## Scoped specification validation

| Criterion | Expected / observed | Outcome |
| --- | --- | --- |
| R-SIM-10 source model | Hash-pinned generic fixed-pitch CP/CT multipliers include a negative aerodynamic power region; no imposed sink or velocity override | **Pass** for generic source contract |
| R-SIM-10 nominal windmilling | 35/45 m/s retained-throttle ignition-off/cutoff runs retain rotation, negative thrust and engine braking after shutdown; energy falls | **Pass** for named nominal cases |
| R-SIM-10 idle-throttle / low-RPM drag | 45 m/s case retains drag; initial 35 m/s case falls below the regular advance branch and loses useful propeller force | **Fail / unsupported** at 35 m/s; full requirement unaccepted |
| R-ENG-1 | Native E/cockpit ignition/starter, mixture cutoff, paused staging, Review guards and restart continue working | **Pass** for maintained browser and independent native cases |
| R-SIM-3 diagnostic boundary | Actual thrust N, shaft power W, dimensionless J and rad/s; uninitialized NaN; repeated read leaves state/digest unchanged | **Pass** for exercised tuple and native state |
| R-SIM-4 same-build reset | Repeated identical fixed-step event fixture reproduces all sampled native states, propeller diagnostics and digests exactly | **Pass** on this runtime/build; no cross-build guarantee |
| Powered flight / approach | Positive powered thrust, successful initial trim, actual native heading response and APR/GS capture | **Pass** for named regression cases; full powered envelope untested |
| Source / data limits | Local-only generation, source/prepared/script hashes, source attribution, generic rather than selected-172S label | **Pass** for inspected record contract; broader rights clearance and aircraft calibration **not accepted** |
| All-model fidelity / release / peer | No full aircraft reference matrix or fresh external-provider review performed | **Not evaluated / peer pending** |
Aircraft-specific glide calibration, stopped-prop drag, high-advance extrapolation,
full operating-envelope behavior, distribution-rights clearance and training
validity remain unaccepted. This report does not close the peer-review batch.


## Frozen reviewed source

After integrated checks, at **2026-11-03 10:43 Europe/Berlin**, the reviewer hashed the following 18 paths
as sorted `path + NUL + lowercase SHA-256(file bytes) + newline` records. Packet
SHA-256:
`411530d8e26a4d9a3638329625299040f10d54493454b633574c23797b91bfc6`.
The ignored final inventory is `output/flight/glide-quality-packet.json`.
The pre-merge packet `474f671a053689769a1a740c48cc9c2351fbace64fcd72f15745fab49b14ef75`
is retained separately in `output/flight/glide-quality-premerge-packet.json`;
it does not stand in for final integration review.
Shared TODO/DONE and this review prose are outside the source packet; their open
scope and original user record were inspected separately. Generated binaries are
outside the packet and identified above. A changed covered byte requires affected
review renewal.

```text
THIRD_PARTY_NOTICES.md
app/README.md
app/package.json
app/src/main.ts
docs/ARCH.md
docs/SBOM.md
docs/SPEC.md
docs/input/2026-11-03-engine-off-glide.md
docs/input/README.md
docs/research/2026-11-03-engine-off-glide.md
docs/research/README.md
studies/e1-browser/sim/README.md
studies/e1-browser/sim/bridge.cpp
studies/e1-browser/sim/build.sh
studies/e1-browser/sim/engine-off-glide-native.mjs
studies/e1-browser/sim/prepare-propeller.py
studies/e1-browser/sim/prepare-propeller.test.py
studies/e1-browser/sim/worker.js
```

Recommendation: publish only as a **partial generic-model correction**, retaining
the visible low-RPM limitation and open TODO/full requirement gate. The normal
windmilling improvement and integration behavior have current scoped evidence;
the remaining stopped-prop defect has current failing evidence rather than an
inferred acceptance. No external-provider CLI, identity or packet review was run.
