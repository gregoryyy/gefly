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
places 60km, notable features 20km, detailed features 2km. Replacing the plan or
switching it off drops obsolete queued work; at most two active loads finish. Visible-demand loading remains available.

Persistent storage is bounded by 128MiB and 512 entries with LRU eviction;
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
