# Worldwide OurAirports integration: independent quality review

Recorded 2026-11-06 12:50 Europe/Berlin by Codex `world_airport_quality`.
Task 2.0.170; R-WORLD-12/R-DATA-1/R-NAV-2/R-COMM-2.

## Outcome and scope

**No blocking quality findings remain in the frozen code/data and browser scope.**
The reviewer authored no implementation. This is same-provider independent quality,
not specification validation, cross-provider peer review or release approval.
Full final publication CI is pending at this report's recording time; no full-CI
or whole-dirty-workspace assurance pass is inferred here.

Reviewed the ROOT integration and the feature-only publication worktree at
`/private/tmp/gefly-world-airports`, base `6563c59`, data commit `0922a23` and UI
commit `f58cb20`. Shared modules are identical; the two map/popup integrations
preserve their respective pre-existing interfaces. ROOT contains additional
unmerged map/planning features that are not silently bundled into this feature's
publication variant. ROOT-only surrounding work is not accepted by this review.

## Findings and resolution

| ID | Severity | Finding, reproduction and expected behavior | Final disposition |
| --- | --- | --- | --- |
| Q1 | Medium | `practice-map.ts`: a verified manifest followed by all optional cell failures published an empty snapshot and suppressed the regional catalogue. Abort/503 every cell while allowing manifest and regional assets: expected regional fallback, formerly no airport entries. | Resolved. Regional arrays are retained separately; empty loading/failure is distinct from confirmed empty coverage. Both final browser profiles inject cell503 and retain all 731 regional entries with unchanged paused native state. |
| Q2 | Medium | `world-airport-repository.ts`: aggregate count limits or cross-cell duplicate IDs made `snapshot.partial` true while status could still claim ready. | Resolved. Status reads the same memoized aggregate admission result; independent Node tests exercise aggregate truncation and duplicate identities. |
| Q3 | Low | Publication `practice-map.ts` caption port removed the pre-existing Aerial/vector source descriptions. | Resolved. The publication variant retains its original conditional mode descriptions and appends worldwide inventory scope. |
| Q4 | Low | Compiler text limits are not perfectly aligned with client limits: for example, compiler navaid/runway-end identifiers allow the default 200 characters while the client uses 40. Python code-point versus JavaScript UTF-16 length can also differ. | Nonblocking follow-up. The current pinned snapshot passes every client cell validation. Future snapshot updates must retain the all-cell acceptance gate; align shared field budgets or add cross-language boundary fixtures. No current source row failure was observed. |
| Q5 | High | Browser global search failed because `.gz` static delivery carried `Content-Encoding:gzip`; fetch auto-decoded before the explicit compressed-byte/hash reader. A nearby LFPG result could conceal failure of actual global search. | Resolved. Gzip bytes use fixed `search.bin`; final HTTP/body/hash checks establish 3,043,698 archive bytes with no content encoding. Actual discovery-worker RPC completion is required before selection, with LOWW outside the initial nearby cells tested first. |
| Q6 | Medium | `world-airport-loader.ts`: failed Worker construction/protocol could restart on every following-position update, bypassing repository cooldowns. Independent reproduction produced 100 attempts/status messages from 100 calls. | Resolved. A one-minute restart cooldown and deduplicated unavailable notification now produce one construction/status for 100 calls; a controlled clock advance permits the second attempt. Current tests also reject messages from terminated workers. |

No silent implementation repair was performed by the reviewer. Earlier failing
browser attempts and intermediate source hashes are historical, not current passes.

## Independent checks

Commands actually run by this reviewer on the final affected sources:

- `node --test app/src/world-airport-data.test.ts`: 20 passed, 0 skipped/failed.
- `python3 utils/airports/world_test.py`: 10 passed.
- `npm --prefix app run check`: passed; publication-worktree TypeScript also passed.
- Independent source-to-package audit over all 1,034 cell payloads: exact byte/hash/
  count checks; unique source IDs and row retention; all 86,343 airport identities,
  names, types, primary coordinates and source elevations; all 48,411 runway source
  identities; all 30,394 COM parent IDs/raw MHz/exact Decimal-to-kHz values; all 11,008
  radio-navaid identities, types, coordinates and source kHz values. Four invalid
  navaid frequencies remain explicit nulls. Initial reviewer binary-float equality
  for COM conversion was replaced with Decimal reference arithmetic; no source
  unit defect was found.
- Independently inspected the final catalogue source-record input/result pins:
  descriptor, bulk catalogue, compiler, fixtures, evaluator, lockfile and provenance
  result hashes all match actual bytes. Independently verified the common 13-file
  manifest against both worktrees and both browser envelopes' source/harness hashes.

The final browser runs were executed by `world_airport_data`; this reviewer
inspected their actual JSON, source identities, checks, omissions and transport
results, rather than treating an author's summary as the evidence:

| Profile | Actual final result | Evidence SHA-256 |
| --- | --- | --- |
| ROOT | 9 groups passed; no declared omissions | `755d9963f1a2f014a50faf6531a50ef84a4521cfa0b39398c75cc53db5b8d4e5` |
| Publication | 8 groups passed; three pre-existing UI capabilities explicitly not evaluated | `7b509585b4aedc423b0fb9ed50a735d4a46f9ab902f993890e6b2a82b0c037d1` |

Both use final harness
`099ba27185cc87c7d089815f46c085005124d7e914a980c445f19c7eee6dd63e`
and the installed native WASM
`266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc`.
Positive data/worker requests are actual local assets; cartography and optional
terrain failures are explicit scenery fixtures. The separate negative page injects
world cell failures. Browser evidence lives under ignored `output/flight/` in each
worktree; it is not a claim of live OurAirports availability or airport accuracy.

The normal browser gate now prepends `npm run test:world-airports` in both
variants. This registration was independently inspected against each prior
package: the complete pre-existing browser command chain remains byte-preserved.
ROOT uses the strict new browser command; publication declares its three legacy
presentation omissions explicitly. This is registration inspection plus the
observed standalone runs, not a claim that the entire older browser chain ran.

The publication profile does not claim the absent flight-plan action, standby
confirmation wording or map-relocation presentation. Actual global source queries,
GPS selection, radio standby mutation, unchanged active channels, unsupported NDB
behavior, Review guards, cache bounds and failed-cell fallback remain mandatory
and pass. ROOT additionally exercises its existing plan action and newer popup
presentation. Neither profile claims current receiver signals, IFR procedures,
surveyed runways or aircraft/training validity.

## Bulk-data representation and assurance boundary

The generated cells and catalogue deliberately contain UTF-8 JSON inside `.bin`
transport assets. This is explicitly recorded in ARCH and assurance SPEC, not
presented as automatic field-pointer coverage. The small JSON descriptor binds
`catalogue.bin`; the catalogue binds all cell byte hashes/counts and the four
source CSV hashes. The versioned source-record catalogue links generator, tests,
source package and result pins with provenance-only scope. All generated payloads
retain file-level Git lineage, and `.gitattributes` preserves their exact bytes.

This representation is acceptable within this reviewed bulk-geospatial scope:
required semantic/data checks still inspect every cell and source row; no assurance
extractor/resource cap or hand-authored aircraft-data extraction was changed.
A passing lineage graph would not prove source truth, navigation completeness or
aircraft fidelity. Specification validation must assess the meaning of these links
independently. This review does not promote the provenance-only source record into
runtime or per-airport operational acceptance.

## Frozen shared identities

The common-source manifest itself is
`6fdea9573baa7cbbfa81447e91c5f9f54153ca8936f6e0100d7d1ed41c26322b`.
The following hashes were independently checked in both worktrees:

| Path | SHA-256 |
| --- | --- |
| `app/src/world-airport-contract.ts` | `c9a99737b2486a0a0bcde9a2cad31c64bd39e7cf2a8fcf766ed7b2992d411cdd` |
| `app/src/world-airport-data.ts` | `1c35e457bb4143de3f5e3065e560b2b4d9f22480ff9c78194461c549cd6704cd` |
| `app/src/world-airport-repository.ts` | `40128a3f2f3dee4e2b52d32df9412c320c0b1bd926645c48c2334d46e7556bc9` |
| `app/src/world-airport-loader.ts` | `5c944f21df8a4b0ba7d55332a68376a011933889c05ff92e9c5960d830ed163b` |
| `app/src/world-airport.worker.ts` | `29a9f5b272c94fe2b1bb25142097ed1a3e3ec4ec052c004fd0019bed36daf5df` |
| `app/src/world-airport-data.test.ts` | `c15403a3ed86eea771235bd72119cf380dcd51757b5214e48e591366da77ef20` |
| `app/src/airport-com-panel.ts` | `c9f557cc57f679fa529732d456c98e14e8470b14a2cbf4be956af600c5731155` |
| `app/src/map-point-search.ts` | `632b342b1f6cd84089e1669700fb8ef88eb945967750fb5717259f70f1b04f81` |
| `utils/airports/world.py` | `ec42e1a73aba942c1b3955cf02d04e58aa79dc8bd35d10de8b0d2596cf646aee` |
| `utils/airports/world_test.py` | `49a4cd773cd502ca8ab683a88775ae2e4925b387bff136e39bd0a7906e814cb8` |
| `app/tests/world-airports.browser.mjs` | `099ba27185cc87c7d089815f46c085005124d7e914a980c445f19c7eee6dd63e` |
| `app/public/airports/world/manifest.json` | `ed989f584a22dca515e9fd39de275949c2e3d2804aaa978c6382d340acd8d6c6` |
| `app/public/airports/world/catalogue.bin` | `185a01cc51a59694bc9000f6ddc6a3946b799613d8bc220c14db74b5503bd216` |

Variant map hashes: ROOT
`351d11e2653b95a6d9324b2bbe89cac5c0a9e7ceb0fcbdf051ebb9799aa63de7`;
publication
`c92cab59919988fcba0d2380eba3b7d12756cadeed26540a0b9ac1a33200fd72`.
Source snapshot: `c483a76d30ee903114b777bf099de0fae1761294`.
Search archive: `38f9442cf23d4c6a4f74827cee00de7d27a1af6e1ed05e6656e4111618052f23`.

## Residual limits

Currentness/completeness, actual RF service, ILS geometry, real airport/terrain
accuracy, WebKit/mobile behavior and wider existing ROOT work are not accepted.
The historical regional receiver remains distinct from worldwide community
markers and standby selection. Q4 remains a low-priority future-update concern.
Final CI/publication and batched cross-provider peer outcomes must be recorded
separately; this report does not substitute for either gate.
