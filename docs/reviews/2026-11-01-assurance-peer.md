# Assurance adoption: external peer review

Recorded **2026-11-01 21:24 Europe/Berlin**, from the execution clock.
Disposition: **accepted for the bounded assurance slice**, with two low-severity
items explicitly disposed below. The [normalized provider result](2026-11-01-assurance-peer.json)
preserves the returned quality findings, criterion matrix and limitations.

## Frozen scope and identity

- PR: [#28](https://github.com/gregoryyy/gefly/pull/28).
- Integrated revision: `d038ec087a31cec45c4a7ca0d760aae5945a167b`;
  base: `65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c`.
- Reviewed source: 189 files, including TODO/DONE/RESULTS; SHA-256
  `dfbfbc3c9ac45c5ed0c6b7c58e2a3790e79aa1469fcbce8a6d81eada2b34f31d`.
  Generated review records and ignored output are excluded to avoid recursive
  hashes. Later publication of review records does not change this source scope.
- Frozen packet: `output/assurance/peer-packet.md`; SHA-256
  `28a91cc8e8f21f9b25b63ab02be6cd90c6233dd102606ea5fec64c8b8db01ce3`.
- Authors: Codex/OpenAI implementation streams and integration. External reviewer:
  a fresh **Claude CLI 2.1.193** process through `utils/peer_review.py`, with
  safe mode, empty tools and session persistence disabled. Actual invocation
  completed with exit 0 and a structurally validated accept result; a dry run
  did not establish this disposition.
- Explicit per-process request: `ANTHROPIC_MODEL=opus`,
  `CLAUDE_CODE_EFFORT_LEVEL=high`. Returned model evidence contains
  `claude-opus-4-8` **and** `claude-haiku-4-5-20251001`. Both names are retained;
  the metadata does not identify each model's subtask or attest backend effort.
  This is not a claim that every internal operation used Opus.

Coverage is the new Codex-authored assurance adapters, CI integration, catalog and
status reconciliation, mapped to R-ASR-1 through R-ASR-5 and AS1–AS8. The 13
unchanged Propeller files are an imported pinned GPL dependency; their integration
and interface were reviewed, not their entire upstream implementation reaccepted.
Earlier Claude-authored Gefly PRs and generated review artifacts are excluded.
**TODO 0.19 remains open** for that separate covering review. This report does not
represent reciprocal acceptance of mixed historical authorship.

## Quality and validation disposition

The provider returned **accept**, all **AS1–AS8 pass**, plus a passing evidence
semantics/enforcement row. No critical, high or medium finding was returned.
The complete expected/observed/evidence matrix is in the JSON record.

1. **Low: duplicate undefined-requirement diagnostics.** An invalid catalog
   requirement receives both a specific evidence error and a graph endpoint
   error. Accepted as nonblocking cosmetic duplication: both identify the root
   cause, the checker rejects the input, and no false acceptance is introduced.
2. **Low: ledger comparison scope.** Append-only comparison against committed
   HEAD is available for working-tree checks. Historical revision reads do not
   claim parent-relative ledger enforcement. This matches the documented scope;
   the finding itself identifies it as scope narrowing, not a correctness defect.

These dispositions need no source change. Any later change to the affected
contract or implementation needs renewed evidence. Local independent
[quality](2026-11-01-assurance-quality.md) and
[validation](2026-11-01-assurance-validation.md) remain separate from this result.
The final published checkpoint also passed both hosted jobs in
[run 41345842002](https://github.com/gregoryyy/gefly/actions/runs/41345842002),
with nine optional-engine skips explicitly retained.

## Evidence limits

This was a packet-only review; the reviewer did not execute commands or fetch
hosted logs. The orchestrator checked actual hosted results separately. Aircraft
and archived benchmark JSON bytes were not in the packet; review of their
resolution relied on supplied adapter/test source and recorded observations.
Independent local reviewers inspected those repository inputs. Prior review
conclusions were excluded from the peer packet, so it does not independently
verify the narrative count of seven earlier findings.

CLI routing and returned model names are evidence, not backend attestation.
Declared independent-review flags do not authenticate a provider. No full MVP,
aircraft fidelity, source rights, learning validity, training credit or
certification is accepted. All 14 seeded MVP criteria remain planned, with zero
accepted claims; archival evidence remains ineligible for acceptance.
