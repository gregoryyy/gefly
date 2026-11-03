# Historical NAV810 subset compiler

Standard-library, offline tool. Supply the exact gzip pinned in `build_navdata.py`;
other input hashes are rejected. It selects a provisional 100 NM spherical extent,
converts ft/MHz representations to SI/kHz, preserves explicit GS/DME components
and the complete original license header, and writes deterministic JSON/source
subset/manifest assets. Global malformed rows outside the component margin are
recorded; regional errors fail. Duplicate component candidates remain unavailable
with their original rows retained, rather than picking the first match.

See [source research](../../docs/research/2026-11-03-rhein-main-navigation.md) and
[distributed data](../../app/public/navdata/README.md). This does not update the
2013.10 source edition, survey antenna positions/heights, ingest live AIS, or
establish current operational facilities/procedures.
