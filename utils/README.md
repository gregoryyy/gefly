# Repository tools

`just check` runs [check.py](check.py) with Python 3.11 or newer and only the standard
library. It checks required scaffold files, local Markdown link targets, the Claude
entrypoint, the nine native Codex agent definitions, the native Claude peer dispatcher
and their role-document references.
It does not contact external URLs, validate Markdown heading fragments, enforce agent
permissions, invoke either review provider or run simulator tests. `just reqs` lists
tagged requirement definitions; `just refs` reads commit trailers once commits exist.

## Cross-provider peer review

[peer_review.py](peer_review.py) routes Codex-authored work to the **Claude CLI** and
Claude-authored work to the **Codex CLI**. The ninth [peer role](../docs/agents/peer.md)
adds this external review to the existing quality and validate roles. Native Codex
and Claude peer definitions dispatch the same workflow; a role definition alone
does not execute the other provider or establish reviewer independence.

Freeze a self-contained review packet containing the integrated revision, diff,
applicable specification and criteria, relevant source/artifact evidence, and an
author-provider coverage map including integration edits. Supply the packet as the
review material for a fresh provider invocation without the author's conversation
or a resumed author session. Do not include credentials or private material that
is outside the authorized provider submission. For mixed authorship, prepare
reciprocal coverage at the same revision so each provider reviews the other's
contribution and does not accept its own work.

Packets are UTF-8 text, with the revision in a Markdown `Revision: ...` line or a
JSON top-level `revision` field. Missing revision blocks a live review. The helper
hashes the packet bytes; the orchestrator still verifies that its stated revision
and authorship map match the actual integrated artifact.

From the repository root:

```bash
just check
just test-tools
just peer-preview codex /path/to/frozen-packet.md
mkdir -p output/peer
just peer-review codex /path/to/frozen-packet.md > output/peer/claude-review.json
```

Use `claude` as the author argument to route the review to Codex. Packet paths
containing spaces work when quoted. `peer-preview` uses `--dry-run`; it previews
routing without invoking a provider and cannot satisfy the peer gate. `peer-review`
runs the selected external CLI and writes a JSON envelope to standard output.
Capture that report under ignored `output/` and cite the reviewed revision and
packet hash in durable review records. Report capture does not publish a report
or establish that the report's criteria passed.

The direct helper accepts an optional timeout:

```bash
python3 utils/peer_review.py --author-provider codex --packet /path/to/frozen-packet.md --timeout 120
```

An absent or incompatible CLI, missing authentication, timeout, failed process or
unusable response must remain explicit blocked/failure evidence. There is no
same-provider fallback. Resolve a provider prerequisite through the orchestrator;
the helper does not install CLIs, select models or establish authentication.
CLI capabilities vary, so a specific flag such as `--ephemeral` is not a universal
prerequisite for the new-invocation workflow.

Inspect the envelope's provenance, packet hash and actual process outcome. Record
the reviewer provider, CLI path/version and observed model metadata with the
quality findings and the separate specification matrix. Expected routing or a
declared reviewer name is insufficient evidence of the actual provider/model.
An execution status or successful exit means only that the corresponding execution
step succeeded; acceptance also needs eligible provider identity, current revision
coverage, resolved quality findings and criterion-by-criterion evidence. Missing
evidence is blocked/not evaluated, never inferred as a pass. Any repair or packet
change invalidates affected evidence and requires a new review.

The envelope includes `author_provider`, `reviewer_provider`, `packet` (path,
SHA-256 and revision), `cli` (executable and version), `model_evidence`, `review`
and `limitations`. Unknown version/model evidence remains explicit. `status` is
`dry_run`, `completed` or `blocked`. Exit 0 accompanies a preview or an accepting
review recommendation; exit 1 means changes requested, and exit 2 means blocked.
The `accepted` value reports the helper's parsed recommendation, not the final
project gate. The orchestrator must independently assess provider identity and
complete criterion/authorship coverage before accepting the artifact.

Claude is invoked with tools disabled; Codex uses a read-only sandbox and
packet-only instructions, with detected tool-use events rejected. The Codex
instruction is not a tool-disable guarantee. Provider CLI configuration may
still exist outside the packet, and returned model names are not backend
attestation. Preserve these limits with the review evidence.

`just test-tools` runs standard-library `unittest` discovery over `utils/test_*.py`.
These tool tests are separate from live provider runs and do not establish live
authentication, model identity, review quality or simulator correctness. `just check`
stays offline and never invokes this peer helper or a provider. See
[SDLC](../docs/SDLC.md) for acceptance and [SEC](../docs/SEC.md) for data boundaries.

## Document builds

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
