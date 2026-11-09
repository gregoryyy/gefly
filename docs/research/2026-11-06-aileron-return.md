# Aileron return after a roll input

Recorded 2026-11-06 10:24 Europe/Berlin by Codex orchestrator. Task2.0.153, R-SIM-11/R-SIM-5/R-INPUT-1. Bounded control-return repair; wider handling stays open.

The user describes [ball-like instability, initially roll](../input/2026-11-06-ball-like-roll-instability.md). [Primary sources](2026-11-06-disturbance-stability-sources.md) separate restoring tendency, damping and spiral behavior. A bank angle need not automatically return to zero; a retained control-surface deflection must be excluded before calling a release an unforced disturbance.

## Confirmed mechanism

The exact current c11a933… engine embeds source aileron hysteresis widths0.005rad. At the same returned manual command and fixed trim, either preceding pulse direction leaves both surfaces displaced by opposite0.0025rad amounts (effective aileron±0.143239°). This persists20seconds. Signed0.5-second pulses±0.02/0.05/0.1 at60/80/100kt CAS were declared before execution; APoff, flapsup, normal loading, source-derived fixed trim/throttle, still-air default atmosphere and1/120s stepping. Neutral fresh flight stays near equilibrium. The matched-neutral diagnostic separates changed moments from ordinary bank persistence.

At80kt, +0.02 input leaves+8.46175° bank relative to neutral20seconds after release and+0.32555°/s roll. With only both aileron hysteresis bands zeroed, surfaces return exactly, bank is+0.47569° relative to neutral and rate−0.00717°/s. All18signed roll cases return both surfaces to their pre-pulse positions. A further within-flight alternating sequence checks54paired settling samples across60/80/100kt; all return exactly. The rate check is only a sampled sanity guard, not formal damping/settling or aircraft-stability acceptance.

A fresh control link reproduces old WASM bit-for-bit. Normal v5 build matches the isolated two-number candidate exactly (266f2016…). Adapter/model checks preserve every other prepared XML byte and the AP file. No source aerodynamic coefficient, gain, mass, rate limit or continuous wings-level aid changes. The pinned c172p direct-control model is corroborating source for this mapping counterfactual, not applicable manufacturer rigging data.

## Actual application

Isolated Chrome contexts use the actual localhost app/Worker/native flight, synthetic scenery pixels and read-only observers. Product pointer centering and keyboard release produce zero external axes. Both directions retain the old±0.0025rad surfaces and grow bank; v5 returns both surfaces exactly. One right-pointer observation changes2.53→10.64°bank over20seconds on old engine versus3.06→2.49° on the candidate. Actual gesture timings vary; these browser cases are observations, not matched-force reference trajectories. Neutral flight is identical. Camera geometry checks and paused view switching preserve native state/digest.

The virtual yoke is position control: lifting a finger without moving the pointer does not center it. The repaired case is after actual centering/keyup, not inactivity-driven control cancellation. Existing behavior remains.

## Evidence and limits

[Compact observations](../reviews/2026-11-06-roll-return-observations.json) pin original/full artifacts, native/model/checker/harness hashes and exact selectors. Reproduce after building the local runtime with `npm --prefix app run test:roll-return`. Its strict telemetry admission rejects empty/partial/duplicate/nonfinite/forged samples and active commands; the old engine fails on real retained surface bias. `npm --prefix app run test:roll-return-browser` requires `just fly` from the same checkout; use explicit source-root/origin overrides for a different serving checkout.

[Quality](../reviews/2026-11-06-roll-return-quality.md) and [validation](../reviews/2026-11-06-roll-return-validation.md) distinguish independently executed tests from inspected authored browser evidence. The generic1982P model remains unvalidated for the selected172S. Pitch hysteresis,110kt trim, source-data rights and wider handling remain open; no numerical aircraft-tolerance, automatic self-leveling or training-credit claim.

## Final source and peer coverage

Frozen source40f7493 and its nine-file manifest3e4a2dc4 receive accepted Claude peer quality/specification review. The sole later package registration deltaaea4d10 has a separately accepted peer supplement, and independent quality/validation verify the updated manifestc2deb073. [Peer records](../reviews/2026-11-06-roll-return-peer.json) retain actual CLI/model metadata, packet hashes, separate criterion rows and remaining nonblocking findings; this is scoped control-return coverage, not a full aircraft milestone. Earlier incomplete assertions/metadata were repaired before this coverage.
