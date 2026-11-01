# Pilot-qualification profiles

Status: product design proposal for TODO 1.12; not yet integrated into SPEC.
Author: Claude Code product role, 2026-11-01. Scope: the declarative contract
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
mapping from source objectives to Gefly exercises and aircraft configurations.
Tracks, experience packages and debriefs reference it; they do not restate it.

Out of scope: legal eligibility advice, medical or hour requirements as evaluated
rules, examination question banks, approval of the simulator as a training device
and any training credit.

## Value and provenance model

Every content field below is a **sourced value**, not a bare string:

| Key | Required | Meaning |
| --- | --- | --- |
| `value` | yes, unless `status` is `tbd` | The stated content, in the source's language plus an optional English gloss. |
| `status` | yes | `sourced` (read in the cited source), `derived` (stated derivation from sourced values), `unverified` (named but not yet read in the cited section), `tbd` (unknown; source to consult named) or `decision_pending` (a user choice; GAPS ID required). Follows R-DATA-2. |
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

An easy-access compilation may be used as a working reference, but acceptance of
a track requires either the official legal text or a recorded decision that the
compilation suffices (see open questions).

## Profile schema

`R` required, `O` optional, `C` conditional. All content fields are sourced values.

| Group | Field | Req. | Content |
| --- | --- | --- | --- |
| Identity | `profile_id` | R | Stable slug, not an abbreviation alone, e.g. `easa-ppl-a`. |
| | `profile_version` | R | `MAJOR.MINOR.PATCH` (see versioning). |
| | `schema_version` | R | Version of this contract. |
| | `lifecycle` | R | `placeholder`, `draft`, `in_review`, `accepted`, `superseded`, `withdrawn`. |
| | `content_hash` | C | Required from `in_review`; hash over the canonical profile. |
| Jurisdiction | `jurisdiction` | R | Legal area, e.g. EU/EASA framework plus State of licence issue where relevant. |
| | `framework` | R | Rule set and annex/part, with regulation identifier. |
| | `competent_authority` | R | Body that issues the licence in the selected State; `tbd` until sourced. |
| Qualification | `qualification_kind` | R | `licence`, `rating`, `privilege_extension`, `national_licence`. |
| | `full_name` | R | Full official name in source language, plus gloss. |
| | `abbreviation` | O | Display only; never a lookup key. |
| | `aircraft_category` | R | Category as the source names it (aeroplane, sailplane, ultralight class...). |
| | `class_type_ratings` | C | Class/type ratings or category entries the track covers. |
| | `launch_or_variant_scope` | C | Launch methods, TMG or device-category entries; required where the framework distinguishes them. |
| Requirements | `prerequisites` | R | Regulatory prerequisites as **cited references only** (not evaluated by Gefly) and in-simulator lesson prerequisites (other objective IDs). |
| | `privileges` | R | What the qualification permits, cited. |
| | `limitations` | R | Conditions/limits on those privileges, cited; `none stated` must also be cited. |
| Syllabus | `objectives[]` | R | See below. |
| Aircraft | `aircraft_applicability[]` | R | See below. |
| Assessment | `assessment_refs[]` | R | Links from objectives to source skill-test/assessment sections and to SPEC/EVAL criteria IDs. Numeric tolerances live in EVAL or the exercise package and must cite a source or a reviewed instructional decision. |
| Review | `instructor_review` | R | See below. |
| Claims | `training_credit` | R | Literal `none`; see claims rule. |
| | `fidelity_statement` | R | Pointer to the aircraft/exercise validation status; the profile asserts no fidelity. |
| Records | `source_register[]` | R | As above. |
| | `changelog[]` | R | Version, date, author, change, affected objectives/packages. |
| | `supersedes` | O | Prior `profile_id@version`. |

### Objectives and exercise mapping

Each `objectives[]` entry: `objective_id` (Gefly-stable, e.g. `easa-ppl-a.obj.circuit`),
`source_ref` (source ID and the syllabus/skill-test item identifier as published),
`title` (sourced value), `coverage` (`practice_supported`, `partial`, `knowledge_only`,
`not_supported`; with limitation text), `requires_equipment` (controls/instruments the
exercise needs) and `exercises[]`. Each exercise reference is
`{package_id, package_version, package_hash?, scope_note}` and points at a declarative
experience package (ARCH, R-AUTHOR-1, TODO 1.10). An objective with `coverage` other
than `not_supported` needs at least one exercise; a learner-visible
`not_supported` is valid and preferred over silent omission.

### Aircraft applicability

Each `aircraft_applicability[]` entry references an aircraft manifest (R-AIR-1):
`{manifest_id, manifest_version, manifest_hash?, configuration_summary}`, plus
`category_match` (sourced statement that the configuration falls in
`aircraft_category`/`class_type_ratings`) and `objective_ids` it supports. The
profile does not duplicate manifest data (serials, engine, avionics); it
references them. A manifest's validation status is read from the manifest.

### Instructor review

`status`: `none`, `requested`, `in_review`, `accepted_with_findings`, `accepted`,
`rejected`. When not `none`: `scope` (objectives/sections reviewed), `profile_hash`
reviewed, `date`, `reviewer_role` and `qualification_evidence` (the reviewer's
stated instructor qualification and jurisdiction; storage of personal data follows
[SEC](../SEC.md) and is an open question), and `findings`. Generated text, a
quality/validate review or a peer review does not count as instructor review.

### Claims rule

`training_credit` admits only `none` in this schema version. UI and debriefs
display "Supplementary practice; no training credit, no approved device" or
equivalent wherever the profile name appears (R-TRAIN-3). A future schema version
may add a credit field only with an independently established approval record
and a recorded design decision; this document does not anticipate that.

## Validation rules

A profile is **invalid** (cannot be referenced by an accepted package) if any of:

1. A required field is missing, or a content field lacks `status`.
2. `full_name`, `jurisdiction`, `framework` or `aircraft_category` is `tbd` while
   `lifecycle` is `in_review` or later; `competent_authority` is `tbd` at `accepted`.
3. A `sourced` value has no source with a section, or cites a source whose
   `read_status` is `not_read` (use `unverified` instead).
4. A source lacks revision, access timestamp or rights; or a `derived` value has
   no derivation; or any value cites only AI-generated text (R-DATA-2).
5. A `decision_pending` value remains at `accepted`, or lacks a GAPS ID.
6. `abbreviation` is used as `profile_id` or as an objective key, or two profiles
   share a `profile_id` with different `jurisdiction`/`full_name`.
7. An objective has no `source_ref`, or claims coverage without an exercise
   reference; an exercise reference does not resolve to an existing package
   version, or the package does not list that `objective_id`.
8. An aircraft reference does not resolve, or `category_match` is missing or
   unsourced, or a referenced manifest's category differs from the profile's.
9. An objective requires equipment absent from every referenced configuration.
10. `training_credit` is anything other than `none`, or the profile/changelog text
    claims approval, eligibility, loggable time or validated fidelity.
11. `lifecycle: accepted` without `instructor_review.status` of `accepted` or
    `accepted_with_findings` covering every objective with practice coverage, at
    the current `content_hash`.
12. An imported profile contains executable content or markup rendered as HTML
    (ARCH untrusted-input rule). Text is data.

Warnings (not invalid): sources older than a configured recheck interval, a newer
known amendment not yet assessed, `partial` read status, and easy-access-only
sourcing before an acceptance decision.

## Versioning and references

- Published versions are immutable; changes create a new `profile_version`.
- **MAJOR**: change of qualification, jurisdiction, category, privilege/limitation
  meaning or removal of an objective. **MINOR**: added objective, exercise or
  aircraft reference, or a new source revision with unchanged meaning. **PATCH**:
  wording, gloss or metadata correction.
- A new source revision or amendment marks affected objectives `unverified`
  until re-read and renders their instructor review stale (lifecycle returns to
  `in_review`).
- References are pinned: `profile_id@profile_version` (+ hash once in review).
  Experience packages declare `qualification_profile` and the `objective_ids`
  they serve; the profile lists the packages. Validation checks both directions.
- Replay records the profile reference used at flight time, so a later profile
  version does not rewrite an earlier debrief.
- Direction of dependency: package → profile → aircraft manifest and sources.
  Manifests do not reference profiles; one manifest may serve several profiles.

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
| `lifecycle` | `draft` | — |
| `jurisdiction` | EU, EASA Aircrew framework; State of issue | framework `unverified` (`easa-aircrew-ear`); State `tbd` |
| `framework` | Part-FCL within the Aircrew rules | `unverified`, `easa-aircrew-ear`; regulation number `tbd` |
| `competent_authority` | — | `tbd`: authority of the selected State; no source recorded yet |
| `full_name` | Private pilot licence, aeroplanes, "PPL(A)" | `unverified`; verify full name and section in `easa-aircrew-ear` |
| `aircraft_category` | Aeroplane | `unverified`, `easa-aircrew-ear` |
| `class_type_ratings` | Class rating applicable to the C172S | `tbd`; verify rating name in `easa-aircrew-ear` and category in `c172s-tcds-easa` |
| `prerequisites` | Regulatory: references only | `tbd`, `easa-aircrew-ear`; simulator: none for the first exercise |
| `privileges`, `limitations` | — | `tbd`, `easa-aircrew-ear` |
| `training_credit` | `none` | rule |
| `instructor_review` | `none`; partner pending | TODO 1.5, GAPS Q7 |

Objectives: one entry, `easa-ppl-a.obj.circuit`, title "take-off, circuit and
landing" (user decision, [answers](../input/2026-11-01-aircraft-license-exercise-answers.md)),
`source_ref` `tbd` (candidate FCL.210.A / skill-test appendix, `unverified` in
`easa-aircrew-ear`), `coverage: practice_supported` pending, exercise
`edfe-circuit@tbd` (the EDFE package specified by TODO 1.5/1.10).

Aircraft: one reference, manifest `c172s-classic-9491-9809@tbd` (TODO 1.3):
serials 172S9491–172S9809, before the NAV III option at 172S9810 (user decision
2026-11-01 10:27, [record](../input/2026-11-01-first-172s-configuration.md); survey
S17/S18). `category_match` `tbd` against `c172s-tcds-easa` and `easa-aircrew-ear`.
FR172 is a later second reference (GAPS Q3).

This draft is invalid for acceptance under rules 2, 3 and 11 until the Part-FCL
sections are read, the State/authority is chosen and instructor review occurs.

## Placeholder shapes (no decisions; GAPS Q14)

These show which fields a track must settle. Every value is `decision_pending`
(Q14) unless noted; they are not selections of country, category or order.

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
2021-12-07) and S3. `aircraft_category`: the entered device category, e.g.
aerodynamically controlled or weight-shift (S2 §42), Q14. `competent_authority`
or delegated body: `tbd`, Q14. Recognition routes for EASA PPL/LAPL holders (S4)
are recorded as `limitations`/`prerequisites` references only, never as credit.
Acronym note: S5 uses "Sportpilotenlizenz (SPL)"; rule 6 prevents collision with
the EASA sailplane licence.

## Proposed SPEC edits (for orchestrator)

1. R-TRAIN-6: add that each track is defined by one accepted qualification
   profile conforming to this contract, validated by the rules above.
2. R-TRAIN-1: the "applicable EASA source revision" is recorded in the
   `easa-ppl-a` profile source register.
3. R-TRAIN-3: add the `training_credit: none` field and mandatory disclaimer.
4. R-AUTHOR-1 / TODO 1.10: packages declare `qualification_profile` and
   `objective_ids`; cross-reference validation is bidirectional.
5. R-DATA-1: state explicitly that regulatory/syllabus sources need revision,
   access and rights metadata like aircraft data.
6. EVAL E12: cite the validation rules as the structural pre-check.

## Open questions (for GAPS)

- Is the EASA easy-access compilation sufficient for acceptance, or must the
  official legal text (EUR-Lex, access currently blocked per licence-track note)
  be read?
- Which State, and therefore competent authority, does the EASA PPL(A) track
  assume? Germany is implied by EDFE but not decided.
- Should regulatory prerequisites (age, medical, hours) appear at all, even as
  references, given the no-advice scope?
- How is instructor identity/qualification evidence stored without unnecessary
  personal data (SEC)?
- Does the PPL(A) track also map LAPL(A) objectives, or is that a separate profile?
- Recheck interval for source revisions, and who owns the recheck.
- Q14 items remain open: country/framework, category, launch/TMG scope, first
  aircraft and order relative to CPL.
