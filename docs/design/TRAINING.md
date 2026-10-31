# Training experience and capability scope

Status: product design following the [user's GeoFS feedback](../input/2026-10-31-geofs-feedback.md)
and [cockpit/pressure decisions](../input/2026-10-31-cockpit-pressure-decisions.md).
[SPEC](../SPEC.md) owns requirement statements and acceptance criteria. Feature
ordering below is a proposal; it does not turn the whole wishlist into milestone 2.
The web/C172/EASA PPL direction continues, with classic instruments before glass.

The [subsequent roadmap direction](../input/2026-10-31-community-region-reuse.md)
adds a free/open-source flight-school community, LLM-assisted experience creation
and AI interaction. The first region is EDDF with a 100 NM radius. Open physics
engines and aircraft models are preferred wherever suitable; their evidence and
compatibility are evaluated rather than assumed.

## Preserve the experience that works

Enter a useful exercise quickly in a browser, use keyboard and a touchpad/pointer
on desktop, and support orientation control on agreed mobile devices. Provide
recognizable terrain, airports and runways with declared data accuracy; present
credible flight behavior within a stated envelope. Keep cockpit and external
views and a flight-review experience. Accessible controls and readable instruments
must work together rather than force an immediate hardware purchase.

The [comparison research](../research/2026-10-31-geofs-gap-analysis.md) distinguishes
built-in GeoFS behavior, official claims, add-ons, observed limitations and open
questions. FlightGear's visual/interaction assessment is the user's experience;
evaluate specific tasks rather than treat an aesthetic judgment as a measured fact.

## Fewer aircraft, fuller operation

One documented conventional-panel C172 is the first aircraft. Select the actual
variant, instruments and radio equipment and model the controls used by the
accepted exercises: positions, knob changes, indications and dependencies. A
navigation overlay or autopilot result does not establish working cockpit controls.
Expand that configuration and its exercises before adding unrelated aircraft.

Later select a documented glass installation. The A320 illustrates a desired
level of cockpit/system interaction; it is not the next committed aircraft.
Traffic-awareness/collision-avoidance functions belong to an applicable equipment
profile and separate objectives. ACAS/TCAS terminology, radio navigation and ILS
must be scoped from primary sources, with capabilities and limitations explicit.

## Proposed learner journey

| Step | Learner experience | Design concern / evidence |
| --- | --- | --- |
| Brief | Choose objective, airport/runway and conditions; inspect weather reports, notices, elevation and map. | Show source/issue/validity times, units, applicable region and whether data is live, historical or generated for the scenario. |
| Prepare | Use an aircraft-specific checklist; set controls, frequencies and pressure reference. | QNH/QFE/standard indications must follow the same simulated atmosphere, runway elevation and altimeter model; checkbox clicks alone do not verify aircraft state. |
| Communicate | Exchange relevant requests, clearances and readbacks through text-capable radio practice. | Tie messages to frequency, role, aircraft/scenario state and expected intent. Keep simulator exchanges visibly distinct from external real-world services. |
| Fly | Practice the selected handling, circuit or navigation exercise using cockpit controls and appropriate views. | Keyboard/pointer/orientation calibration and assists remain visible; cameras and overlays read one aircraft state. |
| Navigate / approach | Tune the modeled radios, identify stations/fixes and interpret cockpit indications and the planned/flown path. | Use versioned identifiers, frequencies, geometry and elevation references. Distinguish VFR descent guidance, visual aids and instrument guidance. |
| Review | Replay and inspect the flown path, control settings, instrument state, radio exchanges and checklist progress. | Preserve the scenario's data/model/assists and original event order. Separate flight-state replay from any later video export. |

## Proposed delivery slices

1. **Accessible flight foundation.** Quick desktop browser entry, one bounded
   scene and classic C172 instrument/control subset, multiple views, replay and
   an explicit route to mobile orientation support. Resolve device scope before
   promising all mobile browsers. Complete the original foundation studies first.
2. **Classic PPL practice loop.** Coherent airport/elevation/map data, pressure
   references, aircraft-specific checks, weather/NOTAM scenario briefing, text
   radio practice and a reviewed circuit/approach exercise. Break into small
   specified increments; do not deliver every item as a single first feature.
3. **Navigation depth.** Operable VOR/DME and applicable receiver controls,
   identifiers/fixes, route/chart support, and deliberately scoped ILS intercept,
   localizer/glideslope and missed-approach practice when justified by objectives.
   Being near a runway, following a drawn line and flying an instrument procedure
   are distinct validation cases. ILS inclusion does not by itself imply a PPL
   syllabus or instrument-rating entitlement.
4. **Glass, traffic systems and CPL.** Add the selected real glass cockpit,
   appropriately equipped traffic/advisory exercises and CPL objectives through
   their own source-backed specification and gates. Preserve the earlier classic
   cockpit as a supported learning configuration.

## Geography, charts and glide paths

Geographic truth must be coherent: airport reference and runway/threshold elevation
may be different values; charts and terrain need declared horizontal/vertical
datums and units. Synthetic instructional maps may simplify presentation while
retaining the identifiers and geometry promised by the scenario. Real and generated
material each carries provenance and a visible status. The first region is now
**EDDF/100 NM (185.2 km)**. Its sourced official airport reference point, geodesic
boundary and data-layer coverage must be verified before accepted geometry is
built. Training airports/runways within the region, data versions and providers/
licenses remain decisions. EDDF's role as regional center is separate from the
choice of a runway for a particular PPL drill.

Do not hardcode a universal glide slope, traffic-pattern height or procedure.
Differentiate an intended descent profile from published procedure geometry,
radio-derived ILS guidance and visual approach aids. Define the applicable
reference and source for each training case before implementation.

## Research and design questions

Select the exact classic C172/radio fit, training airports within the EDDF region, a first useful
exercise, the mobile/browser test matrix, briefing data mode and later glass
configuration. Community evidence should inform reproducible checks for usability,
control calibration, cockpit readability, ground/runway behavior and navigation
coherence. Keep uncertain reports and product versions visible. GAPS owns these
decisions; EVAL defines how to test them before claiming an improvement.

## Community and authored experiences

The requested community is organized around learning: proposed shared exercises,
practice questions, groups and debriefs with clear authorship/source/review labels.
Decide contributor/instructor roles, moderation, hosting and the exact open-source
license before public service release. A public community is not synonymous with
real-time multiplayer, and generated material must not imply instructor review.

LLM authoring should turn a described territory and pilot experience into a
reviewable package: region and assets, real identifiers/route geometry, map/chart
references, objective, conditions, checklist/radio interaction and assessment.
For EDDF, resolve those assets against the accepted regional catalog. Show missing
or conflicting evidence, validate the package and review its briefing/map before
use. Preserve accepted data and events for replay independently of the generator.
AI can support interaction inside that package; actual aircraft/clearance state
remains governed by the modeled scenario. See ARCH and E9–E11 for boundaries and
planned checks. No community site, region pack or generator is implemented yet.
