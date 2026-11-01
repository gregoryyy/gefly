# Scenario, event and review contracts v1.1

Status: **product proposal for TODO 1.9, 2026-11-01; not agreed.** A minor-version
extension (`1.1.0`) of [CONTRACTS](CONTRACTS.md) v1, which stays authoritative for
units, frames, step, input, state, digests and replay; nothing here changes a v1
meaning, unit, sign or digest encoding. [SPEC](../SPEC.md) owns requirement text
(R-SIM-4, R-REVIEW-1, R-BRIEF-1, R-COMM-1, R-AIR-3, R-TRAIN-2, R-TRAIN-4, R-TRAIN-5,
R-NAV-2, R-NAV-3, R-INPUT-3, R-FID-2). It ties together four unmerged drafts, cited
by path and branch because they are not on this branch:

| Short name | File @ branch | Owns |
| --- | --- | --- |
| BRIEFING | `docs/design/BRIEFING.md` @ `design/briefing-radio-1-8` | Briefing snapshot, radio, checklists |
| EXERCISE-01 | `docs/design/EXERCISE-01.md` @ `design/exercise-criteria-1-5` | Phases, measures, criteria |
| EXPERIENCES | `docs/design/EXPERIENCES.md` @ `design/experience-package` | Package, source catalog, validators |
| PHONE-CONTROL | `docs/design/PHONE-CONTROL.md` @ `design/iphone-control-1-13` | iPhone profile; GAPS Q19 there |

Marking as in CONTRACTS: **TBD-src** (needs a cited source), **Proposal** (product
choice not yet decided), **Later**. This document fixes **no aviation value**: every
pressure, elevation, frequency, wind, tolerance or phrase comes from the sources
named by the owning draft. Field names and rules below are all Proposal unless
marked as taken from CONTRACTS v1.

## 1. Scenario record

The scenario record is the **resolved, frozen input** to one run: what the
simulator, instruments, briefing and evaluator read instead of any live source. It
is built before the run from an accepted (or explicitly `experimental`/draft-preview)
experience package, and its hash enters the replay header (CONTRACTS §5,
`scenario` section). Canonical form: RFC 8785 (JCS), SHA-256, as in EXPERIENCES;
the `sha256` field is excluded from its own hash.

```text
scenario_record {
  v: "1.1.0", record_id, sha256
  package    { id, version, content_hash, review_state }      # EXPERIENCES; state is
                                                              # copied from the review record
  briefing   { snapshot_id, schema_version, sha256, mode,     # BRIEFING §1.3
               scenario_time_utc, local_zone }
  catalog    { name, edition, sha256, extent_ref,             # EXPERIENCES catalog
               horizontal_datum, vertical_datum }             # as declared by the edition
  nav        { entries[]: nav_entry, sha256 }                 # resolved snapshot, below
  aircraft   { manifest, manifest_version, manifest_hash, configuration,
               model_id, package_sha256, state_ref, loading_ref }  # R-AIR-1; CONTRACTS §5
  ic         { position_ref, resolved: CONTRACTS §5 ic }      # catalog ref -> SI values
  environment {
    pressure    { qnh_pa, qnh_item_id, qfe_pa?, qfe_datum?, std_pa: 101325,
                  atmosphere_definition, expected_setting_ref }
    temperature { t_datum_k, item_id | generator_ref }
    wind        { model, wind_ned_mps: [n, e, d], item_id | generator_ref }
    turbulence  { model, intensity, seed_ref }
    magnetic    { model: "WMM2025", coeff_sha256, decimal_year }     # CONTRACTS §1
    geoid       { models[], grid_sha256[] }                          # CONTRACTS §1
    terrain     { tiles[]: {id, sha256}, coverage }                  # CONTRACTS §1
  }
  differences[] { item_id, field, reported, applied, reason }  # BRIEFING §1.3, copied
  exercise   { criteria_id, criteria_version, evaluator_version }  # EXERCISE-01
  limitations[], assists[], fidelity                         # R-FID-2
}
qfe_datum { kind: aerodrome | threshold, ref, elevation_m, vertical_ref }
nav_entry { id, kind, edition, value_si, original {value, unit}, datum,
            value_class, status, source_id, rights_class }
```

Rules:

- **S1. One authority per value.** Applied environment lives only in
  `environment`; the briefing displays reports and the explained `differences`
  (BRIEFING R7). The replay header's `env` section is byte-identical to
  `environment` (validator rejects a mismatch), so CONTRACTS §5 is not duplicated.
- **S2. Hash order without cycles.** `environment` → briefing snapshot (its
  `applied_environment_ref`) → package `content_hash` → scenario record →
  replay header. No later element is referenced by an earlier one.
- **S3. Pressure.** `qnh_pa` cites one briefing item or a generator (BRIEFING
  §1.5). `qfe_pa` exists only with a declared `qfe_datum`; its `kind` and
  `elevation_m` are **TBD-src** (EDFE AIP), and `vertical_ref` records the datum of
  that elevation (also TBD-src, CONTRACTS §1). `atmosphere_definition ∈
  {datum_matched, isa_sea_level_qnh}`, the second labelled a simplification
  (BRIEFING §1.5). `expected_setting_ref ∈ {QNH, QFE, STD}` is what the exercise
  expects (EXERCISE-01: QNH), not an instrument state.
- **S4. Navigation snapshot.** `nav` holds every catalog entry the run uses
  (aerodrome, runway threshold and true bearing, holding point, circuit, frequency,
  airspace), resolved from the pinned edition with original value/unit, datum and
  rights. The runtime never queries the catalog. `reference-only` and
  `placeholder` entries block a `reviewed` run (EXPERIENCES V6/V9). A runway true
  bearing derived from a published magnetic one (EXERCISE-01) is converted **once at
  record build** with the recorded `magnetic` model and date, `value_class:
  derived`.
- **S5. Wind** is the CONTRACTS NED air-mass vector (blows toward); "from" exists
  only in briefing display. Height profile and gusts are **Later**.

## 2. Events on the step clock

Event envelope (additive to CONTRACTS §3; inputs keep their v1 shape):
`{v: "1.1.0", seq, step, type, origin, payload}` with `origin ∈ {learner, sim,
scenario, evaluator, device, ui}`.

- **E1. Clock.** `step` is the CONTRACTS integer step. An event raised while paused
  or before run start takes the next step to run (step 0 before start), like paused
  inputs. `wall_ms` may be kept as latency metadata only.
- **E2. Ordering.** Inputs and logged events share the run's `seq` counter
  (strictly increasing, gaps allowed), so the session log is totally ordered.
  Derived events carry `seq: null` and are ordered by `(step, type order, key)`.
- **E3. Two classes.** **Logged** events are learner/device facts that cannot be
  recomputed; they are stored in the session log next to the input log. **Derived**
  events are recomputed on replay from state, the scenario record and logged events;
  they are never authority when stored (cache only, §3).
- **E4. No back-channel.** No event writes `sim`, `env` or `ind`; only input events
  (CONTRACTS §3) change aircraft state. Payload text is plain, escaped data (SEC).

| Type | Class | Payload (Proposal) | Digest group | Replay rule |
| --- | --- | --- | --- | --- |
| `input` (CONTRACTS §3) incl. `controls.altimeter_setting_pa` | logged (input log) | as v1 | resulting state in `sim`/`ind` | Authoritative replay content |
| `altimeter.changed` | derived | `setting_pa_old/new`, `matches ∈ {QNH, QFE, STD, none}` against `environment.pressure` | `teach` | From input log; `matches` tolerance from exercise criteria (TBD) |
| `checklist.confirmed` / `.unconfirmed` | logged | `checklist_id`, `item_id` | none | Re-applied at its step/seq |
| `checklist.sensed` | derived | `checklist_id`, `item_id`, `agrees: bool`, `condition_id` | `teach` | Re-evaluated per step from `sim`/`ind` |
| `checklist.blocked` / `.reset` / `.retry` | derived / logged / logged | step id, unmet `condition_id` | `teach` / none | BRIEFING §3 rules |
| `radio.tuned` | input (if the radio fit is modelled) | frequency via `controls` | `ind` | Radio fit is GAPS Q3; until then a scenario fact |
| `radio.intent_proposed` | logged | `station_ref`, `frequency_ref`, `intent`, `text?`, `parser {id, version}` | none | Re-applied; text is presentation |
| `radio.intent_resolved` | derived | `accepted: bool`, `reason`, `mismatch[]` (frequency, position, call sign) | `teach` | State machine re-run from logged intents + state + `nav` |
| `radio.info_issued` | derived | `station_ref`, info fields drawn from `environment`/`nav` only; **no clearance or instruction field exists** | `teach` | Template rendering is deterministic; AI text is Later |
| `assess.phase` | derived | `phase_id` (P0–P11), `enter`/`exit` | `teach` | Evaluator re-run per step (EXERCISE-01) |
| `assess.measure` | derived | `criterion_id`, value SI, `result ∈ {within, outside, gate_fail, not_evaluated}`, `reason?` | `teach` | Same; never a pass when `not_evaluated` |
| `teach.annotation` | derived | `kind` (reminder, finding, cue), `label` (`generic`, `generated`, …), refs | `teach` | Re-derived; never read by `sim`/`env`/`ind` |
| `briefing.acknowledged` | logged | `snapshot_sha256`, `items_viewed[]` | none | Re-applied |
| `run.pause` / `.resume` / `.reset` | logged | `reason ∈ {user, device_loss, error}` | none | Pause leaves `step` frozen (CONTRACTS §2) |
| `device.pairing` | logged (session metadata) | `state ∈ {started, confirmed, failed, ended}`, `profile_id` | none | Not needed to replay; **no keys, codes, nonces or fingerprints** |
| `input.source_lost` / `.source_changed` | logged | `source`, `reason` (PHONE-CONTROL §6 enum), `fallback` | none | Informative; the controls that follow are ordinary inputs |

Q19 (PHONE-CONTROL) phone-loss behaviour, "hold last values 0.5 s, then centre,
with a visible warning", is produced **at the input boundary as ordinary input
events** (hold: no new event; centre: an input event at the step 0.5 s later,
`source: "fallback"`), so replay needs no phone data and the hold is never silent.

Group meaning: `sim`/`ind` = CONTRACTS digest groups; `teach` = no digest,
re-derived (CONTRACTS §4 `teach`); none = logged session fact outside digests,
covered by the session-log hash (§3).

## 3. Review and debrief record

**Frozen** (written once at run end, validated on import, SEC):

| Part | Contents | Authority |
| --- | --- | --- |
| Replay record | CONTRACTS §5 unchanged; `scenario` section = `{record_id, sha256}` | Input log is the replay content |
| Scenario record | §1, embedded or by hash | Only source of environment/nav/briefing |
| Session log | Logged events (§2) in `seq` order, `sha256` over its JCS form | Learner/device facts |
| Evaluator pin | `criteria_id/version`, `evaluator_version`, poh-values `values_id/version`, CAL mapping version (EXERCISE-01) | Defines how derived events are recomputed |
| Derived cache? | Optional derived events + `evaluator_version` | Cache only; mismatch reported, never trusted |

Rules:

- **D1. Seek** re-simulates from step 0 with the input log to the target step
  (CONTRACTS O-5, R-9), re-applying logged events at their step/seq and recomputing
  derived events as it goes. The view shows events with `step ≤ target`. No
  snapshot/restore in v1.1.
- **D2. Reopen** never fetches weather, NOTAMs, catalog or package content; a
  missing or mismatching scenario-record, snapshot or session-log hash refuses the
  record (BRIEFING §1.6).
- **D3. Re-derivation check.** When a derived cache exists and the evaluator pin
  matches, recomputed events must equal it; inequality is a defect report. A changed
  evaluator or criteria version re-evaluates **explicitly** and labels both results
  (EXERCISE-01).
- **D4. Not comparable.** A build mismatch (CONTRACTS §5) opens trace-only mode;
  derived events computed from the recorded trace are labelled "from recorded
  trace, not re-simulated"; `ind`-dependent events need the same browser engine.
- **D5. Display values.** Interpolated frames never feed events (CONTRACTS §2);
  every derived event names its source fields at its exact `step`.
- **D6. Privacy.** No raw device samples (CONTRACTS §3); typed radio text is stored
  only in the session log of a local recording, escaped on render.

## 4. Per-slice freeze table (milestone 2, TODO 2.2/2.3)

The orchestrator owns `packages/contracts/` and integrates this table into it
(ARCH). Rows marked **freeze** must be agreed before code1 and code2 start; **open**
rows are filled by their owner behind the frozen shape.

| Field / artefact | Owner | Path | Status |
| --- | --- | --- | --- |
| Scenario record schema and JCS hashing (§1) | orchestrator | `packages/contracts/` | freeze |
| Event envelope, type list, `seq` sharing, logged/derived class (§2) | orchestrator | `packages/contracts/` | freeze |
| Scenario-record loader → worker `init` (`ic`, `env`, seeds) | code1 | `packages/simulation/` | open |
| `sim` fields incl. `wow_nose`, `wow_main_l`, `wow_main_r` (C2) and schema order for `digest_layout` 1 | code1 | `packages/simulation/` | freeze names/order |
| `env` WASM fields; JS env fields `magvar_east_rad`, `zeta_m`, `h_ell_m` in `ind` group (C3) | code1 | `packages/simulation/` env module | freeze names |
| Input log, session log container, run pause/resume/reset events, digests, seek re-simulation (D1) | code1 | `packages/simulation/` | open |
| Replay/review record writer and import validation (§3) | code1 | `packages/simulation/` | open |
| `ind.altimeter {setting_pa, unit_display, indicated_m}`, `ind.h_qnh_ref_m`, `ind.asi_ias_mps`, `ind.cal_ias_mps` + validity (C1, C4) | code2 | `packages/avionics/` | freeze names |
| Checklist evaluation, `checklist.*` derived events | code2 | `packages/training/` | open |
| Radio state machine and `radio.*` derived events | code2 | `packages/training/` | open (scope, Q-S3) |
| Exercise evaluator, `assess.*`, `teach.*` | code2 | `packages/training/` | open |
| Briefing view, debrief/seek UI, input module incl. fallback events | code2 | `app/` | open |
| iPhone profile (`source: "iphone"`) | code2 | `app/` | **Later** (TODO 1.13 prototype) |

Interfaces between slices: code2 reads `sim`/`env` only through the CONTRACTS state
stream and full snapshots; code1 stores logged events as opaque validated envelopes
and never interprets `checklist.*`, `radio.*` or `assess.*`. Test fixtures crossing
the boundary (R-1, R-9 with events) are authored by the non-implementing side.

## 5. Name reconciliation and conflicts

| # | Conflict found | Drafts | Proposed resolution |
| --- | --- | --- | --- |
| C1 | `h_qnh_ref_m` name and group undecided; computed in JS | EXERCISE-01; CONTRACTS §4 | `ind.h_qnh_ref_m` (JS → `ind` group per digest rule), labelled "reference altitude for a correctly set altimeter", not an indication; constants and QNH source recorded |
| C2 | Weight-on-wheels "per gear", no field names | CONTRACTS §4; EXERCISE-01 | `sim.wow_nose`, `sim.wow_main_l`, `sim.wow_main_r` (booleans, uint32 in digest), in this order |
| C3 | `magvar_east_rad` listed both as an `env` WASM field and as JS-computed | CONTRACTS §4 | WMM2025 runs in JS: listed once, `ind` digest group; runway bearings converted at record build (S4), not per step |
| C4 | `ind.asi_ias_mps` used for the pitot-static model (CONTRACTS) and for the CAL assessment derivation (EXERCISE-01) | both | Keep `asi_ias_mps` for the instrument (TBD-src); add `ind.cal_ias_mps` + `cal_ias_valid` (uint32 flag, value 0.0 when invalid; no NaN in digests) |
| C5 | Altimeter `setting_ref` stored as state, but the knob "only sets a pressure" | CONTRACTS §1; BRIEFING `altimeter.set` | Instrument state holds `setting_pa` and display unit; the reference is `expected_setting_ref` (scenario) plus derived `matches` (§2); no invented mode switch |
| C6 | Altimeter event `altimeter.set` (logged) vs input `altimeter_setting_pa` | BRIEFING §4; CONTRACTS §3 | Input is the only logged fact; `altimeter.changed` is derived |
| C7 | Checklist class `confirm` vs "acknowledged"; `pre-satisfied` both a class and "still sensed" | BRIEFING §3; EXPERIENCES hooks | `support ∈ {sensed, confirm, unsupported, na_config}` + `pre_satisfied: bool`; learner action is "confirmed" |
| C8 | Radio intent names: R1–R7 vs `report-holding-point`…; actions `radio.transmit-intent` | BRIEFING §2.3; EXPERIENCES | Package vocabulary (kebab) is the enum; each maps to one BRIEFING R-id; add `report-final` (in EXPERIENCES example, missing from its list) |
| C9 | Radio in scope (BRIEFING) vs "not assessed, R-COMM-1 later" (EXERCISE-01) | both | Events defined in v1.1; milestone 2 scope decided by orchestrator (Q-S3) |
| C10 | Snapshot `mode` `historical/generated/mixed/live` vs `historical/generated`; `applied_conditions.relation` vs `differences[]` | BRIEFING; EXPERIENCES | Superset enum (`live` only from the later adapter); `relation = matches` iff `differences` is empty, derived |
| C11 | Navigation edition: one field (CONTRACTS §5) vs `catalog {name, edition}` + `extent` | CONTRACTS; EXPERIENCES | `catalog` block in §1, plus resolved `nav` snapshot |
| C12 | Phone loss: auto-pause default (PHONE-CONTROL §6) vs Q19 hold 0.5 s then centre; CONTRACTS "no silent hold" | PHONE-CONTROL; Q19 | Q19 governs; hold is visible and logged via `input.source_lost`; auto-pause becomes an option, `run.pause {reason: device_loss}` |
| C13 | `teach.phase/events/findings` vs requested assessment markers | EXERCISE-01 | `assess.*` and `teach.annotation` events (§2), all re-derived |
| C14 | Runway frame `x_rwy_m`/`y_rwy_m`, `gs_mps`, `track_true_rad`, `vs_mps` derived but owner unspecified | EXERCISE-01; CONTRACTS §1 | Computed by the evaluator (code2) from `sim` per step; not in any digest; evaluator version pins them |
| C15 | `aircraft` identity: `model_id` (CONTRACTS) vs `manifest/manifest_hash` (EXPERIENCES) | both | Keep both in §1: manifest identifies sources/configuration, model package the dynamics |

## 6. Versioning

All additions are optional fields or new message kinds: **minor**, `1.1.0`
(CONTRACTS §7). Naming the `wow_*` fields and the `ind` fields is filling v1
placeholders; if any `digest_layout` 1 code exists before agreement, it becomes
`digest_layout` 2. A future digest over logged events would be a new layout.

## 7. Open questions (for GAPS via the orchestrator)

- **Q-S1** Should logged session events get their own rolling digest/checkpoints
  (a new group), or is the session-log SHA-256 enough?
- **Q-S2** Altimeter `matches` tolerance and the subscale unit: exercise criteria
  and installed instrument (GAPS Q3, TBD-src).
- **Q-S3** Is radio (state machine, R1/R3/R5/R6) in milestone 2, or a briefing item
  only as EXERCISE-01 says?
- **Q-S4** QFE datum kind (aerodrome vs threshold) and the vertical reference of AIP
  elevations (TBD-src, EDFE AIP).
- **Q-S5** May a draft or `experimental` package produce a scenario record for
  milestone 2 runs, given that all real values are still `tbd`?
- **Q-S6** Store typed radio text in the session log, or only the parsed intent?
- **Q-S7** Accept C1–C15 as proposed, in particular `cal_ias_mps` beside
  `asi_ias_mps` and the Q19 fallback as input events?
