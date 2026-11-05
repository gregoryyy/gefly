# Terrain foundation independent quality review

Date: 2026-11-05 17:25 Europe/Berlin. Reviewer: independent Codex quality agent;
not an implementation author. Cross-provider peer review remains pending.

## Artifact and outcome

No blocking implementation finding in the bounded coarse-terrain/cartography
slice. This is a source, numerical-boundary, security and test-quality review,
not specification acceptance or aircraft fidelity validation.

Reviewed the isolated `feat/terrain-world-foundation` worktree against
`700dd5386125f9864a391f85b277cb71da55290a`. Production code is identified by
`68cdcbf9a4b51cfcce4b8cea11b7dc06cfafbf93`; subsequent revision
`7709982c69b542384db7d8414131b9abac41e44d` changes research whitespace only.
Reviewed the additional SPEC-only clarification at
`6d1b6a6f4ebd231d71c6b41a2cbfc5b1d7e59643`: superseded airport/cartography
wording, historical regional extent, and separate five-second optional manifest
and halo budgets. Its production source is unchanged.

Scope is the five-state regional terrain, masked samples, quarter-degree
`world-c` coarse fallback, global renderer horizon, source metadata/recordings,
and shared 49-layer OSM cartography. Copernicus, new airfield ground surfaces,
later planner/UI changes and their main-workspace evidence are excluded.

## Findings and reasoning

No critical, high or medium implementation defect was established.

- [World asset compilation](../../utils/terrain/build_world_fallback.py) pins
  numerical source bytes, validates coordinates/registration and writes explicit
  little-endian physical heights plus geoid undulation. It preserves negative
  inland heights, respects ocean polygon holes, declares the connected-ocean
  selection, and duplicates the longitude seam. The one-degree source spacing,
  polar averaging and approximate coastline/datum transitions are disclosed;
  quarter-degree subdivision does not add source measurements.
- [World streaming](../../studies/e1-browser/sim/terrain-stream.js) separates
  geographic identity from nine reusable native slots. A complete replacement is
  staged before synchronous remove/install between simulation steps. Cancellation
  precedes commit; caller cancellation is distinct from optional regional
  degradation. Manifest/index and source-halo budgets are each five seconds,
  rather than a combined five-second startup guarantee. Failed regional sources
  remain unavailable for that stream; they are not silently retried into a
  different adjacent-cell surface.
- [Worker](../../studies/e1-browser/sim/worker.js), session and trace boundaries
  preserve source flags and pause/loading intent. Source checks reject forged
  world identities, mismatched bounds, slot collisions and unsupported terrain.
  The native missing-sample change accepts NaN only through the explicit masked
  path; interpolation refuses unsupported triangles. Empty renderer meshes use
  a zero-area repeated-index primitive rather than invented ground.
- [Scene](../../app/src/scene.ts) creates the Review abort controller before
  optional manifest loading, invalidates prior requests even on cache/empty
  returns, checks request version before installation, and caps recorded cells
  at 64 plus live cells. Review reconstruction remains separate from native
  state. These lifecycle paths were source-reviewed; the supplied two-group
  browser execution does not establish their full runtime matrix.
- Global display sampling keeps physical height and geoid addition distinct,
  bounds higher LOD, and snaps only roundoff-close source edges. Independent
  sampler tests cover native triangle correspondence; they do not establish
  universal GPU mesh accuracy or survey accuracy. Fixed OSM routes retain byte,
  queue, cache and concurrency bounds. Names are bounded inert canvas text;
  local fonts add no external glyph, sprite or executable resource. Source
  credits remain present in both views. Photography remains regional and
  independent of native terrain.

## Checks and evidence

Independently executed in this isolated worktree:

```sh
node --test studies/e1-browser/sim/world-terrain.test.mjs studies/e1-browser/sim/terrain-stream.test.mjs app/src/global-terrain-provider.test.ts app/src/masked-terrain-mesh.test.ts app/src/world-map-style.test.ts app/src/streamed-terrain-assets.test.ts
PATH=/Users/gregor/.pyenv/versions/3.11.12/bin:$PATH node --test app/src/session.test.ts app/src/flight-trace.test.ts app/vector-map-server.test.ts app/scenery-server.test.ts
/Users/gregor/.pyenv/versions/3.11.12/bin/python3 -m unittest discover -s utils/terrain -p test_build_world_fallback.py
```

Results: 24 + 106 Node tests and 10 compiler tests passed, zero skips. The second
Node command initially failed during fixture creation because default Python
lacked Pillow; the displayed environment corrected that prerequisite and the
entire command passed. No reviewer browser, engine rebuild or new test was used.

Independently checked all six supplied handoff evidence hashes against their
local bytes. `output/flight/pr1-handoff.json` SHA-256 is
`87f5d8bcf6ea86508520fcf2698a2af0a221f73975686b4525453929fafb6067`.
The supplied unit log records 442 Node and 22 Python passes; the build log records
a successful production build. Actual-worker log `output/flight/pr1-native-world.log`
SHA-256 `3010ee8d4d63e6187be92c6ad4b69244891bdd38a7949cc892d2832724d0d7d9`
reports seven checks, including Japan, antimeridian movement, corrupt optional
and required inputs and pause during loading. This execution is supplied author
evidence, not a reviewer rerun.

The supplied browser log and JSON record exactly two passing groups:
NY/Tokyo public cartography components and an actual paused outside-region app
with sampled rendered height, source credit, layer ordering and unchanged native
state through map/photo changes. The JSON is explicitly `creditOnly: true`.
`output/flight/world-map-task135-credit-browser.json` SHA-256 is
`6f21d3b6ff69d3ca18682a94a4aa61bf98e76b41b5e8dd8b731b639632a4bdf0`.
Regional imagery in this fixture is substituted image data. The fixture's other
Review, cancellation, border-flight and cache cases were not executed in this
two-group run and are not credited here.

The integration owner's `output/flight/pr1-ci-final-publication.log` ends
“Foundation CI: passed with skipped checks”; nine JSBSim Python-study checks
were skipped. Its SHA-256 at review is
`8c47aee6b42b438ae42a867b5a2e53a35a9c5d85e1b8b47dc67ce6a5f0a5e0b3`.
This code-level CI predates the final SPEC clarification and review reports;
the integration owner must renew final document/assurance checks. Historical
assurance warnings do not establish current acceptance of older reviews.

Evidence files under `output/` are ignored local artifacts, retained in the
review worktree rather than distributed by a fresh checkout. Hashes identify
the inspected bytes, not permanent public availability. Reproduction uses the
tracked unit commands above and `npm run test:world-fallback` from `app`, with
the documented local runtime, browser and public-source/network prerequisites.

## Limits and frozen identities

The retained actual WASM is
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`;
its source/build correspondence is unverified against the different local
build-info identity. Observed native behavior is evidence about those bytes,
not proof that this PR's C++ source produced them. No survey/airport landing
fidelity, global GPU error bound, device/browser matrix, static-host deployment,
training approval or cross-provider peer acceptance is established.

Selected source/asset identities, independently hashed:

| Path | SHA-256 |
| --- | --- |
| `utils/terrain/build_world_fallback.py` | `cb5d1ced9503e31483fe402649c6b417bcec8ac0c528320d98cd1f2b768e9106` |
| `app/public/terrain/world/world-v1.f32` | `36d07b3e7ef82882402ebeca41a3f3842900a91baac9b4ef29fe43d9b007d099` |
| `studies/e1-browser/sim/world-terrain.js` | `bb8f030cb14283e827aa704e2c32cce6a0d850a356786c75923a6c15dd649356` |
| `studies/e1-browser/sim/terrain-stream.js` | `26c6b7f50d143605916a34a8ca71a9e79c1564d8d5c0d3e6d7cdf29126e12995` |
| `app/src/global-terrain-provider.ts` | `e1245dc3ceed145093dcc231888ffc48a1d7351622109212f92e4ccfab64953c` |
| `app/src/scene.ts` | `8b8e533d7eee79a88e75b95f744d2278aa4a2ca2300b3900db18ba658d72c629` |
| `app/src/world-map-style.ts` | `3fee32d77e440ffa435fce7768dc29bdb6b16c1c657755eb614fb079a75081d8` |
