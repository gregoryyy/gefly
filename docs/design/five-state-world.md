# Five-state world coverage

The requested states are Bavaria, Baden-Württemberg, Hesse,
Rhineland-Palatinate and Saarland. The declared container is
**6–14°E / 47–51.75°N**, including neighboring areas; an enclosing rectangle does
not establish source availability throughout its foreign or border margins.

On 2026-11-04, a direct query of the official
[BKG VG250 state-boundary WFS](https://sgx.geodatenzentrum.de/wfs_vg250?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=vg250%3Avg250_lan&OUTPUTFORMAT=application%2Fjson&SRSNAME=EPSG%3A4326&COUNT=100)
returned 34 features (3,544,120 bytes; SHA-256
`23eb7589d892a70e44afac2acd2f5f8a87b7e62fbeca3d29da8d005739b43cd9`).
The table is **derived** by taking coordinate minima/maxima over every polygon
for each state's `gen` name, including separate Baden-Württemberg water pieces.
It verifies generous containment, not cadastral boundary accuracy. The source
geometry is not bundled or used as flight physics.

| State | West °E | South °N | East °E | North °N |
| --- | ---: | ---: | ---: | ---: |
| Bavaria | 8.9759 | 47.2701 | 13.8396 | 50.5642 |
| Baden-Württemberg | 7.5119 | 47.5324 | 10.4957 | 49.7915 |
| Hesse | 7.7725 | 49.3954 | 10.2360 | 51.6575 |
| Rhineland-Palatinate | 6.1124 | 48.9666 | 8.5084 | 50.9423 |
| Saarland | 6.3569 | 49.1119 | 7.4038 | 49.6394 |

All five fit inside the declared envelope. Extending north beyond the previous
51.5° bound is necessary for northern Hesse.

The physical baseline remains the pinned **BKG DGM200**, a **200 m horizontal
grid** with DHHN2016 normal heights. BKG's
[documentation, pp. 3–4 and 6](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/deu/dgm200.pdf)
describes nationwide coverage, source-dependent vertical accuracy and
**DL-DE-BY-2.0** attribution/change notices. Its 1 m height-value resolution does
not mean a 1 m horizontal survey. Keep the existing source dates/hashes and
`© GeoBasis-DE / BKG (2026), Daten verändert` notice. Finer mesh subdivision is
interpolation. GCG2016/2023 height conversion has separate **CC BY 4.0** rights;
the [BKG open-data announcement](https://www.bkg.bund.de/SharedDocs/Produktinformationen/BKG/DE/P-2023/230705_GCG2016_OpenData.html)
confirms that license. Existing source/attribution notices remain applicable.

The version-2 [terrain manifest](../../app/public/terrain/region/manifest.json)
declares 608 quarter-degree slots (32 columns × 19 rows). Its compressed,
hash-bound index records 382 full and 93 partial assets, plus 133 unavailable
slots. Partial assets preserve unsupported DEM/geoid nodes as paired NaNs;
a slot's presence does not establish support for every point in that slot.
The expanded package pins the nationwide GCG2016/2023 archive, SHA-256
`d5a40a20ae4cdb372c6ca27dbf742c1f46d8e28be282a12ef083fb93b823c67a`;
the fine Hessen patch keeps its existing source. Source-centre bilinear sampling
uses one shared geographic lattice. Physical height remains DHHN2016; GCG offsets
are added for rendering. The nine-tile native window and retained Review assets
remain bounded; absent regional support now falls back to the separately sourced coarse global
baseline under R-WORLD-11, rather than extending the last known height. These are package/design statements, not accepted height or
flight-fidelity validation.

Maps and photography remain separate from physical height. The development
proxy's map/photo envelope is 6–14°E / 47–51.75°N. Official photography layers
are Hessen `he_dop_rgb`, Bavaria `by_dop40c`, Baden-Württemberg
`IMAGES_DOP_20_RGB`, Rhineland-Palatinate `rp_dop20` and Saarland
`sl_dop20_rgb`. Per-source endpoints, rights and credits are retained in
[SBOM](../SBOM.md#streamed-regional-terrain-airport-directory-and-live-photography)
and [notices](../../THIRD_PARTY_NOTICES.md#live-public-map-and-photography).
Requests select intersecting layer envelopes; actual source footprints and
upstream failures can leave transparent gaps. The Saarland service is labeled
2025; this is not a per-tile capture date or continuous-availability promise.
Live images are temporary, mutable view data, separate from pinned terrain and
recorded aircraft state. Retain source-age uncertainty and failure reporting.
A provider's 20/40 cm source pixels do not establish that resolution in resampled
flight-view tiles. This expansion does not accept surveyed runway surfaces,
buildings/obstacles, current aeronautical charts or complete cross-border data.

At exact shared root-tile edges, unskirted masked Cesium meshes can expose a
sub-millimetre Float32 picking seam. Browser validation records adjacent rendered
rays within 1e-10 rad and independently checks exact-center geometry against
native heights; both supported sides must meet the 0.25 m display comparison.
Source gaps remain empty. This introduces no runtime geometry extension or
physics fallback and does not claim exact rendered seam continuity.
