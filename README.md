# Gefly

Gefly is a flight simulator that starts with approachable exercises and progressively adds realistic flight dynamics, aircraft controls and avionics. The first target is a **Cessna 172 for EASA PPL learning**, delivered as a **web application**, with GeoFS as an interaction reference. CPL exercises follow later. The precise aircraft variant, year, avionics and implementation stack are still open.

The intended product is **free and open source**, with a community site organized
around flight-school practice. The first regional model is **EDDF plus a 100 NM
radius**, using real source material. Later experience authoring should use LLMs
to assemble sourced territory/navigation/chart packages and support AI interaction.
The architecture favors reusing open physics engines and aircraft models. The
license is GPL-3.0-or-later; the first exercise is a take-off, circuit and landing
at Frankfurt-Egelsbach (EDFE) in a classic-panel Cessna 172S, with the Reims FR172 as a second configuration. The dynamics engine
is JSBSim (GAPS Q17); rendering, providers, hosting and deployment are still decisions.

The aim is to connect each modeled behavior to aircraft documentation and each exercise to an explicit learning objective. Assistance and model limitations should stay visible as realism increases. Aircraft fidelity and learning benefits are goals to evaluate; this repository does not yet contain a runnable simulator or establish eligibility for training credit.

The refined direction preserves GeoFS-style accessibility and geography while
focusing on fewer aircraft with fuller working controls: **classic C172 instruments
first, glass later**, QNH/QFE/standard settings, cockpit navigation, briefing,
checklists, text radio, drills and synchronized review. The [training design](docs/design/TRAINING.md)
separates requested capabilities from proposed delivery order; the [comparison
research](docs/research/2026-10-31-geofs-gap-analysis.md) checks documented features
and community reports rather than assuming the user's observed gaps are absent
everywhere in GeoFS.

The first input baseline is **Mac desktop, keyboard and touchpad**, with optional
**yoke/joystick and rudder pedals**, using a [GeoFS-inspired control profile](docs/design/CONTROLS.md).
Briefing starts with versioned scenarios and labeled historical/generated
weather/NOTAM data; a live-data adapter is optional later work. Mobile orientation remains
a later supported-device capability.

## Status and entry points

Project foundation: requirements, architecture, roadmap, research and the orchestrator/subagent workflow. Start with [the concept](docs/design/CONCEPT.md), [specification](docs/SPEC.md), [open questions](docs/GAPS.md) and [next tasks](docs/TODO.md).

The [bootstrap guide](docs/BOOT.md) is adapted from `../propeller/docs/BOOT.md` and extended with nine roles. [AGENTS.md](AGENTS.md) governs contributions; [the agent workflow](docs/agents/README.md) explains dispatch, ownership, parallel work and review. Native Codex definitions are in `.codex/agents/`; their role instructions are in `docs/agents/`. The additional [peer](docs/agents/peer.md) routes Codex-authored work to Claude and Claude-authored work to Codex for independent quality and specification review, with a reciprocal Claude dispatcher in `.claude/agents/peer.md`.

## Local commands

```sh
just ci                    # shared offline gate: scaffold, repository-tool tests, tracked whitespace
just check                 # scaffold, links and agent configuration checks; Python 3.11+
just test-tools            # lower-level offline repository-tool tests
just peer-preview codex packet.md  # inspect the external Claude route without a call
just docs                  # A4 PDFs alongside Markdown; pandoc and Google Chrome
just pdf docs/IDEA.md      # build one document
just reqs                 # requirement declarations
just clean                # remove generated document outputs
```

The same gate runs without `just`, from any caller directory:

```sh
python3 /path/to/checkout/utils/ci.py
```

It uses Python 3.11+ and Git, resolves the checkout from the runner's location, and
fails on a missing/empty test suite or a required check failure. Whitespace checks
inspect every tracked current file, including in a clean checkout; untracked files
enter that check only after `git add`. The gate installs no project packages and
does not invoke review providers or document renderers.

The [GitHub Actions workflow](.github/workflows/foundation.yml) uses the same runner for
pushes and pull requests targeting `main`, on `ubuntu-24.04` with Python 3.11 and
3.15. It uses pinned actions, a read-only contents token and no persisted checkout
credentials. These supported minor lines allow newer patch releases; observed
versions and local versus hosted outcomes belong in [RESULTS](docs/RESULTS.md).
Workflow configuration or a local pass does not establish a successful hosted run.

Use `just --list` for all recipes. No app build, development server or simulator
test suite exists yet. The current gate is the bounded TODO 1.1.1 repository-tool
slice; [foundation TODO 1.1](docs/TODO.md#1-foundation) remains open for future
stack-specific lint, types, vulnerability/license checks and runtime tests.
Acceptance of this slice follows [E0-CI](docs/EVAL.md#e0-ci-are-repository-tool-quality-gates-reproducible-locally-and-in-ci)
and independent reviews. Generated PDFs are ignored by Git. See
[utilities](utils/README.md) and [dependencies](docs/SBOM.md) for tool requirements,
action/update policy and document build limitations.

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
selected under the user's publication instruction. Gefly is licensed
**GPL-3.0-or-later** ([LICENSE](LICENSE), GAPS Q5). Third-party material keeps its
own license; see the [upstream notices](THIRD_PARTY_NOTICES.md) and [SBOM](docs/SBOM.md).
