# Cessna 172S engine/fuel indications and sample loading (S17 Sections 2, 6, 7)

Status: focused source extraction. Every S17 value was **verified** on a rendered page image
of the cited POH copy; the `estimated` FlightGear values (S14, added 2026-11-02) were read
in the pinned repository files. Not an instrument model, not a weighed aircraft, not a validation
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
Follow-up user decision 2026-11-02 08:01 (GAPS Q23 update; input record
`docs/input/2026-11-02-flightgear-gaps-codex-deferred.md`): the S17 gaps follow the
FlightGear Cessna 172 model, labelled `estimated` and recorded as another variant
(see [FlightGear c172p estimates](#flightgear-c172p-estimates-s14)).
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

## FlightGear c172p estimates (S14)

Added 2026-11-02 by the researcher subagent (Claude Code) for the GAPS Q23 update of
08:01. These are **estimates from a simulator model of another variant** (Cessna 172P),
not 172S facts, and they never override a sourced S17 value.

### Source, pin and licence

| Item | Finding |
| --- | --- |
| Repository | [c172p-team/c172p](https://github.com/c172p-team/c172p), the development repository of FlightGear's default Cessna 172P (as in the [EDDF note S8](2026-10-31-eddf-open-foundation.md) and survey S14). The FGAddon copy was not compared. |
| Pin | `master` = `HEAD` = `63ba85273b7f44637eb4683dcdc8f97af7821653` (committed 2026-10-05, "Merge pull request #1608"), confirmed with `git ls-remote` on 2026-11-02; shallow clone in a scratch directory, nothing copied into this repository. |
| Licence | **GPL-2.0-or-later.** `LICENSE` is the verbatim GPL v2 text (SHA-256 `8177f975…`); `CONTRIBUTING.md` states "This project is licensed under the GPL version 2 or later" and that some files are CC-BY or CC0 (attributed in `Thanks`, all of which are sounds); 37 XML/Nasal files carry headers saying "version 2 of the License, or (at your option) any later version" (for example `EGT.xml`, © 2009 Torsten Dreyer); none says version 2 only or version 3. `Nasal/annunciator_panel.nas` says "(c) 2018 Benedikt Hallinger, public domain". Most other files used here carry no header, so the repository-level statement applies. |
| Correction | The [E1 engine-stack note](2026-11-01-e1-engine-stack-candidates.md) (E6, same commit) found "GPL-2.0 text, no 'or later' found" and rated c172p *possibly incompatible*; `CONTRIBUTING.md` and the headers above resolve the version as **or later**, which is compatible with the project's GPL-3.0-or-later. The JSBSim aero file `c172p.xml` still has no licence tag of its own. |
| Redistribution and use | GPL permits redistribution, but this extraction takes only numbers and behaviour descriptions in our own words, with file path and commit; no code, XML, Nasal, texture or other asset is copied. Manifest `rights.redistribution` is `facts_only`. Face textures were viewed to read their numerals; one (EGT) shows an instrument maker's logo, which is not used. |

Files read (the manifest `sha256_prefix` `b294b9c8a5c14917` is the SHA-256 of this exact
`sha256sum` listing, two spaces, LF line ends, in this order):

```text
4a7c773c903cf22c6da2cd28807fe2c48b4655eed3034dd4db5eaf1f710dd8e9  CONTRIBUTING.md
8177f97513213526df2cf6184d8ff986c675afb514d4e68a404010521b880643  LICENSE
f54adedb9e0dd382eeec9d7c56f1add433e7596c5ee11adc2727f2a012dd8f79  Models/Interior/Panel/Instruments/BatteryGauge/BatteryGauge.png
9dd304ba467dd9945a7ca56dd6339f1ec9d701222403a71d3e41337af06a3f37  Models/Interior/Panel/Instruments/BatteryGauge/BatteryGauge.xml
5f8bc20ccc28c1335f75658c30f1f075d739ca2bec6c8230f65d7cb3a15ae248  Models/Interior/Panel/Instruments/EGT/EGT.png
ef239dd05346a68db268c61c5bad56db8f75d718df5ad3ff4f3c3762181f0af5  Models/Interior/Panel/Instruments/EGT/EGT.xml
c68e551f55406d464172ac91088f0a6ce0aaba121545a88134451c25ee0a7e81  Models/Interior/Panel/Instruments/FuelOilAmps/c172fuel.xml
bae15d3a91eaf2ab5f9dadfe095adcf63d94ecbadcfc964518a65b371a4e2ee5  Models/Interior/Panel/Instruments/FuelOilAmps/c172oil.xml
ec41aeb5b89215ff798756ec3431015935effcb88ed1adc370b2212542ea42de  Models/Interior/Panel/Instruments/FuelOilAmps/fuel-oil.png
ab94efe5d2899cf0db25fbb31a1b222d279478a891fe2d06bacd76837f77f633  Models/Interior/Panel/Instruments/RPM/RPM.png
5868453fa4c06a8dd4e4055431cb20c95b85baedc7df7fc357e3820ccf886954  Models/Interior/Panel/Instruments/RPM/RPM.xml
8b0795b92bba647069ddcd7e51cf25d460aaa7a205e30dfaddd89883e56029cb  Models/Interior/Panel/Instruments/hobbs/hobbs.xml
8ab1a930ac1c058622ef216d6faa2fbe3305bc08aeb8e24dad8c3234d75c9a1d  Models/Interior/Panel/Instruments/vac/vac.png
61e7cdba0137405774a45525c8e295fc8a4eb1f323080f13338db7785be629e6  Models/Interior/Panel/Instruments/vac/vac.xml
b36b92a63ff18d7994d8342df84c1ccc5327b0e3b4a371308ce7b65bfa567914  Models/Interior/Panel/c172p-panel/c172p.xml
2a31e45014f4e14b434bacba1808e906dbd5e46e16ab881289b002a379160da8  Nasal/annunciator_panel.nas
50528159f3423f999af32ab38f4f490fd39045bc5dbac938f58d77064b47632b  Nasal/engine.nas
159f92d496e1f89adaa4c91e03013910b55bc73db8ffa79440fd7b58d7404707  Systems/instruments.xml
11cce08de2884d44677964dbeaed66068fd5d4d157cb535bb369d4d37fdb7d24  c172p-main.xml
2dd2b06f55609bf3fe6c75f80faab17adc49295cc635375663075d83b6d5b5ed  c172p.xml
```

Context only, not a registered source: FGData `Nasal/aircraft.nas` (`next` at
`bf48a45b077e6fdd5fc8e88371abfe084b567088`, 2026-10-29; file SHA-256 `e6be7939…`), whose
`aircraft.timer` adds `/sim/time/elapsed-sec` differences at a fixed interval, and FGData's
2D "C172-S RPM gauge" (`Aircraft/Instruments/rpm-c172s-digi-hobbs.xml`, 0–3500 rpm, a
digital `%07.1f` hour display), used only by the hidden 2D panel of c172p; its hour property
source was not traced.

### Values taken (all `estimated`, applicability 172P)

The classic 3D panel (`Models/Interior/Panel/c172p-panel/c172p.xml`, lines 760–873) uses
the gauges below. Ranges come from the needle interpolation tables, checked against the
numerals on the face textures.

| `ind` field | Estimated range or behaviour | FlightGear file (commit `63ba8527`) |
| --- | --- | --- |
| `tach_prop_radps` scale | 0–3500 rpm (0–366.5191 rad/s); face numbered 3–35 ×100 rpm; 0 rpm rests 2° below 300 rpm | `…/RPM/RPM.xml` lines 62–99; `RPM.png` |
| `oil_press_pa` scale | 0–115 psi (non-linear table 0/50/90/115) | `…/FuelOilAmps/c172oil.xml` lines 95–112; `fuel-oil.png` |
| `oil_temp_k` scale | 0–245 °F (255.3722–391.4833 K); 0–100 °F compressed into 7° of travel | `c172oil.xml` lines 65–78; `fuel-oil.png` |
| `egt_k` scale and unit | **°F**, 1200–1700 °F (922.0389–1199.8167 K) over 90° of needle; face unnumbered, **25 °F per division** (20 divisions); 4 s first-order lag; clamped | `Systems/instruments.xml` lines 41–73; `…/EGT/EGT.xml` line 28; `EGT.png` |
| `fuel_qty_left_m3`, `fuel_qty_right_m3` scale | 0–34 US gal (0–0.128704 m³), table 0/5/10/16/21/26/34; face E, 8, 16, 24, 32, F plus a lb scale; no OFF position | `…/FuelOilAmps/c172fuel.xml` lines 43–72, 89–118; `fuel-oil.png` |
| `vac_suction_pa` scale | 0–9 inHg (0–30477.501 Pa), linear 33°/inHg; an out-of-order eleventh entry (8.0 inHg at 165°) probably meant 10; face numbered 4, 5, 6 | `…/vac/vac.xml` lines 41–86; `vac.png` |
| `ammeter_a` scale | −60 to +60 A, centre zero, linear | `…/BatteryGauge/BatteryGauge.xml` lines 44–57; `BatteryGauge.png` |
| `hobbs_time_s` scale | 0000.0–9999.9 h, five drums, each the value modulo 10 (rolls over to 0), tenths truncated | `…/hobbs/hobbs.xml`; `Nasal/engine.nas` lines 33–58 |
| `hobbs_time_s` counting | Simulation time while the engine `running` flag is set (one meter per engine option, active one shown), updated every 60 s and on stop; not rpm-weighted; not tied to oil pressure. **The sourced S17 oil-pressure-switch condition governs; only the time base is taken.** | `Nasal/engine.nas` lines 12–62 |
| LOW FUEL threshold basis | **Total tank content**, unusable included: compares the indicated level (total US gal, 3 s lag, 0 when the instrument bus ≤ 12 V or the tank is not selected); unusable 1.5 gal per tank is kept separately for fuel feed only. FlightGear's own threshold is 8 gal without the 60 s persistence; the **sourced S17 5 gal / 60 s governs**. | `Nasal/annunciator_panel.nas` lines 184–185; `Systems/instruments.xml` lines 75–145; `c172p-main.xml` lines 771–788 |

The FlightGear face textures also show 172P arcs (for example the tachometer green arc
and red line); they are not used, because S17 Figure 2-3 markings govern. FlightGear's
annunciator script (adapted from a C182S, public domain) also uses 24.5 V, 3.0 inHg and
21 psi, a 10 s flash and a test-switch value 2; the classic 172P panel shows none of it
except a low-voltage light, so no annunciator value is taken.

### Gaps FlightGear does not fill

- **Fuel flow dial range:** the classic 172P panel has no fuel-flow gauge.
- **Tach-time counting and counter digits:** the 3D tachometer has no hour-meter window;
  the model has no tach-time counter.
- **Fuel transmitter fault detection and OFF needle:** not modelled.
- **Annunciator switch-label serial (DIM/BRT or DAY/NIGHT, TST or TEST):** the classic
  172P panel has no annunciator panel or test/dimming switch.

## Unresolved (TBD-src)

1. Tachometer green arc: decided (Figure 2-3 governs); p. 7-20 (1900–2400) remains a
   recorded source conflict until a later 172SPHUS revision is checked.
2. Dial ranges: estimated from FlightGear 172P (S14) for tachometer, oil pressure and
   temperature, EGT (°F, 25 °F/division), fuel quantity, vacuum and ammeter; the
   **fuel-flow** range has no estimate. A 172S instrument source would replace them.
3. Hour meters: Hobbs display and time base estimated from S14; **tach-time counting**
   (rpm weighting) and its counter digits remain TBD-src.
4. LOW FUEL threshold "about 5 gal": basis estimated as total content (S14); fault
   detection criteria not published and not modelled by S14.
5. Annunciator switch-label serial break (p. 7-32); S14 has no annunciator switch.
6. Sample baggage-area-1 entry (56 lb, 4.6 ×1000 lb-in) implies about 82 in, not the
   Figure 6-3 arm of 95 in; not used.
7. Later 172SPHUS revisions for 172S9491–172S9809 (GAPS Q3) not checked.
8. Manifest `mass_limits.empty_mass` stays `unknown`; pointing it to the sample needs a
   manifest version bump and new pins in all three value files.
9. Clock/O.A.T./voltmeter (Section 9 supplement) not read.
