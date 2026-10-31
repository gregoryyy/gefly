# Orchestrator and specialist agents

These eight roles implement the requested work split. [AGENTS.md](../../AGENTS.md)
is the shared entry point. The primary conversation follows the orchestrator role;
worker roles are delegated through the runtime's agent tools. Role definitions are
instructions, not background services or filesystem permission enforcement.

## Responsibilities and authoritative outputs

| Role | Responsibility | Inputs | Outputs / write boundary |
| --- | --- | --- | --- |
| [orchestrator](orchestrator.md) | User dialogue, questions, decisions, scheduling, ownership and integration | User brief, GAPS, plan, worker evidence | User updates; dated GAPS decisions; shared TODO/DONE and integrated changes |
| [researcher](researcher.md) | Background web research, reference documents and data | Bounded question, applicability and desired evidence | Assigned research notes/source manifests; recommendations, not decisions |
| [product](product.md) | Refine requirements and specification | User decisions, research, feedback and constraints | Assigned SPEC/design changes, acceptance criteria and proposed gaps |
| [code1](code1.md) | Implement a requirement slice and tests | Agreed SPEC revision, contracts and exclusive paths | Assigned implementation paths, tests and evidence |
| [code2](code2.md) | Second equal implementation stream in parallel with code1 | Same dispatch contract on a separate slice | Disjoint implementation paths, tests and evidence |
| [quality](quality.md) | Independent code quality, correctness, security and test review | Integrated diff, requirements, quality rules and checks | Assigned review report with findings; no self-approval or silent repairs |
| [validate](validate.md) | Independently validate completed work against SPEC | Integrated artifact, frozen criteria and reproducible evidence | Requirement-by-criterion matrix and acceptance recommendation |
| [housekeeping](housekeeping.md) | Maintain repository hygiene alongside implementation | Exclusive docs/tooling paths and shared-file restrictions | Assigned hygiene changes, checks and integration proposals |

`code1` and `code2` have identical implementation authority and standards. The
user's `coder1` spelling is an alias for `code1`. Neither is a reviewer for its own
code. Housekeeping does not accept a feature; quality does not replace specification
validation; validate does not redefine acceptance to match the implementation.

## Dispatch and concurrency

Orchestrator → researcher → product → agreed specification/contracts → **code1 +
code2 + housekeeping concurrently** → integrated artifact → quality → validate →
orchestrator/user. Research/product can overlap unrelated implementation where
their outputs do not change its frozen requirements or shared paths. Quality and
validate can inspect the same stable artifact concurrently if capacity permits;
any subsequent fix or integration invalidates affected reviews.

For a four-thread runtime, keep the primary plus three workers. Use the three
worker slots for both coding streams and housekeeping during implementation;
schedule research/product and independent review in other waves. With fewer slots,
bound the worker tasks and explain scheduling limits while preserving ownership.
Keep at least two coding tasks independent enough to run concurrently when the
runtime supports it. Do not spawn all roles just because they exist.

Give each worker an explicit write set. Contracts, manifests, dependency lockfiles,
root plan and progress logs have one integration owner per change. Use isolated
worktrees where they help; when sharing a checkout, no two agents edit the same
file concurrently. Workers return proposed shared-document changes instead of
applying them. Never revert another agent's work. Resolve interface changes before
resuming dependent parallel edits.

## Dispatch template

```text
Task / role:
Goal and exclusions:
TODO and requirement IDs:
SPEC revision or content hash / frozen criteria:
Dependencies and agreed interface versions:
Inputs, source applicability and read paths:
Exclusive write paths / integration owner:
Checks, evaluation protocol and required evidence:
Other active agents and shared paths to avoid:
Open decisions, stop conditions and return destination:
```

## Return template

```text
Task / role / reviewed revision or working-tree scope:
Status: complete | needs changes | blocked | partial
Changed paths / proposed shared-file updates:
Requirement and criterion evidence:
Commands actually run and observed results:
Findings: severity, location, reproduction, expected/actual behavior
Sources / applicability / uncertainty (where relevant):
Open questions, limits and affected follow-up work:
```

Quality uses finding severities critical/high/medium/low with evidence. Validate
uses **pass / fail / blocked / not evaluated** per criterion, with expected versus
observed behavior and source/test/artifact reference. An implementation report or
a checked TODO box alone is not acceptance evidence. Review reports name the
artifact version or bounded working-tree snapshot. The orchestrator integrates
shared records and requests affected rechecks after repairs.

## Runtime setup

Canonical role prompts live here. `.codex/agents/*.toml` registers one native Codex
agent for each role and instructs it to read its matching document plus AGENTS.
No model, reasoning level, credentials or sandbox overrides are imposed. The
project config enables agents with up to three concurrent worker threads; the
host's policy and available slots still govern actual execution. The primary
conversation becomes the orchestrator through AGENTS, not by auto-spawning a
second user-facing agent.

This setup follows the [official Codex subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents),
consulted 2026-10-31. Native custom-agent discovery requires a client supporting
that schema; TOML checks cannot prove live discovery. In other runtimes, the
orchestrator can pass the canonical role prompt and explicit task to their own
delegation tools. `CLAUDE.md` imports AGENTS; native Claude-specific role wrappers
and hooks are optional future adapters, not installed enforcement.

Research uses available deep research skills after reading their instructions.
There is no dedicated deep research skill in the current session. The documented
fallback is an explicit question, primary-source searches and retrieval, cross-
checks, version/applicability/rights metadata, uncertainty and linked synthesis;
the [research index](../research/README.md) defines its format.
