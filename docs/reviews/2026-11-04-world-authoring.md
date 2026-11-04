# World-authoring research and plan: scoped document review

Reviewed 2026-11-04 10:02 Europe/Berlin by Codex subagent `glide_housekeeping`, independently of the research and integration authors. Scope: research and proposed roadmap, not renderer implementation. The reviewer's exact input record is excluded; the user's untracked public-data research remains untouched.

**Quality: pass for the bounded documentation scope; no blocking findings.** Traditional GIS/procedural generation, offline LLM recipes, generative assets and captured neural reconstruction are distinguished. Reuse of existing terrain, Cesium, geospatial tools and glTF/3D Tiles precedes custom tooling. Code, data, model, imagery and output rights are treated separately, with no provider selected or new dependency activated.

Primary-source samples independently checked: [current OSM2World MIT text](https://raw.githubusercontent.com/tordanik/OSM2World/master/LICENSE.txt), [Hessen LoD2 metadata](https://www.govdata.de/suche/daten/3d-gebaudemodell-he-lod2?ids=7037c1d0-83e7-4bdc-bbd7-b372bfcd10f7), [Hunyuan3D 2.1 territorial restriction](https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE), [Cesium April 2026 splat announcement](https://cesium.com/blog/2026/04/27/3d-gaussian-splats-lod/) and [Poly Haven asset/service distinctions](https://polyhaven.com/license). Review-side DOM1/DOP20 metadata fetches were unavailable; those declarations remain author-observed, with actual edition/rights verification explicitly required before acquisition. This is not blanket licence clearance of every candidate or dataset.

**Validation: pass for research requested by the user.**

| Criterion | Outcome |
| --- | --- |
| World authoring reflected in ROAD, ARCH and R-WORLD-8 | Pass: map extent/coverage, source layers, editable rules, deterministic export and preview are planned explicitly. |
| Traditional and LLM-based high-resolution approaches compared | Pass: separate notes compare inputs, outputs, reuse, limitations and rights; the overview integrates both. |
| First demonstrable increment is bounded | Pass: 2 × 2 km EDFE patch; optional approximately 1 km² AI subset compares the same source geometry and viewpoints. |
| Geographic truth and visual detail remain distinct | Pass: source spacing, rendering detail and accuracy are separate; source/inferred/generated status persists. DTM/contact/navigation authority is independent of DSM, meshes and splats. |
| Repeatability and import safety | Pass as planned contract: frozen sources, recipes/seeds/compiler, bounded declarative inputs, allowlists and human preview; no live LLM authority over physics or navigation. |
| Honest delivery status | Pass: no world compiler/editor, scene asset, benchmark, performance threshold or visual/aircraft fidelity is accepted. TODO 2.0.73.1–4 remain unchecked; only the research parent may close. |

No runtime tests were required for this documentation-only increment. `git diff --check` passed during review; foundation/assurance gates are owned by the orchestrator. Same-provider review does not satisfy cross-provider peer review. Source pins below describe the reviewed documents, excluding this report and its author's input.

## Reviewed source packet

SHA-256 packet `88314e201f957692c6bdb6cef5d2177a18be1624e88f3e0b59e54964b6f88ab0`, computed from sorted `path + NUL + file SHA-256 + newline` records.

| Document | SHA-256 |
| --- | --- |
| `docs/ARCH.md` | `1fc13b5118f80234b8619f90d152ac77db5ff7b951866d4c4c9d31171d1947d1` |
| `docs/ROAD.md` | `d057be9e8a8dfec6fbfaf6bc939697a82a5cdf96b171935ae1069a75efa66579` |
| `docs/SEC.md` | `61e3542b2890e318f7fd205e1f2c3f77df826187a8c2786ac2d92319e4cfd452` |
| `docs/SPEC.md` | `3fa499051431daf1fc2da684338edb901876c1e55fd8f98b5381ea065752f101` |
| `docs/TODO.md` | `a0d576ab99f2ffb1d8e1eb50e50f3b73d060fbee2bc948863fb170d3fbaf9038` |
| `docs/research/2026-11-04-world-authoring-ai.md` | `e189b7bd7b1684b8337bed60be8ac96b50ef521a359816ca0d7b4e383f5ff330` |
| `docs/research/2026-11-04-world-authoring-traditional.md` | `ba9351cd5073daf32522ae06c9f7969edb6a4791bd59225de30d0cb6f3ffe4f4` |
| `docs/research/2026-11-04-world-authoring.md` | `2ac038edd874a9f073d0f488307ff1b20f4652db4b14cf5e92317aa3d179491f` |
