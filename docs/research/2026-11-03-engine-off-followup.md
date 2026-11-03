# Engine-off propeller follow-up: rejected candidate

Recorded 2026-11-03 16:35 Europe/Berlin by Codex subagent
`glide_housekeeping`, independently of the candidate implementation and tests.
Scope: TODO 2.0.52, R-SIM-10. **The candidate was rejected and withdrawn.**
The previously documented low-RPM limitation remains open; this note is not a
passing aircraft or model acceptance record.

The candidate copied the C_THRUST and C_POWER tables from
[FlightGear C172P revision 63ba85273b7f44637eb4683dcdc8f97af7821653](https://github.com/c172p-team/c172p/blob/63ba85273b7f44637eb4683dcdc8f97af7821653/Engines/prop_75in2f.xml),
source SHA-256 `74a8340051eec428c033bc73c5dd8cf50198082418042357e846ee5815e5311c`,
without scaling or adding coefficient rows. Their declared advance-ratio domain
ends at J = 5. Existing geometry, inertia, Mach corrections and native integration
were retained. This source describes another C172P configuration, not the selected
C172S. The candidate's source XML and generated model are not delivered by this
follow-up.

## Observations

The inspected local WASM SHA-256 was
`d381fe8e76a01ef1edff07f04cbd4f3b7f80e85f905952d83d7ddd66219192f2`.
An independent execution of
`node studies/e1-browser/sim/engine-off-glide-native.mjs` failed with exit 1 at
**30 m/s, ignition off**, on the sustained, in-domain windmilling-drag assertion.
The run stopped there; later strict cases, restart and reset acceptance were not
reached. Seven Python preparation tests passed, establishing the exercised
source-copy and input/output-protection behavior only.

A separate measurement probe by `glide_cases`, preserved locally in ignored
`output/flight/glide-fg-probe.json`, disabled the failing windmilling predicate to
inspect all cases. Its per-case `status: pass` labels are **not accepted results**:

| Initial TAS | Observed failing behavior |
| --- | --- |
| 30 and 35 m/s | Ignition-off, idle-throttle ignition-off and mixture-cutoff cases decayed to roughly 0.00003–0.00004 rad/s with negligible propeller force; J was outside the source domain. |
| 40 and 45 m/s | Idle-throttle ignition-off cases similarly lost rotation and useful drag outside the source domain. |
| 50 m/s | Retained-throttle ignition-off and mixture-cutoff cases produced positive mean thrust, around 77 N, despite negative shaft power. They fail the intended negative-thrust criterion. |

These are 60–120 s diagnostic windows in a generic research model, with lateral
leveling, no vertical controller, clean flaps and no glide-ratio tuning. They do
not establish a steady real-aircraft polar. Local raw review failure output is
`output/flight/glide-followup-review-native.err`; those ignored logs are not a
complete versioned run closure.

The inspected build metadata also bound an earlier preparation-script hash than
the script then on disk. That freshness discrepancy independently prevents
accepting a final integrated result; it does not explain away the functional
failure. Copying a wider finite coefficient table is insufficient to solve the
native low-RPM/advance-ratio issue. No unsupported force, shaft-RPM floor,
velocity override or extrapolated high-J coefficients were introduced to hide it.
