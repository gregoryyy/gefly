# AI-assisted world authoring for Gefly

Research checked 2026-11-04 by Codex (research role). Scope: offline authoring from public geographic evidence into detailed browser scenery; proposals, not an implemented or benchmarked pipeline. Complements the traditional GIS/photogrammetry comparison. Relevant requirements: R-WORLD-1/R-WORLD-3/R-DATA-1/R-AUTHOR-1.

## Recommendation

Use deterministic geographic reconstruction as the foundation, with an **offline LLM proposing a validated scene recipe**. Keep measured terrain, footprints, heights and airport geometry separate from generated appearance. A plausible facade, larger texture or attractive fly-through does not establish the real building, obstacle clearance or geographic accuracy.

Traditional GIS/LoD building reconstruction offers explicit coordinates and editable geometry; its appearance depends on the available source detail. ML can classify surfaces, infer plausible missing details and accelerate asset production, but uncertainty survives the generation process. An orthophoto supplies a top-down observation; it does not reveal hidden facades. Licensed overlapping oblique photographs, surveyed geometry or LiDAR supply additional observations that a map alone lacks.

## What the methods actually provide

| Approach and primary evidence | Inputs and output | Gefly reuse and limits |
| --- | --- | --- |
| [CityGen](https://github.com/wenhaochai/CityGen), [license](https://github.com/wenhaochai/CityGen/blob/main/LICENSE) | Controllable generated city layouts; neural layout synthesis, not an LLM surveyor. | MIT code is a possible layout-generation reference. Generated topology is useful for fictional exercises, not replacement geography for EDFE. Dataset/weight rights still need separate checks. |
| [CityDreamer paper](https://arxiv.org/abs/2309.00610), [code](https://github.com/hzxie/CityDreamer) | Semantic/height layouts plus compositional building/background neural fields produce city views. Published OSM and GoogleEarth training datasets are offered. | Research generation pipeline, not a ready georeferenced browser mesh exporter. [S-Lab license](https://github.com/hzxie/CityDreamer/blob/master/LICENSE) restricts commercial use; publication of a GoogleEarth dataset does not independently clear imagery or derivative-asset rights. |
| [UrbanWorld2.0](https://github.com/tsinghua-fib-lab/UrbanWorld2.0/tree/v0.2), [paper](https://arxiv.org/abs/2511.18005) | OSM bounding box, street imagery, VLM analysis/imagination, mesh generation and Blender assembly into glTF. | Closest architectural reference for LLM-orchestrated authoring. README declares MIT, but its Hunyuan3D 2.1 mesh stage has a separate [Tencent license](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE) explicitly excluding EU/UK/South Korea. This exact dependency path is not cleared for Gefly in Germany. Imagined facade details remain generated; replace/review restricted components before reuse. |
| [CityGaussian/V2](https://github.com/Linketic/CityGaussian) | Multiple photographed views and camera poses reconstructed into partitioned Gaussian scenes; V2 adds mesh extraction. | Demonstrates large-scene reconstruction, not geographic generation from OSM alone. Public code/checkpoints exist, but CC BY-NC-SA 4.0 and capture rights constrain adoption. Mesh extraction still needs geometry/completeness validation. |

These are different tasks. An LLM can assemble tools, propose semantic classes/material parameters and draft asset scripts. Diffusion can synthesize textures or objects. [NeRF](https://www.matthewtancik.com/nerf) and photograph-trained Gaussian splatting reconstruct appearance from observations for new viewpoints. None establishes unseen structures merely because the rendering is coherent. Generated code must be reviewed and run only in an isolated offline build; declarative recipes are preferable to executable imported scenes.

## Reconstruction, browser delivery and physics

Gaussian scenes **can stream in the browser**: [Cesium's April 2026 implementation](https://cesium.com/blog/2026/04/27/3d-gaussian-splats-lod/) uses hierarchical 3D Tiles, glTF splat payloads, compressed data and WebAssembly sorting. Installed CesiumJS 1.146.0 includes `GaussianSplat3DTileContent`. This is a credible delivery option, not evidence that Gefly has integrated or benchmarked it. Check exact extension/compression versions with a real asset; avoid assuming interchange between arbitrary PLY/SPZ exports.

Splat centers, opacity and view-dependent color are not a watertight collision surface. Keep native ground elevation and reviewed collision/obstacle meshes independent. A PBR material describes light interaction, not physical strength or validated contact geometry. Real captures also need georeferencing, scale checks, coverage inspection and dates; moving objects and poorly observed surfaces can create artifacts.

For meshes, [3D Tiles](https://www.ogc.org/standards/3dtiles/) provides spatial hierarchy and streaming; glTF can carry editable geometry/materials. For either representation, budget tile payload, decoded/GPU memory, texture sizes, sorting cost and level of detail. Browser support does not remove these costs. [gsplat](https://github.com/nerfstudio-project/gsplat) offers Apache-2.0 reconstruction infrastructure, while [Spark](https://github.com/sparkjsdev/spark) offers an MIT browser renderer; neither clears input photos, weights or produced assets automatically, and neither is a required new Gefly dependency.

## First experiment — proposed, not implemented

Choose one approximately 1 km² Hessen patch near EDFE with reusable terrain, footprints and documented heights. Produce a baseline deterministic mesh/LOD package. On the **same geometry**, let an offline LLM propose only facade/roof/material recipes using source IDs, confidence and explicit generated-detail flags. A deterministic compiler validates units, bounds, asset allowlists and resource limits; human review rejects unsupported geographic edits. Unknown heights stay unknown or visibly generic.

Compare both versions along an identical recorded low-altitude flight: reference alignment, silhouette/landmark recognizability, seams, cold/warm loading, payload size, peak memory and frame-time percentiles on the reference Mac. Record model/version, prompts, seeds, source hashes, licenses and compiler version. Keep native-state replay identical and make generated appearance switchable. Success is measured improvement over the baseline, not an untested claim of Google Earth quality.

A separate later capture experiment could compare a licensed multi-view reconstruction of one landmark against that mesh. Keep LLMs out of runtime flight physics, avionics, navigation truth and collision authority. No model, imagery service, account, training job or dependency was activated by this research.
