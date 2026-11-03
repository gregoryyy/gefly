# Right-side flight map: independent quality and validation

Reviewer: Codex subagent `flight_map_quality`, 2026-11-03, Europe/Berlin.
Base: `827ca20e3d32ebdec19cc8682549aba0013afc67`; reviewed integrated working
tree on `feat/right-flight-map`. The reviewer did not author the implementation,
assets, builders or maintained tests. Its separately assigned research-note
extension is excluded from independent self-acceptance. Cross-provider peer is
**pending**; this same-provider review does not satisfy that gate.

## Quality outcome and findings

Quality: **no blocking findings after repairs**. Specification validation:
**pass for the exercised R-WORLD-6 increment**, with the limits below.
The earlier
103-airport/86-station review is superseded for this increment.

1. **Low, maintained-test regression, resolved.**
   `app/tests/overlay-presentation.browser.mjs` expected only `Alt+Shift+M`
   after the menu gained plain M. The orchestrator changed the expectation to
   `M Alt+Shift+M`; the independent actual-browser rerun passes.
2. **Medium, initial raster dependency, resolved and independently renewed.**
   `app/src/practice-map.ts` initially initialized local overlays only after
   MapLibre `load`, which can wait for initial remote tiles. The orchestrator's
   real-source screenshot exposed a blank/loading panel. Initialization now
   uses `style.load`. Independent actual-app checks pass with cold
   503 and unresolved raster requests; it does not infer acceptance from the
   earlier tests that failed a tile only after successful initial loading.
3. **Low, documentation placement, resolved.** The map security paragraph now
   has its own heading rather than sitting under the autopilot/rate section.

The independent ad hoc observer initially failed on map-reference timing, then
on CSS angle precision: true heading 81.860273817° serialized as
`rotateZ(81.8603deg)`. The observer was corrected to wait for the actual marker
and compare the four-decimal CSS representation within 0.0001°. Neither failure
established an aircraft-orientation defect. A later unavailable-airport check
needed to open its collapsed directory before requiring visible status text.
These observer repairs changed no product code or acceptance requirement.

## Source, units and security inspection

Independently SHA-256 checked the full pinned OurAirports airport CSV, navaid CSV
and original pre-calibration NAV810 gzip. Hashes match their manifests:

| Source | SHA-256 |
| --- | --- |
| OurAirports airports | `6852f06007ec1154256faff98edb8bbfbbce93fdb279525940864f07e9d90b32` |
| OurAirports navaids | `d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1` |
| Original NAV810 gzip | `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839` |

An independent Python source comparison, without importing the builders or
their parser, selected all five airport regions and compared every output
identifier, name, type, ICAO/local code, region, coordinate and optional elevation.
All **731** match: BW 200, BY 314, HE 126, RP 81, SL 10. Heliports and all 41
source-closed records are retained. No complete list of operating facilities is
inferred from a community snapshot.

The same comparison independently selected all German OurAirports beacons in
6–14°E / 47–51.75°N and matched all **144** identities, positions, types, names,
associated airports, frequencies and optional metre-converted elevations. NDB
labels retain kHz. This is a rectangle with adjoining-state context, not exact
five-state beacon membership. Independently selected all **66** German ED/ET
NAV810 type-4/5 parents in that rectangle, matched their original line identities
and verified every historical feature against its original source rows, including
coordinates, feet-to-metres elevation and frequency. There are **210 stations,
61 separate GS and six separate DME points**, 277 finite points total. Component
rows match their parent identifier/airport/runway/frequency. These checks verify
the declared source transformation, not the source's real-world accuracy.

Reviewed fixed same-origin fetch paths, redirect rejection, byte limits,
15-second timeout/cancellation, hash and geometry checks, source/date identities,
unique IDs and parent/component checks. Source strings enter `textContent`;
only static repository-controlled credits use HTML. Manifest citation URLs never
become fetch destinations. New map data does not enter the radio receiver,
autopilot or worker; historical and snapshot status are separately visible.
Circle layers retain filtered source points while nearby DOM labels are capped
at 80 per layer and directory results at 100. Map refresh/history remain bounded.
No new glyph service, geolocation, persistence or learner telemetry was added.

The existing fixed-upstream proxy's map bounds expand to the declared rectangle;
photography and physical DEM coverage stay unchanged. Source allowlists, finite
XYZ parsing, request/cache/concurrency bounds remain in place. This localhost
developer transport is not acceptance of public deployment abuse protection.

## Independently executed evidence

| Check | Observed result |
| --- | --- |
| `node --test app/src/flight-map-catalogue.test.ts app/src/flight-map-navigation.test.ts app/src/airport-catalogue.test.ts app/src/practice-map-data.test.ts` | **16 pass**, zero failures/skips. Covers source/hash/scope/geometry/provenance/units/duplicates/orphans, network/oversize/cancel failures and detached plotting. |
| Full source-byte/selection/field comparison described above | **Pass** for all 731 airports and 277 map-navigation points. All declared source hashes match; output coordinates finite. |
| `node app/tests/right-flight-map.browser.mjs` | **Pass**, actual Chrome 156.0.8078.80 and JSBSim: eight groups for guarded M/menu/modal/typing, nautical scale, desktop dock/full-width cockpit, actual trail, Follow/pan/Fit/native invariance, Map/Aerial/NAV, post-load tile503, Review, narrow layout and one-canvas reopen. This run began before the subsequent lifecycle-only repair. |
| `node app/tests/airport-map.browser.mjs` | **Pass**, actual Chrome: 731 GeoJSON points; bounded DOM; all/airfield/heliport/closed filters; city/state coverage; glider/closed/unknown-elevation searches; pan and 390 px layout. |
| `node app/tests/overlay-presentation.browser.mjs` | **Pass**, actual Chrome: legacy overlay activation, corrected shortcut marking and integrated flight/map keyboard isolation. |
| Independent actual-app optional-source/cold-tile cases, `/tmp/gefly-map-failures.mjs` | **Four cases pass after lifecycle repair**: NAV503 retains 731 airport points; airport503 retains 277 NAV points; initial map503 and unresolved map requests retain all 731+277 points. Each keeps the actual aircraft and 90+ recorded path points, correct Follow position and true-heading rotation, unchanged paused native step/digest/final state, zero page errors and no external browser destination. Tile requests in the held case remain unresolved until after local overlay assertions. Only background pixels and explicit HTTP failure/held responses are fixtures. |

Shared CI, build, proxy tests, assurance and publication are orchestrator-owned
evidence, not commands claimed as independently executed by this reviewer.
Browser fixtures establish interaction and failure behavior, not upstream
cartographic pixels, exhaustive coverage, positional fidelity or image currency.
The first successful NAV503 case preceded an observer timeout caused by the
collapsed airport directory; after correcting that visibility check, airport503
and both cold-tile cases completed together with native steps 182,183,184 and
93,94,95 retained path points respectively. These are separate executions,
not a claim that the earlier unsuccessful harness command exited successfully.

## Specification validation matrix

| R-WORLD-6 criterion | Expected and observed evidence | Outcome |
| --- | --- | --- |
| M / Alt+Shift+M / View command, guards | Actual browser opens/closes from scene and map focus; typing, modifiers/repeat, menus and modal dialogs do not toggle unexpectedly. | **Pass** |
| Desktop split and narrow reachability | Separate map/3D bounds, full-width cockpit, visible menu clearance, 390 px bounded panel and one-canvas reopen. | **Pass** |
| Default public map, Aerial, credits, nautical scale | Actual toggle/source visibility and nm scale; inspected linked provider/license/source credits and distinct coverage limitation. | **Pass** for interaction and inspected credit content; upstream availability not guaranteed |
| Actual position/true heading/contrasting retained path | Captured worker samples drive the line and marker; Follow position agrees, path grows, dark-cased cyan line is source-inspected. | **Pass** within exercised flight |
| Follow, pan/zoom/Fit without moving aircraft | Actual paused native step/digest/final state invariant across maintained browser interactions. | **Pass** |
| Review selected marker plus whole retained path | Actual browser enters/exits Review and retains whole recorded line with recorded-mode label; worker stays paused. | **Pass** for exercised retained history |
| All five-state source airfields, types/state search/elevation | Full-source exact comparison; 731 points, closed/heliport/type/search/missing-elevation browser checks; state code participates in search. | **Pass** against pinned community source |
| NAV envelope, components, dates/units/source separation | Full-source identity/coordinate/frequency comparison; 144 snapshot +66 historical parents,61GS/6DME; loader and DOM/GPU behavior inspected/exercised. | **Pass** against declared sources |
| NAV/layer choices never tune receivers/change physics | Read-only map call graph; actual paused native invariance during toggles. | **Pass** for inspected/exercised behavior |
| Optional source failures independent, status explicit | Four independent actual-app cases above; unavailable NAV/tile statuses are visible, unavailable airport status is reachable by opening its directory; local path and unaffected inventories remain usable. Required startup radio data stays separate. | **Pass**, including cold/held tile lifecycle repair |
| No current-chart/airspace/NOTAM/procedure or expanded physics claim | Inspected visible caption, separate dates, source details, manifests, README/ARCH/SEC boundaries. | **Pass** for inspected disclosures |
| Aircraft fidelity, training approval, source operational accuracy, complete official facilities/procedures | Outside this scoped increment. | **Not evaluated** |

## Frozen implementation scope

Independently re-hashed all 24 paths in the orchestrator's sorted
`path + NUL + SHA-256 + newline` packet, including `style.load` and the proxy-test
name correction. Packet SHA-256:
`b840f38479d7c2d452878e046f893ca350a071f7e9e3c00db341f0592ae80849`.
The packet covers map loaders/converter/builders/assets, main/shortcuts, CSS,
scenery proxy and the two changed map browser suites. Review prose and changing
shared documentation are outside that runtime packet. A changed covered byte
invalidates its affected acceptance until renewed. This is a bounded product
increment, not milestone/release or cross-provider acceptance.

Final staging exposed CRLF serialization in the newly added source CSV; the
earlier unstaged whitespace check did not cover that untracked file. The
orchestrator set the builder's CSV `lineterminator` to LF and regenerated that
excerpt. The reviewer independently confirmed LF-only bytes, all 144 parsed
rows/fields exactly equal the pinned source selection, and a fresh temporary
rebuild reproduces all five generated files byte-for-byte. Runtime NAV JSON is
unchanged at SHA-256
`f485303ecf944d874a7cc7154a6ff0aa0f3de75c9c305372a9bd34bf1d2439d5`.
All 24 final packet entries were independently re-hashed. This bounded newline
repair renews source-generation acceptance; it changes no browser/runtime
behavior. The earlier packet
`5e9b6e6371feb8e96a0dea1f397ce03fb3a7a360aa3fe2d8097ba853773a3562`
is retained only as historical pre-repair identity.

Supplementary inspected integration files outside that 24-path packet:

| Artifact | SHA-256 |
| --- | --- |
| `app/package.json` | `039f31e3ca67a76e3b57ed651b76cf67e21f7b50d26a82a4f0376304d79f49b9` |
| `app/tests/fov-smoke.mjs` | `9ded57faa1a14aa56a99ebc6050c28c648c93d475baba79c5d39625aaed077b7` |
| `app/tests/smoke.mjs` | `6390410dcbe669ff7cf5e13805e2ae36a893a23484a6f5ddb3576954a25518d4` |
| `app/tests/overlay-presentation.browser.mjs` | `5cfe7b9a8896347ed95e48bf5cd60f12d7be90b419bf1f8d268fcfe8987c2e11` |

The two smoke-test changes are accessible-label updates inspected in source;
their full broad suites were not independently executed in this review. The
affected new label is exercised by the current map browser. Final shared
documentation, actual-source screenshot and publication checks remain with the
orchestrator; no review of an unseen final screenshot is implied here.
