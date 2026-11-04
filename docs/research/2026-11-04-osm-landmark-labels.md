# OpenFreeMap/OSM landmark labels: bounded source note

Researcher: Codex subagent `glide_housekeeping`, **2026-11-04 08:23 Europe/Berlin**.
Purpose: names and representative anchors for optional floating scenery labels,
not an aeronautical database, obstacle inventory or navigation authority.

## Sources and rights

- [OpenFreeMap](https://openfreemap.org/) permits public online map display
  without registration/API keys and describes its schema as unmodified
  OpenMapTiles. For alternative rendering clients it requires OpenMapTiles/OSM
  attribution; crediting OpenFreeMap itself is optional. Keep linked visible
  credits such as **OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors**.
- [OpenMapTiles attribution](https://openmaptiles.org/docs/terminology/attribution/)
  identifies its schema as CC BY 4.0 and asks for credit on/next to the map. The
  [service license register](https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md)
  distinguishes its MIT software, BSD OpenMapTiles code, CC BY design and OSM
  data. **MIT does not relicense the map data.** No upstream style, font or icon
  bundle is being added by this label decoder.
- [OSM copyright/license](https://www.openstreetmap.org/copyright) identifies the
  data as ODbL and requires contributor attribution plus accessible license
  information. Linking that page provides the latter for the rendered display.
  Any later redistribution of extracted databases needs the applicable ODbL
  obligations; the project's GPL source license does not replace those rights.
- [Service terms](https://openfreemap.org/tos/), dated 14 October 2026, describe
  offline downloads capped at 3,000 tiles or 50MB each, at most four parallel
  requests and an app-specific User-Agent. They prohibit automated collection
  outside that exception and provide no availability/accuracy warranty. This
  increment uses bounded on-demand interactive visualization, not a crawler or
  offline-data bundle. At most four requests to OpenFreeMap and an identifying
  proxy UA are conservative operational choices. The service may change/discontinue.

## Schema and source pin

The official [OpenMapTiles schema](https://openmaptiles.org/docs/schema/) documents
`place`, `poi`, `mountain_peak`, `park`, `water_name`, `waterway` and
`transportation_name` layers. Localized names use `name:de`; older `name_de` is
deprecated, with ordinary `name` also available. Some layers have relative
importance ranks. Water labels/roads can be lines, not surveyed single points.
Use a representative geometry anchor and explicit layer/category; layer/feature
IDs are tile identities, not guaranteed original OSM object IDs. Do not infer
verified heights, current runways/frequencies or landmark completeness from them.

Inspected the root-fetched [TileJSON](https://tiles.openfreemap.org/planet) at
`/private/tmp/gefly-landmark-tilejson.json`:
SHA-256 `c19822f9f257500deaf6c3a251d1d98adebde8f6d3afe6d880ee861706c39710`.
It declares TileJSON 3.0.0, source version 3.16.0, zooms 0–14 and the template
`https://tiles.openfreemap.org/planet/20261101_080013_pt/{z}/{x}/{y}.pbf`.
This edition identifies requested bytes; it does not establish exact observation
dates for every OSM feature or guarantee the pinned URLs remain available.
Retired/missing tiles must degrade visibly without changing flight physics.

The locally installed dependency manifests identify `@mapbox/vector-tile` 3.0.0
and `pbf` 5.1.2 as BSD-3-Clause; their distributed license files are present.
Promoting them to pinned direct dependencies still requires keeping their license
notices with distribution. Browser label text must remain inert text, terrain
height/offset a visual placement choice, and label density/culling bounded.
The parser imports `@mapbox/point-geometry` 1.1.0 as well; its installed license
is ISC, Copyright 2024 Mapbox. Retain that separate notice with the bundled
parser dependency rather than assuming the BSD notices cover it.
