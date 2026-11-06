# Worldwide historical navigation — quality review

2026-11-06 15:56 Europe/Berlin. Task2.0.177; R-NAV-1/R-NAV-2/R-NAV-4/R-DATA-1.
Reviewer: Codex `/root/nav_signal_housekeeping`, reassigned to independent quality.
The reviewer authored the preceding source-inventory note only; no runtime,
compiler, data transformation, regression test or requirement was authored or
repaired by this reviewer.

## Outcome and scope

**No blocking implementation findings in the inspected source/data snapshot.**
Final actual-browser/native-live evidence and integration CI are pending at this
initial review point; this is not a claim that those checks passed. Specification
validation and cross-provider peer remain separate outcomes.

Reviewed scoped root deltas against `output/nav-reception-before`, the isolated
publication checkout `/private/tmp/gefly-world-nav` against its Git base, the new
worldwide source assets and current tests. Root contains unrelated features;
this review does not accept them. The publication's main integration change is
limited to historical-coverage wording, while the receiver module/data and radio
picker are the same bytes as root. Applicable bounds are the updated SPEC
R-NAV-4 and [SEC](../SEC.md#worldwide-historical-radio-reception).

## Frozen source identity

All paths below independently matched between root and publication at review.

| Path | SHA-256 |
| --- | --- |
| `utils/navdata/build_navdata.py` | `23f8d2c57015056097611de8a23b89758325cc0ba908e38515a3122ac346a43d` |
| `utils/navdata/test_build_navdata.py` | `cfa8ca3f7061ebbba210dddd846900340b471a9d7bfa2ce297157c9de9ca6ad5` |
| `studies/e1-browser/sim/navigation.js` | `cb24e1e7662c5efe0c92fc8888e34af71cd04276fb00d9ad47026bb2ae297afe` |
| `studies/e1-browser/sim/navigation.test.mjs` | `44c0f579bb56b191bfc85e136a454ad0c78cf1d970a74cdeb91e736add3ce9d6` |
| `app/public/navdata/manifest.json` | `82e66762a7699f440394e75b573079483fa6845d1493af2074cd7b3f001b5312` |
| `app/public/navdata/rhein-main-v1.json` | `74669c616286abe52ab03d72851100c6c412431c12b6a6b661471e2cecc85d63` |
| `app/public/navdata/world-v1.bin` | `dafdf4c31d00094c1f1b2762949b152e8c11deeb6af8ace3a1551bad9955e8ec` |
| `app/public/navdata/source-nav810-gzip.bin` | `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839` |
| `app/src/radio-nav-panel.ts` | `d5e477f3c9485ef7c4a970c42e0ca9828007f5c5b14a25788a660a28a2eb0779` |

The worldwide derived package is4,884,389bytes, below8MiB, with7,923 unique
services below the10,000-record bound. Source provenance remains the exact pinned
NAV810 gzip, not fabricated OurAirports receiver fields. The original source
copyright/GPL notice remains in the distributed gzip and regional source subset.

## Independent source and numerical audit

The reviewer directly decompressed the original gzip and split source rows,
without calling the compiler's parsing or conversion helpers. For every modeled
service, independently checked kind, identifier, channel, latitude, longitude,
source feet×0.3048 height and original NM range against its first source line.
VOR/LOC circular calibration equivalence was checked through sine/cosine, rather
than demanding a particular signed representation. All7,923 passed:
3,720VOR,3,490LOC and713standalone DME records.

For all5,685 present DME components and3,171 present GS components, exactly one
listed original source row matched the component coordinates, height and range,
plus source DME bias or GS angle/course. No discrepancies were found. All86
retained regional service records, including their components and identities,
are exactly equal to their worldwide counterparts. Every non-service diagnostic
still resolves to an existing UID with the stated source lines. This checks data
transformation, not surveyed geometry, operating status or RF fidelity.

Compiler review confirms indexed component pairing retains source constraints:
ILS identifier/channel/airport/runway keys; VOR-associated DME proximity; conflicting
explicit components unavailable; rejected unsupported channels and GS values
recorded rather than synthesized. Global UID collisions gain source-line suffixes
while preserving the sole regional identity where applicable. Circular angle
normalizations preserve direction and carry diagnostics. Four malformed source
GS rows remain explicit exclusions.

## Runtime, security and lifecycle observations

- Only loader-verified, deeply frozen record arrays receive a private WeakMap
  frequency index. The index and its arrays have no external mutation path.
  Unregistered/mutable caller arrays retain per-call validation; tuning and
  subsequent mutation do not leave stale cached services.
- The receiver's existing geometry, station-passage, ambiguity, LOC sectors,
  independent DME validity/slant-distance bias and GS logic are unchanged.
  LAB remains isolated. The index selects only the active receiver channel;
  NAV2 retains its independent configuration.
- The manifest stays same-origin, redirects rejected and filenames canonical.
  The larger opaque asset requires the exact worldwide identity/asset pair;
  legacy JSON retains its previous smaller canonical-filename/schema contract.
  SEC initially described a stricter regional pair; the integration owner
  clarified it rather than silently breaking legacy fixtures. No blocker remains.
- Manifest bytes, body bytes, exact hash, edition, service validity and UID/count
  checks precede deep freezing and publication. Failed package loading clears the
  cached promise for retry. No new URL/source service, persistence or worker
  lifecycle is added. Existing UI/worker hash matching and visible failure remain.
- The actual worker uses the same imported receiver function at fixed-step
  guidance calculation. UI gauges derive from the same page-local package;
  no UI-only replacement signal or new FDM coefficient is introduced.
- The station picker caps output at200 after filtering/distance sorting and
  reports total/truncation. Search is applied before the cap, so distant matches
  remain reachable. Existing rebuild deferral, outside-click/Escape and Review
  guards remain; hidden picker updates return before global work.

The compiled snapshot's maximum co-channel group is347services; indexing avoids
validating/scanning all7,923 on each step. A reviewer-run Node smoke measurement
of10,000 indexed CTV evaluations after200warmup calls (65co-channel records)
observed median0.013709ms, p990.104250ms and maximum2.299375ms. This is host Node
smoke timing, not browser/native worst-case frame-budget or device acceptance.

## Checks actually run

Reviewer independently ran:

- `node --test studies/e1-browser/sim/navigation.test.mjs`:15passed,
  zero failed/skipped.
- Python3.11 `-m unittest discover -s utils/navdata -p test_build_navdata.py`:
  nine passed. This includes both compiler modes reproducing shipped bytes,
  source hash, component absence/normalization and regional identity preservation.
- The all-record raw-source audit and indexed smoke measurement described above.
- Root/publication SHA comparisons for the nine frozen paths above.

The reviewer has inspected the in-progress browser harness but has not launched
it or duplicated integration CI. At this initial snapshot its reception checks
are paused: native source-validity correspondence is useful, but continuous
live stepping/AP behavior is not inferred from paused flags. This gap was sent
to the integration owner before final evidence. A later evidence renewal should
record actual source/harness/artifact hashes and distinguish executed versus
inspected runs.

Historical source edition/calibration/range and approximate geometry remain
explicit limitations. Current operational service, complete global source
coverage, installed receiver/ADF/TACAN fidelity, terrain-masked propagation,
aircraft/autopilot response calibration and training acceptance are not established.
Embedded WebKit and external peer are not evaluated here. Changed source/data
requires renewed affected review.

## Browser evidence renewal in progress —15:58

The working-app artifact now reports PASS in seven groups, no page errors, with
all six recorded source pins independently matching the current files. Its raw
SHA-256 is`4153815f7266839362aaf13a34fa7bfaf109f44e3de112fbe23bf308d610ef8a`.
The final harness SHA-256 is
`87f12a152d02e07e4624c9f1e6ea2e1338fbd309e6fbae7f242f0d59f8ab2d1a`.
The reviewer inspected the harness and artifact, rather than launching a duplicate
browser. It uses actual worker/instrument state and forwards native commands;
map pixels and optional elevation availability are fixtures.

This resolves the initial working-app live-evidence gap: at CPT the actual
worker advances step0→185 with95publications, all reporting engaged captured
AP NAV, valid VOR source, no sensor fault and no collision. CPT/KLO/CTV paused
standby→swap work independently on both receivers, with magnetic-reference
CDI/bearing and DME. DME-only FRD supplies distance while retaining invalid
lateral/bearing guidance; EDDF IFCW retains separate LOC/GS on NAV1 and LOC-only
NAV2. The picker renders200 rows and finds a distant search result after filtering.

The publication browser was deliberately interrupted before checks, to avoid
its dependency tree being replaced by concurrent CI `npm ci`; its generated
closed-browser failure is an interrupted integration attempt, not a passing run
or a diagnosed receiver failure. A fresh publication execution remains pending.
Working-app success does not substitute for publication evidence.

## Final evidence renewal —16:04

**No blocking quality findings** for the frozen Task2.0.177 runtime/data and
renewed browser evidence. The earlier pending/interrupted observations above are
historical, not the final outcome. The reviewer independently recomputed every
one of the six recorded runtime/harness source pins against both current trees;
all matched. The same historical package hash/4,884,389bytes/7,923records is
recorded in both artifacts.

| Context | Final result | Raw browser artifact SHA-256 |
| --- | --- | --- |
| Working app | PASS7groups, zero page errors; CPT live step0→185/95publications | `4153815f7266839362aaf13a34fa7bfaf109f44e3de112fbe23bf308d610ef8a` |
| Publication | PASS7groups, zero page errors; CPT live step0→220/108publications | `35efe48e30dbe5dfa5b527cbf339becbd8b3def8c6a3a28743ae45433bf74120` |

Both identify Chrome156.0.8078.80 and harness
`87f12a152d02e07e4624c9f1e6ea2e1338fbd309e6fbae7f242f0d59f8ab2d1a`.
Reviewer inspected actual results/assertions; browser executions were performed
by code2. The tests make no source-module patch to supply reception, and the
worker wrapper observes messages while forwarding native commands.

The first CI run exposed stale fixture assumptions and localhost-listener
permission failures. The integration owner changed only
`app/src/flight-map-navigation.test.ts` and `app/src/navigation-approach.test.ts`:
regional map conversion explicitly uses the retained regional fixture; approach
checks bind the active manifest bytes/hash/ID and compare every regional record
with the active world package. Reviewer inspected these changes and independently
ran both files in the publication checkout:6/6passed. This preserves the
regional-only converter contract, which is unused by current root/publication
runtime, rather than quietly weakening a production bound.

The corrected publication CI log was inspected through its final
`Foundation CI: passed with skipped checks` summary:554application Node,
22application Python,85assurance and11training tests passed. Repository tooling
reported248discovered tests; its platform skip remains explicit. JSBSim study
retains nine skipped cases of23. The C172S study ran25. The reviewer did not
rerun the full pipeline, and these software passes do not establish aircraft
fidelity. Final assurance revision/diff and publication metadata remain the
integration owner's responsibility. Independent specification validation and
batched cross-provider peer status are separate from this quality outcome.
