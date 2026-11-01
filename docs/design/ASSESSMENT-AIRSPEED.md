# Assessment airspeed mapping v1

Status: **bounded implementation contract for TODO 1.5.1–1.5.2**, 2026-11-01.
This freezes only the CAL mapping and repository-data adapter described below.
It does not freeze [Exercise 01](EXERCISE-01.md), the remaining
[scenario v1.1 proposal](SCENARIO-CONTRACTS.md), or its instrument digest layout.
Requirement links: [R-TRAIN-2, R-SIM-3/4, R-DATA-1/2 and R-FID-3](../SPEC.md).

## Purpose and evidence boundary

Given per-step `sim.cas_mps` and `sim.flap_rad`, derive evaluator-only
`cal_ias_mps` and `cal_ias_valid` from the existing normal-static calibration
points in [poh-values.json](../../data/aircraft/c172s-classic/poh-values.json).
The 16 points were extracted from S17, 172SPHUS Rev 5, Figure 5-1, p. 5-9.
No further points, aircraft tolerances or manual facts are added by this work.
The existing file remains `draft`, with fidelity `not validated`.

The points are sourced data; inverse linear interpolation and the 0.5° detent
selection are **CAL/IP instructional choices**. The normal static source and
stated power conditions remain visible in the result metadata. Applying this
mapping during take-off or full-power climb is also IP; the mapper cannot
establish those conditions from its two numerical inputs. It is not an ASI or
pitot-static instrument model and supplies no validated training claim.

## Interfaces and ownership

The orchestrator owns the shared readonly types in
`packages/contracts/assessment-airspeed.ts` and integration/status records.
code1 owns `packages/training/assessment-airspeed.ts` and its mapper tests;
code2 owns `packages/training/airspeed-calibration.ts` and its adapter tests.
Housekeeping owns separately assigned module documentation and returns proposed
shared-record changes to the orchestrator. Neither implementation stream changes
the other stream's paths or the source JSON.

The adapter is a synchronous **repository-data adapter**, not an arbitrary-file
importer. Its inputs are a parsed JSON object and a lowercase SHA-256 string
supplied by the trusted bundling/test caller. That string identifies the exact
UTF-8 file bytes, not a reserialized object; the adapter checks its format but
does not calculate it or prove the supplied object matches it. The caller must
establish that binding before use. Future untrusted imports need a separately
scoped byte/hash, size, manifest and schema boundary. Existing repository
validation remains responsible for the complete file, manifest/citation
resolution, conversion arithmetic and rights checks.

The adapter returns either a readonly calibration bundle or a structured error
with a source-relative field path and message. It reads only declared source
fields, copies and recursively freezes the consumed data, and does not fetch,
execute, load files or change source status. The mapper accepts a successfully adapted bundle and two
SI numerical inputs. It returns the source identity, mapping ID/version and
selected table metadata alongside its discriminated result. No new dependency,
package manager or whole-workspace build system is required.

The calibration bundle is a trusted typed boundary produced by this adapter;
the mapper need not repeat the adapter's source validation. A forged object
asserted to that TypeScript type is outside the contract. Invalid numerical
measurements still return unavailable without throwing or returning NaN.

## Frozen acceptance criteria

| ID | Observable requirement |
| --- | --- |
| **AA1** | Adapt exactly the existing `normal_flaps_0`, `normal_flaps_10` and `normal_flaps_30` tables, with matching 0/10/30° identities, `static_source: normal`, `status: sourced` and 7/5/4 points. Require schema `1.0.0`, the identified C172S values ID, semantic values version, declared source status and `fidelity: not validated`. Require nonempty conditions, reading/selection/conversion/uncertainty metadata, nonempty citations with source ID/revision/page and optional section, IAS/CAS quantities in m/s with matching references and original kt values. Reject missing/malformed consumed fields, nonfinite or negative speeds, duplicate or non-increasing IAS/CAS points and malformed supplied hashes; report an actionable field path. Do not sort or repair source data. |
| **AA2** | Reject nonfinite/negative CAS as `unavailable: invalid_cas`; then reject nonfinite flap radians as `unavailable: invalid_flap`. Otherwise select a table when `flap_rad` is in `[(detent_deg − 0.5) × π/180, (detent_deg + 0.5) × π/180]`, inclusively, using those directly computed radian bounds and no expanded epsilon. Every other finite angle, including 20° and transit, is `unavailable: no_calibration_table`. This numerical selection rule makes no claim about physical flap travel. No unavailable result contains numeric IAS. |
| **AA3** | For selected-table CAS inside the extracted SI range, return `mapped`, `cal_ias_valid: true` and inverse piecewise-linear IAS in m/s: `ias0 + (cas − cas0) / (cas1 − cas0) × (ias1 − ias0)`. Use the stored four-decimal SI anchors, without reconverting original knots. Exact anchor CAS, including both endpoints, returns the exact stored IAS. Repeated equal inputs/bundle produce equal outputs without time, randomness or rendering state. |
| **AA4** | Strictly below/above the extracted CAS range, return `below_range`/`above_range`, `cal_ias_valid: false`, `cal_ias_mps: null` and the corresponding source CAS/IAS boundary point. Preserve the selected table metadata. Never extrapolate, clamp to a numeric IAS, or classify a target band. |
| **AA5** | Preserve source schema, values ID/version, supplied byte hash, declared status/fidelity and manifest identity/path. Preserve each selected table's conditions, citations, reading, selection, conversion, uncertainty, normal-static and sourced labels, plus its original knots and SI points. Return a recursively frozen bundle, including nested metadata and arrays, with no alias to mutable parsed input. Successful structural adaptation never promotes `draft` to `reviewed` or `not validated` to validated. Every mapping result identifies mapping `gefly.assessment-airspeed.normal-static-linear`, version `1.0.0`, and the source identity; mapped/range results identify the selected table. |
| **AA6** | Both modules are browser-compatible pure TypeScript: no Node, filesystem, DOM, network, provider, clock or renderer dependency. `cal_ias_mps`/`cal_ias_valid` are evaluator-derived, outside `ind` and the simulation/replay digests (SCENARIO-CONTRACTS C4). Eventual assessment records must pin source ID/version/byte hash, mapping ID/version and evaluator artifact hash and rederive from per-step recorded CAS/flaps. This slice implements no recorder/replay, cockpit indication, dynamics, target bands, stall/VFE gates, exercise pass/fail or UI. Missing IAS is unavailable, never an accepted exercise criterion. |

The source adapter validates the consumed representation and monotonicity. It
does not establish POH revision applicability, aircraft-model accuracy, source
rights or educational validity. In particular, preserving a `reviewed` source
label would preserve the label, not independently confirm it.

## Verification cases

Independent quality and validate reviews check AA1–AA6 after integration. Use
Node's native TypeScript support (24.2 or later) and the shared test reporter,
without downloaded dependencies. A structural test is not physics validation.

| Case | Expected observation |
| --- | --- |
| **AA-T1** Real repository source | Adapt the committed file with its actual byte hash; assert 7/5/4 points, exact source identities, draft/not-validated labels, S17 citation and condition metadata. Mutating the parsed input after adaptation does not alter the bundle; nested output metadata and arrays are frozen. |
| **AA-T2** Anchor sweep | Each of the 16 stored CAS anchors returns the corresponding stored IAS exactly. Explicitly cover all six table endpoints and different outputs for a shared CAS with different flap tables. |
| **AA-T3** Independent interpolation | At flaps 0°, CAS `30.35225` m/s (midpoint of 28.8089 and 31.8956) gives IAS `28.29445` m/s. At flaps 30°, CAS `33.5675` m/s (quarter between 32.41 and 37.04) gives IAS `32.1528` m/s. Compare with a predeclared arithmetic-roundoff tolerance, not an aircraft tolerance. |
| **AA-T4** Detent selection boundaries | Check all six directly computed radian limits, plus representable values immediately inside/outside; no epsilon expands the interval. Check 20°, transit, and degree-like numbers supplied as radians produce no table. |
| **AA-T5** No extrapolation | Test below/above each table's extracted CAS range, including a positive representable neighbour of an endpoint. Result has null IAS, the correct direction and exact boundary point. Source-point equality remains mapped. |
| **AA-T6** Invalid samples | NaN, both infinities and negative CAS; NaN/both infinities in flap radians; documented CAS-before-flap error precedence. No coercion of strings or null at the numerical boundary. |
| **AA-T7** Malformed repository data | Independently mutate table identity/static source/count, units/references, nonfinite/negative points, duplicate/reversed IAS or CAS, condition/citations/status/version/hash. Each is rejected with its field path, without partially returning a bundle or mutating input. |
| **AA-T8** Separation and reproducibility | Repeat valid/range/unavailable calls, verify provenance/version metadata throughout and unchanged inputs; inspect imports/API for browser purity and absence of instrument/digest/band side effects. No live simulator or replay success is claimed. |

Stored SI values are rounded to four decimals. A later band-classification slice
must freeze its quantization/boundary comparison policy before comparing those
values with exact knot-converted targets. This work deliberately leaves that
separate criterion open.
