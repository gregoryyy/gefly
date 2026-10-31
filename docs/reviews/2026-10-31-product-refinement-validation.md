# Product-refinement documentation validation

Validator: independent Codex `validate` subagent; not an author of the refined
requirements, design or research. Recorded: **2026-10-31 15:23 Europe/Berlin**,
from the session clock.

Recommendation: **accept the documentation coverage and planning refinement**.
No user-theme coverage gap or documentation acceptance blocker was found.
Every future simulator, community, region, AI-authoring and reuse-selection
feature criterion remains **not evaluated as implemented behavior**.

## Scope and artifact

Reviewed all three new source records:

- [GeoFS strengths and gaps](../input/2026-10-31-geofs-feedback.md).
- [Classic-first and pressure-setting answers](../input/2026-10-31-cockpit-pressure-decisions.md).
- [Community, authored experiences, EDDF and reuse direction](../input/2026-10-31-community-region-reuse.md).

Compared their themes with [SPEC](../SPEC.md), [IDEA](../IDEA.md),
[CONCEPT](../design/CONCEPT.md), [training design](../design/TRAINING.md),
[ARCH](../ARCH.md), [ROAD](../ROAD.md), [EVAL](../EVAL.md),
[TODO](../TODO.md) and [GAPS](../GAPS.md). Inspected supporting SEC/SBOM,
the two new source studies and the unchanged agent-role framework.

Artifact: uncommitted working tree on `bootstrap/project-foundation`, no remote
or release. SPEC SHA-256:
`ac99bdfb94f1fa9fb565fd8b46ad42996c19358031e4f96d3016d602b103ef7d`.
Final substantive snapshot: **64 files**, SHA-256
`39b4e72b35672cd890a7deca86cfc5f6a5f9959c1575474945b9840d1f54f09a`.

Hash procedure matches the earlier reviews: sort included absolute paths under
the root and hash relative POSIX path bytes, NUL, file bytes, NUL per file.
Exclude paths containing `.git`, `.pdfstamps` or `__pycache__`, all
`docs/reviews/`, generated `*.md.pdf`, and exact `docs/TODO.md`, `docs/DONE.md`,
`docs/RESULTS.md`. Those status/evidence files were inspected separately.
Substantive edits require affected revalidation.

The pre-review snapshot `f501ccb6f4814528ff16b75a08016ce6aa1d0122cadf308275d5869ddd279347`
was independently reproduced. The sole review-time substantive change replaces
EVAL E6's “standard preset” with “standard-pressure setting”. Rechecked the
changed passage against R-AIR-3: it now permits the selected actual instrument's
manual setting rather than implying a dedicated preset/mode. The final hash above
was independently reproduced after that correction; SPEC did not change.

## Coverage matrix

**Pass — documentation** below means that the input is represented coherently in
requirements and planned design/evidence gates. It never means the feature runs,
its numeric behavior passed, or a learning/certification claim was established.

| User theme / stable requirement | Observed representation and planned evidence | Documentation result |
| --- | --- | --- |
| Original C172/EASA PPL/web direction; realism toward CPL | SPEC retains the original 27 unique IDs, including simulation/physics, aircraft applicability, training and agent workflow. IDEA/CONCEPT/ARCH/ROAD retain C172, EASA PPL first, browser delivery and later CPL without selecting an engine or exact aircraft fit. | Pass — documentation |
| Quick browser access — R-UX-1 | SPEC requires no-install introductory access with measured readiness on a declared device matrix. CONCEPT/TRAINING preserve the short launch path; E5 defines comparison tasks and budgets to fix before tests. | Pass — documentation |
| Keyboard and touchpad — R-INPUT-1 | SPEC covers usable mappings, sensitivity, focus/conflicting input and cockpit interaction. ARCH normalizes inputs into shared events; E5 includes keyboard/touchpad plus instrument control tasks. | Pass — documentation |
| Mobile orientation — R-INPUT-2 | Permission, calibration, recentering, rotation, sensor loss and fallback are explicit. Supported devices/release timing remain GAPS Q4 decisions rather than universal mobile-support claims. | Pass — documentation |
| Recognizable geography and airport elevation — R-WORLD-1 | SPEC names terrain/runway alignment, units, horizontal/vertical datums and map elevation. ARCH distinguishes airport, runway/threshold and terrain references; E6/E10 define sourced fixtures. | Pass — documentation |
| Cockpit/external views — R-VIEW-1 | SPEC preserves switchable views and usable cockpit controls without changing flight state/time. ARCH uses one state source; E5 tests view changes/readability independently from dynamics. | Pass — documentation |
| Video/review strength — R-REVIEW-1 | Replay/debrief preserves synchronized state, instruments, controls, weather/navigation editions and communication events. Encoded video export is explicitly separate and remains an assumption/option in GAPS A6, not silently claimed delivered. | Pass — documentation |
| Weather reports and NOTAM — R-BRIEF-1 | Briefing content, issue/validity/source/status, stale/missing cases and relation to simulated weather are explicit. ARCH pins session snapshots; E7 tests notices/reports and service failure. Live provider/mode remains Q11. | Pass — documentation |
| Realistic text-capable communication — R-COMM-1 | SPEC/ARCH model roles, frequencies, intent, clearance/readback and resulting accepted state. E7 uses deterministic correct/incorrect exchanges. Chat or plausible AI prose alone does not pass. | Pass — documentation |
| Operable cockpit navigation, including VOR/DME — R-NAV-1 | Selected classic C172 controls, tuning/identification/source/course and applicable indication/validity behavior are required; later glass has its own installation scope. Maps/autopilot alone cannot substitute for cockpit functions. E6 covers the distinction. | Pass — documentation |
| Real identifiers/fixes — R-NAV-2 | Versioned records, coordinates/frequencies, ambiguity/staleness and rights are required. ARCH resolves scenarios against a frozen regional snapshot; synthetic codes do not pass real-data acceptance. | Pass — documentation |
| Real or generated maps/charts and glide path — R-NAV-3 | SPEC/TRAINING distinguish generated presentation from its real/synthetic underlying data, teaching glide paths, actual procedure geometry, visual aids and ILS indications. E6/E10 require coherent end-to-end references. | Pass — documentation |
| QNH, QFE and standard pressure — R-AIR-3 | The user's answer resolves “QNX”. SPEC/GAPS Q8, ARCH and E6 preserve all three references, units, QFE datum and aircraft applicability. A manual mechanical setting is allowed; a fictitious mode switch is not required. | Pass — documentation |
| Checklists — R-TRAIN-4 | Aircraft/source/phase applicability, modeled state versus acknowledgement, incorrect sequences and recoverable blocked steps are explicit. E7 tests state-based lesson behavior, not checkbox appearance. | Pass — documentation |
| Circuits/patterns and ILS drills — R-TRAIN-5 | SPEC/TRAINING/ROAD split a reviewed circuit scope from later equipment/procedure-specific ILS familiarization and missed-approach handling. E7 prevents inferring an instrument rating or universal PPL-syllabus inclusion. | Pass — documentation |
| ACAS/TCAS — R-TRAFFIC-1 | SPEC/ARCH/ROAD retain the request within a later applicable equipment profile with sourced encounter behavior. Traffic icons are not collision-avoidance validation; no fictional airline system is assigned to the initial C172. | Pass — documentation |
| Fewer types, deeper controls; classic before glass — R-SCOPE-1 | One selected conventional-panel C172 comes first, with an explicit supported/simplified/unavailable inventory and later glass/source gates. GAPS Q9 records the answer. The A320 and FlightGear examples remain references/preferences rather than an authorized second aircraft or measured graphics verdict. | Pass — documentation |
| Flight-school community — R-COMMUNITY-1 | ROAD has a community/open-release track alongside useful simulator slices. SPEC/ARCH/CONCEPT cover learning experiences, objectives, sources, review/debrief and contributor status; roles/moderation/privacy precede deployment. E11 defines future acceptance. | Pass — documentation |
| Free/open-source project — R-OPEN-1 | SPEC requires an open-source release and free declared baseline, including usable published experiences without a required paid LLM/imagery service. Exact license, funding/hosting and data/model/content rights remain separate Q5/Q6/Q12 and SBOM decisions. | Pass — documentation |
| LLM-created territories/navigation/charts and AI interaction — R-AUTHOR-1 | SPEC/ARCH define reviewable declarative experience packages resolving real references through accepted records, rejecting unresolved/unsafe payloads and freezing accepted data/events for replay. AI interaction stays within scenario state. E9 defines unknown/ambiguous/injected/provider-failure cases; Q13 retains provider/review choices. | Pass — documentation |
| EDDF plus 100 NM from real material — R-REGION-1 | SPEC/ARCH/ROAD/TRAINING/E10 define a sourced official EDDF ARP, geodesic 185,200 m radius, layer coverage/rights and independent fixture gates. Official current ARP coordinates remain explicitly unverified. Centering the region does not select every drill's airport/runway. | Pass — documentation |
| Reuse open physics engines/models — R-REUSE-1 | ARCH and E1 now prioritize existing open engines, applicable models and adapters, with distinct licenses, browser/replay/reference tests and evidence before custom replacement. JSBSim, related models and a WASM wrapper remain candidates, not adopted/validated components. | Pass — documentation |

## Research and cross-document consistency

The [GeoFS/community study](../research/2026-10-31-geofs-gap-analysis.md) satisfies
the requested initial background investigation as a bounded source review. It
records official documentation for navigation, METAR-related weather, chat and
replay, keeping aircraft-specific cockpit completeness and raw-report/NOTAM
briefing questions separate. The user's gap list is not rewritten as verified
product-wide absence. Three original community discussions are labeled a small
anecdotal/version-specific convenience sample, with source limitations; their
usability/condition-control/lesson-trigger ideas are proposals to reproduce.
No hands-on GeoFS/FlightGear or representative community survey is claimed.

The [EDDF/open-foundation study](../research/2026-10-31-eddf-open-foundation.md)
separates real geodata, generated map rendering and official chart/procedure
rights. It openly lacks a verified current official ARP and does not substitute
OurAirports or an old mirrored chart. Open code, model data, cockpit/visual/audio
assets, geographic data, tile services and chart access are separately scoped.
The studies disclose the structured research fallback, not an unavailable deep
research execution. This validation inspected their method/coverage/disclosures;
it did not independently refetch or legally approve each external source.

Planning remains coherent: E1/E2 cover reuse and physics; E5 covers launch/input/
view/review; E6 covers geography/pressure/navigation; E7 covers briefings/radio/
checklists/drills; E8 limits comparator/community inferences; E9/E10/E11 cover
authoring, region and open community. TODO 1.7–1.11 identify necessary source,
contract, authoring and license/community decisions, while ROAD owns later scope.
Feature order is marked proposed; only classic-before-glass, PPL-first and the
user's broad roadmap directions are treated as decisions. The whole wishlist is
not presented as an already accepted first-release schedule.

GAPS retains exact aircraft/radio fit, browser/device baseline, first exercise,
data mode/providers, hosting, exact license and authoring/review policy as open.
The resolved pressure/cockpit answers and partial roadmap decisions have dated
author records. SEC bounds imported/generated content, scenario state, source
access, community visibility and AI data flows. No service, asset ingestion,
engine installation or model acceptance is implied by those design controls.

## Independent checks and remaining limits

- Read all three new raw inputs and the refined authoritative documents and notes.
- `just check`: passed for 53 Markdown files and eight native roles before new
  review reports were added. The final report-inclusive run passed for **55
  Markdown files and eight native roles**, including both new review reports.
- A standard-library Python declaration check found **48 declarations, all unique**;
  the explicit set of **27 original IDs remains complete**, with **16 GeoFS-related
  capability IDs plus five community/authoring/region/reuse IDs** added.
- Independently reproduced both review-time substantive snapshot hashes and the
  current SPEC hash; rechecked the single E6 wording correction against R-AIR-3.
- Existing bootstrap review reports/PDF results describe their earlier hashes and
  27-ID specification. RESULTS explicitly identifies them as historical; they do
  not accept the current 48-ID specification or render its changed documents.
- No PDF build, Git mutation, remote/service operation, simulator execution,
  data ingestion, browser-device test or AI/provider invocation ran in this review.

All feature-level acceptance for the original and 21 added simulator/community/
authoring/region/reuse requirements remains **not evaluated**. The current result
accepts traceable documentation coverage and an honest plan only. Exact thresholds,
datasets, applicable installations and runtime evidence must be fixed and tested
at the affected milestones; no training credit or fidelity approval follows from
this document review.
