# Wider display terrain overview

Task 2.0.162 design contract, recorded 2026-11-05 23:20 Europe/Berlin by Codex
housekeeping alongside the server and display implementation streams.
[SPEC](../SPEC.md) remains authoritative for R-WORLD-11/R-WORLD-9/R-WORLD-2;
this document describes the assigned implementation boundary and proposed
verification, not an accepted delivery. Independent quality and validation are pending.

## Observed gap

Native contact terrain currently retains a 3×3 neighborhood of 1/32-degree
world30 cells, each 129×129 nodes. Near Cape Town that neighborhood spans about
8.65×10.42 km. It protects local contact detail but cannot provide detailed
mountain silhouettes across an ordinary distant view.

The actual Cape source probe loaded all 16 canonical source owners successfully
for each tested neighborhood. From FACT (−33.9715°, 18.6021°), the Table Mountain
sample (−33.9628°, 18.4098°) is 17,760.35 m away and 14,082.78 m beyond the
resident neighborhood edge. At that location the coarse one-degree fallback
supplies 445.556 m physical height, whereas the sampled Copernicus surface is
1,064.745 m. The CBD neighborhood already contains Table Mountain and supplies
that Copernicus sample. These measurements identify a display coverage gap,
not missing Cape source data. Distances use the probe's spherical 6,371,000 m
approximation; source height conventions remain distinct from survey truth.

The Hessen checks identify a different situation: 449,307 composed regional
nodes across three tested neighborhoods are unchanged with Copernicus enabled
or disabled. Local native callback heights and units are correct, and a fresh
ordinary forward EDFE view shows Taunus relief. The overview must preserve that
existing regional geometry; it is not a replacement for the Hessen source.

## Display and simulation separation

Add a background **display-only** 3×3 neighborhood of quarter-degree cells,
each with 129×129 nodes. Its 1/512-degree spacing is approximately 217 m
north–south, with longitude spacing varying by latitude. This is resampling of
the existing 30 m source, not new measured resolution or accuracy. Its wider
coverage remains finite; beyond it the explicit coarse world horizon remains.

The rendering sampler resolves heights in this order:

1. The exact existing atlas: bundled fine terrain and current/retained world
   cells, including its established precedence and transition behavior.
2. A complete, validated display-overview cell where available.
3. The existing coarse world surface.

When composing overview nodes, valid regional physical/geoid samples take
priority. Otherwise use available Copernicus physical height H plus the existing
coarse world geoid N; rendered ellipsoid height is H+N. Remaining unavailable
nodes cause the whole composed overview cell to be omitted. Do not fill its
internal gaps with abrupt coarse-height substitutions or create a half-valid
mixed overview patch. Unavailable overview coverage leaves ordinary display
fallback usable.

Preserve continuous exterior transitions and shared cell borders with two
exterior joins. First form an overview baseline: exact overview samples inside
its cells, with a 0.125-degree exterior correction back to the coarse world.
Then retain the exact existing atlas everywhere it is valid; only outside that
atlas apply its existing 0.125-degree exterior correction toward the overview
baseline. Neither join changes authoritative nodes, native contact slopes or
source identity. Test the overview's outer perimeter as well as its shared
internal edges; moving a discontinuity outward is insufficient.

Overview data never enter native slots, worker contact sampling, state/digest,
pressure, aircraft controls, AP guidance, recorded native source codes or the
native predictive-loading contract. Keep the current native-detail label; report
overview availability/resampling separately. Do not reinterpret legacy quarter-degree
world identities as overview identities, or report overview detail as live
contact fidelity. Loading is optional and starts after current terrain readiness;
it must not gate Start, advance simulation or pause a running flight.

## Versioned transport

Use the existing same-origin service and fixed Copernicus host; add no host,
credential, external style service or dependency. The version-1 native endpoint
retains its bytes, coordinates and behavior. The distinct display route is:

`/scenery/elevation/copernicus-overview/{col}/{row}.bin`

| Field | Contract |
| --- | --- |
| Columns / rows | 1,440 × 720 quarter-degree cells |
| Accepted coordinates | Integer col 0…1439; integer row 1…718 |
| Cell bounds | West −180+col/4 degrees; south −90+row/4 degrees; span 1/4 degree |
| Body size | Exactly 66,628 bytes: 64-byte header plus 129² float32 heights |
| Header bytes 0…7 | ASCII `GFCOP30` followed by NUL |
| uint32 little-endian at offset 8 | Version 2 |
| uint32 little-endian at offsets 12 / 16 | Requested col / row |
| uint32 little-endian at offset 20 | 129 nodes per side |
| Bytes 24…63 | Reserved; all zero |
| Height payload | Little-endian float32 physical metres, rows south to north |

Strictly validate route, body size, version, coordinates, node count, reserved
bytes and source/response integrity before accepting heights. Invalid identities
and malformed responses are failures, not empty terrain. Keep version-1 and
version-2 pending/cache keys separate even for equal numeric coordinates.

Select canonical global sample coordinates and source posts before assigning a
sample to a cell. Neighboring cells must return identical shared-edge/corner
samples, including integer-degree source boundaries and the wrapped dateline.
Longitude wraps; unsupported polar rows remain unavailable rather than clamped
into another cell. Native flight latitude restrictions are unchanged.

## Resource and lifecycle bounds

The overview client uses at most one active request, nine active cells and a
32-cell cache. A batch has a 15-second budget. Regional precedence uses a
bounded shared temporary 3×3 regional source pool. The client requests the
current neighborhood in background, then applies one completed current-generation
batch. It does not rebuild the globe once for
each of nine arrivals. Unchanged overview identities/geometry are reusable
through safe existing native-window updates; obsolete completions cannot replace
the current generation. Preserve the provider's existing conservative checks
when native geometry actually changes.

The server shares its current 64 MiB cache, four upstream range slots, 32 pending
cell limit and 15-second cell-job deadline across profiles. At most one overview
job occupies the two shared active cell slots, reserving one for foreground
version-1 native demand. With no overview active, version 1 retains both slots.
The new route does not create a second decoder pool, cache budget or unbounded
queue. Existing fixed-source range, compressed/uncompressed size and source
ETag identity checks remain in force.

The explicit display gate is `setDisplayOverviewActive(active, retain)`.
`(true, false)` permits loading after current terrain readiness; `(false, true)`
cancels in-flight work during current native-terrain loading while retaining
completed overview cells; `(false, false)` cancels and clears for Review, flat
mode, reset/new flight and disposal. Neighborhood changes cancel stale in-flight
work. Never install a late live batch into Review or a new-flight epoch. Cancellation/failure cannot cancel independent foreground
native demand, mutate flight state or resume a paused flight. Failed/partial
optional cells do not block healthy cells or ordinary coarse fallback.

## Proposed acceptance evidence

These checks are a verification proposal for the integrated revision. No row is
accepted merely because a transport/schema test passes.

| Area | Observable check and expected result |
| --- | --- |
| Native isolation | Replay the same fixed-step input fixture with overview loading off/on, successful/failed/cancelled: native state, digest, terrain callback heights/slopes and nine-slot identities are exactly unchanged. Wall-clock loading speed is recorded separately. |
| Hessen precedence | Repeat EDFE, Feldberg boundary and Vogelsberg fixtures; existing fine/regional samples and native physical/geoid nodes remain exact with overview enabled. |
| FACT distant relief | Start at FACT and obtain actual overview responses covering Table Mountain outside the native window; show the mountain in an ordinary forward view and identify which overview triangles supply its geometry. The 217 m overview need not reproduce the exact 30 m sample height of 1,064.745 m. |
| Finest GPU agreement | Compare actual loaded GPU terrain at FACT/Table Mountain, Hessen and source boundaries with the declared SW–NE shared triangle surface; absolute difference ≤0.25 m when the finest mesh is available, retaining the existing implementation budget. |
| Visible far LOD | Record actual selected LOD and CPU/GPU errors separately when the visible far mesh is coarser. Do not claim finest-mesh parity from an overview screenshot or an unloaded mesh. |
| Borders and fallback | Check both sides of shared edges, corners, internal missing cells and exterior overview/coarse transitions, including motion, dateline and unsupported polar rows. No artificial vertical wall; exact existing atlas remains unchanged. |
| Static lifetime | After one settled batch, repeated identical notifications cause zero additional overview-triggered globe rebuilds or requests. No timed reload loop while paused. |
| Moving lifetime | Cross successive native and overview windows in real 10× flight; record batches, provider replacements and requests. Zero whole-provider replacements for ordinary completed overview-window changes after initial activation; preserve immutable overlap/history and source-only metadata updates. Record and investigate every unrelated native reset rather than attributing it from timing alone. Verify visible GPU heights after both crossings, plus queue settlement at default and narrow FOV. |
| Foreground priority | Hold an actual overview job, then submit native version-1 demand; it enters the reserved cell slot without waiting for overview completion. Verify one overview maximum, two total cell jobs maximum, and two native jobs permitted without overview. |
| Bounded work | Measure high-water counts: client active requests ≤1, active overview cells ≤9, cache ≤32; server shared cache ≤64 MiB, upstream slots ≤4, pending cells ≤32, cell deadline ≤15 s. |
| Invalid/failing input | Wrong version/coordinates/header/reserved bytes/length/hash, missing/nodata source, saturation and timeout leave native flight and ordinary display fallback usable; no incomplete overview cell is installed. |
| Lifecycle | Cancel during movement/reset/Review/flat/dispose, then release delayed responses. No stale installation, uncontrolled retries, unintended resume or live data replacing selected Review terrain. |

Use independent quality and validation on a frozen integrated revision, including
actual source responses, rendered geometry and measured resource counters.
A mocked transport fixture alone cannot establish source applicability, visual
coverage, nonstarvation or browser performance.

## Source rights and evidence limits

Reuse the existing [Copernicus inventory](../../app/public/terrain/copernicus/SOURCE.json),
[retained licence](../../app/public/terrain/copernicus/LICENSE.pdf) and
[modified-data attribution/disclaimer](../../app/public/terrain/copernicus/README.md).
The fixed public COG collection is a DSM including buildings and vegetation,
with EGM2008 orthometric physical heights. The coarse EGM2008 geoid remains an
interpolated reference; regional DHHN2016/GCG sources retain their own declared
references, provenance and licences. The display overview adds no redistribution
permission or surveyed airport/bare-earth/aircraft/training-fidelity claim.
Preserve accessible source credit and distinguish the 30 m source from the
approximately 217 m display sampling and the one-degree final fallback.

The following ignored local artifacts supplied the pre-change observations;
paths are evidence locations, not versioned delivery inputs. Their recorded
hashes describe those observations, not the later implementation:

- `output/flight/alps-source-cape-town.json`, SHA-256
  `fa4c422af25402489b882c60a297e0bff0d4c5b88efa0d86b08ddf764f4578d3`;
  probe `output/flight/alps-source-cape-town.mjs`, SHA-256
  `dff4328b05ccbe1771d193e4ba17e2e4e8fd9b14af6c67e94ac77b9c22a16246`.
- `output/flight/alps-source-hessen-priority.json`, SHA-256
  `65a9861c9e9f77a13ee0812408d1908d1eb12b474b8e332970966eb7e737dd00`.
- `output/flight/alps-renderer-forward-edfe.json`, SHA-256
  `e097c722d1e2e54e968370f37d4c06630e3a23dca032e6c8bd2ac4baac7750a1`.

The pressure startup defect is a separate investigation recorded in the
[separate pressure repair](https://github.com/gregoryyy/gefly/pull/90). Native build
provenance remains a separate limit; this display design requires no engine
rebuild and does not resolve the existing binary/build-record mismatch.

## Superseding reload constraint — recorded 2026-11-06

The user rejects the initial per-batch provider replacement described above. The accepted implementation direction is a persistent provider with at most32 detached immutable overview history cells, exact overlap/shared-edge checks and metadata-only credit/status refresh. Unknown detailed geometry must be deferred before it is cached, retaining provisional coarse parents and the complete future refinement hierarchy. Existing native64-source and512-preview safety guards remain. No private Cesium cache API or silent stale-height acceptance is permitted. Unavailable/capacity-conflicting optional updates remain explicitly pending while preserving the current provider; retry queues and future coverage must remain bounded and make progress. Source-accuracy and finest-contact budgets remain distinct from provisional far-parent LOD. Actual moving GPU/queue evidence is required before accepting the new direction.


### Resource and refinement contract

The loader has nine preloaded active quarter-degree cells, at most32 payload-cache entries,32 pending on-demand identities and512 immutable source-outcome metadata records per lifecycle. Preload and visible demand share one serial request owner and a15-second operation budget; foreground v1/native admission remains reserved by the service. Source/capacity conflicts preserve the current provider and expose pending detail rather than resetting it or accepting changed geometry. The renderer separately retains at most32 detached overview grids, its existing64 native display grids and512 protected-preview records. Counts describe separate stores, not32 total outcomes.

Unknown L10-and-finer geometry waits for required source outcomes before it is returned; necessary native-contact ancestors and coarser parents remain provisional. Full child refinement remains advertised, using public undefined/retry behavior. Finest L14 detail requires authoritative native coverage or stable inner fine coverage, rather than an exterior feather alone. A cached public-geometry screen-space-error calculation limits unsupported perimeter refinement; it reads camera/FOV, viewport, level error and public fog factor, without scanning height arrays each frame. Contact refinement is reported only when its conservative bound supports that claim; high-altitude/unsupported cases remain explicit. This is a rendering budget, not a physical contact or aircraft parameter.


### Settled fallback after optional admission stops

A geometry/history conflict or the512-outcome limit closes optional admission for the explicit display lifecycle. Retain the current immutable overview/collar/world surface and let unknown far-detail geometry use that fixed baseline, allowing retry queues to drain without recording unbounded missing-owner entries. Stop loader work persistently, expose the reason, reject new/changed geometry and preserve metadata-only equal-height updates. Propagate closure through any routine provider replacement; only explicit display reset/Review/new-flight lifecycle can reopen it. Native contact remains independent and exact. This is visible bounded loss of future optional enhancement, not a missing-source assertion or an automatic scenery reset.
