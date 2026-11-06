# Worldwide OurAirports discovery integration

Recorded 2026-11-06 12:12 Europe/Berlin by Codex housekeeping
`/root/world_airport_housekeeping`, alongside `world_airport_data` and
`world_airport_client`. This note records source research and ingestion boundaries;
it does not accept the implementation, data completeness or navigation fidelity.
The orchestrator owns requirements, task status and integration decisions.

## Source and snapshot evidence

The [OurAirports download page](https://ourairports.com/data/) supplies nightly
CSV exports and releases the data to the public domain without an accuracy or
fitness guarantee. No account or API key is needed for these public downloads.
The data release permits local transformation and redistribution; retain source
credit and provenance even though the publisher does not require attribution.
This is distinct from adopting the site's software, comments or every linked
third-party resource.

Read-only `git ls-remote` resolved `refs/heads/main` on 2026-11-06 to the candidate
snapshot `c483a76d30ee903114b777bf099de0fae1761294`. The public
[Git commit metadata](https://api.github.com/repos/davidmegginson/ourairports-data/git/commits/c483a76d30ee903114b777bf099de0fae1761294)
independently returned that identity, tree
`e0f2622977cf4df5100d972ba75fb4a265260a53` and commit time
`2026-11-06T02:53:13Z`. The commit description is “data update”. This identifies
repository bytes, not an AIRAC effective cycle or each facility's update date.
The compiler owner must confirm the selected snapshot and actual byte hashes
before generated assets are accepted.

The download page listed the following sizes during inspection. Its displayed
file modification dates were 2026-11-05, so these are discovery observations,
**not verified byte lengths or hashes for the candidate commit**.

| File | Page-listed bytes | Purpose |
| --- | ---: | --- |
| `airports.csv` | 12,756,853 | Airport inventory |
| `runways.csv` | 3,973,619 | Runway/landing-surface records |
| `airport-frequencies.csv` | 1,302,576 | Airport voice frequencies |
| `navaids.csv` | 1,524,931 | Radio-navaid inventory |

The four observations total 19,557,979 bytes. Pin download paths to the chosen
commit rather than a mutable `main` URL. No bulk CSV, comments or personal
contributor records were downloaded by this housekeeping task.

## Field and identity boundaries

The [publisher's data dictionary](https://ourairports.com/help/data-dictionary.html)
documents UTF-8 CSVs. Important ingestion distinctions are:

- Airport `ident` joins related files; persistent numeric IDs should also be
  preserved. GPS codes are not guaranteed globally unique.
- Navaid transmitted identifiers can repeat; identify records by source ID.
  Preserve separate associated-airport and DME-component information when used.
- COM frequencies are MHz; navaid frequencies are kHz. Runway end headings are
  true, and supplied elevation/length fields use feet.
- Blank fields mean unavailable. Airport membership, runway closure and night
  lighting are different fields; frequency types and surface codes are not
  controlled vocabularies.

The dictionary's airport-type list includes `closed_airport`, whereas the
existing regional compiler accepts `closed`. Inspect the actual pinned snapshot
and record its vocabulary instead of silently dropping records based on either
description. Retain unknown/missing fields explicitly or report rejected records;
do not invent runway ends, magnetic variation, frequencies or source heights.

Navaid frequency display does not establish receiver support. NDB/TACAN and
unsupported channels must remain distinguishable from tunable VHF NAV sources.
OurAirports discovery records are not a complete IFR-fix, airway, procedure or
LOC/GS antenna-geometry package. The existing historical receiver dataset and
its provenance remain separate until a separately validated receiver increment.

## Proposed implementation and review scope

The user's “integrate it” follows the proposal for one pinned worldwide snapshot
compiled into bounded regional packages. This task can extend the existing
R-WORLD-6 discovery scope, with R-NAV-2 traceability and R-DATA-1 provenance.
R-NAV-1 receiver behavior and separate OSM pavement generation are separate
acceptance scopes. These are proposals for the orchestrator, not requirement
changes made by housekeeping.

Review should establish that the compiler preserves source identity, unknown
values and record-class coverage; that manifests bind source/derived bytes and
an explicit snapshot; and that loader failures do not become false empty regions.
Exercise places outside Germany, repeated identifiers, dateline boundaries,
missing runway/elevation data and supported versus unsupported frequencies.
Verify bounded loading/cache/cancellation, map search and point details, blocked
Review tuning and unchanged native/AP state. Source freshness and source-complete
compilation are distinct from official operational completeness.

Shared-record handoff: update the selected inventory's SBOM/third-party notice,
source manifest, research index and task records after integration, retaining
historical regional-source provenance. Existing source manifests must not be
relabeled as worldwide data. No dependency or licence policy change is needed
merely to redistribute these public-domain CSV-derived records.

## Checks and limits

Primary-source web inspection and read-only Git/GitHub commit resolution were
performed. This note does not claim source-file hash verification, generated
record counts, compiler/browser tests or an accepted runtime integration; those
results belong to the implementing agents and independent reviews.


## Integrated source and transport update

The orchestrator selected the pinned commit above and compiled all 86,343 airports,
48,411 runways, 30,394 COM records and 11,008 radio navaids into 1,034 cells plus 97,351
search entries. Actual input hashes and byte counts are in `catalogue.bin`, bound
by the small [JSON descriptor](../../app/public/airports/world/manifest.json).
See [package provenance](../../app/public/airports/world/README.md) for exact hashes,
normalization counters and regeneration. No source rows were dropped in this snapshot.

Opaque `.bin` cells contain bounded UTF-8 JSON, not executable code. `search.bin`
contains gzip data; its neutral extension avoids static-server HTTP auto-decoding
before compressed-byte verification. The assurance catalogue declares source,
generator, evaluator and result hashes with file-level bulk-data scope; airport
fields are not automatically JSON-pointer claims. This avoids expanding millions
of generated fields into the bounded requirement graph while keeping independent
all-cell/source-unit checks required. No assurance extraction code/limit is changed.

Cell failures are immutable for the current centre generation; recovery needs
another centre cell or reload, with a one-minute cross-generation cooldown.
Worker startup/protocol failure also has a one-minute restart cooldown and
one unavailable notice per failure period. These are availability limits, not
empty coverage. Historical receiver signals and OSM surfaces remain separate.
