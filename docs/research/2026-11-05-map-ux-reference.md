# GeoFS map interaction reference

Inspected 2026-11-05 08:40 Europe/Berlin by Codex
`/root/resize_housekeeping` for TODO 2.0.131. This is a bounded interaction
reference, not a navigation-data source or an accepted avionics model.

## Primary observations

The official [GeoFS instructions](https://www.geo-fs.com/pages/instructions.php),
under “How to use the map?” and “Radio Navigation”, describe right-clicking a
location to open a popup containing an explicit GPS-fix creation action. A
created fix has a map icon whose popup supports selection and deletion. Thus a
location query and the creation of a retained fix are separate actions.

The same instructions' “Flight Plan” section describes an editor reached from
the navigation map. Map-location popups can add points to the plan, and rows show
leg distance/course with selection, reordering and deletion controls. Coordinate
entry is supported. The described product also connects GPS/plan selections to
its own radio/autopilot behavior; that is outside this Gefly interaction change.
[GeoFS instructions](https://www.geo-fs.com/pages/instructions.php)

The official [GeoFS simulator page](https://www.geo-fs.com/geofs.php) exposes a
“Transparent User Interface” preference and a flight-plan table headed
“WPT DST TRK ALT SPD”. This is evidence of available controls and structure;
the fetched page text does not establish exact opacity, placement, first-click
handling or persistence behavior.

## Application to the requested Gefly change

The applicable pattern is deliberate creation: opening a location popup should
not silently add a custom GPS marker or alter the route. An explicit creation
action can retain the existing bounded custom-fix and waypoint validation.
Published historical fixes and custom USER fixes need distinct presentation so
an existing catalogue does not look like automatically generated personal points.

The requested transparent, separately toggleable planning overlay and immediate
map interaction are the user's design direction. The sources above do not prove
that GeoFS uses the same overlay geometry, keyboard shortcut or activation
semantics. Gefly's terrain/label preference persistence is also a separate local
implementation requirement.

This note reuses interaction ideas only. No GeoFS code, styling, imagery or
navigation assets were copied. It does not authorize changing Gefly's radio
tuning, AP guidance, physics, fix provenance or recorded-state semantics.
