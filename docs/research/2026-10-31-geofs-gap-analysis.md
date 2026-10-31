# GeoFS strengths, gaps and training implications

Researcher: Codex `geofs_research` subagent. Accessed: 2026-10-31 15:09
Europe/Berlin, from the session clock. Status: source review, not hands-on testing.
References: user expansion of the GeoFS concept; SPEC `R-SIM-1`, `R-AIR-2`,
`R-DATA-1`, `R-TRAIN-2`; TODO 1.2/1.3/1.5 and aircraft/device questions in GAPS.

## Question and method

Which strengths should Gefly retain, which reported gaps are already partially
addressed in GeoFS, and what additional issues appear in original community reports?

Used structured primary-source web research: official GeoFS instructions/site,
original addon repository, regulator terminology, FlightGear project documentation
and original community discussions. No dedicated deep research skill was available
or executed. Queries covered GeoFS navigation/replay/weather, pressure settings,
radio confusion, addon requests, FlightGear C172 checklists and ACAS terminology.
Followed sources rather than treating search snippets as implementation proof.

User preferences are valid product input even where a comparator has the feature.
“Documented present” below means the publisher describes it, not that this review
measured its fidelity or reproduced its behavior. Missing documentation does not
prove absence. No aircraft model, mobile device or GeoFS edition was operated.

User clarification received during research: cover **QNH, QFE and standard
pressure**; **classic instruments first, glass later**. Exact C172 fit remains open.

## Source register

All undated pages were accessed at the time above; quoted feature counts are not
acceptance requirements. Links grant no automatic code/data/asset reuse rights.

| ID | Source, edition/date and inspected scope |
| --- | --- |
| S1 | [GeoFS instructions](https://www.geo-fs.com/pages/instructions.php), undated live page: controls, cameras, replay, map, communication, radio navigation and flight plans. |
| S2 | [GeoFS official site](https://www.geo-fs.com/), advertises 4.0 Beta: browser/scenery/physics/weather/traffic overview. Vendor claims, not independent validation. |
| S3 | [GeoFS data sets and plans](https://www.geo-fs.com/pages/hd.php), undated: standard imagery, enhanced imagery and paid HD distinction. |
| S4 | [GeoFS mobile](https://www.geo-fs.com/pages/mobile.php), undated current page: mobile web application and native-wrapper offerings. |
| S5 | [Autopilot++ original repository](https://github.com/Qantas94Heavy/autopilot-pp), `dev` branch inspected; release/commit not pinned: README, unofficial status and GPL-3.0-or-later notice. Not installed. |
| S6 | [EUROCONTROL ACAS Guide 5.0](https://www.eurocontrol.int/sites/default/files/2025-09/eurocontrol-safety-acas-guide-5-0.pdf): cover April 2025; [publisher page](https://www.eurocontrol.int/system/acas) lists version 5.0, 5 September 2025. Inspected sections 2.6, 8.7 and glossary (printed pp.16–17,77,169). |
| S7 | [FlightGear Cessna 172P project page](https://wiki.flightgear.org/Cessna_172), last edited 2026-07-28: features, clickable cockpit, checklists and system behavior. No independent accuracy measurement. |
| S8 | [GeoFS community: How do I use the radio?](https://www.reddit.com/r/GeoFS/comments/1iqunnp/how_do_i_use_the_radio/), original post/comments retrieved; reader shows “2y ago”, exact calendar date not verified. |
| S9 | [GeoFS community: Which add-ons do you use?](https://www.reddit.com/r/GeoFS/comments/1tmards/which_addons_do_you_use_in_geofs/), original discussion retrieved; reader shows “4mo ago”, exact calendar date not verified. |
| S10 | [FlightGear community: Cannot progress pre-flight tutorial](https://forum.flightgear.org/viewtopic.php?f=17&t=43401), original report/replies 2025-06-15, reply edited 2025-06-16; version context 2024.1.5. Historical report, not a reproduced current defect. |
| S11 | [NOAA Aviation Weather Center Data API](https://aviationweather.gov/data/api/), undated live documentation: METAR/TAF API candidate, not a selected provider or completeness guarantee for European exercises. |

## Capability comparison

The final column is a **Gefly proposal**, not a verified GeoFS defect. Preserve
the user's cockpit and workflow observations without asserting product-wide absence.

| User observation / desired feature | Source finding and status | Gefly implication |
| --- | --- | --- |
| Immediate browser flight | Documented present: browser access without installation (S2). | Preserve a short launch path and low setup burden. |
| Real geography | Documented present: geographic imagery; data sets differ by plan (S2/S3). | Validate landmarks/runways for a bounded training region before expanding coverage. |
| Keyboard/touchpad; mobile orientation | Keyboard/mouse documented (S1); mobile web supported (S4). Orientation behavior not verified here. | Specify keyboard/trackpad mappings and mobile orientation calibration/fallback explicitly. |
| Physics realistic to some degree | S2 describes lift/drag/stall while explicitly simplifying controls. Accuracy not measured. | Compare sourced reference cases rather than equating visual plausibility with fidelity. |
| Multiple views including cockpit | Six camera modes including cockpit documented (S1). | Preserve views while testing control/readability and camera/input conflicts. |
| Video review | Flight-data replay, camera changes and local save/load documented (S1). Video export not established. | Separate replay/debrief requirements from optional encoded-video export. |
| Weather reports and NOTAM | S2 advertises configurable/METAR weather. Raw report/TAF briefing and NOTAM functionality not established. | Distinguish atmospheric simulation from timestamped briefing data and notice validity. |
| Realistic communication, text acceptable | Chat documented; ATC points to external community groups (S1). Procedural controller not established. | Model calls, frequencies, clearance/readback state and feedback, beyond social chat. |
| Navigation/glass cockpit incomplete | S1 documents navigation/PFD-related indications; completeness depends on aircraft. | Verify usable installed controls and modes, rather than claiming navigation is absent. |
| VOR/DME/ILS only partly visible in cockpit | Navigation, tuning and applicable indications documented (S1). Installation-level fidelity not measured. | Test cockpit controls, indications, identification and mode/error behavior together. |
| Real codes, fixes and route material | Fixes, navaids and flight plans documented (S1); currency/coverage not established. | Identify data cycle, unique identifiers, coordinate/datum and procedure applicability. |
| Altimeter pressure and airport elevation | User-reported limitation; configuration/map behavior not established by inspected GeoFS docs. | Couple pressure setting, indicated altitude, airport elevation and scenario reference correctly. |
| Maps and glide path | Map/ILS support documented (S1), PAPI described (S2). Chart fidelity not measured. | Distinguish chart geometry, ILS signal guidance, visual aids and teaching overlays. |
| Checklists and drills | Structured checklist/lesson completeness not established in inspected GeoFS material. | Source checklists and evaluate circuits/approaches as observable exercises. |
| ACAS/TCAS | GeoFS advertises traffic (S2); collision-avoidance behavior not established. | Traffic display is separate from a selected collision-avoidance implementation. |
| Fewer types, deeper systems | S7 provides a depth comparator; the user's aesthetic judgment remains preference. | Prioritize one complete, identified C172 cockpit before later glass/airliner expansion. |

S1-derived descriptions above deliberately establish feature presence only;
they do not assert realistic avionics operation. Named indications in S1 are
conditional on the aircraft being equipped. “Not established” is a research gap,
not an assertion that current GeoFS cannot do it.

## Edition and data caveats

S3 distinguishes free lower-resolution imagery, AI-enhanced imagery and paid HD.
It explicitly warns enhanced imagery can invent details. Proposal: visual imagery
must not become the authoritative runway/airport or obstacle dataset. S2 contains
both METAR wording and older OpenWeatherMap wording; the active provider and exact
weather processing were not verified. Do not promise live-weather equivalence.

S4 confirms mobile browser use and a native wrapper, but does not settle sensor
permissions, orientation calibration or supported mobile-browser combinations.
Those require device testing. Desktop GeoFS, beta, PRO, native apps and community
extensions must not be pooled into an undifferentiated feature baseline.

S5 explicitly describes Autopilot++ as unofficial. Its existence is evidence of
an extension ecosystem, not proof that added modes are built in or currently work
on every GeoFS version. No scripts or imagery substitutions were installed; addon
availability does not authorize reuse or a bypass of imagery subscriptions.

## Original community observations

This is a small convenience sample, not a survey. Reports are anecdotes and
historical/version-specific; do not turn them into prevalence estimates or
reproduced present-day defects. Exact Reddit dates are unavailable in the reader,
so no calendar dates were inferred from relative labels.

1. **Radio discoverability (S8; date shown “2y ago”).** A user cannot understand the
   radio interface; replies mix route planning and VOR/ILS explanations. Proposal:
   test whether a beginner can distinguish COM from NAV, find tuning controls and
   understand the indication without relying on an addon or forum explanation.
2. **Control of practice conditions and feedback (S9; “4mo ago”).** Participants
   discuss separate time/weather controls and landing feedback/callout addons.
   Some discuss unofficial imagery replacements. Proposal: reproduce the weather,
   time and initial state of a drill, and provide criterion-based landing feedback.
   Claimed imagery quality/performance is not independently verified or a reuse plan.
3. **Lesson state detection (S10; 2025-06-15).** A FlightGear user reports that a
   parking-brake tutorial step will not advance. A respondent identifies broken
   tutorials/forthcoming fixes and recommends checklists. Proposal: test exercise
   triggers against actual cockpit state, allow clear recovery/restart and keep
   checklist access usable when a lesson cannot progress. This does not establish
   the defect remains in current FlightGear.

Additional lead: a GeoFS autopilot-oscillation discussion appeared in search with
2026-10-18 comments, but the original page could not be retrieved. It is **not** an
accepted defect finding and did not determine requirements. Follow up through a
retrievable original issue and versioned reproduction before using it as evidence.

## Pressure references and collision-avoidance terminology

S6 distinguishes QNH's elevation reference from QFE's aerodrome-pressure reference;
standard pressure is 1013.25 hPa / 29.92 inHg. Proposal: retain hPa/inHg units,
setting, source time/station, airport elevation datum, indicated/reference altitude
and scenario pressure model independently. Test reference changes and deliberate
setting errors; avoid treating geometric map altitude as a barometric reading.

S6 distinguishes the ACAS concept/standard from implementations such as TCAS II;
they are not two unrelated feature buckets. Section 8.7 explains that collision
avoidance uses standard pressure altitude independently of the selected cockpit
barometer reference. Proposal: select actual equipment and behavior only when the
aircraft/training scope calls for it; a basic traffic icon is not TCAS validation.
This note provides product terminology, not operating instructions or an equipage
compliance assessment.

## Data dependencies and recommendations

Weather/NOTAM briefings require provider rights, coverage, timestamps, validity,
station/runway association, stale/unavailable behavior and reproducible snapshots.
S11 is a research candidate for METAR/TAF, not a chosen European briefing service.
NOTAM providers, completeness and redistribution remain unresearched decisions.
Real identifiers alone do not establish current chart/procedure or navaid data.
Generated teaching maps must identify their generated presentation and whether the
underlying data is real, historical or synthetic. They remain internally consistent
with the simulated airport, fixes, runway geometry, elevation and navigation signals.

Recommend a classic C172 exercise first with visible usable instruments, pressure
reference, checklist and recorded debrief; then deepen briefing, communication and
navigation exercises. Keep ILS as a separately scoped capability/objective rather
than inferring all instrument training belongs to initial PPL acceptance. Preserve
glass-cockpit and collision-avoidance goals for later compatible aircraft/system
scope. This ordering is a proposal for product/orchestrator, not a user decision.

Rights: no source text, aircraft code, charts, imagery or manuals were copied into
runtime assets. Source applicability and exact permissions need review before
reuse; S5's GPL notice and S6's stated reuse restrictions must not be generalized
to unrelated assets. FlightGear graphics/interaction were not benchmarked.

Review outcome: suitable to refine comparator language and requirements; insufficient
to accept a flight model, cockpit, chart dataset, live briefing or lesson behavior.
