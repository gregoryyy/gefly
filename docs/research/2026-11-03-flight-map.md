# Public-data flight map for the simulator

Researcher: Codex subagent `flight_map_research`. Accessed 2026-11-03,
approximately 05:56–06:02 UTC (Europe/Berlin: 06:56–07:02 CET).
Scope: the user's request for a flight map opened on the right side of the
screen, showing the current flight path. Related requirements: R-WORLD-6, R-WORLD-1,
R-WORLD-5, R-NAV-2/R-NAV-3/R-NAV-4 and R-REVIEW-1.

## Finding and recommended increment

The existing MapLibre map can become the requested right-side flight map using
already inventoried public data: a readable BKG TopPlusOpen basemap, the pinned
community airport inventory, and the same historical navaids used by the
simulator's radios. The aircraft marker and flown path must come from captured
worker states, not a second geographic simulation. A map/photography switch,
airport/navaid visibility, Follow and Fit path provide a useful flight-practice
increment without adding a new subscription or adopting an unverified chart.

This is a **generated simulator practice map**, not a current aeronautical chart.
The historical navigation layer needs its edition displayed. Current airspace,
NOTAM, obstacle data and published approach geometry are separate work. Do not
draw invented controlled-airspace boundaries merely to make the map look like a
VFR chart.

No dedicated deep-research service is installed. Method: focused primary-source
web investigation, official terms/product pages, small official-site HTML/script
inspection and inspection of the existing repository data manifests. No provider
account, paid service, large archive, new chart dataset or API key was activated.
This note does not pass implementation or aviation-data accuracy criteria.

## Source findings

| Source inspected | Verified finding | Proposed use and boundary |
| --- | --- | --- |
| BKG, [WMS TopPlusOpen product, usage and credit sections](https://gdz.bkg.bund.de/index.php/default/wms-topplusopen-wms-topplus-open.html) | Free use by anyone under DL-DE-BY-2.0; WMS/WMTS, EPSG:3857 and UTM32 variants. Worldwide overview, European middle scales and finer Germany/neighbouring coverage. Underlying sources combine official and OSM data. | Default readable geographical context through the existing bounded proxy. It is ordinary topographic/cartographic context, not airspace or an aeronautical chart. |
| OurAirports, [open data downloads / terms](https://ourairports.com/data/) | Public-domain data, with no accuracy/fitness guarantee; nightly CSV exports include airports, frequencies, runways and navaids. Download currency is not an AIRAC/operational-status guarantee. | Reuse the pinned 103 airport points already bundled. Their coordinates/elevations are community values; selecting a point must not teleport the aircraft or overwrite the physical DEM. |
| Existing [navigation package](../../app/public/navdata/README.md), manifest and `rhein-main-v1.json` | Package ID `rhein-main-nav810-2013-10-v1`, edition **2013.10**, explicitly historical. Source-derived data are GPL-2.0-or-later with the original notice/full license retained. | Reuse this same inventory for source-coherent VOR/DME/LOC/GS map symbols. Retain historical labels and component availability; the symbols do not establish current stations, surveyed antennas or procedures. |
| OpenFlightMaps, [homepage](https://openflightmaps.org/) and [About / General Users' License](https://openflightmaps.org/about/) | Its database grant explicitly allows commercial use under the OFMA General Users' License. Attribution and reporting known errors/corrections are required; its About page also requires applications to provide end users with an error-reporting system/tool. | A credible candidate for a later real aviation layer. It is not automatically excluded as noncommercial, but it is not a zero-obligation data drop. Full terms, exact product rights and a current version must be reviewed before adoption. |
| OpenFlightMaps, [FAQ](https://openflightmaps.org/faq/) | Data are not certified/warranted; regional quality varies. Raw data/derivatives and rendered plate products can have distinct copyright considerations. | Preserve applicability and credits; a freely viewable rendered chart is not proof of unrestricted tile hotlinking/cache/redistribution rights. |
| OpenFlightMaps, [Germany download page](https://openflightmaps.org/downloads/ed/) | The current page contains an interactive-map plugin; parsed page content alone exposes no accepted current edition or download/tile-service contract. The site states that its infrastructure is being modernized. | Do not silently label an inferred cycle as current or use a guessed endpoint for a production layer. |
| DFS, [AIS-Portal terms](https://ais.dfs.de/pilotservice/service/information/disclaimer/disclaimer.jsp?lang=en), §§2/8/11; last change stated 2023-08-01 | Automated portal operation is prohibited except AIXM download data. Chart use on third-party sites/derived works requires written permission; charts/layout are copyright protected. | Do not scrape/proxy portal chart screens into Gefly. The AIXM exception does not by itself establish unrestricted redistribution or a ready public chart feed. |
| DFS, [BasicVFR landing index](https://aip.dfs.de/basicVFR/) | The landing index redirected to a date-specific edition and stated **effective 15 OCT 2026**. Only this index was inspected; no chart pages were retrieved or incorporated. | Useful evidence that an edition exists, not a reuse grant. The official chart/airspace acceptance gate remains separate. |
| OpenAIP, [main site](https://www.openaip.net/) and [API docs](https://docs.openaip.net/) | Main-page retrieval returned HTTP 402 in the web tool; API documentation returned no readable text. | Current license, authentication, limits and redistribution rights were **not verified**. Do not infer rights or free anonymous API access from third-party integrations. |

BKG's online credit requires visible linked BKG and license text plus its data
source notice. The current canonical source link is
[TopPlusOpen data sources](https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_topplusopen.html).
Offline extracts have a date-specific source-notice requirement. Keep the
existing credits and fixed-source transport policy when changing the default
map appearance. The licence does not make the basemap a flight chart.

The current airport manifest pins OurAirports commit
`e86a650a968ba239a1288f96c05fcb80688e77a6`, source CSV SHA-256
`6852f06007ec1154256faff98edb8bbfbbce93fdb279525940864f07e9d90b32` and
derived airport JSON SHA-256
`2c12970b49a71709445254d9f46ee9f7ef0c640c92c8c3fb31c564fc4e035e35`.
The navigation package manifest binds
`762c93b369c3e2b76440f95ece6bf27b94de61d2f08e6c029a31a4bdd0aae1d1`.
These are observed repository identities; the original navaid ingestion and
historical-source assessment are documented in the earlier
[navigation source survey](2026-11-03-rhein-main-navigation.md). No new upstream
navigation snapshot was downloaded by this research.

## OpenFlightMaps access observations and unresolved adoption work

Small identified HTTPS requests inspected the official Germany HTML
(19,857 bytes), homepage HTML (24,516 bytes) and its
[`ofmTileMap.js` plugin](https://openflightmaps.org/wp-content/plugins/ofmTileMap/ofmTileMap.js)
(78,386 bytes); no chart pixels or full datasets were downloaded. The plugin
contains current-format tile URL templates at
`nwy-tiles-api.prod.newaydata.com`, with an AIRAC variable and separate aero/base
paths, as well as an older snapshots template. This proves the official page's
implementation references those services; it does **not** establish their
permitted third-party use, availability, CORS, cycle currency or production SLA.
No request was made to those tile services.

The previously indexed General Users' License PDF at
`https://www.openflightmaps.org/live/downloads/20150306-GUL.pdf` returned **404**
when opened. Search results retained text from an older indexed copy, but that
cache was not treated as retrieval of a complete current contract. The official
About/FAQ summaries above are readable; full product-specific terms remain an
adoption prerequisite. Database permission, rendered-map permission and access
to a sponsor's tile server should be recorded separately.

For a later OFM increment, first retrieve the actual full license/product terms,
choose and hash a concrete regional edition, verify region/scale/validity and
source credits, provide its required end-user error-reporting mechanism, and
test the allowed tile transport/caching path. Do not copy the website's whole
plugin or execute scripts discovered during research.

## Product handoff

Recommended behavior for this requested increment:

1. A clearly named Flight map command opens a substantial right-hand panel while
   leaving the flight view and primary cockpit usable. Preserve the existing
   keyboard/menu discovery and narrow-screen access.
2. Default to the readable public map; allow the existing real imagery as an
   alternative. Keep visible credits/source labels and explicit coverage/failure
   states. The map must remain useful when aerial photographs fail.
3. Show the worker aircraft position and true orientation, the start point and
   the retained actual flown path with a distinct current/selected position.
   Follow tracks the aircraft; manual pan/zoom suspends Follow and Fit path
   frames the flown track. Reset clears the previous flight's path.
4. Add airport and historical navaid switches with readable symbols/identifiers
   and source edition. Preserve optional missing values rather than inventing
   elevations, ranges or station status. Do not conflate aircraft true heading
   with magnetic station/course metadata.
5. During Review show the selected recorded position/path context explicitly;
   opening, panning, zooming, selecting an airport or inspecting a navaid must
   not mutate the paused native step, digest or aircraft state.

Evidence still required from implementation: actual right-panel layout and
keyboard/touch interaction, readable overlays on map and photo views, data
identity/provenance, path/heading alignment with worker states, source-failure
behavior, bounded update/resource use and Review/native-state invariance.
This research does not accept current airspace, NOTAM, navigation, training
credit or operational suitability.

## Southern Germany extension and source audit

Added 2026-11-03 by Codex subagent `flight_map_quality` after the user's
five-state expansion. The earlier 103-airport/86-station recommendation above
describes the initial increment; this section records the expanded selection.
It is source research, separate from the implementation acceptance report.

The [OurAirports terms](https://ourairports.com/data/) release the data to the
public domain without an accuracy or fitness guarantee. A recent download is
not verified operational status. The
[official dictionary](https://ourairports.com/help/data-dictionary.html)
documents UTF-8 CSV, airport identifiers and administrative regions. Airport
selection uses `iso_region`: `DE-BW`, `DE-BY`, `DE-HE`, `DE-RP`, `DE-SL`.
Retain every source type, including heliports and closed facilities; the actual
pinned snapshot uses `closed`, whereas the dictionary lists `closed_airport`.
There is no dedicated glider/ultralight type. Names remain searchable, without
inventing an operational classification.

Runway records can omit endpoint coordinates; dimensions/elevations use feet
and headings are true. Runway geometry is not incorporated in this increment.
The navaid schema has country but no state field. Its beacon types include
NDB, DME, VOR and TACAN variants, without ILS, GPS fixes or procedures.
NDB frequencies retain kHz; VHF/paired DME frequencies use kHz divided by 1,000
for MHz. DME antennas may have separately reported coordinates. Missing fields
do not establish surveyed geometry.

Three independent HTTP 206 prefix reads inspected 8,192 bytes each of
`airports.csv`, `runways.csv` and `navaids.csv` at pinned commit
`e86a650a968ba239a1288f96c05fcb80688e77a6`; observed headers agree with these
format boundaries. Full source-byte/output comparisons are recorded separately
in the [implementation review](../reviews/2026-11-03-right-flight-map.md).

The resulting airport package contains **731 source entries**, including 244
heliports and 41 closed facilities. This is completeness against that snapshot
and five-state filter, not an official list of operating airfields. The map-only
NAV package instead selects German source points in **6–14°E / 47–51.75°N**,
including adjoining states. Association with an airport would omit independent
en-route beacons; a rectangle is an explicit geographic approximation, not exact
state membership.

The pinned OurAirports
[navaid CSV](https://raw.githubusercontent.com/davidmegginson/ourairports-data/e86a650a968ba239a1288f96c05fcb80688e77a6/navaids.csv)
has source SHA-256
`d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1`.
Its **144 selected stations** use snapshot date 2026-11-02 and retrieval date
2026-11-03. The distinct historical fallback supplies **66 German LOC/ILS
stations from cycle 2013.10**, with 61 separate GS and six separate DME antenna
points across the combined package. Its original notice and GPL-2.0-or-later
license remain bundled. No current ILS service, published approach course or
glide path is inferred. The combined **277 points / 210 primary stations** are
map references only; the receiver/worker package stays separate. Broader public
map coverage does not expand physical terrain or aerial-photo coverage.
