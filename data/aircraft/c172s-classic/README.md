# Cessna 172S classic-panel manifest

[manifest.json](manifest.json) is the rights/applicability manifest for the first
aircraft configuration ([GAPS Q3](../../../docs/GAPS.md#q3-which-cessna-172-variant-year-and-avionics-fit)):
Cessna 172S, serials 172S9491–172S9809, conventional panel. It serves R-AIR-1, R-DATA-1,
R-DATA-2 and R-FID-3 ([SPEC](../../../docs/SPEC.md)) and supports TODO 1.3.

**This manifest is not a flight model.** It identifies the configuration, records
type-design limits verified with page citations in the
[172S/FR172 source survey](../../../docs/research/2026-11-01-c172s-fr172-sources.md), and
states each source's rights. The S17 pages for the first serial
(pp. 7-24, 7-34) are documented in the merged
[172S controls research note](../../../docs/research/2026-11-01-jsbsim-datum-172s-controls.md).
The manifest holds no performance tables, aerodynamic coefficients,
procedures or document copies (`not_included`), and its `fidelity` is fixed to
`not validated`. Nothing here establishes simulator fidelity or training credit.

## Fields

| Field | Meaning |
| --- | --- |
| `schema_version` | Version of [the schema](../../schema/aircraft-manifest.schema.json) the file follows. |
| `manifest_id`, `manifest_version` | Stable identifier and semantic version of this manifest's content. |
| `status`, `fidelity` | `draft`/`reviewed`/`superseded`; fidelity stays `not validated` until an accepted validation exists. |
| `configuration` | Manufacturer, model, TCDS, category, serial range, panel, flight manual, engine and propeller. |
| `mass_limits`, `speed_limits`, `engine.ratings`, `propeller.limits` | Quantities (below). Airspeeds are split by reference (`IAS`, `CAS`). |
| `avionics` | Standard and optional equipment from the read POH; `fit_status: tbd` because the modelled fit is still open. |
| `sources` | Source register: id, document, revision, URL, access date and status, SHA-256 prefix of the read copy, applicability and rights. |
| `not_included`, `pending` | Deliberate exclusions, and page-cited items not yet transferred. |
| `prepared` | Date, preparing agent and input documents. |

A **quantity** has `value` in SI (`kg`, `m/s`, `m`, `rad/s`, `W`), `original_value` and
`original_unit` as published, `status`, `citations`, `conversion`, `uncertainty` and
optionally `condition`, `reference`, `conflicts` and `todo`. `reference` (`IAS`, `CAS`,
`TAS`) is required for every `m/s` quantity. The validator recomputes each SI value from
`original_value` with a fixed factor table (lb, kt, in, rpm, hp, ft, ft/min; for the value files also nm, inHg, in^3, gal/h, lb/h, %) and rejects a difference
above 0.5e-4·max(1, |value|) or an unlisted unit pair. A **fact** (identification
text) has `value`, `status`, `citations` and optional `derivation`, `note`, `todo`. A
**citation** names `source_id`, the source's `revision`, `page` and optional `section`.

Status follows R-DATA-2:

- `sourced`: read in a cited document; at least one citation with a page; only sources
  with `access_status` `read`/`read_selected_pages`.
- `derived`: computed or inferred from cited facts; `derivation` explains how. An exact
  unit conversion of a sourced value stays `sourced` and is described in `conversion`.
- `estimated`: an engineering estimate; none are present.
- `unknown`: `value` is `null` and `todo` says what is needed. Disagreeing sources are
  listed in `conflicts` (for example VFE CAS and the utility ramp mass) without choosing.

## Selected POH values

[poh-values.json](poh-values.json) holds individual values from the 172S POH (S17,
172SPHUS Rev 5) that the project needs now, as cited facts
([research note](../../../docs/research/2026-11-01-c172s-poh-values.md); user decision
2026-11-01 13:59): normal-static airspeed calibration points covering the Exercise 01
IAS bands (flaps up 50–110, flaps 10° 50–90, flaps 30° 50–80 KIAS), wings-level stall speeds at
2,550 lb for both CG limits, short-field take-off and landing distances at 2,550 lb for
sea level and 1,000 ft pressure altitude at 10 and 20 °C (bracketing EDFE and ISA), and
maximum rate of climb with climb speed at sea level and 2,000 ft. Each value carries its
condition, page and figure, `reading` (`tabulated` or `read_from_chart`), conversion and
uncertainty; the POH correction notes (wind, grass, flaps-up landing) are summarised in
our own words under `corrections`. `not_extracted` lists what was deliberately left out.
The file uses [its own schema](../../schema/poh-values.schema.json) and cites the source
register of `manifest.json`, which the validator loads and matches by `manifest_id`.
The validator also schema-validates that manifest, even when
`poh-values.json` is checked alone. Units and references must agree: `kt` values are
`m/s` with reference `IAS`/`CAS`/`TAS`, `ft/min` values are `m/s` with reference
`vertical`, `ft` values are `m` with no reference, and a key ending in `_ias`, `_cas` or
`_tas` must carry that reference. Calibration points must be strictly increasing in IAS.
Extraction shares per figure and the no-piecemeal-completion limit are in the research
note; do not add values that would assemble a whole table. These are comparison targets,
not validation results: the S17 performance data assume the short-field technique and an
airplane in good condition, and nothing here establishes simulator fidelity.
The selected ASI points remove the missing-extraction blocker for supported
Exercise 01 bands; they do not supply a complete pitot-static model, a 20° flap
calibration or values outside those ranges. Interpolation, transitions and the
107/109 KCAS VFE conflict remain declared assessment/model limitations.

## Selected engine and cruise/glide values

[performance-values.json](performance-values.json) holds the few values needed to
calibrate a JSBSim piston engine and airframe in the circuit regime, as cited facts
([research note](../../../docs/research/2026-11-01-c172s-poh-values.md#engine-cruise-and-glide-extraction);
user decision 2026-11-01 18:43, GAPS Q5: only the needed points of the Lycoming power curve,
never the whole chart):

- `engine_ratings`: IO-360-L2A normal rating 160 hp / 2400 rpm, alternate rating
  180 hp / 2700 rpm (the 172S rating, agreeing with S9 and the manifest), displacement
  (Lycoming operator's manual 60297-12, source A14, p. 2-2).
- `engine_sea_level`: points read from Lycoming curve 13516-A (Figure 3-25, p. 3-40),
  uninstalled engine at sea-level standard conditions, maximum-power mixture. Full throttle
  at 2000, 2400, 2500 and 2700 rpm with the manifold pressure at the curve end; part throttle
  at 2000 rpm / 20 and 24 inHg and 2400 rpm / 26 inHg. 2300 rpm is `unknown`: the chart
  has no such curve. `reading: read_from_chart` with ±2–3 hp.
- `engine_fuel`: points of Lycoming curve 13518 (Figure 3-9, p. 3-24; user decision
  2026-11-01 19:04, GAPS Q5), uninstalled engine: 2400 rpm best power at 120 and 160 hp,
  2400 rpm best economy at 120 hp (fuel mass flow, ±1 lb/h), to bound BSFC. 2700 rpm is
  `unknown`: the chart has no such curve.
- `cruise`: POH Figure 5-8 (p. 5-19), 2550 lb, recommended lean, pressure altitude 2000 ft,
  standard temperature: rpm, percent BHP (as a fraction), KTAS and fuel flow for the six
  rows 2100–2550 rpm. The page does not state the power the percentage refers to; do not
  multiply it by the Lycoming 160 hp rating (see `pending`).
- `glide`: best glide 68 KIAS (p. 3-3), ground distance from 12,000 ft (Figure 3-1,
  p. 3-14) and the glide ratio `derived` from it (about 9.1, zero wind).

Series (`engine_sea_level`, `engine_fuel`, `cruise`) hold points of several numbers, each with SI
`value`/`unit` and published `original_value`/`original_unit`; points must be strictly
increasing by engine speed, then manifold pressure or power. SI units are `W`, `rad/s`,
`Pa`, `m^3`, `m^3/s`, `kg/s`, `m`, `m/s` (with `IAS`/`CAS`/`TAS`) and `1` (fraction or
ratio); `m^3`, `m^3/s` and `kg/s` are checked relatively, so give them about 5 significant digits. A separate
file and [schema](../../schema/performance-values.schema.json) were chosen instead of
extending `poh-values.json` because these values mix an engine-manufacturer chart with
POH tables, need new units and multi-number points, and leave the separate
[poh-values.json](poh-values.json) schema/content unchanged. Lycoming data describe an uninstalled engine; installation losses and the
propeller (TCDS static rpm 2300–2400) still have to be modelled. These are calibration
inputs, not validation results.

These three draft source files are the current data inventory. There is still
**no project-owned JSBSim 172S model** here: no aerodynamic coefficient set,
propulsion/gear implementation, frozen E2 case set or validated flight behavior.
See the [model plan](../../../docs/design/FDM-172S.md) for the remaining source,
estimation, calibration and independent holdout work.

## Rights

Lycoming manuals are copyrighted ("all rights reserved"): cite individual chart points by
page; never trace, digitise or reproduce a whole curve or chart.
FAA TCDS are US government works (public domain in the US). EASA TCDS are marked "all
rights reserved": reference and cite facts only. Cessna manuals are copyrighted: cite
individual facts by page; never copy text, tables or figures. `copy_in_repository` is
always `false`; see [SBOM](../../../docs/SBOM.md#aircraft-avionics-and-geographic-data).

## Updating

1. Verify every new value in the primary document and record it, with page, in a
   research note first. AI output or search snippets are never a source.
2. Add or update the source register entry (revision, URL, access date, access status,
   checksum prefix, required for read sources, rights) before citing it; a citation's `revision` must match it.
3. Add the quantity with SI value, original value/unit, status, citations, conversion
   and uncertainty. Use `unknown` plus `todo` rather than a guess.
4. Increase `manifest_version` (patch for corrections, minor for added values, major for a
   changed configuration) and run:

```bash
python3 utils/validate_manifest.py
python3 utils/ci/run.py
```

The validator first audits the whole schema and refuses any keyword or `$ref` it does not
implement, then checks the schema subset, conversions and cross-references (registered source, matching
revision, sourced values citing read sources). It cannot check that a cited page really
contains the value; that remains a review task.
