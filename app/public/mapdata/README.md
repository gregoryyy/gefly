# Southern Germany map navigation inventory

This map-only package never supplies the radio receivers, autopilot or worker.
It is a reference inventory, not current AIS/AIRAC, confirmed operating status,
airspace, NOTAM, a published procedure or an official complete station list.

`manifest.json` pins the generated GeoJSON bytes. It combines 144 OurAirports
German station records and 66 historical German ED/ET localizers whose parent
positions fall within 6–14°E / 47–51.75°N. This rectangle includes adjoining
states; the airport directory separately selects five federal states.

- OurAirports: `navaids.csv` at commit
  `e86a650a968ba239a1288f96c05fcb80688e77a6`, source SHA-256
  `d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1`.
  Snapshot 2026-11-02, retrieved/compiled 2026-11-03. Public-domain/Unlicense
  release, with no accuracy or fitness guarantee. `source-ourairports.csv`
  preserves selected fields and rows with a rewritten CSV header/serialization.
- Robin A. Peel / FlightGear: original NAV810 cycle 2013.10 at commit
  `5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95`, compressed source SHA-256
  `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839`.
  Copyright © 2013 Robin A. Peel. GPL-2.0-or-later, complete license in
  `LICENSE-nav810.txt`. `source-nav810.dat` retains the full original notice
  and every consumed original source row, transcoded from Latin-1 to UTF-8.
  Components use the original source before FlightGear scenery-height calibration.

GeoJSON uses WGS84 longitude/latitude degrees and source AMSL metres, with no
verified survey accuracy or vertical datum. Missing elevations remain null.
NDB frequencies remain kHz; VHF/DME frequencies display MHz. Separate explicit
GS/DME antenna positions are preserved; missing DME positions are not invented.
The package contains 210 primary stations plus 61 GS and six distinct DME
component positions, 277 points total. Collocated equipment shares its station
marker. No service radius, approach course or glide path is inferred.

Rebuild from the two hash-pinned source downloads using `utils/mapdata/build.py`.
The existing shared NAV810 parser is reused, without changing the tuned
Rhein-Main receiver inventory. Provider URLs are source citations, never runtime
fetch destinations; the map loader reads only fixed same-origin asset paths.
