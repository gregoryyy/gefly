# Adjustable keyboard and button wheel braking

Scope: TODO 2.0.38; affected R-INPUT-1/R-SIM-8/R-REVIEW-1. Base: `653fa08`
(PR #47 terrain increment). Authors: Codex orchestrator on integration, button
presentation and shared records; fov_input/code1 on input gain/settings/tests;
engine_sound_ui/code2 on actual-browser native/worker/UI regression. Parallel
housekeeping fov_housekeeping records the user input and independently reviews
non-authored code/criteria. Cross-provider peer remains pending; the previously
recorded timed-out packet does not cover this correction.

Frozen eight-path source/test packet SHA-256:
`5cc352c716edc0989838d2c8d63750917597d5855a81176c732e561cea8ae4cb`.
Changed/new non-Markdown app paths are sorted and hashed as
path + NUL + bytes + NUL. Native/WASM and terrain package bytes are unchanged.

## Diagnosis and resulting behavior

B/the button previously sent an immediate maximum normalized brake command.
Actual flat and public-terrain fixed-step fixtures reproduced the prop collision
bit while the nose strut compressed. This was not an ordinary wheel contact being
misclassified: the source-defined model propeller disc also crossed the surface
under high commanded braking. The generic model uses linear nose-strut response;
installed travel/bottom-out and aircraft braking fidelity remain unvalidated.

The source comparison uses the pinned JSBSim v1.3.3 c172x thruster at structural
(-37.7, 0, 26.6) inches, the prop_75in2f diameter of 75 inches, actual changing
structural CG and the same terrain-plane normal. Code1 independently verifies
these constants and StructuralToBody signs. Illustrative rendered geometry is
kept distinct from this source-data diagnostic.

Options now exposes a 0–100% **Wheel brake command** preference. B and the brake
button use 25% initially, with the selected command visible on the button. This
is a session input gain, not aircraft pressure, a safe-braking limit or a physical
coefficient. Both presets restore 25%; axis-only edits and Flight restart preserve
a custom selection. Release/pause/focus clearing and staged paused controls retain
their existing semantics. Recorded Review shows captured applied brake values;
missing historical values display unavailable, rather than an invented zero.

## Executed evidence

Eight author actual Chrome/WASM regression groups exercise normal flat/public landing,
app keyboard/button input, Options endpoints/presets, custom restart persistence,
frozen paused controls and read-only Review. A separate compatibility fixture relays actual worker states with the complete cockpit group omitted; native raw values remain finite while the older-state UI shows disabled unavailable brake data and leaves the native digest frozen. At 25% command both 3600-step rolls
reach rest without collision and match the unmodified native final state/digest
exactly: flat `886d131263744a02`, public `546e4e9546eaac33`.
Explicit 100% braking still produces propeller contact; a separate intentional
nose-low descent still latches its first actual collision.

The diagnostic four-command sweep (25/50/75/100%) is local evidence in
output/flight/ground-braking-pressure.json. At 25%, source-model minimum tip-plane
clearance is approximately +0.061 m in both fixtures; at 100% it is approximately
−0.158 m. These are repeatable research trajectories, not validated aircraft
operating limits. Original failing traces are preserved separately in
output/flight/ground-braking-before.json. Final browser evidence is
output/flight/ground-braking-browser.json and its log/Options screenshot.

Eleven focused input-gain tests pass, including bounded input, absent-field
preservation, compatibility fallback and explicit full-command access. Existing
classic cockpit and recorded-control actual-browser regressions pass with the
new applied default. No native physics, collision predicate, terrain data or WASM
was changed. Relevant runtime evidence from the terrain increment retains its
original source scope; this review covers the changed input/UI layer.

## Independent review and final gates

Independent quality and validation both pass at the frozen eight-path packet.
fov_housekeeping independently executes all eleven unit tests and all eight
actual-browser groups on its own local port, then closes its browser/server.
The Review unavailable-data finding is repaired and its actual compatibility
fixture passes. No implementation findings remain. Authored raw input prose is
excluded from independent acceptance. Exact scoped outcomes and unchanged-source
binding are in output/flight/independent-ground-braking/review-outcomes.json.

`just ci` exits 0: 238 repository-tool tests (one live-provider case skipped),
162 app Node tests plus five Python adapter tests, 84 assurance tests and eleven
training tests pass. Nine of 23 optional Python JSBSim study cases remain skipped
because that package is unavailable. Native/browser fixtures execute separately;
these skips are not physics passes. Indexed-content whitespace passes.
Production build and foundation checks pass. Assurance reports zero integrity
errors with existing advisory warnings. The final lineage diff against `653fa08`
is inspected for the affected requirement, new tasks/input/review and completed
bounded work, preserving open 2.0.39 and historical records.

Publication updates the existing terrain PR #47 after a fresh target fetch and
clean local merge-tree check; the final pushed head is checked for GitHub
mergeability. The target remains PR #46's feature branch, so hosted main-target
CI is not triggered; the shared gate results above are local.
