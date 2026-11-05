# Control-stability source and packaging notes

2026-11-05 17:34 Europe/Berlin. Codex housekeeping agent
`control_housekeeping`; research and repository-history inspection only.
The native and input implementation agents own reproduction and repairs.
This note neither accepts aircraft fidelity nor changes requirements.

## Applicable aircraft and lateral behavior

The [pinned upstream c172x definition](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172x/c172x.xml)
identifies a BETA 1982 C172P research model. It includes an 80 lb
`PesticideBomb` point mass 144 inches to the right of the structural centerline.
The definition explicitly includes roll damping and coupled roll/yaw terms.
Positive aileron contributes positive roll moment; positive rudder contributes
negative yaw moment. Those source signs support the application's opposite-sign
rudder convention, but do not establish that equal normalized aileron/rudder
commands coordinate a turn. The elevator actuator also specifies 0.05 rad
hysteresis; neutral response can therefore depend on previous commands.
These are properties of this generic source, not accepted C172S characteristics.

The FAA explains that wing position contributes to lateral stability through
the aircraft's response to sideslip. Coupled roll/yaw oscillation and a slowly
diverging spiral are distinct behaviors. Its general account says ordinary
directional oscillations usually decay within a few cycles and that spiral
divergence is usually gradual. This is a qualitative diagnostic distinction,
not a numerical C172 acceptance envelope. A high-wing label alone cannot
explain or accept the user's reported rapid roll-off or excessive oscillation.
See [PHAK chapter 5, pp. 5-18–5-20](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/07_phak_ch5.pdf)
and the [current FAA handbook listing](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak).
No new damping coefficient follows from these general descriptions.

## Existing local evidence and history

- `studies/e1-browser/sim/sim.js` documents `-0.109375` as an exact-binary
  benchmark aileron bias that roughly cancels roll-off at its one initial
  condition. It explicitly calls this a fixture choice rather than aircraft
  data. HEAD `700dd53` already applies the same default in the app, so its
  presence is longstanding rather than a new uncommitted terrain change.
- Commit `1d853ce05f22f7aef9c68aac51255303d9d30cf8`, 2026-11-04, changed
  both default and Gentle presets from independent rudder to linked rudder.
  The current mapping uses equal normalized magnitudes after roll sensitivity
  and before independent rudder sensitivity. The original
  [parking/rudder review](../reviews/2026-11-03-parking-rudder.md) describes
  the earlier optional, initially disabled link. Its tested command signs and
  ground steering do not constitute airborne turn-coordination calibration.
- The earlier unpublished audit at
  `docs/reviews/2026-11-05-c172-physics-quality.md` reports native source-default
  loading of 2480 lb including that external mass. Its no-external comparator
  is 2400 lb and has different CG and inertias. At 45 kt CAS, one unforced
  second produced approximately 7.98° bank with the original loading versus
  0.58° without the external mass. These are historical observations; this
  housekeeping task did not rerun them. The new native diagnostic must verify
  the executing runtime before relying on them as repair evidence.
- `bridge.cpp` supports explicit six-station loading through
  `gf_configure_loading`. The normal unconfigured path retains source loading;
  removing an external station should be an explicit supported configuration,
  not an undocumented coefficient edit or a masked input bias.

## Runtime provenance check

The existing local `studies/e1-browser/sim/dist/jsbsim.wasm` was read without
rebuilding or modifying it. Actual size is **1,768,907 bytes**, SHA-256
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`.
The neighboring build record instead declares 1,768,911 bytes and SHA-256
`4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
That record names JSBSim v1.3.3/commit
`66f7fafc07fe13e7ede9db20873030fed2881713`, but cannot prove the executing
binary matches it. Source inspection and hash-pinned runtime observations must
remain separate claims. No native rebuild or metadata correction was performed.

## Proposed separate PR boundary

Use a fresh branch from current `origin/main` (`700dd53` at inspection), rather
than stacking the urgent control repair behind unrelated terrain/UI work.
The already published terrain foundation PR is not a control dependency.
Bring across only the established repair and its minimal supporting tests:

- Input mapping/defaults and their focused tests, if the measured defect is
  unintended rudder mixing, pointer travel or persistent pilot commands.
- A small main/worker configuration hunk only if explicit loading or removal
  of the study bias proves necessary. Shared files require reconstruction
  against the PR base; copying the complete dirty file would import unrelated
  features.
- The native regression harness and this source note, plus the orchestrator's
  scoped request/SPEC/status and independent quality/validation records.

Keep Copernicus, airport geometry, map plans, lifecycle/reload and the accumulated
terrain changes outside this PR. If a new native binary is actually required,
freeze/reproduce its build identity and adapter inputs before making source-to-
runtime claims; a frontend-only configuration repair should retain the existing
binary and disclose its provenance limitation. Final head checks and browser
evidence belong to the reconstructed PR branch, not only the dirty integration
tree. Aircraft coefficients, inertia calibration and validated C172S handling
remain outside this bounded regression repair unless separately evidenced.

## Checks performed

Read AGENTS/housekeeping, SDLC, STYLE, SEC, SBOM, current TODO/SPEC context;
inspected source/history, existing diagnostic records and primary references;
measured the actual WASM size/hash. No runtime dynamics, browser, build or
full repository gate was executed by this housekeeping agent. No new assets,
dependency, licence or network data flow is proposed.
