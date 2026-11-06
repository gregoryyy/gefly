# Map fix filters: independent quality review

Task 2.0.175; R-WORLD-6 / R-NAV-5. Reviewer: Codex quality agent
`/root/map_filters_housekeeping`, 2026-11-06. Implementation authors are other
Codex agents. This reviewer previously authored the source inventory note and
does not independently approve that note. This is a same-provider quality review,
not the cross-provider peer gate or aircraft/navigation-fidelity acceptance.

Current disposition: **no blocking source-quality findings**. The final root and
publication browser artifacts both report five passing groups with no page
errors, and all five source hashes in each artifact match the current respective
checkout. Independent storage/type tests passed 10/10. Wider integration CI and
independent SPEC validation remain separate gates.

## Reviewed scope

Reviewed the bounded root working-tree changes against
`output/map-filter-before/app/src/{practice-map,map-point-search}.ts`, and the
publication worktree `/private/tmp/gefly-map-filters` diff against main
`52897de`. The latter has only six added/three removed practice-map lines:
load the separate preferences before search construction, pass `initialTypes`,
save category changes and adjust imports. Its shared type extraction and storage
helper match the root implementation. Existing worldwide-loader and plan-editor
work was not copied into the publication port.

The redundant historical gate was present in the root working app and removed
there. Publication main already used the single Fixes category; its port does
not claim to remove a second gate from that older runtime. SPEC/GAPS changes
describe the user direction; this distinction must remain in delivery claims.

| Artifact | SHA-256 at inspection |
| --- | --- |
| Root practice-map | `a4ecfcf494822836f58a3e5d0111bca4e6b7ec4f6b17f764cb38707b86f68e88` |
| Root map-point-search | `1388b06f42de5551ac904a22a189dccb495c19979373aa82b96906b9bf1fefc6` |
| Publication practice-map | `78b54be4d57ac3092d3c5eaf639f31600b8129d27c53f122eb0377ddb370fc58` |
| Publication map-point-search | `f97d65c03d3080f2d264161b865ab182d895b4088a6575a60962db2b0a1fea45` |
| Shared map-location-types | `4d885a01eafb450d2570a53a9dd3946ab7e4dbcce896921029ccaef87baf4549` |
| Shared map-location-preferences | `e351e3c39b690c1ea2dadfeb26a1d66742e338f3fc3b309732794978d027c2aa` |
| Final shared browser test | `87373aea1512db548fe8fe5e7ea94decd4ef28eaac1ffdf85594453ebfd649a1` |

## Findings and disposition

No blocking implementation findings identified in this bounded source review.

- The preferences parser checks the raw 512 UTF-8-byte limit before parsing,
  exact own fields and version, known unique string categories and a maximum
  seven entries. It does not coerce values. Empty is intentionally distinct from
  absent/invalid. Canonical arrays and detached defaults prevent caller mutation
  from changing restored state. Saving captures each entry once, validates that
  same snapshot and preserves storage on invalid input or exceptions.
- Denied access to `window.localStorage`, get/set failures and quota failures
  do not stop map controls. The separate fixed key stores only version/category
  strings; there is no query, selected point, coordinates, GPS, plan or worker
  serialization path. Loading does not rewrite the record.
- Search copies the incoming set before first render and initializes checkbox
  state from it, including an explicitly empty set. Its constructor does not
  invoke `onTypesChange`; the map callback cannot run during factory construction
  before later declarations exist. Existing callback and category filtering
  semantics are preserved.
- Root source changes remove only the redundant historical visibility gate.
  The existing minzoom 8, 40-label limit, historical status/provenance, point
  coordinates and source loader stay intact. Type changes invalidate source and
  marker caches, preventing a previously painted catalogue from surviving off.
  The publication diff does not modify source packages, native/physics modules,
  map-frequency actions or GPS targeting.
- The new browser test uses actual MapLibre and native-worker state, loading the
  pinned catalogue rather than replacing it with arbitrary fix geometry. It
  verifies rendered ASKIK features, a selectable marker, explicit GPS selection,
  independent airport/NAV/GPS state, paused digest/final-state invariance,
  immediate filter initialization, close/reopen, reload, fresh tabs and invalid
  or denied storage. Source hashes are checked before and after the run.

## Evidence actually inspected or executed

Executed independently in the publication app:

```text
node --test src/map-location-preferences.test.ts src/map-location-types.test.ts
10 tests passed; 0 failed; 0 skipped.
```

Read the final `output/flight/map-location-preferences-browser.json` in both
the root checkout and `/private/tmp/gefly-map-filters`: each reports pass, Chrome
156.0.8078.80, five recorded check groups and empty errors. Independently
recomputed all five source hashes in each checkout; all ten match their
respective artifacts exactly. Root and publication practice-map/search hashes
differ as expected for the earlier publication target; each has its own browser
evidence. The shared final browser harness hash appears in the table above.

Reviewed the final harness revision: real UI activation clicks the inert
location-type legend before point actions. The actual Flight → Restart check
sets mixed filters, clicks the real reset control, waits for new native state,
checks retained category choices and actual filtered sources, and compares a
fresh paused native baseline. It does not compare the pre-restart digest across
an intentional aircraft reset. No product runtime backport or skipped assertion
was used. This reviewer inspected these browser artifacts/assertions rather than
executing the browser runs independently.

### Historical failed run

The initial publication browser artifact failed waiting for `.map-point-popup`
after search selection; it completed no check groups. It observed correct
all-seven initial filters and no page errors. The integration owner identified
the older target's existing first-interaction map-activation guard; the first
test click activated the panel rather than selecting the result. The revised
harness explicitly clicks the inert location-type legend before point actions.
Its original hash was
`040a316e2354409807bde81bc07197d916fd631ab657ff891cda38e69fdb696c`.
The final passing runs above supersede that harness/run for current evidence;
the original popup failure remains recorded here rather than relabeled as pass.

Typecheck, production build, integrated assurance and shared CI results are integration-owner
evidence, not independently executed or inferred here. No heading/link check or
storage unit test establishes flight-model validity.

## Residual limits and handoff

The new browser suite verifies paused native invariance; it does not separately
exercise every live/Review interaction or flight-plan marker case. Existing
regression suites remain relevant for wider coverage and need their own results;
do not relabel this bounded run as a full avionics or training validation. The
source-only research note's wider proposed cases are not all claimed as executed.

Return status: **no blocking source-quality findings; final root and publication
browser evidence inspected and source-matched**. Changes to reviewed runtime
files or harness assertions require renewed affected inspection. Independent
SPEC validation and the applicable cross-provider peer review remain separate.
