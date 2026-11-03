# Global scenery research review, 2026-11-03

Scope: [global scenery research](../research/2026-11-03-global-scenery.md),
TODO 2.0.46, against the [user request](../input/2026-11-03-global-scenery-research.md).
Reviewer: independent Codex subagent `scenery_research_review`; it did not author
the research note or its contributor reports. The orchestrator records its
returned findings here. This is same-provider research review, not the external
peer gate or simulator acceptance.

Final reviewed note SHA-256:
`545d5c4db55699bb6bc11c25f8809463ae1b37b00f4fdcb5f67d81cd31be8b35`.

## Quality result

Pass; no blocking findings. Current primary sources independently support Google
Earth web flight mode/simplified physics, EEA Map Tiles 403 restrictions,
MapTiler/Cesium/Google list prices and their distinct billing units. Access/cache
restrictions and Re:Earth's advertised conversion versus unresolved upstream
datum normalization are represented accurately. GDAL reconstruction is correctly
separated from added real-world information.

The reviewer independently fetched the pinned Mapterhorn encoder and reprojection
sources and confirmed the stated height-rounding formula and horizontal
EPSG:3857/cubic-spline operation. Inspected source hashes:

- `pipelines/utils.py`: `09ccbac452e72ac31c874a4589edafa9da5621f2064e7de584506c79bf8f5787`.
- `pipelines/aggregation_reproject.py`: `09c8db2e2cc4c11189e1c837d89a99f5b9f4aaf0e25d8b40e0a5b063e118cc9e`.

Two clarifications were incorporated: third-party MapTiler SDK tile-request
billing and Maps JavaScript's documented MSL altitude/adapter conversion.
The KML tour proposal matches official documentation, with interpolation and
untested export/client alignment stated. A final affected-scope recheck covered
the added licensed material-library paragraph at the hash above; no new findings.

## Request coverage

| Requested topic | Result / evidence in the note |
| --- | --- |
| Dynamic loading globally | Pass for research: sources, formats, reuse paths, costs, coverage and limits. |
| Local resampling / typical structures | Pass for research: reconstruction versus inferred detail, feature-specific refinements and licensed materials. |
| Google Earth / Maps quality | Pass for research: photography, geometry and low-altitude appearance treated separately. |
| Fly through Google Earth | Pass for research: web/Pro flight modes, supported Google renderer routes and external KML review proposal. |
| Global runtime, frame rate, terrain accuracy, landing fidelity or training use | Not evaluated; none is claimed as passed. |

Root's three small actual public-terrain responses are transport/format evidence
only. They do not validate surveyed heights, global availability or service SLA.
External cross-provider peer coverage remains pending under the normal cadence.
