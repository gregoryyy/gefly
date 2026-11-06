# PR109 current-main merge validation

2026-11-06 18:39 Europe/Berlin, clock-derived. Independent validator: Codex
`/root/camera_return_validate`, not an implementer of this feature or merge.
Scope is Task2.0.177's worldwide historical receiver repair under R-NAV-4 and
its R-NAV-1/R-NAV-2/R-DATA-1 source/identity boundaries. The
[previous navigation validation](2026-11-06-nav-reception-validation.md) remains
historical for its earlier integration. This report does not reaccept all
navigation, current operational data, surveyed source accuracy or aircraft fit.

Frozen publication worktree `/private/tmp/gefly-world-nav`, merge
`3e44fe28c4d33403260a3681f2eb55c9d6af78cc`, parents
`719684628341471349e267102c9b7a8a76f26e5a` (PR109) and
`c19caa5277b1eff846fea55e280b4e500bd5ead2` (current main, including PR104/107).
Manual conflicts are package scripts, main's limitation text, GAPS, SEC, TODO
and research index. No receiver/model/data retuning was part of this merge.

**Source-focused recommendation: pass.** No source-validation blocker to
publishing this merge snapshot was found. **Current actual browser and final
shared CI/assurance acceptance remain pending.** Source preservation and pure
tests do not establish current integrated native receiver/AP execution.

| Criterion | Expected | Observed at this revision | Result |
| --- | --- | --- | --- |
| R-NAV-4 contract/source applicability retained | Historical worldwide receiver scope, exact edition/source and explicit unsupported/current-data limits remain | Exact R-NAV-4 declaration unchanged from PR109 parent. Main limitation text retains incoming worldwide community discovery and separately describes historical worldwide NAV810 receiver services. | pass |
| Active source identity and bounded loading | Fixed historical asset/id, bytes/hash/schema before exposure; no arbitrary data import | Manifest/world package/original gzip/regional package/shared receiver/compiler/harness bytes are identical to PR109 parent. Independently checked active4,884,389-byte package SHA against manifest and7,923-service inventory. Loader preserves fixed world id/asset exception,8MiB/10,000record caps, UTF-8/hash/schema/unique-ID checks and deeply frozen private channel indexing. | pass by source/identity tests |
| Preserve regional services | Existing regional identities/components survive expansion | Independent full-record comparison finds all86 regional service objects deeply equal in the active worldwide package. Counts are3,720VOR/3,490LOC/713standaloneDME. | pass for source correspondence |
| Units and coordinate/reference boundaries | Keep source feet/metres, kHz/MHz, NM, true LOC versus station-calibrated magnetic VOR distinct | Compiler retains source feet×0.3048, NAV frequency conversion to kHz and source NM ranges; geometry uses radians and1,852m/NM. VOR calibration and fixed LOC true course remain separate; tests cover CDI signs, DME bias/slant range and paired GS rather than inventing components. | pass for inspected code/reference fixtures |
| Receiver/model boundary | Discovery records cannot fabricate historical RF services or mutate dynamics; UI/worker identities must agree | OurAirports discovery/filter/preferences remain separate from `loadNavigationPackage` and the shared receiver. Existing UI/worker hash checks, active/standby/OBS semantics and native guidance path remain. Only validated frozen catalogue arrays gain an index; mutable arrays retain per-call validation. | pass by source/unit evidence; actual native integration pending |
| Unsupported/ambiguous service handling | Invalid/unknown/cochannel/missing components stay unavailable; DME independent of lateral/GS | Independent tests pass invalid/untuned/cochannel/source-sector cases, mutable-record changes, both receivers, standalone DME and source-paired LOC/GS. No ADF/TACAN/current-IFR receiver is newly inferred. | pass for source/unit criteria |
| Preserve current merged features/history | Keep current discovery/filter/settings implementations, all test registrations and complete records | Independent audits preserve181 PR109-parent and185 main-parent complete DONE blocks,140/145 raw input blobs, index links, equal catalog records, script keys and unit/browser command tokens. Merged package JSON parses. Source comparisons retain new main's preference/filter/world-discovery hooks. | pass |
| Current compiler/TypeScript evidence | Existing source compiler and merged types pass | Inspected implementer log reports9Python compiler tests passed and current TypeScript exit0; no behavior/source change followed. These are supplied execution evidence, not independently rerun Python/TSC. | pass on supplied evidence |
| Actual merged native/browser reception | Both receivers, standby swap, DME-only, LOC/GS and real worker guidance work at new main/UI hashes | New actual browser artifact not complete at this initial inspection. Earlier separate-app/publication browser evidence is not reused as this merge's execution. | blocked pending execution |
| Final shared gate/assurance | Current complete CI and final assurance/diff | Not completed at this report snapshot. | blocked |
| Operational/aircraft/device/provider acceptance | Distinguish source correspondence from current real navigation, RF propagation, training and cross-provider peer | Not evaluated in this bounded merge review. | not evaluated |

## Exact source identity and independent checks

| File | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `03c47cdc19097647f2c44342bc35a118279fd71b10fcb7078ca615f575636a81` |
| `app/src/radio-nav-panel.ts` | `d5e477f3c9485ef7c4a970c42e0ca9828007f5c5b14a25788a660a28a2eb0779` |
| `studies/e1-browser/sim/navigation.js` | `cb24e1e7662c5efe0c92fc8888e34af71cd04276fb00d9ad47026bb2ae297afe` |
| `app/public/navdata/manifest.json` | `82e66762a7699f440394e75b573079483fa6845d1493af2074cd7b3f001b5312` |
| `app/public/navdata/world-v1.bin` | `dafdf4c31d00094c1f1b2762949b152e8c11deeb6af8ace3a1551bad9955e8ec` |
| `app/public/navdata/source-nav810-gzip.bin` | `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839` |
| `app/public/navdata/rhein-main-v1.json` | `74669c616286abe52ab03d72851100c6c412431c12b6a6b661471e2cecc85d63` |
| `utils/navdata/build_navdata.py` | `23f8d2c57015056097611de8a23b89758325cc0ba908e38515a3122ac346a43d` |
| `app/tests/world-navigation.browser.mjs` | `87f12a152d02e07e4624c9f1e6ea2e1338fbd309e6fbae7f242f0d59f8ab2d1a` |
| `docs/SPEC.md` | `ab24fbed96db950a9e84af3ceea851e61106636b41d148197808d8ff82db243b` |

Executed independently from the publication worktree:

```sh
node --test studies/e1-browser/sim/navigation.test.mjs app/src/navdata-identity.test.ts app/src/flight-map-navigation.test.ts app/src/navigation-approach.test.ts
node --test app/src/radio-nav.test.ts
```

Observed26+9=35passed,0failed/cancelled/skipped/TODO. This is distinct from the
implementer's31-case subset. Inspected assertions include real source-package
loading/hash/schema/indexing, regional components, independent NAV2, DME-only
range, magnetic/true references, invalid positions/records, identity failures and
guarded configuration. No full aircraft/performance tolerance is invented.

Independent Python/Git inspection checked the active source manifest bytes/hash,
all86 regional record objects and service counts, unchanged PR109 source/data/
harness identities, whole DONE block bodies, raw input Git blobs, index link
sets and complete catalog/script inventories from each parent. The package remains
explicitly `historical=true`, edition2013.10, with its existing GPL-2.0-or-later
source record. The prior exhaustive source-line/component audit is retained as
earlier independent evidence on unchanged data; it was not re-executed here and
is not proof of present-day source truth or new rights.

Current receiver/browser/native and full-CI outcomes must be supplied before
closing the remaining gates. No duplicate browser, full graph or whole CI run was
launched by this validator. Final status and publication are integration-owned;
changed affected source requires renewed evidence.

## Map-zoom main merge — source renewal

2026-11-06 18:47 Europe/Berlin, clock-derived. Frozen publication now merges
`b5b6235fcb540914ac549f79c7d32050e85cd291`, parents
`3e44fe28c4d33403260a3681f2eb55c9d6af78cc` and map-zoom main
`5cd1c6fb5053dd7511b2776130c9ec070b606ccc`.
**Source-focused recommendation remains pass; current browser/full CI pending.**

Reviewer independently verified that receiver, active manifest/world data,
original gzip, radio panel and receiver browser harness are unchanged from the
previous source review. Main now has SHA-256
`ef69b202bde3b4c91714523cea0635a33d341cca921e623c99de0eba0ab5b2ae`.
Removing only the single limitation-description line makes its contents exactly
equal to incoming main. Practice-map, map-zoom router and flight-assists bytes
are exactly incoming main, preserving reviewed108 key priority, category
preferences and worldwide discovery without a new receiver mutation path.

Both parent script keys and unit/browser command tokens survive. Whole-record
inspection preserves all186 DONE blocks from each parent, all146 raw input blobs
from each parent, input-index links and equal catalog records. No executable
receiver/data change requires new source tuning or unit tolerances. Supplied
focused units, compiler and TypeScript pass at the frozen merge; these do not
replace actual receiver/native browser execution at its changed main identity.
No old browser or CI artifact is promoted to this new integration.

## Current actual receiver/browser and full-CI renewal

2026-11-06 19:00 Europe/Berlin, clock-derived. Reviewer independently inspected
the new actual current browser artifact at
`b5b6235fcb540914ac549f79c7d32050e85cd291`,
`output/flight/world-navigation-browser.json`, SHA-256
`b79d83d821f5d238156deb6691cef45ad221c88af3c39a7f951a33abe6c0b5a6`.
It records seven passing groups on Chromium156.0.8078.80 with zero errors. All
six runtime/harness hashes were recomputed and match the current files, including
mainef69b202… and receivercb24e1e7…. The artifact identifies the actual active
world-nav810-2013-10-v1 package,4,884,389bytes/7,923records and SHA-256dafdf4c3….
Earlier browser results are not substituted for this changed main integration.

| Previously pending current criterion | Observed new evidence | Result |
| --- | --- | --- |
| Bounded station directory | At most200 initial station rows, with search reaching a distant source beyond the initial cap. | pass |
| Both receivers/standby activation and source coherence | CPT114350kHz, KLO114850kHz and CTV115700kHz cases perform real historical standby-to-swap on both receivers; instrument CDI/bearing/DME and native NAV1 agree, with paused step0 and state invariance assertions. | pass |
| Actual fixed-step AP NAV outside old region | CPT live case advances0→224native steps over112observed frames; AP NAV/source remains valid in every captured frame. | pass for this bounded run |
| DME-only and preserved LOC/GS semantics | Standalone DME retains lateral/CDI/bearing invalid and cannot provide AP lateral guidance; preserved EDDF IFCW supplies separate NAV1 localizer/glideslope bars, NAV2 localizer-only and coherent native guidance. | pass |
| Current complete shared CI | Final log completes647Node/32Python application tests,89assurance and11training tests, integrity and3234tracked-path whitespace with a passing terminal summary. | pass for executed checks |
| Final explicit assurance diff | Current explicit5cd1c6-base diff is deferred until other heavy assurance work finishes; no completed current diff observed. | blocked pending final diff |

Reviewer read `output-pr109-final-ci.log` through terminal completion. SHA-256:
`876563764677e6e7a1dd874185b36070191dc8775a2b171a87454b3af67ef054`.
Its integrity report identifies44,175nodes/64,733facts,
0errors/226warnings/138notes and input hash
`270ee4a495e49dfdb97f6ab593dd9784832c07c642c97407bda3e7f10d2c7721`.
Nine optional JSBSim study and one platform-tool checks remain skips, not passes.

**Current bounded receiver/browser and full-CI recommendation: pass; final
explicit assurance/diff remains pending.** Scenery pixels/optional imagery are
fixtures; native worker and instrument components are actual. This does not
accept current operational data, RF propagation or installed-receiver calibration,
surveyed approach fidelity, full recorded Review, aircraft/training fidelity,
embedded WebKit/device coverage or external-provider peer. Final status and
publication bookkeeping remain integration-owned.

## Final explicit-diff renewal

2026-11-06 19:08 Europe/Berlin, clock-derived. Reviewer independently parsed
the completed final `output-pr109-final-assure-diff.log`, SHA-256
`431cdbb2ca03454ca25fea8e64baad7cf3744ba0e34fcb440afedc89f1be7be9`.
It compares tested main `5cd1c6fb5053dd7511b2776130c9ec070b606ccc` with the
frozen worktree at `b5b6235fcb540914ac549f79c7d32050e85cd291`:26added,
265changed,0removed identities, untruncated impact and no unknown queries.
The execution owner separately confirms exit0. No duplicate graph run was made.

The compact `output/flight/pr109-merged-runtime-summary.json` explicitly names
that revision/base and the previously inspected647/32/89/11CI and seven-group
browser artifacts; it does not claim later-main acceptance. All seven summary
source/data/harness pins were independently recomputed and match. Earlier
actual/native browser observations, source/unit reviews, full CI and the final
parsed diff now jointly support the bounded integration criteria.

| Final remaining criterion | Observed evidence | Result |
| --- | --- | --- |
| Explicit current assurance diff | Correct5cd1c6 base,26added/265changed/0removed identities, no truncated/unknown impact; supplied exit0 and actual JSON/hash independently verified. | pass |
| Frozen evidence/scope coherence | Summary scope/source pins agree with currentb5b6235 and the previously inspected browser/CI; no source change or later revision is silently included. | pass |

**Final bounded recommendation: pass for Task2.0.184's receiver-source merge at
b5b6235 against its tested5cd1c6 base.** The previous explicit-diff pending
condition is resolved. This accepts the scoped software integration and tested
historical receiver behaviors only. Operational/current-data, aircraft/installed
receiver fidelity, source completeness, wider devices/full recorded Review and
external-provider peer remain outside this acceptance. Final report/status and
publication bookkeeping remain integration-owned.
