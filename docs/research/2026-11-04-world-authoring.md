# World authoring: public maps to detailed 3D flight scenery

Research date: 2026-11-04. Codex orchestrator synthesis with `glide_cases`
(traditional pipeline), `glide_model` (AI/neural methods) and
`glide_housekeeping` (independent documentation review).
Status: research and proposed implementation sequence; no new renderer,
authoring application, downloaded world package or benchmark delivered.

## Recommended direction

Build a **hybrid scenery compiler and authoring workflow**. Preserve real
terrain, footprints and available roof geometry; add region-appropriate
procedural materials, vegetation and detail. Use an optional offline LLM to
propose editable recipes, explain missing data and select approved assets.
Freeze the reviewed recipe before compiling it into ordinary streamed scenery.

Start with a **2 × 2 km EDFE patch**, not the full 100 NM region. Its exact extent
and source editions must be frozen before the first build. Compare it with the
current photographic/map terrain from the same cockpit and chase viewpoints.
Then expand across Darmstadt and connect detailed tiles through coarser regional
coverage. This scope is an engineering recommendation, not an already accepted
scene or a new restriction on the regional vision.

The [traditional assessment](2026-11-04-world-authoring-traditional.md) and
[AI assessment](2026-11-04-world-authoring-ai.md) contain source/tool/rights
details. They extend the [global scenery study](2026-11-03-global-scenery.md).

## What “real” and “high resolution” mean

**Geospecific** scenery represents the actual location and measured/source-backed
objects. **Geotypical** scenery looks appropriate to that region but fills gaps
with representative buildings, roofs, facades, crops or trees. Both can be sharp;
only the former establishes facts about a particular place.

Hessen's official catalogue includes DGM1 terrain, DOM1 surface heights, DOP20
imagery and LoD2 buildings. LoD2 supplies useful building/roof structure, not
photographed facades. A sharper generated facade does not increase positional
accuracy. Source grid/pixel spacing, mesh approximation error, texture texel
density and apparent screen detail must be reported separately.
[HVBG catalogue](https://hvbg.hessen.de/geoinformation/open-data)

## Pipeline

| Stage | Authored result | Reuse and constraints |
| --- | --- | --- |
| Select a region | Map extent, source coverage and missing-layer preview | Retrieve authorized source data, rather than interpreting a rendered map screenshot as 3D geometry. Keep capture dates, CRS, vertical reference and rights. |
| Normalize geography | Versioned DTM, building shells, roads, water and land-cover masks | Reuse GIS/conversion tools. Reconcile DHHN2016/ellipsoid references with Gefly's terrain contract. DSM roof/tree heights are separate from bare-earth ground. |
| Choose regional appearance | Editable material/asset rules and deterministic seed | PBR ground materials, facade/roof kits, trees and roadside objects. Preserve real footprints/heights where known; label inferred heights and generated details. |
| Refine important places | Human-reviewed airport and landmark patches | Correct recognizable landmarks, apron edges and visual approach cues using licensed evidence. Runway/contact geometry and accepted navigation facts retain their own sources. |
| Compile and stream | Tiled mesh/material assets, LODs and manifests | Prefer glTF within 3D Tiles and the existing Cesium renderer; use instancing and texture compression where supported. Cache/bandwidth/LOD limits must be measured on the reference Mac. |
| Preview and share | Flyable preview, source inspector and reusable package | Compare baseline/procedural/AI-assisted variants; publish reviewed inputs, recipe, asset rights and hashes. Community changes should be reviewable feature/region patches. |

3D Tiles organizes streaming levels and spatial metadata; it does not create
missing geography. Cesium's CityGML tiling service is one possible preparation
route, with service terms separate from the open format. Evaluate open toolchains
before selecting a hosted dependency.
[OGC 3D Tiles 1.1](https://docs.ogc.org/cs/22-025r4/22-025r4.html),
[Cesium tiler formats](https://cesium.com/learn/3d-tiling/tiler-data-formats/)

For example, Poly Haven publishes CC0 materials/models suitable for a curated
asset kit. Its hosted API/website has separate terms: select and package approved
assets rather than assuming CC0 authorizes unrestricted scraping.
[Asset licence and website terms](https://polyhaven.com/license)

## Traditional, LLM and neural routes

| Route | Useful role in Gefly | Main limitation |
| --- | --- | --- |
| GIS + procedural meshes/PBR | Baseline: geographically grounded, editable, relightable scenery with ordinary LOD and instancing | Requires prepared source layers, region-specific rules and airport/landmark refinement. |
| LLM/VLM-assisted authoring | Describe an area/style, map source attributes to approved rules, propose missing-data treatments and asset choices | An attractive inference is not evidence for a real roof, height, obstacle or road. Generated code is not executed by the scene importer. |
| Generative texture/mesh models | Optional offline representative material and asset variants | Coherence, repetition, UV/PBR quality and every model/checkpoint/input/output permission need evaluation. |
| Photogrammetry | Reconstruct actual places from authorized overlapping imagery; localized landmarks or airports | Orthophotos alone do not cover facades; capture, georeferencing, mesh cleaning and texture preparation are substantial work. |
| NeRF / 3D Gaussian splatting | Optional captured visual layer for a bounded area with suitable multiview input | A view-dependent visual representation is not a clean semantic/collision mesh. Novel viewpoints, lighting changes and sparse coverage require tests. |

Gaussian splats are not categorically excluded from the browser: Cesium announced
hierarchical 3D Tiles/glTF splat streaming in April 2026. That makes a local
experiment plausible, not a measured performance or compatibility result for
Gefly's pinned build. Keep reconstruction, renderer support, extension maturity
and accepted physics geometry separate.
[Cesium announcement](https://cesium.com/blog/2026/04/27/3d-gaussian-splats-lod/)

The closest LLM-orchestrated architectural example reviewed is
[UrbanWorld2.0](https://github.com/tsinghua-fib-lab/UrbanWorld2.0/tree/v0.2),
but its Hunyuan3D 2.1 mesh dependency has territorial restrictions excluding EU
use in its published [model licence](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE).
Its pipeline's MIT declaration does not clear that dependency. CityDreamer and
CityGaussian also have noncommercial restrictions. Treat these as research
references; select cleared components before any Gefly integration.

## First demonstrable increments

1. **Source-backed scene:** build the EDFE patch with terrain, available LoD2
   buildings, roads/water and one curated material/vegetation kit; stream it in
   the existing simulator. Retain photographic/map fallback and visible credits.
2. **World-authoring preview:** select a bounded area on the map, inspect source
   coverage and change a small set of regional rules; export a validated,
   deterministic scene recipe and generated package. Rebuild the same recipe
   without asking an LLM again.
3. **Optional AI authoring A/B:** use an approximately 1 km² subset of that scene
   and ask an LLM for a recipe over the identical
   source geometry; compare appearance, correction effort, time and cost against
   the manual recipe. An accepted generated variant must not move source facts.
4. **Optional captured/neural patch:** only after suitable image rights/coverage
   are established, compare a photogrammetric mesh and/or splat at a landmark.

Before each experiment, freeze representative viewpoints/heights, reference
Mac/browser, cold/warm load and frame-time budgets, decoded memory estimates,
payload caps and geographic-error checks. Measure near-ground and circuit views,
tile seams, repeated materials, ground alignment, fallback and a source gap.
Report appearance separately from accuracy; no numerical budget or visual
fidelity claim has been accepted by this research.

## Authoring contract boundary

A proposed recipe identifies extent, CRS/datum, source IDs/editions/hashes,
geometry confidence, approved asset/material IDs, rules, seed, compiler version,
LOD/texture budgets and resulting package hashes. Keep measured, inferred and
generated objects distinguishable in the authoring inspector. This is a design
outline, not a shipped schema.

LLM output is bounded declarative data. It cannot add executable scripts or
unapproved remote URLs, silently alter surveyed heights, move runways, invent
navigation assets or overwrite the authoritative terrain/contact surface.
Adding building/vegetation collision or obstacle assessment requires a separate
explicit integration and validation step. Imported assets and future contributed
packages need schema/path/resource limits and provenance review.

The free/open baseline must remain reproducible without a paid imagery account
or mandatory AI provider. Optional commercial imagery or AI processing stays
separate. No provider, cloud service, model weight or asset library is selected
or activated by this note.
