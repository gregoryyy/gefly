# Gefly

Gefly is a flight simulator that starts with approachable exercises and progressively adds realistic flight dynamics, aircraft controls and avionics. The first target is a **Cessna 172 for EASA PPL learning**, delivered as a **web application**, with GeoFS as an interaction reference. CPL exercises follow later. The precise aircraft variant, year, avionics and implementation stack are still open.

The intended product is **free and open source**, with a community site organized
around flight-school practice. The first regional model is **EDDF plus a 100 NM
radius**, using real source material. Later experience authoring should use LLMs
to assemble sourced territory/navigation/chart packages and support AI interaction.
The architecture favors reusing open physics engines and aircraft models. Exact
license, providers, engine, hosting and deployment are still decisions.

The aim is to connect each modeled behavior to aircraft documentation and each exercise to an explicit learning objective. Assistance and model limitations should stay visible as realism increases. Aircraft fidelity and learning benefits are goals to evaluate; this repository does not yet contain a runnable simulator or establish eligibility for training credit.

The refined direction preserves GeoFS-style accessibility and geography while
focusing on fewer aircraft with fuller working controls: **classic C172 instruments
first, glass later**, QNH/QFE/standard settings, cockpit navigation, briefing,
checklists, text radio, drills and synchronized review. The [training design](docs/design/TRAINING.md)
separates requested capabilities from proposed delivery order; the [comparison
research](docs/research/2026-10-31-geofs-gap-analysis.md) checks documented features
and community reports rather than assuming the user's observed gaps are absent
everywhere in GeoFS.

## Status and entry points

Project foundation: requirements, architecture, roadmap, research and the orchestrator/subagent workflow. Start with [the concept](docs/design/CONCEPT.md), [specification](docs/SPEC.md), [open questions](docs/GAPS.md) and [next tasks](docs/TODO.md).

The [bootstrap guide](docs/BOOT.md) is adapted from `../propeller/docs/BOOT.md` and extended with the requested eight roles. [AGENTS.md](AGENTS.md) governs contributions; [the agent workflow](docs/agents/README.md) explains dispatch, ownership, parallel work and review. Native Codex definitions are in `.codex/agents/`; their role instructions are in `docs/agents/`.

## Local commands

```sh
just check                 # scaffold, links and agent configuration checks; Python 3.11+
just docs                  # A4 PDFs alongside Markdown; pandoc and Google Chrome
just pdf docs/IDEA.md      # build one document
just reqs                 # requirement declarations
just clean                # remove generated document outputs
```

Use `just --list` for all recipes. No app build, development server or simulator test suite exists yet. [Foundation milestone 1](docs/TODO.md#1-foundation) chooses the stack and adds those commands. Generated PDFs are ignored by Git. See [utilities](utils/README.md) and [dependencies](docs/SBOM.md) for tool requirements and document build limitations.

## Document map

| Document | Purpose |
| --- | --- |
| [IDEA](docs/IDEA.md), [CONCEPT](docs/design/CONCEPT.md), [TRAINING](docs/design/TRAINING.md), [SPEC](docs/SPEC.md) | Purpose, model, learner journey and requirements |
| [ARCH](docs/ARCH.md), [SEC](docs/SEC.md) | Components, trust boundaries and security |
| [EVAL](docs/EVAL.md), [RESULTS](docs/RESULTS.md) | Evaluation protocols and observed evidence |
| [TODO](docs/TODO.md), [ROAD](docs/ROAD.md), [DONE](docs/DONE.md) | Work, phases and progress |
| [GAPS](docs/GAPS.md) | Decisions, questions and assumptions |
| [SDLC](docs/SDLC.md), [STYLE](docs/STYLE.md), [SBOM](docs/SBOM.md) | Development and dependency conventions |
| [Research](docs/research/README.md), [assurance](docs/assure/ASSR.md) | Sources and requirement traceability |
| [Input](docs/input/README.md), [BOOT](docs/BOOT.md) | Original brief and setup method |

## Layout

```text
.codex/agents/       native Codex role registrations
docs/agents/        canonical role instructions and handoff templates
docs/               product, process, research and planning records
app/                reserved web application boundary
packages/           contracts, simulation, aircraft, avionics and training boundaries
data/               aircraft/source manifests; no unlicensed manuals or scenery
tests/              future reference fixtures, physics and acceptance checks
studies/            bounded technical and learning experiments
utils/              repository checks and document build assets
```

The runtime directories contain scope notes, not implementations. The initial
public repository destination is [gregoryyy/gefly](https://github.com/gregoryyy/gefly),
selected under the user's publication instruction. Exact project-wide licensing
remains GAPS Q5; the Propeller-derived bootstrap material retains GPL-3.0-or-later
with its full license text and [upstream notices](THIRD_PARTY_NOTICES.md).
