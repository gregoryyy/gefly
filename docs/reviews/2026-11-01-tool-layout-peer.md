# Tool-layout external peer disposition

Recorded **2026-11-01 22:01 Europe/Berlin**, from the execution clock.
Disposition: **complete independent coverage for T1–T5**, combining two scoped
Claude reviews at the same integrated revision. The [JSON record](2026-11-01-tool-layout-peer.json)
preserves both returned reports, their original outcomes and the coverage map.
The combined disposition is the orchestrator's assessment of coverage, not an
invented provider response.

## Scope and frozen inputs

- PR: [#28](https://github.com/gregoryyy/gefly/pull/28).
- Reviewed revision: `8180fb24bc593fa8ee8b2bd4bf96aa70a8c1f15d`;
  base: `4339693144ea1db1549cb1eefe87ac03bba6ec6d`.
- Core source: 192 files, including TODO/DONE/input; SHA-256
  `6c3b75d114e9296d1dd3813c35352569f9535e6bca68da767b868c647691af1e`.
  Review records and ignored outputs are excluded from this hash. The two changed
  historical review files are additionally frozen with individual before/after
  hashes in the JSON record and supplied as primary source in the follow-up.
- Main packet: `output/assurance/tool-layout-peer-packet.md`; SHA-256
  `bdf7c28436b1f8416637cd61f4ba1067d0f5d87a22fa7d8ea3419c2147e89d2b`.
- Navigation packet: `output/assurance/tool-layout-peer-navigation-packet.md`;
  SHA-256 `295f5dc0d73df2fe4d6ca732edc0f80b617f5e7ae27518e700096b6b9541082b`.

New relocation, integration and navigation edits are Codex-authored. The 13
unchanged pinned Propeller files are reviewed at their integration boundary.
Earlier Claude-authored Gefly work remains outside this scope under TODO 0.19.
The earlier assurance peer acceptance is historical evidence at its own revision;
it did not automatically accept this later relocation.

## Actual provider evidence and outcomes

Both attempts used fresh **Claude CLI 2.1.193** processes through
`utils/peer_review.py`, with safe mode, empty tools and no session persistence.
Both requested `ANTHROPIC_MODEL=opus` and `CLAUDE_CODE_EFFORT_LEVEL=high`.
Both returned model evidence naming **claude-opus-4-8** and
**claude-haiku-4-5-20251001**. These names do not identify each model's subtask
or attest backend identity/effort; neither is omitted from the evidence.

1. **Relocation review:** no quality findings; T1–T5 implementation/integration
   rows passed. Its overall recommendation was **blocked**, exit 2, solely
   because the packet summarized the five historical href edits without their
   actual file diff. That blocked result remains unchanged in the JSON record.
2. **Affected navigation follow-up:** supplied complete before/after files,
   actual Git diff and recorded Git object identities at the same revision.
   No quality findings; all four T5-NAV rows passed; **accept**, exit 0.
   It verifies exactly five href edits, recorded revision/path applicability,
   transparent notes and preservation of commands/findings/outcomes.

No implementation source changed between these attempts. The focused follow-up
supersedes only the missing-evidence navigation row; it does not claim to
re-review unrelated code. Together, the reports provide passing independent
coverage of the full relocation scope, including the archived links.

Independent local [quality](2026-11-01-tool-layout-quality.md) and
[validation](2026-11-01-tool-layout-validation.md) remain separate. Their repaired
mixed-layout inventory checks and exact source hash are not inferred from the
external process exit alone.

## Actual hosted observations

The orchestrator inspected [run 41348997794](https://github.com/gregoryyy/gefly/actions/runs/41348997794):
both jobs passed for head `8180fb2`, with logs identifying synthetic merge
`5f1cb7e…` into `65faaea…`. Both invoke
`python3 utils/ci/run.py --require-node`. Observed versions: Python
**3.11.17 / 3.15.1**, Node **26.13.0**, Git **2.56.0**. Each passes 137 Python
tests, 72 assurance tests, synthetic rendering and integrity; study execution
retains **14 executed / nine optional JSBSim skips**, not 23 passes.

## Limits

These were packet-only reviews: neither provider executed tests or fetched
links/hosted logs. The navigation follow-up relies on recorded Git objects for
URL existence. It notes that the validation report's inspected-file links are
inside a retained initial-scope section but point to its recorded repaired
revision; this applicability nuance was explicitly accepted, not treated as a
defect or concealed. Historical commands, findings and outcomes were preserved.

Generated review publication after `8180fb2` does not change the reviewed core
source or historical input hashes. No simulator, aircraft fidelity, source
rights, learner benefit, MVP, training credit or certification is accepted.
All 14 seeded MVP criteria remain planned with zero accepted claims.
