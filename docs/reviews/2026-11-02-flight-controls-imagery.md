# Flight controls and stable starter imagery

Scope: TODO 2.0.1; partial R-INPUT-1, R-VIEW-1, R-UX-1 and R-WORLD-1.
This accepts the experimental usability/visual slice, not complete requirements,
172S fidelity, a PPL exercise, the EDDF/100 NM region or a simulator milestone.

Authors: Codex orchestrator (integration/local imagery), flight_ui_v2 (UI),
flight_scene_v2 (renderer/visual), scene_sources (primary-source research),
flight_housekeeping (application instructions, in parallel with implementation).
Implementation SHA-256: `96c465c640c8711ff9cfb01ff5e7473bcdc28579cec8d4ed5590114ae7400414`.
Fingerprint input is the sorted set app/src/*.ts, app/src/style.css, app/index.html,
app/vite.config.ts, app/package.json, app/package-lock.json, app/tsconfig.json,
app/tests/smoke.mjs and app/public/imagery/*, each path + NUL + bytes + NUL.
Shared status/review prose is excluded.

## Independent quality

Reviewer: Codex flight_housekeeping, excluding its own application README.
Reviewed control capture/release, focus/pause/start behavior, units/camera signs,
Cesium assets/middleware, failure/disposal handling and image provenance.
Scoped quality and affected delta reviews passed; no remaining blocking findings.
Type checking and the five session tests passed.

The credit container is now independent of the Cesium widget, and resize occurs
only after container resize. Both bundled JPEG dimensions/byte hashes and scene
bounds match SOURCE.json; the detailed image is byte-identical to the original
verified research download. The overview is explicitly coarse. Both images are
local; fetches reject non-image HTTP 200 bodies and have a ten-second deadline
plus disposal cancellation. Imagery and camera never feed dynamics.

## Independent validation

Reviewer: Codex flight_validate, authored no implementation in this change.
Fresh Chrome 156.0.8078.79, actual locally built JSBSim v1.3.3 runtime.

| Scoped behavior | Observed result | Outcome |
| --- | --- | --- |
| Clear launch/pause state | Initial step zero/paused; Start and Resume visible; blur stops time | Pass |
| Visible control buttons | Bank/pitch/rudder changed actual JSBSim state; outside release clears user axes | Pass |
| Draggable stick | Captured pointer controls flight; release outside clears user input, preserving only declared offset | Pass |
| View invariance | Cockpit/chase preserve paused simulation state | Pass |
| Full scene canvas | Canvas and host both 1440×668, no credit-style clipping | Pass |
| Local photography | Both images decoded/ready in 652 ms; photography and coarse backdrop visibly inspected | Pass |
| Flicker regression | Two paused pixel comparisons: zero differences, 405,000 channels compared | Pass for this sample |
| Network boundary | Only localhost requests; no page errors | Pass |
| Missing/corrupt image | Abort and HTTP 200 XML show visible errors while actual JSBSim time advances | Pass |

The orchestrator's reproducible `npm --prefix app run test:browser` passed all
14 integration checks. `npm --prefix app run build` and five native session tests
also passed. Ignored screenshots/raw evidence live under output/flight/.

## Source and limitations

Bundled HVBG ATKIS DOP20 WMS images use DL-DE Zero 2.0. Exact bounds, byte hashes,
source dataset/license URLs and GetMap requests are committed in
[the image provenance](../../app/public/imagery/SOURCE.json). Acquisition dates
are unknown. Detail covers approximately 3×2.8 km around EDFE; a 512-pixel image
adds coarse regional context. Outside that footprint coverage is explicitly absent.
These are ellipsoid-draped photographs, not terrain/elevation or chart acceptance.

Live adaptive WMS was removed: it produced excessive refinement requests, and
large requests timed out. The source also returns HTTP 200 XML errors above its
3000-pixel limit. These failures are not passed visual evidence. The final bundled
images remove that runtime dependency and were separately revalidated.

The generic research aircraft stays local and is excluded from production UI
bundles. Pressure instruments, real 172S handling, a scored EDFE circuit, recording,
hardware input and public simulator deployment remain incomplete. External peer
review is pending under the batched cadence; no milestone/release acceptance.
