# Scenery radius and persistent browser cache

This design warms a bounded area around the **simulated aircraft**, without device
geolocation. Radius is a coverage target and request priority, not a promise that
every layer is available or that a complete offline region has been downloaded.

The browser cache runs by default and handles only same-origin public scenery routes:
`/scenery/map`, `/scenery/imagery`, `/scenery/vector`, `/scenery/landmarks`, local
`/terrain/region` height tiles and `/imagery/rhein-main` tiles. It excludes page
navigation, aircraft/recording data, accounts and arbitrary URLs. Existing source
credits and [source-specific rights](../research/2026-11-03-global-scenery.md)
remain applicable; caching does not change image dates or navigation authority.

Warm near tiles before farther tiles, with at most 200 planned URLs and two
background requests at a time. Current targets: maps z10/30km; photo and vector
z11/20km plus z14/2km; regional terrain 35km. Labels use only enabled levels:
places 60km, notable features 20km, detailed features 2km. A new warm plan waits until camera-visible globe tiles settle. Brief camera
loading retains nearby progress instead of rebuilding the same plan. Movement
of 500 m, a mode change or disabling terrain cancels obsolete work. Foreground
demand is isolated from warm cancellation, including identical URLs. Visible
map requests may issue a second
proxy-facing request to promote a tile already warming; the proxy shares the
upstream fetch. This narrowly bypasses browser HTTP coalescing, preserving normal
Cache Storage hits.

Visible live photographs and hashed regional JPEGs bypass service-worker interception, retaining browser cancellation and ordinary HTTP caching. Chrome does not relay cancellation of a page request into the service worker’s separate network fetch; stale photo requests otherwise exhaust connections and cause detail timeouts. Background photo reuse through Cache Storage is not promised to visible demand. Existing JPEG digest validation remains mandatory.

Camera-visible Cesium requests and packaged regional imagery each have two concurrent loads, leaving local HTTP/1.1 capacity for renderer workers and terrain assets. Map-renderer code is imported before photography starts; the renderer itself is created only when selected. These limits prevent starvation rather than guaranteeing a fixed loading time.

Persistent storage is bounded by 128 MiB and 512 entries. One lazily reconstructed
metadata index tracks bytes, expiry and LRU in memory. Hits update recency without
rewriting tile bodies; insertion evicts incrementally instead of rescanning every
response. Worker restart reconstructs conservative insertion-order recency while
retaining cached bodies. Each request waits only for its own persistence.

OpenFreeMap landmark data has a tighter 24MiB/96-entry bound. Its
[public service policy](https://openfreemap.org/) permits small offline extracts
up to 3,000 tiles or 50MB, at most four parallel requests and an identifying
User-Agent. The existing fixed proxy supplies that identification. Do not expand
this into bulk collection or use the OSM standard tile endpoint; its
[tile policy](https://operations.osmfoundation.org/policies/tiles/) prohibits
offline prefetch. New providers require their own permission and cache policy.

Mutable `/scenery` freshness follows response `Cache-Control`, capped at 24h;
the current proxies advertise `private, max-age=300`. `no-store` responses and
failures are not cached; expired content is not automatically served offline.
Bundled immutable tiles use cache-version/source-hash identities, including the
terrain manifest's content hash in the tile URL. Manifests still use network or
HTTP revalidation; cached elevation does not bypass existing byte/hash checks.

Service workers require HTTPS or localhost and usable browser storage. Unsupported
browsers, registration/quota/cache failures or eviction fall back to ordinary
fetches. This is a data cache, not an offline application or a substitute for the
server proxy: a deployment must still serve the allowlisted scenery routes.
Simulation time/physics remain independent of warming, and authoritative terrain
coverage/validation failures retain their existing behavior.

## Rendered-vector reuse and foreground priority

The single MapLibre terrain renderer retains up to 64 finished 512px RGBA canvases
(64 MiB of owned pixels, excluding consumer/GPU copies). Same-XYZ requests share
one render with up to 8 independently cancelable subscribers; only the last
subscriber cancellation stops that work. Unique pending work remains bounded at
one active render plus 48 queued jobs. Revisiting a resident tile reuses its pixels.
No extra WebGL contexts or parallel renderer pool are created.

MapLibre marks its allowlisted requests as visible demand. The fixed-source
proxy promotes an already queued warm tile when visible demand needs it, while
retaining one shared upstream request. Four upstream slots per source and the
existing pending/byte limits remain unchanged. Background warming keeps its
two-slot limit. Browser-native photo cancellation remains on its existing path.

These changes reduce repeated I/O, redraws and queue contention. First visits
still depend on upstream latency, source availability and serial vector rendering;
a warm-cache fixture does not establish a whole-scene cold-load time.
