# GPS bearing-dial validation

Reviewed 2026-11-05 01:59 Europe/Berlin by independent Codex `validate`.
Scope: TODO 2.0.128 / R-NAV-5, R-PANEL-1 and R-REVIEW-1, following the
[GPS dial request](../input/2026-11-05-gps-bearing-dial.md) and its preserved
[recording-time correction](../input/2026-11-05-gps-bearing-dial-time-correction.md).
Working-tree base: `700dd5386125f9864a391f85b277cb71da55290a`.
The validator authored neither implementation nor repository acceptance fixtures.

Recommendation: **pass for the bounded local display increment at the final
hashes**. No unresolved in-scope failure remains. Cross-provider peer is pending.
The shared map target drives a visual true-bearing/geographic-distance aid;
this does not accept a GPS receiver/FMS, operational procedure, GPS AP guidance,
aircraft fidelity or training credit.

## Independent execution and numerical evidence

The validator inspected the current getter, dial and integration source, then
independently executed `node tests/gps-bearing.browser.mjs` from `app/`:
**exit 0, all nine groups pass**, Chrome 156.0.8078.80. The test uses the actual
application/MapLibre/JSBSim worker; only scenery pixels are fixtures. Isolated
missing/invalid-data cases explicitly use an actual captured native state and
are distinguished from the integrated running simulation.

The final actual run covers custom direct-to, map-close persistence, draft
nonselection, active-plan Next while closed, Stop/Clear/deleted-target fallback,
coincident/missing geometry, current-target/recorded-position Review, live AP/radio
isolation, zoom/narrow presentation and delayed real native initialization.
The browser fixture's numeric reference uses independent 3D vectors and central
angles rather than application navigation helpers. The validator separately
checked analytical meridian distance and a spherical-law-of-cosines eastward
fixture in Python, using the declared 6,371,000 m sphere and 1 NM = 1,852 m:

| Fixture from 49.96°N / 8.643°E | Independent reference | Actual dial |
| --- | --- | --- |
| Target .2° north | 12.00809143029792 NM; 000° TRUE | 12.008091430298318 NM; 000° TRUE; display 12.0 NM |
| Target .3° east | 11.587600889552306 NM; 89.88516056550593° TRUE | 11.587600889603568 NM; 89.88516056550594° TRUE; display 11.6 NM / 090° |
| East target, aircraft heading 82° TRUE | Pointer +7.88516056550593° relative to the aircraft; compass card −82° | +7.885160565505885° pointer; −82.00000000000006° card |

The separate reference agrees within 1e-8 NM/degree. The integrated browser
checks use a predeclared 1e-7 NM/degree arithmetic allowance. These are arithmetic
checks for the chosen sphere, not ellipsoidal accuracy or aircraft tolerances.
A coincident target remains GPS with distance 0.0 NM and no bearing needle.
During actual delayed native Restart, the selected USER-0002 identity remains
GPS, with bearing/distance unavailable until fresh native state; it never
briefly presents NAV1 as the selected source.

The validator visually inspected the actual zoomed-panel and 390 px NAV-dialog
screenshots. GPS source, USER target/name, current-selection context and
geographic distance label are readable; the narrow fixture measures source/target
text bounds inside the SVG face. Numeric distance is explicitly GPS DIST NM,
with DME validity false and no GPS value in the radio-DME data field.

The integration owner executed the final **445 Node + 12 Python** cases with no
skips and the final application build; the legacy NAV auxiliary browser reports
three groups passing; the final ten-group legacy planning browser also passes.
Their logs were inspected. These are distinct from the
validator's actual nine-group run and separate numerical check. The 17-case
planning model suite was also independently executed during the adjacent waypoint
review and remains unchanged. No unrelated broad browser suite is claimed anew.

## Criterion matrix

| Criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Shared explicit GPS target | Dial uses the same explicit direct-to or active plan-leg target, even with map closed | pass: immutable read-only getter resolves direct-to/active-leg endpoint; actual direct-to/map-close and closed-map Next cases pass; main supplies it independently of map visibility |
| Draft behavior | Creating fixes or draft route points alone must not select GPS | pass: actual creation of four fixes and draft start/waypoints/destination preserves exact initial NAV1 dial until explicit navigation |
| Source/identity/units and geometry | Identify GPS/target, true bearing and geographic NM, with correctly rotating card/pointer; never call GPS distance DME | pass: actual identity/source labels, separate numeric references above, geographic label, empty radio-DME field/false validity and complete title/ARIA provenance |
| Target transitions and fallback | Next updates target; Stop/Clear/removal of selected target restores original NAV1 bearing/radio DME when no GPS target remains | pass: actual Next while closed, Stop, active-plan Clear and selected direct-to deletion restore NAV1 immediately and clear GPS target/context/labels; initial clearing matches the original NAV1 dial exactly |
| Coincident/missing/invalid geometry | Keep selected GPS source; do not invent a bearing or silently substitute radio | pass: actual coincident target hides needle with 0.0 NM; isolated null state, invalid position, invalid heading and invalid target cases retain GPS with invalid needle and no DME validity |
| Current GPS versus recorded Review | Use current selection against selected recorded aircraft position, explicitly distinct from recorded avionics | pass: actual Review selects step 0, agrees with that recorded position and labels CURRENT GPS / REVIEW POSITION; title/ARIA state current target is not recorded; native step/digest/full state stay frozen |
| Restart/null-state interval | Preserve GPS identity while state is unavailable, then use fresh position | pass: final integration repairs the reset null-state update to pass the current target; independently rerun actual deferred JSBSim module loading proves unavailable GPS bearing/distance without NAV1 fallback, followed by correct fresh-state readout |
| Existing avionics/native isolation | Preserve NAV1/NAV2/OBS/RPM, radios and AP guidance, live/paused operation and recording | pass: actual paused complete native state/digest/AP targets, radio/OBS strings and NAV1/NAV2/RPM DOM are unchanged; live progress retains AP/radios. Getter/dial are presentation-only, use selected state and introduce no native guidance or recording field |
| Responsive presentation | Labels remain usable under panel zoom and narrow NAV dialog | pass: inspected actual screenshots and measured 390 px face/text bounds; existing panel frame and controls remain separate |
| Operational receiver/AP/fidelity/peer acceptance | Separate gates | not evaluated: GPS AP coupling, receiver/FMS error models, current procedures, operational accuracy, aircraft/training fidelity and cross-provider acceptance |

## Findings and limits

The integration owner repaired the initial reset null-state call before the
final freeze; the independent delayed-loading case renews that affected behavior.
No unresolved defect remains. Planning is page-session state; Review shows the
current GPS selection, not a recorded historical plan. True bearing is not a
wind-corrected heading, GPS geographic NM is not radio slant-range DME, and AP NAV
remains the existing radio source. No GPS guidance/authority is added to AP.

## Final frozen inputs and evidence

| Input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `docs/input/2026-11-05-gps-bearing-dial.md` | `4c2bea70a45a5934bc40b36694dfed208023b7616de7fa086a1ed01ff16d2b18` |
| `docs/input/2026-11-05-gps-bearing-dial-time-correction.md` | `7d21881771b041715ac292a0bdb27861b4cda4563ed3ab0ee295ccfcfacc2562` |
| `app/src/navigation-gauges.ts` | `0ede1a58d1ce28826eadede1f25e65c76762497371d60c9dd2b107712d14e619` |
| `app/src/navigation-gauges.css` | `cd9b5a20bac0e28703b9258aa968a75a8b314b87bdba34e20b50dedd13489b29` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/practice-map.ts` | `c5658fa8eaab8fbb289b606eb7ad75132504a3c6497fe4b9fc6d2300b58d0318` |
| `app/src/map-flight-plan.ts` | `20d456997d58575a7c866b218b5dc48ea8c0c9099b5a460cdf343a0eaacc2c90` |
| `app/src/map-flight-plan-types.ts` | `2c3bb3e9a536fa0907e912b5e1b12624069efaf542a66e5d0148c6412afcbf5c` |
| `app/tests/gps-bearing.browser.mjs` | `eb136939905d0307370455a486cb2bee4feeffbd5f572ad53094f31d768db45d` |
| `app/README.md` | `73f7ff8f59e983c2ac5756d6a1ed520c2e9ccbd775a8ae47dac1f4eb82fca9a5` |
| `docs/ARCH.md` | `3cce8dda3d7ec645f725cda99d445d51c047a577e2415e3887d8687fe84e31cc` |
| `docs/SEC.md` | `8d1041b0e71512951568756fb2fde4cfb7e30e94c2344c22d6d3371dfe1298ca` |

Local evidence under `output/flight/`:

| Evidence | SHA-256 |
| --- | --- |
| `gps-bearing-validation-browser.json` (independent run, preserved by integration owner) | `d5a17ddf6271b92868bc49ec91b3e22ae0a9e1d61230f696c008d3fae65a46ca` |
| `gps-bearing-author-browser.json` (preceding author run) | `83bb6cecff02836dbf2e7ffc930a8673daabee9c8c4ed5c5aaefb0ffe28292bb` |
| `gps-bearing-browser.log` (author run) | `b2e7bc2c01fe4278bfdb83b1053f1bb171684552da93860c560f84b6110566a4` |
| `gps-bearing-build.log` | `c4af66d93b72ad5be8e8afcab07a92b01fd23ebbc9b5d217a987ebb7c7cfa756` |
| `final-gps-unit.log` | `e4696109b88c01cff09de572b7baa6c93bbf834cc1197f35543bafd9ba589486` |
| `gps-bearing-legacy-navigation-aux.log` | `4933b485d9a8df984da62a6415a5294c92b5411930c3345e16eb6a33930971d9` |
| `gps-bearing-legacy-plan.log` | `2d0b9331f00171bb920dccbae8379208a8c19f37c639eb152bf2f1a12050d28b` |

Changed inputs require renewed affected validation. Local runtime results do not
establish hosted CI/publication or the separate cross-provider peer gate.
