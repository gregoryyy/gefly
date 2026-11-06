# Distant terrain overview validation

Independent Codex `cws_validate`; final renewal recorded 2026-11-06 01:31 Europe/Berlin.
Scope: TODO2.0.162, the distant-display/lifetime increment of R-WORLD-11, with
applicable R-WORLD-2/R-WORLD-9 and R-SIM-2 isolation constraints. Base
`e4a1b5827315f2d09e790db60eb6741d5620b6a2`. I edited this report only and did not
implement the terrain, loader, helper, browser harness or criteria.

**Recommendation: pass the bounded implementation at the pinned source below.**
Actual-source FACT evidence supports the reported distant-relief and repeated
provider-reset repair for the tested flight and FOVs. This does not pass all of
R-WORLD-11, every viewpoint/network/lifecycle schedule, unbounded travel,
installed-aircraft/DEM fidelity, a release or cross-provider review. Remaining
not-evaluated rows are explicit. Final publication/ROOT integration records and
assurance lineage remain the orchestrator’s responsibility.

## Frozen source and checks

| Path | SHA-256 |
| --- | --- |
| `app/src/terrain-overview.ts` | `3c6dd9862a25f67ae933dba4f6b9657fa28bd435d6ec77628661681b8fdd8af8` |
| `app/src/terrain-overview.test.ts` | `ad272b9445cd4c2f1a9b3b865a199cd26b4a95269f2e3e5597a81bcc24ab2290` |
| `app/src/global-terrain-provider.ts` | `e9675b7982a16c65d6b01590886cc591182abc671fa007efbf0c7851888355ca` |
| `app/src/global-terrain-provider.test.ts` | `484d8a91ec46a6919eb57552ccdd434cd64243908da73b65a0690cd2413003bd` |
| `app/src/terrain-detail-budget.ts` | `9fd44064680a4c755cbd60f8c23fe21b45058d573d82a1cf514c4bfb5809ba33` |
| `app/src/terrain-detail-budget.test.ts` | `c1727e13706ef76c4e3fc581a8d8255c043a80316c24df8e8f846bbdbc3b0bfc` |
| `app/src/scene.ts` | `a0ef7f48d433f054d91b4291ca250592434414e4ba29d35a195c7a8738000b9b` |
| `app/src/main.ts` | `23bbd85603b1c45c50e7c9902895ca9293616e1d15eb849b48c42d38fc990413` |
| `app/src/types.ts` | `ff5d4adaec262877e680b9a9ab177aa002f2737636462a1fd3d56169e13ae1c7` |
| `docs/SPEC.md` | `68731bce7e75436467430374a58a3ee206581232e2efa5f9f63ec1d1535063e4` |
| `docs/SEC.md` | `f4fd9d85f139b9c221b0b79fd0d05bccd35ff805b17ff3faf2aa11b9fc2f5c28` |
| `docs/design/terrain-display-overview.md` | `caba3398842e37b477390ed3055ca5e2ff85e5bbcab7633a6525d24e0279ae5a` |
| `studies/e1-browser/sim/terrain-overview-isolation.mjs` | `b751192d4f0e5e41548b8eb7105bb44bac34cb7cc0959e5822869856606d23f8` |

Read AGENTS, validate role, SDLC/STYLE/SEC, relevant SPEC/TODO/EVAL, design and
source records. The authoritative resource wording now distinguishes9 preloaded
active cells,32 cached grid payloads,32 scheduled demand identities including
inflight work and512 immutable source-outcome metadata. Renderer overview32,
native history64 and protected-preview512 are separate stores. The documented
capacity policy closes optional admission, retains an immutable baseline, drains
unsupported far meshes and explains reset-to-resume. It is visible loss of
future optional enhancement, not unlimited continued detail or a globe reset.

I independently renewed:

`node --test src/terrain-overview.test.ts src/global-terrain-provider.test.ts src/terrain-detail-budget.test.ts && npm run check`

Final **59 passed, zero skipped**, then TypeScript passed:33 provider,21 loader
and5 pure-helper groups. Earlier46/55-test runs are historical overlapping
checks, not additional unique passing cases. I also independently ran
`node --check app/tests/terrain-overview.browser.mjs` successfully and inspected
the portable-versus-executed harness diff, limited to module/path/cache/output
setup. The portable copy was not represented as another actual browser execution.

## Actual-source browser evidence

I inspected the executed author-run harness and complete artifact, compared
source pins, read individual probe/state/queue results and viewed its Table
Mountain screenshot. This is independent inspection of author-run integration
evidence, not a second GPU execution by this reviewer.

| Artifact | SHA-256 |
| --- | --- |
| `output/flight/terrain-overview-no-churn.json` | `8b76482821631306d1ccfc84209f370a053fc342ccc55b5a269e1dbcf151d4d6` |
| Executed ignored `output/flight/terrain-overview-no-churn.browser.mjs` | `480fb71ade120d8ca2ee8f7cc3bea1af4b67ca24dbe1f40127054bb99535e2e4` |
| Portable `app/tests/terrain-overview.browser.mjs` | `9e0736ab252076cf675a1053d4bbea37af3b85e93000764f2b92af0cd22d0f80` |
| Table screenshot | `89694fc87a8685a4c428d4f97df6245340e4c668441621b6d89c74bc1e8a2a66` |
| Contact screenshot | `e2660179db35f3c62c092d5c0038732bdcec7d95a3878f09c523387db4853096` |

Chrome156.0.8078.80, actual app/worker/unchanged WASM and actual public service
responses:135 elevation HTTP200 responses, no page/render errors, thirteen named
checks true. Seven production-file before/after hashes match. Module observers
expose closures/log events; separate CPU providers avoid mutating live provider
guards. Private render-list reads diagnose selected LOD only; production uses
public Cesium APIs. Synthetic metadata/capacity components are explicitly
labeled, and metadata is restored before actual-source geometry probes.

| Probe | Selected render LOD | GPU minus matching overview triangle | Settled queue wait |
| --- | --- | --- | --- |
| FACT west/Table, default60° |10|−0.000231894m|4104ms|
| FACT west/Table, minimum20° |11|−0.000050965m|2626ms|
| Fresh east25km ahead, initial default |10|−0.000355171m|7055ms|
| First quarter crossing,25km ahead |10|−0.000268128m|1ms|
| Second quarter crossing,25km ahead |10|−0.000219521m|2558ms|
| Final25km ahead, default |11|−0.000043634m|3836ms|
| Final25km ahead, minimum20° |11|−0.000043634m|3980ms|

Every listed snapshot has `tilesLoaded=true` and zero final queue. The fresh
1900m FACT eastward10× flight reaches880.2167 simulated seconds, centers
794→795→796 and16 native-install notifications. There is one initial provider
assignment and zero afterward, including both crossings. Sampled overview
history/cache maximum18, pending0; capacity component later reaches21, still
below32. Correct source triangles/GPU results after each crossing support the
lifetime result beyond a provider counter alone. Table overview H1060.863280m
is distinct from the earlier30m fine sample1064.745383m; the overview resampling
adds no measured accuracy.

A separate renderer-only near-contact pose at native H+0.25m leaves the worker
paused. A successful live public source-L14 geometry result covers the point;
the visible L23 tile is an upsampled descendant, not a new source resolution.
Public GPU941.4120410148m versus native H+N941.5721157696m differs by
−0.160074755m, within0.25m. Native H/N digests and paused published worker state
remain unchanged. This is renderer/contact-surface agreement, not an actual
landing/contact maneuver or a universal airborne-L14 guarantee.

## Native component isolation

Inspected final production-module harness and artifact
`output/flight/terrain-overview-isolation.json`, SHA-256
`aa55ebc016102a635752a9d4453bc3ef7b0192cb465f7aea2b10c2e2b46a5ff9`.
Four modes off/on/failure/cancel each execute1200 fixed steps under identical
initial conditions/loading/timed inputs. All initial/final nine H/N identities,
published physical fields, exposed14-value native stats vector bits and rolling
digest match. ON publishes9 deliberately high synthetic overview cells bystep400,
then800 more native steps execute. Digest `b811e811a34c4f87`, vector SHA-256
`59f3a0c54f54baadcb1309da3d5b11e115f9f251f075a0032683eff545f9641f`.
Two declared wall-only fields are excluded. Equal authoritative grids plus
unchanged contact code support input/surface invariance, not independently
surveyed gradients or complete hidden-integrator checkpoint identity.

This component fixture uses explicitly synthetic v1/v2 replies and the actual
worker handler/WASM; it is not the real DEM/browser run. WASM SHA-256
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`
remains different from the retained old build record, openly reported by the
artifact. Native build provenance remains unresolved.

## Criterion matrix

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Display transport/identity/integrity | v2 identity/header/bytes/reserved fields, fixed source, strong body ETag and finite supported values precede use; malformed/tampered fixtures reject; display objects fail native validators. | pass for unit/source boundary and actual valid responses |
| Regional/atlas priority and whole-cell policy | Regional H/N wins, absent samples use Copernicus H/existing N, remaining nodata omits whole cells; exact native/fine atlas is sampled before display correction. CPU tests check priority and both joins. | pass for synthetic composition/provider cases; actual Hessen renewal not evaluated |
| Shared edges, corners, dateline/poles | Unit tests exercise canonical edges, corners, exterior correction, wrap and geographic guards; mismatched adjacent H/N rejects atomically. | pass for covered CPU fixtures; actual global GPU survey not evaluated |
| Ordinary provider lifetime | Actual880.2167s east flight/two crossings keeps the initial provider; crossing/final GPU surfaces remain current and queues settle. | pass for measured flight |
| Distant relief | Actual west FACT view visibly shows Table relief beyond native window, with source/triangle/public GPU identity and explicit far LOD. | pass for measured view |
| Default/minimum-FOV progress | Seven real snapshots drain and show valid surface detail at default60°/minimum20°, including both crossings. | pass for tested viewpoints; arbitrary geometry/altitude not inferred |
| Finest current-native GPU surface | Successful public source-L14 result at current point, selected descendantL23, public GPU error−0.160075m≤0.25m; native data unchanged. | pass for renderer-only near-contact component |
| Metadata-only updates | Declared Scene component changes counts/source/status then restores originals with same provider and H/N arrays; provider tests refresh credit without changing geometry. | pass for declared component/units, not a changed real DEM claim |
| Unknown-source refinement | Public undefined/retry preserves full child hierarchy until supported; tests reject nonauthoritative farL14 and later return admitted L10/native14. Actual moving GPU/queues show progress. | pass for tested provider/browser cases |
| Immutable retained outcomes | Both preload and demand tests revisit an evicted positive source with changed valid H/N and reject publication/ledger advancement, close admission and retain old data. Missing outcomes cannot retry or flip. | pass for synthetic source-change cases |
| Request/cache/outcome bounds | Tests verify one shared active transport,32 scheduled owners including inflight, dedupe/preload reuse,9 active/32 payload cache,512 admission before I/O, bounded deadline and explicit reset. Actual history/cache stays≤21 in run/components. | pass for unit limits/observed browser counts; not stress evidence for every upstream budget |
| Pinned history/capacity closure |33rd pinned grid rejects with old meshes intact;512 exhaustion blocks unseen I/O. Closed provider returns finite unknown far geometry on its immutable baseline and still permits equal-geometry metadata. | pass for public unit fixtures |
| Scene closure disclosure/no reset | Declared component stops loader, observes provider closed reason/UI reset-to-resume explanation, finite unknown-height result and same provider/change count. | pass for injected component; not actual512-cell travel |
| Lifecycle cancellation | Generation/abort tests suppress obsolete preload/demand results, deadlines/noncooperative completion and same-list reentrant work; temporary cancel retains stopped epoch, explicit clear reopens. Scene main gates Review/flat/reset/dispose and rejects inactive installs. | pass for loader tests/source wiring; held-response full-Scene lifecycle runtime not evaluated |
| Fixed-step native separation | Renewed actual-worker/WASM synthetic fixture gives matching grids, exposed states/vector/digest after success/failure/cancel. Real paused renderer probes retain native state/data. | pass for scoped component and paused browser evidence |
| Geometry-derived SSE/fog |5 independent-run tests cover finite cached perimeter bounds, FOV/viewport, high latitude/dateline, explicit fog and honest unsupported contact; Scene passes matching public inputs. | pass for pure helper/wiring and measured views; universal high-altitude refinement not evaluated |
| Foreground reservation/service bounds | Shared v1/v2 service is byte-identical to base server `7ca541ad…`; client remains one serial optional request. Existing actual source/provenance and prior service reviews are inherited, not newly reproduced scheduling tests. | not evaluated anew for server reservation under adversarial latency |
| Source notices/quality | Existing licence/disclaimer remains accessible; README/SOURCE now declare this client, separate217m pitch/30m source and limited baseline/closure; actual UI reports display overview separately from native terrain label. | pass for source/UI inspection; source accuracy/rights beyond existing inventory not re-adjudicated |
| Full local CI | Final log passes application531Node+22Python, assurance85 and training11; optional JSBSim9/23 skip. | pass with declared skips; hosted/final publication lineage separate |
| Complete aircraft/terrain/training/release/peer gates | These need their own independent source, device, aircraft/provider and milestone evidence. Task160 physical failed-owner discontinuity and Task161 Hessen report remain open. | not evaluated / peer pending |

## Integration gates and limits

I inspected completed `output/flight/overview-ci.log`, SHA-256
`5be053d0aee6741b10fbd106f65e1679d15b3824728846e5e9b25f29a6e5c68d`.
Its terminal outcome is passed with skipped checks, not an unqualified full pass.
Tracked-content whitespace covers2049 currently tracked paths; newly untracked
files and final committed records require the orchestrator’s publication check.
This validator did not run hosted CI, final assurance diff or ROOT merge checks.
Porting into the user’s broader working app changes integration scope and needs
its own affected verification; these pins cover the isolated branch only.

Held-response Review/flat/reset/disposal Scene integration, actual updated Hessen
GPU windows, every far boundary and arbitrary long/high-latitude flight are not
established by this run. Pure tests/source inspection support the bounded safety
contract, without claiming exhaustive scheduling proof. Missing/unavailable data
and stopped optional enhancement remain distinct from measured terrain detail.

## Historical unsuccessful observations retained

The initial planning finding distinguished32 payloads from512 outcome metadata;
SPEC/design/SEC now record those separate stores. Initial loader tests lacked
on-demand coverage; final21 groups directly exercise it. Independent quality
reproduced changed-positive outcome publication and known-missing retry defects;
their reports retain those failed snapshots and affected repairs.

An earlier actual-source artifact at the generic browser output path had hash
`8259b187442edde08480a8f70f71edf7a915fac060b514a898b1af625cfb96ec`:
853.575s/two crossings and GPU parity passed, but its exact selected-L14 assertion
failed on a visibleL24 descendant. That failed assertion was never a pass. The
renewed harness separately records successful public sourceL14 coverage and
allows selected descendants≥14. The final source also repairs optional-capacity
closure; older source/artifact observations do not accept that later code.
The generic output paths are superseded by the final hashes above; historical
hashes describe earlier observations, not current file bytes.
