# Map navigation compiler

Run from the repository root with the already downloaded, pinned public sources:

```sh
python3 utils/mapdata/build.py \
  --ourairports /path/to/navaids.csv \
  --nav810 /path/to/nav.dat.gz
```

The compiler verifies both full source-byte hashes before processing, reuses the
existing NAV810 parser, selects German OurAirports points and ED/ET LOC parents
in the declared rectangle, and matches ILS components by source identity,
frequency, airport and runway. Ambiguous explicit components stay unavailable.
All consumed historical rows and their full license notice are preserved.

Output is deterministic, limited to 1,000 points / 1,000,000 GeoJSON bytes, and
contains no executable content. It is separate from aircraft radio/navigation
sources and does not add receiver support for NDB, TACAN or other display-only
types. See `app/public/mapdata/README.md` for source rights and limitations.
