# Ground-collision grace: scoped review
Independent reviewer: Codex subagent `glide_housekeeping`; own exact input excluded.
Quality: pass; source uses valid pre-step horizontal ground speed <10 kt AND signed downward speed <2.5 kt, with strict bounds and no mask/depth/WOW exception; raw geometry/native physics are unchanged.
Validation: pass; reviewed the final boundary table and author-confirmed existing collision module result: 12/12 passed. Equality/either limit exceeded latches, below-both/ascent clears, and missing motion fails closed. No reviewer rerun.
This is the requested simulator collision policy, not an aircraft damage threshold or fidelity acceptance; cross-provider peer pending.
