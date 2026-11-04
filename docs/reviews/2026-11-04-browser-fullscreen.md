# Browser fullscreen: scoped review

Reviewed 2026-11-04 10:32 Europe/Berlin by Codex subagent `glide_housekeeping`, independently of implementation; own exact input excluded.

**Quality: pass; no blocking findings.** Trusted gestures call native fullscreen on `document.documentElement` before awaiting. Labels follow actual native state; async/synchronous failures restore the button and report a useful message. Unsupported capability is disabled; absent fullscreen state is false. Listener cleanup and disposed/pending guards are consistent. Integration changes presentation/focus, not flight state.

**Validation: pass for F/View native fullscreen; physical native Escape not evaluated.** Inspected the final test and author-run `output/ci/fullscreen-browser.log`: **five groups passed** in Chrome 156.0.8078.80. Covers F/View entry and exit, repeat/editing/modal/menu/modifier guards, independent Alt+Shift+F, whole-document/body-dialog inclusion and actual resize (1200×800: scene 493px/deck 307px; both gauge rows/AP inside viewport). Actual running flight progresses; paused and Review step/digest/state remain unchanged without reinitialization. Explicit fixtures cover unsupported/rejected APIs.

The headless Escape attempt reported `escapeExited:false`; F performed the exit. Native event-driven labels are verified, but physical browser Escape requires a desktop check and is not claimed passed. Inspected author-run TypeScript log `output/ci/fullscreen-check.log`; `git diff --check` passed independently. No aircraft-fidelity or cross-provider-peer acceptance; peer pending.

Source packet SHA-256: `552e72bbb91c8818b305a4c63cf55220109c066402f29e17fa4e987d2a220a67` (sorted `path + NUL + file SHA-256 + newline`).

| Source | SHA-256 |
| --- | --- |
| `app/src/fullscreen.ts` | `b2ae829972c5f19777b3a01ad6a19d63d215f2b5acb82206861fa7aeea66d59a` |
| `app/src/main.ts` | `01b13273fb6ef84b19254915be3da32d3b4dc1cce77368a66f3ae2fba7a371a0` |
| `app/tests/fullscreen.browser.mjs` | `6be8a1f9c5adc92918ed3a87f6e9e578327b8d11d598c368ee789be78923a38b` |
