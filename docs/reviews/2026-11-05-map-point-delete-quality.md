# Selected map point deletion quality review

Reviewed 2026-11-05 15:48 Europe/Berlin by Codex quality, independently of the
Codex implementation authors. TODO2.0.146 / R-NAV-5; scoped working tree based on
`700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded review: no blocking findings.** Only this assigned report is
written. Specification validation is separate and cross-provider peer remains
pending. The [user input](../input/2026-11-05-selected-map-point-delete.md) has an
explicit custom-fix implementation assumption; published-point hiding is still
an unanswered optional question, not delivered scope.

`map-point-popup.ts` adds a native Delete GPS fix button only for custom points
with a supplied action. It operates on the existing frozen point copy and renders
failure through inert `textContent` in a `role=alert` paragraph. Styling adds only
a full-width button row. No confirmation workflow or native flight command is
introduced.

`practice-map.ts:refreshPointPopup()` supplies deletion only when ID, coordinates
and source provenance match a current library fix marked custom. The callback
rechecks disposal, current popup identity, selected object identity, current
content identity/connectedness, current ownership and the target's full identity
before calling the existing `remove-fix` action. Replaced, removed, filtered or
closed popup content cannot delete a newly selected point through a retained
button. Source navaids do not receive this destructive action.

The unchanged store protects route-referenced fixes before mutating the collection;
failure preserves state and returns the useful remove-from-plan error. Successful
change notifications remove the custom marker/search entry and selected popup,
clear a matching custom direct-to target and invalidate GPS/planner paints. The
bearing display consequently follows its existing no-GPS fallback. No radio,
AP, native terrain, aircraft or recording write is added. Current plan data remains
separate from recorded aircraft state; no new persistence or resource path exists.

Root's ignored actual-browser manual observation completed exit0 with no page
errors. Reviewer read its script/JSON and inspected the reference-error screenshot.
It records active USER-0001 GPS deletion leaving zero fixes, no marker/popup and a
hidden GPS readout with its normal selection placeholder. USER-0002 is retained in
both library and route when referenced deletion is attempted, with the visible
inline error. Removing its route reference through the actual editor then allows
popup deletion, leaving both collections empty. This is scoped UI/store evidence,
not a new automated regression matrix.

Root reports the existing **17 model tests passed, zero skips**, TypeScript passed
and production build passed in6.80seconds. Reviewer independently checked all
**15 packet pins** against current bytes. No new tests or reviewer browser ran for
this reversible UI increment. Published-point exclusion, stale callbacks, search
cleanup and bearing fallback were reviewed by source; no new stale-callback,
running/Review/native-digest, screen-reader or narrow-device runtime claim follows.
No broader aircraft, navigation-authority or native-build provenance acceptance.

## Frozen identity

| Path | SHA-256 |
| --- | --- |
| `app/src/practice-map.ts` | `cd0a431eae60c53566ef564143a1097778fe1bf5489b9f989b3b2c96a78c26e2` |
| `app/src/map-point-popup.ts` | `42e5746a396b0b55c06bdf674141c2dab5a3d1aa539f21612bb113192ffb1d11` |
| `app/src/map-point-popup.css` | `87fb7934af69231d7b6c20eaa67b98a1ef77d5d97bb996030b300ab159a742b8` |
| `output/flight/map-delete-task146-packet.json` | `11360f6534461ece915ff0f356dd34c4372588dc9de7d1af54dc75e008be61d3` |
