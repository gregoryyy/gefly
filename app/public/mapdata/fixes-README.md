# Historical regional navigation fixes

`fixes-2013.10-v1.json.bin` contains **2,739 source rows** from the rectangle
6–14°E / 47–51.75°N. This includes neighboring countries; the source carries no
country/state field. It is a map-selection inventory, **not current AIRAC/AIS,
an operational procedure, verified availability, a GPS receiver or an FMS**.

The original source is Robin A. Peel's FIX data cycle **2013.10**, build
20131334, metadata FixXP700, distributed by
[FlightGear at commit 5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95](https://gitlab.com/flightgear/fgdata/-/raw/5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95/Navaids/fix.dat.gz).
Retrieved 2026-11-04. Compressed source: 1,517,795 bytes; SHA-256
`0be045e8acdcb2cf0656084063d58768976da4cd02902542e1bdb1fe44c23b95`.
The embedded notice explicitly grants **GPL-2.0-or-later**, copyright © 2013
Robin A. Peel, without warranty. The unchanged license text is in
[fixes-LICENSE.txt](fixes-LICENSE.txt). [FlightGear's licensing policy](https://www.flightgear.org/about/policy/)
is additional context; the dataset's own notice supplies its grant.

`fixes-source.dat` preserves the complete original header/notice and each consumed
original row, transcoded from Latin-1 to UTF-8, followed by the original `99`
terminator. The generated package is a modified regional subset: gzip-decompress
the pinned source, enumerate original lines starting at one, parse three-field
`latitude longitude identifier` records, and retain inclusive rectangle matches.
Coordinates remain the original decimal degrees, north/east positive, following
the [legacy fix format](https://developer.x-plane.com/article/fix-intersection-fix-dat-file-format-specification/).
They are used as geographic map positions; no survey/datum accuracy, heights or
procedures are established. Set `id` to `fix201310-{original line number}`, retain that
number in `source_line`, and sort by identifier, latitude, longitude, source line.
Seven repeated identifiers remain separate positions with distinct IDs.

The JSON is deterministically gzip-compressed (`gzip.compress(json_bytes,
mtime=0)`) to 50,948 bytes, from 271,162 decoded bytes. The opaque `.bin`
extension makes static hosting portable: servers must deliver the compressed
bytes as the file body, without treating it as a gzip HTTP transfer encoding.
The manifest pins compressed size/hash, decoded size, compression and row count.
The loader pins the manifest hash, verifies compressed bytes before bounded gzip
decompression, and checks stream completion/CRC and exact decoded size before
parsing. It requests only fixed same-origin paths, bounds download sizes and
time, validates all coordinates/identities and returns frozen copies. Failure
remains unavailable, rather than an empty or generated inventory.
Source/asset hashes are edition identities, not evidence of current navigation
accuracy. This package changes no tuned radio navigation or native physics.
