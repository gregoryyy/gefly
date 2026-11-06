# Worldwide OurAirports discovery validation

Recorded 2026-11-06 by independent Codex validate agent
`/root/coverage_validate`. TODO 2.0.170; R-WORLD-12, with R-DATA-1/R-NAV-2 and
standby-action boundaries. This reviewer did not implement the compiler,
catalogue, map integration or browser harness. Only this report is owned here.

Current disposition: **pass for the bounded source/data and discovery runtime
increment**. ROOT's strict nine-group browser run passes without omissions; the
publication port passes eight groups with three explicit existing-UI exclusions.
Those exclusions are not accepted passes. Final shared CI/assurance publication
gates are separate and remain pending until their results are recorded.

## Snapshot and scope

The ROOT working source is based on `700dd5386125f9864a391f85b277cb71da55290a`.
This report validates the bounded discovery increment, not the other dirty
workspace features, operational aeronautical completeness, aircraft dynamics or
training fidelity. Integration-before UI snapshots are under ignored
`output/ourairports/integration-before/`. The separate publication checkout is
`/private/tmp/gefly-world-airports`; its final source/evidence identities and runtime outcomes are recorded below.

The source commit is `c483a76d30ee903114b777bf099de0fae1761294`, retrieved
2026-11-06. The final small `manifest.json` descriptor has SHA-256
`ed989f584a22dca515e9fd39de275949c2e3d2804aaa978c6382d340acd8d6c6`
and binds `catalogue.bin`, SHA-256
`185a01cc51a59694bc9000f6ddc6a3946b799613d8bc220c14db74b5503bd216`.
The latter is byte-identical to the earlier fully audited manifest metadata. The
four source hashes are recorded there and in the package README.
The global search payload is still gzip internally, but uses `search.bin` so
static servers do not advertise the archive as HTTP content encoding.

## Independent observed evidence

- `node --test app/src/world-airport-data.test.ts`: 20 passed, zero failed/skipped,
  independently rerun after the final opaque catalogue/cell transport and wrapper
  cooldown repairs. The real-asset case reads,
  hashes and validates every shipped cell and the expanded search index.
- `python3 utils/airports/world_test.py`: 10 passed on Python 3.11.12, independently
  rerun after the final opaque catalogue/cell transport repair.
  Fixtures exercise source pins, IDs/types, missing/zero fields, units, runway
  ends, invalid/orphan data and deterministic output; they are not survey tests.
- A separate inline Python audit independently read all four pinned CSVs and
  every generated cell. It compared every retained source identity and row count,
  airport/navaid coordinates/elevations/type/country, runway dimensions/end
  geometry/true headings/closure/light flags, exact Decimal COM MHz-to-kHz
  conversion and navaid kHz/null handling. All 86,343 airports, 48,411 runways,
  30,394 COM rows and 11,008 navaids matched. Airport records include 247 country
  codes and 13,657 closed facilities. The 97,351 global search identities equal
  the full airport/navaid identity union. This independently checks the data
  transformation, not upstream truth or operational completeness.
- A separate Node repository exercise using real filesystem-backed responses
  resolved and selected LFPG, LOWW, LSZH, FACT, KJFK, RJTT and NZQN in sequence.
  It verified actual distant cell adoption through the production repository;
  browser transport is evaluated separately.
- `main.ts` comparison against the integration-before snapshot found only the
  limitations-text replacement. Its existing COM/NAV standby guards and session
  delivery remain unchanged. Popup changes add catalogue identity/details; the
  new source modules do not import native flight-state or autopilot interfaces.

## Criterion matrix

| R-WORLD-12 criterion | Expected | Observed and outcome |
| --- | --- | --- |
| Pinned source and complete source-class compilation | Stable IDs, provenance, source hashes/counts; all source types retained | **Pass:** independent full-source audit and all-cell test; 1,034 nonempty cells; no source row dropped in this snapshot. Invalid optional fields become explicit nulls with manifest counters. |
| Coordinates, units and missing values | WGS84 ownership; feet, true headings, COM MHz versus NAV kHz; no invented ends/heights | **Pass:** full-source field comparison plus synthetic dateline/pole/zero/missing/invalid fixtures. Four invalid navaid frequencies, one runway heading, six lengths and nine widths are null and counted. |
| Bounded manifest/cell/search admission | Fixed paths, byte/hash/count/schema/reference checks, compressed and expanded limits | **Pass:** 20-case client suite, including every real asset and malformed/hash/path/redirect/stall/cancellation negatives. Manifest itself is schema/provenance validated; same-origin bytes are not a cryptographic publisher-authentication claim. |
| Separate worker and bounded repository | Search/decode away from physics; at most nine desired/18 cached cells/24 MiB, sequential detail requests | **Pass for inspected source and Node fixtures:** repository/worker separation, cache travel, stale-generation/disposal tests and aggregate partial disclosure. The final browser artifact observes the actual dedicated discovery Worker and bounded source/UI/cache counts. |
| Real outside-Germany search/details and source actions | Distant global index result, loaded runway/COM/NAV details and existing GPS/plan actions | **Pass in ROOT:** final nine-group browser run begins with distant LOWW and requires actual global Worker search replies for every selection; seven countries/locations show real runway/COM data. LFPG GPS target and Add waypoint actions also pass. The earlier failure is retained below. |
| Standby-only tuning and unsupported channels | Valid COM/NAV standby only; unsupported NDB/TACAN/out-of-band values untunable | **Pass:** existing callback guards and popup band/type checks retained; final browser tests seven COM1 standby selections, source ZUE 110.050 MHz into NAV2 standby and CB NDB 463 kHz without a tuning action. Active channels stay unchanged. |
| Loading/partial/empty/unavailable and regional fallback | Source dates/scope, failed optional catalogue does not claim empty or erase fallback | **Pass:** malformed manifest and failed/corrupt cell fixtures disclose unavailable/partial; accepted absent cells are empty only through validated manifest. Browser503-cell injection retains all 731 regional records with unavailable disclosure and unchanged paused native state. Manifest-failure UI fallback is source-inspected, not a separately injected browser case. |
| Cache/cancellation/Review | Bounded reuse, stale/dispose rejection; Review inspection without tuning/relocation | **Pass within bounded cases:** stale/dispose/cache fixtures pass; actual browser pan/return keeps cell request count 60→60 and cache at 18 cells/126,456 raw bytes. Review disables tuning/relocation and sends no navigation mutation. No whole-flight endurance or every browser scheduling condition accepted. |
| Native/AP isolation | Discovery does not change physics/AP; supported explicit tuning changes standby only | **Pass within paused-state scope:** no native/model changes; existing standby callbacks unchanged. Final browser engages AP, records flight, pauses, then compares native 213 steps/digest 5f1b02e25a9707aa, complete physical state, all KAP fields and active channels before/after discovery, tuning and Review. This is not a running-flight timing/endurance benchmark. |
| Historical receiver/procedure distinction | Directory records do not create RF/GS/DME/fix/procedure support | **Pass:** source labels/caption/package documentation retain historical regional receiver scope and community-source uncertainty. No current AIRAC or full ILS/procedure claim. |

## Unsuccessful observation and repair

The initial real-browser artifact at `output/flight/world-airports.json` failed
after LFPG at distant LOWW search. The UI reported worldwide search unavailable.
LFPG lies in the startup region's neighbour set, so that first local hit did not
prove global search worked. The archive was served with gzip HTTP content
encoding and browser transport expanded it before the compressed-byte validator.
The author repaired delivery by retaining the same gzip bytes under `search.bin`;
the contract/compiler/loader/tests and manifest paths changed consistently.
Final browser evidence explicitly observes successful global Worker results
and exact archive delivery; the earlier failure remains historical, not an accepted run.

## Final runtime evidence and disposition

The following final artifacts exercise the descriptor/catalogue/cell transport
and worker-wrapper cooldown source after the repairs:

| Checkout | Evidence SHA-256 | Observed result |
| --- | --- | --- |
| ROOT `output/flight/world-airports.json` | `755d9963f1a2f014a50faf6531a50ef84a4521cfa0b39398c75cc53db5b8d4e5` | Nine groups pass; zero errors; empty `not_evaluated`. GPS target and Add waypoint, standby confirmation and Review relocation guards are exercised. |
| Publication `output/flight/world-airports.json`, under `/private/tmp/gefly-world-airports` | `7b509585b4aedc423b0fb9ed50a735d4a46f9ab902f993890e6b2a82b0c037d1` | Eight groups pass. Three explicit exclusions: its existing base lacks flight-plan actions, standby-confirmation wording and map relocation. Those presentations are not evaluated; actual global searches, GPS target, standby mutations, radio Review guards, native isolation and fallback remain mandatory and pass. |

Both use final harness
`099ba27185cc87c7d089815f46c085005124d7e914a980c445f19c7eee6dd63e` and installed
engine `266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc`.
This reviewer inspected the complete artifacts, independently compared every
recorded source/harness hash with the current file in its respective checkout,
and checked results rather than accepting the author's summaries alone.

Each run requires successful actual discovery-Worker RPC results, beginning with
distant LOWW, then LFPG, LSZH, FACT, KJFK, RJTT and NZQN. Source COM1 standby
selections and ZUE NAV2 standby leave active channels unchanged; CB 463 kHz stays
untunable. Both runs verify actual catalogue delivery of 164,096 bytes with hash
`185a01cc51a59694bc9000f6ddc6a3946b799613d8bc220c14db74b5503bd216`, and search
delivery of 3,043,698 bytes with hash
`38f9442cf23d4c6a4f74827cee00de7d27a1af6e1ed05e6656e4111618052f23`, without
HTTP Content-Encoding. Cache pan/return produces 60→60 cell responses and stays
within 18 cells/24 MiB. Injected 503 cell failure retains 731 regional records with
explicit unavailable status. ROOT final native state remains 213 steps/digest
`5f1b02e25a9707aa`; publication remains 202 steps/digest `8e5f7c52f38a4742`.
Each compares complete physical state, KAP fields and active channels against its
own engaged-AP paused baseline; the digests are not expected to match each other.

Scenery pixels/optional elevation failures are declared fixtures. The world data,
discovery Worker and native engine are real. Map/plan observations add read-only
test hooks; positive catalogue responses are not mocked. The separate negative
page deliberately returns 503 for optional cells. The initial LOWW transport
failure and earlier publication Review wait failure are historical observations,
not accepted runs. Final affected runs pass; no historical pass is silently
transferred to changed transport bytes.

Independent feature-checkout client tests passed before final packaging; final
ROOT 20-case client and 10-case Python suites pass after packaging, including every
shipped asset. Common source/data parity is separately inspected. No ROOT-only
flight-plan or richer popup behavior is claimed for the publication port.
Dataset accuracy, operational currency, reception/approach fidelity, whole-ROOT
assurance/publication and cross-provider peer acceptance remain not evaluated by
this report.

## Residual limits

This checks source-complete compilation of one community snapshot, not all real
facilities or their current service status. Raw byte/cache counters are payload
budgets, not measured JavaScript heap consumption. Manifest/schema/source hashes
do not prove survey accuracy, provider authenticity or operational suitability.
The 45-second request deadline and loader-disposal guards are source-inspected;
not every browser/OS lifecycle is exercised. Native isolation is demonstrated
with an engaged AP and paused state; no running-flight performance claim follows.

Cell failure handling is intentionally latched per centre generation: the current
implementation requires both a changed generation and expiry of its 60-second
cooldown before a failed cell is eligible again. An unchanged 5-degree centre
does not automatically retry after 60 seconds. The orchestrator explicitly
confirmed this disposition; same-view recovery needs a centre-cell change or
reload. Automatic same-view source recovery is not an accepted test outcome.

The worker-wrapper availability repair adds a separate one-minute restart
cooldown and deduplicates unavailable callbacks. This reviewer inspected the
repair and independently reran the affected suite: **20 cases pass**, including
100 repeated construction failures and 100 post-failure centre updates without
a worker/status storm, retry after the injected clock advances, terminated-worker
message isolation and disposal rejection. Source-cell failure latching and worker
restart cooling are different mechanisms. Final source/harness identities and renewed browser results are recorded above.


## Opaque package and assurance boundary

The author introduced an explicit opaque bulk transport after assurance could not
expand all generated navigation record fields within its unchanged graph bounds.
`manifest.json` is now a small schema-validated descriptor; `catalogue.bin`
contains the source/count/cell metadata, and `cells/<id>.bin` contains UTF-8 JSON
records. These names do not imply executable code or a different source model.
The worker still parses and validates every admitted package. No assurance cap,
hand-authored JSON extractor or aircraft-value check was relaxed.

This reviewer independently verified the descriptor size/hash chain, exact
1,034-path cell directory with zero obsolete JSON cells, every cell byte/hash/count,
all four CSV source identities/counts, and the unchanged catalogue metadata bytes.
The cells retain their prior hashes, so the earlier full field/unit audit applies
without reinterpretation. The source/asset preservation criterion passes.

The package README accurately states that assurance traces descriptor/file-level
provenance and does **not** extract individual airport, runway, frequency or
catalogue metadata JSON-pointer fields from the opaque assets. No complete
record-level AS1/AS3 coverage or aircraft fidelity is accepted by a graph pass.
The versioned feature evidence entry `worldwide-airports-bulk-provenance-v1`
correctly limits its `source_record` result to provenance. This reviewer
independently verified its six declared input hashes, result JSON hash, source
counts/normalizations and result assertion pointers. Its relationships do not
claim runtime or independent acceptance through the source author. This is a
pass for the meaning and freshness of those declared links.

Final feature assurance check/diff results remain to be inspected; the separate
pre-existing whole-ROOT graph bound is not waived by this scoped review.


## Final ROOT source identity

SHA-256 of the following ordered path list, each path followed by a tab and its
current lowercase SHA-256, with newline separators and a trailing newline, is
`e67423bc8ebdea607032e9a62539caf1c6e28167d458aa5b651fd6390b6457af`.
The frozen browser artifacts additionally pin main.ts and native worker.js for
each checkout. Changed source bytes require renewed affected validation.

```text
utils/airports/world.py
utils/airports/world_test.py
app/src/world-airport-contract.ts
app/src/world-airport-data.ts
app/src/world-airport-repository.ts
app/src/world-airport-loader.ts
app/src/world-airport.worker.ts
app/src/world-airport-data.test.ts
app/src/practice-map.ts
app/src/map-point-search.ts
app/src/map-point-popup.ts
app/src/airport-com-panel.ts
app/tests/world-airports.browser.mjs
app/public/airports/world/manifest.json
app/public/airports/world/catalogue.bin
```
