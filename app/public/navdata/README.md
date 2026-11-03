# Historical Rhein-Main radio navigation

This **2013.10 historical simulator snapshot is not current AIRAC, NOTAM,
service status, a chart, a surveyed approach or real-flight information**.

The package contains 31 VOR-family lateral sources, 39 localizers and 16 standalone
DME entries. Paired DME and GS components are included only where explicit source
rows match. EDDF has six LOC/GS pairs; only IFNE, IFCW and IFNW have paired DME.
Conflicting GTQ/STR DME components remain unavailable. NDB and marker rows are
inventoried as unsupported; no ADF/marker receiver is supplied.

Source: Robin A. Peel's NAV810 data, cycle 2013.10/build20131334, retained by
[FlightGear at commit 5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95](https://gitlab.com/flightgear/fgdata/-/raw/5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95/Navaids/nav.dat.gz).
This revision precedes FlightGear's subsequent scenery-specific GS-height changes.
The gzip SHA-256 is
`24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839`.
The JSON records the original byte hash, source line numbers, original complete
edition/license notice, compiler hash and transformations. The corresponding
UTF-8 source subset is `source-nav810.dat`; its complete original notice is intact.

The source and derived navigation data are **GPL-2.0-or-later**, copyright 2013
Robin A. Peel, without warranty. The full GPL v2 text accompanies the public
assets as `LICENSE.txt` and the repository as
[LICENSES/GPL-2.0-or-later.txt](../../../LICENSES/GPL-2.0-or-later.txt).
Gefly's compiler and geometry are project-authored GPL-3.0-or-later.

Reproduce from the pinned gzip with Python's standard library:

```
python3 utils/navdata/build_navdata.py --source /path/to/nav.dat.gz --output app/public/navdata
```

The extent is 100 NM on a 6,371,000 m sphere around the community OurAirports
EDDF point (50.026706, 8.558350), not a verified official airport reference point.
Source AMSL heights have no independently verified modern vertical datum.
VOR courses use historical station magnetic calibration, not current magnetic
variation; LOC courses are true. DME is geometric slant range minus sourced bias.
Signals use approximate sectors/ranges, without RF propagation or terrain masking.
Overlapping co-channel sources are flagged ambiguous; antenna proximity does not
establish which runway transmitter is operating.
The five-NM EDDF 25C practice start is derived geometry, not a published procedure.
Only the existing smaller public-terrain area is flyable with normal terrain.

The bounded same-origin loader verifies manifest size, package bytes/SHA-256,
schema and unique identifiers, then freezes the package. Missing/corrupt data stops
normal flight initialization; fictional LAB is an explicit isolated practice mode.
