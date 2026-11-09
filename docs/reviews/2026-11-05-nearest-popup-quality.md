# Nearest-name popup quality review

Reviewed 2026-11-05 12:49 Europe/Berlin by Codex quality, independently of the
Codex implementation author. TODO2.0.136 / R-WORLD-7, working tree based on
`700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded quality review: no blocking findings.** The scoped source
review is the primary evidence; no unexecuted browser criterion is counted as
passed. Only this assigned report
is edited. Cross-provider peer remains pending; no exact model/CLI identity or
aircraft-fidelity approval is inferred.

Scope: the three scoped additions in `app/src/landmark-labels.ts`, against the
[new user request](../input/2026-11-05-nearest-popup-dismissal.md), current
[SPEC](../SPEC.md) and SEC's landmark cancellation/inert-text boundary.

No critical, high, medium or low defect found:

- Lines 44–46 use `lookupBox.contains(event.target)` for Node targets, preserving
  inside descendants. Hidden popups are a no-op. An outside pointer press calls
  the existing `hideLookup()` before child handlers can stop bubbling, because
  the document listener runs in capture phase.
- The handler calls neither `preventDefault()` nor propagation stops. Normal
  scene/UI actions remain eligible; opening a new context menu can replace the
  old popup through the existing lookup path. No native input, camera or worker
  command is introduced.
- `hideLookup()` synchronously aborts and clears the active request, then hides
  the popup. Existing success and error callbacks check abortion/request identity
  (and disposal); late success or failure cannot reopen the dismissed popup.
- `dispose()` removes the same named document handler with capture `true`,
  alongside its existing context-menu removal and request/source cleanup.
  Idempotent disposal and popup subtree removal retain bounded listener lifetime.

Reviewer inspected the exact scoped diff, surrounding lookup lifecycle and
applicable requirement/input records. No new tests or browser execution were
needed for this reversible listener change; no tests were authored or changed by
the reviewer. Root reports a successful production build. Existing browser
regression execution and independent specification validation belong to their
respective runners; their results are not invented or prerequisite claims of
this source review. No full map/engine review, hardware/browser matrix or
publication gate is claimed here.

| Path | SHA-256 |
| --- | --- |
| `app/src/landmark-labels.ts` | `26d9d2520edae09639ee66f6bac87ca72c4b26c32728fda9528b2030c9c34d22` |
| `docs/SPEC.md` | `42171d807ff3b1b7bee2c4d211a03a55155d3262b1bac4c17697a5244985c1ec` |
| `docs/input/2026-11-05-nearest-popup-dismissal.md` | `fa3babab27987ea3862e22a2f562715f2bfe8b13b298b776a157b8e5da0d93f5` |
