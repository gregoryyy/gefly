# Egelsbach vector scenery snapshot

`edfe-vector.geojson` is a bounded, simplified OpenStreetMap database extract,
retrieved 2026-11-03 from https://www.openstreetmap.org/api/0.6/map?bbox=8.626,49.953,8.663,49.967.
© OpenStreetMap contributors, https://www.openstreetmap.org/copyright.
The database is offered under ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/).
This extract itself is the redistributable derived database; no chart image is copied.
Keep that attribution visible whenever displayed. Feature IDs preserve OSM way/node
IDs; per-way version and source timestamp are preserved. No mapper usernames or IDs
are included. Coverage is EDFE's immediate surroundings only, not southern Germany.
SHA-256: `f3b56bede6bea8b811fc5e837009fa581f2a472b8816d9f17215c4e75b7685e2`.

Selection: airport runway/taxiway/apron/windsock, road classes through service,
water, selected vegetation/land-use classes and buildings. Complete ways extending
outside 8.625–8.664°E / 49.952–49.968°N are excluded rather than truncated.
Buildings are map footprints only. No obstacle/collision geometry is established.
OSM tags and digitized positions are community data and may be incomplete/stale.

The primary airport operating rules establish paved runway 1400 × 25 m,
magnetic 082/262°, ARP 49°57.65′N 8°38.49′E (runway midpoint), 2025 variation
4°E, and RWY26 LDA1166 m. Source:
https://egelsbach-airport.com/wp-content/uploads/2025/12/EDFE-Benutzungsordnung-25-11-2025-FinalohneUnterschrift-EN-v1-2.pdf
(25 November 2025; facility table itself dated 1 May 2014).
The module's geodetic thresholds are constructed from these facts, not a surveyed
threshold fix. OSM/OurAirports endpoint length/heading differs: their coordinates
must not silently become a validated threshold reference. Markings are generic
project-authored visual approximations, not a copy of airport chart artwork.
The overlay follows the existing DEM + geoid; it does not flatten terrain or
change physical contact/obstacles. Airport slope, markings and layout need survey
validation before fidelity or procedure claims.

OSM identifies a windsock at49.9598762°N,8.6329093°E. Its rendered static shape is
illustrative; no live wind indication is claimed. No installed PAPI position,
angle or complete light installation was established. “Practice PAPI” is an
independently enabled synthetic four-light 3° cue, not EDFE equipment and not an
obstacle-clearance assessment. Its color sequence follows FAA AIM2-1-2 Fig2-1-5:
https://www.faa.gov/air_traffic/publications/media/AIM_Basic_w_Chg_1_dtd_8-7-25.pdf
The synthetic bar is250m after the approximate threshold and25m to its left;
those placements are project choices, not airport installation data.

The same independent practice switch enables synthetic white runway-edge lights,
green outward-facing threshold lights and red inward-facing runway-end lights.
These color/direction conventions follow FAA AIM2-1-4:
https://www.faa.gov/air_traffic/publications/aim_html/chap2_section_1.html.
Positions, number, edge spacing (~58m), pixel sizes and brightness are illustrative
project choices, not a surveyed installation or a photometric model. The displaced
26 threshold and physical runway end are distinct. All practice lights wait for
sampleable terrain heights; missing heights never substitute sea level.
