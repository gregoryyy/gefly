# Online imagery options

Checked 2026-11-03 by Codex orchestrator for the
[user questions](../input/2026-11-03-imagery-provider-com.md). Research only; no
provider account, billing, credentials or external flight-session requests enabled.

Google supplies supported Map Tiles APIs for imagery visualization, including
Cesium-compatible 3D rendering. API access needs a key/billing setup and visible
attribution. Its [policies](https://developers.google.com/maps/documentation/tile/policies)
restrict prefetching, storage, caching and offline use except applicable permitted
conditions; they do not authorize bundling imagery with this GPL repository.

Google's current [error/availability documentation](https://developers.google.com/maps/documentation/tile/error_handling)
says 2D satellite and Photorealistic 3D Tiles are unavailable for projects linked
to EEA billing accounts. Applicability depends on the actual account and terms;
the user's location alone does not establish their billing account.

[Cesium ion's imagery offerings](https://cesium.com/learn/ion/content-usage-and-attribution-guide/)
include commercial global content from multiple providers under their separate
terms. An optional online provider could complement the openly licensed local
Hessen scenery, with an independently reviewed account/cost/attribution/cache and
failure path. It would remain separate from authoritative elevation, collision
and navigation data. No online provider is selected by this note.
