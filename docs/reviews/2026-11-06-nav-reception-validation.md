# Worldwide historical navigation reception — independent validation

2026-11-06 15:59 Europe/Berlin. Task2.0.177; R-NAV-1/R-NAV-2/R-NAV-4/R-DATA-1.
Reviewer: Codex validation subagent `/root/nav_signal_validate`. The reviewer did
not author implementation, tests, data compiler, requirements or source-inventory
prose. Only this report is assigned for writing.

## Scope and artifact

Validation covers the incremental receiver repair in the publication worktree
`/private/tmp/gefly-world-nav`, based on main
`52897de10dfdafb4f7b3252cdb41828f8a22b5f5`, and separate supporting browser evidence
from the working app. The working app contains additional unmerged features;
this report does not accept that entire tree. The frozen criteria are the revised
[SPEC R-NAV-4](../SPEC.md), [user request](../input/2026-11-06-nav-reception.md),
[SEC reception boundary](../SEC.md#worldwide-historical-radio-reception), and the
assigned contract. [EVAL E6](../EVAL.md#e6-are-geography-pressure-and-cockpit-navigation-coherent)
requires valid, unavailable and unsupported signal states with source/units
separated. Full aircraft equipment fidelity and the complete R-NAV-1 through3
roadmap are outside this increment.

The publication SPEC SHA-256 at inspection is
`37dc81dd7d6c259e06e6e8485feaddedc6bafe1429daf849057d26bfa954bf06`;
the working-app SPEC is
`f8b57acd64e5bb18e301ad38774f2ae3198dbba51fa8092e505f15890699f2cb`.
The active package in both contexts is `world-nav810-2013-10-v1`,4884389bytes,
SHA-256 `dafdf4c31d00094c1f1b2762949b152e8c11deeb6af8ace3a1551bad9955e8ec`.

## Independent checks performed

- Ran `node --test navigation.test.mjs` in the publication simulator directory:
  **15passed,0failed,0skipped**. Reviewed the assertions, not only their names.
- Independently decompressed the redistributed original gzip and matched every
  service's kind, identifier, frequency, coordinates, source feet→metres,
  source range and circular station calibration/course directly to its original
  numbered source line. No compiler parser/helper was used for this audit.
  All7923 primary services match:3720VOR,3490LOC,713standaloneDME.
- Independently matched all5685DME and3171GS component geometries and their source
  bias/angle/course to exactly one original component row in each record's source
  references. Spherical/angle representation conversions were compared modulo360°.
  This establishes correspondence to the historical source, not surveyed accuracy.
- Compared all86 regional records to `origin/main:app/public/navdata/rhein-main-v1.json`:
  identical identities, service fields and paired components. The package metadata's
  compiler hash changes legitimately; this is not an unchanged-byte claim.
- Verified active package size/hash, original gzip hash, decompressed source hash,
  compiler hash and original GPL notice. The original gzip SHA-256 is
  `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839`.
  Compiler SHA-256 is
  `23f8d2c57015056097611de8a23b89758325cc0ba908e38515a3122ac346a43d`.
- Independently probed the actual loader with10001 individually valid, unique
  records in5470665bytes: rejected the count overflow. A separate8388609-byte
  response stream was rejected and cancelled at the8MiB bound. These in-memory
  boundary fixtures do not replace real-package browser execution.
- Read the actual app/native-worker browser harness and verified all six recorded
  source pins against current working-app files. Inspected its transparent Worker
  message observer: messages are forwarded to the actual native worker, not replaced
  by synthetic navigation replies. Scenery images/optional elevation are fixtures.

## Criterion matrix at the initial15:59 inspection

Publication-context pending outcomes below are historical; the16:04 renewal resolves them.

| Criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| Source-backed worldwide service inventory | Real source services beyond Rhein-Main; traceable edition/rights/identity and finite fields | Independent7923-service/paired-component audit; exact package and original source hashes; NAV8102013.10 labels | PASS |
| Preserve regional guidance | Existing86 services and components unchanged | Independent comparison to current target main; EDDF IFCW browser regression | PASS |
| Supported VOR/DME tuning | Standby alone does not activate; independent swap on NAV1 and NAV2 produces magnetic CDI/bearing and separate DME | Working-app actual browser CPT114.35,KLO114.85,CTV115.70: both receivers valid, about3.1NM DME, visible CDI, flags clear; paused native step/digest/final state unchanged | PASS in working app; publication execution pending |
| Fixed-step NAV1/AP path | Same source accepted by worker and instruments; actual running guidance outside old region | Working-app ready hash equals package hash; CPT worker NAV1 valid/kind1; live AP NAV0→185native steps,95publications, engaged/valid NAV and no sensor/collision flags throughout | PASS in working app; publication execution pending |
| Independent DME-only behavior | Distance can be valid without CDI/bearing or AP lateral signal | FRD115.90 browser case: both lateral gauges invalid, DME valid; bearing invalid with DME valid; worker NAV validity0; pure AMU source case also passes | PASS in working app; publication execution pending |
| LOC/GS meaning | Fixed source true course, paired GS only, existing two-bar NAV1 behavior | Pure global LSZH14 test passes; working-app IFCW111.55 shows NAV1 LOC+GS bars, NAV2 localizer-only, worker LOC/GS valid | PASS in working app; publication execution pending |
| Ambiguous/missing/unsupported components | No invented NDB/TACAN direction, invalid channels, conflicts or GS |15pure tests cover off-channel/invalid/missing/cochannel behavior and DME independence; source diagnostics retain11excluded channels, invalid20°GS and4malformed original GS rows; model supports only VOR/LOC/DME | PASS (source/unit scope; no new ADF/TACAN receiver accepted) |
| Bounded receiver loading | Fixed world asset/id;8MiB/10000records; byte hash/schema/unique records before exposure | Actual loader inspection, real-package unit load, wrong binary/id/oversize-manifest tests, independent count and streamed-byte overflow probes | PASS |
| Per-step work | Immutable loaded catalogue indexed by tuned channel; mutable inputs still validated | Private WeakMap installed only after loader validation/deep freeze; navigationSignal selects channel bucket; mutable-record mutation regression passes | PASS by source/unit evidence; no full-flight performance budget claimed |
| Bounded station directory | At most200nearest matching rows; total/truncation cue; search reaches omitted distant station | Working-app browser unfiltered200rows, limit feedback and CTVquery; source sorts matches by distance before slicing | PASS in working app; publication execution pending |
| Historical/current discovery distinction | Community inventory cannot fabricate services; source/date and reasons remain explicit | Receiver uses separate exact historical package; UI HIST/date/source labels, explicit standby/swap, invalid-signal reasons and documentation | PASS by source and inspected working-app browser evidence |
| Paused/Review semantics | Tuning does not step paused physics; Review remains read-only | New working-app harness measures paused step/digest/final state. Existing Review guards are unchanged in inspected paths; no fresh full-app recorded-Review run was part of this increment | PASS for paused observations; recorded-Review runtime NOT EVALUATED here |
| Publication integration gates | Current publication browser and shared CI complete without failure | Pending rerun after intentional browser interruption; initial CI assurance has an unresolved note-only declaration reference at inspection | BLOCKED pending corrected gates |
| Cross-provider peer / training fidelity | Separate actual provider review and applicable aircraft/equipment acceptance | No such run supplied for this task | NOT EVALUATED; peer pending under batch cadence |

## Browser evidence and limits at this inspection

Working-app `output/flight/world-navigation-browser.json` reports PASS,7groups,
zero page errors, Chromium156.0.8078.80; artifact SHA-256
`4153815f7266839362aaf13a34fa7bfaf109f44e3de112fbe23bf308d610ef8a`.
Harness SHA-256 in both trees is
`87f12a152d02e07e4624c9f1e6ea2e1338fbd309e6fbae7f242f0d59f8ab2d1a`;
shared receiver SHA-256 is
`cb24e1e7662c5efe0c92fc8888e34af71cd04276fb00d9ad47026bb2ae297afe`.
Reviewer inspected supplied browser observations and code; did not relaunch a
browser or duplicate the full CI pipeline. Embedded WebKit remains untested.

The initial publication artifact has0groups and a target-page-closed error.
Orchestrator and test author confirm that attempt was deliberately interrupted
before concurrent CI `npm ci` replaced its dependency tree. It is not accepted as
a pass or diagnosed as a receiver defect; a clean publication rerun is required.
The initial CI log shows assurance failure due to a source-inventory note referring
to a requirement that only exists in the separate working app. Correcting that
reference and renewing affected gates remains integration-owned.

## Initial recommendation (15:59; superseded by renewal below)

The source inventory, bounded loader/index and observed working-app behavior meet
the scoped receiver repair criteria. **Publication acceptance remains blocked**
until a current passing publication browser artifact and corrected integration
gate are inspected. No implementation defect was found by this validation.
Historical source agreement, a short native AP NAV run and passing software tests
do not establish current facility status, RF propagation/terrain masking, installed
receiver/servo calibration, published procedures, full aircraft fidelity or
training credit. Any changed runtime/data/harness pins require affected renewal.


## 2026-11-06 16:04 — Final publication renewal

**Scoped acceptance: PASS.** Reviewer independently inspected the completed
publication browser artifact and final corrected CI log. No runtime, data or
harness bytes changed from the pins reviewed above. The receiver/data commit
is `61dcf0e` plus the separately source-pinned UI/harness integration snapshot;
this does not claim that an earlier partial commit alone contained the full UI.
The publication SPEC remains
`37dc81dd7d6c259e06e6e8485feaddedc6bafe1429daf849057d26bfa954bf06`.

Publication `output/flight/world-navigation-browser.json` now reports PASS,
7groups,0pageerrors, Chromium156.0.8078.80. Artifact SHA-256:
`35efe48e30dbe5dfa5b527cbf339becbd8b3def8c6a3a28743ae45433bf74120`.
All six recorded source pins were independently recomputed and match current
files. Its exact package hash matches the shipped world bytes. The working-app
artifact also remains PASS with all pins matching and its earlier recorded hash.

| Publication criterion renewed | Actual inspected observation | Outcome |
| --- | --- | --- |
| Independent NAV1/NAV2 VOR/DME tuning outside Rhein-Main | CPT,KLO,CTV standby-only then swap, both magnetic CDI/bearing/DME paths and native NAV1 source agree; paused step/digest/final-state invariance assertions pass | PASS |
| Actual fixed-step NAV1/AP service | CPT0→220native steps,108published frames; engaged AP NAV, valid global VOR, no sensor fault/collision throughout; same package hash as UI | PASS |
| DME-only without false lateral reception | FRD distance valid on both receivers, lateral/bearing invalid and native NAV1valid0 | PASS |
| Existing LOC/GS meanings | IFCW retains NAV1 independent localizer/glideslope bars, NAV2 localizer-only and matching native LOC/GS source | PASS |
| Bounded station results and distant search | Unfiltered list200rows, truncation cue, CTV query reaches beyond initially listed nearby stations | PASS |
| Current shared integration gate | Corrected final CI summary explicitly passes, with skipped cases disclosed | PASS for executed checks |

Corrected publication `just ci` records554application Node tests,22application
Python tests,85assurance tests and11training tests passing. Repository tooling
executed247 of248, with its one platform-specific skip; JSBSim study executed14
of23, leaving9optional skips; C172S study executed25 of25. The final tracked-content
whitespace check passes2116tracked paths and the final summary is
`Foundation CI: passed with skipped checks (study studies/e1-jsbsim: 9 of 23 skipped).`
Reviewer inspected these actual log results and did not run a second full CI.
The initial note-only dangling-reference failure remains historical in
`output-world-nav-ci-initial.log`; the initial interrupted browser is likewise
not promoted to passing evidence. The corrected note has no receiver/runtime effect.

The task's source/data/loader/index criteria retain their independently checked
PASS outcomes; the publication-runtime conditions from the initial matrix are
now resolved. No implementation findings remain. Full-app recorded-Review runtime,
embedded WebKit, cross-provider peer and original-aircraft receiver/servo fidelity
remain **not evaluated** by this increment, as described above. Source inspection
shows existing Review guards are unchanged; no new claim of current operational
service, complete worldwide facilities, RF/terrain propagation, published procedures
or training acceptance follows from this bounded repair.
