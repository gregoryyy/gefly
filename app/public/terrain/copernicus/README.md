# Copernicus global elevation enhancement

This integration requests selected ranges from the fixed public GLO-30 COG
collection. [SOURCE.json](SOURCE.json) records product/access/reference and limits;
[LICENSE.pdf](LICENSE.pdf) retains the original licence downloaded 2026-11-05,
113,786 bytes, SHA-256
`9cd37d37ea654bbcaf0a2e059e6a3a5b5f76072824d8dd860ccf274ada8951bd`.
No new source, licence edition or upstream host is introduced by the overview API.
The world's raster is not bundled.

The [official product metadata](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)
describes a DSM including buildings/vegetation, with EGM2008 heights in metres
(vertical CRS EPSG:3855), and free GLO-30/GLO-90 access. This integration retains
its existing fixed public AWS collection identified as 2021; it does not silently
switch to the latest CDSE release. Source object ETag, size and requested ranges
remain the runtime edition/identity evidence. A DSM is not surveyed bare-earth
runway terrain, and availability does not establish source applicability for
landing or operational navigation.

Modified-data attribution:

produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence
and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA;
all rights reserved.

The organisations in charge of the Copernicus programme by law or by delegation
do not incur any liability for any use of the Copernicus WorldDEM-30.

## Native contact terrain and service profiles

Version 1 at `/scenery/elevation/copernicus/{col}/{row}.bin` supplies native
world30 cells: 1/32 degree, 129×129 nodes, sampled on a 1/4096-degree lattice
(approximately 27.2 m north–south; longitude spacing varies). Nine live native
cells and 512 canonical owner outcomes per stream epoch bound use. Regional
valid triangles remain preferred; absent, failed or budget-exhausted optional
samples use the bundled one-degree fallback. Failed owner outcomes remain fixed
until restart, preserving installed shared edges. Coarse EGM2008 geoid
interpolation and the existing regional height-datum transition remain unchanged.

Version 2 at `/scenery/elevation/copernicus-overview/{col}/{row}.bin` uses distinct
identities for quarter-degree 129×129-node display cells, approximately 217 m
north–south on a 1/512-degree lattice. It resamples the same 30 m source; source
resolution, derived spacing and measured accuracy must not be equated. Both
profiles preserve canonical shared samples and return a 66,628-byte versioned
payload. Version 2 is not a native grid, recording replacement or wider physical
contact window.

The two profiles share one 64 MiB server cache, four upstream range slots,
32 pending cell jobs and a 15-second cell deadline. Of the two active cell-job
slots, at most one can be overview work, leaving one for foreground native v1;
v1 retains both slots when no overview is active. There is no separate overview
upstream pool. Output cells and composed grids receive SHA-256 identities;
source ETag/size/range identity stays stable while decoding.

## Display client status

Task2.0.162 adds the dependent display-only overview client to the native/service foundation. Fine native v1 and display v2 remain separate; no overview payload enters native contact or flight state. This source inventory describes implementation boundaries, not worldwide rendered-relief or training acceptance.

Nine active cells are preloaded. The loader bounds32 payload-cache entries,32 pending on-demand identities,512 immutable outcome metadata records, one serial request shared with preload and15-second operation budgets. The persistent renderer separately retains32 detached overview grids and preserves the existing native history/preview bounds. It keeps its provider across ordinary moving windows and refreshes metadata separately; source/shared-edge/geometry/capacity conflicts remain pending.

Exact authoritative atlas samples win, followed by complete regional/Copernicus overview cells and coarse world. Regional H/N wins; otherwise Copernicus H uses existing world N. A composed cell with remaining nodata is omitted whole. Public retry/parent fallback and geometry-derived refinement limits keep unknown detail from becoming permanently cached flat ground. Actual source/GPU/queue observations and their remaining limits belong to the design and review records.
