# Hold-C CWS validation

Independent Codex `cws_validate`; recorded 2026-11-06 00:59 Europe/Berlin.
Scope: TODO2.0.163, the added hold-C portion of R-AP-1 and applicable R-INPUT-1;
base `0b258e0`. This reviewer did not author implementation, fixtures or criteria.
This is a bounded working-tree review, not acceptance of all KAP140 behavior,
installed C172 equipment, dynamics, training fidelity or a release.

**Recommendation:** pass the bounded hold-C implementation at the pinned source
snapshot, with the unexercised integration cases below explicitly retained as
not evaluated. Local CI has passed with declared skips; final publication records
and assurance lineage remain the integration owner’s responsibility. This does not
accept all R-AP-1 or the cross-provider/release gates.

## Snapshot and evidence

Observed source SHA-256:

| Path | SHA-256 |
| --- | --- |
| `app/src/cws-controls.ts` | `9b78c9942eb30dd472655a197b8bef1854a5a42779c364eddaffe2e5de4c52fb` |
| `app/src/cws-controls.test.ts` | `e26bb08861c604e5b4855ba3ce6a32df1c22f9d2ecb106a921c839ec202d592c` |
| `app/src/main.ts` | `f6b94a7f36b86e86b947d7845dd53a0c571e3be6098288ed9c6a555f2c98f985` |
| `app/src/autopilot-panel.ts` | `62bd4ebe2938cd00b02e9260ae47d71e15e9b71462a10ba1b0670a5c6f5c30e2` |
| `app/tests/cws-keyboard.browser.mjs` | `22c84ec0b17eb07b737a4bbd18b06e71d2c61fd968f87c3008b80d6eea97120c` |
| `docs/SPEC.md` | `603550cb44d9171a0eb15b6e62ddb7e6db86a8c066aa3d14cdd46eab7864fb3a` |

I independently ran from `app`:

- `node --test src/cws-controls.test.ts`: six passed, zero skipped.
- `npm run check`: TypeScript passed.
- `node --test ../studies/e1-browser/sim/kap140.test.mjs`: eighteen passed,
  zero skipped, including existing VS/ALT CWS synchronization cases.

I inspected the production wiring and browser fixture, then the author's actual
browser result `output/flight/cws-keyboard.json`, SHA-256
`d4ce04b2e65927247ab39149a4784255dd46e5ddeede6c68d26775b0eaa1e2bf`.
It reports Chrome `156.0.8078.80`, eight successful checks and no page errors.
It observes the actual app/worker/native engine, with synthetic scenery images;
no aircraft telemetry/controller state is substituted. The terrain-loading case
explicitly injects a worker notification, so it establishes application lifecycle
routing, not real source loading. Blur is also dispatched by the fixture rather
than switching an actual operating-system window. The command log contains real
nonzero manual elevator and pointer aileron input under the held key, with
explicit browser assertions that these inputs reach the worker while AP remains
engaged. CWS commands alternate holds/releases.

The first author's browser attempt failed because the harness used Escape to
leave Review, whose existing shortcut is R. That unsuccessful attempt is not a
product defect or a passing result. The corrected fixture uses R and observes
actual Review status before proceeding. A later pointer-enabled attempt exposed
a harness reset race: resetting a running flight automatically restarts it, so
waiting for transient t_s=0 timed out. The final fixture explicitly pauses before
reset. Neither failed attempt is used as positive evidence.

## Criterion matrix

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Live C hold and release | Actual browser C keydown sets native `kap_cws=1` with AP engaged; final keyup sets zero while AP and ALT remain engaged. Manual elevator and actual pointer aileron input reach the worker during the hold. | pass |
| Repeats and no latch | Browser repeated keydown produces one hold edge; helper covers repeat and duplicate release. Full final command log alternates holds/releases. | pass |
| Shared keyboard/panel ownership | Actual panel Space hold plus C survives release of Space, ending on C release. Helper additionally exercises both source/release orders. Pointer uses the same existing panel command path but mixed pointer+C is not separately exercised. | pass for shared command ownership |
| Existing AP mode/reference synchronization | Wiring retains the existing CWS command and native code is unchanged. Existing independent controller tests exactly check current VS recapture, actual pressure-altitude capture, preserved independent selector and no duplicate recapture. Browser checks engaged ALT retention. | pass for unchanged command/controller semantics; installed-aircraft behavior not evaluated |
| Paused/AP-off activation | Browser sees paused C issue no CWS command; after reset AP-off C remains zero. Start guard explicitly requires running and engaged AP. | pass |
| Typing/modifiers/composition/orphan repeats | Browser includes text/number field and Ctrl+C. Helper independently rejects Ctrl/Meta/Alt, composition and orphan repeat; source checks actual editable target. | pass for covered paths |
| Menu/Review activation | Browser opens menu and checks CWS remains off; entering actual Review releases C and rejects a new C hold. Main checks menu/open dialogs/Review before admission. | pass for menu/Review |
| Dialog/map/plan/failure/collision activation | Main's explicit guards are present and call existing predicates. These particular app contexts are not directly exercised by the current browser artifact. | not evaluated as integrated runtime cases |
| Release after context/modifier change | Helper changes context and Ctrl state before keyup and observes exactly one release. Main editable focus also neutralizes. | pass at helper/wiring level |
| Pause and blur cancellation | Actual pause gesture and dispatched window blur release CWS; late keyup does not start it again. | pass for tested lifecycle routing |
| Loading cancellation and admission | Injected loading=true routes through actual Session to neutralization; actual worker accepts CWS0. CWS command count remains unchanged by C while loading. | pass for injected lifecycle routing; real terrain-transition timing not evaluated |
| AP disengagement cancellation | Actual A while held results in native AP-off and CWS0, followed by re-engagement without a retained hold. | pass |
| Reset cancellation | Reset is exercised after Review has already released C; code calls neutralize before session replacement. A reset with an actively held C is not directly exercised. | not evaluated as a held-reset runtime case |
| Disposal | Helper disposal releases once and removes key handlers; main disposes it before Session on pagehide. | pass at helper/wiring level; actual pagehide-native delivery not evaluated |
| Neutral axes before release | Helper invokes `beforeChange` before each aggregate edge. Main neutralizes axes; Session explicitly flushes current controls before posting CWS0, retaining existing recapture ordering. | pass by helper/source inspection |
| Discoverability | Rendered button title names Hold C and retains optional-installation limitation; `aria-keyshortcuts=C` is present. Active AP hint names hold C. | pass by source inspection |
| Physics/state/network boundary | Diff introduces input aggregation/help and existing commands only; no engine, worker integration step, source provider, persistence or dependency change. | pass for bounded diff inspection |
| Shared local CI at pinned working-tree source | `output/flight/cws-ci.log` terminates in passed with skipped checks. Application478Node+22Python, assurance85 and training11 pass. Optional JSBSim9/23 skip. Whitespace only covers2032 currently tracked paths; newly untracked files require the final publication check. | pass for observed local gates, with skips; final publication check not evaluated |
| Cross-provider peer / complete KAP or training acceptance | This same-provider validation cannot supply those independent/provider or aircraft gates. | not evaluated / peer pending |

## Integration evidence

I inspected the author’s completed local CI log, SHA-256
`543d66a0cf56adc0030d1723303cd718de75c030967072087aab9f0e42bd66e2`.
The author reports `just assure check` zero errors; its separate result is not
independently rerun by this validator. Hosted CI and final committed lineage are
not established by the local log. Main/helper/panel/SPEC hashes were rechecked
after the final browser artifact and remain as listed above.

## Residual conditions

Renew affected rows and source/artifact hashes after any implementation or fixture
change. The integration owner must attach final CI/assurance outcomes and keep
unexercised cases explicit, or supply targeted evidence before claiming those
runtime criteria passed. No observed defect is established by the unexercised
rows; missing evidence is not a pass.
