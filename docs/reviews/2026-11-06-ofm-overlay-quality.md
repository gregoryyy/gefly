# OpenFlightMaps optional overlay — quality review

2026-11-06 16:46 Europe/Berlin. Task2.0.179; R-CHART-1/R-DATA-1.
Reviewer: Codex `/root/ofm_housekeeping`, reassigned to independent quality.
The reviewer authored the source-inventory note only, not runtime, tests,
requirements, source selection or integration. This report is the only assigned
write path for this review.

## Initial outcome and scope

**No blocking implementation finding in the inspected snapshot.** Actual-browser,
publication and final integration evidence are pending at this initial point;
this is not a claim that those checks passed. Two small source-status presentation
points and deadline wording were returned to the orchestrator for clarification
or repair before the final renewal below.

Scope: the optional OFM raster proxy/source contract, MapLibre controller,
preferences, styles and small integration delta in the working app. The root tree
contains unrelated work; it is not accepted by this review. The publication
checkout is `/private/tmp/gefly-ofm-overlay`, based on main
`52897de10dfdafb4f7b3252cdb41828f8a22b5f5`; final copy/source pins must be checked
when the orchestrator freezes its integrated artifact.

Read AGENTS, housekeeping/quality contracts, SDLC, STYLE, relevant SPEC/SEC/SBOM,
existing OFM research and the assigned scope. Source findings and independent
observations are distinct from specification validation, cross-provider peer,
rights for unrestricted distribution or aeronautical acceptance.

## Source applicability inspected independently

The publisher's [application-interface documentation](https://openflightmaps.org/2016/08/18/how-to-use-application-interfaces/)
explicitly describes EPSG3857/slippy tiles as an application/web-map interface.
It is a historical2016 format document, not by itself a current service URL or
current-cycle assertion. The current official map plugin supplied by code1
references the Neway aero/base API and min7/max13 native zooms, with
`tilePixelRatio:2`. Reviewer read this static JavaScript as evidence and did not
execute it or copy its behavior wholesale into the application.

Independently recomputed the supplied source artifact hashes and inspected their
content, rather than relying on the compiler/provider author's summary:

| Artifact | SHA-256 / independent observation |
| --- | --- |
| Official `ofmTileMap.js`, local `/tmp/gefly-ofm-map.js` | `08420c3c49eff59bc9db08006e26c09a97c67c5db69bfc340f55ade063d14cba`; aero path and logical/retina zoom treatment match the implementation's selected API. |
| [ED2611 publication XML](https://snapshots.openflightmaps.org/publicationServices/ED_2611.xml), local `/tmp/gefly-ofm-ed-2611.xml` | `1631a347b654bf8fe2dd5481c3b5a6076bfefa7673f99dca3ddcdadef3ea6572`; Python standard-library XML parsing independently reads cycle2611 start `2026-10-29T00:00:00Z` and end `2026-11-26T00:00:00Z`. |
| Selected source PNG, local `/tmp/gefly-ofm-tile.png` | `e9480c37748e254bbcaaf9ddd7b1780ae8894fab038b83da4b3ed89ee3f3f088`; Pillow `verify()` succeeds,512×512RGBA, alpha extrema0–255,138765fully transparent pixels. Reviewer viewed the actual tile and observed EDDF/EDFE aviation content. This is not exhaustive source/geography validation. |

The transparent aero product can therefore overlay an independent basemap
without preprocessing or opaque-base substitution. The logical256tile declaration
preserves geographic zoom placement while receiving512retina pixels. The private
same-origin proxy does not derive geometry from pixels, create navaids or
install charts into native guidance.

The [About](https://openflightmaps.org/about/) and
[FAQ](https://openflightmaps.org/faq/) summaries provide the database-use grant,
attribution/error-reporting obligations and the distinction between database and
separately protected rendered/plate products. The previous full GUL PDF URL still
returned404 during this review; an indexed cache was not substituted for fresh
full-contract retrieval. The documented third-party tile interface and current
publisher plugin support the scoped opt-in streaming prototype interpretation.
This review **does not** accept permanent offline chart packaging, unrestricted
rendered-product redistribution, source certification, a provider SLA or a
complete current procedure database. The unresolved broader product/license
review stays separately tracked; no chart pixels or bulk OFMX package are bundled.
The explicit mailto error-report link is user-driven; the agent/app does not
submit a report automatically.

## Code and security observations

- The provider route accepts one cycle and canonical zoom7–13/XYZ paths. Queries,
  negative/zero-padded/out-of-range coordinates, arbitrary cycle aliases, methods
  and foreign URLs are rejected. Incoming authorization/cookies/headers do not
  flow upstream; the fixed HTTPS fetch rejects redirects and omits credentials.
- Metadata is fixed and strictly compared on the client, with16KiB bounded
  UTF-8 reads, fixed provider/source/report links and no successful-failure cache.
  It cannot introduce an arbitrary host, cycle alias, JavaScript link or larger
  resource limit. Source strings render as text; MapLibre attribution escapes
  HTML-significant characters.
- PNG transport bounds declared and streamed size at1MiB, requires image/png,
  expected signature/IHDR,512×512RGBA8 and a terminal IEND marker. It performs
  structural admission rather than complete PNG decompression/CRC verification;
  the browser's image decoder still determines image rendering success. Native
  source decoding was independently checked for the inspected real tile.
- Memory cache has8MiB/64entry bounds and1h expiry, keys cannot mix cycles, and
  duplicate downstream consumers share one source job. Four active source slots
  and32total pending identities bound work (there can be at most28queued behind
  those four active identities). Source failures have a bounded30s cooldown;
  user cancellation does not poison the next enable as a source failure.
- Removing the last subscriber aborts active/queued source work; one departing
  shared waiter leaves another consumer alive. Dispose aborts all pending tasks,
  clears owned cache/failure state, and is idempotent. Queued admission is outside
  the15s active-upstream timeout in the initial snapshot; the wording point below
  must remain explicit rather than claiming a15s total queue-plus-network bound.
- Controller generations and AbortController ownership reject late metadata after
  Off/hidden/disposal. Sources/layers are removed when unavailable by selection,
  and style reload recreates one layer in the established foreground order.
  Opacity changes only raster paint. The source native maxzoom is retained while
  the layer can overzoom rather than disappearing at closer map scales.
- The OFM source sits above imagery/base and below source fixes, plan/GPS/path
  and navigation points; aircraft and named markers remain separate. The small
  practice-map error guard isolates OFM source errors from the ordinary map's
  failure flag. The controller has no radio/AP/session/physics interface.
- Preferences save only enabled/opacity in a strict128byte versioned record,
  default off/0.8, with finite0–1 opacity and denied/corrupt-storage fallback.
  No position, route, selected station, flight state or credential is persisted.
- Accessible fieldset/labels, range/output, polite status, provenance and explicit
  Retry/source/terms/report controls fit the existing scrolling map menu. No
  source script execution, account, dependency or automatic external message
  path is introduced.

## Initial returned points

These are bounded review observations, not unverified critical risks:

1. **Low — publication-status presentation** (`ofm-map-overlay.ts`, initial
   `render`). Valid dates produced no explicit in-validity label; only EXPIRED
   or NOT YET VALID was shown. R-CHART-1 requests current/expired/upcoming status.
   Returned recommendation: add an explicit within-published-validity indication,
   without claiming actual operational currency.
2. **Low — native zoom presentation** (same provenance text). The source max13
   was not exposed; only a below7 message mentioned the lower zoom. Returned
   recommendation: display native7–13 range and explain closer overzoom.
3. **Wording clarification — timing/queue scope.** The initial implementation's
  15s timeout starts after source-slot acquisition, so queued time is additional.
   A15s total request deadline would need to begin at task creation; an intended
   active-upstream budget should be named as such. Likewise32total pending is
   stricter than32queued and should not be described as an exact32queue capacity.

## Checks actually run so far

Reviewer independently ran in the working app:

```
node --test ofm-overlay-server.test.ts src/ofm-overlay-source.test.ts src/ofm-overlay-preferences.test.ts src/ofm-map-overlay.test.ts
```

**12 passed,0failed,0skipped.** These exercise fixed routes, failure/cooldown,
size/schema safety, concurrency/duplicate/cache bounds, cancellation/disposal,
controller ordering/lifecycle/retry/opacity and preference boundaries. They are
pure/fake-map/server-fixture checks, not evidence of actual MapLibre pixels or
native-flight isolation. The real source PNG/XML/plugin observations above were
independent artifact inspections; no fresh provider request or complete service
availability test was performed by this reviewer.

Initial source pins before any returned presentation/timing repair:

| Path | SHA-256 |
| --- | --- |
| `app/ofm-overlay-server.ts` | `b8c29dc7d95549086cb7c03086dff5c7512edade75a28422527de209d55c68b2` |
| `app/src/ofm-overlay-source.ts` | `9b47d08b570dbd25022338dd1d803cf39fc0f19f9677fb5a8973da3ccba55c64` |
| `app/src/ofm-map-overlay.ts` | `6a0b737e1c07fc4a15d62f39ddc5b1492e5f72d94912c93414f25a010720d38f` |
| `app/src/ofm-overlay-preferences.ts` | `12327038830ec8690be14ffe69449d56067f04fc83323dbe7e4b7fef1fd51193` |

Final browser, publication-source pins, current integration gate and affected
renewal remain pending at this initial inspection. Independent specification
validation and external cross-provider peer are separate; embedded WebKit and
training/current-service fidelity are not accepted here.


## 2026-11-06 16:48 — Affected deadline/status renewal

The author repaired the returned points before the final runtime freeze. The
reviewer independently inspected the changes and reran the same focused command:
**13passed,0failed,0skipped**. The additional deterministic timer regression
covers queued wait, active fetch, shared consumers and a hanging response body.

- One15s timer now starts at shared-task creation and covers queue plus fetch/
  body work. A later shared waiter cannot extend it. Both pre-fetch and post-body
  monotonic-time checks prevent a delayed timer callback from admitting work or
  caching a late response. Cancellation/disposal/settlement clear the timer.
  The old upstream-only timing observation is historical and resolved.
- Controller provenance explicitly displays WITHIN PUBLISHED VALIDITY, EXPIRED,
  NOT YET VALID or unknown status, and native7–13 zoom with closer overzoom.
  The two low presentation points are resolved. Existing loaded/content readiness
  and optional-failure distinction remain intact.

Current affected source pins:

| Path | SHA-256 |
| --- | --- |
| `app/ofm-overlay-server.ts` | `1f907917b1c475cd6f216f9f2939386ccb7ed27cdaa1426dea43901025588717` |
| `app/src/ofm-map-overlay.ts` | `4fee0d96c61c805c2547a3ee72b2760d4d10df0f89c5696c09735608cc5c8791` |
| `app/src/ofm-map-overlay.test.ts` | `79ff218e74a9346e2a311b6bdbcf02332bf7964e65d56cdb779e6f50d8a27eb9` |

No blocking finding remains in the inspected implementation. Browser, publication
source pins and completed integration CI remain pending; none is inferred from
the pure tests. This renewal does not add broader rendered-product redistribution
or complete-license acceptance.

Reviewer additionally recomputed the four current runtime module hashes in the
publication checkout; server/source/controller/preferences all match the root
pins above. Source integration files keep their distinct parent surroundings and
will be checked against each final browser artifact. `just check` passes554
Markdown files; its scope is structural links/routing, not source or browser
acceptance.

## 2026-11-06 16:51 — Actual MapLibre event and live-proxy inspection

The first actual-browser attempt found a readiness mismatch: the controller
expected a `content` subtype on a tile-completion event. Reviewer independently
read pinned MapLibre6 source: `tile/tile_manager.ts:333` emits a data event with
`tile`/`coord` and no subtype; `style/style.ts:1101` supplies source identity and
loaded state while bubbling. Metadata/content source announcements can precede
raster responses. The revised controller accepts a tile-bearing completion or
an idle event while continuing to ignore metadata-only readiness. This matches
the pinned library and does not relax the optional-source failure boundary.

Reviewer independently reran controller/preferences: **5passed,0failed**. A small
regression-test improvement was requested: make the positive ready case omit
`sourceDataType`, matching the actual reported bug; the earlier unit case still
included `content` and would not alone detect the original implementation error.
Browser acceptance remains pending until the renewed runtime run completes.

Inspected `output/flight/ofm-overlay-live-proxy.json` (SHA-256
`b1e2d2bd832c5c4c0b23a541c050dd5ca294b8fe5e213f3a593f2da044b769a1`)
and independently checked its two source hashes against current server/source
files. It records a passing real fixed-source Frankfurt tile,75747bytes,
512×512RGBA, hash `e9480c…f3f088` as independently inspected above. Metadata made
no provider request; a repeated tile used one total upstream request, supporting
the actual proxy validation/cache path. This is one-region/one-tile evidence,
not a full map-browser run or global service acceptance. No source pixels were
copied into tracked project assets by the reviewer.

The intentionally failed initial browser observation is historical; it is not
silently replaced with a pass. A complete final ROOT/publication browser pair,
current source pins and final CI are still required for the integration outcome.

## 2026-11-06 16:56 — Style-order and regression-test renewal

Independent validation found that a host could register its foreground anchor in
a later `style.load` listener. The author now defers refresh to a microtask,
checking the controller's disposed state and generation again before touching
MapLibre. Reviewer independently inspected the changed callback and new test:
all synchronous host style listeners finish before insertion, while hide/disable/
dispose invalidates queued work. Existing source/pending checks prevent duplicate
source/layer creation.

Reviewer independently reran current controller/preferences: **6passed,0failed**.
The new late-anchor test reproduces the event-order condition; the positive
readiness case now uses a loaded tile with no `sourceDataType`, directly pinning
the actual MapLibre6 completion shape. The earlier requested unit improvement is
resolved.

Independently recomputed ROOT and publication bytes; both match:

| Path | SHA-256 |
| --- | --- |
| `app/src/ofm-map-overlay.ts` | `9b4b2ee197d4e19ef45d979bf7a07d67b197af50e2e5ccaeb92ebfc58436cebc` |
| `app/src/ofm-map-overlay.test.ts` | `83b989cffb944e33d6bd52394b61dbcb53ae2dbafdb139768c41d0f44b359cb4` |

The supplied diagnostic browser attempt identified repeated `world-map` PBF
parse errors from fixture PNG responses, separate from correctly identified OFM
503 events. This is a harness preparation fault, not a basis for weakening the
base-map-availability assertion or accepting that failed run. The fixture was
corrected before renewed browser execution. Initial attempts and their failed
observations remain historical; final ROOT/publication browser results must use
the frozen current controller and corrected harness.

**No blocking quality finding remains in the inspected source.** Runtime/browser
and final affected app/TypeScript gate renewal remain pending. Source proxy and
metadata files did not change in this renewal. The initial full CI's passed
results do not silently accept the newer controller; the integration owner is
renewing affected application checks after the repair.

## 2026-11-06 17:06 — Working-app browser and portability renewal

Reviewer independently read the final working-app browser artifact
`output/flight/ofm-overlay-browser.json`, SHA-256
`189eeddcdeb00e6bb039b3104ed6f4a490a555237d0a60751fb38e73ae5e46b6`:
**pass,5check groups,0page errors and0MapLibre errors**. Recomputed all seven
recorded application/harness pins against the current source; all match.
The initial status/API/fixture failures are historical and not counted as passes.

The final harness reads its pre-overlay GeoJSON foreground layers, first requires
core fixes/GPS/path/NAV layers to exist, and then asserts **every** such existing
layer remains above OFM and survives optional source failure. This is stronger
than checking only a selected subset. `planScope:true` in the working app records
its actual ordered-plan layers (13foreground layers total); the clean-main
publication has no ordered-plan feature and must record that narrower scope
rather than adding a dummy plan or pretending it tested one. Present foreground
features are not exempted from ordering or survival assertions.

The observed groups cover default-off/closed no demand, actual MapLibre raster
pixel change, source/date/credit/report controls, layer order, opacity/persistence,
new viewed-area requests, native zoom/overzoom, style reload, Off/hidden/late
metadata cancellation, optional error/base-map isolation and Retry, invalid/denied
storage, and paused native step/digest/final-state isolation. The screenshot was
visually inspected as a synthetic-pixel integration artifact; it is not an actual
OFM geography or current-service acceptance. The separate live-proxy tile
observation above remains the actual selected-provider transport evidence.

Inspected affected publication application rerun
`output-ofm-app-renewal.log`: **564Node tests and22application Python tests pass**
after the style repair. The earlier full shared CI passed563Node/22Python/
85assurance/11training before this localized repair/new test and remains historical;
it is not silently relabeled as the newer564-case run. Foundation/tooling/server
behavior did not change in the localized controller renewal.

Publication browser and any live-browser extension remain pending at this point;
working-app evidence does not substitute for the final publication context.

## 2026-11-06 17:07 — Final bounded quality outcome

**No blocking quality findings remain for Task2.0.179's opt-in streaming overlay.**
This outcome covers the inspected code/security/numerical/resource behavior and
source applicability described here; it is separate from independent specification
validation and external-provider peer review.

Reviewer independently read the final publication browser artifact
`/private/tmp/gefly-ofm-overlay/output/flight/ofm-overlay-browser.json`, SHA-256
`072fb1601c52c7e830d721410cf71db50278f1788d8394d7bbda1392fb1b4e9e`:
**pass,5groups,0page errors,0MapLibre errors**. Recomputed every one of its seven
source/harness hashes against that checkout; all match. The final harness bytes
are the same in working-app and publication contexts:
`57c45d5925d070f2fccc9b3ab4cb36a9e74cca84275332efdcf2e5dff59d5cea`.

Publication `planScope:false` correctly identifies its absent ordered-plan feature,
while asserting all10existing GeoJSON foreground layers and required core layers
remain above the chart and survive failure. The working app separately has
`planScope:true` and13foreground layers. The test does not backport an unfinished
plan feature, manufacture a placeholder or exempt a feature that actually exists.
Both contexts observe raster pixel changes and the retained native/base-map/error/
lifecycle/persistence behavior; the live fixed-source proxy supplies the separate
positive actual-provider bytes and cache observation.

The reviewer independently executed the focused12-case initial run,13-case
deadline renewal and6-case final controller/preferences renewal, with no failures
in those reported runs. Current affected source pins match ROOT/publication;
raw provider XML/PNG/plugin observations and integration results are distinguished
from these fixture tests. Inspected initial full shared CI and later affected
application rerun support their explicitly recorded revisions/counts; the final
assurance check/diff remains the integration owner's responsibility.

Remaining limits: fixture browser pixels do not establish worldwide chart content
or provider uptime; the live proxy evidence is one Frankfurt-area tile. This
review does not accept unrestricted rendered-product/offline redistribution while
the complete GUL/product review remains unresolved, nor surveyed/current service,
procedure or training fidelity. Embedded WebKit, real hidden-tab behavior and
external cross-provider peer were not independently executed here. An optional
later live-browser observation can add bounded evidence without being inferred
from, or required to reinterpret, the passing fixture/source-proxy checks above.

## 2026-11-06 17:15 — Real-provider PNG format and source-level renewal

A later bounded live-browser/source probe found an actual coverage-format gap,
not a fixture failure: selected2611 Egelsbach zoom13 responses were valid empty
**grayscale+alpha** PNGs, which the initial RGBA-only admission rejected. The
publisher's zoom12 parent contains chart pixels. Previous one-tile zoom9 transport
and fixture-browser outcomes remain historical and scoped to those bytes; they
are not represented as acceptance of this newly observed provider case.

Reviewer independently ran Pillow verification and raw-byte SHA-256 checks:

| Actual provider artifact | Independent result |
| --- | --- |
| `/tmp/gefly-ofm-z13.png`, tile13/4292/2779 |1233bytes,512×512LA/PNG color type4, alpha0–0, all262144pixels transparent; SHA-256 `30dc195c8a72a0b58d22208aefdb7b1b01cb3bbc40213d1cd987fe6f8f4d58c1`. |
| `/tmp/gefly-ofm-z13-neighbor.png`, tile13/4293/2779 | Same bytes/hash/dimensions/color/transparent count as the preceding selected tile. |
| `/tmp/gefly-ofm-z12-parent.png`, tile12/2146/1389 |49789bytes,512×512RGBA/PNG color type6, alpha40–255 and no fully transparent pixels; SHA-256 `0d95532418a254559f88f8f467ad04240fb1da681c6354b5d4fdb1cf201ad7c6`. |

The repaired guard permits only the two observed8-bit alpha-preserving PNG
formats4and6, with unchanged512px bounds, MIME/signature/IHDR/IEND checks,
stream/byte limits, fixed provider path and absolute request deadline. The new
valid generated grayscale-alpha fixture is accepted; unsupported0/2/3 color
forms remain rejected. Empty transparent coverage is no longer mislabeled as a
transport failure. No pixel conversion, chroma-key removal or fabricated chart
content is introduced.

Selected client metadata now uses native maxzoom12 and MapLibre overzoom above12.
The source comment and revised scope explicitly ground this conservative product
policy in the reviewed Egelsbach responses; neither reviewer nor implementation
claims that **all** publisher zoom13 tiles are empty. The proxy's canonical API
range still permits the documented13level, including the observed valid empty
responses, while ordinary client demand uses the selected12cap. Original cycle,
publication dates, attribution, opacity and source identity controls remain.

Reviewer independently reran server/source tests: **9passed,0failed,0skipped**.
Affected ROOT pins match the author's final freeze:

| Path | SHA-256 |
| --- | --- |
| `app/ofm-overlay-server.ts` | `eb7001479da77e2c6fbbdf789af570b12811fb1ab0cf200dbbf8f60d5d3c28e1` |
| `app/src/ofm-overlay-source.ts` | `3c27997fbf945bbc95d81f8459b1bb47ce09a6fb5576741cb423f0e8753ab20e` |

**The affected source repair has no blocking quality finding.** Publication files
were still awaiting the orchestrator's copy at this inspection point; fresh ROOT/
publication fixture runs and the new-source live-browser observation must renew
runtime acceptance. Previous final browser pins and the earlier integration
counts are preserved as historical, not silently promoted to these changed bytes.

## 2026-11-06 17:22 — Final new-source runtime and live-chart renewal

**No blocking quality findings remain for the repaired Task2.0.179 source and
integration.** This renewal supersedes the pending new-source runtime outcome in
the17:15 entry; all earlier source/fixture/live failures remain historical.

Reviewer independently recomputed all seven application/harness pins for each
current artifact and compared them to its actual working-app/publication files.
All21comparisons match. All three artifacts report pass with zero page errors
and zero MapLibre errors:

| Context / artifact | Result | SHA-256 |
| --- | --- | --- |
| Working-app fixture browser |5groups; ordered-plan scope present | `d619a03252e378fc202129abaa0fd13aca1f896f46e309eec338666765f3759a` |
| Publication fixture browser |5groups; absent ordered-plan scope explicit | `e14a5992d29c70ec533fe730754bbee6a7bb0aa183043a5c2bc85e2377ec9a77` |
| Working-app actual-publisher browser |1bounded real-chart group | `174cec49e6cefa9f94a6c94b297242d02a86cc59b9b06915e76e910fff92f901` |

The final identical browser harness SHA-256 in both checkouts is
`266e38092b361a9e56c30b83db171554e8b57b02f882f29ed5d13f7016905f88`.
Server/source/controller pins are respectively `eb700147…`, `3c27997f…` and
`9b4b2ee1…` as recorded above; no unrelated controller rewrite is implied.

The actual-publisher run records two successful512×512RGBA zoom12 responses,
49789and16357bytes. Their hashes are `0d955324…` (the independently verified
parent above) and `bdfea65882aae1f164a7772254dba8a06460e4b97cda7984d2db05bf60236825`.
There are no zoom13tile requests under the selected max12policy. Reviewer
independently viewed the local `ofm-overlay-live.png`: genuine Egelsbach aviation
content, airport symbol, name and radio-frequency label are visibly rendered,
rather than the synthetic grid. The close view is overzoomed raster content,
not newly generated high-resolution detail; the UI's native-range/overzoom
qualification is material. This is one bounded Germany view, not global content,
complete current service, procedure or renderer-performance acceptance.

The renewed actual proxy artifact SHA-256 is
`badba4a13daf25caa5f49bcff67b9b6618239156919a8acccc9a1c4f11bc217c`.
Reviewer checked its current two source pins and observed parent12tile hash,
metadata-without-provider-demand and one-upstream-call cache reuse. Additionally,
reviewer replayed both original raw provider PNG files through the actual repaired
middleware with an injected response (no new network request): grayscale-alpha
empty1233byte and RGBA parent49789byte responses both returned200 with exactly
unchanged source hashes. This directly checks that the real observed bytes pass
the repaired admission guard; it does not claim another live upstream execution.

Reviewer inspected `output-ofm-app-final.log`: **565Node and22application Python
cases pass** after the format/cap repair. Prior563/564counts and full shared
85assurance/11training results remain attached to their historical revisions.
The final localized source/UI reviewer coverage consists of the9source/server
and6controller/preferences tests independently passed in their affected renewals.
Final TypeScript status and assurance check/diff are recorded by the integration
owner; no skipped or unobserved gate is inferred to pass here.

The new source is accepted only for the scoped opt-in visual streaming prototype.
Broader full-license/product redistribution review, permanent offline chart
packaging, embedded WebKit, complete coverage/current operational accuracy and
cross-provider peer remain outside this quality acceptance. Live screenshot/chart
pixels stay local generated artifacts and are not bundled as project assets.

## 2026-11-06 17:39 — Merge-resolution quality renewal

Reviewed the conflict resolution in publication merge
`f4c16e4ab3a80c05bef8e1ad6b75adcbbdcb3736`, with parents OFM
`1332e41246b061a5ce70e5025aa4bad48a2000de` and newly advanced main
`446293af00423a6af3f1e4102a05804202ff207c` (on-demand airport generation).
This section reviews integration preservation, not independent acceptance of all
inherited airport-generation or terrain-worker implementation/fidelity claims.

**No blocking merge-resolution finding.** Inspected the seven conflicted files
(package/Vite/ARCH/GAPS/SBOM/SEC/TODO) against both parents and checked the other
shared-record integration. No source or requirement edits were made by reviewer.

- The merged `app/package.json` parses. Incoming main had a missing comma after
  `test:airport-generator`; reviewer confirmed that inherited parse failure and
  repaired only an in-memory comparison copy to enumerate expected scripts.
  A programmatic script inventory confirms every script key and every command
  component from both parents is retained. The77Node test-file arguments retain
  the union, Python tail commands remain, both dedicated OFM/airport browser
  scripts exist, and dependency/devDependency objects are unchanged from both.
  This is source/inventory evidence, not a claim all those browser commands ran.
- Both development and preview configurations retain one OFM middleware and one
  airport-region middleware, each with its owned close/dispose hook. Existing
  hashed assets/Copernicus/scenery/runtime setup remains. The prefixes and owned
  instances stay separate; the merge does not route airport requests through the
  OFM cache or vice versa.
- Recomputed final OFM module and map bytes against the OFM parent: server,
  source metadata, overlay controller, preferences and `practice-map.ts` are
  exactly unchanged. The Vite integration changed and therefore needs a renewed
  browser source pin. Current Vite SHA-256 is
  `822b1dceacff039a4007a12bea65f784f1d7d101c6313e42f2e646e41078c9f7`;
  package SHA-256 is
  `2dea3d69aa5618511e25ddaac53bb040c37bb71d28ae62e85e56cac32c4ffdcc`.
- Used the repository's fence-aware sorted-log parser to compare complete DONE
  entries: both parents'181entries survive without a missing or changed
  normalized entry. The input index preserves all140OFM-parent and141incoming
  link targets; the inherited empty bullet's trailing whitespace was removed
  without removing a linked input record. No conflict markers remain in the
  inspected shared files.
- All nonblank incoming lines in ARCH/GAPS/SBOM/SEC remain. OFM sections are also
  preserved. TODO retains the delivered179scope and the explicit separate85.1
  broader license/product review, while168now calls the old assessment historical
  rather than retaining an obsolete current 'unselected edition' condition.
  Dated earlier GAPS answers remain history beneath the newer OFM decision.

Inspected merged CI log at this point:606Node application and22application
Python tests have passed, with assurance/training stages observed; terminal
shared-CI status, TypeScript and renewed publication browser are still pending.
The preceding final source/browser/live-provider observations remain historical
for their source pins and are not silently promoted to the changed Vite merge.
The orchestrator is renewing those affected integration checks before publication.
Final assurance/diff and external peer remain separate integration responsibilities.

## 2026-11-06 17:54 — Final merged evidence renewal

The publication merge remains `f4c16e4ab3a80c05bef8e1ad6b75adcbbdcb3736`.
Independently inspected the renewed publication browser artifact, SHA-256
`728aeded25d89d7c0628f32a66d4a14d97083d2a45c7e0cab8fdf233a63337a4`:
five groups pass, no page or MapLibre errors, all seven recorded hashes match
current publication source, including merged Vite `822b1dce…`.
Its explicit `planScope:false` retains the main checkout's actual capabilities;
all baseline GeoJSON foreground still participates in order/preservation checks.
The prior ROOT fixture `d619a032…` and real-provider observation `174cec49…`
remain byte-identical, with all seven pins matching their respective working-app
source. They are supporting scoped observations, not a newly executed merged
publication live-provider run.

Inspected `output-ofm-merged-ci-final.log`: terminal shared CI passes for executed
checks, including606 application Node,22 application Python,85 assurance,
11 training and25 C172S-data tests. Offline tools executed242 of243 with one
Linux-only skip; JSBSim study executed14 of23 with nine unavailable-package
skips. Those ten skipped checks are not passes. The earlier
`output-ofm-merged-ci.log` retains its CLI-child timeout failure under concurrent
load; the subsequent complete CI renewal passes, including that affected CLI
suite. Integration owner separately reports merged TypeScript exit0 (session25531);
reviewer did not relaunch it or infer a pass from an empty log.

**No blocking quality finding remains for the merged opt-in visual overlay.**
Final assurance check/diff after copying records and publication remain the
orchestrator's integration steps. Broader product/redistribution rights, offline
packaging, source completeness/current operational accuracy, embedded WebKit and
cross-provider peer remain limited exactly as recorded above.
