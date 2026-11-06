# OpenFlightMaps overlay implementation inventory

2026-11-06 16:31 Europe/Berlin. Task2.0.179.
Author: Codex housekeeping subagent `/root/ofm_housekeeping`.
Source and integration inventory only; no runtime acceptance, source adoption or
independent implementation review is claimed here.

## Requested increment and conversion question

The user asks for an optional OpenFlightMaps aviation overlay and whether it
requires offline conversion or can load as an area approaches. The orchestrator
owns requirements, source adoption and shared status; provider integration and
a MapLibre overlay controller have separate implementation owners.

A licensed transparent EPSG:3857 raster tile product can be requested directly
by MapLibre as the viewed area changes. That path needs **no offline conversion**
and no runtime extraction of aeronautical geometry from chart pixels. Following
the aircraft naturally changes the demanded map tiles; bounded directional
warming can be an optional extension of that demand. This is a technical design
inference from the documented tile format, not an assertion that any inferred
endpoint is approved, currently available or licensed for third-party hosting.

A simplified selectable vector overlay is a different increment: OFMX/AIXM or
OpenAir records need schema-aware parsing, unit/reference checks and geometry
conversion. That work can run on demand in a dedicated background worker and
cache its regional result. Preprocessing versioned regional assets remains a
simpler reproducible deployment option. Neither approach belongs on the physics
worker or requires changing native receiver services. Runtime conversion does
not bypass edition, completeness, rights or data-validation requirements.

## Official-source refresh

Retrieved through the web tool on 2026-11-06, approximately16:31–16:33 Berlin.
The dates below distinguish publication history from this observation; a search
result or file path is not treated as a current product contract.

| Official source | Observed evidence and applicability |
| --- | --- |
| [OFMA Application Interfaces](https://openflightmaps.org/2016/08/18/how-to-use-application-interfaces/) (published2016-08-18) | Documents EPSG3857/slippy tiles for web map engines, alongside MBTiles and GeoTIFF application products. Supports the no-conversion raster design; it does not establish a present service URL, current cycle or sponsor-server usage contract. |
| [About](https://openflightmaps.org/about/) | Database use is described under the OFMA General Users' License, including commercial use. Its summary requires source attribution and a way for application users to report errors/corrections. It also disclaims primary-navigation suitability. |
| [FAQ](https://openflightmaps.org/faq/) | Lists CUP/OpenAir/AIXM-related formats and links OFMX documentation. Distinguishes database reuse from rendered/plate products, which can have separate rights; regional completeness and quality vary. |
| [Germany downloads](https://openflightmaps.org/downloads/ed/) | Existing research observed the client-side product selector/interactive map. A page or plugin alone is not a verified edition or download/service contract. Code1 is investigating the current concrete product separately. |
| [Previously indexed complete GUL PDF](https://openflightmaps.org/live/downloads/20150306-GUL.pdf) | A fresh direct request still returned404. Search retained an older indexed PDF excerpt; that cache was not substituted for successful retrieval of a complete current license. This observation does not prove that no valid copy exists elsewhere. |
| [Development-site About](https://www-dev.openflightmaps.org/about/) | Readable and consistent with the database-license summary above. The development-site PDF path was not accessible through the web tool. Development-page search results expose cycle/product labels, but are not accepted current Germany metadata. |

The earlier working-app OFM assessment (`docs/research/2026-11-06-openflightmaps-overlay.md`) and
[map source research](2026-11-03-flight-map.md#openflightmaps-access-observations-and-unresolved-adoption-work)
remain historical evidence. The old plugin references separate aero/base tile
paths and an AIRAC variable; this supports selecting an aero overlay rather than
covering the existing map with another opaque base map. It does not itself
establish the current tile source, transparent-pixel behavior or usage rights.
This housekeeping task did not fetch chart pixels, redistribute data, activate a
provider account or contact OFMA.

## Existing integration surface

[Practice map](../../app/src/practice-map.ts) owns independent Map/Aerial/Map
terrain buttons and the 2D Dark map checkbox in its extended layer menu. Its
paint-only palette change preserves sources, camera and route layers. A new
aviation overlay should stay independent of those choices: darkening the OSM
base must not recolor published chart pixels or silently switch terrain mode.

The map already has persistent source credits, a Charts linkout group and
accessible live status paragraphs. Its transform-request hook identifies
fixed same-origin scenery tile demand as visible; it does not permit arbitrary
upstream URLs. `setVisible` and disposal provide owned lifecycle boundaries.
The plotted aircraft/flown path, planned route and selectable user/source points
must remain readable above an enabled raster overlay.

Relevant existing authority is [R-CHART-1 and map requirements](../SPEC.md):
source/edition/validity and attribution/error reporting are prerequisites for
embedded chart adoption. The current publisher-linkout capability is not runtime
acceptance of the new layer. [SEC](../SEC.md) requires bounded fixed-source
transport, inert source text, explicit stale/unavailable states and separation
from native controls/state; [SBOM](../SBOM.md) inventories data rights separately
from software licensing.

## Proposed checks for implementation owners

These are proposed checks, **not reported passes**.

- Off/open/closed state does not create unintended tile demand or delayed layer
  reappearance. Enable/disable and opacity affect only the aviation layer.
- Selected source metadata identifies region, cycle/validity, rights, credit,
  source link and a deliberate user-driven error/correction action. No automatic
  message/report submission is added.
- Use only a selected canonical provider path and supported tile coordinates;
  bound responses, jobs, cache bytes/entries and failure retries. A failure
  cannot replace a previously useful base map with a fake empty success.
- Late metadata/tile responses after disable, area/cycle change or disposal are
  ignored. Cache identity includes edition/product, not XYZ alone.
- Aerial/palette changes and a style reload retain ordering: OSM/photo below
  aviation content, local route/aircraft/interaction layers above it.
- Visible Follow movement requests appropriate area tiles. Any look-ahead warming
  remains bounded and secondary to visible demand; unsupported regions and
  unavailable products are explicit rather than invented global coverage.
- Paused/Review map interactions preserve native step/digest/final state, radio
  tuning, AP modes, simulation/replay pacing and planning data. Displaying a chart
  does not install current receiver signals, procedures or physical scenery.

## Integration handoff

Only this new research note is housekeeping-owned. The orchestrator should index
it, update authoritative scope/status and record the selected source's actual
license/edition/transport findings after code1's investigation. No shared document,
immutable input, runtime behavior, dependency or other worker file was changed.
Actual source probes, unit/browser checks, quality/validation and publication
outcomes remain subsequent evidence; this note does not accept them.

## Selected source and delivered streaming layer

The preceding inventory is historical preparation. Task179 now implements the
transparent **aero** XYZ product as an optional MapLibre raster layer. Source
metadata is deliberately selectedAIRAC2611, not a guessed/latest-cycle alias:
[ED_2611.xml](https://snapshots.openflightmaps.org/publicationServices/ED_2611.xml),
SHA-256`1631a347b654bf8fe2dd5481c3b5a6076bfefa7673f99dca3ddcdadef3ea6572`,
with published validity29October–26November2026UTC. Independent XML inspection
confirms those dates. The current publisher map implementation advertises
logical256 tiles with pixel ratio2 and native zoom7–13, so512×512 RGBA PNGs
align directly with the OSM EPSG3857 map. The publisher advertises native7–13; the reviewed application selection conservatively caps native detail at12 and overzooms above12 (see the live-source finding below).

One actual Frankfurt tile (`9/268/173`) is75747bytes, SHA-256
`e9480c37748e254bbcaaf9ddd7b1780ae8894fab038b83da4b3ed89ee3f3f088`.
Independent decoding finds138765fully transparent,112462partly transparent and
10917opaque pixels. Its chart includes Frankfurt/Egelsbach context; this is a
bounded source observation, not geography/current-service acceptance. The actual
local proxy serves that tile correctly, and a repeat requires no second provider
call. Metadata alone makes no provider request. No chart pixels are bundled.

**Map menu → OpenFlightMaps → Aviation overlay** saves enable/opacity in a separate
strict128-byte preference, initially off at80%opacity. Tile demand follows the
visible map, including aircraft Follow/panning; there is no offline conversion.
Off/hidden removes the source and aborts obsolete demand. The renderer preserves
all existing local foreground geometry. Source dates, explicit validity status,
native zoom range, attribution, terms and manual error-report links are visible.
The optional chart failure/retry stays separate from base-map and physics status.
The fixed source proxy has4active/32totalpending jobs,8MiB/64entry one-hour memory
cache,1MiB tiles and a total15s queue/fetch/body deadline, with subscriber-aware
cancellation/disposal and bounded30s failures. It forwards no user credentials.

The official About grant and documented third-party chart interface support this
opt-in streaming prototype with attribution and end-user reporting. The old full
GUL PDF remains unavailable. Full terms/product redistribution, permanent offline
packaging and procedure plates remain separate; no broader rights or provider SLA
are inferred. Structured selectable/custom-styled OFMX features would require a
separate bounded parser/converter, which could run regionally in a background
worker and cache versioned results; offline preprocessing is optional, not needed
for this raster option.

## Observed checks and repair history

Both working-app and publication [browser records](../reviews/2026-11-06-ofm-overlay-runtime.json)
pass five groups with actual MapLibre/native worker and fixture chart pixels:
default-off demand, raster/pixel rendering and opacity, on-demand pan/zoom and
style reload, cancellation/optional failure/retry, saved reload/corrupt/denied
preferences and paused native isolation. The working app retains its ordered plan
above the chart; published main has no ordered-plan feature, so its existing
NAV/GPS/path foreground is asserted and that capability difference is recorded.

Initial preparations exposed an actual MapLibre6 completion-event shape, a PNG
fixture mistakenly served as vector PBF, a late style-anchor listener race and a
publication-only plan assumption. These attempts are not accepted passes. The
runtime event/style repairs have targeted regressions; fixture/capability fixes
preserve their real checks. Independent validation reproduced the style race,
then independently reproduced its repair and hide/dispose cancellation.

The shared CI passed563Node/22applicationPython/85assurance/11training before the
final localized style repair/new test; unchanged tooling ran242of243cases (one
platform skip), JSBSim14of23(nine optional skips), C172S25. After the repair, the
entire affected app suite passes564Node/22Python, both TypeScript checks pass,
14focused tests pass independently and both frozen browser runs pass.
[Quality](../reviews/2026-11-06-ofm-overlay-quality.md) and
[validation](../reviews/2026-11-06-ofm-overlay-validation.md) record separate
bounded outcomes. Embedded WebKit, live flight/Review overlay behavior, broad
coverage/full redistribution and batched cross-provider peer are not accepted here.


## Real-provider finding and final renewed packet

A subsequent actual-provider browser run reopened acceptance: six zoom13 requests
were502 through the original strict RGBA-only proxy. Direct source inspection
found valid512×5128-bit grayscale-alpha(type4) PNGs at13/4292/2779 and its neighbor,
not invalid transport. Both were fully transparent262144pixels,1233bytes, SHA-256
`30dc195c8a72a0b58d22208aefdb7b1b01cb3bbc40213d1cd987fe6f8f4d58c1`.
Their12/2146/1389 parent is49789bytes RGBA(type6), nonemptyalpha40–255, SHA-256
`0d95532418a254559f88f8f467ad04240fb1da681c6354b5d4fdb1cf201ad7c6`.
These are local observed examples, not a claim all native13 tiles are empty.

The final proxy accepts the two verified8-bit alpha formats4/6 while preserving
all other bounds. The selected source profile deliberately caps native detail at12,
so MapLibre overzooms the populated parent instead of blank13 content masking it.
The provider's advertised ceiling13 remains distinct from this conservative profile.
No image conversion, synthesized chart or offline processing was introduced.

The final source-pinned working-app and publication fixture suites each pass five
groups. A fresh actual-publisher browser passes its Germany-view group: genuine
Egelsbach chart labels/symbols/airspace are visible beneath local NAV/aircraft,
two actual z12 tiles arrive, no13requests and no unintended map/page errors.
The local live screenshot is not bundled because it contains publisher pixels;
its hash and raw response hashes are recorded with the generated evidence.
Strong enlargement at close zoom is ordinary raster overzoom; selectable/custom
symbols would need the separately scoped structured-feature implementation.

Final affected app renewal passes565Node/22Python, both TypeScript checks pass,
and15focused tests pass independently. The earlier full shared CI563 and intermediate
564application stage above remain historical checks of their named snapshots;
final application, fixture browsers, actual publisher view and proxy checks use
current frozen source. [The runtime record](../reviews/2026-11-06-ofm-overlay-runtime.json)
retains those distinctions and the prior failures. Independent quality/validation
renew their bounded outcomes; full coverage/redistribution, live-flight/Review
chart interaction, embedded WebKit and external peer remain separately limited.
