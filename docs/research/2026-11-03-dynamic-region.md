# Dynamic Darmstadt, Odenwald and Spessart sources

Researched by Codex `region_sources` at 2026-11-03 05:40 CET, Europe/Berlin.
Source observations and exact probe hashes are in the immutable
[input record](../input/2026-11-03-dynamic-region.md). This recommends sources;
it does not accept implementation, airport fidelity or R-REGION-1 coverage.

## Recommended bounded increment

Use the official nationwide BKG DGM200 as the coarse terrain layer across a
bounded region such as 8.2–9.8° E, 49.3–50.45° N, keeping the existing finer
Hessen package available. This rectangle includes the named regions and crosses
Hessen/Bavaria/Baden-Württemberg; Hessen-only WCS cannot establish complete
terrain there. DGM200's explicit DHHN2016 normal heights preserve the existing
physical-height convention and GCG2016 conversion. BKG already reconciles state
borders in this product. The 200 m grid is suitable for broad relief, not runway
shape or accepted landing fidelity. Source ages are mostly 2000–2019 and must
remain disclosed.

[BKG's product and reuse terms](https://gdz.bkg.bund.de/index.php/default/digitales-gelandemodell-gitterweite-200-m-dgm200.html)
provide a free anonymous ZIP. The [documentation](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/deu/dgm200.pdf)
defines datum and 200 m spacing. Download and hash the ZIP once during authoring;
extract and inspect the actual TIFF, then compile small hash-pinned tiles into
local assets. The ZIP does not provide efficient runtime pixel ranges. Actual
loaded tile hashes, finite-value checks, valid GCG support, shared native/render
interpolation and explicit unavailable coverage are still required. Do not
replace unavailable cells with zero or let rendering select a different surface
from the fixed-step worker. The existing GCG West source covers this suggested
rectangle; verify all selected interpolation nodes remain valid. Full EDDF/100 NM
coverage is a separate scope and extends beyond this rectangle.

A multiresolution local tile manifest can stream only needed assets without
introducing an upstream availability dependency. A future server proxy for
source-backed on-demand compilation needs explicit coverage, resource limits,
allowlisted upstream URLs, cache/version policy and SEC updates. A camera-driven
texture request must never alter simulation step size or physical terrain state.
Do not silently swap coarse/fine ground surfaces beneath an active aircraft.

## Photography across state borders

Current public services were actually queried anonymously with tiny image crops:

| State | Endpoint | Color layer | Source pixels / rights |
| --- | --- | --- | --- |
| Hessen | [existing official service](https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows?SERVICE=WMS&REQUEST=GetCapabilities) | `he_dop_rgb` | 0.2 m / DL-DE-Zero-2.0, existing research |
| Bavaria | [current DOP40 service](https://geoservices.bayern.de/od/wms/dop/v1/dop40?SERVICE=WMS&REQUEST=GetCapabilities) | `by_dop40c` | 0.4 m / CC-BY-4.0 |
| Baden-Württemberg | [official DOP20 service](https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ATKIS_DOP_20_C?SERVICE=WMS&REQUEST=GetCapabilities) | `IMAGES_DOP_20_RGB` | 0.2 m / DL-DE-BY-2.0 |

The [Bavarian replacement notice](https://geodatenonline.bayern.de/geodatenonline/seiten/aktuell_vorjahre.html)
retires the old DOP80 endpoint. [BW's Open GeoData page](https://www.lgl-bw.de/Produkte/Open-Data/)
confirms DOP20 availability and credit terms. Each state's service needs its own
source/rights record and coverage mask; a service bounding box is not a state
polygon. Use transparency when composing border tiles, test actual seam pixels,
and avoid opaque blank rectangles hiding neighboring states. Image source
resolution does not establish output tile resolution; retain point-specific
acquisition date as unknown until actually established. Keep request fan-out,
concurrency and retry bounded; CORS availability today is not uptime assurance.

The [nationwide BKG DOP20 service](https://gdz.bkg.bund.de/index.php/default/wms-digitale-orthophotos-bodenauflosung-20-cm-wms-dop.html)
requires a separate paid license for third-party use. It is not the anonymous
open-photo shortcut for this delivery. [TopPlusOpen](https://gdz.bkg.bund.de/index.php/default/wms-topplusopen-wms-topplus-open.html)
is a usable nationwide ordinary map fallback, with attribution and data-source
notice obligations. Label it as a map if used; do not present it as photography
or an aviation chart. Runtime live imagery changes the currently local-only
network behavior and therefore needs the corresponding SEC/product disclosure.

## More airports on the map

[OurAirports' official public-domain data](https://ourairports.com/data/) is an
appropriate community inventory for map points, names and identifiers. Filter a
pinned `airports.csv` snapshot by an explicit region/radius, allowed airport
types and finite WGS84 coordinates; decide closed-site/heliport inclusion openly.
Preserve upstream ID/type/elevation as source fields and optional missing values.
Do not derive procedure geometry, surveyed runway ground, real-time service
status or current navigation authority from these community points. Airport
reported elevation must not overwrite the shared physical DEM. For a bounded
first increment, local static GeoJSON avoids live directory requests and needs no
API account. Source edition/hash and a visible community/not-for-navigation label
are necessary even though attribution is voluntary under the public-domain terms.
