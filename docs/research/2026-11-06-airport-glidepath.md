# Airport glidepath: source inventory and proposal

2026-11-06 20:52 Europe/Berlin, clock-derived. Author: Codex
`/root/glidepath_product`, acting as housekeeping alongside implementation. This
note records inspected data and proposed criteria; it is not acceptance evidence
or a declaration that the requested feature is implemented. The orchestrator
owns requirements, task status and integration.

## Request and proposed interaction

The [user request](../input/2026-11-06-airport-glidepath.md) asks for a
switchable three-degree glidepath when approaching an airport, controlled from
its map object. A proposed interpretation is a visible, explicitly illustrative
path in the flying view, enabled and disabled in the selected airport popup. A
runway-end selector is recommended because an airport can have several runways
and each has two approach directions. The user's request does not choose a
specific runway, path length or display style.

The path is an instructional geometric aid, not a published approach, ILS
signal, autopilot command, obstacle-clearance guarantee or surveyed runway
claim. Existing [R-NAV-3](../SPEC.md) requires a distinction between a teaching
glidepath, a published procedure and an actual ILS indication. Airport data is
community discovery data rather than an operational procedure source.

## Available data and constraints

The [world airport data contract](../../app/src/world-airport-contract.ts)
contains a runway identity, airport association, closed flag, and two runway
ends. Each end's identifier, WGS-84 latitude/longitude, true heading, elevation
in feet and displaced-threshold distance are fields in the contract; the numeric
end fields can be null. The [snapshot documentation](../../app/public/airports/world/README.md)
and [integration research](2026-11-06-ourairports-integration.md) describe the
source and its limits. Selection should retain the actual source airport,
runway and end identity and source revision. Do not infer that an absent
runway, position, direction or elevation is zero.

A runway-end position is not automatically a displaced landing threshold. If
threshold displacement is used, derive its position from sourced data with a
clearly specified direction and units; otherwise label the endpoint and the
approximation honestly. Source elevation is expressed in feet, but the
underlying vertical datum is not independently verified here. Converting a
physical or mean-sea-level height into the renderer's ellipsoid reference
requires an appropriate geoid value; no such conversion should silently treat
unverified source elevation as ellipsoid height. A display-only terrain-derived
endpoint is a possible approximation only if disclosed and validated against
the actually rendered terrain. Missing geometry or height must be reported or
handled by an explicit, labeled approximation.

## Proposed geometry and verification

A three-degree slope is a display convention in this request, not a sourced
local glide angle or threshold crossing height. As an independent numerical
fixture, if horizontal distance is 3 nautical miles (5,556 metres), its rise
above the declared reference point is `5556 × tan(3°)`, approximately 291.18 m
or 955.31 ft. Three nautical miles is an illustrative candidate extent, not a
user-selected distance. Geometry should document its horizontal frame, distance
and elevation units, threshold reference, Earth model and how any Earth
curvature or tessellation is handled. Verify both runway ends, reversed
approach direction, geodesic edge cases and the calculated slope.

Proposed acceptance checks include selecting and changing runway ends, toggling
the aid on and off, missing/closed/incomplete source records, popup and source
refresh lifecycle, cockpit and chase visibility, paused and Review behavior, and
absence of changes to native flight state or avionics. Independently inspect
actual browser rendering rather than accepting arithmetic tests as proof of
visibility. Source limitations, terrain obstruction and available runway data
remain visible; no physics, training-credit or navigation-fidelity validation
is implied.
