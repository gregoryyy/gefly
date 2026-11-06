# Map zoom keyboard ownership — quality review

2026-11-06 15:41 Europe/Berlin. Task 2.0.176; R-WORLD-6 / R-SIM-9.
Reviewer: Codex housekeeping subagent, reassigned to independent quality.
The reviewer authored the source-inventory note only, and did not author or
repair the runtime implementation, tests, integration or requirements reviewed.

## Outcome and scope

**No blocking findings** in the bounded Task 2.0.176 implementation. This is a
quality outcome, separate from specification validation and cross-provider peer
review. It does not accept unrelated working-tree features or aircraft physics.

Reviewed the root runtime delta against `output/map-zoom-before/app/src/`, the
isolated publication worktree `/private/tmp/gefly-map-zoom` against its Git base,
the new router and unit tests, the browser harness, and the affected R-SIM-9 and
SEC ownership text. The root and publication implementation retain their
different pre-existing surrounding flight guards; the port does not silently
backport unrelated root UI behavior.

## Evidence identity

Independently recomputed SHA-256 for every path in each supplied browser artifact.
All five hashes matched current files in each tree. Both artifacts report
`pass`, seven check groups, fourteen zoom observations and no page errors.
Artifacts are local generated evidence, not a substitute for versioned source.

| Application-relative path | Root SHA-256 | Publication worktree SHA-256 |
| --- | --- | --- |
| `src/main.ts` | `da8bfdd77f4f84f2c01f8421b9c77ff06a590d1db182c3f13671cc6f42cdba9a` | `93fa2aa57bb045e8ff2ad056703d01022fe8d9caa618932c93b0e38ba5c7226c` |
| `src/practice-map.ts` | `dc36cae7ca4cd7a24fdc2ca8466c615673aa9e9ac5fd5df20ca8c905434e6f8a` | `2c7d13a1734316e350a8b670b75e786e4cc169d745155a10fdcba14b82ab0161` |
| `src/flight-assists.ts` | `e0114d188fae257054635cfc02845f450776d9ba31c666cff4adbab31dcd6adb` | `cc8d9f61cfa6f42b479d0fe14d75352d5d4bfec5ff61923ce8c283211b81d18c` |
| `src/map-zoom-shortcuts.ts` | `7b2be897e7ad5cd9636d97eb245a33c805da2fefa747247add444b53e38aeb91` | Same |
| `tests/map-zoom-shortcuts.browser.mjs` | `0d0fb360a6b126a6569354ddb4a10ce0c71cf19fa914630a6c30a9914fea8faa` | Same |

The publication unit-test file hash was
`e91f0386aab89a1109ce71af05bfd7ef651d5ab9f2463a1be0e7380463923ca1`.
Browser artifacts were inspected at `output/flight/map-zoom-shortcuts-browser.json`
in each tree. The harness records source hashes before execution, checks they
remain fixed afterward, and records its one observer-only MapLibre assignment
insertion. The worker wrapper observes messages and forwards actual native-worker
commands; scenery pixels/vector tiles are fixtures, not actual downloaded map data.

## Review observations

- `main.ts` registers the router in document capture before creating
  FlightAssists. The `isOpen` predicate reads map visibility, so scene focus does
  not retain ownership of speed keys. Optional chaining handles lazy map loading.
- The router matches characters and numpad codes. Recognized events call
  `preventDefault` and `stopImmediatePropagation`, preventing the canvas handler
  and later flight handlers from performing a second zoom or handling German
  Digit0. Repeats are consumed without invoking the callback.
- Prior cancellation, editing, Ctrl/Meta/Alt, modal/top-menu and visible-credit
  checks leave existing input ownership intact. These guards introduce no new
  source, storage, permission or interpolation behavior.
- `PracticeMap.zoom` and toolbar buttons share one direction-checked, readiness/
  visibility/disposal-guarded helper. Both clamp to MapLibre limits. The actual
  MapLibre transform supplies its stricter viewport-dependent minimum; the test
  checks that effective floor and an additional no-motion press rather than
  incorrectly insisting on configured zero zoom.
- FlightAssists respects prior cancellation and explicitly defers keyboard rate
  commands while the map is open; its menu/API rate path remains independent.
  AP routing is untouched. Menu hints and accessibility metadata are updated
  through the existing render/update path, which runs in the main frame loop.
- The page-lifetime router has explicit idempotent disposal, and `pagehide`
  invokes it. No new polling loop, network request, worker pacing or physics
  parameter change is introduced.
- The supplied browser harness tests loading before map construction, three
  focus contexts before pointer activation, exact one-level Shift+Equal zoom,
  German/numpad cases, repeats, cancellation/typing/modifier/menu/modal guards,
  AP and explicit speed commands, restored closed-map rate keys, Review
  isolation, and shared upper/effective lower bounds. Native step/digest/final
  state and throttle/rate observations make this more than a visual assertion.

## Checks actually run and limits

Reviewer ran `node --test src/map-zoom-shortcuts.test.ts` in the publication
worktree's `app` directory: **7 passed, 0 failed, 0 skipped**. Reviewer inspected
the supplied browser results and their harness; did not rerun browser execution
or duplicate the concurrent CI pipeline. The browser results identify Chromium
156.0.8078.80, not the user's embedded WebKit environment.

Visible-credit and teardown guards have source/unit coverage; the supplied
browser harness does not exercise a real visible credits popup or lifecycle
teardown. Continuous airborne input during zoom is not separately measured by
that harness; paused native-state isolation and the existing input handoff are
covered. These limits do not contradict the bounded observed fix and are not
reported as browser passes. The final integration owner must attach final CI,
independent validation and peer-cadence status; changed runtime hashes require
renewed affected review.

## Renewal — 2026-11-06 15:45 Europe/Berlin

**No blocking findings after the harness-only renewal.** The preceding
seven-group browser evidence and its harness hash are historical. All four
runtime source hashes in both trees remain identical to the reviewed values
above. The new shared harness SHA-256 is
`3fcc4095a4093321650be17e76c807ea695263cef1c8314e42c7e75c90ef590c`.

Reviewer inspected the added live-flight group and independently recomputed all
five artifact source pins in both trees again. Both refreshed artifacts match
the current sources and report **pass, eight groups, fifteen observations, no
page errors**. Root's new live observation has zoom 15 → 16, native steps
136 → 198, rate 1, throttle_norm 0.737595201290068 and four cumulative rate
commands. The publication worktree observation has the same zoom/rate/throttle/
command count and native steps 134 → 194. Each harness separately asserts that
its rate-command count and native throttle remain unchanged across these keys.

The new group starts the real worker, opens the map while flying, leaves zoom
headroom, tests `=` / `+` / `-` individually as +1 / +1 / −1, and waits for at
least sixty further native steps. This supplies the previously missing empirical
running-flight coverage; that part of the original evidence limit is superseded.
It does not claim a held-aileron/yoke scenario or all keyboard/layout/browser
combinations. The embedded WebKit, real credits popup and lifecycle browser
limits above remain.

No runtime edits required renewed runtime analysis, and no duplicate browser or
full CI run was performed by this reviewer. The orchestrator additionally reports
the existing flight-assists browser regression passed seven groups and final CI
passed with preserved optional-study skips; these are integration-owner reports,
not independently rerun or certified here. Validation and peer status remain
separate from this quality outcome.
