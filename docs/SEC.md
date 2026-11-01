# Security and data design

## Assets and boundaries

Protect source code, build environment, dependency integrity, aircraft/reference provenance and any future learner progress or uploaded scenarios. No simulator accounts, personal telemetry or runtime AI integrations are currently implemented. Developer cross-provider peer review is a separate data flow described below. Raw input contains the product brief, not learner records. User decisions about geography/framework do not determine hosting or data jurisdiction.

## Threats and controls

| Threat | Design consequence | Verification and phase |
| --- | --- | --- |
| Malicious aircraft, scenario or replay import | Declarative versioned schemas; reject executable content, oversized files, invalid units and non-finite/out-of-range numbers | Adversarial import fixtures before imports ship |
| Unsafe browser rendering or injection from research/AI text | Escape strings; no untrusted HTML; allowlist resource URLs; distinguish evidence from instructions | Quality review and browser security tests with the first UI |
| Unauthorized or stale manuals, maps, navigation data and avionics assets | Source/version/applicability/rights manifests; ingestion and update review; explicit unsupported claims | Research/product review and asset inventory before ingestion |
| Supply-chain compromise | Minimal dependencies, lockfiles, pinned CI actions, provenance/license review, automated update process once stack chosen | SBOM review and installation/CI checks in foundation |
| Secret exposure | Ignore `.env*` except `.env.example`; never embed private provider keys in a client bundle | Inspect tracked changes and built bundle before release |
| Learner privacy and unexpected external traffic | Local-first default; explicit data flow/retention decision before accounts, telemetry or model calls | Network inspection and deletion/export tests when added |
| Corrupted or misleading simulation results | Versioned fixtures, bounded numerics, fidelity labels, no unsupported certification claims | Quality and validation gates; physics evidence in EVAL |
| Agent races or source manipulation | Disjoint write sets, immutable raw inputs, one integration owner, external text treated as untrusted | Dispatch review and integrated checks |
| Misleading live/expired weather, NOTAM or navigation data | Declare source, coverage, edition and issue/validity time; distinguish missing data from a verified empty result; freeze scenario inputs for review | Invalid/stale/unavailable-feed fixtures before briefing integration |
| Imported briefing text or generated radio messages changing scenario state | Parse declarative data and bounded communication intents; scenario rules own state changes; escape rendered messages | Malicious input, invalid readback and contradictory-state cases before text radio ships |
| Orientation/location or recorded communication leaking through integrations | Request only needed browser permissions; explicit denial fallback; keep session events local by default; review storage/export and service data flow before enabling it | Permission-denied and network/storage inspection on supported mobile/browser targets |
| Unauthorized or spoofed paired-phone control input (R-INPUT-3) | Explicit user-confirmed, short-lived, session-scoped pairing; authenticated encrypted transport; reject unpaired, stale or replayed samples; visible paired state and one-click unpair; local network by default | Pairing/unpairing, foreign-device and replay tests; packet inspection on the reference Mac/iPhone |
| LLM authoring fabricating facts, following instructions embedded in a source or producing executable content | Resolve real assets through structured sources; validate declarative packages and record provenance; isolate untrusted source text from authoring instructions; require review before accepted use | Unknown-fix, malicious-source, invalid-geometry, incompatible-equipment and provider-failure cases in E9 |
| Public community exposing private records or falsely labeling content as reviewed | Explicit submission visibility, scoped roles, authorship/review labels, reporting/moderation/removal and retention decisions | Scoped community access/content cases in E11 before deployment |

## Repository-tool CI

The foundation workflow runs the committed offline gate on pull requests to
`main` and pushes to `main`. Its token has only `contents: read`; checkout does
not persist credentials. It uses immutable action commits, no repository secrets,
package installation, live provider calls or document rendering. Pull-request
code executes in the normal `pull_request` context, never a privileged
`pull_request_target` context. The test process is not a sandbox for arbitrary
local code; inspect contributions before running them on a developer machine.

Dependabot proposes GitHub Actions pin updates weekly; verify the upstream
release/commit, review changes and rerun the gate before accepting an update.
Hosted runner images and Python patch versions still change. This workflow does
not configure branch protection, scan future application dependencies or replace
the independent quality, validation and cross-provider reviews. See
[E0-CI](EVAL.md#e0-ci-are-repository-tool-quality-gates-reproducible-locally-and-in-ci)
and [the tool inventory](SBOM.md).

## Assurance inputs and outputs

Assurance reads repository text, Git history and declarative catalogs as untrusted
data. It does not execute imported scenario/model content, fetch cited sources or
send artifacts to a provider. Repository paths must stay inside the selected
checkout/revision; reject traversal, absolute paths and symlink escapes. Bound
reads and child processes, scrub inherited Git/Node redirection, and use argument
arrays rather than shell evaluation. Generated outputs are ignored and rebuildable.

Evidence outcome, link certainty, aircraft value status and review independence
are separate fields. A source citation or passing schema check is not source
truth, permission or fidelity. Accepted claims require current named evidence;
missing/skipped/stale evidence cannot silently become a pass. The catalog records
relationships and safeguards, not secrets or copies of restricted manuals.

## Developer peer review

The peer router sends only the orchestrator's inspected packet to the selected
other provider using existing local authentication. Exclude credentials, unrelated
personal information and unauthorized source material; do not publish raw auth or
session metadata. Record the actual route, packet hash and provider evidence.
Provider failure, missing identity or incomplete evidence cannot become a passed
review or trigger a same-provider fallback.

Claude runs a fresh, tool-disabled safe-mode packet review; Codex runs a fresh
read-only exec with packet-only instructions and blocks detected tool-use output.
These controls have different limits and do not attest the remote backend or
replace parent permissions. Do not enable permission bypass, install/reauthenticate
providers or post reports as part of review. Keep local outputs under ignored
`output/`; inspect the normalized report before including it in source/PR evidence.

## Document rendering

Pandoc/Chrome and the LaTeX filter are developer tools. Build trusted repository Markdown only. Mermaid builds download a versioned script from a CDN; no document containing Mermaid currently requires it for the scaffold. The inherited LaTeX filter disables shell escape and restricts file access, but this is not a general document sandbox. Never build arbitrary external documents without inspection and suitable isolation.

## Controls by phase

Bootstrap: ignore rules, provenance notes, source limits and agent ownership conventions. Foundation: stack-specific lint/types/tests, lockfiles, secret/dependency checks and CI definitions. First application: validate inputs, bound simulation data, test error states and accessible controls. External services or learner storage: update the data-flow model, obligations, consent, retention, deletion, backups and incident response before enabling them.

Research must verify applicable legal/regulatory facts from current primary sources; these planned controls are design choices, not a claim of legal compliance. Quality records security impact for each change; validation checks the agreed security requirements against observable evidence.

The expanded [training scope](design/TRAINING.md) introduces provider trust and
privacy boundaries; it does not select a feed or enable external traffic. A future
proxy/cache requires allowlisted upstream requests, protected credentials, access
and rate controls, source/rights review and an explicit stale/offline policy.
Do not execute community add-on scripts merely to inspect their feature claims.

The free/open-source community and AI-authoring directions introduce concrete
service boundaries. Keep private provider credentials and learner data out of
shared experience packages, prompts/logs and public repositories. Define which
data reaches a local or hosted model before integration, including redaction,
retention and cost/rate controls. Open-source code does not make private community
records public. Validate uploaded packages as untrusted data and preserve a
usable simulator path when community or AI services are unavailable.
