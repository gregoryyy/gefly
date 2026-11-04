# Product vision and roadmap

**Open a browser and fly—with the most realistic flying experience practical and
minimum prerequisites.** Gefly grows from the pleasure of “just fly” into a place
to learn instruments, navigation and procedures, practise for PPL and other
small-plane qualifications, and later work towards CPL objectives.

This is a **free, open-source flight-school community built around a simulator**,
not just a collection of aircraft and scenery. A newcomer can enjoy a first
flight; a learner can rehearse a complete pilot experience; instructors and the
community can contribute aircraft, places, exercises and practical knowledge.
Professional manuals, charts and procedure material belong inside that experience.
The [user's vision](input/2026-11-03-road-vision.md) drives the directions below.

## Fewer aircraft, deeper flying

Start with the **Cessna 172 and EASA PPL**, classic instruments first. Make the
controls, indications, avionics, physics and procedures work together instead of
adding many shallow aircraft. The selected first configuration is the classic
172S, followed by a separately modeled Reims FR172. Glass cockpits come later;
the A320 remains an interaction reference rather than a second initial aircraft.
Reuse open physics engines and models wherever they can support this depth.

Keep entry easy: Mac desktop keyboard and touchpad first, optional yoke/joystick
and rudder pedals, with GeoFS-inspired control settings. Add adjustable key
bindings, connected iPhone/Android orientation controls, avionics as a HUD and a
no-panel view with transparent main instruments. Later fullscreen/glass overlays
include ILS markers driven by modeled navigation. The same flight should work
through cockpit, chase and inspection views, with useful flight review and later
video export.

## The complete pilot experience

| Experience | What the pilot should be able to do |
| --- | --- |
| Plan and navigate | Open maps with airports, controlled airspace, restricted areas and no-fly zones from real data. Select navigation aids from the map, create personal GPS markers, look up published fixes and build a flight plan with altitude and glide-path planning. See towns, landmarks, streets, rivers and air fixes projected onto the terrain. |
| Fly the aircraft | Use authentic controls and meaningful instrument indications: magnetic references, QNH/QFE/standard pressure, realistic engine and flight dynamics, VOR tuning and deviation, DME slant distance and ILS localizer/glideslope geometry. Deepen landing reactions, stalls and structural-force behavior as the aircraft model improves. |
| Prepare and follow procedures | Look up and run through aircraft-specific checklists. Connect instrument practice, circuit patterns, approaches and other drills to applicable professional manuals, chart material and reviewed learning sources. |
| Read and experience the weather | Use real-source or AI-authored scenario weather and reports, with cloud cover, wind, rain, fog, visibility and temperature reflected coherently in the flight. Begin with versioned historical/generated scenario briefings, then add optional live feeds. |
| Share real airspace | Encounter AI traffic and real-time community aircraft, NOTAM and operational restrictions. Practise realistic situations such as arriving at a busy international airport, including sequencing, communication and occupied-runway consequences. |
| Communicate | Tune COM1/COM2, discover airport COM stations through lists comparable to NAV1/NAV2, and exchange realistic text messages with airport/ATC scenario roles through AI interaction. Voice is a later extension. |
| Review and improve | Replay the flight with its controls, instruments and path; inspect approaches, energy, navigation and decisions, then try the exercise again. Grow towards instructor feedback and shared debriefs. |

Real identifiers, editions and source material should make the experience
recognizable to pilots. Generated weather, teaching aids and model limitations
must be identifiable; they must not be presented as real-world operational data.

## A community that builds the simulator

See other pilots flying in real time. Fly together, exchange suggestions and
questions in a forum, and share exercises and debriefs. Make contributions useful
across the whole product: aircraft models, flight systems, terrain, buildings,
landmarks, maps, navigation data and learning material.

Flight schools and instructors should be able to help shape exercises and give
feedback. Community contributions should carry their authorship, source/version
and modeled scope so a useful upload is distinguishable from a reviewed model.
The community, multiplayer and contribution experience can grow alongside useful
simulator increments; it does not need to wait for CPL features.

## A convincing world, beginning around Frankfurt

Build useful coverage in **Hessen and the surrounding federal states**, with
**EDDF and a 100 NM radius** as the first learning/reference region. Use suitable
training airfields inside that area; the first circuit is at Frankfurt-Egelsbach
(EDFE), not a requirement to conduct every exercise at EDDF.

Expand towards **open DACH data: Germany, Austria and Switzerland**, then select
interesting regions elsewhere with good open sources. Evaluate OurAirports,
OpenFlightMaps, potentially Navigraph and Eurocontrol/EAD, and later FAA sources
and other regions. Physical terrain, visual scenery, airports, airspace and radio
navigation should grow into a coherent region rather than disconnected layers.

Aim for the geographic detail and ease of exploration associated with Google
Earth and Google Maps. Use public elevation and map information, imagery where
available, and **procedural reconstruction, semantic reconstruction and geotypical
scenery generation** to distinguish settlements, green areas, roads and water,
then add buildings and other structures. Keep generated scenery distinguishable
from surveyed features.

Also explore **flying through Google Earth** as an alternative experience or
integration route. It remains a study, not a selected map provider or permission
to import Google imagery. The [global scenery research](research/2026-11-03-global-scenery.md)
compares those routes with an open-data world.

## Author detailed worlds from maps

Make **world authoring** a first-class capability: select a real area on the map,
inspect available terrain/building/imagery layers, refine its appearance and
publish a reusable high-resolution 3D scene. Start with a small EDFE patch, then
connect detailed places across the wider region. Community members should be
able to improve regional rules, landmark models and source-backed scene patches.

Combine measured terrain and building geometry with **geotypical** regional
materials, facades and vegetation where exact detail is missing. Evaluate both
traditional procedural generation and optional **LLM-assisted authoring** of
reviewable scene recipes. Compare photogrammetry and neural reconstruction for
suitable captured landmarks; explore current Gaussian-splat streaming separately.
Visually convincing generated details must remain identifiable as inferred rather
than surveyed geography. Keep airport contact/navigation facts independently
sourced and the open baseline usable without commercial maps or mandatory AI.

The [world-authoring research](research/2026-11-04-world-authoring.md) compares
these routes and proposes source-backed scene, editable authoring preview,
AI-assisted A/B and captured-landmark increments. These are planned capabilities,
not already implemented scene generation or Google Earth-quality coverage.

## Create a flight experience by describing it

Use an LLM to describe a territory, a learning objective and the interactions a
pilot should encounter. Assemble a realistic experience from real navigation
assets, map/chart material, weather and traffic scenarios, with AI interaction
where it helps. Start with the EDDF/100 NM region.

The result should be a reviewable, replayable scenario package, linked to its
actual sources. Aircraft motion and avionics stay in the simulator; generated
prose does not invent a real fix, procedure, clearance or accepted flight state.
This extends the [original community and authoring direction](input/2026-10-31-community-region-reuse.md).

## Open platform, partners and sustainable financing

**The free version stays free.** Keep a useful open foundation under the selected
GPL-3.0-or-later project licence. Explore an optional premium offering for
commercial map/chart subscriptions such as Navigraph and AI extensions priced to
cover token/service costs. Partner support is another route to sustaining the
platform; paid services should add value without becoming prerequisites for the
free experience.

Build partnerships from the ecosystem **as long as the platform stays open**:
map/data providers and publishers for content; ATC organizations and aircraft
manufacturers for awareness and expertise; flight schools for use and feedback.
These are product and funding directions, not announced partners, selected
subscriptions, prices or service contracts.

## Deliver experiences in visible increments

| Increment | A demonstrable result |
| --- | --- |
| A coherent first flight | Open the browser, understand the controls, fly a recognizable region, use the classic cockpit and review what happened. Keep this enjoyable as deeper realism is added. |
| The first complete PPL practice loop | Start engine-running at the EDFE runway 26 holding point, use a briefing/checklist, take off, fly the north/right-hand circuit, land and review the flight. Keyboard/touchpad remains a complete baseline. |
| A believable regional pilot experience | Deepen source-backed aircraft handling and systems, pressure/elevation references, navigation aids, maps and charts. Add circuit variations, text radio after the first complete circuit loop, coherent weather reports and bounded traffic situations in separately runnable slices. |
| Author a detailed world | Turn a bounded map area into a flyable 3D scene with real terrain/buildings, regional procedural detail and an editable source-marked recipe; compare optional AI assistance. |
| Shared flying and contributed experiences | Fly with others, publish and try exercises, discuss improvements and contribute a first aircraft/world/data package. Grow community features alongside simulator depth. |
| Wider places and deeper practice | Expand coherent DACH regions, flight planning, procedures, weather and traffic; compare the separate FR172 configuration and introduce selected glass avionics after the classic cockpit. |
| More licence-specific journeys | Add scoped CPL objectives and distinct sailplane/ultralight experiences, with appropriate aircraft, controls, exercises and professional material. Their order relative to CPL is still open. |

Consider advanced traffic-awareness/advisory equipment such as ACAS/TCAS only for
applicable aircraft and installations, as separately scoped later capabilities.

These are product directions, not a claim that every row is implemented or a fixed
release schedule. Choose each next slice for a visible improvement a user can try.
Source, model and community work can proceed in parallel where they support it.

## Distinct pilot qualifications

Sailplanes and ultralights have their own aircraft, handling, procedures and
qualification requirements. Share geography, weather, controls and review where
useful, while developing each learning profile independently.

For sailplanes, EASA Part-SFCL/Sailplane Pilot Licence is a reference profile;
launch methods and TMG privileges need explicit scope. For ultralights, select a
national authority/category and aircraft first: German national training is a
research reference, not a universal EASA licence or a confirmed category choice.
The [licence-track note](research/2026-10-31-license-training-tracks.md) records
sources and open decisions. Shared simulator features do not imply cross-credit
or certified training.

## Current position and delivery discipline

Today's runnable prototype combines generic JSBSim flight, a classic cockpit,
KAP 140-style autopilot, historical radio navigation, bounded public terrain and
imagery, maps and review. The project-owned 172S model and first complete learner
exercise are still unfinished. Hosting remains undecided. This roadmap does not
claim approved training, current operational data or validated aircraft fidelity.

[TODO](TODO.md) owns current progress. [SPEC](SPEC.md) defines requirements and
[EVAL](EVAL.md) defines evidence for the realism and learning claims. Keep source
rights, model versions and limitations clear; apply independent checks to each
integrated increment. Tooling supports that work—it is not the product roadmap.
