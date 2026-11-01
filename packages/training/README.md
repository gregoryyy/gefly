# Training

The first implemented slice is the pure TypeScript assessment airspeed mapper
and repository-data adapter specified in
[ASSESSMENT-AIRSPEED](../../docs/design/ASSESSMENT-AIRSPEED.md) (AA1–AA6).
They use the 16 existing POH calibration points for normal-static flaps 0/10/30°,
selecting a detent within inclusive ±0.5° as an instructional choice. Mapping
inverts the stored SI anchors by linear interpolation and never extrapolates.
Unsupported flap positions and invalid samples are unavailable; out-of-range CAS
returns a boundary point with null IAS, not an accepted exercise criterion.

[airspeed-calibration.ts](airspeed-calibration.ts) adapts a parsed repository
source object and a caller-declared SHA-256 of its exact file bytes. It checks the
hash format, not the binding between those bytes and the object. The trusted
caller must establish that binding. This is not an untrusted-file importer.
The adapter copies and recursively freezes consumed data while preserving source
identity, conditions, citations and the current `draft`/`not validated` labels.

[assessment-airspeed.ts](assessment-airspeed.ts) derives evaluator-only
`cal_ias_mps`/`cal_ias_valid` from CAS in m/s and flap angle in radians using the
[shared types](../contracts/assessment-airspeed.ts). These fields belong outside
`ind` and the simulation/replay digests. Future assessment records must pin the
source, mapping and evaluator artifacts and rederive values from recorded
per-step CAS/flaps; no recorder or replay integration is implemented here.

Run `just test-training` with Node.js 24.2+ for the offline module tests. The core
and tests use built-in TypeScript support without package installation or new
dependencies. Module tests do not establish aircraft fidelity or learning benefit.

The broader boundary remains reserved for selected EASA PPL objectives, scenarios,
declared assists, recorded criteria and observable debrief; CPL follows later.
This slice supplies no band classifier, exercise pass/fail, ASI or pitot-static
instrument model, dynamics, browser application, lesson set or instructor
endorsement. A source-backed ASI model and training validation remain separate
work; model agreement, learning benefit and approved training credit require
separate evidence.
