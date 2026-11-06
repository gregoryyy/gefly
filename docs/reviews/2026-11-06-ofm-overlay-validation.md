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

## Merge-resolution inspection — current main airport integration

2026-11-06 17:39 Europe/Berlin. PR111's target advanced while publication was in
progress. Reviewer independently inspected merged publication revision
`f4c16e4ab3a80c05bef8e1ad6b75adcbbdcb3736`, with OFM parent
`1332e41246b061a5ce70e5025aa4bad48a2000de` and incoming main
`446293af00423a6af3f1e4102a05804202ff207c` (airport-surface PR98).
**Merge meaning is preserved for R-CHART-1; current integrated runtime acceptance
is pending renewed merged browser, TypeScript and gate observations.** The earlier
unmerged passes remain historical, not automatic approval of a changed Vite
integration snapshot.

The seven manually reconciled paths are package scripts, Vite configuration and
ARCH/GAPS/SBOM/SEC/TODO. No OFM provider, descriptor, controller, preferences,
practice-map or browser-harness implementation bytes changed from the OFM parent.
Reviewer independently compared those seven runtime/input files byte-for-byte;
all retain the final hashes recorded above. The merged Vite configuration hash is
`822b1dceacff039a4007a12bea65f784f1d7d101c6313e42f2e646e41078c9f7`.
The full merged SPEC hash is
`65b88722cd64ee542546aa6be62490139f20edc49f71aaea7a0e33745b988619`;
its R-CHART-1 declaration is exactly the OFM parent's declaration. Unrelated
incoming specification rows account for the full-file hash change, not altered
OFM acceptance criteria.

| Merge-sensitive criterion | Independent observation | Outcome at this inspection |
| --- | --- | --- |
| OFM source/math/security contracts | Provider/metadata/controller/preference/practice-map/harness bytes unchanged; strict formats4/6, selected7–12 policy, dates, queue/cache/deadline and generation/style guards retain previous source acceptance. | Pass for unchanged source meaning; merged execution pending |
| Both middleware services coexist | Vite retains OFM import, instance, registration and close disposal in development and preview; airport service has its own distinct instance/route registration/disposal. OFM is still registered before other route middleware and canonical chart paths do not become airport paths. | Pass by source inspection; server startup/browser pending |
| Test commands survive reconciliation | Merged package JSON parses. Reviewer compared script keys and complete whitespace-delimited test command tokens from both parents: no named test script or test token was omitted. OFM browser command remains registered and airport tests/dedicated browser command are retained. The inherited missing comma is repaired without dropping a key. | Pass for registration/syntax; execution pending |
| Complete dated evidence and inputs survive | Whole heading/body blocks in DONE were compared against each parent: all181 blocks from each parent remain present with unchanged content (not merely matching titles). Every input-index link from each parent remains; blank-bullet whitespace cleanup does not remove a real record. The immutable OFM input itself is byte-identical. | Pass |
| Current scope/status remains authoritative | Complete OFM ARCH/SEC/SBOM sections, Task179 checked line and the16:33 OFM decision remain unchanged. Incoming airport/worker sections and pending tasks are retained. Task168's historical assessment now explicitly points to selected Task179 streaming work and leaves full redistribution review separate; older non-adoption planning text is dated history, not a replacement for the newer decision. | Pass for merge meaning; no airport fidelity acceptance |
| Current integrated gate and evidence | Full merged CI is running; renewed merged publication browser and TypeScript are pending. Old browser hashes bind the earlier Vite integration, so they are not reported as merged-runtime passes. Final assurance/diff and mergeability remain integration-owned. | Blocked pending supplied current evidence |

No source-contract regression or omitted OFM feature was found in these merge
resolutions. This inspection does not independently accept the incoming airport
implementation, terrain workers, physical surfaces or their source fidelity.
It also does not convert the old full CI or final-source browser observations
into results at the merged revision. Follow-up must verify the merged artifact's
current source pins, terminal gate outcomes and actual map rendering before
closing this pending integration recommendation. No runtime/shared file repair
was made by this validator; only this assigned report is amended.

The immutable-input preservation check was also performed at Git blob level:
all140raw input files from the OFM parent and all141from incoming main are
present in the merged tree with exactly the same blob identities; none changed
or disappeared. Reviewer `just check` passes555Markdown files after this report
amendment. That structural pass is not the pending merged-runtime/gate renewal.

## Final merged-runtime renewal

2026-11-06 17:57 Europe/Berlin, clock-derived. Reviewer inspected the completed
renewal at the same merged revision
`f4c16e4ab3a80c05bef8e1ad6b75adcbbdcb3736`; no OFM runtime repair followed the
source freeze. This section resolves the preceding pending merged execution
recommendation, while preserving its initial observations and all earlier limits.

| Previously pending criterion | Current observed evidence | Result |
| --- | --- | --- |
| Merged Vite/browser integration | Publication `output/flight/ofm-overlay-browser.json` has five passing groups, zero application/map errors, Chromium156.0.8078.80, and all seven source hashes independently match the current files, including merged Vite `822b1dce…`. Actual layer pixels change, foreground order and pause invariance remain covered. | pass |
| Retained tests and current shared gate | Final whole merged CI log identifies HEADf4c16e4 and completes606Node/22Python application tests,85assurance and11training tests, integrity and tracked whitespace, with a passing terminal summary. | pass for executed checks; skips remain explicit |
| TypeScript at merged application | Integration owner reports merged check session25531 exit0; no affected runtime edits followed. This is integration-reported compiler evidence, not an independent rerun. | pass on supplied execution evidence |
| Unchanged source and actual publisher observation | Server, source reader, controller, preferences and harness retain reviewed final pins. The previous working-app five-group fixture and actual default-view one-group publisher evidence remain applicable to their unchanged source scopes; the merged publication has its own renewed fixture run. | pass within those separate scopes |

The current publication fixture artifact SHA-256 is
`728aeded25d89d7c0628f32a66d4a14d97083d2a45c7e0cab8fdf233a63337a4`.
It retains the publication-specific limit: this baseline has no ordered-plan
feature, so GPS/NAV/trace foreground is checked without claiming a plan layer.
The working-app artifact `d619a032…` separately covers its plan foreground;
actual publisher artifact `174cec49…` separately covers the real nonempty
level12 parents and absence of level13 requests in the reviewed default view.
No new worldwide or live-flight claim is inferred from combining these scopes.

Reviewer read `output-ofm-merged-ci-final.log` through its terminal
`Foundation CI: passed with skipped checks` summary. SHA-256:
`547d1f1b8b69716550a30d252d955ed13da76ceb7da4c355f73b47b3e26af974`.
The application Python count is6+6+10, all successful. Repository tools execute
242of243 with one platform skip; JSBSim study executes14of23 with nine optional
package-unavailable skips; C172S study executes25of25. Assurance integrity
passes at input hash
`7c46304a32dafe08bdce7b515c1ac1289c6c69758d75baf0e6cb163d3c151305`.
These are observed local merged gate results, not hosted CI or physics acceptance.

The preceding parallel attempt in `output-ofm-merged-ci.log`, SHA-256
`d93a5e848507a631862b17f77540fb5d141fe9f6a417eb6f8a7ebfc9a957a15d`,
failed an assurance CLI subprocess timeout and reported84of85 passing before a
terminal CI failure. It remains an unsuccessful attempt. A subsequent serial
assurance renewal passed85of85 (`output-ofm-merged-assure-tests.log`, SHA-256
`16c0b580fe59cea166e541e03d41be7699957bed1321735a6b7eacabee8dd0af`),
then the entire final merged CI passed. No source repair or timeout-limit change
was used to convert the failed attempt into a pass.

**Final bounded recommendation: pass for R-CHART-1's optional streaming-overlay
increment at this merged runtime snapshot.** No unresolved OFM validation finding
remains. Final report/status integration, post-document assurance/diff, current
mergeability and publication remain the integration owner's work. Broader rights,
operational/source coverage, genuine hidden-tab/device testing and external peer
remain outside this acceptance as recorded above. A changed affected runtime pin
would require renewed evidence.

## Worldwide-discovery main merge — source renewal

2026-11-06 18:10 Europe/Berlin, clock-derived. Main advanced to
`59b39a847920e017d4b976995ec2a9985145e061` (PR102); publication now merges it at
`4c68d4d1730eacafdea5bbac4124ff5111927bb7`, with OFM parent
`d19b8657f56008a6306e41af201d4bb6db46df74`. The prior merged-runtime acceptance
is historical for its earlier practice-map integration. **Source preservation
passes; renewed current execution remains pending** until the new browser/CI
artifacts are observed.

Independent Git inspection confirms unchanged OFM server/source/controller/
preferences/harness and Vite bytes, with the hashes recorded above. The current
practice-map hash is
`10e4fd75d9ac02678ffc5d7c7b230b072500b9369817640ccd51c69654e7bb9c`;
the full SPEC hash is
`1ca75f4d4a7e86e1ec2a81b2d12faea732126f218844ecac88476f2040b44ed5`.
The R-CHART-1 declaration is unchanged. Against incoming main, the practice-map
diff adds only OFM imports, controls/controller lifetime hooks and the specific
optional-source error exclusion. Against the OFM parent, it adds worldwide
discovery integration while retaining those chart hooks. Worldwide station
layers follow the existing `navigation-fixes` insertion anchor, so the unchanged
chart placement remains below local navigation layers by source inspection;
actual merged pixel/lifecycle evidence is pending.

| Merge-sensitive criterion | Independent observation | Result |
| --- | --- | --- |
| OFM/source boundaries and map integration | Core source/date/format/bounds/lifetime contracts unchanged; both worldwide loader disposal and chart disposal retained; added source inventory does not command native receivers or redefine chart data. | pass by source inspection |
| Both test inventories retained | All named script keys, unit-test command tokens and browser-command tokens from both parents survive in parseable merged package JSON. | pass |
| Whole records and immutable inputs retained | All183 OFM-parent and182 incoming-parent DONE blocks remain byte-equivalent as complete heading/body blocks; all142/143 respective raw input blobs and index link sets remain. | pass |
| Declared evidence and profile preservation | All catalog arrays/records from each parent remain; non-array schema fields match. The Task180 exact generated-style profile and its reviewed evidence boundaries are preserved. | pass |
| Current map runtime and shared gate | New practice-map hash requires renewed browser evidence; new whole CI is running. TypeScript exit0 is integration-reported, with no corresponding runtime source change. | blocked pending browser/CI |

This source renewal does not independently accept worldwide discovery accuracy,
airport geometry, radio reception or incoming aircraft behavior. No runtime or
shared file was edited by this validator.

## Bounded harness and current worldwide/options browser renewal

2026-11-06 18:31 Europe/Berlin, clock-derived. Publication is now
`55aa17197fc06c498f52c0d7069c009ec06d5bc0`, merging the worldwide OFM revision
`4c68d4d1730eacafdea5bbac4124ff5111927bb7` with saved-Options main
`1ac24f3bae53358d8a7bf4d9607504d7a13d4fec`. Independent Git comparison confirms
the production OFM modules and practice-map integration are unchanged from4c68d4d.
The harness changed; its exact current SHA-256 is
`de2a82c51b0556b58b1d01b3ee689e50b89c0275dd9b619015736b5837e1e8b2`.

The previous actual fixture attempt exceeded ten minutes and was terminated.
`output/flight/ofm-worldwide-stalled.json` explicitly records failed preparation
at4c68d4d, with completed groups not recorded/not accepted. The old passing
artifact did not cover that run. Source inspection identified an unbounded
`page.evaluate` promise waiting for `style.load`; MapLibre's style validation can
return before emitting that event. This was a credible diagnostic path, **not
a demonstrated cause of the observed stall**. No stale browser result is promoted
and no claim is made that the underlying cause has been fixed.

Reviewer inspected the complete harness diff. It adds stage/progress artifact
writes, saves pre-replacement style readiness/layer/source/error diagnostics,
bounds the replacement-style promise and response-body collection at30seconds,
and bounds failure diagnostics at3seconds. Existing layer, pixel, ordering,
opacity, source-zoom, native-invariance, failure/retry, cancellation and storage
assertions are retained. Timeout rejects into the failure path; it does not skip,
reset the test or convert a stall into success. The new progress writes mark a
run in progress before a final pass can be written. This is a bound on these
identified waits, not a claim that every browser operation has a global deadline.

The validator independently extracted the actual pure `bounded` helper into an
isolated Node VM without importing/executing the browser harness. Fulfilled values
are returned, original rejection propagates, and a never-settling promise rejects
with the timeout label; all three checks pass. The helper clears its timer in
`finally`. It does not cancel the underlying promise; existing browser/server
cleanup remains responsible for the run lifetime. No product source was changed
by this reviewer or by the harness-only diagnosis.

Current actual fixture artifact `output/flight/ofm-overlay-browser.json` has
SHA-256
`3c175ed060a91e5b8ecee774f02f5b67f60d98e0c9bec2f6d4a965b095f30916`.
Reviewer independently verified five passing groups, zero page/map errors,
Chromium156.0.8078.80 and all seven current source/harness hashes. The map hash
is10e4fd75… as recorded in the worldwide source renewal. The artifact reaches
`final checks` and actually passes style replacement, rather than merely timing
out cleanly. Pre-replacement diagnostics show `isStyleLoaded=true`, map
`loaded=false`, and no map errors; this observation does not explain the older
unrecorded stall. No second browser run was launched by the validator.

| Previously pending current integration criterion | Observed current behavior | Result |
| --- | --- | --- |
| Worldwide NAV foreground and OFM rendering | Actual source/style includes `world-navigation-stations`; the harness checks every baseline GeoJSON foreground layer above OFM, actual canvas pixel change and paused native invariance. | pass |
| Style replacement/opacity and on-demand tile behavior | Bounded replacement really completes; opacity0.35 survives, low zoom/overzoom constraints and viewport request checks pass. | pass |
| Off/hidden lifecycle, optional failure/retry and saved choices | All current fixture groups complete with retained assertions and no errors. | pass |
| Harness does not mask failure | Diff inspection plus independent fulfilled/rejected/timed-out helper probes; assertions retained and timeout remains failure. | pass for the inspected changes |
| Current whole integrated gate | Earlier4c68d4d full CI passed with626Node/32Python/89assurance/11training and integrity0errors, but55aa171 changed harness and merged Options; its final whole CI is still running. | blocked pending current final CI |

**Current bounded browser/harness recommendation: pass; final55aa171 shared gate
remains pending.** The full previous gate is historical, not a substitute for the
new running `output-ofm-saved-options-ci.log`. Previous actual publisher source
observations retain their unchanged-source limits; the new result uses synthetic
chart pixels and does not newly accept live publisher geography, worldwide
coverage, aircraft fidelity or external peer. Final assurance/diff and status
integration remain the integration owner's work.

## Saved map-filter main merge — source renewal

2026-11-06 18:40 Europe/Berlin, clock-derived. Publication now merges current
map-filter main at `2bbf107e6208519ecfeac747d5a5f0e2ec0d7f70`, parents
`55aa17197fc06c498f52c0d7069c009ec06d5bc0` and
`c19caa5277b1eff846fea55e280b4e500bd5ead2`.
**Source-focused recommendation: pass; fresh merged browser/final gate pending.**
No source-validation blocker to publishing this merge snapshot was found.

Reviewer independently verified identical OFM server/source/controller/preferences,
bounded harness and Vite bytes against55aa171. Current practice-map SHA-256 is
`fbe2eebf8a491c29fd4a3d8e30b61e06bdf90f84f42e030d5d8d476e3830b2df`;
SPEC SHA-256 is
`4f1e4744abed21d72190cb91fcc472ade34b79f3fe8cae8f9e051e7ab1cf742e`.
The practice-map import conflict retains both OFM and category-preference imports.
Against incoming main, its diff contains only the existing OFM controls/controller,
visibility/disposal and optional-error hooks. Against the OFM parent, it adds the
reviewed saved-filter initialization/change hooks. Worldwide NAV repaint and
loading/disposal remain; the chart's insertion anchor and layered semantics are
unchanged. Current TSC/structural passes are supplied integration evidence.

| Merge-sensitive criterion | Independent observation | Result |
| --- | --- | --- |
| Preserve canonical source requirements | Exactly one R-NAV-5 row equals incoming main's single Fixes-gate declaration, and exactly one R-CHART-1 row equals the OFM parent. The duplicate older NAV5 conflict row is removed rather than treated as a competing criterion. | pass |
| Preserve OFM plus saved category behavior | Both import/hook sets coexist; no core/chart source or date/format/lifetime contract changes. | pass by source inspection |
| Preserve tests/evidence/history | All script keys and unit/browser command tokens from both parents remain. Complete187 OFM-parent and185 main-parent DONE blocks and145 raw input blobs from each parent are retained, alongside index links and equal catalog records. | pass |
| Current runtime/gates | New practice-map hash needs a fresh current browser. Previous55aa171 full CI now completes successfully, but is historical for this changed integration. Current2bbf107 browser/final CI remain pending. | blocked pending current execution |

The completed `output-ofm-saved-options-ci.log` at55aa171 has its passing
terminal summary,641Node/32Python/89assurance/11training with the existing
optional skips. It resolves the previous section's55aa171 CI-pending condition,
but does not accept this newer integration. New request/status records for scoped
merge tasks remain the integration owner's responsibility. No runtime/shared
source or requirement was edited by this validator; only this assigned report.

## Map-zoom main merge — source renewal

2026-11-06 18:47 Europe/Berlin, clock-derived. Current publication is
`102696991fc070bc055520fcd2f0e06eb38501f2`, merging
`2bbf107e6208519ecfeac747d5a5f0e2ec0d7f70` with map-zoom main
`5cd1c6fb5053dd7511b2776130c9ec070b606ccc`.
**Source-focused recommendation: pass; fresh current browser/full gate pending.**
No source-validation blocker to publishing this snapshot was found.

Reviewer independently compared the merged map against both parents. Its diff
against incoming main adds only retained OFM controls/controller visibility/
disposal/error hooks; its diff against the OFM parent adds the incoming shared
toolbar/keyboard zoom interface, labels and existing min/max clamp. Main and
flight-assists have no additional OFM-specific diff against incoming main.
Core OFM modules, bounded harness and Vite retain their reviewed exact hashes.
The new practice-map SHA-256 is
`70ff22e110bd3fcacce3763119704895163eda2ec5136d83e2c6acb93a630bef`.
Saved filters, worldwide NAV and local foreground source ordering remain.

Independent package/history checks preserve both parents' script keys and
unit/browser command tokens, all188 OFM-parent and186 incoming-parent complete
DONE blocks,150/146 respective raw-input blobs, index links and equal catalog
records. These source-preservation passes do not establish new runtime coverage.

The previous2bbf107 browser is now observed separately:
`output/flight/ofm-overlay-browser-before-mapzoom.json`, SHA-256
`bb2b8d1e4ad7c73b949eeda2e444468741f39fb992432d778618cacb2f850759`.
It has five passing groups and no errors, and all seven pins independently match
the2bbf107 Git source. This resolves that earlier browser-pending condition only;
it does not cover the new70ff22e1… practice-map hash. Current TypeScript/fresh
browser/final CI observations must be recorded separately before current
integrated acceptance. No assertion, chart data or product behavior was edited
by the validator.

## Receiver-source caption clarification

2026-11-06 18:50 Europe/Berlin, clock-derived. Reviewer independently inspected
`383cdf96c3076fc525f793ff389631c4398da4fc` against1026969. Its entire commit
diff is exactly three strings in `practice-map.ts`: initial map caption,
layer-change caption and worldwide navaid popup source label. No control flow,
source selection, units, data, receiver behavior or acceptance criterion changes.
The updated practice-map SHA-256 is
`4541d11db3b61968d296e339b358ea3a1f009e29e0cd399d9b8058c8e03608ec`.

**Pass for the wording repair.** It states that receiver signals use a separate
historical NAV810 inventory, independently of OurAirports discovery, and retains
the regional published-fix limitation. It no longer incorrectly constrains future
receiver inventory to the discovery/fix region, and makes no new regional/global
receiver-coverage acceptance claim. Current actual browser/full CI remain pending
at this changed presentation-source identity; no earlier artifact is relabeled
as covering it. No additional product or criteria change was made by the validator.

## Worldwide historical receiver main merge — source renewal

2026-11-06 18:58 Europe/Berlin, clock-derived. Current publication merge is
`0c21a23bfc2d67a25548fa8d65932046d9524259`, parents
`2c37a36dc31393175c5c92d2b688690c7e200544` and current global-receiver main
`1a530500bf24d630f59ba10dc260869c7d4c640d`.
**Source-focused recommendation: pass; fresh current browser and whole CI pending.**
No source-validation blocker to publishing this merge snapshot was found.

Independent Git comparisons confirm OFM server/controller/source/preferences,
Vite, bounded harness and practice-map are unchanged from the OFM parent. The
map remains4541d11d… with the three reviewed caption clarifications. NAV manifest,
world package, original gzip, shared receiver, radio panel and main are exactly
incoming global-receiver main. The captions therefore distinguish source
inventories without imposing obsolete regional receiver coverage. This preserves
the earlier independent NAV source review; it does not newly establish actual
global receiver behavior through an OFM browser observation.

The validator checked Node file arguments, each complete Python test-command
stage, each browser-command component and named script keys against both parents;
all survive, with identical dependencies. Exactly one R-CHART-1 row matches the
OFM parent and exactly one R-NAV-4/R-NAV-5 row each matches incoming main.
No criterion was relaxed or duplicate conflict declaration retained.

Whole-record checks independently preserve all190 OFM-parent and187 main-parent
DONE blocks,151/147 respective raw-input blobs, input-index links and equal
catalog records. Included final PR104/107/108 review/runtime/completion records
remain acceptance for their separately tested frozen revisions, not automatic
acceptance of this combined source. Their completed gates were inspected in the
assigned reports; no new planned result is counted as passed here.

Fresh actual OFM/browser isolation with the current native NAV inventory and
complete integrated CI are still required. Old browser and prior-wave CI remain
historical as documented above. No product/shared source was edited by this
validator; only this assigned report is renewed.

## Current global-receiver integration — actual browser renewal

2026-11-06 19:00 Europe/Berlin, clock-derived. Reviewer independently inspected
the fresh actual artifact at current0c21a23:
`output/flight/ofm-overlay-browser.json`, SHA-256
`6f2606d14d989243558f197d2df5e0ece86a15cfa69a800643d9faeb3674a0ff`.
It records five passing groups on Chromium156.0.8078.80, zero page/map errors and
completion through `final checks`. All seven runtime/harness hashes were
recomputed and match current files, including practice-map4541d11d… and bounded
harnessde2a82c5…. The caption clarification is therefore covered by current
presentation-source identity rather than an older artifact.

| Current bounded runtime criterion | Observed current evidence | Result |
| --- | --- | --- |
| Visible raster/source/date/order/native isolation | Actual MapLibre pixels change with the fixture chart; chart remains below baseline local/worldwide NAV/GPS/path layers, and paused native state invariance assertions pass. | pass |
| On-demand viewport/zoom/style/opacity behavior | Current run actually completes bounded style replacement, preserves saved opacity and validates native zoom/overzoom and visible-area requests. | pass |
| Lifecycle/optional errors/persistence | Off/hidden and late metadata cancellation, optional failure/retry, reopen/reload and corrupt/denied preferences all complete with retained assertions and no errors. | pass |
| Final complete integrated gate | Current whole CI is still running in `output-ofm-final-global-ci.log`; old-wave passes do not establish its outcome. | blocked pending final CI |

This is actual current app/native-worker execution with synthetic chart/scenery
pixels and the current integrated worldwide historical NAV inventory. Source
identity/provenance of that inventory was independently checked in the source
renewal; this OFM fixture does not itself accept RF reception, real chart
geography, publisher service coverage or aircraft fidelity. **Current bounded
browser recommendation: pass; final whole CI and final assurance/diff remain
pending.** No new browser or heavy test was launched by this validator.

## Final global-receiver integrated CI renewal

2026-11-06 19:03 Europe/Berlin, clock-derived. Reviewer independently read the
completed `output-ofm-final-global-ci.log` through its passing terminal summary
at unchanged `0c21a23bfc2d67a25548fa8d65932046d9524259`. SHA-256:
`9478010f6aefc0b97c41c0aef5e4e6fefbffbcb0cc2b817e266c59117c42af9a`.
The final current browser artifact remains6f2606d1…; its five-group pass and all
seven source/harness hashes were independently rechecked, with no source change.

| Final current integration criterion | Observed evidence | Result |
| --- | --- | --- |
| Entire shared gate at current combined source |662Node/32Python application tests,89assurance and11training tests pass; integrity and3265tracked-path whitespace pass with terminal `Foundation CI: passed with skipped checks`. | pass for executed checks |
| Current graph integrity |44,248nodes/66,314facts,0errors/235warnings/138notes, input hash29fb11a9… at0c21a23. Warnings/unknown source semantics are not converted into acceptance. | pass for structural integrity |
| Current actual browser/source binding | Actual five-group current fixture, zero page/map errors and all seven current source pins agree, including caption-fixed practice-map4541d11d…. | pass within the previously stated software scope |

The complete integrity input hash is
`29fb11a94162f5b4cbd52df633ee76cd4f661720ec308876007d51f3924f26e2`.
Application Python stages are6+6+10+10, all successful. Repository tools
execute247of248 with one platform skip; the JSBSim study executes14of23 with
nine optional package-unavailable skips; C172S study executes25of25. Skips remain
not evaluated, not passes. No duplicate full gate or browser was launched here.

**Final bounded runtime/shared-gate recommendation: pass for R-CHART-1's optional
streaming overlay at0c21a23.** All scoped software source, current browser and
whole-CI criteria have observed supporting evidence. Previously failed/stalled
attempts remain separately recorded, with no unproven root-cause claim. Final
post-document assurance/diff, shared metadata and publication remain explicitly
integration-owned and are not reported complete here. Operational/current chart
coverage, publisher SLA/full redistribution rights, native receiver/aircraft
fidelity, broader devices/hidden-tab behavior and external-provider peer remain
outside this bounded acceptance.
