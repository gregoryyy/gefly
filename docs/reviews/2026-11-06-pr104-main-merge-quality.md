# PR104 main-merge quality review

2026-11-06 18:11 Europe/Berlin. Independent QUALITY: Codex
`/root/ofm_housekeeping`; merge implementer: Codex `/root/nav_receiver_trace`.
Reviewer writes only this report, not implementation or shared status.

## Frozen source and disposition

Reviewed `/private/tmp/gefly-persistent-options` merge
`a66e7ebf701f3c9c98efdc990a10770dc57fbb8e`, parents settings
`d0ce5c8fdaa1cda28ceaf15b387c35845e534d28` and current main
`59b39a847920e017d4b976995ec2a9985145e061`.
Scope: renewed integration quality for Task173, R-UX-2/R-INPUT-1, after main's
worldwide discovery, on-demand airport generation and control-hook changes.

**No blocking finding in the merged source.** Final merged browser and CI are
pending at this source review; old browser observations are not current passes.
This does not independently reaccept all original settings or inherited main
features, aircraft fidelity, hardware/browser compatibility or cross-provider peer.

## Source and merge checks

The only manual conflicts were package scripts, GAPS and TODO. Independent
inventory comparison confirms all script keys, Node test-file arguments, Python
tails and browser command components from both parents remain; dependency and
development-dependency objects are unchanged. The settings browser command and
worldwide/airport browser commands remain available.

Fence-aware DONE comparison confirms all182 entries from each parent remain as
complete unchanged normalized records. All input-index links survive. GAPS and
TODO preserve every nonblank line from both parents, retaining dated decisions,
Task173 and main's separate completed/open scopes.

The complete `main.ts` delta from the settings parent is the worldwide-source
limitation paragraph. Its executable persistence/control hooks are unchanged.
The settings-panel delta is only the inherited generic PAPI description. The
settings/view preference modules, engine audio implementation and browser harness
are byte-identical to the settings parent. There is no silent replacement of main's
native initialization, pointer pickup or airport source behavior.

The restored preference boundary remains a strict1024-byte versioned local record
with exact fields, finite bounded gains/offset/volume and boolean toggles. Invalid,
unsupported and denied reads fall back to independent defaults without rewriting
stored data. Saves capture selected fields before validation/serialization and
do not store aircraft, held commands or playback state. The display record is
separate. Save persists committed choices; Escape/backdrop rollback first restores
panel controls, then opening roll/audio values, without a persistence write.
Quick sound actions are guarded by dialog/typing/activation checks. Startup
applies saved sound choices without unlocking audio or starting flight.

Saved control preferences enter the existing input-gain/mixing path; the explicit
experimental roll offset remains separately labeled and suspended under AP. No
new flight-dynamics coefficient, unit conversion, receiver signal or terrain
surface is introduced by this merge. This source review does not establish that
a saved nonzero experimental offset is a calibrated aircraft trim.

## Independent execution and identity

Executed `node --test src/settings-preferences.test.ts src/view-preferences.test.ts`
in publication `app`: **15 passed, zero failed/skipped**. Cases cover exact
boundaries and false/zero, strict schema/future/flight-state rejection, corrupt or
denied/oversized storage, detached snapshots, hostile/live getters, legacy display
records and palette preservation. Browser Save/Cancel/native-state/audio behavior
requires its actual merged run, which is not complete at this report revision.

| Reviewed artifact | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `355580362298b0a938ba793445f218508ad72607a5f41ceeea02c5f9879039d8` |
| `app/src/control-settings-panel.ts` | `761592d1e849646d9ef46c11de292217a6bc39dce19ad9e7a766971b02b98ac1` |
| `app/src/settings-preferences.ts` | `b5fb5230d909357e3ebc24878946a3dc5823f58007408151deb4bd8c28c63295` |
| `app/src/view-preferences.ts` | `6c8053fa1fee76f5a1c2cb64bbc7555e519cbda42d7cf88142712035cd7a4b9b` |
| `app/src/audio-controls.ts` | `42a5376d36c77658df89ef9204c6078ea104fecacc127d00dcf87d8ae76e7548` |
| `app/tests/settings-preferences.browser.mjs` | `b1548f9815758653fdf616b890e05ba65c6995f868dbf5447f2a1b5309856725` |

No full CI or browser was relaunched by reviewer. Current merged browser, final
shared CI, TypeScript and assurance check/diff remain integration evidence to
renew before publication claims. Cross-provider peer remains pending under the
batch cadence; source review does not substitute for that gate.

## 2026-11-06 18:40 — Final merged runtime and integration renewal

Independently inspected the final frozen `a66e7eb…` evidence in the publication
checkout. This renews Task181's actual59b39a8 main integration; it does not accept
later changes merged into main. No PR104 source changes were made by reviewer.

`output/flight/settings-preferences-browser.json`, SHA-256
`717a98a699b31bd8c1d385116f03f5f0c7060000061821a7ad7eb2cab13eb52a`,
records nine passing groups in Chrome156.0.8078.80, with no page errors. All five
recorded source/harness hashes match the current frozen checkout. The reviewer
inspected the artifact; the implementer executed the browser. The runtime summary
`output/flight/pr104-merged-runtime-summary.json` hashes to
`28bfd8acedd14d09556754599f42c4897a982f77784c35cea42741f7bc63825a`.

The final `output-pr104-final-ci.log` hash independently matches
`5085fbef0713be15bbf42cf22be01f292f5117431a3416bc73c3db6cd79975ab`.
It terminates successfully for executed checks:626 application Node,32 application
Python,89 assurance and11 training tests. Integrity reports44093 nodes/60947 facts,
zero errors,226 warnings and138 notes. Whitespace passes3206 tracked paths.
Nine unavailable JSBSim-study cases and one Linux-only repository-tool case
remain skipped, not accepted passes. The working Python3.11.12 command is explicit
in the runtime summary.

Initial CI and first serial assurance runs retained an AS6 child status-null
failure (88/89). The quiet unchanged original suite subsequently passed89/89, and
the complete final CI passes. The temporary ignored diagnostic observed successful
commands under the unchanged15-second child budget; it did not capture the
original failure's spawn error. Therefore load-related causation remains an
inference. No source change, deadline relaxation or failed-run relabeling is used
to obtain this renewal.

Independently parsed `output-pr104-final-assure-diff.log`, SHA-256
`ae90f7681973bb246f5e4b54f0aa0e9ab6d4217bddaeb2327f97c122377a63c6`:
base59b39a8 to worktree has38 added,233 changed and zero removed identities, with
untruncated impact. No acceptance criterion is promoted by the merge; unchanged
source/catalogue evidence retains its declared scope and freshness limits.

**No blocking quality finding remains for the reviewed PR104 merge.** Final
publication bookkeeping belongs to the orchestrator. This does not substitute
for independent specification validation or cross-provider peer, nor establish
aircraft, operational-source or training fidelity.
