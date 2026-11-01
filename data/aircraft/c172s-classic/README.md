# Cessna 172S classic-panel manifest

[manifest.json](manifest.json) is the rights/applicability manifest for the first
aircraft configuration ([GAPS Q3](../../../docs/GAPS.md#q3-which-cessna-172-variant-year-and-avionics-fit)):
Cessna 172S, serials 172S9491–172S9809, conventional panel. It serves R-AIR-1, R-DATA-1,
R-DATA-2 and R-FID-3 ([SPEC](../../../docs/SPEC.md)) and supports TODO 1.3.

**This manifest is not a flight model.** It identifies the configuration, records
type-design limits already verified with page citations in the
[172S/FR172 source survey](../../../docs/research/2026-11-01-c172s-fr172-sources.md), and
states each source's rights. It holds no performance tables, aerodynamic coefficients,
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
optionally `condition`, `reference`, `conflicts` and `todo`. A **fact** (identification
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

## Rights

FAA TCDS are US government works (public domain in the US). EASA TCDS are marked "all
rights reserved": reference and cite facts only. Cessna manuals are copyrighted: cite
individual facts by page; never copy text, tables or figures. `copy_in_repository` is
always `false`; see [SBOM](../../../docs/SBOM.md#aircraft-avionics-and-geographic-data).

## Updating

1. Verify every new value in the primary document and record it, with page, in a
   research note first. AI output or search snippets are never a source.
2. Add or update the source register entry (revision, URL, access date, access status,
   checksum prefix, rights) before citing it; a citation's `revision` must match it.
3. Add the quantity with SI value, original value/unit, status, citations, conversion
   and uncertainty. Use `unknown` plus `todo` rather than a guess.
4. Increase `manifest_version` (patch for corrections, minor for added values, major for a
   changed configuration) and run:

```bash
python3 utils/validate_manifest.py
python3 utils/ci.py
```

The validator checks the schema subset and cross-references (registered source, matching
revision, sourced values citing read sources). It cannot check that a cited page really
contains the value; that remains a review task.
