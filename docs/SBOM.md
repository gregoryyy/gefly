# Software, tools and source inventory

JSBSim is the selected dynamics engine, with TypeScript, CesiumJS, a three.js fallback and MapLibre selected for the web application (GAPS Q17). These are not yet pinned product dependencies; the package manager/workspaces remain undecided and no application lockfiles exist. Study/tool versions are recorded below. This overview does not replace future machine-readable inventories.

The user intends a **free/open-source project** and directs **reuse of open physics
engines/models wherever practical**. Original project material is **GPL-3.0-or-later** (GAPS Q5);
engine, aircraft model, wrapper, imagery, geodata, charts and community content
must each retain their own license/provenance. Select a compatible distribution
plan rather than assuming a single engine license covers all these materials.

## Current development tools

| Tool or asset | Use and provenance | Version / rights status |
| --- | --- | --- |
| Python | Standard-library scaffold checks, tool tests and shared CI runner, including `tomllib` | 3.11+ required; CI supports minor lines 3.11 and 3.15; exact observed patches recorded in RESULTS |
| just | Local command entry point; `just ci` delegates to `utils/ci/run.py` | Version recorded in RESULTS; not bundled or required by hosted CI |
| pandoc | Trusted Markdown to embedded HTML | Version recorded in RESULTS; not bundled |
| Google Chrome | Headless A4 PDF print | Locally installed; `CHROME` can override executable |
| `utils/pdf/style.css`, `mermaid.html`, `latex.lua` | Copied from `../propeller/utils/pdf/` by the requested bootstrap procedure | Propeller declares GPL-3.0-or-later; original comments retained, notices and full GPL text included for publication |
| Mermaid | Optional diagram rendering in PDF builds | CDN script pinned to 11.4.1 in inherited include; fetched only for Mermaid documents; no checked-in bundle |
| TeX Live / dvisvgm | Optional LaTeX fenced-block to SVG | Needed only for such blocks; not required for current foundation documents |
| Git / GitHub | Initial public repository publication authorized by user | Destination `gregoryyy/gefly`; actual commit/push evidence in DONE and RESULTS |
| Codex CLI / Claude Code CLI | Local prerequisites for the opposite-provider peer gate; not bundled | Observed CLI versions: 0.46.0 / 2.1.193. Use existing configured models/authentication, check installed capabilities and record actual model evidence per run. No installation or model selection by the router. |

The document recipes are adapted from the source project's justfile. Generated
`*.md.pdf` files and `.pdfstamps/` are excluded from Git. Upstream Propeller README
and LICENSE were inspected before publication: its declared GPL-3.0-or-later terms
are recorded for derived BOOT/build/PDF material in
[THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), with the full license text under
`LICENSES/`. Gefly's original material is now also GPL-3.0-or-later (Q5, 2026-11-01); see `LICENSE`.

## Repository-tool CI inventory

The [shared runner](../utils/ci/run.py) checks scaffold structure, offline standard-
library tool tests and whitespace in all tracked current files. Empty/missing
tests or required-phase failures return nonzero. Untracked files are outside the
whitespace gate until added to Git. This is TODO 1.1.1's bounded tool slice, not a
choice of simulator stack or completion of parent TODO 1.1.

The [workflow](../.github/workflows/foundation.yml) handles pushes and pull requests
targeting `main`, using `contents: read` and checkout `persist-credentials: false`.
It runs on `ubuntu-24.04` with explicit Python minor lines 3.11 and 3.15. At
selection on 2026-10-31, Python's [supported-version table](https://devguide.python.org/versions/)
lists 3.11 in security support and 3.15 in bugfix support;
[3.15.2](https://www.python.org/downloads/release/python-3152/) is the current
selected-line release checked for setup availability. The matrix permits later
patches within each minor line; record exact observed interpreters and hosted
runner details in RESULTS. An immutable action pin does not make the interpreter
download or hosted runner image hermetic.

| Action | Official release and immutable source pin | Runtime compatibility |
| --- | --- | --- |
| `actions/checkout` | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), `3d3c42e5aac5ba805825da76410c181273ba90b1` | Node 24 action runtime; Actions runner 2.327.1+ |
| `actions/setup-python` | [v7.1.0](https://github.com/actions/setup-python/releases/tag/v7.1.0), `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | Node 24 action runtime; Actions runner 2.327.1+ |

Both action sources declare the MIT license at their pinned revisions:
[checkout license](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/LICENSE)
and [setup-python license](https://github.com/actions/setup-python/blob/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/LICENSE).
They are referenced by CI, not vendored into the application.

The Foundation workflow sets up the Node 26 line for the offline synthetic render
and required assurance checks; see the pinned action and limits below. The resolved
patch version is printed in the log. No project packages are installed.

The runtime requirements are recorded in the pinned
[checkout source](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/README.md)
and [setup-python source](https://github.com/actions/setup-python/blob/6d4fd22b20465ccc0f7354476588e8df7c9ca0e0/README.md).
These are CI action runtimes, not application dependencies. Action/interpreter
setup can download tools; the shared gate then uses Git, Node standard libraries
and the Python standard library. It installs no project packages and invokes no live peer
provider, PDF/browser/TeX process or simulator runtime. Tests mock provider calls.

[Dependabot configuration](../.github/dependabot.yml) monitors the
`github-actions` ecosystem at `/` weekly, proposing update PRs under
[GitHub's documented action-update mechanism](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions).
For each proposed replacement, verify the release/tag-to-commit mapping against
the official action repository, inspect the pinned source and runner/runtime
requirements, preserve a full commit SHA, and review/test the change through the
same shared gate and independent review process. Do not merge an update merely
because the bot opened it. Python patch resolution and hosted runner updates
remain explicit limits outside those action pins.

Local gate observations and actual hosted outcomes are separate records under
[E0-CI](EVAL.md#e0-ci-are-repository-tool-quality-gates-reproducible-locally-and-in-ci).
Workflow presence does not establish a hosted pass or branch protection; peer
acceptance is also a separate gate. Future application lint/type checks,
dependency vulnerability/license checks and package-manager update automation
remain TODO 1.1 work as package/workspace tooling and product implementation are added.

## Assurance toolchain

The bounded assurance tool uses Node 24.2+ built-in TypeScript stripping and only
Node standard libraries; it installs no runtime packages. Type stripping is not
TypeScript type checking. The selected pure Propeller core is GPL-3.0-or-later,
pinned to `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`; [UPSTREAM](../utils/assure/UPSTREAM.json)
records each copied file's original path/hash, and [notices](../THIRD_PARTY_NOTICES.md)
preserve attribution. Gefly adapters are tested separately from the reused tests.

CI explicitly sets up the Node 26 line with `actions/setup-node` v7.1.0 at
`949feb2413d6458794dcd2491c4babbbce0c15c1`. Its official tag API was verified before
selection; the [pinned MIT license](https://github.com/actions/setup-node/blob/949feb2413d6458794dcd2491c4babbbce0c15c1/LICENSE)
and [source](https://github.com/actions/setup-node/tree/949feb2413d6458794dcd2491c4babbbce0c15c1)
are recorded here. Automatic package-manager caching is disabled. Interpreter
patches can move within that line; actual versions belong in RESULTS. Existing
weekly GitHub Actions update proposals also cover this immutable action pin.

The runtime lives in `utils/assure/`; the product contract/catalog remain in
`docs/assure/`. Assurance reads catalog/evidence files offline and creates ignored reports under
`utils/assure/out/`. It does not fetch source documents, install an SDK, run a simulator
or invoke a provider. It complements existing source/schema/conversion validators;
review still establishes source applicability and scientific meaning.

## Selection and updates

Prefer the smallest dependency set that meets measured requirements. Before adopting one, record its exact version, official source, license, maintenance/security posture, transitive obligations, browser compatibility, size/performance impact and alternatives. Commit lockfiles for the selected package manager. The current action-update configuration is described above; foundation TODO 1.1 still needs vulnerability/license checks and automated update proposals appropriate to the future application ecosystem.

JSBSim is the selected dynamics engine; it is not yet a pinned product dependency. GeoFS is a reference product, not a library or asset grant. Check primary source documents and actual licenses before reuse; see [foundation research](research/2026-10-31-foundation-sources.md).

## Reuse and regional-data candidates, not adopted dependencies

The [EDDF/open-foundation source note](research/2026-10-31-eddf-open-foundation.md)
records primary links, dates, license statements and limitations for the following
candidates. None has been installed, copied into runtime assets or accepted as a
validated aircraft/region model.

| Candidate | Selection question |
| --- | --- |
| JSBSim engine and included aircraft data / Aeromatic | Can an applicable C172 model meet reference cases through a suitable browser/deployment adapter? Pin engine/model versions and inspect rights separately. **Selected** (Q17; LGPL-2.1-or-later accepted as copyleft exception; bundled aircraft data not shipped). Studied in [studies/e1-jsbsim](../studies/e1-jsbsim/README.md): PyPI 1.3.3 / `v1.3.3`@`66f7faf`, engine LGPL-2.1-or-later per source headers; `c172x` data says "GPL" (unversioned) and "not to be sold"; engine/propeller/systems files carry no notice. Q5 compatibility review pending. |
| FlightGear C172P model/package | Which flight/model/cockpit components are portable and applicable? Inspect component/asset rights and dependencies instead of importing a whole package by assumption. |
| Existing JSBSim WASM wrapper | Is the actual early-stage wrapper maintainable and adequate? Review wrapper and bundled engine licenses and run browser/replay budgets before adoption. |
| CesiumJS 1.146.0 | Studied in [studies/e1-browser/render](../studies/e1-browser/render/README.md) via CDN; Apache-2.0 (permissive). Ion token disabled, no ion/Bing assets. Not adopted; CDN load without SRI in the study. |
| three.js 0.187.0 | Studied in [studies/e1-browser/render](../studies/e1-browser/render/README.md) via CDN; MIT (permissive). Not adopted; CDN load without SRI in the study. |
| emsdk 6.0.13 | Build tool for the JSBSim WASM study ([sim](../studies/e1-browser/sim/README.md)); not bundled; build outputs not committed. |
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

## Third-party license policy (GAPS Q5)

Admit only non-proprietary licenses (orchestrator reading: OSI-approved software licenses and open
data/content licenses). **Prefer permissive** terms (MIT, BSD, Apache-2.0, ISC,
CC0/public domain, CC-BY) so the project's GPL-3.0-or-later can be relaxed later.
*Orchestrator proposals pending user confirmation (GAPS Q5):* a copyleft component (for example LGPL/GPL software such as JSBSim or FlightGear
aircraft packages, or ODbL share-alike data such as OpenStreetMap) needs a
recorded justification, a license-compatibility check (for example, GPL-2.0-only
material cannot be combined with GPL-3.0-or-later) and an isolation/replacement
note before adoption.
Proprietary, non-commercial-only or no-derivatives material is excluded from the
distribution; link to it instead when it is a needed reference.
