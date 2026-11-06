# Copernicus source and delivery provenance

2026-11-05 23:29 Europe/Berlin · Codex housekeeping, alongside native/service
and display implementation. This records the assigned source inventory; it does
not independently accept decoding, dynamics, rendered relief or aircraft fidelity.

The integration retains `Copernicus-GLO30-Public-COG-2021`, using selected COG
ranges from `https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/`.
The identity was already present in the working tree. The overview endpoint
resamples this same collection and does not add a source, host, licence edition
or dependency. Do not equate this fixed public collection with the latest CDSE
release. Runtime object ETag, size and exact range checks identify the objects
actually decoded; a product-family name alone does not freeze their bytes.

The orchestrator consulted the [official Copernicus product metadata](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)
on 2026-11-05 and supplied its source findings for this inventory: DSM including
buildings/vegetation, vertical EGM2008 reference EPSG:3855 in metres, and free
GLO-30/GLO-90 access. Those product-family facts do not establish surveyed
bare-earth runway geometry or accept an individual source post.

The [original retained licence](../../app/public/terrain/copernicus/LICENSE.pdf)
is copied byte-for-byte into the isolated native/service worktree: 113,786 bytes,
SHA-256 `9cd37d37ea654bbcaf0a2e059e6a3a5b5f76072824d8dd860ccf274ada8951bd`.
The original modified-data attribution and Copernicus liability disclaimer remain
intact in the [package README](../../app/public/terrain/copernicus/README.md).
This is preservation of existing rights evidence, not a fresh legal interpretation
or permission change.

[Source metadata](../../app/public/terrain/copernicus/SOURCE.json) distinguishes
native version 1 (1/32-degree cells, 129² nodes, approximately 27.2 m north–south,
nine native cells and 512 owner outcomes per epoch) from display version 2
(quarter-degree cells, 129² nodes, approximately 217 m north–south). Both derive
from the nominal 30 m source; latitude changes longitude spacing. Physical H,
existing coarse geoid N, and rendering H+N remain explicit. Regional DHHN2016/GCG
precedence and approximate datum transitions remain limits, not surveyed joins.

Delivery status differs deliberately between worktrees. The isolated
`/private/tmp/gefly-copernicus-native` increment publishes the common version-1
and version-2 service APIs and native integration, while the display client is
absent and remains a separate dependent Task 2.0.162. Its metadata and
README explicitly retain coarse far-horizon rendering. The full working tree
contains the separate display implementation with independent acceptance pending.
Neither inventory claims that an API's existence activates a display client.

The shared resource record reserves a native service slot: at most one overview
job in the two total cell slots, four shared upstream requests, 64 MiB shared
cache, 32 pending cell jobs and a 15-second cell deadline. The separate display
client contract is nine active cells, 32 cached, one request and a 15-second
batch. Current terrain loading cancels in-flight overview work while retaining
completed display cells; Review/flat/reset/dispose clear it. These declared limits
need implementation tests and independent review; inventory consistency alone
cannot establish performance, priority, continuity or native/render agreement.
