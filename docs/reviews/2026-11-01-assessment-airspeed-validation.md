# Assessment airspeed: independent validation

Reviewer: Codex subagent `airspeed_validate`, independent of implementation.
Initial review: 2026-11-01 22:54 Europe/Berlin. Scope: TODO 1.5.1/1.5.2 and
the related 1.1.3 gate, against [AA1–AA6 and AA-T1–T8](../design/ASSESSMENT-AIRSPEED.md)
and [E15](../EVAL.md#e15-does-assessment-airspeed-preserve-calibration-limits-and-evaluator-separation).
This is specification validation, separate from quality and cross-provider peer.

## Revision and evidence

Reviewed working tree: `feat/assessment-airspeed`, based on
`5cb5b732f7bcd0fdab65455a7b29d48777afeb0c`. The initial integration packet identifies
205 source paths and aggregate SHA-256
`a95f973e825122f9d0972700d689d041fdfa1999cfe910f2bae8aa8aedd4ca8f` in ignored
`output/assessment-airspeed/snapshot.json`; reviews and ignored output are excluded.
The reviewer independently reproduced this aggregate by hashing each listed
relative path, NUL, exact file bytes, NUL in the manifest's sorted path order.
Final shared status records were not yet complete at initial review and require
affected renewal. Independently calculated SHA-256 identities:

| Artifact | SHA-256 |
| --- | --- |
| Frozen AA contract | `2e2660b7d5aea8307e141cdc864c5a58f2efa03f010b97a35d9552a71ec51068` |
| Shared TypeScript API | `38c9640ea8546b19c7b19c16e3c91154247c373dbb9ae205a21cf3c230a72bea` |
| Mapper | `673f5fcf9868c6c73e2986efb0e6e5c3fdd76d1166cbf9e4d550fbbebdb4b137` |
| Source adapter | `728808cffe800671e4e7d84f24d6117a6d333533fae7993b86d898be3bc5c596` |
| `poh-values.json` exact bytes | `27d5c4f6ca58b27c08ab6a9cbae0af3398e56edf5c27113e4cc5d9a661f381de` |

The source JSON has no diff against the base revision. Its existing S17 record
and [extraction note](../research/2026-11-01-c172s-poh-values.md) identify the
172SPHUS Rev 5 calibration, Figure 5-1, page 5-9; this review does not re-extract
the manual or approve applicability/rights.

Executed independently: `just test-training`, Node `v26.13.0`, exit 0,
11 declared tests passed across three files, zero failures, skips, cancellations
or TODO tests. Read all assertions, both production modules and the shared API.
Additional direct public-API probes used the actual file bytes and SHA-256:
duplicate CAS, reversed IAS, negative SI and NaN SI in the flaps-10 table were
rejected at the exact offending field. The two independently specified arithmetic
cases returned `28.29445` and `32.152800000000006` m/s, respectively, within the
predeclared `1e-12` m/s arithmetic tolerance.

Inspected the orchestrator's completed `output/assessment-airspeed/ci.log`:
141 repository-tool tests discovered, 140 executed, one Linux-only process-state
test skipped; E1 14 executed and nine optional-engine tests skipped because JSBSim
was not importable; E2 25 passed; synthetic rendering check passed; assurance
72 passed and integrity passed; training 11 passed with zero skips; tracked
whitespace passed. The gate says **passed with skipped checks**. These are observed
log results, not a second full CI execution by this reviewer. The skipped tests
are not accepted engine or Linux evidence.

## Criterion matrix

| Criterion / related requirements | Expected | Observed and evidence | Outcome |
| --- | --- | --- | --- |
| AA1 / R-DATA-1/2, R-FID-3 | Adapt precisely the three identified normal-static sourced tables, 7/5/4 points; enforce consumed identities, units, metadata, monotonicity and hash format; actionable errors without repair. | AA-T1/T7 and direct malformed-data probes pass. Code explicitly constructs only 0/10/30 tables, validates SI/original quantities and fields, rejects non-increasing IAS/CAS and does not sort. Complete source validation stays in the existing repository validator. | **Pass** |
| AA2 / R-SIM-3, R-TRAIN-2 | CAS error precedes flap error; inclusive direct radian bounds with no epsilon; all other angles unavailable with null IAS. | AA-T4 covers each of six exact limits and adjacent representable inside/outside values; 20°, transit and degree-like radians rejected. AA-T6 covers NaN/infinities/negative CAS, strings/null and CAS-first precedence. Production comparisons match the frozen expression. | **Pass** |
| AA3 / R-SIM-3/4 | Exact stored SI anchors; inverse linear interior interpolation; deterministic equal outputs. | AA-T2 and integrated public-module test map all 16 anchors exactly, including six endpoints; shared CAS differs across flap tables. AA-T3 and independent direct probes match the two frozen arithmetic cases. AA-T8 verifies repeated outputs and unchanged inputs. Stored SI values are used without knot reconversion. | **Pass** |
| AA4 / R-TRAIN-2, R-FID-3 | Strict out-of-range outcomes preserve the exact boundary and table with null IAS, never extrapolate or classify bands. | AA-T5 covers both ends of all three tables, including immediate positive representable neighbours outside. Exact endpoint equality remains mapped. Integrated range test and source inspection show null IAS, correct boundary and no band result. | **Pass** |
| AA5 / R-DATA-1/2, R-FID-3 | Preserve identity, caller hash, metadata, SI/knots and source labels; detached recursively frozen bundle; mapping identity/version on every outcome. | AA-T1 checks all source fields, conditions/citations/reading/selection/conversion/uncertainty and points; recursive freeze assertions and post-adaptation source mutations pass. AA-T8 covers mapped/range/unavailable provenance; integration binds parsed object to actual hashed bytes. Declared `reviewed` is preserved only as a label; draft/not-validated source is not promoted. | **Pass** |
| AA6 / R-SIM-3/4, R-TRAIN-2, R-FID-3 | Pure browser-compatible TypeScript, evaluator-only fields outside instrument/digests; explicit future record pins; no wider implemented claim. | Production files import only types and use no Node, DOM, filesystem, network, provider, clock or renderer APIs. Integration inputs have a throwing `ind` getter that is never accessed. EXERCISE-01 rule 7 and SCENARIO-CONTRACTS C4 agree on evaluator separation and future source/mapping/evaluator pins. No recorder, digest, dynamics, UI, target-band or exercise-success code is present. | **Pass** |

## Evidence meaning and boundaries

The exact-anchor sweep tests source wiring and inversion. Its anchors come from
the same source used by the mapper and are **not independent aircraft holdouts**.
The separately frozen midpoint/quarter-point values test arithmetic without
deriving expected answers by calling the implementation; they also establish no
aircraft-model fidelity. This slice performs no model tuning and introduces no
holdout acceptance claim. Original source values and labels remain unchanged.

The AA contract, E15, EXERCISE-01 rule 7 and C4 links have matching bounded meaning:
only assessment-airspeed mapping and the repository adapter are frozen here.
The broader R-TRAIN-2 scenario/debrief and R-SIM-4 replay requirements are not
accepted in full. The adapter's hash validation checks spelling only; the trusted
caller computes the byte hash and parses those same bytes, as the integration
tests demonstrate. It is not an untrusted importer or proof of source approval.

The shared CI runner calls training separately from assurance. The reused parser
requires each discovered test file and the global summary to contain positive
passing test counts and rejects skipped, cancelled, TODO or failed tests. Inspected
negative-test evidence includes missing training files and training-process failure
after assurance success; the common actual-Node empty/skipped-file check passes.
No download or new runtime dependency was introduced by this gate.

## Acceptance recommendation

**Accept AA1–AA6 for this bounded implementation.** No specification defect found.
Final shared-record validation is renewed below. The integration owner retains
responsibility for final committed-revision CI and assurance/diff before publication.
Cross-provider peer remains **pending** under the batched cadence; this same-provider
validation does not satisfy it. No browser execution, replay, whole-exercise,
aircraft fidelity, rights approval, learner benefit or training-credit acceptance
is implied. Target bands remain deferred until the rounded-SI versus exact-knot
comparison policy is frozen; unavailable IAS cannot count as exercise success.

## Final shared-record renewal — 2026-11-01 22:56 Europe/Berlin

Independently reproduced the final 205-path source aggregate
`20b8817f10721b501dd0e00b5c63fd96a343b9ac99bfdfd8fc755ce9c691cc2f`
using the same manifest algorithm. The integration owner changed only TODO,
DONE and RESULTS after the initial review; production/API/frozen-contract hashes
above were independently rechecked and are unchanged. Reviewed the staged diff
of all three shared records against `5cb5b73`: only 1.1.3, 1.5.1 and 1.5.2 become
complete, their parent tasks remain open, the clock-derived DONE entry names
actual contributors/reviewers, and E15 records the observed test counts and
limitations. No historical DONE entry is replaced. The source hash, unverified
fidelity, caller binding responsibility, open target-band policy and peer-pending
status remain explicit and consistent.

Inspected final `output/assessment-airspeed/final-check.json`: zero integrity
errors, 14 planned criteria, zero accepted criteria, four fresh existing evidence
records and zero stale records. Its retained historical failed observation is
not promoted to a pass. The planned MVP records therefore remain distinct from
the bounded AA acceptance. This documentation-only renewal introduces no new
behavior requiring a repeated numerical suite. **AA1–AA6 and shared-record
consistency pass at the final source aggregate.** Publication/merge checks and
future cross-provider peer coverage remain separate integration obligations.
