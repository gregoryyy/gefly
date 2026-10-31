# Foundation sources for progressive flight simulation

Status: initial research; decisions remain proposals.
Researcher: Codex subagent `researcher`.
Accessed: 2026-10-31 14:53 CET (Europe/Berlin), from the session clock.
Scope: bootstrap evidence for aircraft, avionics, physics, training and comparisons.

## Question and method

What authoritative references and existing products should inform Gefly's first
aircraft configuration, curriculum, web architecture and flight-model selection?

User direction received during research: Cessna 172 family, EASA PPL first, and a web
application similar to GeoFS. The specific C172 variant/year, avionics installation
and software revision remain open; CPL remains a later project goal.

Method: focused multi-source web research using regulator, manufacturer and project
websites. No deep-research skill or service was available in this session; no such
execution is claimed. This is an initial source survey, not a systematic literature
review, aircraft-model validation or a learning-outcome study. Facts below describe
the cited material; recommendations and implications are explicitly proposals.

## Source register

### S1 — EASA Aircrew rules

[Easy Access Rules for Aircrew](https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-aircrew),
October 2026 revision, published 2026-10-16.

Verified: EASA supplies PDF, online and XML editions of the consolidated rules and
AMC/GM. This revision includes Regulation (EU) 2026/781 and ED Decision 2026/006/R,
covering changes involving flight simulation training devices and their use.
Relevant next extraction: Part-FCL PPL(A) and CPL(A) training and skill-test material,
including FCL.210.A, FCL.235, FCL.315, FCL.320 and Appendices 3, 4 and 9 as applicable.
Those individual provisions have not been fully reviewed in this survey. Recheck
applicability dates and later amendments before adopting any specific requirement.
Proposal: pin a jurisdiction-specific curriculum edition; do not combine EASA and
FAA tolerances into a single unlabeled assessment. Free access alone does not settle
reuse rights for every illustration or third-party item.

### S2 — FAA private-pilot assessment

[Private Pilot for Airplane Category ACS, FAA-S-ACS-6C](https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf).
Cover/revision history: November 2023. The
[current FAA index](https://www.faa.gov/training_testing/testing/acs) lists publication
April 2024 and effectiveness 2024-05-31; index updated 2026-09-16.

Verified: the ACS combines knowledge, risk management and practical skills. Relevant
areas include preflight, normal operations, navigation, slow flight/stalls, basic
instrument maneuvers and emergencies; Appendix 3 addresses simulator/device use.
Proposal: preserve the original task/element identifiers in exercise mappings and
separate maneuver scoring from broader knowledge and risk-management evidence.

### S3 — FAA commercial-pilot assessment

[Commercial Pilot for Airplane Category ACS, FAA-S-ACS-7B](https://www.faa.gov/training_testing/testing/acs/commercial_airplane_acs_7.pdf).
Cover/revision history: November 2023; the FAA index above lists publication April
2024 and effectiveness 2024-05-31.

Verified: Area V includes steep turns, steep spirals, chandelles, lazy eights and
eights on pylons; Area VII covers slow flight and stalls. Its knowledge/risk/skill
structure and aircraft-class applicability matter alongside numerical tolerances.
Proposal: CPL progression needs additional exercises, decision-making and aircraft
capability checks; greater physics detail alone does not constitute CPL coverage.

### S4 — FAA explanation of flight maneuvers

[Airplane Flying Handbook, FAA-H-8083-3C](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook).
Landing page updated 2022-03-29; chapter-specific revisions still need checking.

Verified: chapters cover basic maneuvers, energy management, upset prevention,
takeoffs, traffic patterns, approaches/landings, performance maneuvers and emergencies.
Proposal: use this for explanatory lesson structure, then resolve aircraft-specific
procedures and limits against the selected aircraft's applicable POH/AFM. A general
handbook is not a source of complete aerodynamic coefficients for a particular airframe.

### S5 — JSBSim flight-dynamics candidate

[JSBSim Reference Manual](https://jsbsim-team.github.io/jsbsim-reference-manual/),
site dated 2026-10-24; software release/commit not selected.

Verified: JSBSim describes itself as a data-driven, nonlinear six-degree-of-freedom
flight-dynamics application under LGPL. The manual covers reference frames, units,
forces/moments, controls/systems, configuration and equations of motion.
Proposal: evaluate it behind a flight-model interface with deterministic headless
fixtures, rather than treating a simulator engine as proof of aircraft accuracy.
Check the exact adopted version's license, linking/distribution obligations and
aircraft data licenses separately; neither engine availability nor an included model
establishes POH agreement or validation throughout the flight envelope.

### S6 — Garmin avionics reference candidate

[G1000 NXi Pilot's Guide, Cessna Nav III, 190-02177-02 Rev. A](https://static.garmin.com/pumac/190-02177-02_a.pdf).
Indexed cover identifies system software 2501.09 or later; publication date not verified.

Verified only from the indexed cover: document identity, installation family and
software applicability. The full 28.7 MB PDF exceeded the web reader's size limit;
its operational sections and copyright terms were not reviewed. No control sequence
or device behavior in Gefly should be accepted on this evidence alone.
Proposal: obtain and inspect the guide matching the chosen installation/software,
plus applicable aircraft supplements, before specifying individual controls/modes.
Record permission for copied graphics, text, databases and trademarks separately.

### S7 — Manufacturer aircraft configuration

[Textron Aviation Cessna Skyhawk](https://cessna.txtav.com/en/piston/cessna-skyhawk),
undated live product page; accessed as above.

Verified: the current page describes G1000 NXi avionics and GI 275 standby equipment,
lists optional features, and publishes aircraft dimensions and performance summaries.
The user selected the C172 family; its exact configuration remains open. Do not
apply current production equipment to older C172 variants or use marketing performance
figures as an unrestricted flight-model dataset. Applicable POH/AFM revision, serial
range, equipment list and supporting model data remain missing.

### S8 — Existing progressive training baseline

[Microsoft Flight Simulator: What Should I Do First?](https://www.flightsimulator.com/guide/what-should-i-do-first-in-microsoft-flight-simulator/),
Microsoft Flight Simulator Team, 2025-12-04.

Verified vendor description: MSFS 2024 includes beginner C152 lessons covering taxi,
takeoff, maneuvers, navigation and landing, plus virtual career progression through
PPL, CPL and other ratings. These are product features, not evidence that a learner
has earned a real-world certificate or that Gefly's approach improves learning.
Implication: progressive difficulty and flight lessons already exist; a claim that
Gefly introduces them would be unsupported.

### S9 — Existing simulation and debrief baseline

[X-Plane for Professional Use](https://www.x-plane.com/pro/),
undated live page; describes X-Plane 12.

Verified vendor description: replay, configurable failures and flight-model
visualization are available. The vendor distinguishes software features from
certification of an entire software/hardware system and commercial-use licensing.
Proposal: compare a tightly specified training task and debrief against a pinned
X-Plane configuration. Product marketing is not an independent accuracy measurement,
and this page does not determine any Gefly approval or training-credit entitlement.

### S10 — User-selected browser experience baseline

[GeoFS official site](https://www.geo-fs.com/), undated live page, accessed 2026-10-31;
the page advertises GeoFS 4.0 Beta.

Verified vendor description: GeoFS runs in a web browser without installation,
provides global scenery using Cesium, supports joysticks and radio navigation, and
deliberately simplifies controls and instruments for accessibility. It claims lift,
drag and stall simulation and aircraft performance matching; these are vendor claims,
not independently observed validation results. Proposal: use browser accessibility
and immediate flight as the experience baseline, while measuring Gefly's selected
aircraft controls, avionics and dynamics against applicable references. A similar
experience does not grant rights to GeoFS code, aircraft assets or imagery. Worldwide
scenery and multiplayer are separate scope decisions, not automatic first-release work.

## Synthesis and open work

The strongest proposed differentiation is a documented progression from explicit
simplifications to aircraft-specific fidelity, tied to source evidence and measured
learning outcomes. This is a hypothesis to evaluate, not an established market gap.

Product should narrow the selected C172 family to one configuration and scope the
EASA PPL curriculum. Research should build a source-to-behavior register for controls,
units, operating limits, instruments, avionics modes and representative performance
points. Physics calibration data and redistribution rights remain substantial gaps.

Before code implements real-aircraft claims, agree reference conditions, acceptance
tolerances and instructor review. Use simulator comparisons as baselines, not as
substitutes for aircraft evidence. Training-credit or device-approval ambitions need
a separate requirements track tied to the selected jurisdiction and device category.

Review outcome: suitable as a bootstrap source map; insufficient for accepting a
particular aircraft model, avionics implementation, syllabus or training efficacy claim.
