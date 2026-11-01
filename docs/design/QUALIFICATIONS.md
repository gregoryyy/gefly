# Pilot-qualification profiles

Status: product design proposal for TODO 1.12, revised after quality review;
not yet integrated into SPEC. Author: Claude Code product role, 2026-11-01.
Scope: the declarative contract
that ties a training track to one pilot qualification. [SPEC](../SPEC.md) owns
requirements (R-TRAIN-1, R-TRAIN-3, R-TRAIN-6, R-AIR-1, R-DATA-1, R-DATA-2);
[GAPS](../GAPS.md) Q14 owns the open sailplane/ultralight choices, which this
document does not make. Pilot qualifications are unrelated to software licensing
(GAPS Q5). No machine format, file location or implementation is selected here.

## Problem and intended behavior

A learner must see exactly which qualification a lesson relates to, under which
rules, for which aircraft, and with what limits. An abbreviation such as `SPL`
is ambiguous ([licence-track note](../research/2026-10-31-license-training-tracks.md),
S1/S5), and an airplane lesson does not transfer to a glider or an ultralight.
A **qualification profile** is a reviewed, versioned record that states the
jurisdiction, authority, full qualification, privileges, source revisions and the
mapping from source objectives to applicable aircraft configurations. Experience
packages, tracks and debriefs pin and reference it; they do not restate it, and
the profile does not pin them.

Out of scope: eligibility advice, evaluated medical/hour rules, examination
question banks, simulator device approval and any training credit.

## Value and provenance model

Every content field below is a **sourced value**, not a bare string:

| Key | Required | Meaning |
| --- | --- | --- |
| `value` | yes, unless `status` is `tbd` | The stated content, in the source's language plus an optional English gloss. |
| `status` | yes | `sourced` (read in the cited source), `derived` (stated derivation from sourced values), `unverified` (named but not yet read in the cited section), `tbd` (unknown; source to consult named) or `decision_pending` (a user choice; GAPS ID required). R-DATA-2 mapping: `sourced` and `derived` are those classes; `unverified`, `tbd` and `decision_pending` are subdivisions of *unknown*; R-DATA-2 *estimated* is not admitted in a profile. |
| `sources` | yes for `sourced`/`derived`/`unverified`/`tbd` | List of `{source_id, section, page?}`; `section` uses the source's own identifier. |
| `derivation` | if `derived` | Short reasoning from cited values; generated prose is never a source. |
| `decision` | if `decision_pending` | GAPS question ID, e.g. `Q14`. |

Each profile carries a **source register**. Each entry has:

| Field | Required | Notes |
| --- | --- | --- |
| `source_id` | yes | Stable within the profile, e.g. `easa-aircrew-ear`. |
| `title`, `publisher` | yes | Full title, issuing body. |
| `kind` | yes | `official_legal_text`, `easy_access_compilation`, `authority_guidance`, `amc_gm`, `syllabus`, `training_body_page`, `aircraft_document`. |
| `identifier` | yes | Regulation, decision or document number; `tbd` allowed with a lookup note. |
| `revision` / `amendments` | yes | Revision label and every amendment the edition says it incorporates; differing landing-page and file dates are both kept. |
| `published`, `applicable_from` | `published` yes; `applicable_from` if stated | ISO dates; unknown is `tbd`, never estimated. |
| `url` | yes if public | Primary link; mirrors are marked as such. |
| `accessed` | yes | Europe/Berlin timestamp and accessing agent/research note. |
| `rights` | yes | What may be cited, quoted or redistributed (R-DATA-1). Public access is not permission; syllabus text is referenced by section, not copied. |
| `read_status` | yes | `read`, `partial` (list sections read) or `not_read`. |
| `research_note` | yes | Relative link to the note that recorded it. |

An easy-access compilation is a working reference; acceptance needs the official
text or a recorded decision that the compilation suffices (open questions).

## Profile schema

`R` required, `O` optional, `C` conditional. All content fields are sourced values.

| Group | Field | Req. | Content |
| --- | --- | --- | --- |
| Identity | `profile_id` | R | Stable slug, not an abbreviation alone, e.g. `easa-ppl-a`. |
| | `profile_version` | R | `MAJOR.MINOR.PATCH` (see versioning). |
| | `schema_version` | R | Version of this contract. |
| | `content_hash` | C | Required once a version is published for review; see hash scope. |
| Jurisdiction | `jurisdiction` | R | Legal area, e.g. EU/EASA framework plus State of licence issue where relevant. |
| | `framework` | R | Rule set and annex/part, with regulation identifier. |
| | `competent_authority` | R | Body that issues the licence in the selected State; `tbd` until sourced. |
| Qualification | `qualification_kind` | R | `licence`, `rating`, `privilege_extension`, `national_licence`. |
| | `full_name` | R | Full official name in source language, plus gloss. |
| | `abbreviation` | O | Display only; never a lookup key. |
| | `licensing_category` | R | Aircraft category for **pilot licensing** as the framework names it (aeroplane, sailplane, an ultralight device class...). Distinct from a TCDS airworthiness category such as Normal or Utility; see aircraft applicability. |
| | `class_type_ratings` | C | Class/type ratings or category entries the track covers. |
| | `launch_or_variant_scope` | C | Launch methods, TMG or device-category entries; required where the framework distinguishes them. |
| Requirements | `prerequisites` | R | Regulatory prerequisites as **cited references only** (not evaluated by Gefly) and in-simulator lesson prerequisites (other objective IDs). |
| | `privileges` | R | What the qualification permits, cited. |
| | `limitations` | R | Conditions/limits on those privileges, cited; `none stated` must also be cited. |
| Syllabus | `objectives[]` | R | See below. |
| Aircraft | `aircraft_applicability[]` | R | See below. |
| Assessment | `assessment_refs[]` | R | Links from objectives to source skill-test/assessment sections and to SPEC/EVAL criteria IDs. Numeric tolerances live in EVAL or the exercise package and must cite a source or a reviewed instructional decision. |
| Claims | `training_credit` | R | Literal `none`; see claims rule. |
| | `fidelity_statement` | R | Pointer to the aircraft/exercise validation status; the profile asserts no fidelity. |
| Records | `source_register[]` | R | As above. |
| | `changelog[]` | R | Version, date, author, change, affected objectives. |
| | `supersedes` | O | Prior `profile_id@version`. |

### Objectives and exercise mapping

Each `objectives[]` entry: `objective_id` (Gefly-stable, e.g. `easa-ppl-a.obj.circuit`),
`source_ref` (source ID and the syllabus/skill-test item identifier as published),
`title` (sourced value), `coverage` (`practice_supported`, `partial`, `knowledge_only`,
`not_supported`; with limitation text), `requires_equipment` (controls/instruments the
exercise needs) and `aircraft_refs` (entries of `aircraft_applicability`).
The profile does **not** list exercises. An experience package (ARCH, R-AUTHOR-1,
TODO 1.10) is authoritative: it pins `profile_id@profile_version+content_hash`
and the `objective_ids` it serves. A profile → packages index is derived at
validation time, outside the profile and its hash; adding or retiring a package
never changes the profile version. Visible `not_supported` beats silent omission;
the index reports `practice_supported` objectives without an accepted package.

### Aircraft applicability

Each `aircraft_applicability[]` entry references an aircraft manifest (R-AIR-1):
`{manifest_id, manifest_version, manifest_hash?, configuration_summary}`, plus
`category_match` and `objective_ids` it supports. `category_match` is a sourced
statement, citing the licensing framework and the aircraft's type documents,
that the configuration falls in `licensing_category` and `class_type_ratings`.
The manifest's airworthiness category (e.g. TCDS Normal/Utility) stays in the
manifest and is never compared directly with `licensing_category`; the mapping
between them is exactly this cited statement. The profile does not duplicate
manifest data (serials, engine, avionics). A manifest's validation status is read
from the manifest.

### Hash scope and separate records

`content_hash` covers the canonical serialization (format chosen with the stack)
of the schema table's content fields, explicitly including the jurisdiction and
qualification groups, `source_register`, `objectives`, `aircraft_applicability`,
`assessment` references and `changelog`, and excluding only `content_hash` itself,
the derived package index, lifecycle and review records. A published version and its
hash are immutable.

Lifecycle (`placeholder`, `draft`, `in_review`, `accepted`, `superseded`,
`withdrawn`) and instructor review are **separate, append-only records** keyed to
`profile_id@profile_version+content_hash`; they never alter the version.

### Instructor review

A review record holds the keyed profile reference, `status` (`requested`,
`in_review`, `accepted_with_findings`, `accepted`, `rejected`), `scope`
(objectives/sections reviewed), `date`, `reviewer_role` (e.g. flight instructor
for the licensing category), `reviewer_jurisdiction`, an opaque
`attestation_ref` and `findings`. It contains **no personal data** (names,
licence numbers, contact details) until [SEC](../SEC.md) decides where and how
identity evidence is held; the attestation reference resolves outside the
versioned record. Generated text, a quality/validate review or a peer review
does not count as instructor review.

### Claims rule

`training_credit` admits only `none`. UI and debriefs show "Supplementary
practice; no training credit, no approved device" or equivalent wherever the
profile appears (R-TRAIN-3). Any future credit field needs an independent approval
record and a recorded design decision.

## Validation rules

A profile is **invalid** (cannot be referenced by an accepted package) if any of
(lifecycle/review conditions read the separate records):

1. A required field is missing, or a content field lacks `status`.
2. `full_name`, `jurisdiction`, `framework` or `licensing_category` is `tbd` while
   `lifecycle` is `in_review` or later; `competent_authority` is `tbd` at `accepted`.
   At `accepted`, `privileges`, `limitations`, `prerequisites`,
   `class_type_ratings` and `launch_or_variant_scope` (where present), and every
   jurisdiction and qualification field (not Gefly metadata such as `profile_id`,
   `profile_version` or `schema_version`), are `sourced` or `derived`
   (R-TRAIN-6); no `unverified` or `tbd` remains.
3. A `sourced` value has no source with a section, or cites a source whose
   `read_status` is `not_read` (use `unverified` instead).
4. A source lacks revision, access timestamp or rights; or a `derived` value has
   no derivation; or any value cites only AI-generated text (R-DATA-2).
5. A `decision_pending` value remains at `accepted`, or lacks a GAPS ID.
6. `abbreviation` is used as `profile_id` or as an objective key, or two profiles
   share a `profile_id` with different `jurisdiction`/`full_name`.
7. An objective has no `source_ref`, or an `aircraft_refs` entry does not exist
   in `aircraft_applicability`.
8. An aircraft reference does not resolve, or `category_match` is missing or
   unsourced.
9. An objective requires equipment absent from every referenced configuration.
10. `training_credit` is anything other than `none`, or the profile/changelog text
    claims approval, eligibility, loggable time or validated fidelity.
11. An `accepted` lifecycle record without a review record of `accepted` or
    `accepted_with_findings`, keyed to the same `content_hash`, covering every
    objective with practice coverage.
12. An imported profile contains executable content or markup rendered as HTML
    (ARCH untrusted-input rule). Text is data.

A **package's profile reference** (checked with the package, TODO 1.10) is
invalid if its pinned version/hash does not resolve, a served `objective_id` is
absent there, or its aircraft manifest (id and version) is not in the
`aircraft_refs` of every objective it serves.

Warnings: stale sources, unassessed newer amendments, `partial` reads and
easy-access-only sourcing before an acceptance decision.

## Versioning and references

- Published versions are immutable; changes create a new `profile_version`.
- **MAJOR**: change of qualification, jurisdiction, category, privilege/limitation
  meaning or removal of an objective. **MINOR**: added objective or aircraft
  reference, or a new source revision with unchanged meaning. **PATCH**: wording,
  gloss or metadata correction. Package changes and review/lifecycle records
  never create a profile version.
- A new source revision or amendment marks affected objectives `unverified`
  in a new version until re-read; reviews of the old hash do not carry over.
- References are pinned: `profile_id@profile_version+content_hash`. Only
  packages pin profiles; the reverse index is derived.
- Replay keeps the profile reference used at flight time. Dependency direction:
  package → profile → manifest/sources; manifests never reference profiles.

## Worked example: EASA PPL(A), classic-panel C172S

Status values reflect only sources already recorded in this repository.

Source register (abridged):

| `source_id` | Entry |
| --- | --- |
| `easa-aircrew-ear` | EASA Easy Access Rules for Aircrew; `easy_access_compilation`; October 2026 revision, published 2026-10-16; incorporates Regulation (EU) 2026/781 and ED Decision 2026/006/R per the publication; accessed 2026-10-31 14:53 ([foundation S1](../research/2026-10-31-foundation-sources.md)); `read_status: not_read` for FCL.210.A, FCL.235 and Appendices; rights: cite, do not assume reuse of illustrations. Underlying regulation identifier `tbd` (consult the official text). |
| `c172s-tcds-easa` | EASA TCDS IM.A.051 Issue 11, 2025-11-17; `read` Section 2; proprietary, cite facts only ([172S survey](../research/2026-11-01-c172s-fr172-sources.md) S5). |
| `c172s-poh` | POH/AFM 172SPHUS Rev 5, 2004-07-19; `partial` (applicability pages); Cessna copyright (survey S17). |

Profile values:

| Field | Value | Status / source |
| --- | --- | --- |
| `profile_id` | `easa-ppl-a` | Gefly key |
| lifecycle record | `draft` (separate record) | — |
| `jurisdiction` | EU, EASA Aircrew framework; State of issue | framework `unverified` (`easa-aircrew-ear`); State `tbd` |
| `framework` | Part-FCL within the Aircrew rules | `unverified`, `easa-aircrew-ear`; regulation number `tbd` |
| `competent_authority` | — | `tbd`: authority of the selected State; no source recorded yet |
| `full_name` | Private pilot licence, aeroplanes, "PPL(A)" | `unverified`; verify full name and section in `easa-aircrew-ear` |
| `licensing_category` | Aeroplane | `unverified`, `easa-aircrew-ear` |
| `class_type_ratings` | Class rating applicable to the C172S | `tbd`; verify rating name in `easa-aircrew-ear` and category in `c172s-tcds-easa` |
| `prerequisites` | Regulatory: references only | `tbd`, `easa-aircrew-ear`; simulator: none for the first exercise |
| `privileges`, `limitations` | — | `tbd`, `easa-aircrew-ear` |
| `training_credit` | `none` | rule |
| review record | none yet; partner pending | TODO 1.5, GAPS Q7 |

Objectives: one entry, `easa-ppl-a.obj.circuit`, title "take-off, circuit and
landing" (user decision, [answers](../input/2026-11-01-aircraft-license-exercise-answers.md)),
`source_ref` `tbd` (candidate FCL.210.A / skill-test appendix, `unverified` in
`easa-aircrew-ear`), `coverage: practice_supported` pending, `aircraft_refs`:
the 172S entry below. The EDFE circuit package (TODO 1.5/1.10) will pin this
profile and serve the objective; the profile does not name it.

Aircraft: one reference, manifest `c172s-classic-9491-9809@tbd` (TODO 1.3):
serials 172S9491–172S9809, before the NAV III option at 172S9810 (user decision
2026-11-01 10:27, [record](../input/2026-11-01-first-172s-configuration.md); survey
S17/S18). `category_match` `tbd`: cite `easa-aircrew-ear` for the licensing
category/class and `c172s-tcds-easa` for the aircraft; the TCDS airworthiness
category itself stays in the manifest.
FR172 is a later second reference (GAPS Q3).

Not acceptable under rules 2, 3 and 11 until Part-FCL sections are read, the
State/authority is chosen and an instructor review record exists.

## Placeholder shapes (no decisions; GAPS Q14)

Fields each track must settle; values are `decision_pending` (Q14) unless noted.

**Sailplane reference candidate** — `profile_id` to be chosen with its full name
(not `spl`). `framework`: Part-SFCL, `unverified`, licence-track note S1 (easy-access
compilation; Regulation 2018/1976 and amendment 2020/358 per the EASA index;
landing page September 2020, PDF generated November 2022 — both kept).
`full_name`: Sailplane Pilot Licence, `unverified`, S1 (SFCL.001 among sections inspected).
`jurisdiction`/`competent_authority`: Q14. `launch_or_variant_scope`: launch
methods (S1 SFCL.155, e.g. winch, aerotow, self-launch) and TMG privileges (S1
SFCL.150) as separate entries, each Q14; they are not interchangeable.
`aircraft_applicability`: one sailplane manifest, Q14. `objectives`: Q14; note
candidates (energy management, soaring, approach/landing) are proposals only.

**National ultralight reference candidate** — `qualification_kind:
national_licence`. Reference candidate Germany: `full_name` "Luftfahrerschein für
Luftsportgeräteführer", `unverified`, note S2 (LuftPersV §44, last amended
2021-12-07) and S3. `licensing_category`: the entered device category, e.g.
aerodynamically controlled or weight-shift (S2 §42), Q14. `competent_authority`
or delegated body: `tbd`, Q14. Recognition routes for EASA PPL/LAPL holders (S4)
are recorded as `limitations`/`prerequisites` references only, never as credit.
Acronym note: S5 uses "Sportpilotenlizenz (SPL)"; rule 6 prevents collision with
the EASA sailplane licence.

## Proposed SPEC edits (for orchestrator)

1. R-TRAIN-6: each track identifies its qualification through one accepted,
   versioned, source-backed qualification profile. Profile acceptance is not
   track acceptance: E12 fixtures, category-specific controls/physics and
   scenario checks are still required.
2. R-TRAIN-1: the "applicable EASA source revision" is recorded in the
   `easa-ppl-a` profile source register.
3. R-TRAIN-3: every qualification-linked lesson and debrief visibly states
   that it gives no training credit and is not an approved device.
4. R-AUTHOR-1 / TODO 1.10: a package pins the qualification version and the
   objectives it serves; validation rejects packages whose aircraft is not
   applicable to those objectives.
5. R-DATA-1: regulatory/syllabus sources need revision, access and rights metadata.
6. EVAL E12: cite the validation rules as the structural pre-check.

## Open questions (for GAPS)

- Is the easy-access compilation enough for acceptance, or must the official
  legal text (EUR-Lex; access blocked per licence-track note) be read?
- Which State and competent authority does EASA PPL(A) assume? EDFE implies
  Germany but does not decide it.
- Should regulatory prerequisites (age, medical, hours) appear even as references?
- Where is the attestation behind `attestation_ref` held, and who may resolve it (SEC)?
- Is LAPL(A) part of this profile or separate? Who owns source-revision rechecks,
  at what interval?
- Q14 stays open: country/framework, category, launch/TMG scope, first aircraft,
  order relative to CPL.
