# Scenario briefing, text radio and checklists (first exercise)

Status: product design proposal for [TODO](../TODO.md) 1.8, dated 2026-11-01. It is
written by the product role, which also did its own source research.
[SPEC](../SPEC.md) owns requirement statements. This document refines how
R-BRIEF-1, R-COMM-1, R-AIR-3, R-TRAIN-4 and R-TRAIN-5 apply to the first exercise.
It proposes SPEC/SEC edits at the end and does not change them.

The design follows these decisions:

- [GAPS](../GAPS.md) Q11: versioned scenario briefings first; an optional live
  adapter later.
- Q7/Q10: a circuit at Frankfurt-Egelsbach (EDFE).
- The orchestrator's direction for this task: the first exercise starts at the
  runway holding point with the engine running. This is recorded on the
  contracts branch as GAPS Q18; it is not yet on `main`.

Sources and rights are in the
[briefing/radio source note](../research/2026-11-01-briefing-radio-sources.md),
cited below as B*, C* and D*. EDFE facts come from the
[EDFE note](../research/2026-11-01-edfe-aerodrome-sources.md), cited as E*.

**Value rule.** No real operational value is fixed here. Every runway, frequency,
pressure, speed, time limit and phrase is **TBD-src** until it is checked against
the cited edition. Where this document needs a number to explain a mechanism, the
number is labelled *example*. It is not a fixture value.

## Scope

In scope for the first exercise:

- a frozen scenario briefing (weather reports, notices, aerodrome data and
  pressure references);
- typed text radio with EGELSBACH INFORMATION from the holding point to vacating
  the runway;
- 172S checklists from Before Takeoff to After Landing;
- events that the circuit exercise consumes.

Out of scope:

- a live weather or NOTAM provider;
- voice and speech recognition;
- other stations: VORFELD beyond the hand-off call, LANGEN INFORMATION, EDDF TOWER;
- engine start and taxi;
- the south circuit;
- German phraseology. It is designed for, but delivered later.

The exercise definition (runway, circuit geometry, objectives and tolerances) is
drafted separately as `docs/design/EXERCISE-01.md` on branch
`design/exercise-criteria-1-5`; see [section 4](#4-circuit-objectives-hook). Shared
state, input and replay field names come from `docs/design/CONTRACTS.md` on branch
`design/contracts-1-4`. Neither file is on `main` yet, so neither is linked.

## 1. Scenario briefing data

### 1.1 Learner problem and observable behaviour

Before take-off, the learner reads the weather and notices for a stated scenario
time. They decide on the runway and altimeter setting, and set the altimeter. The
learner must always be able to see:

- whether each item is **historical** (a real past report) or **generated**
  (a training construction);
- that no item is current operational information;
- whether the simulated atmosphere matches the report.

A persistent banner states the mode and the scenario time, for example:
"HISTORICAL — 2026-06-01 12:20 UTC — not for flight planning". Generated items
carry "GENERATED FOR TRAINING" on each item, not only in the banner.

### 1.2 Data sources for the first scenarios

Findings from the source note:

- **EDFE publishes no METAR in the international feed checked.** The AWC query
  returned none in 24 h. The operator states that EDFE's AWOS issues local MET
  REPORT/SPECIAL (E2b).
- EDDF METAR and TAF exist. Historical EDDF METARs are retrievable from the IEM
  archive (B8). IEM's public-domain statement covers IEM's own distribution, not
  the rights of the originator (DWD). DWD's CC BY 4.0 grant (B5) covers *freely
  accessible* geodata. It is not established that it covers aviation weather,
  which DWD offers through a fee-based portal (B6). EDDF reports are therefore
  `rights_unknown` until DWD confirms. The AWC holds 30 days (B7).
- DWD open data has no METAR/TAF directory (B4). The DWD aviation portal is
  fee-based (B6).
- No open historical German NOTAM source was found. The DFS AIS portal forbids
  automated use and derived works (E1a).

Proposed first content set:

| Item | Mode | Provenance | Rights class |
| --- | --- | --- | --- |
| EDDF METAR at or before scenario time | historical | IEM archive record (station, issue time, raw text, retrieval time) | **`rights_unknown`** (blocks shipping) until DWD confirms; keep IEM attribution as distributor. Usable only in local/author builds meanwhile |
| EDDF TAF covering scenario time | historical, or generated if no archived TAF is available | Archive record, or a generator rule | As above (`rights_unknown`), or `generated` |
| EDFE local report (MET REPORT-like) | generated, derived from the applied environment | Generator id and version; inputs | `generated` (project GPL) |
| Notices (NOTAM-like) | generated | Scenario author; fictional serial clearly marked | `generated` |
| Aerodrome data (runway, elevation, frequencies) | reference | EDFE note: E2a operator, E3 OurAirports placeholder, E1 AIP pending | Per EDFE note; `reference-only` items are cited, not shipped |

A generated item never reuses a real NOTAM series or number format that a reader
could mistake for a real notice. The exact series-letter convention to avoid is
TBD-src (PANS-AIM, not read).

### 1.3 Snapshot schema (proposal for CONTRACTS)

The briefing is part of the declarative scenario package. Each item is one record.
Times are UTC (ISO 8601). Internal values are SI. Original text and units are kept
for display.

```text
briefing_snapshot {
  snapshot_id, schema_version, sha256          # hash over canonical items
  scenario_time_utc                            # the simulated "now"
  mode: historical | generated | mixed | live  # live: later adapter only
  coverage: { stations[], area, notice_scope } # declared, so "none" can be verified
  items[]: briefing_item
  applied_environment_ref                      # env section hash (CONTRACTS §5)
  differences[]: { item_id, field, reported, applied, reason }  # explained deltas
}

briefing_item {
  item_id, kind: metar | speci | taf | local_report | notice | aerodrome
  status_label: historical | generated | reference
  station_icao, raw_text                       # escaped on render, never HTML
  decoded { ... SI fields + original value/unit ... }   # parser output, versioned
  issue_time_utc
  valid_from_utc, valid_to_utc | null          # TAF/notice periods; METAR: null
  replaces_item_id | null, cancels_item_id | null   # AMD/COR/CNL, NOTAMR/C analogues
  source { publisher, originator, distributor, url_or_archive_ref,
           edition_or_cycle, retrieved_utc, licence, attribution, sha256 }
  generator { id, version, inputs_hash } | null
  state: ok | missing | stale | future_issued | malformed | contradictory
         | superseded | rights_unknown
  state_reason                                 # learner-visible text
}
```

Rules:

- **R1. Validity is evaluated against `scenario_time_utc`, never the wall clock.**
  Present-day age is shown separately and only as provenance ("issued 152 days
  before today", *example*). It never makes an item invalid.
- **R2. A METAR or local report is applicable** when its issue time is at or before
  scenario time and its age is within `max_obs_age`. `max_obs_age` is proposed to
  be one routine reporting interval plus a margin. The interval is TBD-src: the IEM
  sample shows EDDF issuing at :20 and :50, and the Annex 3 criteria were not read.
  An older report gets state `stale`. When several METAR/SPECI items for one
  station are applicable, the latest issue wins and the earlier ones are
  `superseded`.
- **R3. A TAF is applicable** when its validity period contains scenario time and it
  is the latest issue before scenario time. Earlier issues are `superseded`. The
  meaning of amended, corrected and cancelled forecasts is TBD-src (WMO-No. 306
  FM 51, B1, not read). Until it is sourced, the parser rejects AMD/COR/CNL as
  `malformed` rather than guessing. If a TAF is required and none covers
  scenario time, the TAF slot is `missing`; non-covering issues are listed as
  inactive.
- **R4. A notice is active** when its period contains scenario time. It is
  inactive but listed when the period is outside scenario time. Permanent or
  estimated end times are TBD-src (PANS-AIM).
- **R5. Any item issued after scenario time gets state `future_issued`** and is
  excluded. This prevents hindsight leakage in historical scenarios.
- **R6. "No notices" is only a valid result when `coverage.notice_scope` is
  declared.** Without it, the learner sees "notices not provided for this
  scenario", never "nil".
- **R7. Briefing values reach the simulation only through the scenario package.**
  The atmosphere or environment in the package is the authority. The briefing
  displays reports, and any difference between the two is listed in `differences`.

### 1.4 Failure states and what the learner sees

| State | Detection | Learner sees | Scenario acceptance |
| --- | --- | --- | --- |
| `missing` | A declared required item (EDDF METAR, the EDFE local report) is absent | "No report available for EDFE at 12:20 UTC" (*example*); raw slot empty; no default weather | Authoring validation fails for a required item; optional items warn |
| `stale` | R2 age exceeded | Item shown with "STALE at scenario time (issued 3 h 10 min before)" (*example*) | Fails if the item is required |
| `future_issued` | R5 | Not shown in the briefing; the debrief/author view lists it | Fails (package error) |
| `malformed` | Parse error, unknown group, non-finite or out-of-range number, unknown unit | Raw text shown escaped, with "could not be decoded"; no decoded values | Fails if the item is required |
| `contradictory` | Same station and time with differing content; a notice closes the exercise runway; reported QNH or wind differs from applied env beyond tolerance without a `differences` entry | Both values shown side by side with the reason | Fails until resolved or explained |
| `superseded` | R3 or a replacement notice | Collapsed under the current item | OK |
| `rights_unknown` | Licence or attribution field empty | Author view only | Cannot be shipped |

A TAF differing from a METAR is **not** a contradiction: forecast and observation
are different things. Wind and visibility differences between the report and the
applied environment are tolerated only within predeclared tolerances. Those
tolerances are TBD and go in EVAL E7 before evaluation (R-EVAL-1).

### 1.5 Pressure references from briefing to environment (R-AIR-3)

The altimeter state stores `setting_pa`, `setting_ref ∈ {QNH, QFE, STD}` and a
display unit. These follow the CONTRACTS draft on `design/contracts-1-4`.

1. **QNH.** The scenario declares one QNH value with its source item (for example
   the EDDF METAR's QNH group) or a generated value. Reported QNH is rounded per
   the code form (TBD-src, B1/B3). The value is not recomputed from another station.
   **Modelling.** Setting the atmosphere model's sea-level reference pressure
   directly to QNH is correct only when the model atmosphere is ISA. In a non-ISA
   temperature profile, the indicated altitude at the field would then differ from
   field elevation. The proposed definition: the environment is fixed at the QFE
   datum. The static pressure at datum elevation is the pressure that a
   standard-atmosphere altimeter set to QNH converts to datum elevation. The
   temperature profile (from the reported temperature) is applied above and below
   the datum. Using sea-level reference pressure = QNH with ISA temperature is
   allowed only as a labelled **modelling simplification**. The scenario records
   which definition is used.
   **Fixture (proposed U-7a, CONTRACTS style).** With the aircraft on the ground
   at the declared datum, altimeter set to QNH, and (a) ISA and (b) a non-ISA
   temperature offset (*example* ±15 K), the altimeter must read datum elevation
   within a tolerance. A second case reads 0 at the datum with QFE set. The
   tolerance is TBD-src from the instrument's specification or the reporting
   resolution. Until sourced, it is labelled a proposal (*example*: one hPa
   rounding step converted to height). Height errors aloft under non-ISA
   temperature are expected behaviour, not failures; the fixture only covers the
   datum point.
   If the applied value differs from the reported one, for example because of
   rounding or an EDDF-to-EDFE spatial difference, that is a `differences` entry.
2. **QFE.** It is derived in the atmosphere model as the pressure at the declared
   QFE datum. The datum is aerodrome or threshold elevation for the runway in use,
   TBD-src from the EDFE AIP (E1). If a local report also gives QFE, the derived
   and reported values must agree within a declared tolerance, or a difference is
   recorded. QFE is shown in the briefing only when the scenario declares its datum.
3. **STD** is 101 325 Pa. It is shown for reference; the first circuit does not
   need it.
4. **Learner check.** Setting the altimeter is an aircraft action, recorded as an
   input event. The briefing never sets the instrument. The exercise may check
   `setting_pa` against the briefed QNH. The tolerance is set in the exercise
   definition and is related to the instrument's subscale units. Those units are
   TBD-src, as hPa or inHg depends on the installed instrument (GAPS Q3).

Display converts once, at the presentation boundary: hPa or inHg as configured,
always labelled. Indicated altitude, height above the QFE datum and pressure
altitude are never shown with the same label.

### 1.6 Later live adapter without changing replay

A later adapter is a separate gate with its own provider, rights, freshness and
failure decision (R-BRIEF-1).

- It produces the **same `briefing_snapshot`** with `mode: live` and
  `source.retrieved_utc`.
- At session start, the snapshot is **frozen**: hashed, embedded in or referenced
  by the replay record's `scenario` section (weather/NOTAM snapshot hashes), and
  then treated exactly like a historical snapshot.
- **Replay never calls the adapter.** A replay whose snapshot hash is missing or
  does not match is refused. It does not refetch.
- Provider failure yields the R6/§1.4 states, for example "live service
  unavailable". It never yields silent clear weather or "no notices".
- The live adapter runs outside the deterministic simulation. It only feeds scenario
  construction before the run starts (ARCH, briefing section).

## 2. Text radio phraseology (first exercise)

### 2.1 Principles

- **P1. AFIS gives information, not clearances.** The simulated EGELSBACH
  INFORMATION gives runway in use, wind, QNH, traffic information and aerodrome
  information. It never issues a clearance or instruction (EASA AMC/GM to SERA,
  Appendix 1 note at §1.2.5; Explanatory Note to ED Decision 2021/014/R p. 5; C2b,
  C2d). Take-off and landing are at the pilot's discretion (E2a).
- **P2. Scenario state owns radio state.** The radio model is a state machine. It
  tracks station/role, frequency, aircraft call sign, pilot intent, unit response,
  acknowledgement and the resulting expected action (ARCH, communications).
- **P3. Text is presentation.** The phrasing of a call and its parsing into an
  intent can come from templates, a rule parser or later an AI component. **None of
  them can change simulation, avionics, clearance or exercise state.** They can
  only propose an intent from a closed enumeration to the scenario state machine.
  The state machine accepts or rejects the intent against the recorded state.
  Effects of an AI-proposed intent:
  - It cannot tune a radio, set QNH, change the runway in use, invent traffic,
    frequencies or fixes, or mark an objective met.
  - If generated text contradicts state, for example a reply naming the wrong QNH,
    the state value is shown, and the conflict is logged as a defect.
  - AI text is labelled as generated wherever it appears.
- **P4. Escape all text.** Render text as plain text (SEC).
- **P5. Record on the simulation clock.** Each exchange is recorded on the same
  clock as control and checklist events, for replay and debrief (R-REVIEW-1).

### 2.2 Language

Rule source:

- SERA.14015 as given in NfL 2023-1-2726 §5 (C3 p. 5): radiotelephony is in English
  or in the language normally used by the ground station.
- The AIP lists the languages per station. EDFE's languages are TBD-src (AIP AD 2,
  C4).
- The NfL Annex 1 tables (from p. 38) are bilingual German/English.

Proposal:

- **English first.** German follows as a second phrase set taken from the NfL
  tables, after EDFE's languages are confirmed. Both sets map to the same intents.
- **No mixed-language exchange** inside one session unless the scenario declares it.

### 2.3 Calls in scope

Station data comes from the operator flyer E2a: EGELSBACH INFORMATION 118.405 MHz,
then the VORFELD hand-off at 121.730 MHz. Both are TBD-src until checked against
the AIP. The aircraft starts at the holding point on the INFORMATION frequency. Its
call sign is scenario-defined and fictional.

| # | Trigger (state) | Pilot intent | AFIS response content (may contain) | Phraseology basis (cite) |
| --- | --- | --- | --- | --- |
| R1 | Holding point, before entering the runway | Initial call: position, intention (circuit) | Runway in use, wind, QNH, traffic information. **No clearance.** | EASA App. 1 §1.4.10 (C2b ~p. 20); NfL Annex 1 §1.4.10 (C3 p. 69); E2a "call INFORMATION at the holding point" |
| R2 | Entering/lining up or departing (pilot report, if EDFE practice requires one) | Position report | Traffic information if relevant; otherwise acknowledgement | TBD-src: whether EDFE expects it (AIP/E2a); App. 1 §1.1.9 |
| R3 | Established downwind (geometry from the exercise) | "Downwind" position report | Traffic information or acknowledgement | App. 1 §1.4.14 a) (C2b p. 23); NfL §1.4.14 (C3 p. 75) |
| R4 | Base (optional, scenario flag) | "Base" report | As R3 | Same |
| R5 | Final | "Final" report | Runway and wind information, traffic on or near the runway. **No landing clearance.** | Same; App. 1 note on FINAL/LONG FINAL (C2b p. 23) |
| R6 | Entire aircraft beyond the runway-holding position after landing | "Runway vacated", then change to VORFELD | Acknowledgement; VORFELD frequency as *information* (no frequency-change instruction; C2d p. 5) | App. 1 "RUNWAY VACATED" pilot transmission (C2b pp. 19–20); NfL (C3 pp. 68–69); E2a "call VORFELD after vacating" |
| R7 | Balked landing or go-around (if flown) | Report | Traffic information | TBD-src (App. 1, phrase not located) |

The exact wording of every pilot template and AFIS reply is **TBD-src**. It is
filled from the ATC/FIS columns of Appendix 1 after a visual check, because the
columns were not extractable (C2b, source note). Readback requirements for AFIS
information, for example QNH or runway in use, are TBD-src. For ATC, readback is
defined for clearances and instructions (SERA.8015 d)–e), C3 §25 p. 30); AFIS issues
none.

AFIS replies **may not** contain:

- "cleared"/"freigegeben", or any take-off or landing clearance;
- line-up, taxi, turn, climb or descent instructions;
- sequencing instructions;
- transfer of control (§1.1.4 is ATC-only per C2d p. 5);
- any value not present in the scenario state.

Whether an AFIS unit may *request* a report, for example "report downwind", depends
on the FIS column for that phrase. Until then it is disabled (TBD-src).

### 2.4 Radio fixtures (for EVAL E7)

| Case | Input | Expected state transition |
| --- | --- | --- |
| Normal | R1, R3, R5, R6 with correct station, frequency and position | Each call is accepted; replies contain only P1 content; events are logged |
| Incomplete call | R1 without call sign or intention | The unit asks the pilot to say again, or the call stays unacknowledged; nothing advances |
| Wrong station/frequency | R1 sent on VORFELD, or while tuned to another frequency | No INFORMATION reply; feedback names the frequency mismatch |
| Position mismatch | "Downwind" reported while the aircraft is on crosswind by geometry | Call logged with a mismatch flag; feedback names the observed position |
| Clearance request | The pilot asks for a take-off clearance | Reply states information only (wording TBD-src); no state change |
| Generator conflict | Injected generated reply with a wrong QNH | Displayed QNH comes from state; conflict logged; test fails if the generated value appears |
| Timeout | No R1 within a scenario limit | A visible reminder (teaching assist, labelled); no automatic call |
| Incorrect readback | After R1 the pilot acknowledges with a wrong QNH or runway in use | AFIS issues no clearance, and whether AFIS information *requires* a readback is TBD-src (§2.3). Proposal: the mismatch is detected against state, the unit corrects the value ("correction", wording TBD-src), and the debrief records it. No state changes from the wrong value. If the source shows no readback expectation, the case becomes a debrief-only check |
| Unavailable station | AFIS outside its hours, or the unit silent (scenario flag) | No reply is generated. After a declared number of calls the learner is told the station is not answering (teaching assist, labelled). The procedure for operating without AFIS at EDFE (e.g. blind transmissions per SERA.14085, C3 §20) is TBD-src from the AIP/operator rules (E1, E2d); until sourced, the scenario ends with a labelled "procedure not modeled" outcome rather than inventing one |
| Replay | Re-run the input log | Same exchange events in the same order (text may differ only if it is regenerated, which the first exercise does not do) |

## 3. Checklists for the holding-point start (R-TRAIN-4)

Source: Cessna Model 172S Information Manual, POH/AFM 172SPHUS Revision 5
(19 Jul 2004), Section 4 (D1; the S17 copy in the 172S note). Only page references
and item names are cited. The checklist text is copyrighted and is not reproduced.
D1's Section 4 page footers read "Revision 4". Later revisions applicable to
172S9491–172S9809 are unchecked (GAPS Q3). Speed and RPM values in these
checklists are **TBD-src (D1 page shown)** and are taken from the page when the
fixture is built.

Each item gets one of the following support classes:

- **sensed**: verified from modeled state;
- **confirm**: the learner acknowledges it, and it cannot be verified;
- **unsupported**: shown as not modeled;
- **n/a-config**: an "if installed" item not in the selected fit;
- **pre-satisfied**: true by the holding-point initial state, still displayed.

| Checklist (D1 page) | In first exercise | Item handling (proposal) |
| --- | --- | --- |
| Before Takeoff (p. 4-15) | Yes. The run-up items are optional, because the start is at the holding point and the IC implies the run-up is done | Parking brake (sensed); seats, belts, doors, seat backs (confirm); flight controls free and correct (sensed if the learner moves them, otherwise confirm); flight instruments check and set, including altimeter (sensed: `setting_pa` vs briefed QNH); fuel quantity (sensed); mixture, fuel selector (sensed, pre-satisfied); magneto check, vacuum gage, engine instruments/ammeter, annunciators (unsupported until engine and electrical indications are sourced; TBD); throttle idle/RPM items (sensed via tachometer, if modeled); throttle friction (unsupported); strobes (sensed if lights modeled); radios/avionics set (sensed: INFORMATION frequency tuned, once the radio fit is chosen); NAV/GPS switch, autopilot, manual electric trim (n/a-config, pending Q3); elevator trim set for take-off (sensed and pre-satisfied by the IC; the learner can still change it; take-off mark TBD-src); wing flaps set for take-off (sensed and pre-satisfied by the IC; range TBD-src p. 4-15); brakes release (sensed) |
| "Line-up" | Optional, **generic** | D1 has no line-up checklist. A school-style list (lights, transponder, heading check) is labelled **generic instructional, not POH**, and needs instructor review |
| Normal Takeoff (p. 4-15) | Yes | Flaps, full throttle, mixture (sensed); nose-wheel lift speed and climb speed (sensed via IAS indication; values TBD-src); flaps retract (sensed) |
| "After take-off" | Covered by Normal Takeoff steps 5–6 and Enroute Climb (p. 4-16) | No separate POH list. A generic after-take-off list is labelled as such |
| Descent (p. 4-16) | Partly | Altimeter set (sensed); fuel selector (sensed); flap-speed limits (sensed; TBD-src) |
| Before Landing (p. 4-16) | Yes | Seat backs, belts (confirm); fuel selector, mixture (sensed); landing/taxi lights (sensed if modeled); autopilot (n/a-config) |
| Normal Landing (p. 4-17) | Yes | Speeds and flaps (sensed; TBD-src); touchdown and landing roll items are assessed by the exercise, not ticked |
| Balked Landing (p. 4-17) | If flown | Throttle, flap retraction sequence, climb speed (sensed; TBD-src) |
| After Landing (p. 4-17) | Yes, ends the exercise with R6 | Wing flaps up (sensed) |

Rules (R-TRAIN-4):

- A ticked box never changes aircraft state, and aircraft state never ticks a box
  silently.
- The checklist view shows, for each item, both whether the learner confirmed it
  and whether the sensed state agrees.
- If an item is out of order or skipped, the step stays visible as unmet, with its
  condition shown.
- A *pre-satisfied* item is still *sensed*. If the learner changes the control,
  for example flaps, the item reverts to unmet.
- **Blocked lesson step.** When a step's condition is unmet, the lesson names the
  unmet condition. The learner can then recover by correcting the control, retry
  the step, or reset to the holding-point initial state (R-SIM-4 reset). The
  checklist stays accessible throughout, and nothing changes aircraft settings
  silently. Reset and retry are recorded as events.

The holding-point initial state is engine running, master/avionics on, fuel
selector BOTH, shutoff ON, aux fuel pump OFF, ignition BOTH, mixture rich, and trim
and flaps for take-off. This follows the D1 p. 4-15 inference in the contracts
branch research. These items show as *pre-satisfied*, not as learner actions.

## 4. Circuit objectives hook

`docs/design/EXERCISE-01.md` owns the circuit's runway, pattern direction and
geometry, altitudes, objectives, assessment criteria and tolerances (R-TRAIN-5,
TODO 1.5). This document does not restate them. It provides the following events
on the simulation clock. The exercise references them by event type and ID:

| Event | Payload | Typical exercise use |
| --- | --- | --- |
| `briefing.acknowledged` | snapshot id/hash, items viewed | Briefing completed before release of brakes |
| `briefing.state` | item id, state | Exercise refuses to start with required items not `ok` |
| `altimeter.set` | `setting_pa`, `setting_ref`, source of the briefed value | QNH set within the exercise tolerance before take-off |
| `radio.call` | station, frequency, intent, accepted flag, mismatch flags, geometry position at the time | Required calls R1/R3/R5/R6 made at the right position |
| `radio.reply` | content fields (no clearance field exists) | Debrief only |
| `checklist.item` | checklist id, item id, support class, confirmed flag, sensed agreement | Before Takeoff/Before Landing complete; mismatches in the debrief |

Circuit-leg detection (crosswind, downwind, base, final) is computed by the
exercise from aircraft state and the exercise geometry. The radio model *reads*
that leg; it does not compute its own.

## 5. Proposed SPEC and SEC edits (for orchestrator/product integration)

| Target | Proposed change |
| --- | --- |
| SPEC R-BRIEF-1 | Add the failure-state set `missing / stale / future_issued / malformed / contradictory / superseded / rights_unknown`, R5 (reject items issued after scenario time) and R6 (declared coverage before "no notices"). Add that every generated item is labelled per item, not only by mode. |
| SPEC new R-BRIEF-2 (proposed) | Briefing pressure values reach the environment only via the scenario package. QNH is declared once with its source item. QFE is derived at a declared datum. Reported/applied differences are listed. The briefing never sets the instrument. |
| SPEC R-COMM-1 | Replace "controller response, clearance/readback" with "ATS unit response (ATC clearance/readback only where the unit provides ATC)". Add: at an AFIS aerodrome the unit provides information only, and no simulated AFIS message contains a clearance or instruction. |
| SPEC new R-COMM-2 (proposed) | Typed or AI-generated text maps to a closed intent set. Only the scenario state machine changes radio, clearance, avionics or exercise state. A generated value that conflicts with state is never displayed as authoritative. English first; further languages per the AIP-declared station languages. |
| SPEC R-TRAIN-4 | Add the support classes (sensed / confirm / unsupported / n/a-config / pre-satisfied). Generic non-POH lists (line-up, after take-off) are labelled and instructor-reviewed. |
| SEC threats table | Add "Historical report archives with unclear originator rights": record originator and distributor, licence and attribution; `rights_unknown` blocks shipping. Add "Hindsight leakage in historical scenarios": `future_issued` rejection and fixture. The existing generated-radio row gains the "conflict logged, state wins" control and a generator-conflict fixture. |
| EVAL E7 | Add the §1.4 and §2.4 fixtures and the tolerance placeholders (`max_obs_age`, report/applied wind/QNH tolerance, altimeter-setting tolerance) to be fixed before execution. |

## 6. Open questions (for GAPS via the orchestrator)

1. **Scenario time and data:** which historical date or time for the first
   scenario, or a fully generated briefing? This needs a rights decision on EDDF
   reports: confirm DWD's CC BY 4.0 applies to METAR/TAF redistribution, or ship
   only generated reports at first.
2. **EDFE local report:** accept a *generated* EDFE MET REPORT-like item derived
   from the applied environment, or show only EDDF reports with a "no EDFE report"
   note?
3. **Languages:** English only for the first exercise? EDFE's permitted languages
   need the AIP AD 2 read (C4).
4. **Phraseology review:** who reviews the AFIS phrase set, and who checks the
   Appendix 1 ATC/FIS columns visually? This could be the same instructor review
   partner as Q7.
5. **Calls R2/R4/R7 and VORFELD hand-off:** are these required, optional or out of
   scope? Does the exercise end at R6 or after the VORFELD call?
6. **Checklist depth:** are the Before Takeoff run-up items (magneto, vacuum,
   ammeter) unsupported in v1, or modeled? Is a generic line-up list wanted?
7. **Altimeter units and QFE datum:** hPa or inHg (US vs EU example, GAPS Q3), and
   threshold vs aerodrome elevation for QFE (AIP, E1).
8. **Code-format verification:** a person reads WMO-No. 306 FM 15/51 and Annex 3
   for the current edition before the parser is accepted.
