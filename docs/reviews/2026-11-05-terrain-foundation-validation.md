# Terrain foundation validation

Reviewed 2026-11-05 17:26 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. Code revision
`68cdcbf9a4b51cfcce4b8cea11b7dc06cfafbf93`, base
`700dd5386125f9864a391f85b277cb71da55290a`. Renewed documentation at
`6d1b6a6f4ebd231d71c6b41a2cbfc5b1d7e59643`; its changes from the code revision
are SPEC clarification and research whitespace only.

**Recommend a draft PR with the bounded acceptance below.** This accepts the
coarse terrain/cartography foundation, not complete five-state runtime, aircraft
or milestone acceptance. Cross-provider peer pending. Copernicus, later map UI,
new airfield surfaces and later lifecycle/AP changes are outside this review.

Read this worktree's [SPEC](../SPEC.md), project/validate rules, SDLC/STYLE/SEC/EVAL,
requests and source records. Inspected the reconstructed stream/session/worker,
renderer, cartography and asset checks, actual native/browser JSON and logs;
independently viewed the fresh New York app and NY/Tokyo texture images. No
reviewer browser or new tests were run. Older root-workspace packets were not
used to accept this reconstruction.

| Criterion | Expected versus observed at this snapshot | Result |
| --- | --- | --- |
| R-WORLD-10 regional data integrity | Existing asset checks verify608 declared cells:382 full,93 partial and133 unavailable. All475 available assets match hashes, valid-node counts and shared height/geoid edges; compiler identity is checked. DGM200/DHHN2016, GCG2016/2023 and missing coverage remain explicit. | pass for source/asset integrity |
| R-WORLD-10 representative runtime across five states | Fresh evidence does not supply separate physical/rendered cases in each of Bavaria, Baden-Württemberg, Hesse, Rhineland-Palatinate and Saarland. Hash checks do not replace these geographic measurements. | not evaluated |
| R-WORLD-11 composed fallback and bounded identity | Bundled1° NOAA/EGM2008/derived ocean data fill unavailable regional nodes. Quarter-degree world-c IDs are separate from nine reusable native slots; strict latitude/dateline and malformed-grid checks are present. Negative inland heights and source distinctions are retained. No finer measured world detail is claimed. | pass by source/unit evidence |
| R-WORLD-11 native startup, crossing and failures | Seven actual-worker/native groups pass. Eight sampled native heights and dimensionless slopes match the shared surface with observed maximum mismatch0. Real longitude crosses the dateline during40 steps; Japan and optional missing/corrupt-region cases complete40 steps with at most9 cells. Corrupt required world data produce no Ready. | pass within tested cases |
| R-WORLD-11 pause while loading | Actual worker pauses during staged regional loading; native step remains1 and digest/final state remain equal after release, without reinitialization. Separate five-second discovery and halo budgets are now stated consistently with source. | pass; universal wall-clock/network performance not evaluated |
| R-WORLD-2/11 rendering | Fresh New York app initializes Paused at step0 outside Germany. Recorded globe/native ellipsoid-height difference is0.099329m, within the existing0.25m display budget at that sample. Provider tests cover shared triangles, dateline and coarse horizon. This does not accept all near-ground/five-state GPU meshes. | pass for sampled/component behavior; broader mesh criterion not evaluated |
| R-WORLD-11 cartography | The49-layer global style retains source geometry/names and local-font labels in both consumers. Real NY/Tokyo texture tiles render; actual app/photo/vector checks retain OSM beneath photographs, with regional opaque map inactive and required credits. No new airport/NAV inventory follows. | pass for supplied source/two-group browser scope |
| Saved positions, Review and background | Browser startup reads a saved outside-region pose; units cover global location bounds. Selected Review loading, source fields and cancellation are inspected in source. Full reload/Review/hidden-page runtime matrices were not renewed here. | pass for startup/source/unit scope; remaining runtime cases not evaluated |
| Native provenance and fidelity | Actual WASM11a92abd… differs from retained build record4fe24bfc…. The executable stayed unchanged during probes; correspondence to the modified C++ source is unverified. | blocked for build provenance; aircraft/training fidelity not evaluated |

Local-only retained evidence: `output/flight/pr1-handoff.json`, SHA256
`419bbab83a568d32cfa00fc413e702785ce6fd53f23ed9565d46fcfe65a8af69`;
all six referenced local artifact pins were independently checked. Fresh native
JSON `output/flight/world-terrain-actual-worker-task135.json` has SHA256
`592b3cb2628bb566482aa5ed0548d1bea219933bb93b0f8ae7a0a0d11d11cbae`.
Fresh browser JSON has SHA256
`6f21d3b6ff69d3ca18682a94a4aa61bf98e76b41b5e8dd8b731b639632a4bdf0`.
These ignored outputs are not promised in a fresh checkout.

Provided checks record442 Node +22 Python application tests, zero skips/failures,
production type/build12.29s and two browser groups, Chrome156.0.8078.80. The
publication CI log records a pass **with9 of23 optional JSBSim study tests
skipped**, not an unconditional full pass. Its SHA256 is
`8c47aee6b42b438ae42a867b5a2e53a35a9c5d85e1b8b47dc67ce6a5f0a5e0b3`.
Earlier whitespace failures remain historical.

Reproduction entry points are `npm --prefix app test`, `npm --prefix app run build`,
`node studies/e1-browser/sim/world-terrain-worker.mjs` and
`WORLD_MAP_CREDIT_ONLY=1 node app/tests/world-fallback.browser.mjs`; actual native
assets/Chrome are separate local prerequisites. SPEC now resolves the obsolete
label-free rule and distinguishes both optional-loading budgets. No unresolved
blocking implementation finding remains within the bounded draft scope. Final
report-commit/document/assurance and publication gates belong to the orchestrator.
