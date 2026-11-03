# Regional textures and radio directory: independent review

Codex `texture_research`, 2026-11-03 05:28 CET. **Quality: pass. Specification validation:
pass for the bounded criteria below. Cross-provider peer: pending.** This review
covers inspected worktree bytes listed below; shared CI/assurance and subsequent
integration edits remain the integration owner's responsibility.

The reviewer authored none of this implementation. The reviewer's regional imagery
research/input prose is excluded from independent self-acceptance. This is a
same-provider independent review, not the cross-provider peer gate and not an
acceptance of full R-REGION-1, current airport data, aircraft physics or training
fidelity.

## Quality

No unresolved material implementation finding remains in the reviewed scope.
The provider derives fixed same-origin paths from bounded coordinates; it does
not follow metadata URLs. Redirect rejection, 12-second timeout, external scene
abort, bounded streaming, byte count/JPEG/hash/dimension checks, deduplication,
six concurrent requests, 64 decoded bitmaps and bitmap disposal were inspected
and exercised. Finer failures crop the correct ancestor subrectangle. Source
strings in the radio directory render through textContent. Distance uses finite
coordinates and a clamped haversine calculation with explicit nautical miles.

The package contains **723 tiles, 70,489,589 bytes**, under the revised **80 MiB**
cap, from 200 adaptive source groups. Offline verification checks the exact
coordinate/source-group set, request URLs, decoded JPEG dimensions, tile hashes
and source-record hash. The reviewer additionally checked every retained raw
source hash and independently repeated all source crops/JPEG-85 encodings:
**all 723 derived hashes matched**. Pillow 11.2.1 and Node v26.13.0 were observed.
Capture dates remain null; retrieval/build time is distinct. Source resampling,
cropping and re-encoding are declared, with approximately 3.07 m / 1.54 m output
spacing at 50°N rather than a native-20-cm claim.

Resolved during integration/review:

- Initialization is cancellable before a provider handle exists; both manifest
  and tile requests reject redirects and use bounded abortable reads.
- Scene loading text follows actual view readiness, not the aircraft ground-point
  bitmap cache, which may lie outside the camera view. Cache/available levels
  remain separate diagnostics.
- The existing finest terrain error of zero made Cesium 1.146.0 imagery LOD divide
  by zero; its logarithm/bitwise conversion mapped Infinity to zero. An initial
  0.25 m replacement caused excess near-ground refinement and failed the actual
  fixture. The final **1e-6 m** value is a numerical surrogate for zero, avoiding
  the division failure without a DEM-accuracy or new-height claim. Shared height
  callbacks, triangles and native terrain data remain unchanged. Final unit and
  real-GPU checks passed at this value.
- PNG stability assertions now compare a bounded boolean after additional settled
  render frames; the earlier failed runs are not counted as passes. The old panel
  layout fixture's stale `#ap-off` selector was changed to `#ap-engage`.

Nonblocking limits: individual stale Cesium request cancellations are not consumed,
so queued offscreen requests may finish until scene disposal. Runtime metadata
validation relies on the compiler/inventory gate for exact package completeness
and total bytes. Resumed raw source images are decoder/dimension checked and their
consumed hashes recorded; their original retrieval dates are not attested. These
are bounded local product choices, not a general untrusted imagery importer or a
performance claim for every device.

## Reproduced evidence

| Check | Observed result |
| --- | --- |
| `cd app && node --test src/regional-imagery.test.ts src/regional-imagery-assets.test.ts src/terrain-provider.test.ts` | **11/11 pass**, zero skips: six provider tests, complete shipped inventory and four terrain tests. Affected four terrain tests rerun after the final 1e-6 m change. |
| `python3 -m unittest discover -s utils/imagery` | **4/4 pass:** coordinates/y direction, metatile crop direction, WMS XML/wrong dimensions/size rejection, tampered hash/license rejection. |
| `python3 utils/imagery/compile.py --verify` | **Pass:** all 723 decoded images, 70,489,589 bytes and exact source/derived inventory. The earlier disk-space interruption was resolved. |
| Independent raw-source transformation | **Pass:** all 200 source group byte hashes checked; independently repeated crop and optimized quality-85 JPEG encoding reproduce all 723 shipped hashes. |
| Independent 70-tile lifecycle check | **Pass:** cache stops at 64 bitmaps; six evictions close bitmaps; oldest tile refetches; disposal closes all 71 created bitmaps. |
| `cd app && npm run check` | **Pass:** TypeScript. New provider and inventory tests are included in the shared npm test command. |
| `cd app && node tests/regional-nav.browser.mjs` | **Pass, independent actual Chrome:** nearby-first/nonempty search/all-stations toggle, dual standby/swap, backdrop/Escape/focus return, recorded Review and missing-position fallback. |
| Independent targeted full-cockpit radio geometry | **Pass** at 1440×900, 1280×720, 1200×800, 901×800, 900×800, 390×844 and 1440×600. All radio controls stayed within their panel; station close/search/nearby stayed inside the viewport and only results scrolled. Desktop/mobile screenshots inspected. |
| `cd app && node tests/terrain-renderer.browser.mjs` | **Pass, independent final actual Chrome run, exit 0 and browser closed:** GPU level 15, 512px regional textures, cache 64, in-flight 0, failed 0; existing airport overlay GPU remains 3000×1800; exact settled regional PNG comparison passes. Airfield and hill finest meshes agree within 0.25 m, stability changed-pixel fraction 0, camera drift 0 and source state unchanged. Coverage exit, provider reuse and disposal pass; no page errors and HTTP hosts exactly `127.0.0.1`. |

The final renderer evidence is in ignored `output/flight/terrain-renderer-browser.json`
and accompanying `regional-frankfurt-textures.png`,
`regional-eddf-approach-textures.png` and terrain screenshots. The reviewer visually
inspected both regional views: recognizable EDDF runway/taxiway markings and
surrounding forest detail, without apparent tile holes. This is visual context,
not surveyed runway/procedure validation. Shared CI, assurance and external peer
results are not inferred from these checks.

## Specification validation

| Criterion | Expected | Outcome and evidence |
| --- | --- | --- |
| R-WORLD-4 / R-DATA-1 package | Declared bounds/resolution, source rights/date/transform and integrity, 80 MiB cap | **Pass:** actual complete inventory, source-to-output reproduction, unknown-date/derivative labels and 70,489,589-byte total. Research prose excluded from self-acceptance. |
| R-WORLD-4 loading/resources | Local requested tiles, six concurrent fetches, 64 cached source images, bounded cancellable initialization/disposal | **Pass:** code boundaries, six provider tests, independent 70-tile eviction check and actual browser/cache/network observations. |
| R-WORLD-4 coordinates/failure | North-down XYZ, correct child/ancestor resampling, invalid finer image degrades safely | **Pass:** independent coordinate fixtures, colored crop tests, draw-source rectangle/deduplication and failed-child parent fixtures; complete real-source crop reproduction. |
| R-WORLD-4 visual increment | Useful regional detail, retained 0.75 m airfield overlay, stable view and explicit coverage/fallback | **Pass:** independent final GPU level 15 / 512px, retained 3000×1800 top overlay, exact stable PNG, approach/forest screenshots, relief outside coverage, status and coverage guards. |
| R-WORLD-2 regression / separation | Same shared surface; imagery/render changes do not drive simulation | **Pass for inspected scope:** unchanged height callbacks/native inputs, independent triangle tests and actual airfield/hill mesh agreement within 0.25 m; renderer state unchanged and provider reuse/disposal checks. No new aircraft-physics acceptance is claimed. |
| R-NAV-4 / R-UX-1 / R-REVIEW-1 directory | Nearby/search/all stations, historical labels, standby selection, read-only Review and missing-position behavior | **Pass:** independent actual Chrome interactions and inspected pure distance/filter/render logic. |
| Radio overflow/accessibility | Compact full-deck stack; filters/close stay visible while results scroll; dismissal/focus usable | **Pass for tested sizes:** independent full-cockpit seven-viewport geometry, desktop/mobile visual inspection and actual close/search/focus fixture. |

These outcomes cover this increment only: the smaller extent, selected detail,
unknown capture dates, approximate visual context and absent building geometry
remain explicit. Full 100 NM, current navigation/airport references and wider
hardware-performance validation remain separate work.

## Frozen implementation packet

The reviewer independently recomputed the final 741-path implementation/test/asset
packet from `output/flight/textures-packet.json`, base
`2f26c3723ce1a05e063cf07b99d79b50dcb7edd3`. SHA-256 over sorted UTF-8 path,
NUL, exact file bytes, NUL is
`decb6d47407d90400cf480a312610d0364bfd76bf853e61732d5d19ba712393a`.
The calculated value matches the integration packet. It supersedes the earlier
740-path packet after a test-only synchronization repair in
`app/tests/public-terrain.browser.mjs`: awaiting the worker stats reply before
capturing contact drains states queued before the pause acknowledgement. The
worker handles pause/stats in message order; this selects the final paused frame
for Review without changing runtime behavior or weakening the height assertion.
The reviewer independently inspected the helper and worker dispatch, accepted
this three-line repair, and recomputed the complete final packet. Integration
reports the affected four-group browser regression and full-app EDDF/Review pass;
this worker did not rerun those additional browsers while CI was running.

Installed Pillow 11.2.1 distribution metadata was independently checked:
`License-Expression: MIT-CMU`, supporting the SBOM correction from HPND.

The calculated value matches the integration packet. This pins implementation
review scope; subsequent Google/COM research prose and future-service plans are
outside this acceptance. No live external imagery service or paid account was
enabled by the reviewed implementation.

The external-provider peer attempt is not an accepted review: integration reports
Claude CLI 2.1.193 timed out at 180 seconds with unknown model and no review report.
This packet has no cross-provider acceptance; peer remains pending.

## Reviewed artifact hashes

Worktree byte identities below require affected re-review if changed. They are
not a frozen peer packet or a final shared-CI revision.

| Path | SHA-256 |
| --- | --- |
| `app/src/regional-imagery.ts` | `f365f2c3158e589dece876067cc321ce008cd9c0ef8699fde592f18292fa6bff` |
| `app/src/regional-imagery.test.ts` | `92f7d74723e11f12618db691b49c15383719c52d83c37e8b03d88f9a3d065d22` |
| `app/src/regional-imagery-assets.test.ts` | `e4e93a456aba765b3c91e30cf2e60d7dd869e9efe0335fd3a93557f3ab7559ef` |
| `app/src/scene.ts` | `b73248aaed6ff3a23db657cf7bcbfc780abbdf04e937fb27338d856ffcd306ff` |
| `app/src/terrain-provider.ts` | `db432b02159a6a1be66a7c635dde895d7eac2efd0940531eeac01940a57511a4` |
| `app/src/terrain-provider.test.ts` | `1f0716a3ba370e54482ed4199d0c12685cc97c948d7ec71f73115b84067cd440` |
| `utils/imagery/compile.py` | `88fbdad456a743574768098e465e873fbe887dddaf92bff9e1d815d5082344a8` |
| `utils/imagery/test_compile.py` | `7c8eceb97f2a2f04653bb5215fedb3ec9177d00c1a05e41f7ab31e28cfa30dbf` |
| `utils/imagery/README.md` | `87887f45cd5af783a0c9296732e4075ebf2cfc7f2b3c6ccefbdc4b9dfbe8e71d` |
| `app/src/radio-nav-panel.ts` | `3099418e4bf22d73f990dccbc23f04f963c04d469dc4a1eaa5602ba6d8ffa034` |
| `app/src/radio-nav-panel.css` | `f610985ee6a874c101604eabcb931e50173dd4ee49738f1721bb1e6d6b20d2b4` |
| `app/tests/regional-nav.browser.mjs` | `ec8ae939d41e2d1ec62e8a44700793f68f118494823aa1ef7ceb15c9baf7fff1` |
| `app/tests/panel-layout.browser.mjs` | `83ccd123e9c9d858ee9351f6490b2ed204bc3fbd4bd8b6b6338b1c1f4c27892c` |
| `app/tests/terrain-renderer.browser.mjs` | `751d88f8c401db0c90c44c578bd60f85b23c8ae24696e3513225f4c1ef7461c9` |
| `app/public/imagery/rhein-main/manifest.json` | `d94a130325ae896dce98c4c47aa2a8090d9f8db4119df2eca95b9af38edf6626` |
| `app/public/imagery/rhein-main/SOURCES.json` | `ede6634d1afd1cc51d79172be17e858f131dc8e273cedd086419daa3174ce15c` |
| `app/tests/public-terrain.browser.mjs` | `2aa4d08fce72835cd832e983f783295823139baff2aa11e729fd38d8241e0f50` |
