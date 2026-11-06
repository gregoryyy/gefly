# Worldwide OurAirports discovery snapshot

Source: [OurAirports open data](https://ourairports.com/data/), public domain,
without accuracy or fitness warranty. Source field meanings are documented in
the [publisher data dictionary](https://ourairports.com/help/data-dictionary.html).
This package is community discovery information, not a navigation chart, current
AIRAC/service-status guarantee, surveyed airport layout or procedure database.

Retrieved 2026-11-06 from pinned upstream Git commit
`c483a76d30ee903114b777bf099de0fae1761294`. A snapshot date is not each record's
effective date. The four inputs are independently hash-pinned by the compiler and
recorded with their byte sizes/row counts in `manifest.json`:

| Source file | SHA-256 |
| --- | --- |
| airports.csv | `e2e65a3ddaf76170c0e2c373cb8b68597bdf3b59d243c4d6db454d48498ba6d7` |
| runways.csv | `b0bac6ad2a802eba770d57b3e42c191c888f3d334e42780f3d12ff5930650d07` |
| airport-frequencies.csv | `c1b1f04b42040cdb50c470ce75962459ee9d168c27843046c0c66d540fd1f171` |
| navaids.csv | `d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1` |

All 86,343 airport, 48,411 runway, 30,394 COM and 11,008 radio-navaid source rows are
retained in 1,034 nonempty five-degree cells. Closed fields, heliports, water
runways, balloonports and unsupported radio channels remain source records;
availability is not inferred. Airport children belong to the airport-reference
cell even when a runway endpoint crosses its boundary. Navaids belong to their
own position cell. Cells use half-open WGS84 degree bounds; longitude +180 shares
the −180 cell and latitude +90 belongs to the final row. Missing manifest cells are
known empty for this snapshot, not a failed network lookup.

Runway endpoints/widths/elevations/headings can be absent. Missing numeric fields
stay null rather than becoming zero or inferred geometry. The compiler retains
source zero elevations and out-of-band/zero COM frequencies as metadata; receiver
tunability is a separate decision. Four invalid navaid frequencies, one runway
heading, six runway lengths and nine runway widths are null with explicit
`rejections` field counters in the manifest. No primary airport or child row was
discarded in this snapshot. Navaid `ident` is not unique; discovery IDs use the
stable numeric source ID. Source VOR/DME metadata does not create an ILS, ADF,
receiver signal, GPS fix or autopilot command. DME pairing, magnetic calibration
and RF/procedure modeling are outside this discovery export.

Coordinates are geodetic latitude/longitude degrees; heights and runway dimensions
retain explicitly named source feet. Runway headings are true degrees. Navaid
frequencies are kHz, including fractional NDB values; COM source values are MHz
with a separate exact integer kHz representation. Only selected inert fields are
copied: airport comments, contributor identities, external home/Wikipedia links
and arbitrary CSV columns are excluded.

`search.bin` is a gzip archive with a neutral extension so static servers do not
automatically decode it before integrity verification. It is a global 97,351-entry airport/navaid index. Search names/codes
locate a cell; selection must load and validate that cell's real records before
showing actions. Every cell and both compressed/expanded search bytes have sizes
and SHA-256 hashes in the manifest. This permits bounded same-origin loading
without contacting OurAirports during flight. Imported data does not change the
historical Rhein-Main receiver package or native flight model.

To reproduce after separately obtaining those exact four source files:

```sh
python3 utils/airports/world.py \
  --source-dir output/ourairports/source/c483a76d30ee903114b777bf099de0fae1761294 \
  --output app/public/airports/world --retrieved 2026-11-06
python3 utils/airports/world_test.py
```

Compilation performs no network requests and checks all source pins before
writing output. Gzip omits filename/time/host-specific header metadata. Source
compiler code is project GPL-3.0-or-later; the underlying OurAirports factual
source data is released to the public domain. Updating the snapshot requires
reviewing new source hashes/metadata and regenerating the manifest, cells and
search index together; a partially updated directory is not an accepted package.


## Bulk transport and assurance coverage

`manifest.json` is a small JSON descriptor binding `catalogue.bin` by byte size
and SHA-256. `catalogue.bin` contains UTF-8 JSON metadata, including every source
pin, count and cell hash. `cells/<x>-<y>.bin` contains UTF-8 JSON records with the
same schema used by the compiler and worker. These are opaque bulk transport
assets, not executable binary code. `search.bin` separately contains gzip data.

The bounded assurance graph traces the descriptor and file-level provenance;
it does not expand each airport/runway/frequency field into a JSON-pointer node.
Required compiler/client tests validate every packaged cell, count, hash, source
identity and coordinate/reference boundary. This changes no aircraft-value or
hand-authored JSON extraction and does not make a graph pass data-fidelity proof.
Failed cell reads are latched for their current centre generation; another
centre-cell generation or a reload is needed to retry, with a one-minute minimum
cooldown across generations. Worker construction failures have a one-minute
restart cooldown and a deduplicated unavailable indication.
