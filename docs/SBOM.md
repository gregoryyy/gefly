# Software, tools and source inventory

No runtime language, package manager, graphics engine or dynamics engine has been selected. There are no application dependencies or lockfiles yet. This overview does not replace future machine-readable inventories.

The user intends a **free/open-source project** and directs **reuse of open physics
engines/models wherever practical**. The exact project license is still open;
engine, aircraft model, wrapper, imagery, geodata, charts and community content
must each retain their own license/provenance. Select a compatible distribution
plan rather than assuming a single engine license covers all these materials.

## Current development tools

| Tool or asset | Use and provenance | Version / rights status |
| --- | --- | --- |
| Python | Standard-library scaffold checks, including `tomllib` | 3.11+ required; local version recorded in RESULTS |
| just | Local command entry point | Version recorded in RESULTS; not bundled |
| pandoc | Trusted Markdown to embedded HTML | Version recorded in RESULTS; not bundled |
| Google Chrome | Headless A4 PDF print | Locally installed; `CHROME` can override executable |
| `utils/pdf/style.css`, `mermaid.html`, `latex.lua` | Copied from `../propeller/utils/pdf/` by the requested bootstrap procedure | Propeller declares GPL-3.0-or-later; original comments retained, notices and full GPL text included for publication |
| Mermaid | Optional diagram rendering in PDF builds | CDN script pinned to 11.4.1 in inherited include; fetched only for Mermaid documents; no checked-in bundle |
| TeX Live / dvisvgm | Optional LaTeX fenced-block to SVG | Needed only for such blocks; not required for current foundation documents |
| Git / GitHub | Initial public repository publication authorized by user | Destination `gregoryyy/gefly`; actual commit/push evidence in DONE and RESULTS |

The document recipes are adapted from the source project's justfile. Generated
`*.md.pdf` files and `.pdfstamps/` are excluded from Git. Upstream Propeller README
and LICENSE were inspected before publication: its declared GPL-3.0-or-later terms
are recorded for derived BOOT/build/PDF material in
[THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), with the full license text under
`LICENSES/`. This is separate from choosing a blanket license for Gefly's original
material, which remains Q5.

## Selection and updates

Prefer the smallest dependency set that meets measured requirements. Before adopting one, record its exact version, official source, license, maintenance/security posture, transitive obligations, browser compatibility, size/performance impact and alternatives. Commit lockfiles for the selected package manager. Foundation TODO 1.1 adds vulnerability/license checks and automated update proposals appropriate to that ecosystem; no automation is claimed to exist yet.

JSBSim is a **candidate**, not an installed dependency. GeoFS is a reference product, not a library or asset grant. Check primary source documents and actual licenses before reuse; see [foundation research](research/2026-10-31-foundation-sources.md).

## Reuse and regional-data candidates, not adopted dependencies

The [EDDF/open-foundation source note](research/2026-10-31-eddf-open-foundation.md)
records primary links, dates, license statements and limitations for the following
candidates. None has been installed, copied into runtime assets or accepted as a
validated aircraft/region model.

| Candidate | Selection question |
| --- | --- |
| JSBSim engine and included aircraft data / Aeromatic | Can an applicable C172 model meet reference cases through a suitable browser/deployment adapter? Pin engine/model versions and inspect rights separately. |
| FlightGear C172P model/package | Which flight/model/cockpit components are portable and applicable? Inspect component/asset rights and dependencies instead of importing a whole package by assumption. |
| Existing JSBSim WASM wrapper | Is the actual early-stage wrapper maintainable and adequate? Review wrapper and bundled engine licenses and run browser/replay budgets before adoption. |
| OpenStreetMap data | Assess relevant basemap/coverage and ODbL obligations; public tile service access is a separate policy and hosting decision. |
| OurAirports data | Candidate airport records with stated public-domain terms and accuracy limitations; not an accepted substitute for EDDF's official ARP or authoritative procedures. |
| Copernicus elevation/surface products | Select product/edition, distinguish surface from terrain, review vertical reference/accuracy, attribution and actual download/service access. |
| DFS/AIP and EAD reference material | Verify viewing, extraction and redistribution permissions; public consultation is not an open chart/navigation-data grant or proof of current operational coverage. |

Reuse-first assessment belongs in E1/TODO 1.2; region/data acceptance belongs in
E10/TODO 1.7. An LLM may resolve references to approved catalog entries but cannot
create a license, data provenance or accuracy claim.

## Aircraft, avionics and geographic data

Store manifests in `data/` identifying publisher, exact aircraft/avionics applicability, revision/date, page/section, original units, extraction method, uncertainty, access date, license/redistribution permission and fixture checksum. Track provenance for derived parameters as well as raw sources. Do not copy manuals or bulk datasets unless rights permit; keep links and authorized extracts instead. Pin geographic/navigation/weather dataset revisions and freshness claims once providers are selected. Never label obsolete or synthetic data as operationally current.

For the [expanded training scope](design/TRAINING.md), inventory airport/runway and
terrain elevations with units/datums, navaid/fix identifiers and frequencies,
procedure/chart geometry, METAR/TAF and NOTAM coverage/validity, checklist sources
and radio phraseology references. Record restrictions on caching, redistribution,
derived chart generation, attribution and client access, as applicable. Real and
generated maps need separate provenance labels. No feed, global database, chart
provider or community add-on has been adopted by this refinement.

Browser orientation support and any replay/video library must be evaluated on the
chosen browser/device matrix before dependency adoption. GeoFS community add-ons
are research examples, not preapproved dependencies or accepted aircraft data.

Source license selection remains GAPS Q5; a `LICENSE` file has deliberately not been fabricated.
