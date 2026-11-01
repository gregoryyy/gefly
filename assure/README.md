# Gefly assurance tool

The source documents, Git history, aircraft data and recorded observations remain
authoritative. This tool builds disposable lineage and checks bounded structural
contracts; it does not establish physics fidelity, data rights, test adequacy,
provider identity or approved training credit. See the [adopted contract](../docs/assure/SPEC.md)
and [evidence format](FORMAT.md).

Node **24.2 or newer** and Git are required. Node executes the local TypeScript
adapters with built-in type stripping. There are no npm packages to install, no
runtime dependencies and no lockfile. The simulator runtime is separate.

```sh
node assure/src/cli.ts check
node assure/src/cli.ts check --json
node assure/src/cli.ts report
node assure/src/cli.ts report --json
node assure/src/cli.ts trace R-ASR-1
node assure/src/cli.ts trace todo:1.14
node assure/src/cli.ts diff HEAD~1
node assure/src/cli.ts impact data/aircraft/c172s-classic/poh-values.json
node assure/src/cli.ts lineage
node --test 'assure/src/*.test.ts' 'assure/upstream/src/**/*.test.ts'
```

The default root comes from the CLI file location, so an absolute invocation works
from any caller directory. `--root PATH` selects another local checkout for an
explicit inspection; `--revision REV` reads a committed snapshot instead of the
working tree. `diff REV` compares that revision to the selected current snapshot.
Trace accepts either a bare ID or `kind:id`. Impact accepts a file or an RFC 6901
field identity such as `data/value.json#/field`; unknown dependencies are reported,
never treated as an all-clear. Query output is JSON. Report output is Markdown by
default and a complete sorted graph with `--json`. Check JSON contains findings,
summary and limits. No result contains a wall-clock generation timestamp.

Exit **0** means no structural errors were found, **1** means current integrity
errors exist, and **2** means invalid arguments or a read/limit failure prevented
a result. Warning/note counts remain visible. A zero exit is not an accepted
simulator or evidence claim. Missing implementation links for future requirements
are advisory. Undefined current IDs, duplicate declarations, completed tasks with
explicit unresolved blockers, malformed status/evidence records and invalid
accepted evidence are errors. Historical commit trailer defects are warnings.

`lineage` is the only writing command. It writes `assure/out/graph.json` and
`assure/out/report.md`, requires those outputs to be ignored, and refuses escaping
or symbolic output files. It never opens a browser or posts a report. Checking
does not change source files, Git or the ledger.

The [upstream inventory](UPSTREAM.json) records original byte SHA-256 hashes from
Propeller commit `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`, licensed
**GPL-3.0-or-later**. The pure model/facts/store/ledger, Markdown and ID readers,
requirements/plan/Refs extractors and self-contained tests retain original bytes
and source paths under `upstream/`. No Propeller UI, database, Git reader or npm
dependency is adopted. Gefly adaptations are in `src/`: snapshot confinement,
local document grammar/status checks, graph assembly/query/report and evidence
inspection. Inventory checks compare pinned source bytes; updates require review
of the new source revision, license and corresponding inventory/specification.

Requirements are defined only in `docs/SPEC.md`. Current TODO hierarchy and GAPS
question/assumption IDs are parsed separately. An answer in an open question is a
partial decision; it does not resolve the whole question. DONE identity combines
timestamp and title. Full duplicate headings, newer entries below older entries,
missing metadata and repeated substantive implementation bodies are errors;
equal timestamps with different titles are allowed. TODO/DONE links record scope,
not acceptance. Tests are lexical identities (Python test functions, JavaScript/
TypeScript `test`/`it` calls and C++ `TEST`/`TEST_F` macros), with file-level code
objects. There is no full language AST, call graph or import execution.

Historical `docs/input/`, `docs/reviews/` and vendored code are excluded from
current declaration scanning. Evidence may request those source records by an
explicit pinned path. All Git commits, including merges, are read; file-change
edges use differences against every merge parent. Legacy malformed trailers stay
visible as warnings. Certainty (`declared`, `derived`, `uncertain`, `confirmed`,
`stale`) belongs to links; evidence outcomes and explicit acceptance are separate.
The reused append-only ledger is checked against HEAD in worktree mode, and
changed confirmation endpoints become stale. There is no ledger-edit command.

Reads use fixed Git argument arrays with inherited `GIT_*` variables removed,
no lazy fetch, no prompts and a ten-second timeout per Git read. Limits are 2 MiB
per text file, 24 MiB per Git output, 12,000 paths, fewer than 5,000 commits,
48 JSON levels/12,000 fields per generic file, 60,000 nodes and 200,000 facts.
Impact closure reports truncation at 5,000 nodes. Paths reject absolute/traversal
forms; working-tree symlinks must remain inside the checkout, and committed
symlinks are unsupported. Binary/non-UTF-8 selected inputs fail explicitly.
No shell, network, browser, simulator or provider is invoked by assurance; strings
in source files are data. Checkout state is not locked: freeze inputs before
independent review, and use a committed revision when an immutable snapshot is
needed. Unknown semantic relationships and unrecorded run evidence remain limits.
