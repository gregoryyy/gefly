# PR85 vector-terrain performance quality renewal

2026-11-05, Europe/Berlin. Independent Codex quality reviewer; not an
implementation author. Cross-provider peer acceptance remains pending.

## Artifact and outcome

**No blocking source finding in this bounded PR85 renewal.** Reviewed commit
`641e09cd29421453a87f46922c09a41c985dd99c` in isolated
`feat/terrain-world-foundation`, its three changed implementation/test files,
and the proposed R-WORLD-11/ARCH clarification. SPEC snapshot SHA-256 is
`9d9b2d6338d8b4dd7a7d1feff178df709d66a7cfedf5e1606747af71a9647a9b`.
This is code-quality acceptance of the coarse-profile port; an actual PR85
moving-browser performance/height run was **not executed** in this renewal.

This PR contains no Copernicus integration, main-workspace display-status-cache
module or imagery-backpressure change. Original-workspace New York browser
results explain the update mechanism; they are not PR85 runtime results. No
uniform latency, zero-pop, survey, aircraft or training-fidelity claim follows.

## Source, numerical and lifecycle review

- [Global terrain](../../app/src/global-terrain-provider.ts) replaces 4,050
  eager roots with two standard geographic roots and progressive 181-node
  geometry. Once full width is reached, 180 intervals give 2^-L degree spacing:
  legacy native nodes align at L9, distant geometry stops at L12 and fine-area
  geometry at L14. Source-edge snapping, physical H+geoid addition, source
  priority, native ABI and terminal child masks remain intact. The geometric
  estimate uses actual spacing and diagonal curvature; it is not a universal
  terrain/GPU error bound. Finer subdivision adds no source observations.
- Provider-owned snapshots and a WeakMap-owned update closure accept only
  strictly validated live sets of 1–9 unique, homogeneous-profile world cells.
  Existing bounds and every H/N node must match exactly; shared edges/corners,
  including dateline aliases, are checked before commit. Reassigned slots and
  detached metadata do not modify geometry. Rejection leaves the installed
  sampler unchanged and selects an ordinary rebuilt provider.
- History caps at 64 source snapshots, with at most one extra credit example;
  source arrays are copied rather than aliased. Finest-used sources cannot be
  evicted. At most 512 conservative finest coarse/feather-sensitive rectangles
  protect previously returned geometry. The .02° eroded fine interior matches
  the blend exclusion. Changed values, protected intersections, profile mismatch,
  overflow or pinned-capacity pressure deliberately rebuild. These bounds cover
  owned vectors/tracking, not total Cesium/GPU/process memory.
- Static Review construction accepts 0–73 generally valid grids and filters
  world sources as before. Empty, >9, mixed/duplicate or non-world unions cannot
  enter live updates. Valid older regional grids remain ignored by this global
  factory; that preserves compatibility without claiming complete historical
  terrain fidelity or introducing new regional precedence.
- [Scene integration](../../app/src/scene.ts) computes world classification at
  installation, ignores duplicate/reordered immutable object sets and uses a
  global revision key instead of rebuilding merely for an aircraft-cell change.
  Live reuse requires an eligible provider and no recorded-cache cells. Empty
  installation invalidates eligibility; accepted updates avoid assigning the
  globe provider. Archived/cache Review contexts use the static path. Review
  wholly within already-live terrain need not replace its provider. Fixed-step
  dynamics and native residency remain separate. No Cesium private mesh API is
  introduced.

Earlier prototype defects—rejecting 18-cell Review unions and retaining stale
source metadata after equal-height updates—were repaired before this port. The
current compatibility and metadata/slot regressions were read and executed.
PR85 retains its existing source credits; no Copernicus support is inferred from
shared optional metadata shapes.

## Checks and evidence limits

Independently executed from `app`:

```sh
node --test src/global-terrain-provider.test.ts src/streamed-terrain-provider.test.ts
```

**27 passed, zero skips.** Cases include aligned interpolation/geoid, negative
terrain, dateline, root work bounds, diagonal error, six cloned overlap cells plus
three new cells, changed-value rejection, fine feather, history/footprint
overflow, static Review unions, older regional filtering and slot reassignment.
These are meaningful public terrain-data checks; they do not execute a complete
browser Review/flight lifecycle or prove final GPU accuracy at arbitrary sites.

Inspected supplied TypeScript success and final
`output/flight/map-stable-ci-final.log`: it ends “Foundation CI: passed with
skipped checks”, including **nine of 23 optional JSBSim study tests skipped**.
Those skips are not passes. CI precedes final report/shared-document integration;
the integration owner must renew affected documentation/assurance gates.

The separate main-workspace instrumented New York run demonstrates that public
stable updates can retain a provider while real native windows move. It uses a
different integrated source/data profile. Its 22 rendered-height samples and
latency/counter results are explanatory evidence only; none is credited as an
actual PR85 browser result. Final-source browser latency, sustained visual
continuity, native-state invariance and hardware/device coverage remain bounded
or unexecuted for this PR85 renewal.

Runtime build provenance remains unverified as already recorded in the terrain
foundation review; this renderer change does not rebuild or validate the native
binary. Source quality is separate from specification validation and peer review.

## Frozen identities

| Isolated-worktree path | SHA-256 |
| --- | --- |
| `app/src/global-terrain-provider.ts` | `318f1b3923d67c64d81237d75480830685bbde22224f16f3bc7db1051e855692` |
| `app/src/global-terrain-provider.test.ts` | `8f0d2f8a84500bcb58bf8ad9ed9a8cd32da716c7a36ca313389b1b8164cbd8d7` |
| `app/src/scene.ts` | `99cc92f8f23c1cd7c3a83b9149b5a3cbf2381f7a9921c76c403f60bb75f9176c` |
| `output/flight/map-stable-unit-final.log` | `d1a9e1fa9b7307dcfffdd2df33abba52fc4678b83718487e25bf4d7c6d517fb6` |
| `output/flight/map-stable-typecheck-final.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/map-stable-ci-final.log` | `7d0278228e84b4181342b30a3deb05f1bf3fa5d596b3e897197531847e17e85a` |

These hashes were independently checked. Ignored `output/` artifacts are retained
locally, not distributed by a fresh checkout; paths are identifiers rather than
portable links. The tracked command above reproduces the affected unit checks
with documented dependencies. Only this assigned report was written.
