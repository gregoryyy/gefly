# Renderer, Lycoming fuel chart and FDM tolerances

Author: user. Recorded: 2026-11-01 19:04 Europe/Berlin by the orchestrator (Claude Code).

Context: the orchestrator asked (1) whether to adopt CesiumJS as renderer with
three.js as fallback, MapLibre for 2D maps and TypeScript with JSBSim in a Web
Worker (TODO 1.2.3); (2) whether to add selected points of the Lycoming fuel-
consumption chart (Fig. 3-9) to the extraction (FDM-172S Q-13); (3) whether to
accept the FDM-172S tolerance proposals P-1..P-15 as proposals now (Q-11). The user
also reported merging the open PRs and asked for a post-merge check of DONE, README
and GAPS.

> yes to all, continue. i also merged all recent prs. the issue is that in DONE.md there may be duplicate or scrambled values (Accept both) and in README.md or GAPS.md there may have been false decisions when merging. Check that the current version is fine.
