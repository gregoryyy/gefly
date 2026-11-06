# Map fix visibility and saved location filters

Task 2.0.175 housekeeping handoff, 2026-11-06. This is a source-only inventory
and proposed integration checklist for [R-WORLD-6 and R-NAV-5](../SPEC.md).
It does not amend those requirements or accept runtime behavior. The working
tree contains concurrent implementation edits; line numbers below identify the
text inspected during this task, rather than an immutable revision.

## Delivered behavior and evidence

The working app's extra historical-marker switch is removed. The single
**Fixes** checkbox now controls published fix markers and search results
together. Published main already drew those fixes; its feature increment adds
the shared restored category state and a regression against the visible source.
Existing all-seven-on defaults, the historical source label, zoom-dependent
point rendering and the40 nearby DOM-label cap are preserved. No GPS fix is
created by displaying the catalogue.

All seven category choices now save immediately in
`gefly.map-location-preferences.v1`, separately from other preferences. The
strict512-byte record accepts only version1 and a canonical array of known,
unique category tokens. An empty array preserves all-off. Corrupt, future,
oversized or denied storage falls back safely; session controls still work.
Only category choices are stored, with no query, coordinates, targets or plans.
Checkboxes and map/search state share the saved initial set before first render.

The [runtime record](../reviews/2026-11-06-map-fix-filters-runtime.json) preserves
separate working-app and publication browser runs. Each passes five groups:
actual2739-source catalogue/rendered ASKIK/selection, matching map and results,
GPS/native isolation, real Flight Restart, mixed/all-off reopening/reloading/new
tabs with first-display state, and invalid/denied storage. The older published
map requires initial activation; the test uses its inert legend, with no overlay
feature backport or skipped control assertions. The working app's existing
right-map regression also passes. Scenery pixels are fixtures; source currency,
worldwide-fix coverage and aircraft fidelity are not accepted by these checks.

The source-only inventory below is retained as preparation history. Current
requirements remain in SPEC; final independent outcomes are in the
[quality](../reviews/2026-11-06-map-fix-filters-quality.md) and
[validation](../reviews/2026-11-06-map-fix-filters-validation.md) reports.


## Scope and evidence

The user reports that fixes appear in the results list but not on the map, and
requests location-type choices to survive map and application reloads. The
orchestrator assigned code1 the shared type/search and browser-test slice,
code2 the bounded storage helper, and housekeeping only this new note. The
orchestrator owns integration code, requirements, immutable-input additions and
shared status. No external sources, dependencies, data packages or licences are
introduced by this inventory.

Local inspection used `rg` and bounded reads of the map implementation, existing
browser tests, SPEC, SEC, ARCH, application README and historical fix inventory.
Before integration, `practice-map.ts` required both the checked Fixes location
type and a separate initially false `showHistoricalFixes` flag for published
map fixes. Search included the same catalogue independently of that second
flag. This source gate explains the reported mismatch; it is not a measured
browser reproduction. The integration owner was already removing that gate
while this note was written.

The assigned implementation contract makes the single **Fixes** checkbox control
published and custom map markers and directory results, retaining the current
all-seven-enabled fresh default. The existing 40 historical-label cap, circle
layer minimum zoom 8, source identity and historical labels remain. Visibility
does not create a custom fix or select a direct-to/flight-plan target.

## Shared-document maintenance proposals

The orchestrator should reconcile these current descriptions after recording the
new user decision. Earlier input records, accepted historical test reports and
completed task descriptions remain historical evidence; do not rewrite them to
imply that the new behavior was accepted previously.

| Current location inspected | Finding and proposed integration update |
| --- | --- |
| [SPEC](../SPEC.md), R-WORLD-6, line 231 | Already requires one consistent location-type selection across map and directory. Add bounded restoration of all seven categories, including an explicitly empty selection, across map reopening and application reload. Keep display preferences distinct from native and planning state. |
| [SPEC](../SPEC.md), R-NAV-5, line 233 | Replace only the sentence beginning “Historical catalogue fix markers default off behind an explicit display toggle”. It conflicts with the assigned single-Fixes control/default. Preserve explicit custom creation, historical source limits, plan-point deduplication and the later session-only plan/fix lifetime. |
| [SEC](../SEC.md), lines 52–53 | Replace the historical-marker opt-in/search-independence description with the common location-type visibility policy. The historical package and source-coordinate identity stay unchanged. |
| [SEC](../SEC.md), lines 59–60 | “Fixes and plans” here means custom planning state. Preserve its page-session lifetime and clarify that the newly persisted category choices contain no fixes, plan, target or coordinates. This is not a session-only-filter requirement. |
| [SEC](../SEC.md), lines 411–412 | The broad “right-side map adds no provider or storage flow” claim needs qualification now that category preferences have their own local record. Existing map palette/display storage is also already documented separately. |
| [SEC](../SEC.md), Local display preferences and Map palette preference sections | Add a distinct location-preference boundary, rather than expand either existing record. Document the exact key, schema, byte bound, validation/failure rules and excluded fields below. |
| [ARCH](../ARCH.md), lines 25–26 | Replace “Historical source-fix markers are opt-in, separately from search” with the common Fixes category gate. Describe the separate small location-preference record without changing bounded session-plan ownership or native-state isolation. |
| [application README](../../app/README.md), lines 1005–1017 | Explain that the seven Location types choices are saved automatically; Fixes governs catalogue and custom markers/results, with existing zoom/label limits. Remove the separate Show historical fix markers instruction. Keep 2013.10, duplicate-coordinate identity and the source-package link. |
| [root README](../../README.md) | No historical-toggle or filter-session-only statement was found; no corrective edit identified. |
| [SBOM](../SBOM.md), Historical regional map fixes, lines 409–418 | No package/inventory amendment identified. The 2,739-row FlightGear FIX2013.10 subset, pinned source commit, bounds, hashes, licence and non-current limitation remain applicable. |
| [TODO](../TODO.md), 2.0.119 and 2.0.131 | Retain their historical delivery descriptions. Record 2.0.175 as the new fix/persistence increment, with actual verification and remaining independent-review status. |

No explicit claim that location-type filters themselves are session-only was
found in the current SPEC, SEC or READMEs. Nearby session-only statements concern
custom fixes/plans or unrelated controls. Search query persistence is outside the
assigned scope.

The separate assigned record is `gefly.map-location-preferences.v1`, accepting
only `{ version: 1, types: [...] }`, at most 512 UTF-8 bytes, and only the seven
known unique string categories in canonical order. An empty array represents
all off. Invalid/unsupported/oversized records and inaccessible storage use the
all-seven defaults; denied writes leave current choices usable in the session.
Restoration performs no storage rewrite. No query, selected point, coordinates,
GPS/plan objects, aircraft/native state or recordings belong in this record.
These are the dispatch constraints to document, not an independent acceptance
claim by housekeeping.

## Existing test maintenance

| Inspected test location | Proposed change or retained evidence |
| --- | --- |
| [right-flight-map browser test](../../app/tests/right-flight-map.browser.mjs), line 260 | Still asserts that the historical source has zero features by default. Replace this obsolete expectation with catalogue visibility under the checked Fixes category, after waiting for source load. |
| Same test, ASKIK selection and lines 312–315 | At inspection the integration owner had already replaced the old separate-toggle sequence with a positive catalogue assertion. Ensure no locator or check for Show historical fix markers remains. Keep the exact ASKIK coordinate and AP/paused-native assertions. |
| Same test, lines 318–352 | Retain actual GeoJSON/layer and DOM-marker checks for individual categories, all-off behavior, path/aircraft/GPS independence, keyboard typing and map reopening. Add application reload coverage through the dedicated new test rather than treating same-instance reopen as persistence proof. |
| `map-flight-plan.browser.mjs` (working-app-only test), lines 171–192 | Retain close/reopen session edits, hidden custom map/search markers under Fixes off, unchanged route/direct-to geometry and one marker per plan/custom identity. This contains no obsolete separate historical-toggle assertion. |

Concurrent integration can move these lines; the quoted assertion and section
names are the stable search handles. All browser checks listed here were read,
not executed by housekeeping.

## Proposed bounded acceptance evidence

1. With fresh/absent preferences and the historical package available, all seven
   checkboxes are checked. At a source-fix viewport and zoom at least 8, assert
   actual rendered historical circle features and no more than 40 historical DOM
   labels, not merely a nonempty source. At zoom below 8, verify the circle-layer
   zoom policy; do not require every source fix to have a label.
2. Search ASKIK, select its row, and verify the map jumps to its coordinates at
   a suitable zoom, opens details and displays its source marker. Details retain
   historical provenance/date. Row selection alone creates no USER fix and does
   not activate GPS; an explicit GPS-target action remains required.
3. Uncheck Fixes: published circle features and historical/custom location
   markers/results disappear. Other categories remain. Existing planned route,
   plan-point markers, direct-to target/line and bearing source remain unchanged.
   Recheck: source identities and coordinates are restored without duplicate
   custom/plan markers or newly consumed custom IDs.
4. Set a mixed selection, then close/reopen the map, reload the page, and open
   the application in a new same-origin tab. Check the same seven choices and
   actual map/search filtering after asynchronous source loads. Repeat with all
   categories off: it must remain all off rather than reverting to defaults.
5. Exercise delayed source completion while a category is off: loading a
   historical/world package must not re-enable a category or resurrect markers.
   Optional-source failure must retain the filter UI and other independent map
   overlays, with missing-source status rather than invented fixes.
6. Unit-test absent, mixed, reordered, empty, malformed JSON, unknown/future
   version, duplicate/unknown/non-string types, additional keys, oversize UTF-8,
   denied read/write and quota failure. Assert canonical detached results, no
   input mutation, no load-time write, and bounded valid output only.
7. Inspect the saved record after interactions: it contains exactly version and
   category strings. Search text, point coordinates, targets, custom fixes,
   plans, aircraft/worker/AP/radio state and selected-point identity never enter
   it. Reload must not restore discarded session planning state through this key.
8. In an actual paused native-worker browser session, changing/restoring map
   filters leaves step/state digest, AP modes/targets, active/standby frequencies,
   OBS, controls and retained path unchanged. Live use must keep the worker
   advancing normally; Review must remain read only. Source/map fixtures alone
   cannot establish native isolation.

## Checks and handoff

Housekeeping changed only this note. `just check` passed: 536 Markdown files,
nine native Codex agent definitions and a Claude peer dispatcher. Its scope is
file/link targets, input-index completeness and declared routing, not simulator
behavior, external URLs, heading anchors or provider identity. Browser, native and storage
behavior above remains proposed/not evaluated by this role; independent quality,
validation and the applicable cross-provider peer gate belong to integration.
No shared status, source inventory, runtime code or immutable input was changed.
