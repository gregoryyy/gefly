# Cessna 172S engine/fuel indications and sample loading (S17 Sections 2, 6, 7)

Status: focused source extraction. Every value was **verified** on a rendered page image
of the cited POH copy. Not an instrument model, not a weighed aircraft, not a validation
and not a training-credit assessment.
Researcher: Claude Code subagent in the researcher role, dispatched by the orchestrator.
Accessed: 2026-11-02, Europe/Berlin.
Scope: user decision 2026-11-02 (GAPS entry pending): (a) every engine and fuel indication
of the classic-panel 172S (172S9491–172S9809) joins the worker-computed `ind` state;
(b) empty mass/CG come from the POH sample loading example, labelled as a sample.
Follow-up user decisions 2026-11-02 07:36 (GAPS entry pending; input record
`docs/input/2026-11-02-s17-lists-electrical-tach.md` on the records branch): the whole
Figure 2-3 and Figure 6-3 lists are accepted as an exception (GAPS Q5); the ammeter and
VOLTS annunciator are included in `ind`; the Figure 2-3 tachometer arcs govern.
SCENARIO-CONTRACTS Q-S8; R-DATA-1, R-DATA-2, R-AIR-1. Output:
[`data/aircraft/c172s-classic/indication-loading-values.json`](../../data/aircraft/c172s-classic/indication-loading-values.json)
with [its schema](../../data/schema/indication-loading-values.schema.json).

## Source and method

| ID | Document | Revision | Pages read | Page revision marks |
| --- | --- | --- | --- | --- |
| S17 | Cessna Model 172S Information Manual, reprint of POH/AFM 172SPHUS ([befa.org copy](https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf)) | 172SPHUS Rev 5, 19 Jul 2004 | 2-5, 2-6; 6-3, 6-4, 6-6, 6-8, 6-9, 6-12, 6-13; 7-9, 7-10, 7-11, 7-19, 7-20, 7-21, 7-24, 7-25, 7-26, 7-32, 7-34, 7-35, 7-45, 7-46 | 2-5, 2-6, 6-6, 7-9 to 7-11, 7-19 to 7-21, 7-25, 7-32 to 7-35, 7-45: "Revision 4"; 7-24: "Revision 5"; 6-4, 6-8, 6-9, 6-13, 7-26: "July 8/98"; 6-12, 7-46: "May 30/00" |

The PDF was downloaded again (SHA-256 prefix `420dbdaf5517a7a0`, identical to the
registered copy), located with `pdftotext -layout`, and each cited page was rendered with
`pdftoppm` (110–170 dpi) and read visually. All values are printed numbers
(`reading: tabulated`); none was read off a graph. The markings are in Section 2
(Figure 2-3), which Section 7 names as the authority for engine limits and markings
(p. 7-19); Section 7 gives the panel items, sensors and annunciator triggers.

## Findings: engine and fuel indications

Panel items are from Figure 7-2 (pp. 7-10/7-11). Units: SI field unit, then as published.
No yellow arcs appear in Figure 2-3 for any powerplant instrument.

| Proposed `ind` field | Instrument (panel item) | Kind | Markings (S17 p. 2-6, Figure 2-3 unless noted) | Other cited facts |
| --- | --- | --- | --- | --- |
| `tach_prop_radps` | Tachometer, mechanical (10) | gauge | green 2100–2500 rpm SL, 2100–2600 rpm 5000 ft, 2100–2700 rpm 10,000 ft; red line max 2700 rpm (also p. 2-5) | 100 rpm graduations; engine and propeller speed (p. 7-20). Figure 2-3 arcs **govern** (user decision 2026-11-02 07:36); p. 7-20 says green 1900–2400 rpm, kept as a recorded conflict |
| `tach_time_s` | Hour meter in the tachometer dial (10) | counter | none | Engine time in hours and tenths (p. 7-20); counting rule TBD-src |
| `hobbs_time_s` | Hour (Hobbs) meter (23) | counter | none | Runs when oil pressure > 20 psi via the low oil pressure switch (p. 7-20) |
| `oil_press_pa` | Oil temperature/oil pressure indicator, pressure side (1) | gauge | red line min 20 psi; green 50–90 psi; red line max 115 psi (min/max also p. 2-5) | Transducer to LH-panel gauge (p. 7-20); stored as gauge pressure |
| `oil_temp_k` | Same indicator, temperature side (1) | gauge | green 100–245 °F; red line max 245 °F (p. 2-5 also 118 °C) | Resistance-type probe (p. 7-20) |
| `egt_k` | EGT/fuel flow indicator, EGT side (4) | gauge | none | Tailpipe thermocouple (p. 7-21); manual peak index pointer (p. 7-20); unit and scale not stated |
| `fuel_flow_m3ps` | EGT/fuel flow indicator, fuel flow side (4) | gauge | green 0–12 gal/h; no red lines | S17: a transducer near the fuel manifold measures fuel pressure, translated for the indicator in gal/h (p. 7-25). *Inference, not stated:* the display is a pressure-derived flow, not a direct flow measurement |
| `fuel_qty_left_m3`, `fuel_qty_right_m3` | Fuel quantity indicator, L/R (3) | gauge | red line at 0 (about 1.5 gal unusable per tank, also p. 7-25) | Float transmitters, electrical; gallons; unreliable in skids/slips; needle to OFF below 0 on a transmitter fault (p. 7-25). Full tank 28.0 gal (Figure 7-5, p. 7-24) |
| `vac_suction_pa` | Vacuum gage, part of vacuum gage/ammeter (2) | gauge | green 4.5–5.5 inHg (also p. 7-45) | May read 4.0 inHg at 20,000 ft and be adequate (p. 7-45) |
| `ammeter_a` (electrical, included 2026-11-02 07:36) | Ammeter, part of vacuum gage/ammeter (2) | gauge | none | Battery charge/discharge current (p. 7-34) |

Annunciators (panel item 13; flash about 10 s, then steady; the pilot cannot turn them off, p. 7-32):

| Proposed `ind` field | Message, colour | Trigger (cited) |
| --- | --- | --- |
| `ann_oil_press` | OIL PRESS, red | oil pressure below 20 psi at the low-pressure switch (pp. 7-19, 7-20) |
| `ann_low_fuel_left`, `ann_low_fuel_right` | L LOW FUEL / LOW FUEL R (both: L LOW FUEL R), amber | tank below about 5 gal for more than 60 s, or a transmitter fault (p. 7-25) |
| `ann_vac_left`, `ann_vac_right` | L VAC / VAC R (both: L VAC R), amber | pump output below 3.0 inHg (p. 7-45) |
| `ann_volts` (electrical, included 2026-11-02 07:36) | VOLTS, red | system voltage below 24.5 V (p. 7-35) |

**Serial dependence inside 172S9491–172S9809.** None found for these indications. The
fuel return system applies from 172S9491 (p. 7-24; whole range), the electrical schematic
titled for 172S8704 and on applies to the whole range (figure title read from the text layer only, Figure 7-7A), and the annunciator switch
labels change between "earlier" and "later serial number airplanes" (DIM/BRT or DAY/NIGHT,
TST or TEST, p. 7-32) without a stated serial break (TBD-src).

## Findings: sample loading (a sample, not a weighed aircraft)

Figure 6-5 sheet 1 (p. 6-12), "sample airplane" column, is a worked example. S17 says the
actual weight, arm and moment of each aircraft are in its own records (p. 6-3), entered
in the "your airplane" column (p. 6-6). These numbers describe no real aircraft.

| Value | Published | SI | Citation |
| --- | --- | --- | --- |
| Basic empty weight (includes unusable fuel and full oil) | 1642 lb | 744.7987 kg | p. 6-12, Figure 6-5 |
| Basic empty moment | 62.6 lb-in/1000 | 721.230 kg·m | p. 6-12, Figure 6-5 |
| Basic empty arm (**derived**: 62,600 / 1642; reading `derived`) | 38.124 in (about ±0.04 in from rounding of both moment and weight) | 0.96836 m (SI moment / SI mass; validator recomputes it within ±0.001 m) | derived from p. 6-12 |
| Datum | Station 0.0, firewall front face, lower portion | — | p. 6-4, Figure 6-1 |
| Usable fuel arm | 48.0 in | 1.2192 m | p. 6-9, Figure 6-3 note 1 |
| Pilot/front passenger | 37 in (range 34–46) | 0.9398 m (0.8636–1.1684) | p. 6-9, Figure 6-3; range also p. 6-12 |
| Rear passengers | 73 in | 1.8542 m | p. 6-9, Figure 6-3 |
| Baggage area 1 | 95 in (stations 82–108) | 2.413 m (2.0828–2.7432) | p. 6-9 (95, 108), p. 6-12 (82–108) |
| Baggage area 2 | 123 in (stations 108–142) | 3.1242 m (2.7432–3.6068) | p. 6-9, Figure 6-3; p. 6-12 |
| Sample fuel weight | 6 lb/US gal | 718.9586 kg/m³ | p. 6-12, Figure 6-5 item 2 |

The 38.124 in empty arm lies on the S17 fuselage-station datum; the mapping to the JSBSim
structural frame is a model task (CONTRACTS §1, [datum note](2026-11-01-jsbsim-datum-172s-controls.md)).

## Rights and extraction shares

S17 is `facts_only`. Nothing of the Cessna text, tables or figures is copied; values are
stored as individual cited facts with notes in our own words. Shares:

| Item | Extracted | Share |
| --- | --- | --- |
| Figure 2-3, powerplant instrument markings | all 20 printed numbers | **whole table** (numbers) |
| Figure 6-3, loading arrangements | all 9 station numbers | **whole figure** (numbers) |
| Figure 6-5 sheet 1, sample column | 2 of 18 numbers used (2 more cited only as a conflict) | 11 % (22 %) |
| Figure 6-5 row labels (station ranges, 6 lb/gal) | 5 numbers | — |

Figures 2-3 and 6-3 are short lists of limitation markings and fuselage stations; each
number is a fact needed to draw a gauge or locate a load. Taking all of them **exceeds**
the "no whole table" limit of the 2026-11-01 extraction. The user accepted both lists as
cited facts as an **exception for these two lists only** (GAPS Q5, decision 2026-11-02
07:36); the exception does not extend to any other table or figure.

## Proposed `ind` field order (append to the declared list)

After the existing `tach_prop_radps`, in this order (engine, then fuel, then engine-driven
systems, then annunciators, then the electrical pair included on 2026-11-02 07:36):

1. `tach_time_s` (float64, s)
2. `hobbs_time_s` (float64, s)
3. `oil_press_pa` (gauge pressure)
4. `oil_temp_k`
5. `egt_k`
6. `fuel_flow_m3ps`
7. `fuel_qty_left_m3`
8. `fuel_qty_right_m3`
9. `fuel_qty_left_off` (uint32 0/1, needle at OFF on a transmitter fault)
10. `fuel_qty_right_off` (uint32 0/1)
11. `vac_suction_pa` (positive suction)
12. `ann_oil_press` (enum off=0, flashing=1, steady=2)
13. `ann_low_fuel_left` (same enum)
14. `ann_low_fuel_right`
15. `ann_vac_left`
16. `ann_vac_right`
17. `ammeter_a` (charge positive, discharge negative)
18. `ann_volts` (same enum)

Needs, in CONTRACTS: new unit suffixes `_s`, `_m3`, `_m3ps`, `_a`; the annunciator enum
(the panel test switch, which flashes every message, is an input, not an indication).
The EGT index pointer is pilot-set state and stays outside `ind` until an input exists.
Any field added after `digest_layout` 1 code exists needs a major version.

## Unresolved (TBD-src)

1. Tachometer green arc: decided (Figure 2-3 governs); p. 7-20 (1900–2400) remains a
   recorded source conflict until a later 172SPHUS revision is checked.
2. Dial ranges (`scale`) of every gauge; EGT unit and scale; fuel gauge full-scale mark.
3. Hour meter counting rules (tach time against Hobbs time beyond the oil-pressure switch).
4. LOW FUEL threshold "about 5 gal": total or usable content not stated; fault detection
   criteria not published.
5. Annunciator switch-label serial break (p. 7-32).
6. Sample baggage-area-1 entry (56 lb, 4.6 ×1000 lb-in) implies about 82 in, not the
   Figure 6-3 arm of 95 in; not used.
7. Later 172SPHUS revisions for 172S9491–172S9809 (GAPS Q3) not checked.
8. Manifest `mass_limits.empty_mass` stays `unknown`; pointing it to the sample needs a
   manifest version bump and new pins in all three value files.
9. Clock/O.A.T./voltmeter (Section 9 supplement) not read.
