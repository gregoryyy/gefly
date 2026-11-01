# Scenario, event and review contracts v1.1

Status: **product proposal for TODO 1.9, 2026-11-01, revised after quality review
and the TODO 1.6 foundation review; not agreed.** A minor-version extension (`1.1.0`) of [CONTRACTS](CONTRACTS.md) v1,
which stays authoritative for units, frames, step, input, state, digests and replay.
Every change here is **additive and backward-compatible**: v1 fields keep their
names and meaning, a v1 reader ignores the new optional fields (CONTRACTS §7), and
no digest group, encoding or `digest_layout` changes. Anything that would need
`digest_layout` 2 is listed as **deferred to a future major version** (§6).
[SPEC](../SPEC.md) owns requirement text (R-SIM-4, R-REVIEW-1, R-BRIEF-1, R-COMM-1,
R-AIR-3, R-TRAIN-2, R-TRAIN-4, R-TRAIN-5, R-NAV-2, R-NAV-3, R-INPUT-3, R-FID-2). It
ties together four merged design drafts. Their proposal status remains as
recorded in each document; the branch names below identify their origins:

| Short name | File @ originating branch | Owns |
| --- | --- | --- |
| BRIEFING | `docs/design/BRIEFING.md` @ `design/briefing-radio-1-8` | Briefing snapshot (rules R1–R7), radio (calls R1–R7), checklists |
| EXERCISE-01 | `docs/design/EXERCISE-01.md` @ `design/exercise-criteria-1-5` | Phases, measures, criteria |
| EXPERIENCES | `docs/design/EXPERIENCES.md` @ `design/experience-package` | Package, source catalog, validators |
| PHONE-CONTROL | `docs/design/PHONE-CONTROL.md` @ `design/iphone-control-1-13` | iPhone profile; GAPS Q19 there |

BRIEFING reuses R1–R7 for two lists; here "rule R*n*" means §1.3 and "call R*n*"
means §2.3. Marking as in CONTRACTS: **TBD-src**, **Proposal**, **Later**. This
document fixes **no aviation value**: every pressure, elevation, frequency, wind,
tolerance or phrase comes from the sources named by the owning draft. Field names
and rules are Proposal unless marked as taken from CONTRACTS v1.

## 1. Scenario record

The scenario record is the **resolved, frozen input** to one run, read by the
simulator, instruments, briefing and evaluator instead of any live source. It is
built before the run from an experience package (accepted, or labelled
`experimental`/draft preview, Q-S5). Hashing follows CONTRACTS §10.6 (RFC 8785 JCS,
SHA-256; the `sha256` field is excluded from its own hash); rights classes follow
CONTRACTS §10.5.

```text
scenario_record {
  v: "1.1.0", record_id, sha256
  package    { id, version, content_hash, review_state }   # EXPERIENCES; state copied
  briefing   { snapshot_id, schema_version, sha256, mode,  # BRIEFING §1.3; the hash
               scenario_time_utc, local_zone }             # covers differences[] too
  catalog    { name, edition, sha256, extent_ref, horizontal_datum, vertical_datum }
  nav        { entries[]: nav_entry, sha256 }
  aircraft   { manifest, manifest_version, manifest_hash, configuration,
               model_id, package_sha256, state_ref, loading_ref }  # R-AIR-1; v1 §5
  ic         { position_ref, resolved: CONTRACTS §5 ic }
  environment {
    pressure    { qnh_pa, qnh_item_id, qfe_pa?, qfe_datum?, std_pa: 101325,
                  atmosphere_definition, expected_setting_ref }
    temperature { t_datum_k, item_id | generator_ref }
    wind        { model, wind_ned_mps: [n, e, d], item_id | generator_ref }
    turbulence  { model, intensity, seed_ref }
    magnetic    { model: "WMM2025", coeff_sha256, decimal_year }  # CONTRACTS §1
    geoid       { models[], grid_sha256[] }                       # CONTRACTS §1
    terrain     { tiles[]: {id, sha256}, coverage }               # CONTRACTS §1
  }
  exercise   { criteria_id, criteria_version, evaluator_pin_sha256 }  # §3
  limitations[], assists[], fidelity                                  # R-FID-2
}
qfe_datum { kind: aerodrome | threshold, ref, elevation_m, vertical_ref }
nav_entry { id, kind, edition, entry_sha256?, rights_class, status, value_class,
            value?: { si, original {value, unit}, datum, source_id },
            derivation?: { from, rule, magnetic_model, decimal_year,
                          wmm_lat_rad, wmm_lon_rad, wmm_h_ell_m } }
```

Rules:

- **S1. One authority per value.** Applied environment lives in `environment`. The
  briefing displays reports and explained `differences` (BRIEFING rule R7). The v1
  replay `env` section keeps its fields and is filled from `environment`; an import
  validator rejects any disagreement.
- **S2. Hash order without cycles.** `environment` hash → briefing snapshot, whose
  hash covers `applied_environment_ref` **and** `differences[]` → package
  `content_hash` → scenario record → replay header. Nothing references a later
  element. The record does not copy `differences`; it reads them from the snapshot.
- **S3. Pressure.** `qnh_pa` cites one briefing item or a generator (BRIEFING §1.5).
  `qfe_pa` exists only with a declared `qfe_datum`, whose `kind`, `elevation_m` and
  `vertical_ref` are **TBD-src** (EDFE AIP; CONTRACTS §1).
  `atmosphere_definition ∈ {datum_matched, isa_sea_level_qnh}`, the second labelled
  a simplification (BRIEFING §1.5). `expected_setting_ref ∈ {QNH, QFE, STD}` is what
  the exercise expects (EXERCISE-01: QNH).
- **S4. Navigation snapshot.** `nav` lists every catalog entry the run uses
  (aerodrome, threshold and true bearing, holding point, circuit, frequency,
  airspace) by id and edition, plus `entry_sha256` for every class except
  `reference_only`. `value` is embedded **only** for `public_domain`,
  `open_licence`, `facts_only` and `permission` (the last only with the written
  grant on record; CONTRACTS §10.5). A `reference_only` value (e.g. DFS AIP) is
  **never stored or shipped** by Gefly: records, logs, caches and traces hold its
  id, kind and the catalog edition hash only, **never a per-value hash**
  (CONTRACTS §10.6). It may be resolved at load only from a **user-supplied local
  copy** that Gefly never distributes or records, verified by its source-document
  hash; if absent the run or review is refused, never fetched, and a run that used
  it is local-only. Such entries, `rights_unknown` and `placeholder` entries block
  a `reviewed` run (EXPERIENCES V6/V9). The runtime never queries the live catalog.
- **S5. Runway bearing.** A true bearing derived from a published magnetic one
  (EXERCISE-01) is converted **once, in the scenario-record builder** (§4), with the
  recorded WMM2025 model, decimal year and the evaluation position
  (`wmm_lat_rad`, `wmm_lon_rad`, `wmm_h_ell_m`, which entry it comes from); `value_class: derived` and `derivation`
  record it. Nothing converts it per step.
- **S6. Wind** is the CONTRACTS NED air-mass vector (blows toward); "from" exists
  only in briefing display. Height profile and gusts are **Later**.

## 2. Events on the step clock

Event envelope (additive; v1 input events keep their shape):
`{v: "1.1.0", seq, step, type, origin, payload}`, `origin ∈ {learner, sim,
scenario, evaluator, device, ui}`. Each payload schema **forbids additional
properties**, so no free field (such as clearance text) can be added.

- **E1. Clock.** `step` is the CONTRACTS integer step. An event raised while paused
  or before run start takes the next step to run (step 0 before start), like paused
  inputs. `wall_ms` is latency metadata only.
- **E2. Ordering.** Inputs and logged events share the run's single `seq`
  counter, **allocated by the worker on acceptance** (CONTRACTS §10.3; the main
  thread only proposes); strictly increasing, gaps tolerated by readers. Derived events
  have `seq: null` and are ordered by `step`, then this type order: `run`,
  `input`, `briefing`, `altimeter`, `checklist`, `radio`, `assess`, `teach`; then by
  key (`item_id`, `criterion_id`, …) in code-point order.
- **E3. Two classes.** **Logged** events are learner/device facts or displayed text
  that cannot be recomputed; they live in the session log. **Derived** events are
  recomputed on replay from state, the scenario record and logged events; a stored
  copy is a cache, never authority (§3).
- **E4. No back-channel.** No event writes `sim`, `env` or `ind`; only input events
  (CONTRACTS §3) change aircraft or instrument state. Text is escaped data (SEC).

| Type | Class | Payload (Proposal) | Digest group | Replay rule |
| --- | --- | --- | --- | --- |
| `input` (v1 §3) incl. `altimeter_setting_pa` | logged (input log) | as v1; `source` adds `fallback` (CONTRACTS §10.4) | resulting state in `sim`/`ind` | Authoritative replay content |
| `altimeter.changed` | derived | `setting_pa_old/new`, `matches ∈ {QNH, QFE, STD, none}` vs `environment.pressure` | `teach` | From input log; tolerance from exercise criteria (Q-S2) |
| `briefing.state` | derived | `item_id`, `state` (BRIEFING §1.4 set) | `teach` | Re-evaluated from the snapshot at `scenario_time_utc` |
| `briefing.acknowledged` | logged | `snapshot_sha256`, `items_viewed[]` | none | Re-applied |
| `checklist.confirmed` / `.unconfirmed` | logged | `checklist_id`, `item_id` | none | Re-applied at step/seq |
| `checklist.sensed` | derived | `checklist_id`, `item_id`, `agrees`, `condition_id` | `teach` | Re-evaluated per step from `sim`/`ind` |
| `checklist.blocked` / `.retry` | derived / logged | step id, unmet `condition_id` | `teach` / none | BRIEFING §3 rules |
| `radio.tuned` | input, once the radio fit is modelled (GAPS Q3) | frequency in `controls` | `ind` | **Later**; until then the frequency is a scenario fact |
| `radio.intent_proposed` | logged | `station_ref`, `frequency_ref`, `intent`, `text?`, `parser {id, version}` | none | Re-applied; text is presentation |
| `radio.intent_resolved` | derived | `accepted`, `reason`, `mismatch[]` (frequency, position, call sign) | `teach` | State machine re-run from logged intents + state + `nav` |
| `radio.reply` | derived structure + logged text (C16) | `kind ∈ {info, say_again, correction, no_reply}`, info fields from `environment`/`nav` only, `template_id`; **no clearance or instruction field** | `teach` (fields); none (text) | Fields re-derived and checked against the logged `radio.reply_shown {text, template_id}` |
| `radio.reply_shown` | logged | `of_event` (the reply's key), `text`, `template_id` | none | Shown text replayed as shown (C16); never parsed as state |
| `assess.phase` | derived | `phase_id` (P0–P11), `enter`/`exit` | `teach` | Evaluator re-run per step (EXERCISE-01) |
| `assess.measure` | derived | `criterion_id`, value SI, `result ∈ {within, outside, gate_fail, not_evaluated}`, `reason?` | `teach` | Never a pass when `not_evaluated` |
| `teach.annotation` | derived | `kind` (reminder, finding, cue), `label`, refs | `teach` | Never read by `sim`/`env`/`ind` |
| `run.pause` / `.resume` | logged | `reason ∈ {user, error}` | none | `step` frozen while paused (CONTRACTS §2) |
| `run.started` | logged | `run_id`, `previous_run_id?`, scenario-record `sha256` | none | First event of every run (step 0) |
| `run.reset` | logged | `next_run_id` | none | **Last event of the run**: the recording ends; the new run starts at step 0 with a new `run_id` and `run.started {previous_run_id}` (CONTRACTS §2) |
| `device.pairing` | logged (session metadata) | `state ∈ {started, confirmed, failed, ended}`, `profile_id` | none | Not needed to replay; **no keys, codes, nonces or fingerprints** |
| `input.source_lost` / `.source_changed` | logged | `source`, `reason` (PHONE-CONTROL §6 enum), `fallback` | none | Informative; the controls that follow are ordinary inputs |

**Phone loss (GAPS Q19; CONTRACTS §10.4).** At the input boundary:
`input.source_lost` and a visible warning at loss; keyboard/touchpad are active
immediately and may override any axis during the hold (ordinary input events with
their own `source`); axes not overridden hold their last value for 0.5 s, then one
input event with `source: "fallback"` centres them. A hold is allowed only when
time-bounded, visible and logged (clarifies v1 §3). Auto-pause on phone loss is a
**Proposal** (optional setting, default off), not decided by Q19 and **not part of
v1.1**; PHONE-CONTROL §6 uses the same wording.

Group meaning: `sim`/`ind` = CONTRACTS digest groups; `teach` = no digest,
re-derived; none = logged session fact outside digests, covered by the session-log
hash (§3).

## 3. Review and debrief record

**Frozen** at run end, validated on import (SEC). The v1 replay `scenario` section
keeps all its v1 fields (package id, version, sha256; navigation edition; weather/
NOTAM snapshot hashes) and **adds alongside**: `scenario_record {record_id,
sha256}`, `session_log_sha256` and `evaluator_pin_sha256`.

| Part | Contents | Authority |
| --- | --- | --- |
| Replay record | CONTRACTS §5 + the three added fields | Input log is the replay content |
| Scenario record | §1, embedded or by hash (S4 limits embedding) | Environment, nav, briefing |
| Session log | Logged events (§2) in `seq` order; `session_log_sha256` over its JCS form | Learner/device facts, shown text |
| Evaluator pin | `criteria_id/version`, evaluator build hash, poh-values `values_id/version`, CAL mapping version (EXERCISE-01); `evaluator_pin_sha256` over its JCS form | Defines how derived events are recomputed |
| Derived cache? | Optional derived events with the pin hash | Cache only |

Rules:

- **D1. Seek** re-simulates from step 0 with the input log (CONTRACTS O-5, R-9),
  re-applying logged events at their step/seq and recomputing derived events. The
  view shows events with `step ≤ target`. No snapshot/restore in v1.1.
- **D2. Reopen** never fetches weather, NOTAMs, catalog or package content; a
  missing or mismatching scenario-record, snapshot or session-log hash, or a stored
  evaluator pin that does not match its own `evaluator_pin_sha256`, refuses the
  record (BRIEFING §1.6), apart from S4 local resolution. D2 checks integrity only;
  a different current evaluator is handled by D3.
- **D3. Re-derivation check.** With a matching pin, recomputed derived events must
  equal the cache; events depending on `ind` are compared only on the **same
  browser engine and version** (CONTRACTS §4), otherwise reported "not
  comparable". Inequality is a defect report. Re-evaluation under a different
  evaluator or criteria version is **allowed**: it is reported as a separate
  evaluation with its own pin, beside the recorded one, never refused and never
  silently substituted (EXERCISE-01).
- **D4. Trace-only.** A build mismatch (CONTRACTS §5) opens trace-only mode; derived
  events from the trace are labelled "from recorded trace, not re-simulated".
- **D5. Display values.** Interpolated frames never feed events (CONTRACTS §2).
- **D6. Privacy.** No raw device samples (CONTRACTS §3); typed radio text stays in
  the session log of a local recording (Q-S6), escaped on render.

## 4. Per-slice freeze table (milestone 2, TODO 2.2/2.3)

The orchestrator owns `packages/contracts/` and integrates this table (ARCH).
**freeze** rows are agreed before code1 and code2 start; **open** rows are built by
their owner behind the frozen shape.

| Field / artefact | Owner | Path | Status |
| --- | --- | --- | --- |
| Scenario record schema, JCS hashing, event envelope, type list and order (§1, §2) | orchestrator | `packages/contracts/` | freeze |
| Scenario-record builder: catalog/nav resolution (S4), runway-bearing conversion with WMM2025 (S5), local `reference_only` resolution (local-only record) | code1 | `packages/simulation/` scenario module | open |
| Loader → worker `init` (`ic`, `env`, seeds) | code1 | `packages/simulation/` | open |
| `sim` names/order incl. `wow_nose`, `wow_main_l`, `wow_main_r` (C2) | code1 | `packages/simulation/` | freeze |
| `ind` digest layout: encoder and field order (list below); worker computes `ind` every step (CONTRACTS §10.2) | code1 | `packages/simulation/` | freeze, **blocked on Q-S8** |
| `sim_core`/`env_core` stream fields (CONTRACTS §10.2) | code1 | `packages/simulation/` | freeze |
| Single `seq` allocator in the worker; proposal/accept messages (CONTRACTS §10.3) | code1 | `packages/simulation/` | freeze |
| `ind` field values: JS env fields (`magvar_east_rad`, `zeta_m`, `h_ell_m`) | code1 | env module | freeze names |
| `ind` field values: instrument models (`altimeter.*`, `asi_ias_mps`, …) as pure step functions run by the worker (CONTRACTS §10.2) | code2 | `packages/avionics/` | freeze names |
| Input log, session log, `run.*` events, digests, seek, replay/review writer and import (§3) | code1 | `packages/simulation/` | open |
| `altimeter.changed`, `briefing.state`, `checklist.*`, `radio.*`, `assess.*`, `teach.*`, `cal_ias_mps`/`cal_ias_valid`, `h_qnh_ref_m`, runway-frame values (C1, C4, C14) | code2 | `packages/training/` (evaluator) | open |
| `radio.tuned` | code2 | `packages/avionics/` | **Later** (radio fit, GAPS Q3) |
| Briefing view, debrief/seek UI, fallback input events | code2 | `app/` | open |
| iPhone profile (`source: "iphone"`) | code2 | `app/` | **Later** (TODO 1.13) |

**Declared `ind` list for `digest_layout` 1 (Proposal, in order):**
`magvar_east_rad`, `zeta_m`, `h_ell_m`, `altimeter.setting_pa`,
`altimeter.setting_ref` (enum QNH=0, QFE=1, STD=2; derived constant, CONTRACTS
§10.1), `altimeter.indicated_m`, `asi_ias_mps`, `vsi_mps`, `ai_pitch_rad`,
`ai_roll_rad`, `hi_heading_rad`, `compass_heading_mag_rad`, `tach_prop_radps`,
then the engine/fuel indications of Q-S8. No display preference (e.g. the hPa/inHg
unit) is in the list. Instrument behaviour behind these names is TBD-src (S17
Section 7). **Blocking open item (Q-S8, user scope decision pending):** the layout
cannot freeze, and no `digest_layout` 1 code may be written, until the engine/fuel
set is decided; after that, adding a field is deferred to a major version (§6).
Recommendation: include every engine/fuel indication of the classic-panel 172S
(S17 Section 7 panel list, to be extracted with page citations by the researcher;
the controls note Part B lists controls, not indications), all in `ind`, computed
inside WASM from the propulsion state so they are bit-reproducible, named
`eng.<indication>_<si-unit>`. code2 proposes entries; code1 owns order and
encoding.

Interfaces: code2 reads `sim`/`env` only through the CONTRACTS state stream and
snapshots; code1 stores logged events as opaque validated envelopes and never
interprets `checklist.*`, `radio.*` or `assess.*`. Cross-slice fixtures (R-1, R-9
with events) are authored by the non-implementing side.

## 5. Name reconciliation and conflicts

C4 is adopted for the bounded [assessment-airspeed mapping](ASSESSMENT-AIRSPEED.md)
slice: evaluator-derived `cal_ias_mps`/`cal_ias_valid` remain outside `ind` and its
digest. This does not adopt all scenario v1.1 proposals or implement a recorder.

| # | Conflict found | Drafts | Proposed resolution |
| --- | --- | --- | --- |
| C1 | `h_qnh_ref_m` name and group undecided | EXERCISE-01; CONTRACTS §4 | Evaluator-derived (pinned), outside the `ind` digest like C14; labelled "reference altitude for a correctly set altimeter" |
| C2 | Weight-on-wheels "per gear", no names | CONTRACTS §4; EXERCISE-01 | `sim.wow_nose`, `sim.wow_main_l`, `sim.wow_main_r` (uint32 0/1), in this order; fills a v1 placeholder (applied in CONTRACTS §4 and EXERCISE-01) |
| C3 | `magvar_east_rad` listed as a WASM `env` field and as JS-computed | CONTRACTS §4 | One JS field, `ind` group; applied (CONTRACTS §4 lists it once) |
| C4 | `ind.asi_ias_mps` used for the pitot-static model and for the CAL derivation | CONTRACTS; EXERCISE-01 | `asi_ias_mps` stays the instrument (TBD-src); CAL value is evaluator-derived `cal_ias_mps` + `cal_ias_valid`, outside the `ind` digest, pinned by the evaluator hash |
| C5 | `setting_ref` stored as state, but the knob "only sets a pressure" | CONTRACTS §1; BRIEFING `altimeter.set` | `setting_ref` is derived: the scenario's `expected_setting_ref`, constant per run, no input changes it (CONTRACTS §10.1), so v1 and v1.1 readers encode identical `ind` bytes. `setting_unit_display` leaves `ind` (presentation). Whether `setting_pa` matches is the derived `matches`. The earlier optional input `altimeter_setting_ref` is withdrawn |
| C6 | `altimeter.set` (logged) vs input `altimeter_setting_pa` | BRIEFING §4; CONTRACTS §3 | The input is the only logged fact; `altimeter.changed` is derived |
| C7 | `confirm` vs "acknowledged"; `pre-satisfied` both a class and "still sensed" | BRIEFING §3; EXPERIENCES | `support ∈ {sensed, confirm, unsupported, na_config}` + `pre_satisfied: bool`; learner action "confirmed" |
| C8 | Intent names: calls R1–R7 vs `report-holding-point`…; `radio.transmit-intent` | BRIEFING §2.3; EXPERIENCES | Package kebab vocabulary is the enum; each maps to one BRIEFING call (`report-holding-point` = call R1, `report-downwind` = R3, `report-final` = R5, `report-vacated` = R6); `report-final` added to EXPERIENCES' list (applied) |
| C9 | Radio in scope (BRIEFING) vs "not assessed" (EXERCISE-01) | both | Events defined in v1.1; milestone 2 scope by orchestrator (Q-S3) |
| C10 | Snapshot `mode` superset; `applied_conditions.relation` vs `differences[]` | BRIEFING; EXPERIENCES | Superset enum (`mixed`; `live` only from the later adapter); `relation = matches` iff `differences` is empty. EXPERIENCES' example (`generated`, `matches`, no differences) stays valid |
| C11 | Navigation edition: one v1 field vs `catalog` + `extent` | CONTRACTS §5; EXPERIENCES | Keep the v1 field; add the `catalog`/`nav` blocks in the scenario record |
| C12 | Phone loss: auto-pause (PHONE-CONTROL §6) vs Q19 hold-then-centre; v1 "no silent hold" | PHONE-CONTROL; Q19 | Q19 governs (§2, CONTRACTS §10.4); keyboard/touchpad override during the hold; auto-pause a Proposal (default off), not in v1.1 |
| C13 | `teach.phase/events/findings` vs assessment markers | EXERCISE-01 | `assess.*` and `teach.annotation` events, all derived |
| C14 | `x_rwy_m`/`y_rwy_m`, `gs_mps`, `track_true_rad`, `vs_mps` derived, owner unspecified | EXERCISE-01; CONTRACTS §1 | Evaluator (code2) per step from `sim`; no digest; pinned by evaluator hash |
| C15 | Aircraft identity: `model_id` vs `manifest/manifest_hash` | CONTRACTS; EXPERIENCES | Both: manifest = sources/configuration, model package = dynamics |
| C16 | EXPERIENCES: accepted interaction events are "replayed, not regenerated"; here radio replies were derived | EXPERIENCES; §2 | Shown reply text is logged and replayed as shown; its state effects (`intent_resolved`, reply fields) are re-derived and checked against the log; a mismatch is a defect |
| C17 | Rights labels differ: manifest `public_domain_us`/`facts_only`/`reference_only`, EXPERIENCES kebab classes, BRIEFING `rights_unknown` | data/; EXPERIENCES; BRIEFING | One enum with storage semantics (CONTRACTS §10.5); S5/S9 flagged for a Q5 record |

## 6. Versioning and deferred items

v1.1.0 adds only optional fields, event kinds, the `fallback` source and the
scenario record (CONTRACTS §7 **minor**); it adds no input control. Naming `wow_*`,
the declared `ind` list, `sim_core`, the derived `setting_ref` and the worker-owned
`seq` (CONTRACTS §10) fills v1 placeholders and is valid only if agreed **before**
any `digest_layout` 1 code exists. **Deferred to a future major version** (would need `digest_layout` 2):
a digest group over logged events (Q-S1), any `ind`/`sim` field added after the
layout is implemented, and moving evaluator values (C1, C4, C14) into a digest.

## 7. Open questions (for GAPS via the orchestrator)

- **Q-S1** Logged events: is the session-log SHA-256 enough, or a digest group in a
  later major version?
- **Q-S2** Altimeter `matches` tolerance and subscale unit (exercise criteria;
  installed instrument, GAPS Q3, TBD-src).
- **Q-S3** Radio state machine (calls R1/R3/R5/R6) in milestone 2, or briefing item
  only as EXERCISE-01 says?
- **Q-S4** QFE datum kind and the vertical reference of AIP elevations (TBD-src).
- **Q-S5** May a draft or `experimental` package produce milestone 2 scenario
  records while all real values are `tbd`?
- **Q-S6** Store typed radio text in the session log, or only the parsed intent?
- **Q-S7** Accept C1–C17, especially the derived `setting_ref` (C5), the Q19
  clarification of v1 §3 and the rights enum?
- **Q-S8 (blocking, user scope decision)** Which engine/fuel indications join the
  declared `ind` list before the first `digest_layout` 1 code? Recommendation: all
  classic-panel 172S engine/fuel indications (S17 Section 7, TBD-src extraction),
  all `ind`, computed in WASM.
