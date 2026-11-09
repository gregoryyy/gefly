# Credits menu quality review

Reviewed 2026-11-05 15:40 Europe/Berlin by Codex quality, independently of the
Codex implementation authors. TODO2.0.145 / R-UX-2 and R-WORLD-11; scoped working
tree based on `700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded review: no unresolved blocking findings.** Only this assigned
report is written. [User request](../input/2026-11-05-credits-menu.md): move the
multi-line scene attribution into a Credits menu beside gefly. Specification
validation remains separate; cross-provider peer remains pending.

## Finding resolved

**Medium — flight shortcuts bypassed the new menu.** Initial
`app/src/flight-assists.ts:blocked()` checked only the View and Flight menu IDs.
Source reproduction: open Credits, leave focus on its summary/link, then press A
or =; capture-phase assistance could toggle AP or pacing despite main's open-menu
guard. Expected: credit interaction must not issue flight shortcuts. In addition,
Cesium's auxiliary attribution dialog is a `div` in document.body, so clicking its
interior could close the parent Credits menu and evade `dialog[open]` guards.
This was identified by source review; no reviewer browser reproduction is claimed.

Final affected review confirms generic `.top-menu[open]` and visible native-popup
checks in flight-assists, plus native-popup recognition in main's `menuOpen()`.
The outside-pointer handler keeps Credits open for native-popup interaction.
Installed Cesium CreditDisplay source confirms interior clicks do not dismiss its
lightbox or cancel credit links, and Escape/close returns focus to its opener.
Keeping the parent open preserves that visible return target. The initial source
mechanism is repaired. Auxiliary-popup behavior remains source-reviewed only:
all currently active provider credits are inline and its native opener is hidden.

## Source and evidence

`createScene(container, creditContainer?)` redirects the actual Cesium live credit
container, rather than copying or filtering its provider/source/licence content.
The app supplies the menu host; standalone scenes retain the original footer.
The external-host popup uses document.body, avoiding details clipping. Widget
constructor failure removes the owned credit node; normal disposal destroys the
native credit display/popup, removes that node and disconnects the observer.
The scene status avoids measuring external menu credit height as a scene footer.
No provider registration, resource route, storage, aircraft/model or source HTML
content changes are introduced by this relocation.

Native details/summary provides keyboard opening and link access. Escape restores
summary focus; other top menus are exclusive and outside clicks dismiss Credits.
The bounded, scrolling/wrapping panel and narrow header rules were reviewed.
Root's final ignored observational browser run completed exit0. Its JSON records
no credits left under the scene, live source links in the menu, Enter opening,
Escape focus return, exclusive View opening and outside dismissal at620/390.
Panel bounds stay inside those widths; document scrollWidth equals viewport width.
Reviewer read the observational script/JSON and inspected desktop/390 screenshots:
readable credits and reachable header controls are visible. Actual screen-reader
output and link navigation destinations were not exercised.

After ready/Paused, the manual observation records unchanged rate text after =
and the AP control still labeled disengaged after A. This is UI observation,
not a new native digest/command-log or running-flight proof. The attempted hidden
auxiliary-popup probe is preserved as unexecuted coverage, not a popup pass.
Source review supplies the bounded popup guard/link assessment above.

No new tests or reviewer browser ran for this reversible UI change. Root's final
existing suite records **537 Node + 22 Python tests passed, zero failures/skips**;
production build passed in38.92seconds. Reviewer independently audited all **17**
final packet pins against bytes. No broad browser/device/performance matrix,
licence sufficiency/legal approval, aircraft fidelity or native-build provenance
acceptance follows.

## Frozen identity

| Path | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `969f0426c3f28a8f32f433d7b652b678b992e745dd599d0c8152bedb094ce978` |
| `app/src/scene.ts` | `4fa627df5ac0b7554a259ae09df5669aaec70fd4838de758e6a0d32a382d803a` |
| `app/src/style.css` | `35302e486becb60e54af1f60843cd80069b6587db9c86d720baa7a75bf2a8309` |
| `app/src/flight-assists.ts` | `0a091586d26e5dbf886dc6bbd5e597b6a478d579e9f57b7576bc7c23ff78f157` |
| `output/flight/credits-task145-packet.json` | `d5e0e9450a6bad7b536a9b9f0c636ad6a043256ba355624e6480b47619baa499` |
