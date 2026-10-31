# Repository tools

`just check` runs [check.py](check.py) with Python 3.11 or newer and only the standard
library. It checks required scaffold files, local Markdown link targets, the Claude
entrypoint, the eight native Codex agent definitions and their role-document references.
It does not contact external URLs, validate Markdown heading fragments, enforce agent
permissions or run simulator tests. `just reqs` lists tagged requirement definitions;
`just refs` reads commit trailers once commits exist.

`just pdf FILE`, `just pdfs [PATHS]` and `just docs [PATHS]` use pandoc and headless Chrome
to write an A4 PDF beside each source as `FILE.md.pdf`. Set `CHROME` to another Chrome
executable when needed. `just clean` removes these PDFs and `.pdfstamps/`.

The recipes and [PDF assets](pdf/) were adapted from Propeller's `justfile` and
`utils/pdf/` under the bootstrap instruction; their upstream comments retain earlier
Kibitz/OrgFab provenance. No Propeller application code or package dependencies are
included. See [SBOM](../docs/SBOM.md) for toolchain and license tracking.

Content stamps include the Markdown source, stylesheet, Mermaid include and LaTeX
filter, plus the produced PDF hash. Images are not part of that hash: remove the
corresponding PDF after changing only an image. Mermaid documents require access to
the pinned CDN script in `pdf/mermaid.html`; LaTeX/TeX fenced blocks additionally need
TeX Live (`latex` and `dvisvgm`). Plain Markdown and MathML need neither dependency.

Only render trusted repository documents: pandoc can embed remote resources, and
the LaTeX filter invokes local TeX tools. Generated HTML and the temporary Chrome
profile are deleted after each build. Recipe command failures propagate as failures.
