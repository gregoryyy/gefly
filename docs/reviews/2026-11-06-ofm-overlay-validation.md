# OpenFlightMaps overlay — independent validation

2026-11-06 16:54 Europe/Berlin. Task2.0.179; R-CHART-1/R-WORLD-6/R-DATA-1.
Reviewer: Codex `/root/camera_return_validate`, reassigned to independent OFM
validation. This reviewer did not author the implementation, requirements or
test harness, and writes only this report. No camera or shared-record edits.

## Reviewed scope and frozen inputs

The publication checkout `/private/tmp/gefly-ofm-overlay` is based on main
`52897de10dfdafb4f7b3252cdb41828f8a22b5f5`. The working application contains
additional map/flight features. Separate integration hashes distinguish those
contexts; acceptance here is limited to the optional visual chart slice in
[SPEC R-CHART-1](../SPEC.md), the [user request](../input/2026-11-06-ofm-overlay.md)
and [SEC](../SEC.md#openflightmaps-optional-aero-overlay). Existing general
[EVAL](../EVAL.md) protocols do not establish chart currency, flight/terrain
fidelity, operational navigation or training acceptance.

Initial reviewed source pins (before the fresh-style finding below is repaired):

| Path | Working-app SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `docs/SPEC.md` | `c6a7825497ceac8cf4089424200cddecbc033867e01f2124dcd4b132970bdfb6` | `0d2522c88b9784fafb666c8432cc05e063a43839b98728f82eb6240c095cfb35` |
| `app/ofm-overlay-server.ts` | `1f907917b1c475cd6f216f9f2939386ccb7ed27cdaa1426dea43901025588717` | Same |
| `app/src/ofm-overlay-source.ts` | `9b47d08b570dbd25022338dd1d803cf39fc0f19f9677fb5a8973da3ccba55c64` | Same |
| `app/src/ofm-map-overlay.ts` | `4fee0d96c61c805c2547a3ee72b2760d4d10df0f89c5696c09735608cc5c8791` | Same |
| `app/src/ofm-overlay-preferences.ts` | `12327038830ec8690be14ffe69449d56067f04fc83323dbe7e4b7fef1fd51193` | Same |
| `app/src/practice-map.ts` | `e8f1f0aac5275b3f67d9a68d3477d43e5450d7fd17ab83d14556ab12eda3add9` | `524b120b55e6f851096917d83c9917e14c2969f4d2e973ad883938de09108900` |
| `app/vite.config.ts` | `8ea026ec888db8c3ea3bae35897bdd4db5f0768fb79dda077bd783509d7f8418` | `8e98bf6ff8298969abd41fba6cf71cc36e439fef90472d122dc425198b322925` |

The browser harness was still being renewed during this inspection. No earlier
zero-group timeout, uncompleted run or revised harness is promoted to a passing
browser result. The MapLibre6 tile-completion event repair was source-inspected:
metadata alone cannot mark pixels loaded; a tile completion can have an undefined
`sourceDataType`. New source pins and all affected results need renewal after any
repair of the finding below.

## Checks independently performed

Reviewer ran in the publication `app` directory:
`node --test ofm-overlay-server.test.ts src/ofm-overlay-source.test.ts src/ofm-overlay-preferences.test.ts src/ofm-map-overlay.test.ts`.
**13 passed,0 failed,0 skipped.** These are5provider,3metadata,2preferences and
3controller tests; their fake HTTP/map/DOM cases are distinct from real browser
rendering. They cover canonical routing, credential omission, MIME/signature/
size rejection, duplicate sharing, four-job admission, pending/cache limits,
cancellation/disposal and one total queue+fetch+body deadline, metadata identity/
byte bounds, strict preference fallback, source lifecycle and retry.

Reviewer independently parsed the original ED publication XML artifact
`/tmp/gefly-ofm-ed-2611.xml`:14599bytes, SHA-256
`1631a347b654bf8fe2dd5481c3b5a6076bfefa7673f99dca3ddcdadef3ea6572`.
Its2611 cycle starts `2026-10-29T00:00:00Z` and ends
`2026-11-26T00:00:00Z`, exactly matching the selected descriptor. The publisher
map script at the supplied source artifact distinguishes the aero PNG endpoint
from its base JPG endpoint, with native zoom7–13. This supports streaming the
published product directly; no offline raster conversion is needed for this
slice. Structured selectable-vector conversion remains a different increment.

The actual downloaded Frankfurt-area tile `/tmp/gefly-ofm-tile.png` is75747bytes,
SHA-256 `e9480c37748e254bbcaaf9ddd7b1780ae8894fab038b83da4b3ed89ee3f3f088`,
PNG512×512,8-bit RGBA. Reviewer independently decoded its IDAT/filter rows:
138765fully transparent,112462partially transparent and10917opaque pixels, out
of262144pixels (about52.93%fully transparent). This is a real transparent aero
sample, not evidence of global coverage or correctness of the chart geography.

The integration owner's separate one-tile actual proxy observation at
`output/flight/ofm-overlay-live-proxy.json` has SHA-256
`b1e2d2bd832c5c4c0b23a541c050dd5ca294b8fe5e213f3a593f2da044b769a1`.
Reviewer inspected its two current source pins and observations: local metadata
made no upstream request; repeated `/charts/ofm/2611/9/268/173.png` produced the
same actual75747-byte tile with exactly one upstream call and a cache hit. This
is supplied execution evidence, not a second live HTTP run by this reviewer.

An additional independent controller probe used supplied descriptor data and a
controlled clock: just before2026-10-29 is NOT YET VALID; at the exact start it is
WITHIN PUBLISHED VALIDITY; at the exact2026-11-26 end it is EXPIRED. Status is
recomputed on render/map events; this probe is not a genuine month-long browser
session. Fixed links are source/terms and an explicit `mailto:` report action;
no automatic submission was observed in source.

## Finding V179-1 — fresh-style reload loses the enabled overlay

**Severity: medium. Criterion: R-CHART-1 style reload preserves selection and
correct layer ordering. Initial outcome: fail.**

`createOfmMapOverlay` registers `style.load` before practice-map's handler that
reinstalls local layers. Its `styleLoaded()` calls `refresh()` immediately, and
`attach()` returns unless the `navigation-fixes` anchor is already present.
A genuinely new base-map style does not contain that app-owned layer yet. The
later practice-map handler adds the anchor, but nothing then refreshes the OFM
controller. Accepted metadata remains cached and the chart never reattaches.

Reviewer independently reproduced with the actual publication controller and a
minimal map event surface: enable and accept metadata; verify OFM exists; register
a later `style.load` handler that adds `navigation-fixes` (the integration's
registration order); replace layers with basemap only and clear sources; fire
`style.load`; drain microtasks. Observed layers remain
`['basemap','navigation-fixes']`, with no OFM source/layer. The existing unit and
browser reload cases retain the anchor in their replacement style and therefore
do not exercise this missing-anchor ordering.

Expected repair: perform reattachment after the application's style handler has
installed its anchor, with disposal/stale guards and no duplicate source/layer.
Add an affected test in which the anchor is installed by a later style listener,
and renew relevant controller/browser/CI acceptance. This reviewer has made no
implementation or test repair.

## Criterion matrix at initial inspection

| Criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Optional saved off/default opacity controls | Source exposes accessible toggle/slider, defaultoff/.8; strictversioned128-byte preferences contain only enabled/opacity. Independent units cover restore/corrupt/denied data. Actual browser persistence pending. | Pass for source/units; browser pending |
| Direct on-demand transparent product, no conversion | Fixed reviewed aero XYZ product and real transparent512RGBA sample verified. Client uses a raster source; no OFMX parsing or physics-worker conversion. Actual MapLibre rendering/pan demand pending. | Pass for source/sample; browser pending |
| Edition/source/date/coverage/error-report meaning | Descriptor identity and raw EDXML dates/hash match; independent date-boundary probe passes; inert text and fixed safe links; only Germany verified and source explicitly non-operational. | Pass for inspected scope |
| Basemap/palette independence and foreground order | Layer inserts before local NAV anchor; source unaffected by palette paint. Fresh-style anchor ordering fails V179-1. Existing paths/aircraft/route remain separate by source inspection. | Fail for fresh style reload; rendering pending |
| Off/hidden/stale/dispose behavior | Actual controller units verify no initial demand, remove source on hidden/off, abort metadata, reject late replies and unregister listeners on disposal. Provider units verify last-consumer/queued cancellation and shared-request survival. | Pass for units; browser pending |
| Optional failure and explicit retry | Source isolates OFM error source ID from generic base-map failure and exposes bounded retry. Unit/controller and proxy limits pass; actual failure/readout/local-controls browser pending. | Pass for source/units; browser pending |
| Canonical provider/limits/security | Fixedcycle/host/path; arbitrary URL/query/XYZ reject; fouractive/32total pending,8MiB/64-entry one-hour memory cache,1MiB bytes,15s total deadline; source16KiB strict metadata identity. Independent13tests pass and supplied one-tile real proxy result is source-pinned. | Pass for scoped source/units/proxy evidence |
| Native map/flight/recording independence | No radio/AP/terrain/physics interface in provider/controller; integration only adds visual menu/layer lifecycle. Actual native step/digest/final-state browser observation pending. No chart data is written into recording source. | Pass by source inspection; runtime pending |
| Provider terms and distribution boundary | Official About/API adoption is integration-owned and attribution/reporting are visible. No chart pixels are bundled. Full GUL PDF remains404 and broader rendered-product/offline redistribution remains an explicit separate task; no unrestricted rights or SLA inferred. | Pass for stated streaming prototype boundary; complete rights review not evaluated |
| Publication integration gate | Initial supplied CI log reaches terminal PASS with563Node,22applicationPython,85assurance and11training;242of243tool tests execute with one platform skip,14of23JSBSim with nine optional skips,25C172S execute.Tracked-content whitespace passed2114tracked paths, with untracked files explicitly excluded. Runtime/harness repair renewal still required. | Pass for inspected initial gate; affected renewal pending |
| Cross-provider / browser/device coverage | Same-provider independent validator is not a peer provider. Chromium fixtures cannot accept embedded WebKit or real background behavior. | Not evaluated; peer/device scope remains separate |

## Initial recommendation

**Do not yet accept Task179 for publication:** V179-1 is a concrete failed
in-scope criterion; current rendered/lifecycle browser evidence and affected gate
renewal are also pending. The source/data/proxy/byte bounds checked above pass
within their declared scope. Preserve initial unsuccessful browser evidence and
this finding; renew only affected criteria on repaired frozen source. This review
accepts no chart operational currency, geography accuracy, worldwide completeness,
full-license redistribution, aircraft/terrain fidelity or training validity.

## Renewal — V179-1 source repair

2026-11-06 16:56 Europe/Berlin. **V179-1 is resolved at the repaired source/test
snapshot**, independently re-exercised rather than accepted from a coder summary.
Current controller SHA-256 is
`9b4b2ee197d4e19ef45d979bf7a07d67b197af50e2e5ccaeb92ebfc58436cebc`;
controller test SHA-256 is
`83b989cffb944e33d6bd52394b61dbcb53ae2dbafdb139768c41d0f44b359cb4`.
Both hashes match working-app and publication files.

`styleLoaded` now defers refresh to a microtask guarded by disposal and the
captured generation. Later synchronous host style listeners can install the
foreground anchor first. Reviewer independently reran all focused tests:
**14passed,0failed,0skipped** (5provider,3metadata,2preferences,4controller).
The added test installs the anchor from a later style listener and checks exact
base→OFM→NAV/route ordering; the normal style test now drains the queued refresh.

The original independent reproducer now observes
`['basemap','ofm-overlay','navigation-fixes']` with the OFM source restored.
Additional independent probes hide or dispose the controller before the queued
refresh runs; both retain only basemap/anchor and do not resurrect the chart.
The initial failing observation above is retained historically. This renews the
source/unit portion of style lifecycle and stale cancellation. Fresh browser
runs and the affected integrated gate remain pending at this renewal; no earlier
zero-group or fixture-failure artifact is promoted to a pass.

## Renewal — current working-app browser evidence

2026-11-06 17:01 Europe/Berlin. The current working-app artifact
`output/flight/ofm-overlay-browser.json` reports **PASS5groups**, Chromium
156.0.8078.80, no page errors. Reviewer independently recomputed artifact SHA-256
`c11f089d990b3009de6c90cebcf0cd233d0bd628ba9faf599661f2f40f3fc635`
and verified all seven recorded source/harness hashes against current files.
This run includes the repaired controller; it is separate from the initial
zero-group timeout and the run invalidated by an in-flight source repair.

The served observer only exposes the actual MapLibre map; the native Worker
wrapper observes and forwards actual commands/state. Fixture raster pixels
change the actual canvas hash from
`0c26772d2377f846fedfed58a445292a46ba6bcfcd2df2e9fbfe8da163cbd525` to
`ec0f6004769fb307b04a2540226154a1b80764fc19ebde2fb3d1d7c68144d855`.
Observed layer order is imagery→OFM→NAVfixes→flight-plan route→GPStarget→NAVstations→
flown path. The actual source and paint reflect native zoom7–13, overzoom,
opacity.8→.35 and source/date/report links. Viewport movement makes new XYZ demand;
off/hidden stops new demand; late aborted metadata does not recreate the layer;
style replacement restores it without duplicates. A genuine optional503 tile
failure leaves the base-map status clear and local overlays/zoom usable; Retry
recovers. Reload restores enabled/.35; corrupt and denied storage default off
while explicit enabling remains usable. Actual worker step/digest/final-state
checks remain unchanged through the paused interactions.

Preparation history remains separate: a style API expectation initially read the
wrong representation of MapLibre paint; the ordinary scenery fixture supplied PNG
bytes to a `.pbf` route, causing a real base-map parse error, which was corrected
in the fixture rather than hidden by broad error suppression. A5group run failed
its final source-freeze assertion when the independently requested style repair
landed during execution, and therefore was not accepted. Publication's initial
zero-group `flight-plan-route-line` assertion assumes a working-app-only planning
layer absent from its main baseline; it needs a scope-aware harness renewal,
not an unrelated feature backport. No unsuccessful result is counted as a pass.

The original13-test CI predates the new style regression; final affected14-test
and complete integration evidence must correspond to the final controller/test
snapshot. Publication browser and that final shared gate remain pending here.

## Final renewal — both browser contexts and affected application gate

2026-11-06 17:06 Europe/Berlin. **Bounded Task179 validation passes.** This
renewal supersedes the initial pending/failed recommendation while retaining its
finding and unsuccessful preparation evidence. V179-1 has a reproduced source
repair and a new affected test; no unresolved implementation finding remains.

Reviewer independently recomputed both final browser artifact hashes and verified
all seven runtime/harness pins against current files:

| Context | Actual observation | Artifact SHA-256 |
| --- | --- | --- |
| Working app | PASS5groups, Chromium156.0.8078.80, no page errors | `189eeddcdeb00e6bb039b3104ed6f4a490a555237d0a60751fb38e73ae5e46b6` |
| Publication | PASS5groups, Chromium156.0.8078.80, no page errors | `072fb1601c52c7e830d721410cf71db50278f1788d8394d7bbda1392fb1b4e9e` |

The final shared browser harness SHA-256 is
`57c45d5925d070f2fccc9b3ab4cb36a9e74cca84275332efdcf2e5dff59d5cea`.
The repaired controller remains `9b4b2ee…36cebc` and its added regression test
`83b989cf…59cb4`, with full hashes recorded in the preceding renewal. All other
provider/client/preference/integration pins retain the initial table values.
The working-app artifact supersedes the earlier accepted-but-now-historical
`c11f089d…` harness packet, without claiming its frozen harness stayed unchanged.

Both final runs inspect actual MapLibre raster source/paint and changed canvas
pixels, not just a toggle state. The working app observes imagery→OFM→NAVfixes→
flight-plan route→GPStarget→NAVstations→flown path. Publication main has no
working-app flight-plan layer; its observed order is imagery→OFM→NAVfixes→
GPStarget→NAVstations→flown path. The scope-aware harness preserves explicit
working-app planning assertions and requires the common local overlays; it does
not fabricate a planning feature in publication merely to satisfy a test.

Each run verifies default-off/closed no demand, visible metadata/PNG requests,
opacity.8→.35, viewport-demanded tiles, low-zoom status, native overzoom bounded
to source zoom13, replacement-style restoration, off/hidden cancellation and late
metadata rejection, optional503 failure distinguished from base-map availability,
usable local overlays/zoom and explicit Retry, saved enabled/opacity reload,
corrupt/denied preference fallback and paused actual native step/digest/final-state
invariance.83observed responses are recorded per run. These are synthetic chart
pixels with the actual MapLibre/native worker; the separately source-pinned real
one-tile proxy observation and raw PNG audit establish the reviewed provider
transport/transparency sample, not worldwide chart-geography acceptance.

Reviewer inspected `output-ofm-app-renewal.log` after the localized style repair:
**564application Node tests passed,0failed**, plus22application Python tests
(6+6+10). This is the entire affected application suite, separate from the earlier
full shared CI's563Node/22Python/85assurance/11training result. The integration
owner reports both post-repair TypeScript checks exit0. Full shared tooling/source
boundaries were unchanged by that controller fix; no final full564-test CI run is
claimed. Final assurance check/diff, commit and mergeability remain integration-
owned. The initial shared gate's one platform tool skip and nine optional JSBSim
study skips remain explicit, never promoted to passing checks.

### Final criterion dispositions

- **Pass:** optional saved toggle/opacity/defaults; fixed reviewed edition/source
  identity; inspected direct transparent raster/no-conversion path; native zoom/
  overzoom and explicit source/validity/coverage/reporting meaning; actual rendered
  layering, opacity and visible-area demand; palette/base-map independence by
  source plus actual layer order; off/hidden/stale/disposal unit lifecycle;
  current browser cancellation/style replacement; optional failure/retry and
  base/local-control usability; strict metadata/preferences; bounded fixed-host
  provider queue/deadline/cache/admission and byte/image checks; supplied actual
  one-tile source/cache observation; paused native isolation; affected application
  renewal and the distinct earlier shared gate.
- **Pass after repair:** V179-1 fresh-style anchor ordering, independently
  reproduced on the actual controller, covered by the added later-anchor test,
  with hidden/disposed-before-microtask cases also exercised. The initial failure
  remains historical; disposal/generation guards prevent delayed resurrection.
- **Not evaluated:** current operational chart/service accuracy, worldwide or
  every-region coverage, full rendered-product/offline redistribution rights,
  complete GUL license review, source SLA, actual chart pixels aligned over every
  map area, a live moving-flight/follow pass, full-app Review/chart interaction,
  genuine hidden-tab/device lifecycle, embedded WebKit and cross-provider peer.
  The browser pan test demonstrates on-demand area loading; it is not a native
  flight-approach or optional look-ahead preload test. Source-only current-chart/
  recorded-chart distinction is explicit in the UI.

The implemented option uses published raster tiles as the viewed map area changes;
offline conversion is unnecessary for this product. Parsing OFMX/AIXM/OpenAir into
selectable geometry or packaging offline chart products remains a separate scoped
implementation and source-rights decision. No aircraft/terrain/receiver fidelity,
procedure or training approval is accepted by these software results. Changed
runtime, harness or criterion hashes require affected renewal.

## Reopened criterion — actual default-view source formats and scale

2026-11-06 17:15 Europe/Berlin. **Actual default-view completion is not accepted
at this amendment.** The earlier fixture lifecycle/source-sample results remain
valid historical observations, but do not close the subsequently exercised live
publisher path. Publication is held pending affected source/UI renewal.

### Finding V179-2 — valid publisher blanks rejected; default chart scale lacks content

Severity: medium, R-CHART-1 actual source rendering/optional failure criterion.
Reviewer inspected `output/flight/ofm-overlay-live.json`, a0group timeout artifact
SHA-256 `1c3906168f666fcda0e3d1db859d08e71853f642a3ac197a872e2de32966ddda`.
Its recorded map is at zoom13, still paused, with OFM unavailable and six chart
source502errors in the default view. Two real zoom12 PNGs loaded successfully.
This is a failing live observation, not an additional passing browser suite.

The integration owner/source agent retrieved the exact failed tile and neighbor.
Reviewer independently decoded those local original PNG artifacts, without
repeating network probes:

| Actual source sample | Bytes / PNG format | SHA-256 / independently observed alpha |
| --- | --- | --- |
| zoom13 tile and neighbor |1233B;512×512,8-bit grayscale+alpha (color4)|`30dc195c8a72a0b58d22208aefdb7b1b01cb3bbc40213d1cd987fe6f8f4d58c1`; all262144pixels have alpha0 |
| zoom12 parent |49789B;512×512,8-bit RGBA (color6)|`0d95532418a254559f88f8f467ad04240fb1da681c6354b5d4fdb1cf201ad7c6`; alpha40–255,218707partial/43437opaque pixels |

The old proxy admitted only color6 and wrongly returned502 for valid color4
transparent source images. The reviewed13-level tiles are also legitimately
blank; merely admitting their format would remove the erroneous failure but
would not make default-view chart content visible. The approved repair admits
only the two observed8-bit alpha-bearing formats4and6 with existing header,
dimension, MIME, byte and host/path bounds, and selects maximum native level12
for this2611 prototype so the map overzooms its content at13+. This is a local
prototype scale choice, **not a claim that all publisher level13 tiles or all
regions are blank or unsupported**. Publisher source metadata/validity stays the
same; the selected UI/source zoom policy must be labeled accurately.

Source changes were observed but not yet accepted as a frozen repaired packet
at this amendment. Affected provider/descriptor/unit tests, both fixture browser
contexts and an actual positive default-view publisher browser run are required
before clearing V179-2. Broader rights, geography/currency and device limits from
the prior review remain distinct. The earlier bounded source9tile/cache probe
and fixture passes do not override this actual source failure.

## Final source renewal — actual default-view rendering now passes

2026-11-06 17:22 Europe/Berlin. **V179-2 is resolved; bounded Task179 validation
passes on the final source-backed packet below.** This amendment supersedes the
17:15hold without deleting either failed live evidence or prior fixture passes.
The integration owner amended the source-selection policy in SPEC to the
observed formats and selected native level12; this validator did not change
requirements. Direct zoom13 routes are not hidden: valid grayscale-alpha blanks
are admitted, while the selected layer overzooms real level12 content.

| Final changed path | Working-app SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `docs/SPEC.md` | `4cd16bf879482e181880efcf26be52ddef4306f18d158b2aac6d00100349d8c0` | `e1e929d22422a0d24f606438e408a2cc1d2a38beac4c8c330ee50ed4f1370460` |
| `app/ofm-overlay-server.ts` | `eb7001479da77e2c6fbbdf789af570b12811fb1ab0cf200dbbf8f60d5d3c28e1` | Same |
| `app/ofm-overlay-server.test.ts` | `038bfc7b339c73518d527c80e145f6f81cbde935adb057e11d6c3dbebc933996` | Same |
| `app/src/ofm-overlay-source.ts` | `3c27997fbf945bbc95d81f8459b1bb47ce09a6fb5576741cb423f0e8753ab20e` | Same |
| `app/src/ofm-overlay-source.test.ts` | `d4501af8b0f6c61ae17c2b46d05ae9671324b0dccace386036c3066ee6f761ca` | Same |
| `app/tests/ofm-overlay.browser.mjs` | `266e38092b361a9e56c30b83db171554e8b57b02f882f29ed5d13f7016905f88` | Same |

The previously repaired controller remains `9b4b2ee…36cebc`; preference,
practice-map and Vite pins remain as previously recorded. The publication dates,
original EDXML hash and publisher identity remain unchanged. No arbitrary host,
HTML acceptance, generic map-error masking or new data service was introduced.
The proxy still enforces exact512×512 dimensions,8-bit depth, PNG MIME/signature/
header/tail, existing1MiB body bounds and the same request/cache deadlines; it now
admits only observed alpha-bearing color4and6 instead of rejecting valid color4.

Reviewer independently reran the final focused command: **15passed,0failed,
0skipped** (6provider,3metadata,4controller,2preferences). The added provider case
admits observed grayscale-alpha empty imagery while unsupported PNG formats
remain unavailable. The source tests require the selected maximum12 and retain
strict immutable metadata identity/URL/byte validation. The previous independent
raw PNG decoding is unchanged and remains the source rationale for this policy,
not a claim that level13 is empty everywhere.

Reviewer independently recomputed all four final execution artifacts and checked
every recorded source pin against current files:

| Final execution | Outcome | Artifact SHA-256 |
| --- | --- | --- |
| Working-app fixture browser | PASS5groups, no page errors | `d619a03252e378fc202129abaa0fd13aca1f896f46e309eec338666765f3759a` |
| Publication fixture browser | PASS5groups, no page errors | `e14a5992d29c70ec533fe730754bbee6a7bb0aa183043a5c2bc85e2377ec9a77` |
| Working-app actual publisher default-view browser | PASS1bounded live-source group, no page errors | `174cec49e6cefa9f94a6c94b297242d02a86cc59b9b06915e76e910fff92f901` |
| Refreshed actual source/cache proxy probe | PASS4checks, exactly1upstream call for repeated parent tile | `badba4a13daf25caa5f49bcff67b9b6618239156919a8acccc9a1c4f11bc217c` |

The fixture contexts renew the same lifecycle/rendering/persistence/failure/
paused-native checks against the final12-level descriptor and corrected image
admission. Each records47responses. The actual default-view browser uses
publisher tiles, actual MapLibre and the native worker with ordinary scenery
fixtures: it requested **only level12** for the chart and received two real
nonempty RGBA parents. They are49789bytes, SHA-256
`0d95532418a254559f88f8f467ad04240fb1da681c6354b5d4fdb1cf201ad7c6`,
and16357bytes, SHA-256
`bdfea65882aae1f164a7772254dba8a06460e4b97cda7984d2db05bf60236825`.
No level13 chart requests occurred in this bounded run. Actual canvas pixels
change with the layer, source ordering remains below local overlays and paused
native stats remain fixed. Reviewer also viewed the generated actual-source
`ofm-overlay-live.png`: Egelsbach chart text/symbols and airspace lines are
visibly present, with local aircraft/navigation markers above the raster. This
is positive default-view UI evidence, not merely an HTTP-header/sample test.
The refreshed proxy probe now identifies metadata maximum12 and the actual
level12parent/cache response on current source pins. The older level9probe is
retained historical, not substituted as evidence of this final source revision.

Reviewer inspected `output-ofm-app-final.log` through completion: **565Node
application tests passed,0failed**, plus22Python application tests (6+6+10), all
successful. The integration owner confirmed both final post-source TypeScript checks
exit0 (working-app and publication), after the same format/scale source freeze.
These compiler outcomes are integration-reported, not rerun by this reviewer;
final assurance/diff and publication remain integration-owned. Earlier
full shared CI563/22/85/11 and post-style564/22 outcomes are separate historical
gates; this report does not call them a final full565-test shared CI run.
Existing one platform-specific tool skip and nine optional JSBSim study skips
remain explicit. No skip or failed preparation/live attempt is a pass.

### Current final recommendation

**Pass for the bounded optional streaming-overlay increment.** Both in-scope
findings have concrete repairs and affected independent renewal. The actual
publisher default view now displays chart content rather than reporting valid
transparent images as failures. Source/edition/validity, bounds, layering,
optional failure/retry, lifecycle/persistence and paused native isolation meet
the scoped software criteria. The selected12-level overzoom policy is explicitly
based on the reviewed Egelsbach sample, with no universal level13/coverage claim.

The earlier final-disposition limits remain: no operational/geographic/current
service acceptance, worldwide completeness, full GUL/rendered-product/offline
redistribution review, source SLA, live flying/follow or full-app Review run,
genuine hidden-tab/device matrix, embedded WebKit or cross-provider peer. Direct
raster streaming needs no offline conversion; structured chart conversion and
packaging remain separate work. New runtime, requirement or harness pins would
invalidate affected acceptance and require another renewal.
