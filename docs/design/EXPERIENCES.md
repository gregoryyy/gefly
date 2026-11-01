# Flight-experience packages and the LLM boundary

Status: **proposed product design** for [TODO](../TODO.md) 1.10, 2026-11-01, by the
product role (Claude Code subagent); revised after quality review the same day.
Nothing here is implemented or validated. [SPEC](../SPEC.md) owns requirement
statements (R-AUTHOR-1, R-REGION-1, R-NAV-2, R-NAV-3, R-BRIEF-1, R-DATA-1, R-DATA-2,
R-TRAIN-2, R-TRAIN-4, R-TRAIN-5, R-COMM-1, R-COMMUNITY-1); this document proposes the
package contract for them. The LLM provider and execution model are open
([GAPS Q13](../GAPS.md)); the design is provider-independent.

## Problem and intended behavior

An instructor or learner describes a territory and a learning intent. Authoring
(by hand or with LLM assistance) yields a **declarative, versioned experience
package**: data that the simulator, briefing, checklist, radio and assessment
components interpret. Every real-world fact in it is a **reference to a versioned
source-catalog entry**, never a value asserted by an author or a model. A package
passes machine validation, then human review, before it is accepted. Replay uses
the accepted package and its frozen inputs and never calls a generator again
(ARCH, "LLM-assisted flight-experience authoring").

Scope: first catalog EDDF 100 NM with EDFE ([GAPS Q10](../GAPS.md)); first package
the EDFE circuit ([GAPS Q7](../GAPS.md)); publication waits for phase 3 ([GAPS Q12](../GAPS.md)).

## Principles

1. **Declarative only.** A package is a JSON-compatible document: no scripts,
   expressions, evaluated templates, fetched URLs, HTML or binary payloads.
   Behavior comes from typed hooks the runtime already implements.
2. **Facts by reference.** Airports, runways, holding points, navaids, frequencies,
   airspace, elevations, charts, weather/NOTAM records and aircraft data are
   referenced by stable catalog ID; the package does not repeat them as authority.
3. **Explicit quantities.** Every non-reference number carries a unit and, where
   relevant, a reference (MSL/AGL, QNH/QFE, true/magnetic, IAS/TAS/GS). Bare or
   non-finite numbers are rejected. SI is used internally.
4. **Value classes follow R-DATA-2.** `sourced` (catalog entry), `derived` (named
   rule over sourced inputs), `estimated` and `unknown` (written `tbd`, naming the
   expected source). `sourced`, `derived` and `estimated` values carry `uncertainty`
   `{value, unit}` or `{bound: [low, high], unit}`, or `uncertainty: unknown`.
   Two labels are not real-world claims: `instructional` (an author's teaching
   choice, e.g. session length) and `generated` (labelled synthetic content). An
   `unknown` value blocks acceptance; `estimated` never supports an aircraft claim.
5. **Frozen for replay.** A package pins its catalog edition, aircraft manifest,
   qualification profile and briefing snapshot; it is identified by its hash.
6. **Fail closed.** A validator error, timeout, unknown schema major version or
   unknown/unresolvable catalog edition is a blocking failure, never a pass.

## Source catalog contract

The catalog is a separate, versioned dataset built by research/ingestion (TODO 1.7,
E10), not by authoring. Packages reference only its entries.

| Element | Contract |
| --- | --- |
| Identity | `catalog` name (first: `eddf-100nm`) and `edition` (date-stamped build). The edition defines the region: sourced EDDF ARP, 185 200 m geodesic radius, horizontal/vertical datum. |
| Entry ID | `<kind>:<key>`, stable across editions, e.g. `aerodrome:EDFE`, `runway:EDFE/26`, `holding-point:EDFE/26/<designator>`, `frequency:EDFE/afis`, `circuit:EDFE/26/<side>`. Keys use published designators only. |
| Entry fields | Original value and unit, SI value, datum/reference, uncertainty, value class, `source_id`, source edition/AIRAC, access date and status (`validated`, `approximate`, `placeholder`, `unavailable`). |
| Sources | Register as in the [EDFE source survey](../research/2026-11-01-edfe-aerodrome-sources.md) (E1 DFS AIP, E2a operator flyer, E3 OurAirports): publisher, edition, URL, inspected flag, hash, rights class. |
| Rights class | The shared enum of [CONTRACTS §10.5](CONTRACTS.md#105-rights-classes-one-enum): `public_domain`, `open_licence {spdx, attribution, share_alike}` (covers the earlier `open-attribution`, `odbl` as a separate attributed database, and `project` = GPL-3.0-or-later), `permission` (written grant on record), `facts_only` (individual cited values; no text, tables or figures), `reference_only` (cite id and edition hash; store or ship no value and no per-value hash), `rights_unknown` (blocks shipping). |
| Coverage | Per kind and area: validated, approximate, unavailable (R-REGION-1). |

`reference_only` sources (DFS AIP E1 under E1a §8; operator material E2a–E2c) may be
cited to a reviewer but cannot supply a shipped value or derived chart. A value
known only from them stays `unknown` until a shippable source or permission exists.

## Package schema (version 0, proposed)

All fields are required unless marked optional. The package holds **content only**;
lifecycle and review state live outside it (see "Hash scope and review records").

| Field | Content |
| --- | --- |
| `schema`, `schema_version` | `gefly.experience` and a semantic version; unknown major versions and unknown fields are rejected. |
| `id`, `version` | Stable lower-case slug; any content change increments `version`. |
| `title`, `summary` | Plain text, escaped on render; `summary` labelled `instructional` or `generated`. |
| `catalog` | `{name, edition}` pinned for every reference. |
| `extent` | Catalog area reference (first: the edition's region) and the catalog's declared datum; the package cannot redefine either. |
| `qualification_profile` | `profile_id@profile_version+hash` (`docs/design/QUALIFICATIONS.md`, arriving with PR #10; link once merged) and the `objective_ids` this package serves. |
| `aircraft` | `{manifest, manifest_version, manifest_hash, configuration}` (R-AIR-1; first: classic-panel 172S); `assists` and `fidelity` by enumerated name. |
| `prerequisites` | Optional profile objective IDs or package IDs. |
| `initial_conditions` | See below. |
| `environment` | Briefing snapshot reference and applied conditions. |
| `geography` | Catalog references with a `role`: departure, destination, circuit, reporting-point, avoid, airspace-limit, chart. |
| `procedure` | Ordered `phases`, each with entry/exit conditions from an enumerated vocabulary. |
| `interaction` | `roles` (`learner`; scripted `station`; later `ai-station`, `ai-instructor`) and per role the enumerated `allowed_actions` (below). |
| `hooks` | `checklists`, `radio`, `assessment` (below). |
| `narrative` | Optional prose blocks labelled `instructional` or `generated`. |
| `provenance` | Authors and generator record (below). |
| `limitations` | Visible unsupported/simplified behavior (R-SCOPE-1). |

**Profile linkage.** The package → profile reference is authoritative. Profiles do
not pin packages; any profile → package index is derived from accepted packages and
lies outside both hashes. The package does not restate objective text.

**Initial conditions.** `position` is a catalog reference (first exercise:
`holding-point:EDFE/<rwy>/<designator>`), never typed coordinates. `heading` is
`derived` from the referenced entry. `aircraft_state` names a manifest state (first
exercise: engine running at the holding point, per the user's 2026-11-01 13:00
answer on branch `design/contracts-1-4`); fuel, mass and centre of gravity cite a
manifest loading case. `scenario_time` is UTC with the local zone named.
`altimeter_setting` cites the snapshot's QNH/QFE; the learner sets it.

**Environment and briefing snapshot** (R-BRIEF-1, GAPS Q11). Referenced by ID and
hash. Mode is `historical` (real reports with publisher, station, issue/validity
times, rights) or `generated` (structured values from a declared rule set; report
text is rendered from them, never parsed back as authority). The snapshot records
scenario time, validity at scenario time, NOTAM replacement/cancellation links
where the source supports them, missing items as `unavailable` (not empty), and
`applied_conditions` with their relation to the reports (`matches` or an explained
training variation). Every report and notice is shown as "historical" or
"generated — not current operational information".

**Hooks.** The package supplies references and parameters; the runtime owns behavior.

| Hook | Package supplies | Runtime owns |
| --- | --- | --- |
| `checklists` | Manifest checklist IDs and the phase where each applies (R-TRAIN-4). | Items, sensed vs acknowledged state. |
| `radio` | `frequency:` station references, service type (AFIS informs, it does not clear) and ordered exchange intents from an enumerated vocabulary (`report-holding-point`, `report-downwind`, `report-final`, `report-vacated`; BRIEFING calls R1, R3, R5, R6, SCENARIO-CONTRACTS C8). | Phrasing, readback checks and scenario transitions (R-COMM-1, ARCH radio state machine). |
| `assessment` | Criterion IDs from the frozen exercise criteria (TODO 1.5) and phase. | Measurement, events, debrief traces (R-TRAIN-2). |

Tolerances come from the cited criteria; a package cannot introduce one.

**Interaction and AI output.** `allowed_actions` are enumerated intents (e.g.
`station.give-traffic-info`, `instructor.explain-criterion`). AI radio or
instructor output is presentation and intent proposal only: it **never changes
simulation, avionics, aircraft or clearance state**. Only the scenario state
machine accepts an intent, and only one the package allows (ARCH radio section,
R-COMM-1). Accepted interaction events belong to the **session record** on the
simulation clock and are replayed from it, not regenerated. AI interaction is
deferred; until specified, packages may declare only `learner` and scripted
`station` roles (proposed SPEC note below).

**Provenance.** `authors`: stable project identities (`identity:<id>`) with role;
display names and contact data resolve outside the package. An `llm-assisted`
package must list the requesting human as an author. `tool` is `manual` or
`llm-assisted`; for the latter a `generator` record holds provider, model ID as
reported by the provider, frozen prompt/template and request (stored artifacts
referenced by hash), retrieval-tool versions, catalog edition, timestamps and the
draft hash. Unreported metadata is `unknown`, never guessed.

## Hash scope and review records

`content_hash` = SHA-256 over the RFC 8785 (JCS) canonical serialization of the
entire package document ([CONTRACTS §10.6](CONTRACTS.md#106-canonical-hashing)). Every field above is in scope; referenced artifacts are
included through their pinned hashes. Nothing outside the document is in scope.

Review and lifecycle are **separate records keyed by `content_hash`**: `{content_hash,
state, reviewer identity, role, date, outcome, findings, validator_report_hash}`.
V2 rejects any author-supplied `review`, `state`, `status` or `content_hash` field.

```
draft --validate--> validated --submit--> in-review --accept--> accepted
  ^                    |                     |                     |
  +------ any edit ----+------ reject -------+            supersede/withdraw
```

- `draft`: editable; runs only in an author preview labelled "unvalidated draft".
- `validated`: V1–V8 have no blocking finding; warnings go to the reviewer.
- `in-review`: a reviewer whose identity is not among the authors checks the
  package against the catalog. Training content needs the instructor review partner
  (GAPS Q7, open).
- `accepted`: runs as `reviewed`. Without an eligible reviewer, a package runs only
  as `experimental` with that label visible (R-COMMUNITY-1).
- An edit yields a new version and hash in `draft`; old records remain and replays
  of old versions stay reproducible. Publication waits for phase 3 (GAPS Q12).

## LLM boundary

The LLM may draft a package; call read-only **retrieval tools** over the pinned
catalog edition; propose entries, profile objectives, phases, checklists and radio
intents; write `generated` narrative; and ask the author a question when an entry
is missing, ambiguous or `unknown`.

The LLM may not supply a real-world value (coordinate, elevation, frequency, runway
data, circuit side or altitude, airspace limit, procedure, NOTAM, weather report,
aircraft parameter or tolerance); create catalog entries; fetch URLs or read
sources outside the tools; create review records; or emit code, markup or tool
instructions in a package. Generated prose cannot establish a fact: validators never
read narrative for state, and V5 flags prose naming identifiers or numbers absent
from referenced entries. Retrieval results carry source and rights and mark
source-derived free text as untrusted quoted data. The same validators apply to
hand-written and LLM-drafted packages; published packages run with no LLM (R-OPEN-1).

## Validation pipeline

Stages run in order. A blocking finding stops the stages that depend on it; those
are reported `not evaluated`, never passed. Each finding has `code`, `stage`,
`severity`, JSON-pointer `path`, `message` and `remedy`.

| Stage | Checks | Example finding |
| --- | --- | --- |
| V1 Intake | Size/depth limits, UTF-8, JSON-compatible data (no YAML tags/anchors), no binary/HTML/script. | `V1-EXEC /narrative/0: markup or script is not allowed; use plain text.` |
| V2 Schema | Known version, required/unknown fields, enumerations, value classes and uncertainty present, no review/lifecycle fields; lists `unknown` values (warning). | `V2-REVIEW-FIELD /review: review data is recorded outside the package.` |
| V3 Quantities | Units, references, frames; finite and in bounds; conversions round-trip. | `V3-UNIT /hooks/assessment/2: missing unit and altitude reference (MSL/AGL).` |
| V4 References | Catalog edition, profile, manifest and snapshot resolve with matching hashes; every ID resolves, kind matches role, status not `unavailable`. Fails closed. | `V4-UNRESOLVED /geography/2: 'waypoint:EDFE/NOVEMBER' is not in eddf-100nm@<edition>; choose an entry or request ingestion.` |
| V5 Fabrication | No literal where a reference is required; hand-entered copies of catalog values rejected; prose claims flagged (warning). | `V5-LITERAL /hooks/radio/stations/0: real frequencies must reference a frequency: entry.` |
| V6 Rights | Each entry's rights class permits run/ship/render; no `reference_only` value or per-value hash and no `rights_unknown` content embedded. | `V6-RIGHTS /geography/5: chart is reference_only (DFS AIP E1); use a generated map from shippable entries.` |
| V7 Coherence | Inside `extent`; runway, circuit and holding point share an aerodrome; objective IDs exist in the profile; equipment, checklists and radio fit supported; `allowed_actions` within role; phase graph reachable and terminating. | `V7-EQUIPMENT /hooks/radio/1: station needs a second COM radio not in configuration 172S-<id>.` |
| V8 Briefing | Mode labelled; validity at scenario time; replaced/cancelled notices resolved; missing data explicit; applied conditions agree or explain. | `V8-VALIDITY /environment: report validity ends before scenario_time.` |
| V9 Acceptance | No `unknown` or `placeholder` values; V1–V8 clean of blocking findings; reviewer not an author; reviewed hash equals `content_hash`. | `V9-UNKNOWN: 9 values are unknown; acceptance requires sourced entries.` |

V1–V8 run on each draft save, V9 on accept. Reports are deterministic for the same
package and catalog edition and are stored with the review record.

## Security

Follows [SEC](../SEC.md) (LLM authoring and malicious import threats).

- **Prompt injection.** Source text (flyers, NOTAMs, chart notes, community
  packages) is data, both at catalog ingestion (TODO 1.7) and at authoring. It is
  returned in quoted, typed fields, never enters instruction context and cannot
  trigger tools; tool calls are limited to the retrieval allowlist.
- **No execution.** Runtime interprets enumerated hooks only; strings are escaped;
  no package-supplied URL is fetched.
- **No secrets or personal data.** Provider keys stay out of packages, prompts,
  logs and bundles. Packages hold identity IDs only; provider prompts contain the
  request and catalog extracts, subject to the Q13 data-flow decision.
- **Rights.** V6 blocks embedded `reference_only` material; DFS portal pages are not
  machine-retrieved (EDFE survey, E1a).
- **Abuse.** Bounded size and generation rate/cost; provider failure is reported.

## Worked example: first EDFE circuit (draft, not acceptable)

Every real value is `tbd` (class `unknown`) naming the expected source, from the
[EDFE source survey](../research/2026-11-01-edfe-aerodrome-sources.md). Runway,
circuit side and holding point are open (TODO 1.5/1.7); RWY 26 only shows structure.
YAML-style notation for readability; the stored form is JSON-compatible.

```yaml
schema: gefly.experience
schema_version: 0.1.0
id: edfe-circuit-1
version: 1
title: "Circuit at Frankfurt-Egelsbach"
summary: {class: instructional, text: "Take-off, one circuit and a full-stop landing."}
catalog: {name: eddf-100nm, edition: tbd}            # E10 / TODO 1.7 build
extent: {ref: "area:eddf-100nm/region"}              # ARP and datum from the edition
qualification_profile: {ref: "easa-ppl-a@tbd+tbd", objective_ids: [tbd]}  # TODO 1.5
aircraft:
  {manifest: c172s-classic, manifest_version: tbd, manifest_hash: tbd,
   configuration: tbd, assists: [none], fidelity: tbd}   # TODO 1.3; avionics fit TBD
initial_conditions:
  position: {ref: "holding-point:EDFE/26/tbd"}       # designator TBD: E1 (reference_only)
  heading: {class: derived, from: "runway:EDFE/26", uncertainty: unknown}
  aircraft_state: {ref: "c172s-classic#state/engine-running-holding-point"}  # Q7
  loading: {ref: "c172s-classic#loading/tbd"}
  scenario_time: {utc: tbd, zone: Europe/Berlin}
  altimeter_setting: {ref: "environment#qnh"}        # learner sets QNH
environment:
  snapshot: {id: tbd, hash: tbd, mode: generated}    # Q11 label shown
  applied_conditions: {relation: matches}
geography:
  - {ref: "aerodrome:EDFE", role: departure}         # ARP/elevation TBD: E1
  - {ref: "runway:EDFE/26", role: departure}         # dimensions TBD: E1; E3 placeholder
  - {ref: "circuit:EDFE/26/tbd", role: circuit}      # side and altitude TBD: E1 or permission
  - {ref: "airspace:EDFE/atz", role: airspace-limit} # limits TBD: E1
  - {ref: "map:eddf-100nm/generated-vfr", role: chart}  # generated, labelled
procedure: {phases: [take-off, crosswind, downwind, base, final, landing, roll-out]}
interaction:
  roles:
    - {role: learner, allowed_actions: [radio.transmit-intent, checklist.confirm]}
    - {role: station, allowed_actions: [station.give-traffic-info]}  # scripted AFIS
hooks:
  checklists:
    - {ref: "c172s-classic#checklist/before-take-off", phase: pre}   # POH revision TBD
    - {ref: "c172s-classic#checklist/before-landing", phase: downwind}
  radio:
    stations:
      - {ref: "frequency:EDFE/afis", service: afis}  # value TBD: E1
      - {ref: "frequency:EDFE/apron", service: apron} # value TBD: E1
    intents: [report-holding-point, report-downwind, report-final, report-vacated]
  assessment: [{criterion: tbd, phase: downwind}]    # TODO 1.5
narrative: [{class: generated, text: "..."}]         # establishes no value
provenance:
  authors: [{id: "identity:tbd", role: product}]     # stable project identity
  created: 2026-11-01
  tool: manual
limitations: ["South circuit out of scope", "Engine start and taxi not included (Q7)"]
```

Expected outcome today: V1 and V3 pass; V2 passes with warnings listing the
`unknown` values; V4 fails closed because catalog edition, profile and manifest do
not resolve; V5–V8 are not evaluated; V9 is unreachable. That is correct: the
package cannot be accepted before TODO 1.3, 1.5 and 1.7 supply sourced entries.

## Proposed SPEC and SEC edits (for the orchestrator)

1. R-AUTHOR-1: cite this contract; "no `reviewed` run while any value is `unknown`
   or `placeholder`"; "same validators for hand-written and LLM-drafted packages";
   note that AI interaction roles/actions and accepted interaction events are
   **deferred**, specified with the later AI-interaction stage, and recorded in the
   session record rather than the package.
2. R-DATA-2: allow the non-claim labels `instructional` and `generated` beside
   sourced/derived/estimated/unknown, and require uncertainty on numeric values.
3. New requirement for the **source catalog** (stable IDs, editions, per-field
   provenance, rights classes, coverage), shared by R-REGION-1, R-NAV-2, R-AUTHOR-1.
4. R-TRAIN-2: scenario records are experience packages with catalog-referenced
   initial conditions (first: holding point, engine running).
5. R-BRIEF-1: add snapshot `mode` and the `applied_conditions` relation.
6. R-COMM-1: state that AI output never changes simulation, avionics or clearance
   state.
7. SEC: add "rights violation through embedded `reference_only` material or
   brute-forceable per-value hashes" (V6, CONTRACTS §10.6) and
   name quoted source fields, retrieval allowlisting and ingestion-time handling as
   the prompt-injection controls; fail-closed validation.
8. EVAL E9: use V1–V9 codes as fixture expectations; include a hand-written package.
9. ARCH: add an experiences component (schema, validators) and catalog boundary.

## Open questions

- **Q13 provider assumptions (open):** local or hosted model; which data may leave
  the machine; key handling in a free/open-source build; cost/rate limits; whether
  structured tool calling is required (a client-side retrieval step also works);
  which model metadata a provider actually reports; prompt/output retention.
- Schema language (JSON Schema or stack-native) follows TODO 1.2/Q17.
- Catalog edition cadence versus AIRAC; automatic revalidation versus re-review.
- Shippable sources or DFS permission for values now only `reference_only`.
- Identity scheme for authors/reviewers; single or dual review; the instructor
  partner (Q7).
- Runway, circuit side/altitude, holding point (TODO 1.5/1.7); weather rule-set home.
