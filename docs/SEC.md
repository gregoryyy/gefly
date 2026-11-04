# Security and data design

## Assets and boundaries

Protect source code, build environment, dependency integrity, aircraft/reference provenance and any future learner progress or uploaded scenarios. No simulator accounts, personal telemetry or runtime AI integrations are currently implemented. Developer cross-provider peer review is a separate data flow described below. Raw input contains the product brief, not learner records. User decisions about geography/framework do not determine hosting or data jurisdiction.

## Threats and controls

| Threat | Design consequence | Verification and phase |
| --- | --- | --- |
| Malicious aircraft, scenario or replay import | Declarative versioned schemas; reject executable content, oversized files, invalid units and non-finite/out-of-range numbers | Adversarial import fixtures before imports ship |
| Unsafe browser rendering or injection from research/AI text | Escape strings; no untrusted HTML; allowlist resource URLs; distinguish evidence from instructions | Quality review and browser security tests with the first UI |
| Unauthorized or stale manuals, maps, navigation data and avionics assets | Source/version/applicability/rights manifests; ingestion and update review; explicit unsupported claims | Research/product review and asset inventory before ingestion |
| Supply-chain compromise | Minimal dependencies, lockfiles, pinned CI actions, provenance/license review, automated update process once stack chosen | SBOM review and installation/CI checks in foundation |
| Secret exposure | Ignore `.env*` except `.env.example`; never embed private provider keys in a client bundle | Inspect tracked changes and built bundle before release |
| Learner privacy and unexpected external traffic | Local-first default; explicit data flow/retention decision before accounts, telemetry or model calls | Network inspection and deletion/export tests when added |
| Corrupted or misleading simulation results | Versioned fixtures, bounded numerics, fidelity labels, no unsupported certification claims | Quality and validation gates; physics evidence in EVAL |
| Agent races or source manipulation | Disjoint write sets, immutable raw inputs, one integration owner, external text treated as untrusted | Dispatch review and integrated checks |
| Misleading live/expired weather, NOTAM or navigation data | Declare source, coverage, edition and issue/validity time; distinguish missing data from a verified empty result; freeze scenario inputs for review | Invalid/stale/unavailable-feed fixtures before briefing integration |
| Imported briefing text or generated radio messages changing scenario state | Parse declarative data and bounded communication intents; scenario rules own state changes; escape rendered messages | Malicious input, invalid readback and contradictory-state cases before text radio ships |
| Orientation/location or recorded communication leaking through integrations | Request only needed browser permissions; explicit denial fallback; keep session events local by default; review storage/export and service data flow before enabling it | Permission-denied and network/storage inspection on supported mobile/browser targets |
| Unauthorized or spoofed paired-phone control input (R-INPUT-3) | Explicit user-confirmed, short-lived, session-scoped pairing; authenticated encrypted transport; reject unpaired, stale or replayed samples; visible paired state and one-click unpair; local network by default | Pairing/unpairing, foreign-device and replay tests; packet inspection on the reference Mac/iPhone |
| LLM authoring fabricating facts, following instructions embedded in a source or producing executable content | Resolve real assets through structured sources; validate declarative packages and record provenance; isolate untrusted source text from authoring instructions; require review before accepted use | Unknown-fix, malicious-source, invalid-geometry, incompatible-equipment and provider-failure cases in E9 |
| Public community exposing private records or falsely labeling content as reviewed | Explicit submission visibility, scoped roles, authorship/review labels, reporting/moderation/removal and retention decisions | Scoped community access/content cases in E11 before deployment |

## Flight-map point actions and historical fixes

Map popups render source strings as text. Supported radio actions validate the
channel and update standby only; Review rejects tuning at both UI and application
boundaries. GPS targets draw a map point/line without issuing aircraft commands.
The pinned 2013.10 fix package has fixed same-origin paths, manifest and compressed
byte hashes, byte/decompression limits and an abortable deadline. Invalid assets
leave the optional layer unavailable. Its historical age stays visible; this does
not establish current AIRAC accuracy or operational navigation authority.

## Repository-tool CI

The foundation workflow runs the committed offline gate on pull requests to
`main` and pushes to `main`. Its token has only `contents: read`; checkout does
not persist credentials. It uses immutable action commits, no repository secrets,
live provider calls or document rendering. The repository-tools job makes no package installation; the separate browser-application job installs locked npm dependencies and runs the UI build/session tests without model data. Pull-request
code executes in the normal `pull_request` context, never a privileged
`pull_request_target` context. The test process is not a sandbox for arbitrary
local code; inspect contributions before running them on a developer machine.

Dependabot proposes GitHub Actions pin and app npm updates weekly; verify the upstream
release/commit, review changes and rerun the gate before accepting an update.
Hosted runner images and Python patch versions still change. This workflow does
not configure branch protection, scan future application dependencies or replace
the independent quality, validation and cross-provider reviews. See
[E0-CI](EVAL.md#e0-ci-are-repository-tool-quality-gates-reproducible-locally-and-in-ci)
and [the tool inventory](SBOM.md).

## Assurance inputs and outputs

Assurance reads repository text, Git history and declarative catalogs as untrusted
data. It does not execute imported scenario/model content, fetch cited sources or
send artifacts to a provider. Repository paths must stay inside the selected
checkout/revision; reject traversal, absolute paths and symlink escapes. Bound
reads and child processes, scrub inherited Git/Node redirection, and use argument
arrays rather than shell evaluation. Generated outputs are ignored and rebuildable.

Evidence outcome, link certainty, aircraft value status and review independence
are separate fields. A source citation or passing schema check is not source
truth, permission or fidelity. Accepted claims require current named evidence;
missing/skipped/stale evidence cannot silently become a pass. The catalog records
relationships and safeguards, not secrets or copies of restricted manuals.

## Repository calibration adapter

The assessment-airspeed adapter consumes parsed, CI-validated repository data and
a caller-declared byte hash. It validates the consumed fields, copies/freezes its
bundle and preserves draft/not-validated labels. It does not establish the binding
between that object and the supplied hash. The trusted bundling/test caller must
compute the exact source-byte hash and ensure the object comes from those bytes.
This is not an arbitrary-file importer or a source-approval boundary. Future
untrusted import needs separately scoped byte/hash, size and full-schema controls.
Conditions/citations remain data; the pure modules execute no source text, load no
files and make no network/provider calls. Numerical availability is separate from
aircraft fidelity or an accepted exercise criterion.

## Developer peer review

The peer router sends only the orchestrator's inspected packet to the selected
other provider using existing local authentication. Exclude credentials, unrelated
personal information and unauthorized source material; do not publish raw auth or
session metadata. Record the actual route, packet hash and provider evidence.
Provider failure, missing identity or incomplete evidence cannot become a passed
review or trigger a same-provider fallback.

Claude runs a fresh, tool-disabled safe-mode packet review; Codex runs a fresh
read-only exec with packet-only instructions and blocks detected tool-use output.
These controls have different limits and do not attest the remote backend or
replace parent permissions. Do not enable permission bypass, install/reauthenticate
providers or post reports as part of review. Keep local outputs under ignored
`output/`; inspect the normalized report before including it in source/PR evidence.

## Document rendering

Pandoc/Chrome and the LaTeX filter are developer tools. Build trusted repository Markdown only. Mermaid builds download a versioned script from a CDN; no document containing Mermaid currently requires it for the scaffold. The inherited LaTeX filter disables shell escape and restricts file access, but this is not a general document sandbox. Never build arbitrary external documents without inspection and suitable isolation.

## Controls by phase

Bootstrap: ignore rules, provenance notes, source limits and agent ownership conventions. Foundation: stack-specific lint/types/tests, lockfiles, secret/dependency checks and CI definitions. First application: validate inputs, bound simulation data, test error states and accessible controls. External services or learner storage: update the data-flow model, obligations, consent, retention, deletion, backups and incident response before enabling them.

Research must verify applicable legal/regulatory facts from current primary sources; these planned controls are design choices, not a claim of legal compliance. Quality records security impact for each change; validation checks the agreed security requirements against observable evidence.

The expanded [training scope](design/TRAINING.md) introduces provider trust and
privacy boundaries; it does not select a feed or enable external traffic. A future
proxy/cache requires allowlisted upstream requests, protected credentials, access
and rate controls, source/rights review and an explicit stale/offline policy.
Do not execute community add-on scripts merely to inspect their feature claims.

The free/open-source community and AI-authoring directions introduce concrete
service boundaries. Keep private provider credentials and learner data out of
shared experience packages, prompts/logs and public repositories. Define which
data reaches a local or hosted model before integration, including redaction,
retention and cost/rate controls. Open-source code does not make private community
records public. Validate uploaded packages as untrusted data and preserve a
usable simulator path when community or AI services are unavailable.

## Local browser flight prototype

The experimental Vite server binds to 127.0.0.1 and serves the explicitly named
worker/runtime/helper files from `app/runtime.ts`; this middleware does not expose
the repository. npm installation and the pinned study build download upstream
dependencies. JSBSim, application code, physical terrain and airport-directory
assets remain local. Photography now combines bundled images with a separate
fixed-source live proxy described below; the old local-only scenery statement no
longer applies. No live elevation service drives physics. Terrain paths,
dimensions, bytes, SHA-256, finite heights and vertical datum are validated before
installation. Missing/corrupt terrain and native coverage exit fail closed; an
explicit flat study is the only legacy flat-ground path. Authoring GIS packages
run separately, consuming hash-pinned source files. No device geolocation,
accounts, personal telemetry, persistence or runtime AI calls are used. Generated
generic aircraft data stays local and outside the production UI build. The
UI-only production build is not a published simulator deployment.

Control sensitivity settings, including the 0–100% keyboard/button wheel-brake command gain, are bounded dimensionless gains held only in page memory. They have no persistence or network path, preserve throttle, and leave the declared study roll offset separate. Opening the settings dialog pauses flight and releases held inputs; closing it does not resume automatically. These input preferences do not calibrate or modify aircraft physics.

The parking-brake latch is separate page-session input state. A guarded N/button
toggle requests full bounded wheel braking independently of the momentary brake
gain; it does not freeze aircraft state or bypass native contact/collision logic.
Pause, focus loss and input neutralization clear held commands while retaining
this explicit latch; restart clears it. Paused changes do not integrate physics.
Review disables mutation and does not infer an unrecorded latch from captured
left/right brake values. The optional aileron-to-rudder input assist defaults off,
accepts only a boolean preference and mixes bounded deliberate pilot input before
the study roll offset; explicit rudder input takes priority. It does not mix
native autopilot output or change the existing rudder/nosewheel coupling. Both
features add no persistence, device permission, telemetry or external traffic.

In-session flight review keeps copied state samples and captured vertical speed only in page memory, capped at 36,000 samples and 600 simulation seconds. Reset/reload clears history. It has no storage, export, import or network path. Review pauses and neutralizes the real worker; historical state is sent only to the renderer/instruments and never restores physics. Unrecorded control positions are hidden, with explicit state-only trace labels.

The lazy practice map loads its bundled MapLibre worker, images and bounded,
hash-validated airport catalogue locally, and uses the live scenery endpoints
below. Source/provenance URL strings do not become fetch destinations; WGS84
bounds and catalogue fields are validated, with directory text rendered as text.
It plots up to 600 retained states and follows the selected recorded frame in
Review. Airport selection moves only the map and cannot teleport the aircraft or
change physical terrain. Map errors remain panel-local. It adds no learner
telemetry, storage, remote glyph server or device geolocation.

The ideal pressure instrument reads engine atmosphere values through read-only Pa
exports. Its bounded 80000–110000 Pa setting changes only worker instrument state,
not the atmosphere, controls or fixed-step dynamics. Non-finite/out-of-domain
pressure produces an unavailable indication; older local engine builds remain
flyable without pressure data. The session validates the optional complete numeric
group before rendering/recording. Display units are session-only preferences.
Paused changes can replace only the last instrument snapshot with identical
physical/environment state and preserved VSI; prior frozen samples remain intact.
Review uses captured settings and disables adjustment. No pressure data is stored
or sent externally, and launch QFE never substitutes for accepted airport data.

Scene pointing gestures do not request pointer lock or device permissions. Their
inputs are bounded. Cancellation (Escape on the scene, window blur, a hidden page or
disabled controls) clears yoke mode, look and axes. When the pointer leaves the scene, the
yoke axes go neutral but the selected yoke mode and anchor are kept; on return, the
pointer position relative to that anchor is authoritative again (R-INPUT-1).
A captured look gesture can continue beyond the scene until release, with pilot
pointer axes neutral. Camera offsets never enter dynamics. Numeric throttle shortcuts and
AP shortcuts are suppressed inside open dialogs and editable controls. The live
mobile engine dialog releases held inputs and keeps flight running, as labeled.

The optional centered-touchpad preference is a session-only boolean, initially
off. It uses the current scene element's visible rectangle to define neutral,
not hardware coordinates, device calibration or a stored click position. Resizing
therefore changes the visible reference without installing a new pointer anchor.
Captured hold-drag changes bounded camera offsets while pilot pointer axes remain
neutral. Releasing does not issue a new yoke command or auto-center the camera;
only subsequent real pointer movement/re-entry produces center-relative input.
Ordinary cancellation, pause, focus loss and Options retain that camera offset
while neutralizing controls; Escape and flight restart explicitly reset it.
Review can inspect the view without changing live or recorded aircraft state.
The preference adds no persistence, pointer lock, device permission, network
request or telemetry, and does not alter sensitivity gains or native physics.

Cockpit/engine state groups are validated atomically before copying and display;
missing old-engine capabilities remain unavailable rather than synthesized.
Flap, brake and mixture commands are finite/bounded. AP messages preserve the legacy roll interface and add a bounded, validated
KAP operating-state command union. NAV1 configuration is an atomic validated
worker snapshot; its fictional signal is computed at fixed steps. Source validity
and controller outputs remain independent of UI repaint rate. Invalid targets
are rejected without native integration. Raw manual pilot
input disconnects AP, and its roll correction cannot silently compete with the
controller. Review disables all these live controls and renders captured fields.
Paused setting/mode changes replace only the final permitted instrument fields,
with physical/environment/other engine state and VSI unchanged.

The local mixture adapter accepts a pinned source-byte hash, rejects unsupported
wiring and source/destination overlap, and preserves other source bytes and
notices. It prepares ignored output without changing the upstream checkout;
metadata hashes identify the adapter and generated model. No source/model import,
persistence, personal telemetry or external service was introduced in the UI.

Scene wheel zoom is a bounded, page-local camera preference. A non-passive
capture listener handles eligible vertical scene events before Cesium; Ctrl/Meta/Alt,
editable, modal and sibling UI/map gestures are excluded. It requests no device
permission, makes no network/storage calls and sends no simulation input. FOV is
retained separately from aircraft/review state and reset to default on reload.

## Procedural engine audio

Web Audio is activated by explicit browser/user interaction. The original local
synthesis graph uses existing engine telemetry; it fetches no audio assets and
requests no microphone, media-device, network or recording access. Mute/volume
are session-only preferences, independent of flight input. Pause/hidden/failure/
reset/paused Review silence the graph; page teardown closes it. Missing or denied
audio leaves flight usable with a retry/unavailable indication. Test-only local
WAV previews are disposable outputs, not runtime telemetry or recordings.

Stall/terrain annunciation and autopilot-disconnect audio consume existing native
telemetry without writing flight state or issuing control commands. Non-finite,
missing or discontinuous samples cannot establish a derivative history or imply
an available warning from absent data. The native software stall signal is not
an installed-aircraft calibration; the terrain cue uses current local CG
clearance/closure, with no forward terrain or obstacle scan and no TAWS/EGPWS
claim. Its generic thresholds can warn on a steep landing approach.

The added tones reuse the same bounded synthesis graph, trusted-gesture unlock,
default-off mute and volume controls. They add no sample downloads, permissions,
network traffic or recording. They run only during live running flight, with
pause, hidden/loading/reset/failure, missing data and all Review modes suppressing
them. Disconnect detection requires an actual continuous engaged-to-disengaged
transition; first samples, mute/unmute, resume and replay seeks do not queue or
manufacture disconnect beeps. Sound design is original, not validated installed
warning-system acoustics.

Regional navigation loads a bounded same-origin manifest and hash-verified static
JSON package before normal flight initialization; it rejects invalid sizes,
redirects, asset paths, schema, duplicate IDs and corrupted bytes. The package is
frozen per context and remains historical throughout a page session/Review.
Directory source strings use textContent. No live AIS, network ATC, external URLs,
executable scenario content or persistence is added. LAB remains explicit and
isolated. Approximate reception ranges are not authoritative operational status.

The regional imagery provider derives fixed same-origin XYZ paths from bounded,
validated integer coordinates. It rejects redirects, invalid manifest metadata,
duplicate/out-of-coverage entries, over-budget packages and invalid byte counts,
hashes or JPEG dimensions. Fetch/stream operations have deadlines and scene
cancellation also covers manifest loading before the provider exists. No source
URL from provenance is executed at runtime. A bounded decode cache, deduplicated
requests and ancestor fallback limit view loading; imagery failures do not write
flight state. Offline public WMS ingestion runs separately with bounded requests,
image decoding, tile budgets, atomic output and source/derivative notices.

## Streamed terrain and live public scenery proxy

The fixed regional terrain manifest declares exactly 42 known 0.25° tiles over
8.25–10°E / 49.25–50.75°N. Runtime tile URLs are derived from validated IDs;
redirects, unexpected lengths, hashes, dimensions and non-finite nodes are
rejected. Reads have 15 s deadlines and cancellation. At most nine current
tiles are installed into the native atlas between fixed steps; the renderer
retains at most 42 visited tiles for Review. Loading pauses authoritative physics
without changing its step size; explicit user pause/stop cancels automatic resume.
Missing source coverage cannot silently become zero or the last known height.

The browser requests same-origin `/scenery/map/{z}/{x}/{y}.png` or
`/scenery/imagery/{z}/{x}/{y}.png`. The Vite process sends WMS 1.1.1 requests only
to these hard-coded HTTPS sources:

- `sgx.geodatenzentrum.de/wms_topplus_open`, `web` map layer.
- `www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows`, `he_dop_rgb`.
- `geoservices.bayern.de/od/wms/dop/v1/dop40`, `by_dop40c`.
- `owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ATKIS_DOP_20_C`, `IMAGES_DOP_20_RGB`.

Requests accept only GET/HEAD and canonical bounded integer XYZ paths, rejecting
query strings, arbitrary destinations and redirects. Endpoint coverage is
6–14°E / 47–51.75°N for map tiles (z5–16), and
8–10°E / 49–50.75°N for photography (z7–15). Image responses are capped at
2 MiB and checked as PNG with expected 256/512 px dimensions. The proxy limits
eight active jobs, four upstream fetches, two compositors and 128 pending keys;
deduplicated memory LRU is capped at 32 MiB with map/photo TTLs of 1 h/15 min.
Fetch and compositor deadlines are 15 s. Cache responses sent to the browser are
private with a 300 s max-age. Failures return 502 or queue saturation 503 without
writing terrain or aircraft state.

Photography uses the fixed local Python compositor with at most three 512 px
images, 9 MiB bounded base64/JSON stdin and 2 MiB output. Its executable/script
arguments are configured locally, never supplied by a request. Pillow 11.2.1
performs decoding and alpha composition; its dependency is required only by the
scenery service, not the browser or native physics. Black/white blank images are
skipped, and transparent coverage gaps reveal the map underneath. A partial
upstream result carries response headers but is not a guarantee of complete
photo coverage; every view retains the map-fallback/unknown-date disclosure.

The upstream services see the server's network address and requested map bounds
for simulated scenery; the browser does not request GPS. No account/key, learner
record, control trace or recorded flight is uploaded. The proxy has no disk cache
or application request log, and restart drops its cache; upstream retention is
the provider's responsibility. Live map/photo bytes are not versioned scenario
inputs and may change in Review. Aircraft state and bundled terrain are retained
separately; image access does not drive dynamics. Rights/attribution remain
source-specific in [SBOM](SBOM.md) and [notices](../THIRD_PARTY_NOTICES.md).

This service exists in Vite development only. Static production output needs an
equivalent endpoint service and the separate research-engine deployment; hosting
and production privacy/availability decisions remain open. Global provider
research did not activate a commercial service or add remote runtime endpoints.

## Right-side flight map

The right-side map adds no provider or storage flow: its base layers use the
already bounded public scenery proxy, and aviation overlays use the existing
local hash-verified airport/navigation packages. Marker details use textContent;
no source field becomes HTML, code or an external request URL. Position and path
come from the simulator, not device geolocation. M is guarded during typing,
dialogs, menus, modifiers and repeats; map keyboard gestures stay isolated from
flight controls. Visibility changes release held UI input before resizing the
scene. This is a map-specific control hand-off, not aircraft retuning or a
resolution of the separate general touchpad handling report. Community NAV snapshots, historical ILS and
missing tile/source conditions remain explicit; no current chart claim is added.

The map-only southern NAV and airfield packages use fixed same-origin paths,
bounded streamed reads, schema/coordinate/source checks and SHA-256 integrity.
Displaying these packages cannot retune the radio model; explicit validated
marker actions update standby as described above. Five-state airport selection retains closed
facilities with explicit labels; beacon context is a declared larger envelope.

## Convenience autopilot and simulation rate

A captures worker-authoritative heading and pressure-altitude targets through
the existing guarded KAP/native interfaces; it cannot claim installed-aircraft
performance or bypass manual-input priority. The = rate union accepts only
1/1.5/2/5/10×. It changes pacing, never the fixed integration step or aircraft
parameters. Shortcuts are guarded against typing, modifiers, repeats, modal
dialogs and read-only Review. The rate overlay reports confirmed state rather
than an unacknowledged command. Reset returns to normal speed; failed/paused
loading does not create catch-up integration. These controls add no persistence,
permissions, telemetry or external traffic.


The label-free map terrain uses bundled, hash-verified basemap.de style data.
All text/symbol layers and glyph requests are removed. A fixed BKG-only proxy
serves canonical Germany XYZ PBF tiles and the known sprite pair; callers cannot
choose hosts, URLs or filesystem paths. Bounds, MIME types, bytes, concurrency,
pending work and memory caches are limited. The browser renders these tiles in
one offscreen MapLibre context with a bounded queue/cache and disposal. Failed
tiles expose only neutral terrain/relief in vector mode; photography is hidden; data service failure does
not change physical terrain, navigation or native flight state. See the
[source note](research/2026-11-04-label-free-map-terrain.md) for coverage/rights.

## Optional landmark names

Period/View label detail enables bounded, on-demand OSM-derived vector reads via
a fixed OpenFreeMap edition/host. Canonical XYZ paths cannot select arbitrary
URLs or credentials. The proxy uses separate fixed BKG/OpenFreeMap pools of four concurrent
fetches each (eight total), with at most 48 pending jobs per provider, 64 total
and a shared 32 MB cache. Provider-specific cache identities and reserved
queue capacity prevent terrain loading from starving names. The client bounds
decode counts, cache, names and rendered labels; obsolete/off/disposed results
must not repopulate a new view. Names are inert text, not HTML or instructions.
Service failure leaves scenery and flight independent and reports unavailable
labels. Current-source labels in Review do not establish historical map state.

## Local launch position

The browser stores a versioned last live latitude, longitude, MSL altitude, heading and ground/airborne flag in localStorage. It stays on the browser origin; no account or location-upload service is added. Restart flight removes it. Reads are size/schema/finite/range bounded, writes are throttled, and denied storage falls back to ordinary launch. This is simulated flight location, not device geolocation.

## Planned world-authoring boundary

Future source/asset imports and LLM-proposed scene recipes remain untrusted data.
Require bounded declarative schemas, approved asset/source identifiers, safe
paths and resource limits; do not execute generated scripts or follow arbitrary
model-supplied URLs. Preserve per-layer and per-model rights, source provenance
and measured/inferred/generated status. Generated visual detail cannot silently
replace accepted terrain, runway, navigation or obstacle facts. No world-authoring
importer, external AI data flow or new provider is activated by the research.
