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
