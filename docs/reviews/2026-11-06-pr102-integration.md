# PR102 merge integration record

2026-11-06 17:40 Europe/Berlin. Agent: Codex `/root/nav_receiver_trace`, acting as
integration implementer. This record is not its author's independent acceptance.
Task2.0.180; R-WORLD-12/R-NAV-2/R-DATA-1/R-COMM-2/R-AIRPORT-3.

## Revision and conflict scope

Initial branch `feat/worldwide-airport-data` was clean at
`aa7d49439badd6631aadc9f289f8b511058aa59f`, with current
main `446293af00423a6af3f1e4102a05804202ff207c` fetched from origin.
The merge conflicted in `app/package.json`, `docs/ARCH.md`, `docs/GAPS.md`,
`docs/SBOM.md`, `docs/SEC.md`, `docs/TODO.md` and `docs/research/README.md`.

The package resolution retains both test inventories and commands: worldwide
source validation/discovery, on-demand airport source/cache tests, initial model
balance and centered-yoke resize. It repairs the missing comma after main's
`test:airport-generator` command. Documentation retains both source and worker
boundaries, tasks and research links. The inherited empty input-index bullet is
removed; all actual input records remain indexed.

The configured log merge driver preserved all178 old-head entries and181 main
entries as whole, unchanged blocks, independently checked by block inclusion.
`main.ts`, `scene.ts` and `SPEC.md` merged without textual conflict. Worldwide
source bytes, worker/loader, map and COM discovery implementations are unchanged
by the merge. The map inventory stays distinct from OSM visual airport surfaces,
native physical terrain and historical radio-receiver services.

## Executed checks and pending integration gates

`just check` passed413 Markdown documents before this new record was added.
The integrated application tests passed611 Node and32 Python cases. Assurance
unit tests passed85 and training tests11. The initial full CI attempt failed
its integrity stage because the generated graph crossed its existing60000-node
bound; it must not be reported as a passing CI gate. The cap was not raised.

Actual Chromium browser runs completed after CI's isolated npm install:

- `npm run test:world-airports`: eight groups pass using the actual worldwide
  packages/discovery worker/native engine, covering seven distant airports,
  guarded standby loading, Review, cache bounds and regional fallback.
- `npm run test:airport-generator`: four groups pass using the real compiler
  worker, browser loader worker and Cesium/native integration, with synthetic OSM
  geometry and scenery pixels; covers persistent disk reuse, traversal, lifecycle
  cancellation and no source generation during Review.

These results retain the publication harness's explicit unavailable-plan,
confirmation-feedback and relocation presentation limits. They do not accept
unrelated working-app features, source completeness, surveyed geometry, actual
radio reception or aircraft/training fidelity. Source engine bytes were unchanged
(`266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc`).

Independent review, final CI/integrity, assurance diff and publication are pending
at this record's initial revision. Original PR102 evidence remains historical;
new merge checks do not retroactively change those runs. Cross-provider peer
remains pending under batch cadence.


## Bounded cardinality repair before renewed CI

The orchestrator approved one exact path/hash extraction profile for the imported
generated `app/public/mapdata/terrain-style.json`. Original style bytes, all
pre-existing catalog records and accepted whole-file claims are unchanged. The
profile omits only15988 disposable derived style pointers. It does not exempt
hand-authored or aircraft JSON, increase any cap, or accept child selectors via a
file fallback. Missing/changed bytes and unapproved profiles fail integrity;
input child selectors and result child assertions make acceptance ineligible.

The44 focused graph/evidence tests pass, including four new profile cases.
The first profile-enabled `just assure check` at merge head
`61a5acbab4a9a179ebbcc8412b54f67f9d4ad965` passed with44053 nodes/58574 facts,
zero errors,226 warnings and138 notes. The diff against current main446293a
contains1231 added,259 changed and15988 removed identities. Every removed ID is
an `object:app/public/mapdata/terrain-style.json#...` child; no other IDs or
accepted claims were removed. Its bounded impact closure was truncated and is
not an all-clear for unknown dependencies. A review found two old explanatory
sentences claiming universal style-field extraction; they are qualified to the
default unprofiled structured path without changing behavior.

This records the repair and executed checks, not the pending full-CI rerun or
independent acceptance. The initial cardinality failure above remains historical.

## Final published-source renewal

2026-11-06 18:03 Europe/Berlin, Codex orchestrator. Published head d852845 has
complete CI exit0:611Node/32Python/89assurance/11training; one platform and nine
optional JSBSim skips remain explicit. Both actual browser suites retain their
frozen eight/four passing groups. Final diff exits0 with1232added/259changed/
15988removed, exclusively generated style-child identities; impact is truncated.
The companion merged-runtime JSON pins source/results and preserves the earlier
cap failure. Root owns completion documentation and renewed final assurance.
