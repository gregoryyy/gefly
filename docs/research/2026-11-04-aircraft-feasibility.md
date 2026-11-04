# Aircraft feasibility: realistic dynamics and complete cockpits

Research checked 4 November 2026. Scope: the requested aircraft as possible future
Gefly integrations, including real controls, instruments and flight dynamics.
This is a source/data feasibility study; no aircraft has been implemented or
validated. The selected C172S-first, FR172-next scope remains unchanged.

## Findings

**Several are credible browser-native projects, but no researched package supplies
both proven full-envelope dynamics and a complete, rights-cleared cockpit ready
for Gefly.** Reusing JSBSim and applicable open systems is practical. The missing
work differs markedly by aircraft: glider launch/soaring dynamics, electric
propulsion, aerobatic post-stall dynamics, or airliner system integration.

The table gives engineering judgments about relative feasibility, not measured
effort or an implementation commitment. Detailed source links, variant boundaries
and rights findings are in the three supporting notes:
[light aircraft](2026-11-04-light-aircraft-feasibility.md),
[gliders](2026-11-04-glider-feasibility.md), and
[airliners](2026-11-04-airliner-feasibility.md).

| Aircraft / configuration to investigate | Dynamics and documentation starting point | Cockpit work and decisive gap | Assessment |
| --- | --- | --- | --- |
| **Pipistrel Velis Electro / Virus SW128** | Manufacturer/regulator documents and operator-hosted POH; actual Velis JSBSim FDM and electrical/BMS code inside FGAddon AlphaElectro. GPLv2-or-later grant; FDM marked ALPHA. | EPSI 570C, battery/power enabling, propulsion lever, cooling and annunciations; actual radio/EFIS fit. Need quantitative battery, motor, controller and thermal maps plus fault behavior. | Strong electric-aircraft investigation; useful reuse, substantial energy/thermal validation. Alpha Electro itself is a different type. |
| **Schleicher ASK 21, pure glider** | Manufacturer manuals/technical notes/polar; FlightGear JSBSim and YASim variants. Explicit GPLv2-or-later; JSBSim model ALPHA/Aeromatic-derived. | Actual front/rear panel fit, airbrakes, trim, tow release and optional serial-dependent spin ballast. Need launch, stall/spin and control-response evidence. | Best first glider candidate. A polar alone does not validate handling. |
| **LS4, exact -a/-b and tank fit to select** | DG/EASA material and separate FlightGear LS4-a/-b JSBSim files. Current applicable manuals and exact license grant still need resolving. | Retractable gear, airbrakes, release, trim, water ballast and fitted vario/computer/radio. Configuration/CG-dependent data required. | Promising after shared glider systems; do not combine variants or fin-tank options. |
| **Original Grob G103 Twin Astir** | Typeholder/regulator records establish configuration and manual status. Available FlightGear G103 instead references Twin II documentation. | Original aircraft's panel, retractable gear, ballast and launch controls require applicable manuals and geometry. | Feasible, weaker exact-model starting point. Twin II is not an accepted substitute. |
| **Extra 330SC / EA300/SC** | Official specifications/manual catalog; no exact source-and-license-verified open package established here. | Single-seat fit, engine/propeller controls and inverted systems. Need high-angle-of-attack coefficients, inertia, gyroscopic coupling and spin/snap-roll evidence. | Simple panel relative to airliners; exceptionally demanding full-envelope dynamics. |
| **Extra 330LX / EA300/LC** | Separate manufacturer configuration and manuals; not the SC with a second seat added. | Tandem controls, loading/inertia and fitted systems; same aerobatic data challenge. | Separate integration and validation from the SC. |
| **Pitts S-1S** | Aviat specifications/publication catalog; establish certified or one documented amateur-built configuration. Open S-1C is not an exact match. | Engine/propeller/rigging/panel vary. Tailwheel handling, biplane interaction and inverted/post-stall dynamics need dedicated evidence. | High aerodynamic risk despite a small cockpit. Do not substitute S-1T constant-speed data. |
| **PA-28-161 Warrior II** | Applicable manufacturer-authored POH and upstream FlightGear Warrior model/systems. Exact GPLv2-or-later permission and asset rights unconfirmed. | Familiar PPL instruments/radios, fuel, carb heat, electrics, manual flaps and stabilator/anti-servo trim. Need calibrated stability/control and propulsion data. | Most straightforward additional powered trainer relative to current Gefly architecture, subject to rights/data audit. |
| **PA-28R-201 Arrow III** | Separate POH, engine and equipment configuration; exact reusable package not established here. | Adds constant-speed propeller, fuel injection, retractable gear/electrohydraulics and emergency/warning logic. Automatic-extension fit is serial-specific. | Practical later complex-aircraft project; not a Warrior skin. |
| **737-800 NG / PMDG** | Mature proprietary MSFS product, not a reusable open model. Generic upstream JSBSim 737 admits guesses and has unresolved no-sale wording. | Entire overhead, pedestal, autoflight, FMS, electrical/hydraulic/pneumatic/failure integration. Retail use/redistribution terms exclude the intended integration/training route without agreement. | Long-term independent implementation or negotiated partnership; buying the add-on does not supply Gefly's dataset. |
| **A320 ceo / Fenix; A320neo / FlyByWire** | Fenix is proprietary ceo; A32NX targets A320-251N LEAP neo and offers GPLv3 systems code. Different aircraft standards. | FBW original 3D assets are CC BY-NC, Microsoft dependencies have separate terms. Port/rework MSFS interfaces and produce compatible assets; validate control laws and systems. | A32NX is the strongest named open airliner code lead, not a turnkey browser aircraft. Fenix requires an agreement. |
| **MD-82/83/88 / Leonardo Maddog** | Vendor describes multiple MD-80 variants, engines and avionics options; no public source/redistribution grant established. | Select one engine/panel fit; detailed autoflight, engine, electrical, pneumatic and failure systems. SDK access and intended-use rights remain unknown. | Long-term partnership or independent program; no cleared browser reuse established. |

## What realistic means for this work

An AFM/POH can establish limitations, procedures and performance reference points.
It normally cannot uniquely identify inertia, stability derivatives, control
effectiveness, unsteady stall/spin behavior, propeller off-design response or gear
contact dynamics. Matching cruise speed and stall speed is insufficient evidence
for realistic transients. Manufacturer data, published applicable test reports or
instrumented measurements are needed where those inputs remain unknown.

Likewise, a cockpit photograph establishes layout, not every system state.
For each chosen serial/configuration, collect the equipment list, applicable AFM
and supplements, instrument/radio/autopilot manuals and system schematics. Model
each fitted control's effect, buses and dependencies, indicated values, flags,
delays and defined failures. Create original panel artwork; public access to a
manual or screenshot does not itself permit redistributing its illustrations.

Reuse and fidelity are separate questions. For example, the official
[JSBSim 737 source](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/737/737.xml)
explicitly describes guessed inputs and limited validation. Its presence in the
engine repository does not establish an accurate 737NG. FlightGear's XML models
may help; its Nasal/Canvas systems need adaptation to Gefly's deterministic worker
and browser instruments.

The commercial products are references or potential partners. Current
[PMDG](https://pmdg.com/end-user-license-agreements/) and
[Fenix](https://fenixsim.com/assets/docs/2024-terms-and-conditions.pdf) retail terms
restrict intended training/educational use and reuse. A licensed external Windows
simulator bridge would still require permission and demonstrated API coverage;
it would also add prerequisites beyond Gefly's browser/Mac baseline.
[FlyByWire's own licensing guidance](https://www.flybywiresim.com/licenses/)
separates GPL code, noncommercial 3D assets and Microsoft content. Audit each
component rather than treating the complete aircraft as uniformly reusable.

Browser inputs can reproduce control commands and indication logic. Authentic
control forces require appropriate force-feedback hardware; keyboard/touchpad
operation cannot reproduce them physically. No training credit or quantitative
fidelity has been demonstrated by this study.

## Recommended next investigation

After the current C172 work, shortlist **Warrior for another powered trainer,
ASK 21 for gliding, and Velis for electric flight**. These offer distinct useful
training capabilities and the clearest documented reuse leads. LS4 and Arrow can
follow shared systems; reserve aerobatics for access to suitable test data and
specialist pilots. Investigate A32NX separately as a substantial airliner effort.

For whichever candidate is selected, the next useful deliverable is one flying
configuration with a real panel, sourced normal-operation behavior and explicit
limits. Obtain the applicable document set and reuse permissions, identify
unknown coefficients, and compare independent performance and response cases
across mass/CG and configurations. Add abnormal or aerobatic regimes only as
their evidence improves. No additional aircraft implementation is selected by
this research.
