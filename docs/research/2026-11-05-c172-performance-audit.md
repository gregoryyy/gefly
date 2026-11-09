# C172 performance audit references

Prepared 2026-11-05 11:01 Europe/Berlin by Codex
`/root/resize_housekeeping` for TODO 2.0.133. Reference facts and proposed
comparison conditions only; no model performance was measured by this task.

## Applicability and provenance

The current [build recipe](../../studies/e1-browser/sim/build.sh) pins JSBSim
v1.3.3, commit `66f7fafc07fe13e7ede9db20873030fed2881713`. Its locally prepared
`c172x` identifies a 1982 C172P and uses `eng_io320` / `prop_75in2f`. The local
build metadata records a 160 hp engine and the
[generic windmilling propeller adapter](../../studies/e1-browser/sim/prepare-propeller.py).
This is not the selected conventional-panel 172S model. The filename IO320 does
not establish an installed fuel-injected engine: the upstream engine header
explicitly describes its generated input as not injected. The local metadata is
build provenance, not proof of the bundle loaded by a particular browser session.

Manufacturer-authored references were read from existing third-party mirrors:

| Reference | Edition and applicability | PDF SHA-256 |
| --- | --- | --- |
| [P: 1982 Model 172P POH scan](https://www.glasscockpitaviation.com/wp-content/uploads/2022/07/cessna-n54829-poh.pdf) | Title dated 12 May 1981; some pages carry later revisions. Airframe-specific amendments/completeness are not established. Same source as the [existing P research](2026-11-02-c172p-airspeed-markings.md). | `5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c` |
| [S: Model 172S Information Manual](https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf) | Reprint of 172SPHUS, Rev 5, 19 July 2004; conventional-panel reference S17. It is not a current serial-specific AFM. See the [selected-aircraft manifest](../../data/aircraft/c172s-classic/manifest.json). | `420dbdaf5517a7a005cde8938ac359678bcfe52863e8efd4f55fcdbf29ec429f` |

Complete relevant page images were inspected using the PDF skill. Local copies
and page renders remain temporary; no scans, copied prose, illustrations or
complete performance tables are added to source. Existing P-source derivation
rights remain unresolved as recorded in the earlier research. Public hosting is
not permission to redistribute the manuals.

## Distinct manufacturer reference conditions

| Fact | P reference | S reference |
| --- | --- | --- |
| Engine | O-320-D2J, carbureted; 160 BHP at 2700 RPM (1-3) | IO-360-L2A, injected; 180 BHP at 2700 RPM (1-4) |
| Fixed-pitch propeller | McCauley 1C160/DTM7557; 75 in maximum, 74 minimum (1-3) | McCauley 1A170E/JHA7660; 76 in (1-4) |
| Normal takeoff/landing weight limit | 2400 lb; ramp 2407 (2-6) | 2550 lb; ramp 2558 (2-7) |
| Maximum flap speeds, KIAS | 110 at 10 degrees; 85 at 10-30 (2-4) | Same KIAS limits (2-4) |
| Normal takeoff flap discussion | 0-10 degrees; greater than 10 not approved for takeoff (4-15) | Same restriction (4-25) |

The climb samples below come from Figure 5-6: P printed 5-16 (PDF page 84), S
printed 5-17 (PDF page 129). Both specify flaps **up**, full throttle and mixture
leaned above 3000 ft for maximum RPM. Weight is 2400 lb for P and 2550 for S.

| Variant | Pressure altitude | Speed KIAS | ROC at 0 C, ft/min | ROC at 20 C, ft/min |
| --- | --- | ---: | ---: | ---: |
| P | Sea level | 76 | 745 | 685 |
| P | 2000 ft | 75 | 640 | 580 |
| S | Sea level | 74 | 785 | 710 |
| S | 2000 ft | 73 | 695 | 625 |

These are selected comparison points, not a complete table or a tolerance.
Enroute/max-rate configuration must not be confused with flap-assisted takeoff
or balked-landing procedures. The P and S tables are separate targets; being
within the S weight limit does not make an overweight P case a valid S test.

## Criteria for interpreting the native audit

1. Freeze runtime/model/adapter hashes and record actual native mass, CG, fuel,
   loading, engine power/RPM, propeller state, flap position, trim, AP/manual
   commands and assists. A label or requested lever position is insufficient.
2. Match pressure altitude and outside temperature, rather than substituting
   scenery MSL height. Record mixture and full-throttle state; use a source row
   or declare interpolation explicitly. No new interpolation or acceptance
   tolerance is selected here.
3. Keep IAS, CAS and TAS distinct. The climb table uses KIAS; a CAS/TAS export
   needs an applicable conversion before a speed-matched comparison. The
   project's existing [S values](../../data/aircraft/c172s-classic/poh-values.json)
   are sourced targets, not acceptance of the current P-based model.
4. Separate a sustained, stabilized climb from a transient pitch-up that trades
   airspeed for height. Report time histories and speed change alongside the
   altitude-derived rate; a brief peak alone cannot be compared with a
   maximum-rate chart point. Commanded AP vertical speed is not measured climb.
5. Audit flap controls/actual motion independently, then compare matched
   configurations. The cited climb chart is flaps-up; it supplies no flap-down
   drag polar, transient pitch tolerance or claimed climb improvement. Do not
   tune coefficients to an unmatched rate observation.

Aircraft dynamics, accepted 172S fidelity, training effectiveness and the cause
of the user's reported behavior remain outside this reference-only result.
