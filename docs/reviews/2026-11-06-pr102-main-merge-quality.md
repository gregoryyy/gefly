# PR102 main-merge quality review

2026-11-06 17:50 Europe/Berlin. Reviewer: Codex `/root/ofm_housekeeping`,
acting as independent QUALITY. Implementation author: Codex
`/root/nav_receiver_trace`. The reviewer changed only this report; this is not
cross-provider peer review or specification acceptance.

## Reviewed revision and outcome

Publication checkout: `/private/tmp/gefly-world-airports`, merge
`61a5acbab4a9a179ebbcc8412b54f67f9d4ad965`, parents
`aa7d49439badd6631aadc9f289f8b511058aa59f` and
`446293af00423a6af3f1e4102a05804202ff207c`.
Scope: Task2.0.180 merge resolution and the necessary bounded assurance
extraction change, AS1/AS4/AS5/AS6; integration implications for
R-WORLD-12/R-DATA-1/R-COMM-2/R-NAV-2/R-AIRPORT-3.

**No blocking quality finding in the reviewed source.** Final integrated CI,
assurance diff and publication remain the integration owner's responsibility.
The initial pre-profile CI failed and remains historical failure evidence.

## Low finding: stale default-extraction wording

`docs/assure/SPEC.md:144` still says structured extraction includes the imported
regional style; `utils/assure/src/graph.ts:130` says every style field is retained.
The new exact hash-pinned profile deliberately omits those derived fields.
Expected: qualify both statements as the default when the profile is absent.
Actual behavior is correctly documented in AS1 and FORMAT and correctly enforced
in code; this wording inconsistency does not weaken the integrity gate.

## Independent source and semantic checks

- The parser admits only one exact path/SHA-256/mode with exact keys and a
  nonempty bounded reason. It cannot select aircraft JSON or arbitrary paths.
  Independent negative checks rejected null/object roots, duplicate entries,
  extra keys, empty reasons and changed path/hash/mode. Absent profiles retain
  structured extraction.
- Original style bytes are identical to both parents, SHA-256
  `f6ed255e627a3dbc74dcb0a27cc982c75872c20a31d5c7815b717ac5c150b048`.
  An independent recursive count found exactly15,988 JSON nodes including its
  root. A synthetic before/after graph comparison removed exactly those15,988
  style pointer objects and their derived containment relationships. All other
  nodes and surviving semantic facts remained; a separate aircraft child pointer
  remained structured. Whole-file identity/hash remains.
- The fixed60000-node/200000-fact limits, per-file20000-field/depth48 bounds,
  snapshot byte/path limits and containment checks are unchanged. Missing source,
  changed bytes and malformed profiles produce integrity errors. Refreshing an
  evidence pin to changed bytes cannot bypass the hard-coded profile hash.
- Explicit non-root source selectors and non-root result assertions against the
  profiled file invalidate evidence and transitive acceptance. Root selectors
  still describe the complete JSON value. The code does not substitute a
  whole-file node for an unavailable child or promote a rejected assertion.
- Every preexisting catalog record from both parents is retained unchanged.
  The only two existing catalog references to the style are whole-file inputs,
  without pointers or result assertions. No existing accepted child claim is
  discarded. The worldwide source record remains scoped provenance, not an
  independent runtime acceptance or operational completeness claim. This review
  does not use a provenance link to approve the extraction policy itself.
- Package script keys, both Node test-file inventories, Python command tails
  and dependencies are retained from both parents. Incoming main's missing JSON
  comma is repaired. Main's on-demand surface service and worldwide discovery
  remain distinct; the auto-merged `main.ts` limitation text describes community
  discovery separately from historical receiver support.
- Fence-aware log parsing confirmed all178 old-head and181 main DONE entries
  remain as complete unchanged normalized blocks. All input and research link
  targets from both parents remain indexed.

## Checks and artifact observations

Executed independently: `node --test src/graph.test.ts src/evidence.test.ts`
in `utils/assure`: **44 passed, zero failed/skipped**. This includes profile
omission, default/aircraft extraction, changed/missing bytes, invalid identity,
selector/assertion refusal, whole-file acceptance and transitive ineligibility.
Additional read-only scripts checked parser boundaries, raw node count,
before/after semantic preservation and the parent inventories above.

Inspected implementer-produced artifacts, not independently relaunched browsers:

- `output/flight/world-airports.json`, SHA-256
  `2825dc5893fb09dbaf16153e653858a384894a7a1f546c7560000aa293bff517`:
  eight passing groups, zero recorded errors; all eight recorded source hashes,
  harness hash and native engine hash match the reviewed checkout. Seven real
  distant airports, bounded caches, standby-only tuning, Review and unchanged
  paused native state are observed. Absent flight-plan, confirmation wording and
  relocation presentation checks remain explicitly not evaluated.
- `output/flight/airport-generator-browser.json`, SHA-256
  `84a96b48cf6bdf02e45aa77a67f006094c2f2565685afdb8a55dc4f4c35d0765`:
  four passing groups, zero recorded errors, with synthetic OSM geometry/pixels.
  This artifact has no complete source-pin envelope; its invocation and scope
  are supporting observations, not a new independently executed browser pass.
- `output-pr102-profile-assure.log`: the implementer's post-profile report names
  reviewed HEAD and reports44053 nodes/58574 facts/zero errors, with226 warnings
  and138 notes retained. It does not establish source truth or training fidelity.
- `output-pr102-profile-assure-diff.log` records current-main-to-worktree lineage.
  The removed style pointers are a declared granularity change, not deleted raw
  source or revoked accepted facts. Final integration diff/check renewal is still
  required after any further changes.
- `output-pr102-merged-ci.log` retains the earlier failed integrity gate after
  application611 Node/32 Python, assurance85 and training11 passed. Those stages
  must not be described as a successful final CI run; the profile adds four new
  focused tests and needs the final integrated gate.

Reviewed source SHA-256 pins:

| Artifact | SHA-256 |
| --- | --- |
| `utils/assure/src/json-extraction.ts` | `5e6f8b951946853ac55d14266b80202687e9da4ba155a119dbf3fc6e5f42bea3` |
| `utils/assure/src/graph.ts` | `682ed479ef8e44548712207a3e97065afc24af5d96143384649188bcabeaafd9` |
| `utils/assure/src/evidence.ts` | `4be83830d82682e8b8da5fdc3f46e401c36d408b2c0955f06504734f0e78e10b` |
| `docs/assure/catalog.json` | `d9535d5334bee74fc297c96f56361ee051080b37b6c5deb1bb85547d481df1af` |

No complete fresh audit of the original worldwide implementation, real-source
surface accuracy, RF/procedures, aircraft fidelity, embedded WebKit or training
benefit is claimed. Cross-provider peer remains pending under the batch cadence.

## 2026-11-06 17:54 — Wording finding resolved

Reviewed follow-up `d852845086ea900c989bf349c11b4678862a13bf` in the
publication checkout. The only graph change is a comment that now explicitly
describes unprofiled structured JSON; executable behavior is unchanged. The
assurance specification now qualifies default20000-field/depth48 extraction and
names the exact AS1 profile's whole-file/child-acceptance boundary. Both stale
statements identified above are corrected without broadening the exception.
The low finding is **resolved**.

Recomputed `utils/assure/src/graph.ts` SHA-256
`0f67ed46f4fac4398d0609614264ce5155caf31539a75a611f6619cc47ae1d48`
and `docs/assure/SPEC.md` SHA-256
`4f07bd1cf7d6f610a2c7b3d059e2bef6264f6f8227478d47f7b321a74eda6ef7`.
Prior focused execution remains applicable to the unchanged executable source.
Independently parsed the actual main-to-worktree diff: all15988 removed IDs are
`object:app/public/mapdata/terrain-style.json#` children, with zero other removed
IDs. No raw source bytes or existing catalog acceptance records were removed.

The final integrated CI is still running at this renewal; its success is not
claimed here. No blocking source-quality finding remains, with final integration
gates and all previously named scope/peer limitations preserved.

## 2026-11-06 18:00 — Final integrated CI renewal

Independently inspected `output-pr102-final-ci.log` from the publication checkout,
SHA-256 `9f11968ec3bc723a7248a3419408cb6e97e01bdc2ce0de75d715fbdd124206ee`.
Its assurance revision and current checkout both identify
`d852845086ea900c989bf349c11b4678862a13bf`. The final shared CI terminates
successfully for executed checks:611 application Node,32 application Python,
89 assurance and11 training tests pass. Integrity reports44054 nodes/58580 facts,
zero errors,226 warnings and138 notes; tracked whitespace passes3194 paths.
Offline tools execute242 of243 with one Linux-only skip. The JSBSim study has
nine unavailable-package skips among23 cases. Those ten skipped checks remain
untested, not passing results.

This current gate supersedes the pending-CI status above; the failed pre-profile
run remains a separate historical result. **No blocking quality finding remains
for this bounded merge/profile change.** Final assurance-diff inspection and
publication records remain with the integration owner. Previously recorded
browser presentation limits, original-implementation scope, data/physics fidelity
and cross-provider peer limitations remain unchanged.
