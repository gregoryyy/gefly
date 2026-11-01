# Flight-experience packages and the LLM boundary

Status: **proposed product design** for [TODO](../TODO.md) 1.10, 2026-11-01, by the
product role (Claude Code subagent). Nothing here is implemented or validated.
[SPEC](../SPEC.md) owns requirement statements (R-AUTHOR-1, R-REGION-1, R-NAV-2,
R-NAV-3, R-BRIEF-1, R-DATA-1, R-DATA-2, R-TRAIN-2, R-TRAIN-4, R-TRAIN-5, R-COMM-1,
R-COMMUNITY-1); this document proposes the package contract that satisfies them.
The LLM provider and execution model are open ([GAPS Q13](../GAPS.md)); the design
is provider-independent and names provider assumptions only as open questions.

## Problem and intended behavior

An instructor or learner describes a territory and a learning intent. Authoring
(by hand or with LLM assistance) yields a **declarative, versioned experience
package**: data that the simulator, briefing, checklist, radio and assessment
components interpret. Every real-world fact in the package is a **reference to a
versioned source-catalog entry**, never a value asserted by the author or a model.
A package passes machine validation, then human review, before it is accepted.
Replay and review use the accepted package and its frozen inputs; they never call
a generator again (ARCH, "LLM-assisted flight-experience authoring").

Scope limits: the first catalog is the EDDF 100 NM region with EDFE as the first
aerodrome ([GAPS Q10](../GAPS.md)); the first package is the EDFE circuit
([GAPS Q7](../GAPS.md)). Community publication, roles and moderation are deferred to
roadmap phase 3 ([GAPS Q12](../GAPS.md)); AI radio/instructor interaction is a later
stage that reuses the same boundary.

## Principles

1. **Declarative only.** A package is a JSON-compatible document. No scripts,
   expressions, templates with evaluation, URLs that are fetched, HTML or binary
   payloads. Behavior comes from typed hooks that the runtime already implements.
2. **Facts by reference.** Airports, runways, holding points, navaids, frequencies,
   airspace, elevations, charts, weather/NOTAM records and aircraft data are
   referenced by stable catalog ID. The validator resolves the ID; the package
   does not repeat the value as authority.
3. **Explicit quantities.** Every number that is not a reference carries a unit
   and, where relevant, a reference (MSL/AGL/QNH/QFE, true/magnetic, IAS/TAS/GS).
   Bare numbers and non-finite values are rejected. SI is used internally.
4. **Value classes are visible** (R-DATA-2): `sourced` (catalog), `derived` (named
   rule over sourced inputs), `instructional` (author-chosen teaching value, e.g. a
   session duration), `generated` (labelled synthetic content) and `tbd` (missing,
   with the source expected to supply it). A `tbd` value blocks acceptance.
5. **Frozen for replay.** An accepted package pins the catalog edition, aircraft
   manifest version, briefing snapshot and its own content hash.
6. **Provider independence.** The schema, validators and review do not depend on
   who drafted the package; an LLM is one optional drafting client.

## Source catalog contract

The catalog is a separate, versioned dataset built by research/ingestion (TODO 1.7,
E10), not by authoring. Packages can reference only entries in it.

| Element | Contract |
| --- | --- |
| Catalog identity | `catalog` name (first: `eddf-100nm`) and `edition` (date-stamped build ID). The edition records its region definition (sourced EDDF ARP, 185 200 m geodesic radius, datum) once those are sourced. |
| Entry ID | `<kind>:<key>`, stable across editions, e.g. `aerodrome:EDFE`, `runway:EDFE/26`, `holding-point:EDFE/26/<designator>`, `frequency:EDFE/afis`, `circuit:EDFE/26/north`, `airspace:<key>`. Keys use published designators only; no invented names. |
| Entry fields | Typed values, each with original value and unit, SI value, datum/reference, `source_id`, source edition/AIRAC or date, access date, confidence and status (`validated`, `approximate`, `placeholder`, `unavailable`). |
| Sources | Register entries as in the [EDFE source survey](../research/2026-11-01-edfe-aerodrome-sources.md) (E1 DFS AIP, E2a operator flyer, E3 OurAirports): publisher, title, edition, URL, inspected flag, hash and rights class. |
| Rights class | `public-domain`, `open-attribution`, `odbl` (separate attributed database), `project` (GPL-3.0-or-later), `permission` (written grant on record), `reference-only` (cite edition/hash; do not store or ship content). |
| Coverage | Per kind and area: validated, approximate, unavailable (R-REGION-1). |

`reference-only` entries (for example DFS AIP charts, E1/E1a §8) may be cited for
a reviewer but cannot supply a shipped value or a derived chart. A package that
needs such a value stays `tbd` until an independently shippable source or written
permission exists.

## Package schema (version 0, proposed)

Top level; each field is required unless marked optional.

| Field | Content |
| --- | --- |
| `schema` | `gefly.experience` and `schema_version` (semantic version; validators reject unknown major versions and unknown fields). |
| `id`, `version` | Stable package ID (lower-case slug) and package version; a content change increments `version`. |
| `title`, `summary` | Plain text, escaped on render; `summary` is classed `instructional` or `generated`. |
| `catalog` | `{name, edition}` pinned for every reference in the package. |
| `aircraft` | `{manifest, manifest_version, configuration}` referencing an R-AIR-1 manifest (first: classic-panel 172S); `assists` and `fidelity` settings by enumerated name. |
| `objectives` | List of `{id, text, syllabus_ref}`; `syllabus_ref` points to the selected EASA source revision (R-TRAIN-1) or is `tbd`. |
| `prerequisites` | Optional list of package/objective IDs or learner skills (enumerated). |
| `initial_conditions` | See below. |
| `environment` | Briefing snapshot reference and applied-conditions record. |
| `geography` | References used by the exercise: aerodromes, runways, circuits, reporting points, airspace, frequencies, charts. |
| `procedure` | Ordered `phases` (e.g. take-off, crosswind, downwind, base, final, landing, roll-out), each with entry/exit conditions from an enumerated condition vocabulary. |
| `hooks` | `checklists`, `radio`, `assessment` (below). |
| `narrative` | Optional briefing/teaching prose, each block labelled `instructional` or `generated`. |
| `provenance` | Authorship and generator record. |
| `review` | Review state and history. |
| `limitations` | Visible unsupported/simplified behavior (R-SCOPE-1). |

**Initial conditions.** `position` is a catalog reference (first exercise:
`holding-point:EDFE/<rwy>/<designator>`), never coordinates typed by the author.
`heading` is `derived` from the referenced runway or holding-point entry.
`aircraft_state` names a state defined in the aircraft manifest (first exercise:
engine running, before-take-off checks complete, per the user's 2026-11-01 13:00
answer on branch `design/contracts-1-4`); fuel, mass and centre-of-gravity cite a
manifest loading case. `scenario_time` is UTC with the local-time zone named.
`altimeter_setting` cites the briefing snapshot's QNH/QFE value; the learner sets it.

**Environment and briefing snapshot** (R-BRIEF-1, GAPS Q11). The package
references a frozen snapshot by ID and hash. Snapshot mode is `historical` (real
reports with publisher, station, issue/validity times and rights) or `generated`
(structured values from a declared rule set; rendered report text is derived from
those values, never parsed back as authority). Each snapshot records scenario
time, validity at scenario time, missing items as `unavailable` (not empty), and an
`applied_conditions` block (wind, visibility, cloud, temperature, pressure) with
its stated relationship to the reports (`matches` or an explained training
variation). The briefing displays "historical" or "generated — not current
operational information" on every report and notice.

**Geography and navigation.** Lists of catalog IDs with a `role` (departure,
destination, circuit, reporting-point, avoid, airspace-limit, chart). Generated
training maps declare `generated-map` and the catalog entries they draw (R-NAV-3).

**Hooks.** Hooks name runtime-implemented behavior; the package supplies only
references and parameters.

| Hook | Package supplies | Runtime owns |
| --- | --- | --- |
| `checklists` | Checklist IDs from the aircraft manifest and the phase where each applies (R-TRAIN-4). | Item definitions, sensed vs acknowledged state. |
| `radio` | Station references (`frequency:` entries), the station's service type (e.g. AFIS gives information, not clearances), and an ordered list of exchange intents from an enumerated vocabulary (e.g. `report-holding-point`, `report-downwind`, `report-vacated`). | Phrasing, readback checking and scenario-state changes (R-COMM-1, ARCH radio state machine). |
| `assessment` | Criterion IDs from the training catalogue (TODO 1.5) with phase, measured quantity, reference and tolerance. | Measurement, events and debrief traces (R-TRAIN-2). |

Assessment tolerances are taken from the frozen exercise criteria (TODO 1.5) and
cite them; a package cannot introduce a new aircraft-specific tolerance.

**Provenance.** `authors` (role and display name; no contact data), `created`,
`tool` (`manual` or `llm-assisted`), and for LLM assistance a `generator` record:
provider, model identifier as reported by the provider, request/prompt-template
version, retrieval-tool versions, catalog edition, timestamps and the hash of the
draft it produced. Unknown model metadata is recorded as unknown, not guessed.

**Review.** `state` (below), reviewer entries `{role, reviewer, date, outcome,
findings}`, the validator report hash and the accepted `content_hash`.

## Review states

```
draft --validate--> validated --submit--> in-review --accept--> accepted
  ^                    |                     |                     |
  +------ any edit ----+------ reject -------+            supersede/withdraw
```

- `draft`: any author or tool may edit. Not runnable except in an author preview
  labelled "unvalidated draft".
- `validated`: all blocking validator stages pass; warnings listed for review.
- `in-review`: a reviewer who is not an author checks objectives, briefing, map,
  sources, rights and limitations against the catalog. Training content needs the
  instructor review partner (GAPS Q7, still open).
- `accepted`: runnable as `reviewed`; content hash frozen. Until a reviewer exists,
  packages can run only as `experimental` with that label visible (R-COMMUNITY-1).
- Any edit returns the package to `draft` with a new version. `superseded` and
  `withdrawn` keep history; replays of old versions stay reproducible.
- Publication beyond the local project waits for phase 3 rules (GAPS Q12).

## LLM boundary

The LLM may: turn a request into a draft package; call **retrieval tools** that
search the pinned catalog and return entry IDs with their values; propose which
catalog entries, objectives, phases, checklists and radio intents to use; write
`generated` narrative; and ask the author an explicit question when an entry is
missing, ambiguous or `tbd`.

The LLM may not: supply a real-world value (coordinate, elevation, frequency,
runway data, airspace limit, procedure, NOTAM, weather report, aircraft parameter
or tolerance); create catalog entries; fetch URLs or read sources outside the
retrieval tools; set review state; or emit code, markup or tool instructions in a
package. Generated prose cannot establish a fact: validators never read narrative
for state, and a reviewer sees prose that mentions identifiers or numbers not
present in referenced entries flagged for checking.

Retrieval tools are read-only, scoped to one catalog edition, return structured
data with source and rights, and mark source-derived free text as untrusted
quoted data. The same validators apply to hand-written and LLM-drafted packages.
The simulator runs published packages with no LLM available (R-OPEN-1).

## Validation pipeline

Stages run in order; a blocking failure stops later stages that depend on it.
Each finding has `code`, `stage`, JSON-pointer `path`, `message` and `remedy`.

| Stage | Checks | Example failure message |
| --- | --- | --- |
| V1 Intake | Size limit, UTF-8, JSON-compatible data only (no YAML tags/anchors), no binary/HTML/script content, depth/array limits. | `V1-EXEC /narrative/0: markup or script content is not allowed; use plain text.` |
| V2 Schema | Known `schema_version`, required fields, no unknown fields, enumerations, value classes present. | `V2-UNKNOWN-FIELD /initial_conditions/lat: field is not in schema 0.x; reference a catalog position instead.` |
| V3 Quantities | Units, references and frames declared; finite and in schema bounds; conversions round-trip. | `V3-UNIT /hooks/assessment/2/tolerance: missing unit and altitude reference (MSL/AGL).` |
| V4 References | Every ID resolves in the pinned catalog edition and aircraft manifest; kind matches role; status not `unavailable`. | `V4-UNRESOLVED /geography/2: 'waypoint:EDFE/NOVEMBER' is not in eddf-100nm@<edition>; choose an existing entry or request catalog ingestion.` |
| V5 Fabrication | No literal value where the schema requires a reference; literals equal to a catalog field but entered by hand are rejected; `tbd` and `placeholder` values listed. | `V5-LITERAL /radio/stations/0/frequency_mhz: real frequencies must reference a frequency: entry.` |
| V6 Rights | Every referenced entry's rights class permits the package's use (run, ship, render map); `reference-only` content is not embedded. | `V6-RIGHTS /geography/5: chart entry is reference-only (DFS AIP E1); cite it in review or use a generated map from shippable entries.` |
| V7 Coherence | Inside region; runway/circuit/holding point belong to the same aerodrome; pattern side matches the circuit entry; aircraft supports referenced equipment, checklists and radio fit; phase graph reachable and terminating. | `V7-EQUIPMENT /hooks/radio/1: station requires a second COM radio not in configuration 172S-<id>.` |
| V8 Briefing | Snapshot hash matches; mode labelled; validity evaluated at scenario time; missing data explicit; applied conditions agree or explain the difference. | `V8-VALIDITY /environment: report validity ends before scenario_time; mark as expired or replace.` |
| V9 Acceptance gate | No `tbd` or `placeholder` values, no blocking findings, reviewer is not an author, content hash matches the reviewed hash. | `V9-TBD: 4 values are tbd; acceptance requires sourced catalog entries.` |

V1–V8 run on every draft save; V9 runs on accept. Reports are deterministic for
the same package and catalog edition and are stored with the review.

## Security

Threats follow [SEC](../SEC.md) ("LLM authoring fabricating facts…" and "Malicious
aircraft, scenario or replay import").

- **Prompt injection from sources.** Source text (operator flyers, NOTAM text,
  chart notes, community packages) is data. Retrieval returns it in quoted,
  typed fields; it never enters the system/instruction part of a prompt and cannot
  trigger tools. Tool calls are limited to the catalog retrieval allowlist.
- **No execution.** Packages contain no code; the runtime interprets enumerated
  hooks only. Rendered strings are escaped; no package-supplied URL is fetched.
- **No secrets or personal data.** Provider keys stay out of packages, prompts,
  logs and client bundles. Provenance stores roles/display names, not contact data
  or learner telemetry. Prompts sent to a provider contain the request and catalog
  extracts only, subject to the Q13 data-flow decision.
- **Rights.** V6 prevents embedding `reference-only` material; DFS portal pages are
  not machine-retrieved (EDFE survey, E1a).
- **Abuse and size.** Bounded size/depth, rate and cost limits on generation; a
  provider failure leaves the draft unchanged and reports the failure.
- **Integrity.** Accepted packages are identified by a content hash over a
  canonical serialization (proposal: SHA-256 over RFC 8785 JSON canonicalization).

## Worked example: first EDFE circuit (draft, not acceptable)

Every real value is `tbd` with the source expected to supply it. Source IDs refer
to the [EDFE source survey](../research/2026-11-01-edfe-aerodrome-sources.md).
Runway choice and holding-point designator are open (TODO 1.5/1.7); RWY 26 is
used only to show structure. The notation is YAML-style for readability; the
stored form is JSON-compatible data.

```yaml
schema: gefly.experience
schema_version: 0.1.0
id: edfe-circuit-1
version: 1
title: "Circuit at Frankfurt-Egelsbach"
summary: {class: instructional, text: "Take-off, one circuit and a full-stop landing."}
catalog: {name: eddf-100nm, edition: tbd}          # E10 / TODO 1.7 build
aircraft:
  manifest: c172s-classic                          # R-AIR-1, TODO 1.3
  manifest_version: tbd
  configuration: tbd                               # serial range 172S9491-9809; avionics fit TBD
  assists: [none]
  fidelity: tbd
objectives:
  - {id: obj-circuit, text: "Fly a circuit and land", syllabus_ref: tbd}   # EASA source revision, TODO 1.5
initial_conditions:
  position: {ref: "holding-point:EDFE/26/tbd"}     # designator TBD, E1 aerodrome chart (reference-only)
  heading: {class: derived, from: "runway:EDFE/26"}
  aircraft_state: {ref: "c172s-classic#state/before-take-off-complete"}  # engine running (Q7)
  loading: {ref: "c172s-classic#loading/tbd"}
  scenario_time: {utc: tbd, zone: Europe/Berlin}
  altimeter_setting: {ref: "environment#qnh"}      # learner sets QNH
environment:
  snapshot: {id: tbd, hash: tbd, mode: generated}  # Q11; label "not current operational information"
  applied_conditions: {relation: matches}
geography:
  - {ref: "aerodrome:EDFE", role: departure}       # ARP/elevation TBD: E1 (AIP), cross-check E3
  - {ref: "runway:EDFE/26", role: departure}       # dimensions/thresholds TBD: E1; E3 placeholder only
  - {ref: "circuit:EDFE/26/north", role: circuit}  # side per E2a; circuit altitude TBD: E1
  - {ref: "airspace:EDFE/atz", role: airspace-limit}  # vertical limit TBD: E1 (E2a cite-only)
  - {ref: "map:eddf-100nm/generated-vfr", role: chart}  # generated training map, labelled
procedure:
  phases: [take-off, crosswind, downwind, base, final, landing, roll-out]
hooks:
  checklists:
    - {ref: "c172s-classic#checklist/before-take-off", phase: pre}   # POH revision TBD
    - {ref: "c172s-classic#checklist/before-landing", phase: downwind}
  radio:
    stations:
      - {ref: "frequency:EDFE/afis", service: afis}       # value TBD: E1; E2a cite-only
      - {ref: "frequency:EDFE/apron", service: apron}     # value TBD: E1; E2a cite-only
    intents: [report-holding-point, report-downwind, report-final, report-vacated]
  assessment:
    - {criterion: "tbd", phase: downwind}          # TODO 1.5 criteria and tolerances
narrative:
  - {class: generated, text: "..."}                # cannot establish any value above
provenance:
  authors: [{role: product, name: "Claude Code (product subagent)"}]
  created: 2026-11-01
  tool: manual
review: {state: draft, reviewers: []}
limitations: ["South circuit out of scope", "Engine start and taxi not included (Q7)"]
```

Expected validator outcome today: V4 fails (catalog edition does not exist), V9
lists every `tbd`. That is the correct result: the package cannot be accepted
before TODO 1.3, 1.5 and 1.7 supply sourced entries.

## Proposed SPEC and SEC edits (for the orchestrator)

1. SPEC R-AUTHOR-1: cite this document as the package contract; add "a package
   cannot run as `reviewed` while any value is `tbd`/`placeholder`" and "the same
   validators apply to hand-written and LLM-drafted packages".
2. SPEC: propose a new requirement for the **source catalog** (stable IDs,
   editions, per-field provenance, rights classes, coverage) shared by R-REGION-1,
   R-NAV-2 and R-AUTHOR-1, rather than repeating it in each.
3. SPEC R-TRAIN-2: state that scenario records are experience packages with
   initial conditions by catalog reference (first: holding point, engine running).
4. SPEC R-BRIEF-1: add the snapshot `mode` label and `applied_conditions` relation.
5. SEC threat table: add "rights violation through embedded reference-only
   material" (control: V6) and name retrieval-tool allowlisting and quoted source
   fields as the prompt-injection control.
6. EVAL E9: use V1–V9 failure codes as fixture expectations; add a hand-written
   package to show validators are generator-independent.
7. ARCH: add a `packages/experiences/` (schema, validators) and a catalog boundary
   to the component table once the stack is selected.

## Open questions

- **Q13 provider assumptions (open):** local versus hosted model; which data may
  leave the machine; key handling for a free/open-source build; cost/rate limits;
  whether tool/function calling is required (the design assumes structured tool
  calls but works with a client-side retrieval step); model metadata a provider
  actually reports; retention of prompts and outputs.
- Serialization and schema language (JSON Schema or a stack-native type) follow
  the stack decision (TODO 1.2, Q17).
- Catalog edition cadence versus AIRAC cycles; whether a package may be revalidated
  automatically against a newer edition or must be re-reviewed.
- Shippable sources for values DFS publishes only as `reference-only` (EDFE survey
  recommendation: DFS written approval or independent sources).
- Who may review (instructor partner, Q7); single or dual review for `accepted`.
- Holding-point designator, runway choice and circuit altitude for the first
  package (TODO 1.5/1.7); whether `generated` weather rule sets live in the catalog.
