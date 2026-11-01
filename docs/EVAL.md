# Evaluation protocols

Status: planned protocols. Targets below are proposed until foundation decisions fix versions, fixtures and tolerances. Results belong in [RESULTS](RESULTS.md); task scheduling belongs in [TODO](TODO.md). Exact requirement IDs and criteria are in [SPEC](SPEC.md).

## E0. Is the project foundation usable?

Question: can a contributor find the original brief, authoritative requirements, open decisions, all declared roles and a working check/build entry point without the source sibling repository?

Procedure: run `just check`, inspect role instructions and native TOML registrations, verify local links and immutable input, compare the adapted BOOT with its recorded provenance. Run `just pdf docs/IDEA.md` twice to check generation and incremental reuse. Inspect the produced A4 PDF visually. Exercise a missing-prerequisite path without installing anything automatically.

Pass: required documents and roles exist; configuration parses; local links resolve; checks pass; a PDF renders and second build reports current. If the environment cannot run the PDF toolchain, report that portion blocked and preserve the runnable commands. This does not validate aircraft physics or learning outcomes. Current scope: milestone 0 / bootstrap requirements.

### E0-CI. Are repository-tool quality gates reproducible locally and in CI?

Scope: TODO 1.1.1 within the bounded repository-tool portion of TODO 1.1;
R-BOOT-3's repeatable checks, R-BOOT-2's scaffold and the R-AGENT workflow's
configuration/evidence conventions. This does not choose a simulator stack or
replace independent quality, validation or the live cross-provider peer gate.
The protocol is fixed before implementation; observations belong in RESULTS.

| Criterion | Acceptance and required evidence |
| --- | --- |
| CI1 — One entry point, independent of caller directory | `python3 <checkout>/utils/ci/run.py` resolves the repository from its own location; `just ci` delegates to it. The hosted workflow invokes that same committed runner. Exercise a clean checkout from an unrelated working directory without sibling repositories, undeclared packages or a prior build. |
| CI2 — Complete, fail-closed local gates | The runner executes scaffold checking, all declared standard-library offline tool tests, the offline study tests (`studies/e1-jsbsim`, skipping cleanly without the `jsbsim` package) and the synthetic render self-check (Node.js), and tracked-content whitespace checks (study and render phases added 2026-11-01, TODO 1.1.2). Skipped checks are reported in the final line and never as a plain pass. Every required phase runs on a passing fixture; any phase failure or missing/empty test suite returns nonzero with useful diagnostics. Whitespace checking inspects tracked file contents even when the checkout has no diff. Untracked files are outside that gate until added; record this limit. |
| CI3 — Negative fixtures establish rejection | Isolated fixtures demonstrate that a missing scaffold/link target, malformed native configuration, failing tool test and tracked whitespace defect each fail the relevant gate. Include a whitespace defect in an otherwise clean fixture checkout, so an empty `git diff --check` cannot masquerade as coverage. Existing peer-router failure cases use mocked provider processes; test fixtures never invoke a real provider. Preserve error diagnostics rather than reporting a failure as success. |
| CI4 — Supported Python lines | Run the shared gate on Python 3.11, the documented minimum, and an explicitly selected current stable minor line verified from official sources when the workflow is authored. Record exact observed Python versions and runner environment. Pin the supported minor lines in the matrix; setup-python may select updated patches within them. Do not claim hermetic or identical interpreter binaries across local and hosted runs. |
| CI5 — Safe PR/push execution | The workflow handles `pull_request` and `push` with a read-only repository token, no stored checkout credentials, no secrets and no privileged pull-request execution. Gate execution uses only the standard library, Git and the runner's preinstalled Node.js after checkout/interpreter setup; tests are offline and nothing is installed. No live peer/provider calls, PDF/browser/TeX jobs, WASM builds or external data ingestion run. The JSBSim study tests exercise the simulator engine only where the `jsbsim` package is already present (not in hosted CI); hosted CI runs them as skips. |
| CI6 — Immutable actions and reviewed updates | Every external action uses a verified full commit pin with its release/source recorded. Document how a replacement pin is checked against the official action source, reviewed and tested through the same gate. Minor-line patch updates and hosted runner updates remain explicit toolchain limits; action pinning alone is not full environment reproducibility. |
| CI7 — Honest local versus hosted evidence | Record the reviewed revision or working-tree scope, exact commands, phase outcomes and Python/environment for local checks. Attempt the hosted matrix on the pushed feature PR and record its commit, run URL/event and each job's observed outcome separately. Missing/unstarted/incomplete hosted runs remain blocked/not evaluated; local success and workflow inspection never establish a remote pass. |
| CI8 — Workflow and review boundaries | Structural/fixture checks establish only this repository-tool CI behavior. Keep source publication, branch protection, future stack gates and live peer acceptance distinct. Quality and validate inspect the integrated runner/workflow and these criteria; peer remains an additional provider gate under E13. Changes invalidate affected evidence and require renewed checks/reviews. |

Procedure: use an isolated clean checkout for the positive and tracked-whitespace
cases; invoke the runner by absolute path from another directory and compare the
root `just ci` alias. Run targeted negative fixtures without altering the working
repository, then inspect workflow events, permissions, pins and shared invocation.
Stop acceptance on a failed required gate, vacuous whitespace/test coverage or
inconsistent reported evidence. Local observations, mock-provider tests and actual
hosted matrix results are separate records; none establishes aircraft fidelity.

## E1. Which web simulation architecture is adequate?

Compare existing open engines/models and bounded deployment adapters first, using the same initial state, normalized controls and force/moment reference cases. The initial source survey considered JSBSim and applicable FlightGear-related models; Q17 now selects JSBSim. The project-owned 172S model and product integration still require E2 evidence. A minimal custom model is a reference harness or a documented gap-specific alternative, not the default product engine. Fixtures: stationary/no-force state, known acceleration/torque, unit/frame conversions and timestep refinement. Record engine/model/adapter licenses separately, maintenance, browser integration, fixed step, seed, latency, frame pacing, CPU headroom and integration error. Rejecting suitable reuse needs an explicit requirement mismatch and recorded evidence (R-REUSE-1).

Before running: use Q4's Mac desktop keyboard/touchpad baseline and select exact reference Mac/macOS/browser versions and optional yoke/joystick/pedal models. Publish candidate versions, reference equations, numerical error and latency budgets. Commands are added with the study in TODO 1.2. Stop a candidate if it cannot meet declared budgets, preserve replay or fit rights/deployment constraints. Do not count visual smoothness as dynamics accuracy. Record the review and resulting architecture decision.

## E2. Does one aircraft configuration match its evidence?

Resolve GAPS Q3 first. Research an applicable approved aircraft manual and avionics documentation with version, conditions and permissions. Product defines the operating envelope and independent reference values before calibration. Build fixtures for instrument/control semantics, mass/balance, trim, steady flight, climb/descent, coordinated turns and other included regimes.

For every case record aircraft configuration, mass, atmosphere, power/configuration, speed/altitude reference, source page/table, interpolation method and allowable uncertainty. Derive tolerances from the source and agreed engineering judgment; do not invent precise values from a different C172 variant. Keep independent holdout cases apart from tuning data. Report residuals and unsupported regimes. A flight-model library's existence does not validate its aircraft coefficients.

## E3. Does progression help a learner?

Define one EASA PPL objective from the selected current syllabus and review its interpretation with a qualified instructor. Compare a simplified interactive lesson and the relevant task in an existing simulator where access/rights permit, against Gefly's proposed exercise. Predefine task completion/error, assistance use, retention/transfer measures, participant handling, procedure and stop criteria. Recruit only after the protocol and privacy plan are reviewed.

Check progression separately from aircraft accuracy: learners should identify the current assists and limitations, control the intended exercise and understand the feedback. Sample size, success thresholds and study commands/materials remain TODO 2 / GAPS Q7 decisions. A small usability study cannot establish flight-training transfer or regulatory credit.

## E4. Does the integrated release satisfy the specification?

Quality reviews code/tests/security and numerical design independently of its authors. Validate builds a requirement-by-requirement matrix at the integrated revision with expected versus actual behavior and artifact/test/source references. The additional peer repeats quality and specification review in the opposite provider (Claude for Codex, Codex for Claude), using a frozen packet with authorship, revision/hash and actual provider evidence. Use pass, fail, blocked and not evaluated; never infer a pass from an unchecked TODO box, process exit or coder's summary. Re-run affected checks after repairs/integration. Release requires local quality/validation, the independent peer gate and evidence for all in-scope criteria.

## E5. Does browser accessibility survive richer cockpit interaction?

Scope: R-UX-1, R-INPUT-1/R-INPUT-2, R-VIEW-1 and R-REVIEW-1. Begin with Q4's Mac
desktop keyboard/touchpad baseline; select exact reference versions and budgets,
then separately test optional yoke/joystick and rudder pedals. Mobile orientation
has its later supported-device gate. Compare the same launch, calibration, control, camera-change and
review tasks in GeoFS and Gefly at recorded versions/settings; keep subjective
preference separate from measured completion, errors, timing and frame/input data.

Cases: GeoFS-inspired keyboard/touchpad settings, remapping and control-neutral/
recenter; Mac keyboard/browser shortcut constraints; cockpit/camera interaction
without unintended flight input; optional controller calibration, conflicting axes,
disconnect and fallback. For later mobile: permission granted/denied and unsupported
orientation; mobile screen-orientation changes/calibration and fallback; camera
changes without changing aircraft state; replay seek/pause with synchronized
instruments, settings and events. Test visual accessibility independently of flight
dynamics. Treat recording/replaying flight state separately from exporting video.
Commands and exact budgets are added with the prototype, not claimed run now.

## E6. Are geography, pressure and cockpit navigation coherent?

Scope: R-WORLD-1, R-AIR-3 and R-NAV-1 through R-NAV-3. Resolve the aircraft/radio
configuration and first region/runway/data editions first. Define reference cases
from the applicable manuals and accepted geographic/navigation sources, including
source uncertainty and test tolerances before execution.

Check distinct airport/runway/terrain elevation fields and datums, unit conversions,
identifier/fix resolution, unknown/ambiguous entries, receiver tuning and the
resulting cockpit indications. Test pressure settings on a source-defined elevated
field and in changing simulated pressure, including QNH, QFE, standard-pressure setting,
units, reset and replay. Judge altimeter indication against its specified reference
model rather than silently comparing to geometric height. Verify planned/flown
path, displayed chart and accepted procedure data agree; distinguish a drawn
descent profile, visual approach aid and ILS localizer/glideslope behavior. Include
valid, unavailable and unsupported signal/coverage states as applicable.

A successful overlay or autopilot route alone cannot pass cockpit-control criteria.
Later glass and traffic/advisory configurations require their own applicable source
cases; displaying traffic cannot establish ACAS/TCAS alert logic or resolution advice.

## E7. Does the practice loop support realistic procedure work?

Scope: R-BRIEF-1, R-COMM-1, R-TRAIN-4/R-TRAIN-5 and later R-TRAFFIC-1 as separately
scoped. Predefine a reviewed objective, jurisdiction/phraseology, aircraft fit,
airport/runway, conditions and expected events before implementation acceptance.
Begin with Q11's accepted versioned historical/generated scenario fixtures;
validate report/NOTAM times against scenario time and freeze them for review.
An optional live adapter is later scope and is not an initial exercise dependency.
Record instructor review and numeric
scoring rationale; ILS familiarization does not automatically imply EASA PPL
coverage, rating entitlement or a particular syllabus requirement.

Briefing cases include issued/valid/expired/unavailable weather and NOTAM data,
source/coverage labels, historical/generated/live modes, intentional differences
from simulated weather, frozen replay and service failure. Empty/missing notices
must be distinguishable from a verified empty result for declared coverage.
Radio cases include correct intent/readback, incorrect/incomplete readback, wrong
frequency/role, conflicting instructions, timeouts and reset/replay. Observe state
transitions, not only plausible-looking text. Checklists test modeled system state,
manual acknowledgments, out-of-order actions and incomplete items. Flight/circuit
and later ILS drills use source-defined objectives and an observable debrief.

Learning benefit uses E3 and is a separate study; feature checks cannot establish
retention, transfer or approval. Any future language-model conversation receives
its own consistency/privacy evaluation outside the authoritative scenario model.

## E8. What do competitor and community sources actually establish?

This is a research-review checklist, not a user study or a simulator accuracy
benchmark. Compare built-in, paid/version-specific, add-on and externally organized
capabilities. Keep user's observations, official documentation, original community
reports, inference and actual hands-on reproduction separate. Cite dates/versions
and direct original reports; avoid declaring a feature absent merely because a
search did not find it. Record unavailable/deleted/undated sources honestly.

The [GeoFS study](research/2026-10-31-geofs-gap-analysis.md) records current evidence
and leads for future reproducible tests. Community concerns are hypotheses for
inspection, not prevalence estimates or verified current defects. Product maps
them to already requested capabilities or proposes new scope explicitly. A wider
community survey and operational flight tests remain separate future work.

## E9. Does LLM authoring produce a valid, reviewable flight experience?

Scope: R-AUTHOR-1 and its dependencies. Define supported intents, package schema,
regional/aircraft catalog, model/provider/version, prompt/tool configuration and
acceptance/stop criteria before running. Use fixed requests with known sources,
plus unknown/ambiguous fixes, unavailable charts, incompatible equipment,
contradictory routes, injected source instructions and provider failure cases.

Pass only when the generated package resolves its real-world claims to accepted
versioned assets, declares missing material, passes schema/geographic/equipment/
scenario checks and exposes a reviewable briefing/map. Test AI text interaction
against accepted scenario intents, not plausibility alone. Re-running generation
need not produce identical text; replay of the accepted package must preserve its
data/state/events within the declared runtime contract. Record limitations,
human review, source rights and actual costs/latency before deciding deployment.
No provider, generator or package has been implemented by these documents.

## E10. Is the EDDF 100 NM region sourced and coherent?

Scope: R-REGION-1, R-WORLD-1, R-NAV-2/R-NAV-3 and R-DATA-1. Obtain the applicable
official EDDF airport reference point and record edition/coordinates/reference
system before generating accepted region geometry. Verify geodesic radial and
boundary cases at **185,200 m**, data-layer coverage, any tile buffer and
distinctions between source uncertainty, rendering detail and accepted geometry.
An unverified third-party airport coordinate cannot pass the official-center gate.

Inventory real basemap, terrain/surface model, airport/runway/elevation, navigation
and chart/procedure material independently. Check coordinate/vertical references,
rights, source versions, gaps and representative alignment fixtures. A generated
map can use real data; label its presentation and underlying-data status separately.
Open code or public chart viewing is not proof of dataset redistribution rights.
Use [the source study](research/2026-10-31-eddf-open-foundation.md) as candidate
evidence, not as completed ingestion or fidelity acceptance. Select training
airfields/runways inside the region separately from choosing EDDF as center.

## E11. Can the flight-school community be released free and open source?

Scope: R-COMMUNITY-1 and R-OPEN-1. Before a public release, agree the exact code
license, distribution inventory, contribution workflow, hosting/data flows and
which content/identity/moderation functions are in scope. Evaluate a reproducible
build and documented self-hosting path using authorized inputs; distinguish code,
community submissions and separately licensed data/assets.

For the selected community slice, test exercise discovery/sharing, provenance and
review labels, learner/instructor permissions, reporting/moderation and content
removal. Generated or unreviewed content must not appear instructor-approved.
Check personal-data handling and AI/provider dependencies without assuming a
central paid service is required to use the simulator. Free/open-source intention
is user direction; a specific license or deployed service is not established yet.

## E12. Does each pilot-qualification track match its selected framework?

Scope: R-TRAIN-6. Before implementation acceptance, select the jurisdiction,
authority, full qualification, aircraft/category and relevant privileges/launch
methods; pin the applicable rule/curriculum revisions. Map each included objective,
prerequisite and assessment to a source and the equipment/model needed to practice
it. Keep software licensing separate from pilot qualifications.

For a selected sailplane track, test the declared launch/soaring/energy-management
and landing cases against applicable aircraft and training references. Treat TMG
or additional launch privileges only within their specifically accepted scope.
For ultralights, define the national category and its controls, handling/performance
and exercises first; do not substitute a generic airplane syllabus or model.
Use independent model fixtures and qualified curriculum review for each profile.

Check incorrect/ambiguous profile identifiers, mismatched jurisdiction/category,
unsupported equipment/privileges and stale source mappings. Reject silent fallback
to PPL/CPL airplane criteria. A shared lesson, common acronym or simulator feature
does not establish training-credit transfer or eligibility. Exact criteria and
numeric tolerances are fixed when a track starts; this roadmap update does not
implement or validate any sailplane/ultralight curriculum or aircraft model.

## E13. Is peer review actually independent across providers?

Scope: R-AGENT-7 and the nine-role setup. Inspect the canonical contract, both
native dispatchers and router; a local dispatcher is not the external reviewer.
Run `just test-tools` offline for reciprocal routing, dry-run without calls,
missing CLI/revision, failures/timeouts, malformed reports, tool-use and inconsistent
recommendations. `just check` covers registration/prose links only, not live identity.

For live evidence, freeze a packet with exact revision/source snapshot, declared
author provider(s), requirements, relevant source/diff and recorded check outputs.
Run the actual opposite-provider CLI in a fresh context. Preserve packet hash,
CLI/version, reported model/provider evidence, quality findings, validation rows,
limitations and the orchestrator's gate assessment. Process execution, parsed
recommendation and verified acceptance are separate observations.

No same-provider substitute may pass missing CLI/authentication, unsupported
behavior, unknown identity or incomplete criteria. For mixed authorship, require
reciprocal coverage excluding each provider's own contributions. Recheck affected
criteria after repairs. One live route plus mocked reciprocal tests must not be
reported as two live provider runs. Packet-only inspection cannot claim commands
were independently executed or establish simulator fidelity/training credit.


## E14. Does bounded assurance reject stale or unsupported acceptance?

Use [AS1–AS8](assure/SPEC.md) and R-ASR-1 through R-ASR-5. Run the offline
assurance suite, inspect the graph/report/trace and compare the integrated
revision with its base. Negative fixtures must reject malformed IDs/records,
wrong heading/body composition, changed evidence inputs, invalid outcomes,
missing reviews and calibration/holdout overlap. Historical source text and
planned MVP work remain visibly distinct from accepted claims. Rebuild twice to
check deterministic substantive output; compare from an unrelated caller directory
and an isolated committed fixture. Inspect the final merge result, not merely the
feature-branch report. Record actual local/hosted outcomes and independent review
in RESULTS; importing existing observations is not a new benchmark run.
