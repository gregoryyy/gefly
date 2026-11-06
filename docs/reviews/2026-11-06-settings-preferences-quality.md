# Saved Options: independent quality review

Recorded 2026-11-06 13:41 Europe/Berlin by Codex
`/root/coverage_housekeeping`, reviewing Task173 against R-UX-2/R-INPUT-1.
The reviewer authored only the separate flap/reference research note, not the
settings implementation. Only this review report is edited by the reviewer.

**Disposition: no blocking findings in the scoped settings implementation.**
This is source-quality review plus the evidence below, not acceptance of aircraft
physics, the unrelated dirty root tree, the complete legacy browser suite or a
published deployment. External peer and independent specification validation are
separate gates.

## Exact scope and source identity

Root main changes are reviewed against
`output/flap-settings-before/app/src/main.ts`, covering startup preference reads,
input/roll defaults, committed writes and sound quick-action persistence.
Existing unrelated root changes are excluded. The panel review covers the
explicit saved-preference wording and unchanged preview/rollback lifecycle;
the audio-controls change is a documentation comment only.

| Root artifact | SHA-256 |
| --- | --- |
| `app/src/settings-preferences.ts` | `b5fb5230d909357e3ebc24878946a3dc5823f58007408151deb4bd8c28c63295` |
| `app/src/settings-preferences.test.ts` | `725190d656e54a86519a2f44d8ab5c053ba77dac1117c2f928227414b7247dd3` |
| `app/src/main.ts` | `9f3bf028bd1e477adf41f4a3451b2c305d548314c4ffc64bae30aa2c880d06b4` |
| `app/src/control-settings-panel.ts` | `761592d1e849646d9ef46c11de292217a6bc39dce19ad9e7a766971b02b98ac1` |
| `app/src/audio-controls.ts` | `42a5376d36c77658df89ef9204c6078ea104fecacc127d00dcf87d8ae76e7548` |
| `app/tests/settings-preferences.browser.mjs` | `b1548f9815758653fdf616b890e05ba65c6995f868dbf5447f2a1b5309856725` |

The separate publication port in `/private/tmp/gefly-persistent-options` was
also source-reviewed via its Git diff. Its helper, helper tests, view-preference
dependency and audio-controls file match root byte-for-byte. Its main hash is
`3529bca9afcb980d0f216a3ce29a8761221044ea6e3e88ff741fdd423f683562`;
panel hash is
`52047e6bb7c8d118dedf49bd208169f82cddda30277f569408527c341793c84b`.
Its base lacks local view persistence, so the port adds that module and analogous
terrain/label startup/save calls. It preserves stored palette metadata without
claiming to introduce the root's separate palette UI. Native/runtime changes are
not part of this port. Root browser observations do not by themselves establish
publication-port runtime acceptance.

## Findings and checks

No critical, high or medium findings were identified in this slice.

- The strict version-1 storage record has a 1024-byte UTF-8 bound, exact outer
  and control-field allowlists, finite gain/range checks and literal booleans.
  Unknown/partial/future records and denied storage return detached defaults.
  No coercion admits a string gain, nonfinite number or flight-state field.
- The save helper captures each selected value once, validates that captured
  object and serializes the same values. The previously discussed getter
  re-read issue is repaired; the seventh unit case exercises both getter counts
  and invalid/extra-field rejection. Storage exceptions are contained.
- Root startup restores only declared preference fields. False and zero values
  survive through nullish defaults. Input gains and roll offset remain distinct
  from held controls, throttle, trim, flap commands and AP/location restoration.
  No native stepping or automatic flight start is introduced by the new reads.
- Options retains its opening input snapshot and the application separately
  snapshots roll/audio choices. Escape/backdrop rolls these back before focus
  returns; explicit Save is the only dialog-close write path. Modal sound edits
  stay previews, while intentional quick sound actions outside Options commit.
- Restoring volume/mute calls existing setters, which do not allocate or resume
  AudioContext. Audio still requires the existing explicit unlock path. Saved
  unmuted state therefore does not confer browser activation permission.
- The view and settings storage records remain separate. Existing view schema
  continues to reject aircraft/control fields. No remote endpoint, account,
  telemetry upload, arbitrary asset URL or new dependency is introduced.

Low-priority maintenance observation: numeric/control defaults are duplicated
between `settings-preferences.ts`, `control-settings.ts` and the audio module.
They agree at this reviewed snapshot. A later default change should update all
relevant definitions together or introduce an acyclic shared default source.
This is not a present behavioral defect and is not a required repair here.

## Evidence actually inspected or executed

The reviewer independently ran:

```
node --test app/src/settings-preferences.test.ts
```

All seven cases pass: boundaries/false/zero, absent/corrupt/denied/oversized
storage, strict schema, rejected invalid writes, denied/quota writes, detached
preview snapshots, and single-capture getters. This is a focused helper result,
not a full application test claim.

The reviewer inspected the completed root Chrome 156.0.8078.80 report
`output/flight/settings-preferences-browser.json`, SHA-256
`a05f221af4e28c2aef6cb0cb057f5776b8e31f95ba7c3c6ccdcad482918aaf2e`.
It records pass for all nine groups and pins the current five runtime/harness
hashes in the table above. Harness inspection confirms normal application and
native Worker traffic forwarded unchanged; scenery pixels/vector responses are
fixtures. The groups exercise real reload before Save, saved choices after
reload, Escape rollback, backdrop rollback, quick sound commits, restart,
same-origin new-page restoration, malformed storage, and actual denied storage.
Assertions cover paused startup/no run message and locked audio after reload.
This report was inspected after completion; it was not rerun by the reviewer.

The completed four-group view report
`output/flight/view-preferences-browser.json`, SHA-256
`cb5e833a099d7b9c23e7d8dc4ad5146ca8b5f838407f35108c120edde336ab3d`,
was also inspected as supplemental author-run evidence. It covers terrain/label
reload, Options preview/rollback/save with separate retained gains, menu writes
while paused and malformed/denied storage. It does not supply an independently
pinned publication-port browser result.

The orchestrator's broader CI and TypeScript checks were not repeated. A
publication-port browser run, whole-root CI/assurance, cross-provider peer and
aircraft-fidelity validation are not claimed by this review.

## Renewal after current-main integration, 2026-11-06 14:04

Independent source-quality renewal covers publication merge
`1f0239e418e557aaace7bdb5c76bbfa03f936d43` against incoming main
`52897de10dfdafb4f7b3252cdb41828f8a22b5f5` in
`/private/tmp/gefly-persistent-options`. Earlier pins/results above remain
historical; this section identifies the current merged publication source.

Current merged main SHA-256 is
`02b317ec45c5a3ee2ea920f57867cff3247da78055b2090bc22f0145a6eea53d`.
The seven-case helper, helper tests, view-preference module, panel, audio-controls
and settings browser harness retain their previously reviewed publication bytes.
The added eight-case view test hash is
`d0b1bb0aa2e1e6db366cff3628fe64364166ea86d4d0f97e0ca4aa281934edcf`.
Package hash is
`b05e580e5c242f6c0f50ac2c525f94f015799042021272c22a4a9c186f3826a2`;
SPEC hash is
`e18a61f227898186fcd18a0a9d6fa8fbfbbed2d6cf96fed15c66d500c2cf07ac`.

The reviewer inspected `git diff origin/main..HEAD` and the merge's combined
diff. No blocking source-quality finding was identified. The main settings
delta remains narrowly scoped, while incoming centered-yoke pickup and balanced
startup/reset-profile/status code remain intact. Native sources, pointer-yoke,
session and types have no feature delta against incoming main. Startup preference
restore still does not issue a run command or unlock audio.

Package conflict resolution preserves every incoming named script and both
dependency sections. A direct JSON comparison confirms that removing only the
two added helper/view test paths yields the incoming unit-test command exactly;
removing the settings-browser prefix yields the incoming browser command exactly.
The incoming initial-balance and yoke-resize scripts remain unchanged. SPEC keeps
the incoming resize-pickup paragraph while replacing only the relevant saved
control-preference clauses; GAPS retains the incoming decisions and adds the
dated settings decision, and the research index retains both upstream links.
`git diff --check origin/main..HEAD` passed.

This is a source renewal. New merged-port CI and browser executions were pending
at this inspection; earlier root/premerge browser evidence is not promoted to a
postmerge runtime pass. Final merged artifact/runtime pins require a separate
renewal once those outputs exist.

## Final merged-runtime evidence, 2026-11-06 14:07

The reviewer inspected the completed postmerge publication artifact in
`/private/tmp/gefly-persistent-options/output/flight/settings-preferences-browser.json`.
Its SHA-256 is
`3564485e33ee0d38818ab4200991608fedc4d9db18952237a1b4e9c3b4eaf8a6`.
Chrome156.0.8078.80 reports pass for all nine settings groups, twelve observation
snapshots and no page errors. The reviewer recomputed every declared source pin
and confirmed a match against the merged port: main `02b317ec…`, settings helper
`b5fb5230…`, panel `52047e6b…`, audio controls `42a5376d…` and browser harness
`b1548f98…`. This renews the earlier source-only port assessment with actual
postmerge browser evidence, including Save/Cancel/reload, exact false/zero,
restart/new page, denied storage and paused/locked-audio restoration.

The completed merged CI log `output-settings-ci-merged.log` has SHA-256
`4d0f88bdf9859e7cc4300c8e36480b5b30b36c8ccd26e1e186b5feba019a73f3`.
The reviewer inspected its successful final summary and focused count records:
565 application Node tests,22 application Python tests,85 assurance tests and
11 training tests pass. Foundation CI reports9 optional JSBSim study checks
skipped, with those skips explicit rather than promoted to passes. Tracked
whitespace and assurance integrity pass. The reviewer did not rerun this CI or
browser execution; these are inspected completed author-run outputs with source
pins, in addition to the reviewer's earlier independent seven-test helper run.

**Final scoped quality disposition remains no blocking findings.** The merged
publication settings behavior has supporting runtime evidence. Full legacy
browser-chain execution, optional skipped studies, aircraft fidelity and
cross-provider peer acceptance remain outside this quality result. Future source
changes invalidate the affected pins and require renewed review/evidence.
