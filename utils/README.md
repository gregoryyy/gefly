# Repository tools

## Shared local and hosted gate

`just ci` delegates to [ci.py](ci.py), the same entry point invoked by
[GitHub Actions](../.github/workflows/foundation.yml). The direct command needs Python
3.11+, Git and **Node.js 24.2+**, without `just` or third-party Python packages:

```bash
python3 /path/to/checkout/utils/ci.py
```

The runner finds the checkout from its own location, independently of the caller's
working directory. Its required phases check the scaffold, discover and run the
offline standard-library repository-tool tests, check the aircraft/source data,
run the assurance integrity checks and tool tests, run the offline study tests
(`studies/e1-jsbsim`, standard-library unittest discovery in a separate
interpreter), run `node studies/e1-browser/render/check-synthetic.mjs`, and inspect
whitespace in the current contents of all tracked files.
A missing/empty test suite, a missing study directory or render script, or a
required phase failure returns nonzero. Study tests that need an absent optional
package (such as `jsbsim`) are skipped; the study child prints executed and
skipped counts with each skip reason and a `GEFLY-STUDY-RESULT` count line that
the runner requires. Optional-study skips keep exit 0 but change the final line to
`Foundation CI: passed with skipped checks (...)`, naming each skip; an
all-skipped study suite is listed as `none executed`, never as a pass. Each child
phase has a timeout (`--timeout SECONDS`, default 600; Git calls 60 s) and expiry
fails the gate. On POSIX each phase and Node call runs in its own process group;
on expiry the whole group gets SIGTERM, then SIGKILL after a 2 s grace, so a
grandchild holding an output pipe cannot stall the gate (elsewhere only the
direct child is killed). Inherited `NODE_*` variables are removed from Node's environment,
as `GIT_*` variables are for Git. Assurance is required in the shared gate:
missing Node or a version below 24.2 is a failure, and assurance TAP tests must be
nonempty with zero skips. `just check` remains the Python-only lower-level
structural check. Whitespace is checked even in an otherwise clean
checkout; this is broader than checking a working-tree diff. Untracked files are
excluded until added to Git, so add intended new files before the final gate.

After checkout and interpreter setup, the hosted gate uses Git, the Python
standard library and Node.js for assurance and synthetic rendering. The required
Node version and hosted setup are recorded in [SBOM](../docs/SBOM.md); actual
versions are printed with the run. It performs no
project-package installation, live peer
review, provider authentication, PDF/browser/TeX build or simulator/data ingestion.
Peer-router tests use mocked provider processes; they do not establish live access
or acceptance. `just check` and `just test-tools` remain lower-level commands for
targeted checks rather than replacements for the complete gate.

The workflow targets pushes and pull requests to `main` with `contents: read`,
`persist-credentials: false`, `ubuntu-24.04` and a Python 3.11/3.15 matrix. Exact
interpreter patches and hosted runner images can change. [SBOM](../docs/SBOM.md)
records immutable action pins, explicit Node 26 setup and the reviewed update policy. The matrix tests
supported lines rather than promising hermetic or identical environments.

[E0-CI](../docs/EVAL.md#e0-ci-are-repository-tool-quality-gates-reproducible-locally-and-in-ci)
defines acceptance, including clean-checkout/unrelated-directory and negative
fixtures. Record actual Python versions, commands and local outcomes separately
from hosted commit/run/job outcomes in [RESULTS](../docs/RESULTS.md). A local pass
or workflow inspection does not prove a hosted run passed. This slice covers
current repository tools; future application lint/types, dependency vulnerability/
license checks and runtime tests remain in TODO 1.1 after stack selection. The
local quality, specification-validation and live peer gates remain separate.

## Lower-level scaffold check

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

## Assurance and change impact

The bounded [assurance contract](../docs/assure/SPEC.md) adopts generated lineage
and checks from Propeller's pinned GPL-3.0-or-later core. Canonical inputs remain
the source documents, Git records, aircraft/source values and versioned evidence;
generated graph/report files are disposable. The CLI uses Node.js 24.2+ to run
the checked-in TypeScript, with no package installation, network retrieval,
provider call or browser launch during checking.

```bash
just assure check
just assure report
just assure trace R-AIR-1
just assure diff main
just assure impact data/aircraft/c172s-classic/poh-values.json
just assure-test
just lineage
```

`check` reports integrity/freshness findings and fails on current errors; warnings
and extraction limits remain visible. `report` separates planned requirements,
implementation claims, evidence outcomes, link certainty and accepted claims.
`trace` follows a stable ID, `diff` compares lineage against a Git revision, and
`impact` identifies downstream effects through declared dependencies. Missing
edges are a coverage limit, not proof of no impact. `assure-test` exercises the
tool; `lineage` writes generated JSON and Markdown under ignored `assure/out/`,
without automatically opening a browser or publishing anything.

The shared local/hosted gate runs the offline assurance checks alongside existing
aircraft validators rather than treating graph extraction as source verification.
A named test or a declared/confirmed relationship does not prove execution or
acceptance. Planned requirements may remain unimplemented without failing every
gate; accepted claims require current passing evidence with valid dependencies.
Failed, blocked, skipped, not-evaluated, missing or stale evidence cannot support
an accepted claim. Optional-dependency study skips stay visible as unexecuted
evidence, even when the overall tooling command exits successfully.

Review source truth/applicability/rights, numerical adequacy, case selection and
prose meaning manually. The catalog's known-drift guards cover selected decisions
and stale literals; they do not interpret every document or establish aircraft
fidelity. Keep independent quality/specification review and the batched external
peer range under [SDLC](../docs/SDLC.md). See [ASSR](../docs/assure/ASSR.md) for
source provenance, certainty and acceptance boundaries.

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

`validate_manifest.py` checks aircraft manifests under `data/aircraft/` against
`data/schema/aircraft-manifest.schema.json` plus source/revision cross-checks;
`test_validate_manifest.py` covers its failure cases.
