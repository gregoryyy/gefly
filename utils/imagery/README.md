# Rhein-Main offline imagery

`python3 -m pip install -r utils/imagery/requirements.txt` installs the pinned
image decoder. `python3 utils/imagery/compile.py` requests the bounded package;
`python3 utils/imagery/compile.py --verify` checks it offline. The compiler
requires Python 3.9 or newer. `python3 -m unittest discover -s utils/imagery`
runs its tests. Downloading uses three concurrent requests, 60-second timeouts,
and bounded retries. Existing decodable source metatiles are resumed from ignored `output/imagery-source`;
delete them before a fresh retrieval if their provenance is uncertain. Each
512-, 1024- or 2048-pixel response is decoded and checked, cropped into 512-pixel tiles and
re-encoded as optimized quality-85 JPEG. `SOURCES.json` records each exact WMS
request, source-byte hash and size, tile grouping and transformation; the
manifest hashes the derived bytes.
The manifest is written only after all required tiles are present and their
combined bytes fit 80 MiB. It is the list of served tiles, not a directory walk.

The source is Hessen's [DOP RGB WMS](https://hvbg.hessen.de/geoinformation/geodateninfrastruktur/geoportal-hessen/geodatendienste-im-originaeren-format),
layer `he_dop_rgb`, licensed [DL-DE Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
The [official metadata](https://www.geoportal.hessen.de/mapbender/php/mod_exportIso19139.php?url=https%3A%2F%2Fwww.geoportal.hessen.de%2Fmapbender%2Fphp%2Fmod_dataISOMetadata.php%3FoutputFormat%3Diso19139%26id%3D0b30f537-3bd0-44d4-83b0-e3c1542ca265)
records the license and native 0.2 m resolution. The source capture date is
unknown. Manifest retrieval time is package build completion; resumed source
metatiles can have been retrieved earlier. The data have been resampled by WMS, cropped and JPEG re-encoded. Capabilities 1.3.0 retrieved 2026-11-03:
SHA-256 `5755ee90b686ea2bf3cccd60235b047574fa9d36da9657807b16464cf621009a`.

WMS 1.1.1 GetMap uses EPSG:3857, `he_dop_rgb`, JPEG, empty styles and 512, 1024 or 2048 pixels square, covering respectively one,
four or sixteen XYZ tiles. Coarser levels use smaller requests to bound source
service work. BBOX is the Web Mercator bounds of each north-down XYZ tile, using
a circumference of 40075016.68557849 m. Levels 10–14 cover the manifest
bounds; level 15 covers Frankfurt and EDFE detail rectangles in the compiler.
Individual tile edges extend beyond those rectangles. At latitude 50° the
level 15 output spacing is approximately 1.54 m per pixel on the ground, and
level 14 approximately 3.07 m: this is not a 20 cm output. No current imagery,
surveyed runway position, or complete regional coverage is implied.
