# Yoke center marker: scoped review

Reviewed 2026-11-04 10:10 Europe/Berlin by Codex subagent `glide_housekeeping`, independently of implementation; own input excluded.

**Quality: pass; no blocking findings.** `getCenter()` returns a fresh read-only observation of the actual relative anchor or resized scene midpoint; it emits no controls. Main renders viewport coordinates using fixed positioning. The 14px, opacity-0.3 ring is decorative (`aria-hidden`) and noninteractive (`pointer-events:none`); no native/physics code changes.

**Validation: pass for this visual increment.** Relative/centered positioning and hold-look retention are covered by source review, units and actual-browser assertions. Off, disabled, disposed, Review, invalid scene bounds and off-scene anchors return no point; resize follows the current scene. Existing browser checks retain paused native step/digest/state and read-only Review isolation.

Independently executed `node --test app/src/pointer-yoke.test.ts`: **18 passed**. Inspected the extended existing browser test and author-run `output/ci/yoke-center-browser.log` / `output/flight/pointer-yoke-browser.json`: **six check groups passed**, including marker coordinates/hiding. `git diff --check` passed. No new test harness, visual-fidelity claim or cross-provider peer acceptance; peer pending.

Reviewed source packet SHA-256: `0d50cf8c14346a26062b9c43a16e386d2f818dc4a13c0b7846becba8a250aed3` (sorted `path + NUL + file SHA-256 + newline`).

| Source | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `7c363bd794f19f96ae1c9ea1611878537a38f23a1d9c97accb2a2ad739feddcd` |
| `app/src/pointer-yoke.test.ts` | `6fb816a8c37296f7bbf657d6274b9af80afd2a9ed84f68f05aa8026944972228` |
| `app/src/pointer-yoke.ts` | `b5a09874d57275f694f459b7f2e36d7ecdf3b80b6410669424795fec4881cb0a` |
| `app/src/style.css` | `00cfa78fea2f848a7ee1e8cd150810d074aecbba497fa2ae8bd2b718219f4b23` |
| `app/tests/pointer-yoke.browser.mjs` | `c51ffe6b415e2a08599061b06d3a8350aa3a1a2e0f449fb820dbf1a62080b8f1` |
