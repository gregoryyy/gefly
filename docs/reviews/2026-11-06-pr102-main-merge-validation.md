# PR102 main-merge validation

2026-11-06 17:51 Europe/Berlin, clock-derived. Independent validator: Codex
`/root/camera_return_validate`. The validator did not implement this merge or
assurance change. This report is a bounded validation, not cross-provider peer
review or acceptance of worldwide data accuracy, radio reception, aircraft
behavior or training fidelity.

## Frozen scope and recommendation

Reviewed publication worktree `/private/tmp/gefly-world-airports`, merge
`61a5acbab4a9a179ebbcc8412b54f67f9d4ad965`, with parents
`aa7d49439badd6631aadc9f289f8b511058aa59f` (PR102) and
`446293af00423a6af3f1e4102a05804202ff207c` (main, airport generation).
Applicable criteria are Task2.0.180, R-WORLD-12/R-AIRPORT-3 source-boundary
preservation and the amended AS1/AS4/AS5/AS8 contract under R-ASR-1/R-ASR-3/R-ASR-5.
The immutable publication request `docs/input/2026-11-06-pr102-conflicts.md`,
[assurance contract](../assure/SPEC.md),
[format](../../utils/assure/FORMAT.md), SEC and GAPS define the bounded exception;
the validator did not redefine these criteria.

**Recommendation:** the merge preservation and exact generated-style exception
pass the independently exercised criteria below. Final publication acceptance is
**blocked pending the renewed shared CI and final integration assurance/diff**.
The earlier full CI failure is retained; focused success does not replace that
gate. The runtime browser evidence below covers the merged application with
explicit presentation limits, not all of either feature's original specification.

| Criterion | Expected | Observed evidence at this revision | Result |
| --- | --- | --- | --- |
| Task180: preserve worldwide discovery and airport generation | Retain separate static OurAirports discovery and on-demand OSM surface pipelines, test inventories and worker boundaries | Git comparison found 1,049 worldwide assets/modules/map/COM paths unchanged from PR102 and all18 selected generator/compiler/server/loader/surface paths unchanged from main. Main wiring retains discovery; scene retains airport rendering. Vite registers and disposes the airport service in development and preview. Both script inventories and test tokens survive. | pass |
| Task180/AS8: preserve historical records and source inputs | Keep complete DONE records, raw input bytes and index coverage from both parents | Independently parsed complete heading/body blocks: all178 PR102 and181 main records unchanged. All138/141 respective raw input Git blobs unchanged; input-index link sets from both parents retained. | pass |
| AS1: exact file-level exception | Omit only derived pointers for the reviewed generated cartography, retaining complete bytes/file hash | Independent small-graph comparison omitted exactly15,988 object nodes, each under the style's `#` pointer namespace with derived JSON-pointer scope. The174,559-byte source and whole-file object/hash remain. No application data conversion or deletion occurred. | pass |
| AS1/AS3: default structured extraction and limits | No generic JSON exclusion, aircraft-field hiding or graph-cap increase | Removing the optional profile restores style pointers. Separate `data/aircraft.json#/x/y` remains in both graphs. Code retains20,000 fields/depth48 per JSON and60,000 nodes/200,000 facts globally. Existing aircraft and default-extraction tests passed. | pass |
| AS5: fixed path/hash/mode/schema | Reject missing/changed source and all unapproved profile shapes | Focused tests plus independent parser probes reject wrong paths including a `./` alias, wrong hash/mode, extra fields, null/object instead of list, duplicate entries and empty/oversized reason. Graph errors cover missing source and changed bytes. | pass |
| AS4/AS5: whole-file acceptance versus child selectors | Preserve eligible whole-file/root evidence; reject child input/result assertions without fallback | Independent synthetic accepted run plus independent-review fixture accepts whole-file and explicit root input pins. Seven input-selector variants and four child-result variants reject acceptance with errors and no `implements` fact. Changed source remains ineligible after refreshing its evidence pin; missing source also rejects. | pass |
| AS8: retain declared evidence and accepted facts | Do not erase catalog evidence/criteria to meet the graph budget | All catalog records from each parent are retained as equal JSON objects: PR1023guards/14evidence/14criteria/1aircraft; main3/13/14/1. Only the optional profile is added. The removed generated pointers were not catalog acceptance records. | pass |
| Merged runtime regression, bounded discovery | Existing global worker search, standby guards, fallback and paused/Review isolation remain usable | Inspected actual browser packet: eight passing groups for LOWW/LFPG/LSZH/FACT/KJFK/RJTT/NZQN, source navaid and NDB cases, cache/failure fallback and native-state invariance; zero errors. This publication harness explicitly does not evaluate absent plan/confirmation/relocation presentation. | pass |
| Merged runtime regression, bounded surface pipeline | Existing compiler/browser workers, rendering/cache/traversal and Review isolation remain usable | Inspected actual browser packet: four passing groups using synthetic OSM surfaces with actual app/compiler/browser worker/Cesium/native transport, source/cache lifecycle and no physics mutations; zero errors. Source/survey accuracy is not evaluated by these fixtures. | pass |
| AS7/AS8: renewed integrated shared gate | Final shared CI and assurance/diff after the core repair | Earlier CI failed its integrity stage at unchanged graph cardinality. Post-profile assurance report has44,053 nodes/58,574 facts/0errors, but final renewed shared CI and final diff remain pending at this report snapshot. | blocked |
| Cross-provider and broader acceptance | Distinguish this local review from provider independence and source/aircraft/global coverage | No covering fresh external-provider packet or source/flight fidelity evaluation was executed by this validator. | not evaluated |

## Exact source identity

Hashes independently read from the reviewed merge commit:

| File | SHA-256 |
| --- | --- |
| `utils/assure/src/json-extraction.ts` | `5e6f8b951946853ac55d14266b80202687e9da4ba155a119dbf3fc6e5f42bea3` |
| `utils/assure/src/graph.ts` | `682ed479ef8e44548712207a3e97065afc24af5d96143384649188bcabeaafd9` |
| `utils/assure/src/evidence.ts` | `4be83830d82682e8b8da5fdc3f46e401c36d408b2c0955f06504734f0e78e10b` |
| `docs/assure/catalog.json` | `d9535d5334bee74fc297c96f56361ee051080b37b6c5deb1bb85547d481df1af` |
| `docs/assure/SPEC.md` | `5b1d5062d7c568b5711303c59a90847e8df34972a3056b640274624154954650` |
| `app/vite.config.ts` | `a52302384b9fe22dbb73e2cd01659067faa068be08a5571ac4cc02e0b7050e2c` |
| `app/src/main.ts` | `e44861d277762b0001f0e5084da53412779a9a7485cf4fb672f282ef31c147ca` |
| `app/package.json` | `43ed764a3b9da95000419b0b3eefb9316f2bf6ea9c921190efaca3405f21e97c` |

The single allowed profile is
`app/public/mapdata/terrain-style.json`, SHA-256
`f6ed255e627a3dbc74dcb0a27cc982c75872c20a31d5c7815b717ac5c150b048`,
mode `file-level`. Its full source bytes match both the parser allowlist and
catalog declaration. Independent recursive JSON traversal counted15,988 values,
including the root. These are rebuildable cartographic lineage objects, not
accepted aircraft values or evidence outcomes.

## Independent execution and preservation checks

Executed from the publication worktree:

```sh
node --test utils/assure/src/graph.test.ts utils/assure/src/evidence.test.ts
```

Observed44tests passed,0failed/cancelled/skipped/TODO, Node26.13.0. This includes
existing negative evidence/schema/applicability tests as well as the four added
profile tests. The existing documented limitation concerning negated aircraft
designators is a known limitation test, not newly accepted semantic accuracy.

The validator also ran in-memory `node --input-type=module` fixtures importing
the actual `buildGraph`, `inspectEvidence` and profile parser. To reproduce the
small graph comparison, use the same source style, empty catalog/authoritative
documents, no commits and one ordinary `{"x":{"y":7}}` aircraft JSON file;
build once without the optional profile and once with it. Compare node identities,
file hashes and pointer scopes. Exactly15,988 style pointer objects disappear;
the file object and ordinary aircraft pointer remain. This is deliberately not
a duplicate full repository graph build.

For the acceptance probes, create one passing synthetic run, a distinct eligible
manual review and an accepted criterion, with all required role pins. Add the
style as a whole-file input; then independently substitute these input pointers:
`/version`, `/layers/0`, `/~1version`, `#/version`, `/`, `/layers/999999`,
`/layers/0/id`. Also use `/version`, `/layers/0`, `/~1version`, `/` as result
assertions on the profiled file. Each must produce an error, no eligible claim
and no `implements` fact. Empty input pointer remains an explicit root selection;
it is allowed by the declared whole-value semantics. Change style bytes by one
newline and refresh the evidence SHA: profile identity still rejects acceptance.
Remove the source: acceptance also rejects.

The first custom probe incorrectly demanded an explicit `eligible=false` node
for every malformed pointer. For `#/version`, schema rejection returns no claim
node, which also denies acceptance. That probe failed its own assertion. The
validator corrected the probe to require absence of an eligible claim and
`implements`, plus an error; all11 variants then passed without implementation
changes. This unsuccessful observation is retained separately from the passing
renewal.

Independent Python/Git comparisons checked full DONE blocks rather than only
headings, all raw-input blob identities, unioned input-index links, package-script
keys and whitespace-delimited test-command tokens, and equal complete catalog
records from both parents. The inherited main package comma repair was accounted
for when parsing that parent's otherwise invalid JSON; merged JSON parses
normally. Neither old catalog's records were edited or silently discarded.

## Supplied execution artifacts and gate history

Inspected local evidence, produced by the integration/browser agents rather than
re-executed by this validator:

- `output/flight/world-airports.json`, SHA-256
  `2825dc5893fb09dbaf16153e653858a384894a7a1f546c7560000aa293bff517`:
  eight groups, zero errors, actual worldwide packages/discovery worker/native
  app. Its three presentation exclusions remain explicit.
- `output/flight/airport-generator-browser.json`, SHA-256
  `84a96b48cf6bdf02e45aa77a67f006094c2f2565685afdb8a55dc4f4c35d0765`:
  four groups, zero errors; synthetic source geometry, actual rendering/transport.
- `output-pr102-merged-ci.log`: initial integrated app611Node/32Python,
  assurance85 and training11 passed, but integrity failed with
  `graph exceeds node/fact limit`; terminal `Foundation CI: FAILED`.
  It is not a passing final gate and predates the bounded extraction repair.
- `output-pr102-profile-assure.log`: report identifies HEAD61a5acb and input hash
  `cdc948b2d56af576a6b486e078660205754e45c9abde6e971fe4e672c612db2d`,
  44,053nodes/58,574facts,0errors/226warnings/138notes, with a visible
  `json-profile.applied` note. This is reported full-graph evidence, not a graph
  regenerated by the validator. Warning/unknown-source semantics remain explicit.

No final full-CI success, final integration diff, hosted run, genuine external
peer review, worldwide operational completeness, surveyed airport accuracy or
native aircraft fidelity is inferred from these observations. Any affected source
change requires renewed validation before these scoped passes are reused.

## Final integrated renewal

2026-11-06 18:02 Europe/Berlin, clock-derived. The publication snapshot is now
`d852845086ea900c989bf349c11b4678862a13bf`. Reviewer independently inspected its
diff from the previously reviewed61a5acb merge: only the graph walk's explanatory
comment, the assurance SPEC's qualification of default unprofiled JSON extraction
and the implementation record changed. No executable core or application behavior
changed. The new graph source SHA-256 is
`0f67ed46f4fac4398d0609614264ce5155caf31539a75a611f6619cc47ae1d48`;
the updated assurance SPEC SHA-256 is
`4f07bd1cf7d6f610a2c7b3d059e2bef6264f6f8227478d47f7b321a74eda6ef7`.
Other recorded source pins and the earlier independent negative/preservation
checks remain applicable; the documentation now accurately names the exception.

| Remaining integrated criterion | Observed final evidence | Result |
| --- | --- | --- |
| AS7/AS8 renewed shared gate | Complete final CI identifies HEADd852845,611Node/32Python application tests,89assurance tests and11training tests passed, assurance integrity0errors and3194tracked-path whitespace passed, with terminal CI success. | pass for executed checks |
| AS1/AS8 inspect actual graph removals against main | Independently parsed final JSON diff from446293a:1232added/259changed/15988removed identities. Every removed identity is an `object:app/public/mapdata/terrain-style.json#…` pointer; no other identity or catalog claim is removed. | pass |
| AS6 honest bounded impact | Final diff exposes truncated impact closure; this does not establish an all-clear for all dependencies. Existing source-boundary, catalog and raw-record audits remain separate positive evidence. | pass for disclosure, not complete impact coverage |

Reviewer read `output-pr102-final-ci.log` through completion. SHA-256:
`9f11968ec3bc723a7248a3419408cb6e97e01bdc2ce0de75d715fbdd124206ee`.
Its integrity report identifies input hash
`d5d76450c95c61f8ec78931c846483ed5d9b0833dba734d4163d443b89b840a9`,
44,054nodes/58,580facts,0errors/226warnings/138notes. Python application counts
are6+6+10+10, all successful. Repository tools execute242of243 with one platform
skip; the JSBSim study executes14of23 with nine optional package-unavailable
skips; the C172S study executes25of25. The terminal summary is
`Foundation CI: passed with skipped checks`. These observed skips are not passes;
the earlier pre-profile cardinality failure remains historical above.

The independently parsed `output-pr102-final-assure-diff.log` has SHA-256
`f83ef890d7f6f48765b3d05462156efc080497f62f1753583d1902c61367a7e2`.
The execution owner separately confirms its exit0. Its target is the frozen
worktree atd852845 and baseline is
`446293af00423a6af3f1e4102a05804202ff207c`. The impact closure is explicitly
truncated, with5147nodes/1491initial paths and no unknown queries; absence of
unknown queries does not establish complete downstream coverage. No duplicate
full graph/CI run was launched by this validator.

**Final bounded recommendation: pass for Task2.0.180's merge preservation and
exact generated-cartography extraction change atd852845.** The preceding blocked
shared-gate/diff condition is resolved by actual completed evidence. Runtime
discovery and surface-browser observations retain their separate fixture/data
scopes and presentation exclusions. Final shared status/report integration,
post-document assurance and publication bookkeeping remain integration-owned.
Hosted CI, cross-provider peer, worldwide operational/source completeness,
aircraft fidelity and training acceptance remain not evaluated by this review.
