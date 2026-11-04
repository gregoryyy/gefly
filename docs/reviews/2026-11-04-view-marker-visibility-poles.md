# View-marker visibility and vertical reach: scoped review

Reviewed 2026-11-04 10:23 Europe/Berlin by Codex subagent `glide_housekeeping`, independently of implementation; own exact input excluded.

**Quality: pass; no blocking findings.** Actual normalized body-forward/camera separation controls auxiliary cues with finite guarding and 25° show/22° hide hysteresis; default chase 20.14° clears them. Front projection remains independent. Continuous bounded margin acceleration preserves ordinary central drag response and has no timer/release drift. Analytic camera direction/up vectors remain orthogonal at exact poles; changes are view-only.

**Validation: pass for this increment.** Independently ran `node --test app/src/pointer-yoke.test.ts app/src/aircraft-orientation.test.ts`: **28 passed**, covering small moves, monotonic cockpit mapping, edge/repeated drags, retained anchors and finite pole frames. Inspected author-run `output/flight/view-directions-browser.log` and `forward-marker-browser.json`: **eight groups passed**, including actual centered U/D, front-only/significant-look visibility, retained Review seeking and paused native step/digest/state invariance. Fresh front-reset/right screenshots confirm the visual change; existing FOV/viewport/chase checks pass.

Cockpit endpoints align with aircraft-body U/D; heading/horizon-relative chase reaches world vertical, which differs from body U/D at pitch/bank. No aircraft-fidelity or cross-provider-peer acceptance; peer pending. `git diff --check` passed.

Source packet SHA-256: `0b78518ab214dc33bf0dbb99d0d7c99c1555abc20789bb86bd2f2e90c7324620` (sorted `path + NUL + file SHA-256 + newline`).

| Source | SHA-256 |
| --- | --- |
| `app/src/aircraft-orientation.test.ts` | `2f1a8a42803b6e59d86e861601aef5054456837f7093310fba9f7b7dec753f55` |
| `app/src/aircraft-orientation.ts` | `87a24b8ff21f8dd8b9cdcd5de17c92295f370fbd4658fe871b7f547afb498d02` |
| `app/src/forward-marker.ts` | `83de7957acf645fd9f348eb1c7928dba5e8148a04b2ce963b6162a0a17ba1305` |
| `app/src/pointer-yoke.test.ts` | `05f4e1a18d23b9828b6f6f9034740226369b36c931c26f3f49faa2a3d50ac04c` |
| `app/src/pointer-yoke.ts` | `be028a4e37cafd69a25948cac5b211efd8b5e9396a0364cd920e5c6c750431e6` |
| `app/src/scene.ts` | `fae07d6224dd189329a3a481be8041b95a8db61020c9fa261740d1769904e2e2` |
| `app/tests/forward-marker-smoke.mjs` | `303f2d5614d70928d500542f25d616fbff903b9558c7fdc368a717133da86394` |
