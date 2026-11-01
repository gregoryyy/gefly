# Gefly idea

## Purpose and users

Help student pilots practice aircraft control, instrument interpretation and procedures through increasingly realistic simulation. Begin with a Cessna 172 and EASA PPL learning in a web application; extend to CPL objectives once the foundation is validated. Instructors are proposed review partners, not yet recruited users. The original brief is in [input](input/2026-10-31-project-brief.md); user choices are recorded in [GAPS](GAPS.md).

The user also wants a **free, open-source community site oriented toward flight
schools**, and LLM-assisted creation of realistic flight experiences. Start the
regional model around **EDDF within a 100 NM radius**, using real available source
material for territory, navigation assets and charts. Prefer open physics engines
and aircraft models instead of recreating established simulation components. These
are roadmap/architecture directions, not features delivered by the current scaffold.

The [GeoFS feedback](input/2026-10-31-geofs-feedback.md) sharpens this direction:
preserve quick browser entry, recognizable geography, accessible desktop/mobile
inputs, multiple views and flight review, while concentrating on **fewer aircraft
with deeper, working cockpit controls**. The user selected **classic instruments
first, glass later**, and all three pressure references: QNH, QFE and standard.

## Proposed added value

Progress from clearly labeled simplified exercises to aircraft-specific controls, avionics and physics, preserving an explanation of what is modeled and what remains approximate. Connect each aircraft behavior to an applicable reference, each exercise to a learning objective, and each fidelity claim to a repeatable evaluation. Build the smallest useful exercise first, then increase fidelity where evidence supports it.

Make the practice session coherent from briefing to debrief: weather/NOTAM context,
aircraft checks, text-capable radio exchanges, flight and navigation instruments,
maps, circuit and instrument-approach exercises, and review of the actual flown
path and actions. [The training design](design/TRAINING.md) maps these interests to
proposed stages; the full set is not an initial-release checklist.

A flight-school community can organize shareable exercises, practice questions and
debriefs around learning goals. The experience-authoring workflow should assemble
real regional data and validated scenario instructions from a user's description,
with AI-assisted interaction inside the resulting experience. Source-backed assets,
repeatable scenarios and a reviewable output package distinguish useful authoring
from plausible prose. Publication, roles, moderation and content-review features
need their own specification before the community opens.

## What must be demonstrated

Progressive flight training, browser simulation and sophisticated flight models already exist. The [foundation research](research/2026-10-31-foundation-sources.md) compares official GeoFS, Microsoft Flight Simulator and X-Plane material and identifies aviation reference sources. Gefly's differentiation is a **hypothesis** about transparent fidelity, focused practice and feedback, not an established market gap or measured learning advantage.

The product must show why a learner benefits relative to an existing simulator or a simpler interactive lesson. The [evaluation plan](EVAL.md) defines comparison, fidelity and learning checks. Feature count and attractive scenery alone do not establish value.

The [GeoFS capability and community study](research/2026-10-31-geofs-gap-analysis.md)
separates the user's cockpit observations from documented features and community
reports. A navigation overlay, an autopilot mode and an operable cockpit instrument
are different comparison questions. Absence from a manual is not proof of absence;
community reports identify cases to reproduce, not a representative user survey.

## Approach and limits

Separate aircraft state, physics, avionics, teaching and presentation. Start from one documented conventional-panel C172 configuration rather than an interchangeable collection of instruments; add a selected glass cockpit later. The first configuration is the selected classic-panel 172S serial range (GAPS Q3); the Reims FR172 follows when its sources suffice. The radio/instrument fit and FR172 sub-model remain unresolved. The first exercise is a take-off, circuit and landing at Frankfurt-Egelsbach (EDFE). GeoFS informs browser accessibility and interaction goals; its assets, code and services are not presumed reusable. EASA PPL is the first curriculum direction; implementation must verify applicable current sources before claiming alignment. ILS and traffic/advisory systems have distinct later learning/equipment scopes. Training-credit approval is outside the initial scope. See [SPEC](SPEC.md) for requirements and [ROAD](ROAD.md) for measured phase gates.
