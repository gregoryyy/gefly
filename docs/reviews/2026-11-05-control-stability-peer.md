# External control-stability peer review

Actual fresh cross-provider review: authored OpenAI/Codex, reviewed through Anthropic/Claude CLI `/opt/homebrew/bin/claude` version2.1.308, observed returned model `claude-opus-5-5`. Returned names are evidence, not backend attestation. Frozen revision214e2891aaf0438e4216dceefa4d898ccfa16d19; packetSHA256`f536b97048a6219578ecf590322819dfdd914a02b40b7fa84dcea2a97f5c1ca7`. This narrow packet does not cover preceding merged PR ranges.

Invocation: `just peer-review codex output/flight/control-peer-packet.md`. Exit2, **blocked**, not acceptance. [Returned quality findings and criterion matrix](2026-11-05-control-stability-peer.json) are retained verbatim as structured output. Runtime artifacts and packet are local ignored evidence, not fresh-checkout assets. No hidden reasoning, credentials, manufacturer manuals or aircraft model assets were supplied.

## Disposition

- Strengthen missing-loading continuation by making a different custom configuration its immediate predecessor; assert the full source payload group and reconstructed fuel baseline.
- Strengthen native diagnostics with declared70/90kt trim checks, separately marked110kt failure, independent signed aileron/rudder observations and measured before/after binary hashes. Label the sweep diagnostic, not aircraft-stability acceptance.
- Clarify optional offset comment and rudder/nosewheel/manual-override wording.
- Packet omitted the changed declaration and browser test, full app continuation and settings handlers, and final CI evidence. Declaration is tracked and type-check/build succeeds; actual browser cases cover neutral/default/input/presets/native steering. Continuation retains recorded applied axes through `continuedAxes` before deliberate manual input switches to the documented current zero-offset policy. These gaps in the supplied packet are not peer passes.
- The complete prior/new40-case comparison confirms mixed results. Overall reported instability,110kt trim, calibrated model fidelity and native build provenance remain unresolved.

Independent local reviewers assess renewed affected artifacts separately. Source changes after this frozen packet are outside its review. Peer acceptance remains blocked/partial until renewed full evidence and a satisfactory external result; this PR stays draft.

## Renewal at7512d60

After the concrete harness fixes and supplied full declarations/browser/app handlers, a fresh invocation used revision7512d608c86784bf8e67ca77ab8f99ae9ba1e2b8 and packetSHA256`0ae9571a948b07ed2335ff727de12760ef2711c10255484e869c630674be048e` (314328bytes). ActualClaudeCLI2.1.308 timed out at180seconds; no completed review or model identity was returned. [Renewal envelope](2026-11-05-control-stability-peer-renewed.json) records `reviewer_timeout`, blocked, not acceptance. The original completed blocked findings remain historical; affected local quality/validation were independently renewed. Final sharedCI at7512d60 passes with nine optional study skips. No peer-covered-range advancement is claimed.
