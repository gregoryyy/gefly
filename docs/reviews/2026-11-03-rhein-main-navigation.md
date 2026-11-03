# Historical Rhein-Main navigation review

Recorded 2026-11-03 02:56 Europe/Berlin by Codex
subagent `nav_review`, independently of the implementation authors: Codex
orchestrator, `ap_native` and `nav_ui`. Scope: TODO 2.0.41, R-NAV-4 and the
affected portions of R-NAV-1/R-NAV-2/R-DATA-1/R-REVIEW-1. This reviewer authored
only this report. This is same-provider quality and specification validation;
cross-provider peer review remains pending. No new external-provider review was
attempted, and no CLI/model identity beyond the available Codex runtime is inferred.

Base: `39e3dca7cd744de33f3446c736532f5d2812af1b`. Independently recomputed the
frozen 24-path non-Markdown implementation/test/asset packet, sorted path + NUL +
bytes + NUL: **`99588bf44b35f1ae218d6af1c76401e95d7dd58a03b7512d0e0c1eb02d9e9181`**.
The local path list is `output/flight/rhein-main-packet.json`. Documentation,
original source notice and the repository GPL copy were also inspected.

## Quality outcome

**No blocking findings remain for this bounded historical increment.** Source
identity, explicit component availability, units, variation/CDI/GS signs,
co-channel handling, loader bounds, fixed-step worker integration and UI/reset/
Review behavior were reviewed. The package is immutable after bounded same-origin
loading; the directory uses text nodes rather than imported HTML. No dependency,
account, external runtime service or persistence was added.

Resolved findings, with affected checks renewed:

- Initial approach panel configuration was rejected before the first worker
  state. `setConfiguration` now installs a validated preset without requiring
  live adjustment authority or emitting a tuning event. Actual-browser first
  paused OBS adjustment preserves NAV1 111.55 and NAV2 114.20.
- Nearest-antenna selection silently selected LFQP's reciprocal back-course
  record and ETAR's adjacent runway, removing applicable GS or changing CDI.
  Multiple receivable source records now produce an explicit ambiguity flag,
  with CDI/GS/DME unavailable. Independent five-NM front-course cases cover both
  LFQP runways and both ETAR 110.50 MHz records.
- The first repair used CDI validity to infer station reception. Source presence
  now remains independent of VOR OBS TO/FROM ambiguity and station passage;
  overlapping sources cannot disappear merely because OBS changes. Renewed tests
  also put an excluded LOC genuinely inside range but outside its usable sector.
- The obsolete notice denying bundled navigation databases and OBS button labels
  incorrectly saying all courses were true were corrected and re-inspected.

## Independent source and rights checks

The reviewer decompressed the actual pinned gzip, rather than accepting the
compiler output or researcher summary as source truth. Reviewed upstream snapshot:
FlightGear fgdata `5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95`, NAV810 cycle
**2013.10**, before the subsequent scenery-specific GS-height changes.

| Integrity boundary | SHA-256 |
| --- | --- |
| Original source gzip | `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839` |
| Original decompressed source bytes | `b65a1425bed63febfdbf97d57fa9e2a5565641bf00f1c9dca9a6c518b0c7c5d5` |
| Shipped JSON, 73,574 bytes | `762c93b369c3e2b76440f95ece6bf27b94de61d2f08e6c029a31a4bdd0aae1d1` |
| Compiler | `438308b8014995e51c35e8959ac417aedd410399afe72c1d57bcfd2b6e622018` |
| Final navigation geometry | `107283241923b58445e0537228457e79d32a1603cc0c57a5038627605a193b80` |
| Worker | `e537ac5a9b8e903c6a8141822793951de4dd38c9ee14f1b36437ede0d8c60242` |

Independent spherical dot-product filtering, separate from the compiler's
haversine calculation, found **241 source rows**, including all **70 VOR/LOC
parents** and **52 explicit DME rows** in the provisional extent. All parents and
DME rows are preserved, including component-conflict evidence; other rows are
explicitly inventoried as unsupported. The compiled **86 records comprise 31
VOR, 39 LOC and 16 standalone DME records**.

Every compiled parent/component was checked against its original line: identifier,
frequency, kind, coordinates, elevation × 0.3048, range, VOR slaved variation,
LOC true course, airport/runway identity, independent GS coordinates/elevation/
course/angle and DME coordinates/elevation/bias. Floating comparisons allowed
1e-8 absolute or 1e-9 relative serialization/conversion noise; these are software
comparison tolerances, not surveyed accuracy. Original FlightGear consumer code
was inspected for variation sign, packed GS interpretation and subtraction of
DME bias. The packed example `325123.456` preserves 3.25° and 123.456° true;
the shipped paired GS angles are 33 × 3.0°, one 3.4° and one 3.5°.

All six EDDF LOC records have their explicit GS component. Only IFNE, IFCW and
IFNW have explicit paired DME; missing DME was not invented. IFCW's GS remains
364 ft source AMSL and its indicated DME subtracts the actual 1 NM source bias.
GTQ/STR duplicate DME rows remain unavailable, with both conflicting rows retained.

The corresponding source subset contains the complete original copyright,
edition and GPL-2.0-or-later notice and every used source row. Repository and
public GPL texts match the retrieved upstream license byte-for-byte. The JSON,
manifest, source subset, source/compiler hashes and notices agree. This establishes
the inspected source grant and transformations, not operational applicability.

## Specification validation

| Criterion | Expected / observed | Outcome |
| --- | --- | --- |
| R-NAV-4: pinned redistributable snapshot | Exact source/edition, complete notice/license, bounded subset, reproducible derived bytes and provenance. Independent source audit and temporary-directory rebuild agree byte-for-byte. | Pass |
| R-NAV-4: dual receivers and instruments | Directory loads standby only; explicit swaps tune independently. LOC ignores OBS, NAV1 GS and independent DME flags work; NAV2 has no installed GS indication; bearing aid remains VOR-derived. Actual Chrome directory fixture passes. | Pass |
| R-NAV-4: common worker/AP source | Same module and package drive indicators and native guidance. Actual WASM receives IFCW, captures APR/GS and changes servo output; source loss falls back and retains NAV2. | Pass |
| R-NAV-4: reference/availability distinctions | Source-calibrated magnetic VOR, fixed true LOC/GS, separate antennas, subtractive DME bias, absent/conflicting components, range/sector and co-channel flags. Source comparison, signed fixtures and actual-source ambiguity cases agree. | Pass |
| R-NAV-4: historical applicability and LAB | Visible historical/non-current warnings, approximate service and provisional extent; isolated opt-in LAB. Source 2013.10 is never relabeled current. | Pass |
| R-NAV-4 / affected R-REVIEW-1 | Paused first OBS changes tuning without advancing step; actual Review preserves recorded values and disables tuning/preset actions. Page-local source package remains frozen. | Pass |
| R-NAV-1 / R-NAV-2 beyond this increment | Exact C172S installation, current service, complete airport/runway/fix/route resolution and calibrated receiver behavior are not delivered here. | Not evaluated |
| R-NAV-3 / R-TRAIN-5 published approach | EDDF start is geometric practice; no chart, fixes, missed approach or accepted procedure is supplied. | Not evaluated |
| R-REGION-1 complete region | Center is explicitly a community EDDF point, not a verified official ARP; no complete geodesic 100 NM terrain/chart/model acceptance. | Not evaluated |
| Integration assurance/shared CI | Integration owner runs final `just ci`, `just assure check` and lineage diff; this report does not substitute for those results. | Not evaluated by this reviewer |

## Executed evidence

- `node --test studies/e1-browser/sim/navigation.test.mjs app/src/navigation-approach.test.ts app/src/radio-nav.test.ts`: final **22/22 pass**, after the last co-channel repair and test correction.
- `python3 studies/e1-browser/sim/prepare-aircraft.test.py`: **6/6 pass**.
- `node studies/e1-browser/sim/navigation-worker.mjs`: actual local WASM/worker
  passes. IFCW normalized CDI changes 0.22445320 → 0.15233715 and GS
  0.14285714 → −0.06655593 after ten simulated seconds; servo output is nonzero.
  These are measured generic guidance cases, not equipment settling tolerances.
- `cd app && node tests/regional-nav.browser.mjs`: actual Chrome controls,
  standby/swap on both receivers, LOC/GS/bearing flags and read-only Review pass.
- `cd app && node tests/regional-nav-flight.browser.mjs`: independently executed
  full application with real native worker and public terrain. First paused OBS
  becomes 251 at step zero without retuning; NAV1 IFCW and NAV2 FFM remain set.
  At approximately 12.51 s APR/GS are captured, terrain is active and collision
  mask is zero. Review is read-only; no page errors or external HTTP(S) hosts.
  Screenshot `output/flight/rhein-main-ils.png` was visually inspected. The final
  co-channel-only repair has renewed affected unit/native checks; this browser
  fixture uses a unique-frequency source and its executed branch is unchanged.
- Recompiled with `python3 utils/navdata/build_navdata.py --source /tmp/gefly-rhein-main-nav/fg-pre-calibration-nav.dat.gz --output /tmp/gefly-nav-review-reproduced`;
  `cmp` confirms JSON, manifest and source subset identical to shipped files.
- Independent in-memory loader probes reject traversal assets, duplicate UIDs,
  invalid coordinates, over-limit declared bytes and a falsely current edition.
  The maintained test additionally checks corrupt hashes, retry, freeze and cache.
- `git diff --check`: pass. Independent packet hash recomputation agrees.

One initial browser server attempt did not start under the restricted execution
context; the approved local-server/Chrome rerun passed. Separately, the
orchestrator reported an existing KAP flight fixture timing out while two Chrome
fixtures ran concurrently, then passing all five groups sequentially. This
reviewer did not observe that KAP run and does not count its first attempt as a
pass. Browser concurrency timing remains a test-host limitation.

The local WASM reports JSBSim v1.3.3 at
`66f7fafc07fe13e7ede9db20873030fed2881713`, SHA-256
`ce1d036e9fdac7b3f88b4da4477be8dc618bef22792866670394540a3cf4c3c1`.
Local research model/runtime assets remain excluded from redistribution. No
current AIRAC/NOTAM, RF propagation, surveyed modern vertical datum, accepted
approach, installed-aircraft fidelity or training credit is established.
