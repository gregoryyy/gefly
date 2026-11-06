# Neutral manual controls validation

Independent Codex `cws_validate`; recorded 2026-11-06 01:51 Europe/Berlin. Scope:
bounded normal-flight startup offset repair in `fix/neutral-roll-offset` working
tree against `c3d850a45b0f5668bbd03814a7cc895abd7ca128`, R-SIM-11's explicit zero
study-offset clause and the applicable R-INPUT-1 command path. I authored no
implementation or fixture; this report is my only edited file.

**Recommendation: pass this bounded application repair.** It removes the observed
unsolicited aileron command and restores agreement with the existing zero slider.
It does not establish stable hands-off flight or resolve the broader current
root-app handling report. TODO2.0.153 correctly remains open.

## Reviewed snapshot

| Path | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `36df568069a5baf1175d04a9cc7a6e7787e152a4084981f8b40ef4047f7f6232` |
| `app/tests/neutral-controls.browser.mjs` | `251d3148860570c302ece712e7700828d4f48b280d86f650ccead2070d2aa4b1` |
| `app/src/control-settings.ts` | `9f79f1e84f4a81dd0d467ff06cddebd604bec87fff0a7a8e017e2b836fb9435d` |
| `app/src/pilot-controls.ts` | `1dbb7cb96f8d0a9ee691641fbfbec68b57d84b5d7e31d25dfc6a463e98d26d0e` |
| `app/src/pointer-yoke.ts` | `4a740bf71c3ab1e86a3591f7428874e7cbe85fe02c436652262f3f6e51d14b50` |
| `app/src/session.ts` | `baaa0abd9e17bd80acc8685cd5498a3e8bfd2e8560ccde55aaf92fe2a4124e59` |
| `app/tests/centered-touchpad.browser.mjs` | `dcbd983c9d86472ca4e8305858afb9d84778f98628b0106edb55288aa9a89a21` |
| `app/tests/classic-smoke.mjs` | `b35e0776c3b82a5235ae9469039411a3397cdb6491c70d9e08848f75416ee7f8` |
| `app/tests/review-controls.browser.mjs` | `bd2c738ffe602f14d6b837abe5fb8ae3f8f29c866b6507770486e6129ecf098d` |
| `app/tests/smoke.mjs` | `a69ad1943ef200ad3fabaa558ba108dc9b5a62b6f6d2ac83f8423b64e28bdc54` |
| `docs/SPEC.md` | `e28288bc009f615a688d39ccf239978c897db2df04743f6dd8c29d667c1d8b1e` |

Production diff is the startup `rollOffset=-0.109375` to `0` and its adjacent
comment. No native binary, aircraft coefficients, control gains, pointer mapping,
AP controller or dynamics algorithm changes. Four existing browser fixtures
replace only their implicit-old-default expectations with neutral/pilot commands;
explicit Legacy study-offset and dedicated ground/landing configurations remain
separate. Package changes add the focused browser command and retain existing
commands. Read AGENTS, validate role, relevant SPEC/TODO/EVAL, SDLC/STYLE/SEC and
user report before reviewing.

I independently ran from `app`:

- `node --test src/control-settings.test.ts src/pilot-controls.test.ts`:22 passed,
  zero skipped.
- `npm run check`: TypeScript passed.
- `node --check app/tests/neutral-controls.browser.mjs` from the checkout root:
  syntax passed.

These units preserve explicit offsets, pilot-axis scaling/signs, independent
rudder and bounded inputs; they do not themselves test the main startup value.

## Actual browser observations

I inspected the author-run real app/worker/native fixture and both preserved
results. The observer only snapshots the controls after `session.input`; it does
not substitute controller state, Worker messages or aircraft dynamics. Map/photo
pixels are synthetic. Chrome156.0.8078.80 and actual WASM
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`.
All six source hashes match before/after each run, and page errors are empty.
This is independently inspected author-run evidence, not a reviewer browser rerun.

| Artifact | SHA-256 | Observed result |
| --- | --- | --- |
| `output/flight/neutral-controls-browser-old.json` | `33dfa5be414893c0c67544b63978b679def573421107afd2319dd629d860a979` | Fails neutral first-input assertion; actual first Worker and native aileron command−0.109375 despite slider0. Readout says10.9% left. |
| Final `output/flight/neutral-controls-browser.json` | `276323f88dc4efff80fb55c6f40fa24c25cbc2ee39c7fe6e2953719e0df860f2` | All three groups pass at current main hash36df5680…; zero first axes, actual pointer/key response and explicit Advanced offset/Off. |

The earlier repaired artifact hash8a0793… mentioned during initial review was
superseded by the final comment-adjusted source rerun. It is not the current
output bytes and is not combined as additional unique evidence.

## Criterion matrix

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Normal startup has no study bias | At SIM1 the first actual Worker input has aileron/elevator/rudder0; native command telemetry is0. Existing slider0 and readout0.0% off now agree. Old run demonstrably fails with−0.109375. | pass |
| Deliberate pointer response preserved |15 CSS pixels right sends+0.05 aileron with zero rudder in the actual Worker/native path, at unchanged mapping/gains. | pass for measured case |
| Neutral return preserved | Pointer center, leaving the scene and releasing right arrow send zero axes; held right arrow sends+0.45. | pass for measured cases |
| Explicit experimental offset stays available | Advanced+0.25 sends+0.25 through actual native telemetry; Off returns slider and command to0. | pass |
| AP/experimental separation | Existing `applyControlSettings` receives0 offset while AP is active and explicit stored offset otherwise; implementation is unchanged apart from startup. | pass by source/unit inspection; no new AP browser run claimed |
| Fixture expectations match declared normal/explicit modes | Four default-only fixtures now expect neutral/.25/.45/−.45 as applicable; explicit Legacy expectations still include−0.109375 and dedicated ground/landing study cases are untouched. | pass by diff inspection; all four complete browser scripts not rerun here |
| Dynamics/model boundary | Runtime change only removes an external UI command. Native/model assets and control sensitivities do not change. | pass for scoped diff inspection |
| Current native model did not newly change | Renewed64-case diagnostic hash equals the documented Nov5 final hash;48 retained older per-case states/digests also exactly match. | pass for observed artifact identity/comparison; build provenance remains unresolved |
| No total handling-resolution claim | Root working app already had0; native zero-command drift and failed110kt trim remain documented, Task153 open. | pass for bounded scope/status; full handling not evaluated |
| Local CI | Final local log passes507Node+22Python,85assurance and11training tests, with9/23 optional JSBSim study checks skipped. | pass with declared skips |
| Full aircraft/control fidelity, native build provenance, external peer/release | This UI fix and engineering fixtures cannot establish those independent gates. | not evaluated / peer pending |

## Native evidence and remaining handling limits

Inspected the root research artifacts under
`output/flight/handling-regression-native/summary.md`, `summary.json` (SHA-256
`a8a88d72a79cbb92e59d58070f4049abbedda279e015c7dd5285299da35cf95d`) and
`control-stability-native.json` (SHA-256
`a472e3f1c2581c86e8eb129240d6d1619cf2d1285f0f045e6b178d5674b3b67a`).
The last matches the prior documented64-case artifact in the Nov5 validation;
this is evidence of unchanged measured native behavior, not proof of correct
handling. No experiment binary is deployed by this repair.

In the paired native90kt initial-CAS, normal external-zero loading, trim-power
cases, bank at7s is−36.132418° with−0.109375 input versus+4.225015° with0 input.
Both trims succeed. The conditions evolve after initialization and are generic
engineering diagnostics, not C172S performance tolerances. The zero case still
rolls, so removing this large unwanted command does not validate lateral trim
or stability. Separate60/80/100kt neutral/pulse diagnostics retain drift and
actuator hysteresis;110kt longitudinal initialization fails trim and must not
support an equilibrium claim.

The full-trim study in that directory is an isolated experiment. Holding its
solved lateral/rudder controls is explicit test input, not a real C172 aileron
trim control, a new product default, accepted assist or sensitivity correction.
It remains separate from this one-line repair and requires its own design and
independent acceptance before any product use. Production WASM still disagrees
with its old recorded build hash; embedded asset/served-byte identity does not
repair that overall provenance gap.

## Integration limits

Inspected `output/flight/neutral-controls-ci.log`, SHA-256
`21b88a2b2ebf96981e57235c2234fdf58e47a5fff6da3ec47df12532429af13a`.
It ends passed with skipped checks; tracked-content whitespace covers2081
currently tracked paths and excludes untracked files. Final committed records,
assurance diff and publication checks remain with the integration owner. Hosted
CI is not established by local success. I did not change implementation/tests or
rerun all browser workflows; renewed source changes require affected review.
