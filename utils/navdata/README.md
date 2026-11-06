# Historical NAV810 receiver compiler

Standard-library, offline tool. Supply the exact gzip pinned in `build_navdata.py`;
other input hashes are rejected. `--worldwide` compiles the complete supported service inventory into compact `world-v1.bin`, with the exact original source gzip beside it. The default mode retains the provisional 100 NM spherical extent
around a pinned OurAirports EDDF row (`CENTER_RECORD`),
converts ft/MHz representations to SI/kHz, preserves explicit GS/DME components
and the complete original license header, and writes deterministic JSON/source
subset/manifest assets. Global malformed rows outside the component margin are
recorded; regional errors fail. Duplicate component candidates remain unavailable
with their original rows retained, rather than picking the first match.

See [source research](../../docs/research/2026-11-03-rhein-main-navigation.md) and
[distributed data](../../app/public/navdata/README.md). This does not update the
2013.10 source edition, survey antenna positions/heights, ingest live AIS, or
establish current operational facilities/procedures.

`test_build_navdata.py` checks offline that the shipped package, its manifest,
the compiler hash and the pinned anchor record agree. The distributed original gzip now permits offline reproduction of both modes. After changing the compiler, regenerate the regional fixture first, then the worldwide package/active manifest from the pinned gzip.
