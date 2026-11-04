# Aircraft loading and fuel: scoped review

Independent reviewer: Codex subagent `glide_housekeeping`; own exact input excluded.
Quality: pass. Source/model review confirms six pinned generic c172x payload stations, native tank capacity/density, mass/CG and fuel delivery; no invented C172S loading limits. Apply explicitly restarts; ordinary edits do not change live mass. Continuation editor configuration is synchronized with the reconstructed native load.
Validation: pass for this increment. Inspected author-run native evidence: adding 300kg changes mass/CG and reduces five-second ground-run speed 9.72→6.82m/s; 30s powered fuel drop 0.388L corresponds to 0.307kg mass reduction. Cutoff, starvation and modern/legacy continuation cases pass.
Inspected the single actual browser result `output/ci/loading-browser.log`: configured takeoff mass 889.066kg and selected tanks match native state; powered flight consumes 0.013194L and reduces mass; restart retains configuration. No reviewer reruns or broad checks.
Recordings preserve the optional complete loading group; partial groups reject. Old recordings remain readable with unavailable mass fields, and continuation visibly states its source-default loading assumption rather than reusing a custom live payload.
This is generic model loading/fuel behavior, not an approved weight/CG envelope or aircraft-fidelity acceptance; ignition-off fuel delivery follows the stock model and mixture cutoff stops it. Cross-provider peer pending.
