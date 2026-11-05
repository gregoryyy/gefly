# PR85 terrain performance validation renewal

2026-11-05 20:09 Europe/Berlin. Independent Codex validate, not an implementation
author. Reviewed source commit `641e09cd29421453a87f46922c09a41c985dd99c`
and the current scoped documentation. Wrote only this report; no reviewer
browser, implementation or additional test execution.

**The PR85 performance port passes bounded source/component validation.** Actual
PR85 moving-flight loading and renewed rendered-GPU acceptance remain **not
evaluated**. The later root application’s successful New York flight supports
the mechanism; it cannot establish this distinct legacy port’s browser outcome.
This renewal supplements the [foundation review](2026-11-05-terrain-foundation-validation.md),
against [R-WORLD-11/R-WORLD-9/R-SIM-2](../SPEC.md) and the
[loading](../input/2026-11-05-vector-terrain-loading.md) and
[reload](../input/2026-11-05-vector-terrain-reload.md) reports.

| Criterion | Expected versus observed at this source | Outcome |
| --- | --- | --- |
| Bounded root preparation and truthful refinement | Two hemisphere roots use5/9/17/33/65/129/181-node meshes. Full-width180intervals give2^-L-degree spacing, matching quarter-degree native nodes atLOD9. Far terrain stops atLOD12; fine coverage reachesLOD14 with corresponding advertised availability/child masks. Tests count roughly200 physical source reads for both root previews and check actual-spacing/diagonal curvature. | Pass — source/component |
| Preserve source heights, geoid and horizon | Tests compare public heightmap interpolation against the shared triangle sampler to1e-7m at four sites including both dateline sides, atLOD9/12; preserve fine540m H+N, polar/coarse horizon and negative heights. This is CPU/sample agreement, not a new GPU or source-accuracy bound. | Pass — source/component |
| Retain completed surfaces for safe live updates | Provider-owned snapshots isolate caller mutation. Exact H/N/bounds and shared-node checks precede atomic updates. Tests cover six cloned overlaps plus three new cells, dateline neighbors, rejected changed geometry, retained fine/coarse surfaces and metadata/native-slot refresh. Scene reuses the provider without assigning the globe provider on accepted updates. | Pass — source/component |
| Bound history and fail conservatively | Incoming live windows are1–9 homogeneous valid grids; history is64 plus one attribution example and coarse-preview tracking512. Protected finest sources, changed heights/profile, affected finest coarse/feather areas and unsafe capacity eviction reject reuse and rebuild. This permits legitimate replacements rather than promising no future reloads. | Pass — source/component |
| Preserve static recording and source epochs | Static constructor accepts0–73 grids, preserves prior older-regional filtering and disables mutation for combined/mixed/static inputs. Scene excludes archived/cached recording contexts from live reuse, classifies world presence on installation and invalidates eligibility on empty sources. Review using only already-live terrain need not replace the provider. No full NewFlight/Review/Continue lifecycle was exercised on PR85 at this renewal. | Pass — source/unit; lifecycle not evaluated |
| Integrate with distinct branch behavior | Source review confirms body-cell movement alone no longer changes global provider keys; identical/reordered installed objects avoid revision. This branch has cached world classification, but not the root’s later display-metadata helper, imagery-backpressure repair or Copernicus integration. Those benefits are not accepted here. | Pass — source scope |
| Actual loading, state and GPU results on this port | Root world30 production evidence has eight accepted10× updates with one initial provider,393textures and22public rendered picks within0.04911m. Root’s separate1200-step native comparison is exact. These are mechanism evidence from different sources, not a PR85 browser/native regression. No renewed PR85 time-to-detail, stalls, GPU-height, device or2D/photo matrix was supplied. | Not evaluated — PR85 runtime |

Reviewed test assertions and supplied execution records:27provider/streamed
tests pass, zero skips, plus TypeScript success. Final local `just ci` records
459application Node tests and22application Python tests passing. Its overall
outcome is **passed with skips**: nine of23optional JSBSim tests and one
Linux-only process-state repository-tool test were skipped on macOS. Skips are
not acceptance. No blocking source defect was found in this scoped port;
covering cross-provider peer review remains separate.

Frozen SHA-256 identities:

| Path | SHA-256 |
| --- | --- |
| [Provider](../../app/src/global-terrain-provider.ts) | `318f1b3923d67c64d81237d75480830685bbde22224f16f3bc7db1051e855692` |
| [Tests](../../app/src/global-terrain-provider.test.ts) | `8f0d2f8a84500bcb58bf8ad9ed9a8cd32da716c7a36ca313389b1b8164cbd8d7` |
| [Scene](../../app/src/scene.ts) | `99cc92f8f23c1cd7c3a83b9149b5a3cbf2381f7a9921c76c403f60bb75f9176c` |
| [SPEC snapshot](../SPEC.md) | `9d9b2d6338d8b4dd7a7d1feff178df709d66a7cfedf5e1606747af71a9647a9b` |

Ignored local-only evidence: `output/flight/map-stable-ci-final.log`, SHA-256
`7d0278228e84b4181342b30a3deb05f1bf3fa5d596b3e897197531847e17e85a`.
It is not a fresh-checkout asset. Reproduce the narrow component check from
`app` with `node --test src/global-terrain-provider.test.ts
src/streamed-terrain-provider.test.ts`, then `npm run check`; shared gate is
`just ci`. The source does not rebuild or modify native physics. Executing WASM
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`
still has unverified provenance against stale build metadata. No all-world
0.25m GPU, aircraft fidelity, training or operational acceptance follows.
