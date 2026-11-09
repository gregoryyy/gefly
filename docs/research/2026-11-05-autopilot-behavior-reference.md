# Autopilot behavior diagnostic: source reference

Researcher: Codex subagent `ap_reference`, 2026-11-05 02:09 Europe/Berlin
(clock observation `2026-11-05 01:09:09 UTC`). Status: complete bounded source
research; runtime correctness and installed-aircraft fidelity are not evaluated
by this note. Scope: R-AP-1/R-AP-2 and the user's request to check HDG/NAV,
altitude selection/ARM/VS and CWS behavior before considering improvements.

No dedicated deep-research skill/service is available in this session. The
structured primary-source fallback rechecked publisher/version/applicability,
reused hash-verified local manuals, extracted the relevant pages with PyMuPDF,
and visually inspected consequential two-column and supplement pages using the
read-only PDF skill. Web retrieval checked current source availability and an
independent manufacturer-authored CWS description. No third-party tutorial or
other simulator was used as an operating authority. Earlier research remains
available in [the KAP 140 survey](2026-11-03-kap140.md) and
[the climb/CWS follow-up](2026-11-04-kap140-climb-cws.md).

## Sources, inspection and applicability

Source access date: 2026-11-05; retrieval checks completed at 02:10 Europe/Berlin.
The sources
are historical manuals, not current operational guidance or a serial-specific
approved flight manual for an identified aircraft.

| ID | Publisher, title, revision and access | Inspection and applicability |
| --- | --- | --- |
| K1 | Honeywell, *KAP 140 Pilot's Guide*, 006-18034-0000, Rev 2, May 2002. [Original manufacturer URL](https://www.bendixking.com/content/dam/bendixking/en/documents/document-lists/downloads-and-manuals/006-18034-0000-KAP-140-Pilots-Guide.pdf); [manufacturer-authored PDF mirror](https://www.oroca.com/Group%206/documents/KAP%20140%20Pilot%20Guide.pdf). | Manufacturer URL again redirects to the Honeywell homepage. Web fetch of the mirror fails because the PDF exceeds its size limit. Reused `/tmp/gefly-kap140-rev2.pdf`, 137 pages, SHA-256 `33cac0ac595ef15d2c51f5f64351dad18311f3e66b87c1d1a645de64ab49b438`, matching previous research. Text inspected on printed pp.3,13-14,83-89; images newly rendered/inspected on pp.84,86,89 (PDF pages 92,94,97). Applies to two-axis/altitude-preselect logic; pp.83/86 carry Rev 2 May 2002, pp.3/84-85/87-89 Rev 1 April 2002. Page86 explicitly refers lateral behavior to the single-axis descriptions; p.13 is Rev 2. |
| C1 | Cessna, *172S Information Manual*, reprint 172SPHUS Rev 5; Supplement 15, *Bendix/King KAP 140 2 Axis Autopilot*, 172SPHUS-S15-05 Rev 5, 4 June 2003. [Cessna-authored club-hosted PDF](https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf). | Web fetch exceeds its size limit. Reused `/tmp/gefly-c172s-poh.pdf`, 499 pages, SHA-256 `420dbdaf5517a7a005cde8938ac359678bcfe52863e8efd4f55fcdbf29ec429f`, matching previous research. Text inspected S15-1-2,5,8-14,25-30,32; images newly inspected S15-13/27 (PDF pages 381/395). Supplement applies 172S8348 and on when fitted; equipment/software qualifications below remain essential. |
| D1 | Diamond Aircraft, DA40/DA40F AFM Supplement A13, KAP140, Doc.6.01.01-E/6.01.02-E, Rev 2, 15 March 2005. [Manufacturer-authored public mirror](https://sivek.se/wp-content/uploads/2023/03/Bendix-cap140-autopilot-60101e-A13-r2.pdf). | Web-parsed PDF checked, especially printed9-A13-36 (PDF page 37/index 36). Web screenshot retrieval failed with cache miss; the previously retained `/tmp/gefly-kap140-diamond-cws.png` was visually re-inspected and agrees with the freshly retrieved text. This is a different aircraft installation and cannot establish C172S CWS fit. No fresh PDF byte hash is claimed. |
| K2 | Honeywell guide Rev 3 November 2005, [public transcription](https://studylib.net/doc/28042132/006-18034-0000-kap-140-pilots-guide). | Web-checked revision history and heading-shortest-turn text as a cross-check only. Rev 3 history identifies a direction-word correction on p.116; it does not announce new behavior for the inspected control pages. This does not authenticate the transcription or replace K1 PDF evidence. |

All underlying manuals are copyrighted. Public mirrors do not establish
redistribution permission. No PDF, diagram, page image, OCR or proprietary manual
excerpt is added to tracked source or a peer packet; this note contains original
factual paraphrases. Original units are degrees, feet, feet/minute, seconds and
inHg/hPa. No servo gains, capture tolerances or aircraft coefficients were
extracted or invented.

## Mode semantics relevant to the reported behavior

The principal distinction is between an active hold reference, a selected future
capture altitude, and an armed capture. They do different jobs even when the
shared numeric display shows only one of them.

| Reported operation | Source-backed interpretation | Exact source location |
| --- | --- | --- |
| Press physical AP | Engage wings-level ROL and capture current vertical speed into VS. This does not select HDG or ALT. | K1 pp.83,86; C1 S15-8,26. |
| Select HDG | Follow the existing external heading bug, rather than capture the present heading. Turns take the shortest direction to that selected heading; moving the bug updates the commanded heading. | K1 pp.13,83, with p.86 lateral cross-reference; C1 S15-9,29. |
| Select ALT | Hold the pressure altitude present when ALT was pressed. It does not mean climb to the number in the altitude-preselect display. | K1 pp.84,87; C1 S15-9 defines the captured altitude as the aircraft altitude at button press. |
| Change selected altitude while AP is engaged | Arm capture automatically. The selector is also an independent altitude-alert reference; editing it does not itself command a climb/descent or replace ALT hold with VS. | K1 pp.84-85,89; C1 S15-12-13,27. |
| Press ARM | Toggle preselect capture on/off. Capture is conditional on climbing/descending in VS toward the selected altitude. Automatic selection arming and a separate explicit ARM toggle must be distinguished. | K1 p.85; C1 S15-13,27. |
| Leave ALT to change altitude | ALT toggles from ALT hold into VS using the current vertical speed; UP/DN then changes the commanded climb/descent rate. | K1 p.86. |
| First UP/DN after VS display expired | Reveal the VS command without modifying it. Subsequent immediate taps change 100FPM; continuous hold changes approximately 300FPM/s. The VS page lasts three seconds after VS selection/adjustment. | K1 pp.84-86; C1 S15-10,13 corroborates rate increments/display duration. |
| UP/DN while ALT is active | Taps move the hidden hold reference 20ft each. Holding requests approximately 500 FPM up/down; release adopts actual altitude. The displayed selected altitude remains a separate reference. | K1 pp.84,87; C1 S15-10,28. |
| Reach selected altitude while capture is armed | Capture transfers into ALT and clears ALT ARM. GS coupling precludes altitude-preselect capture. | K1 p.89; C1 S15-13,27-28. |

Consequently, ALT continuing to hold the old altitude while a different target is
selected is consistent with these controls. The separate ALT-to-VS transition is
also documented. A numeric target entry that itself activates ALT would require
separate runtime investigation: numeric text entry is a simulator interaction,
not a physical KAP140 control. The research does not establish that it occurs.

**Inference from the mode descriptions:** with capture disarmed, VS has no
selected-altitude level-off instruction and may continue beyond that altitude.
That alone does not establish an uncontrolled servo. Rate error, direction,
stability and available aircraft performance require independent measurement.
C1 S15-27 gives a VS command range of -2000 to +1500FPM and requires achievable
performance for power/weight. K1 p.86 and C1 S15-26 describe loss of airspeed/stall
risk when VS demand exceeds capability. These are not evidence of automatic
airspeed protection in this fit.

C1 sometimes calls the ALT-button capture the selected altitude, which can be
misread as the preselector. S15-9 explicitly defines it as altitude at button
press; S15-13 separately defines the alerter-selected capture altitude. K1 p.84
further states that the ALT hold reference is not displayed. These passages
resolve the terminology without silently merging the two targets.

## HDG/NAV and installation differences

K1/C1 distinguish software generations. For KAP140 software 03/01 onward, AP
activation requires a physical press lasting at least 0.25 s; older software also
allowed HDG/ALT to engage AP. C1 S15-8-9/26 assigns later behavior to 172S9129 and
on, and earlier 172S8348-9128 with KC140-M1. A source comparison must not mix
these generations. The project's browser-click representation of that press is
an existing simulator convention in [R-AP-1](../SPEC.md).

NAV can follow VOR/LOC/GPS only when that signal is the coupled navigation source
presented on the relevant CDI/HSI (K1 p.84; C1 S15-9). A bearing pointer aimed at
a waypoint does not itself provide this guidance. With the C172 DG, OBS selects
course and the DG bug must also agree with that course; after NAV selection HDG
flashes for five seconds as a reminder. Selecting NAV from HDG establishes a 45 degree
intercept using that course datum; selecting from ROL permits the established
intercept. HSI instructions instead separate course pointer from heading-bug
intercept. C1 S15-11,29-30. Thus an unexpected NAV turn can come from course/bug
setup, source validity or implementation; this reference does not decide which.

The later KLN94 roll-steering installation is explicitly serial/equipment/wiring
scoped in C1 S15-5 (172S9423 onward). It is not proof that arbitrary map waypoints
automatically become KAP guidance. Gefly's current [recorded GPS-dial scope](../GAPS.md)
retains NAV1 radio AP guidance; GPS direct-to/plan-to-bearing presentation is
separate. This is a project scope statement, not a claim that KAP140 lacks GPS
capability.

## CWS and simulator-only interactions

K1 p.3 lists CWS as optional; p.86 describes the VS display during CWS, but the
guide does not fully define clutch/release behavior there. D1 9-A13-36 states
that holding CWS releases pitch, roll and pitch-trim clutches for manual flight;
release synchronizes ALT or VS to actual altitude or vertical speed. The control
is on the pilot's stick. C1 describes A/P DISC/TRIM INT and manual electric trim,
and prohibits hand-flying against engaged AP (S15-10,14,26); its inspected
supplement does not establish a CWS-equipped selected 172S installation. Absence
of a CWS text search result is not proof no 172S could ever have CWS.

Physical hold behavior therefore has a source, while using the same desktop
pointer to hold an on-screen CWS button and steer a touchpad is a separate
simulator usability question. Neither manual defines browser pointer capture,
touchpad gestures or keyboard interaction. Actual mode retention, pointer
delivery, release synchronization and usable simultaneous control need the
runtime diagnostic. Generic CWS semantics do not validate installed172S servos.

[R-AP-2](../SPEC.md) defines **A** as a simulator convenience: capture a single
current heading/pressure-altitude snapshot into HDG/ALT, coherently update the
bug/preselector, and disconnect on a subsequent press. That combination is
intentionally different from physical AP engagement into ROL/VS. It is not a
manufacturer keyboard shortcut. This note records the existing contract and does
not assert the browser/worker currently satisfies it.

## Handoff and limits

Confidence is high for the inspected manual's discrete mode semantics and the
distinction between held and preselected altitude. Confidence is conditional on
software/aircraft fit. Exact selected 172S CWS fit, original servo response,
capture anticipation and controller calibration remain unverified. No source here
establishes browser usability, a real defect in the reported flight, training
credit or regulatory acceptance.

Quality owns actual native HDG/NAV trajectory diagnosis; validate owns vertical
capture and trusted-input CWS diagnosis. Compare their observed mode/target/time
series with these source conditions, keeping physical AP separate from A and
GPS-bearing presentation separate from the coupled navigation source. This
research proposes no UI or flight-control change. Product/orchestrator own any
later requirements or improvement decision. Only this new research path was
authored; shared SPEC/GAPS/TODO/DONE and production code remain outside this
assignment.
