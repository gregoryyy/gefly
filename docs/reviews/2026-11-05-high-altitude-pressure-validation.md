# High-altitude pressure validation

2026-11-05 22:53 Europe/Berlin. Independent Codex validate; no implementation,
reviewer browser or new tests. Reviewed `5c846ca`/`cbcc192` against `774e914`,
[R-AIR-3/R-SIM-2](../SPEC.md), the
[user report](../input/2026-11-05-alps-terrain-walls.md) and
[ideal pressure model](../research/2026-11-02-pressure-altimeter.md).

**Recommend bounded repair acceptance.** Valid high-launch sensor pressure now
retains indication without expanding the selectable practice subscale. The exact
user flight and any connection to terrain walls remain unestablished.

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Independent raw/selected pressure bounds | Raw launch QFE uses the unchanged−2…11km ISA pressure-height domain; selected pressure/QNH remain80–110kPa. Actual handler/WASM starts at3/5km, terrain off/on, publish all six fields. QFE≈70.121/54.048kPa no longer hides valid STD/QNH. | Pass — four native cases |
| Setting actions and unsupported QFE | Manual100000Pa, actual QNH and101325Pa STD work. Raw out-of-subscale QFE is rejected with explanation and retains the applied setting. No atmosphere/control mutation introduced. | Pass — worker and browser |
| UI availability and low-QFE guard | Three actual Chrome156 component/real-Worker groups verify3km availability, disabled/explained QFE, working manual/QNH/STD;500m QFE remains selectable and reads exactly zero. Review/read-only/unavailable modal guards pass. Browser terrain is off; this is not the full simulator layout. | Pass — bounded browser |
| Recording and continuation | All four native launch cases round-trip six pressure fields through actual FlightTrace JSON. Continuation preserves selected pressure/QNH/rawQFE/datum, produces finite indications and retains pose within the diagnostic1e-5m check. Native32-double field order/length unchanged; this reconstructs state, not a checkpoint. | Pass — handler/native and source |
| Missing APIs and atmospheric limits | Extracted production functions in VM fixtures clear fields for missing exports, malformed pressure and unsupported current pressure, then restore complete data when valid. Actual11.2km native initialization omits all six fields and rejects setting commands. VM API removal is not an old-binary browser test. | Pass — fault/component and native case |
| Paused state and AP preservation | Setting/rejection tests preserve step/time/digest/full native vector. Browser explicitly engages AP and compares everykap_/ap_ field after pressure changes. Node recording fixture advances exactly one explicit diagnostic step only after paused assertions. | Pass — bounded actual evidence |
| Broader applicability | No actual instrument calibration/lag, aircraft high-altitude performance, full-page/device/terrain-on browser matrix or terrain-wall causal acceptance. Pressure altitude is not required to equal geometric altitude. | Not evaluated |

No blocking finding. Full branch472Node+22Python tests and TypeScript pass;
final shared CI passes with9/23optional JSBSim and1Linux-only repository
check skipped, not accepted;85assurance/11training checks pass. Peer pending. Supported
pressure arithmetic does not establish the aircraft’s flight envelope.

SHA-256 source pins: worker
`936cbf6516ac11d56be84c49bbbf683e43eaffa458a575c3dc660b7f2f8fd96f`;
continuation `eaaa62e88cdbc12e84081aa064dca5a8b04436492e9b2dd1c8172a46e4047820`;
panel `ac77e0f5ba3df8bb5285aa3bf8cd6943d36520770b6116059a79847e8eded7bc`.

Ignored local-only evidence under `output/flight/` requires retention:

- `pressure-start-worker-task159.json`: `4e346e354ba4f3c50f20e1097b38bf96854d11f555b196c188839ebe893f680e`; all five input pins independently match.
- `pressure-start-browser.json`: `52e1b05cf8670f55266d91eabb47f8aa6f1693a48beea2ab437e6be88cfd4682`.

Reproduce with `npm --prefix app run test:pressure-start`. Executed browser
script SHA-256: `f16cc7bd06a59340892986aa7d75a259edffc91a611b29776674eb91ca681ce0`.
WASM remains `11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`;
it differs from stale build metadata. Source/build provenance and aircraft/training
fidelity remain unverified.

Verified local-only `output/flight/pressure-ci-final.log` SHA-256:
`4757d0912bc85c133c206f1f28a5f7a5db965ef241515c824edb80b66b7b68f4`.
The earlier dangling Task158-reference gate failure remains historical.
