# Historical worldwide radio navigation

This **2013.10 historical simulator snapshot is not current AIRAC, NOTAM,
service status, a chart, a surveyed approach or real-flight information**.

The active worldwide package contains **7923 services**:3720 VOR-family lateral
sources,3490 localizers and713 standalone DMEs. Explicitly paired components
supply5685 DME and3171 glideslope records. The original86-service Rhein-Main
fixture remains in `rhein-main-v1.json`; its service fields and identities are
unchanged. EDDF retains its known localizer/glideslope practice geometry.

`world-v1.bin` contains compact UTF-8 JSON, selected and hash-bound by the small
`manifest.json`. It is not executable. `source-nav810-gzip.bin` contains the exact
original gzip, including the complete original license notice; its hash below
allows offline reproduction. The regional source subset remains `source-nav810.dat`.

Missing/conflicting components remain unavailable. The worldwide compile records
93 diagnostics, including circular-angle representation conversions, ambiguous
components,11 unsupported off-50-kHz source channels and one invalid20°GS angle.
Four malformed original GS rows are explicitly excluded. NDB and marker rows
remain unsupported; there is no ADF or TACAN-only direction receiver. A standalone
DME can show distance with a flagged lateral instrument and no VOR bearing.

Source: Robin A. Peel's NAV810 data, cycle 2013.10/build20131334, retained by
[FlightGear at commit 5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95](https://gitlab.com/flightgear/fgdata/-/raw/5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95/Navaids/nav.dat.gz).
This revision precedes FlightGear's subsequent scenery-specific GS-height changes.
The gzip SHA-256 is
`24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839`.
The package records the original byte hash, source line numbers, original complete
edition/license notice, compiler hash and transformations. The retained regional
UTF-8 source subset is `source-nav810.dat`; its complete original notice is intact.

The source and derived navigation data are **GPL-2.0-or-later**, copyright 2013
Robin A. Peel, without warranty. The full GPL v2 text accompanies the public
assets as `LICENSE.txt` and the repository as
[LICENSES/GPL-2.0-or-later.txt](../../../LICENSES/GPL-2.0-or-later.txt).
Gefly's compiler and geometry are project-authored GPL-3.0-or-later.

Reproduce from the pinned gzip with Python's standard library:

```
python3 utils/navdata/build_navdata.py --source app/public/navdata/source-nav810-gzip.bin --output app/public/navdata --worldwide
```

The retained regional fixture extent is 100 NM on a 6,371,000 m sphere around the community OurAirports
EDDF point (50.026706, 8.558350), not a verified official airport reference point.
That point is row id 2212 of public-domain OurAirports `airports.csv` at commit
`72322ae9555947b969dda8effa793072159a9a1e` (SHA-256 `e869f2a5…13ca`, retrieved
2026-11-03); `region.center_source_record` gives the full reference.
Source AMSL heights have no independently verified modern vertical datum.
VOR courses use historical station magnetic calibration, not current magnetic
variation; LOC courses are true. DME is geometric slant range minus sourced bias.
Signals use approximate sectors/ranges, without RF propagation or terrain masking.
Overlapping co-channel sources are flagged ambiguous; antenna proximity does not
establish which runway transmitter is operating.
The five-NM EDDF 25C practice start is derived geometry, not a published procedure.
The radio inventory does not establish scenery, current facility status or surveyed approach coverage.

The bounded same-origin loader verifies manifest size, package bytes/SHA-256,
schema and unique identifiers, then freezes the package and indexes its services by frequency. World loading is limited to8MiB and10000records; retained regional JSON loading has its original1MB/1000record bounds. The UI and physics worker must report the same package hash. Missing/corrupt or mismatched data is explicitly unavailable. The station picker renders at most200 matches; narrow its search or enable nearby filtering to find others. Legacy LAB remains an archived/test source.
