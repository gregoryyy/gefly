# Terrain horizon validation

2026-11-05 23:01 Europe/Berlin. Independent Codex validate; no implementation,
reviewer browser execution or new tests. Reviewed legacy source `c1378d2` against
`774e914`, the separate modern port, [R-WORLD-11](../SPEC.md) and the
[frozen investigation](../research/2026-11-05-terrain-horizon-cliffs.md).

**Recommend bounded acceptance of the reproduced exterior-wall repair.** The
1/8° collar is a visual transition outside valid atlas coverage, not measured
terrain or a physical-source repair. Legacy runtime evidence is distinguished
from modern Swiss observations below.

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Preserve existing contact/atlas heights | Sampler returns the unchanged atlas result before any correction. Only uncovered exterior points receive projected H/geoid corrections; native samplers, grids, source outcomes, model and ABI are unchanged. Interior/native parity tests remain; modern moving native/CPU maximum difference6.73e-11m at22points. | Pass — source/unit; modern native fixture |
| Compact continuous transition | Normalized inverse-distance weights avoid disconnected-source nearest-tie jumps; smoothstep support vanishes at1/8°, recovering exact original coarse values. H and geoid use identical weights before recombination. Four-edge/corner, interior/outer exactness, dateline and finite-pole tests pass. Angular width is not constant metres. | Pass — source/component |
| Separate disjoint-profile coverage | Modern unit fixture covers overlapping disconnected collars. Legacy quarter-degree empty gaps are twice the band width, so that literal overlap fixture is inapplicable; shared formula and legacy outer-boundary tests cover its mechanism. No all-source/global smoothness claim. | Pass — scoped source/unit |
| Render both sides using the actual legacy provider | Durable Chrome156 synthetic fixture uses public heightmap interpolation and `globe.pick`; interior, inside edge, boundary and outside edge all pass. Legacy L12 maximum GPU/declared difference0.004238m; modern L14 counterpart0.001647m. No external requests/errors. This is a declared400m+40m source fixture, not real elevation/native flight. | Pass — each provider’s static GPU mechanism |
| Actual Swiss exterior-wall correction | Independent image inspection confirms rectangular cliffs before and continuous textured terrain after. Modern real-source edge view changes462.097/1630.667m to462.227/462.318m across the sampled pair; seven edge probes maxGPU/provider0.005033m, shared mesh edges0m. Existing actual-source discrepancy≈1168m was exterior coarse/fine selection. | Pass — modern observation only |
| Safe bounded cache/history | Expanded collar footprints guard additions and eviction against returned finest exterior meshes; unsafe changes reject atomically for rebuild. Duplicate/metadata-only and unaffected updates retain behavior. Redundant fine-interior sources are excluded. Owned history64/static73/preview512 bounds remain. Independent quality’s31legacy provider/streamed tests pass without skips. | Pass — source/component |
| Bounded moving-window behavior | Modern10× flight has22public picks, maxnative/GPU0.056968m,9accepted updates, one initial provider assignment,445textures and zero final queued/error/failed requests. It predates the final interior-source filter but never enters that fine area; final static Swiss/Hessen checks cover the filter snapshot. | Pass — bounded modern mechanism; actual legacy moving flight not evaluated |
| Remaining reports and broader fidelity | Task160 injected failed-owner physical cliff remains unfixed and deliberately visible inside native samples. Task161 missing Hessen relief remains unreproduced: one fresh modern Hessen point has nonzero native867.485m and GPU error0.000664m, not the user-session diagnosis. No all-world GPU, aircraft, landing or device/network acceptance. | Not evaluated / unresolved separate tasks |

No blocking defect found in this scoped repair. Legacy shared CI passes:
473Node+22Python application tests,85assurance and11training checks;
9/23optional JSBSim and1Linux-only repository check skipped, not accepted.
Verified local-only `output/flight/terrain-horizon-ci.log` SHA-256:
`43591f3ec50f878553ee31cf2d24262c4a2b0bf3f480cd03de5c9c84d138bfe1`.
These gates do not establish the full app lifecycle.
Cross-provider peer and native build provenance remain unaccepted.

SHA-256: legacy provider
`0a8e79855255a5e66b3dfef6f994000bd787258ded2bf9db49b3fdc24a64b09e`;
tests `630b3ba673a5fd605bd4004b97ccd9149cad4bc1b93cbfa47379dc5b2b213fb4`.
Modern provider `0bc1b0cb742dd1cc67c147dfdb4ce77e5daf043e4a5e5b906b45248f03a4fecc`.
Research snapshot `a774d69c2b72d354b5a0f2c638d6bc3cd873826cea52757b56500b293ccabe82`.

Ignored local evidence requires retention. Legacy `output/flight/terrain-horizon-browser.json`:
`242fdd82372ccc3da9e00ea7fdebae219687c5f5a52da005abf7d0e2969c0e19`;
modern counterpart `ab67087fee6775258dcdee702f4b3720d93b4a5c81b891fbe5a866d403f33015`.
Both executed script versions: `3c7d585fcb983f8c5595064149fe5b0e689d4948fe2055799d37846d686c1c40`;
reproduce from `app` with `node tests/terrain-horizon.browser.mjs`.
Modern root `output/flight/alps-renderer-after-result.json`:
`12fe21461d765d90b4c11629ea56dc141ddbef6fbaf7ba6b1801e70af47ed219`;
`alps-renderer-flight-10x-alps-collar.json`:
`75ed197c7de984caa4f09a70df7b54221b3a610c70f673d4688c73a345158723`;
`alps-renderer-hessen-actual-app.json`:
`8cbfc2e2a5e425049d641a8862ba4c0e4bcadc31958271a7df15ac24c3cf17fc`.
These root artifacts are not an actual legacy-app flight.
