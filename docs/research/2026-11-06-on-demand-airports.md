# On-demand airport ground surfaces

Recorded 2026-11-06 07:57 Europe/Berlin by Codex `airport_housekeeping`.
Task 2.0.164 / R-AIRPORT-3. Implementation acceptance is pending; this note records
source applicability and the bounded approach.

## Direction and sources

The user asks to build the suggested airport generator, following the earlier
on-entry generation/cache question and runway/taxiway/apron scope. No dedicated
on-demand architecture was archived. Cell sizes and resource limits below are
orchestrator choices, not additional quoted user decisions.

The existing offline Frankfurt compiler supplies provenance and missing-surface
handling examples; its fixed bounds cannot serve worldwide runtime packages.
The [dynamic-region research](2026-11-03-dynamic-region.md) already identifies
coverage, resource limits, upstream allowlisting and cache/version policy as
prerequisites for on-demand compilation.

Use OSM ways tagged `aeroway=runway`, `taxiway` or `apron`, following the
[aeroway documentation](https://wiki.openstreetmap.org/wiki/Key:aeroway).
These are community physical-infrastructure records, without surveyed geometry,
operating-status, procedure or navigation authority.

One fixed source is `https://overpass.private.coffee/api/interpreter`. The
[Overpass instance documentation](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances)
identifies its global dataset and service context. Availability remains an
external dependency; bounded serial requests are not an uptime guarantee or
permission to crawl worldwide data.

OSM data uses ODbL: display contributor credit/license and preserve the applicable
data-license obligations when distributing derived databases. See the
[primary rights reference](https://www.openstreetmap.org/copyright). Generated
public-data caches remain separate from GPL source. No new dependency or aircraft
data rights are introduced.

Packages retain way ID/version/time, source snapshot and generation times, and
retrieved-body SHA-256. Exclude mapper usernames, UIDs and changesets. A source
hash identifies an input; it does not establish accuracy or alone reproduce an
expired cache without the original source body.

## Generation and cache bounds

Canonical same-origin requests identify half-degree cells. The server generates
the fixed-source query; clients cannot submit upstream URLs, query programs,
file paths or arbitrary bounding rectangles.

| Area | Initial engineering budget |
| --- | --- |
| Source work | One active request;10 s minimum between starts;8 pending identities;30 s complete deadline;8 MiB response; no redirects/credentials |
| Generated package | 2 MiB;2,000 features;30,000 points;1,500 points per feature; finite coordinates;10 km segments and20 km feature extent |
| Persistent server cache | Ignored `.cache/airport-regions-v1`;128 entries/128 MiB; atomic writes and validated reads; 7-day nonempty/1-day empty retention |
| Browser/rendering | Nine desired cells; one fetch; 32 cached payloads/64 MiB; six regional collections; 14,000 total geometry instances |

The shared code contract is authoritative. These bounds are not measured
throughput, source resolution or aircraft tolerances. Latitude support excludes
the polar half-degree caps. Wrap dateline longitudes and bound work before mesh
loops; raw longitude subtraction can otherwise create enormous false strips.

Retain complete supported ways, deduplicate source identities across neighbors,
and distinguish closed single-ring areas from lines. Reject unsupported geometry
or excessive work. A fresh service instance must reuse valid disk entries;
corrupt cache data cannot become scenery. Valid empty results mean no supported
ways were returned for that query/snapshot, not that no airport exists. Incomplete
responses and source/package failures remain unavailable, with bounded cooldowns.

## Rendering and limits

Drape surfaces over the existing terrain/geoid sampler. Missing height defers
geometry without sea-level placeholders. Prepared scenery takes priority,
including EDFE's separate runway/cues. Redraping airport collections cannot
rebuild the globe or change authoritative physical terrain.

Unknown widths use illustrative 25 m runway/12 m taxiway defaults. Missing surfaces
are not invented. This increment adds no buildings or flattening. Generic practice PAPI is optional; it adds no surveyed installed lights,
collisions, starts, airport catalogue entries, navaids, procedures or worldwide
OurAirports fallback. Existing prepared datasets retain their separate coverage.
Worldwide OSM availability does not establish complete airport geometry.

Review, flat studies and disposal must suppress/cancel live work. Cache payloads
contain public geometry and cache metadata, not recorded flights. Requests still
expose a coarse region to the local service/upstream; operator/network logging
has separate behavior.

## Observed implementation evidence

The actual app/native/Cesium browser fixture passes compilation in a Node worker, one dedicated browser reader, ready California meshes, distant UK-region traversal/backtracking, native pause/digest isolation, Review suppression and fresh-process validated disk reuse. Source geometry/pixels are synthetic; real-source accuracy is not tested. Live Cape Town probes returned502 and a later direct source request timed out; unavailable results are not cached as empty airports.

Paved runway markings use30m stripe/30m gap within the generic pattern in [EASA CS ADR-DSN.L.530](https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-aerodromes-regulation-eu?erules-id=ERULES-1963177438-2468). Placement, thresholds and PAPI fit are illustrative. Existing Practice PAPI controls generic heads for larger mapped paved runways; no installed equipment claim. Pavement offsets are apron4cm, taxiway8cm, runway12cm and paint18cm, purely visual above the same receiver.

Independent review remains pending. Check query/path/byte/schema/privacy bounds,
empty-versus-failure outcomes, cache restart/corruption/expiry/eviction,
deduplication and backoff. Verify outside-Germany rendering, region transition/
backtracking, dateline/polar guards, prepared priority, missing-height recovery,
cancellation and Review/native-state isolation. Report independent quality,
validation, final shared gates and peer status separately; software tests do not
establish airport, training or operational fidelity.
