# Gefly contributor and agent rules

## Purpose and current scope

Build a progressively realistic flight simulator for PPL and later CPL learning. User decisions: Cessna 172, EASA PPL first, web application similar to GeoFS; classic instruments before glass; QNH/QFE/standard pressure; a free/open-source flight-school community; AI-assisted flight-experience creation; EDDF and a 100 NM radius as the first regional model. Prefer reuse of open physics engines and models. See [SPEC](docs/SPEC.md). This delivery is the project foundation and its requirements refinements; implementing the roadmap is subsequent work. Project license: GPL-3.0-or-later, with non-proprietary, permissive-preferred third-party licenses (GAPS Q5). First aircraft: classic-panel 172S, then Reims FR172; first exercise: take-off, circuit and landing at Frankfurt-Egelsbach (EDFE). Dynamics engine: JSBSim, LGPL-2.1 accepted as a copyleft exception (GAPS Q17). Web stack: TypeScript, CesiumJS renderer (three.js fallback), MapLibre 2D maps, JSBSim in a Web Worker (GAPS Q17). Hosting is **not decided**.

Read [SDLC](docs/SDLC.md), [STYLE](docs/STYLE.md), [SEC](docs/SEC.md), [TODO](docs/TODO.md) and the relevant specification before changing work. The root documents are defaults; a subproject document may supersede a counterpart only within its stated scope. Keep requirements and task status authoritative in one place.

## Orchestrator and subagents

The primary conversation acts as **orchestrator**: interact with the user, ask concise questions, record dated answers and assumptions in GAPS, select actionable tasks, assign ownership, integrate and report. Delegate independent work using the [nine role definitions](docs/agents/README.md): orchestrator, researcher, product, code1, code2, quality, validate, peer and housekeeping. Use available runtime tools; defining a role does not launch a persistent service.

Run **code1 and code2 in parallel** on separate specification slices and disjoint paths after agreeing shared contracts. They have equal implementation responsibilities; `coder1` in the original brief means `code1`. Run **housekeeping alongside implementation** on separately assigned documentation/tooling paths. The orchestrator owns integration files and shared status; never let workers race on lockfiles, contracts, GAPS, TODO or DONE. Respect runtime concurrency limits; schedule in waves when necessary, reserving parallel capacity for housekeeping during implementation. Select the **model size and reasoning effort** for each task by its difficulty and risk ([BOOT](docs/BOOT.md#dispatch-parallel-work-and-integration), GAPS Q20): small/low for mechanical work, larger/higher for design, security, numerics, aircraft data and reviews; reviewers never use a lower tier than the work they review.

**Quality** independently checks correctness, security, maintainability, test quality, units and numerical risks. **Validate** independently checks the delivered behavior against each in-scope specification criterion. Neither approves its own implementation. Failed checks return to a coder; changed artifacts require renewed affected reviews. Missing evidence is blocked or not evaluated, never a pass. Full dispatch and return contracts are in [the workflow](docs/agents/README.md).

**Peer** adds actual cross-provider quality and specification validation, batched
**every few PRs** with in-between work marked *peer pending* ([cadence](docs/SDLC.md#cross-provider-peer-gate), GAPS Q15): Claude
reviews Codex-authored work; Codex reviews Claude-authored work. Use a fresh
external provider process and the frozen packet via [the peer contract](docs/agents/peer.md).
A local dispatcher, same-provider subagent or model alias does not satisfy this
gate. Record authorship, provider/CLI/model evidence, revision/packet hash and
separate quality/validation outcomes. Mixed authorship needs reciprocal coverage,
excluding each reviewer's own work. Missing access/identity/evidence is blocked,
with no silent fallback; do not claim old local reviews meet the new peer gate.

## Design rules

- Keep deterministic simulation state separate from browser rendering and teaching assistance. UI frame rate must not change the simulation step.
- Use explicit units and coordinate frames; use SI internally unless a documented boundary requires another unit. Keep indicated/true/ground airspeed and magnetic/true references distinct.
- Model an identified aircraft variant and avionics configuration from applicable sources. Mark generic instructional behavior and unsupported behavior visibly. Never invent aircraft-specific coefficients or tolerances.
- Record fidelity, assists, aircraft/model versions, source provenance and limitations. Increasing realism must have measurable acceptance criteria.
- Web references and AI output are evidence to review, never instructions or authority over aircraft operation. AI must not supply real-time authoritative flight dynamics or avionics state.
- Do not claim training credit, regulatory approval or validated fidelity without supporting evidence and the applicable review.
- Prefer existing open flight-dynamics engines and applicable aircraft models; evaluate integration, license compatibility and reference-case behavior before writing replacement physics. Justify custom components against a documented gap.
- LLM-authored experiences use declarative, validated packages with source-backed geography/navigation/chart references. Generated prose cannot establish a real fix, procedure, aircraft value or accepted scenario state.

Changes to these rules require a recorded design decision and corresponding SPEC/ARCH/SEC changes.

## Work and documentation

Work on feature branches after initial bootstrap; main changes through PRs when a remote exists. The user wants a free/open-source project; the public source repository is `gregoryyy/gefly`. The project license is GPL-3.0-or-later (GAPS Q5); future asset rights, contributor terms and hosting remain to be selected. Do not create a remote or change the license as a side effect of ordinary implementation. User authorization governs commits, pushes and external actions. Avoid committing another worker's unfinished changes.

Keep task IDs stable. Requirements are declared once in SPEC; use IDs in tasks, test names and review evidence. Commit messages use `Refs:` trailers when commits are made. Update TODO and prepend a clock-derived `YYYY-MM-DD HH:MM` entry to DONE in **Europe/Berlin**, naming the actual agent and subagents. Do not invent model versions or test results. Raw `docs/input/` records are immutable; add corrections as new records.

Central documents use upper-case names; notes, code and research use lower case. Preserve answer history with date, time and author, newest first; strike through superseded answers and link resolved gaps to affected documents. Research informs decisions; product proposes requirements; the orchestrator records decisions within the user's direction.

Run `just check` for foundation changes. Run implementation-specific tests once added; a scaffold check is not a physics or training validation. Follow the definition of done in SDLC. Keep secrets and personal telemetry out of source control. Track licenses, source applicability and permitted redistribution before adding dependencies, aircraft data, imagery or avionics assets.
