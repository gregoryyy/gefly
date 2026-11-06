# PR107 merge integration record

2026-11-06 18:19 Europe/Berlin. Implementer: Codex `/root/ofm_housekeeping`.
This is implementation evidence, not independent quality or specification acceptance.

PR107 branch `fix/map-fix-filter-preferences`, original head
`aeaa91625362ef9aa5645d6b43bb7d0d5dc981fe`, merges freshly fetched main
`1ac24f3bae53358d8a7bf4d9607504d7a13d4fec` (PR104 included).
The GitHub PR base metadata still named an older target and was not used as the
integration source. Main was fetched again before freezing and was unchanged.

Eight conflicts were resolved: package scripts, map search, practice map,
GAPS/SEC/SPEC/TODO and research index. Main's worldwide search callback and the
branch's cloned saved initial category selection are both present. The same
category set filters local and remote directory rows, airport markers, historical
fixes and worldwide NAV overlays. Both independent generations and source/native
boundaries remain. No automatic GPS creation or new receiver signals are added.
The branch's superseding single Fixes gate and persistence criteria are retained;
main's new worldwide requirements remain canonical rather than duplicated.

Package scripts retain both Node/Python inventories and all browser commands,
with unchanged dependencies. Fence-aware comparisons retain all181 original-head
and184 main DONE entries as unchanged normalized blocks. All input/research link
targets survive. Dated decisions remain newest first; source/security sections are
joined rather than overwritten. Shared new task/status records belong to the
orchestrator and are not independently allocated here.

Executed before freeze: `just check` passes423 Markdown documents; ten pure
location-preference/category tests pass without failures/skips; `npm run check`
(TypeScript) exits0; `git diff --check` passes. Browser, full shared CI, final
assurance check/diff and independent QUALITY/VALIDATE are pending. Earlier PR107
runs remain historical, not automatically renewed by this merge. Cross-provider
peer remains pending under the existing batch cadence.
