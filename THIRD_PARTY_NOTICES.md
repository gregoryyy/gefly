# Third-party and upstream notices

## Propeller-derived bootstrap material

The following files contain material copied or adapted from the local Propeller
project under the user's bootstrap instruction:

| Gefly file | Upstream material and changes |
| --- | --- |
| `docs/BOOT.md` | `propeller/docs/BOOT.md`; adapted links, project structure and Gefly workflow/roadmap additions. The upstream source SHA-256 is recorded in the guide. |
| `justfile` | Document recipes from `propeller/justfile`; adapted project paths, positional arguments, prerequisite errors and repository checks. Unrelated application recipes were not copied. |
| `utils/pdf/style.css` | `propeller/utils/pdf/style.css`; original styling/comments retained, distribution notice added. |
| `utils/pdf/mermaid.html` | `propeller/utils/pdf/mermaid.html`; original include retained, distribution notice added. |
| `utils/pdf/latex.lua` | `propeller/utils/pdf/latex.lua`; original filter/comments retained, distribution notice added. |

Propeller's README expressly declares **GPL-3.0-or-later**. These Propeller-derived
files are distributed on those terms, with original comments/attribution retained.
Gefly adaptations and distribution notices were added on 2026-10-31. The complete,
unmodified GPL version 3 text is included in
[LICENSES/GPL-3.0-or-later.txt](LICENSES/GPL-3.0-or-later.txt). The original PDF
tooling comments also identify earlier Kibitz/OrgFab provenance.

## Project-wide license status

Original Gefly material is licensed GPL-3.0-or-later (user decision,
2026-11-01; [GAPS Q5](docs/GAPS.md)); see [LICENSE](LICENSE). The upstream license
above remains applicable to the identified derived files. Separately licensed
dependencies, data and assets keep their own terms.

No aircraft manuals/models, geographic/chart datasets, JSBSim/FlightGear code,
community add-ons or LLM runtime libraries have been bundled. Research links are
references, not grants to reuse those materials. Future additions retain their
own source, applicability and rights review in [SBOM](docs/SBOM.md).
