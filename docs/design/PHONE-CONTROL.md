# Paired-iPhone orientation control

Status: **product proposal for TODO 1.13**, 2026-11-01; not decided, not built,
not measured. Specifies the optional R-INPUT-3 profile (GAPS [Q16](../GAPS.md))
for the Mac browser session described in [CONTROLS](CONTROLS.md). [SPEC](../SPEC.md)
owns requirement text, [SEC](../SEC.md) owns threats and controls, and
[CONTRACTS](CONTRACTS.md) §3 owns the input schema. Sources: the
[phone-control research note](../research/2026-11-01-phone-control-sources.md)
(findings **F1–F16**, sources **P1–P18**).

Marking: **Fact (Fn)** = verified in a cited source; **Inference** = reasoning
from sourced facts; **Proposal** = product choice awaiting the orchestrator/user;
**Measure** = must be measured on the reference devices before use.

## 1. Learner problem and scope

A learner on the reference MacBook Pro M1 with Chrome (Safari second) wants an
analogue, yoke-like pitch/roll input without buying hardware. Tilting a paired
iPhone moves the controls; keyboard/touchpad remain available and take over
whenever the phone cannot be trusted. Scope limits:

- Optional profile, never a launch prerequisite (R-INPUT-1 baseline unchanged).
- Phone page in a mobile browser; no native iOS app (Proposal; GAPS Q16 leaves
  browser/app open). Stand-alone mobile flight (R-INPUT-2) is out of scope.
- Generic instructional input: the phone is not a 172S control and its feel
  (no force, no travel stops) is labeled a substitution (STYLE).
- No accounts, no storage of samples, local network by default.

## 2. Platform constraints (sourced)

| Constraint | Consequence |
| --- | --- |
| Orientation events exist only in secure contexts (Fact F1); `http://` to a LAN IP or `.local` name is not one (F7, Inference) | The phone page must be served over HTTPS with a certificate the iPhone accepts |
| `requestPermission()` needs transient user activation, else `NotAllowedError` (F2); required on iOS since Safari 13 (F5) | The phone's "Connect" tap requests permission before anything else |
| No events while the page is not visible (F3); wake lock refused while hidden (F16) | Backgrounding, app switching and screen lock end input; fallback must be automatic |
| Angles alpha/beta/gamma in degrees, 0.1° precision, no defined rate (F4) | Resolution ≈ 0.0017 rad; rate and jitter are **Measure** |
| iOS browsers are normally WebKit (F6) | Chrome on iPhone is expected to behave like Safari; still test both |
| Chrome 142 prompts for local-network access from public sites; WebRTC/WebSocket gating planned (F8) | A hosted Mac page connecting to LAN peers may later show a prompt; re-check at implementation |

## 3. Architecture options

All options keep the mapping and validation in the Mac's single input module
(`app/`, CONTRACTS §3); the phone sends only uncalibrated orientation samples.

| | A. Direct WebRTC data channel | B. Local WebSocket via Mac server | C. Hosted relay |
| --- | --- | --- | --- |
| Path | Phone ⇄ Mac browser peer-to-peer on the Wi-Fi; a tiny signalling mailbox only during pairing | Phone ⇄ HTTPS/WSS server on the Mac ⇄ Mac browser (localhost) | Phone ⇄ internet relay ⇄ Mac browser |
| Encryption | DTLS mandatory (F9, F10); fingerprints pinnable | TLS to the Mac server; server sees plaintext (user's own machine) | TLS per hop; relay sees plaintext unless app-level encryption is added |
| Transport behaviour | Unordered, `maxRetransmits: 0` gives a UDP-like channel: a lost sample is skipped, later samples are not delayed (F9) | TCP, reliable and ordered: a lost segment delays later samples (F13) | As B plus internet round trip |
| Network needs | Same subnet, client isolation off; `iceServers: []` (F11), so no STUN/TURN; candidates may be mDNS names (F11) | Same; Mac server reachable on a LAN port; macOS firewall prompt | Internet on both devices |
| Hosting | Phone page on any HTTPS origin; mailbox can be the app's own server or a stateless hosted endpoint holding only encrypted blobs | Requires a running local server and a phone-trusted certificate for it | Requires an operated service, availability and abuse handling |
| Privacy | Samples stay on the LAN; no third-party server sees them | Samples stay on the LAN | All samples leave the home network; conflicts with SEC local-first default |
| Expected latency | Lowest (one Wi-Fi hop) — **Measure** | One hop plus server forwarding; TCP stalls on loss — **Measure** | Highest and most variable |

**Recommendation (Proposal): option A**, with these fixed choices:

- Data channel `ordered: false`, `maxRetransmits: 0`, label `gefly-ori/1`;
  `iceServers: []` (LAN only, no third-party STUN revealing a public IP). If ICE
  fails, show "phone not reachable on this network" (client isolation, VPN,
  different subnet) and stay on keyboard/touchpad; no silent TURN fallback.
- The signalling mailbox stores at most one encrypted offer and one encrypted
  answer per pairing id, in memory, deleted on use or after 120 s. It runs on
  whatever serves the app (local dev server now; hosted endpoint once hosting is
  decided). It never sees orientation data or plaintext SDP.
- Option B is acceptable only as a development prototype (WSS, Mac server
  forwards and discards). Option C is rejected for the default path.
- Open hosting dependency: the phone page needs an HTTPS origin the iPhone
  trusts. A hosted static page (when hosting is chosen) avoids asking learners to
  install a local root CA; a developer-installed local CA is a dev-only route
  with a documented risk (SEC edit below). See §10 Q-P1.

## 4. Pairing flow (Proposal)

Pattern: QR-carried secret as in CTAP hybrid (F14) plus a short authentication
string compared on both screens as in ZRTP (F15).

1. **Mac, start.** In Input settings the user clicks "Pair iPhone". The Mac page
   generates a pairing id (128-bit random), a pairing key `k` (128-bit,
   WebCrypto), a fresh `RTCCertificate` and its fingerprint `fM` (P12). It shows
   a QR code and a 120 s countdown.
2. **QR content.** `https://<phone-origin>/phone#id=<id>&k=<k>&fm=<fM>`. Secrets
   sit in the URL fragment, which the browser does not send to the server
   (RFC 3986 §3.5; cite at implementation). The QR is single-use.
3. **Phone, connect.** The iPhone camera opens the page. One tap "Connect and
   allow motion" calls `DeviceOrientationEvent.requestPermission()` (F2) and then
   fetches the encrypted offer, checks that its DTLS fingerprint equals `fm`,
   and posts an AES-GCM-encrypted answer with its own fingerprint `fP`.
4. **Channel up.** DTLS completes; both sides verify the peer fingerprint against
   the pinned value. The mailbox entry is deleted.
5. **Confirm on both devices.** Both show the same 6-digit code
   `HKDF(k, "gefly-sas" ‖ fM ‖ fP)`. The user taps "Codes match" on the phone and
   clicks "Confirm" on the Mac. Before both confirmations no sample reaches the
   input boundary. A mismatch or 30 s without confirmation aborts and wipes keys.
6. **Calibrate.** The phone asks the user to hold it in the neutral grip and tap
   "Set neutral"; the Mac shows the live mapped pitch/roll before control is
   handed over.
7. **Paired state.** The Mac input-mode indicator shows "iPhone: live / paused /
   lost" with text and icon (no colour-only cue); the phone shows "Controlling
   Gefly on <Mac session name>" and the same state.
8. **Unpair.** One click on the Mac or one tap on the phone closes the channel,
   wipes `k` and certificates and returns to keyboard/touchpad. Closing or
   reloading either page also unpairs. Pairing is never persisted; the next
   session pairs again. Only one phone at a time; a second attempt is refused
   while paired.

## 5. Messages and the input boundary (Proposal)

Phone → Mac, JSON over the data channel, at most 256 bytes per message:

```text
{t:"ori", v:1, sseq, ts_ms, alpha_deg, beta_deg, gamma_deg, scr_deg}
{t:"state", v:1, sseq, ts_ms, st:"live"|"paused"|"hidden"|"recenter"}
{t:"ping", v:1, sseq, ts_ms}            Mac → phone: {t:"pong", sseq, ts_ms, mac_ms}
```

- `sseq`: per-pairing integer, strictly increasing across all phone messages.
- `ts_ms`: the event's `timeStamp` on the phone clock (latency metadata only).
- Angles in degrees as delivered (F4); `scr_deg` is the phone's screen angle.
  Degrees exist only inside the iPhone profile; it converts to radians once.

The Mac iPhone profile (inside the input module) applies, in order:

1. **Authenticate**: accept messages only from the confirmed channel (§4).
2. **Validate**: reject non-finite values and alpha ∉ [0, 360), beta ∉ [−180,
   180), gamma ∉ [−90, 90) (F4 ranges), unknown `t`/`v`, oversize messages;
   count and drop, never clamp (CONTRACTS §3).
3. **Order/replay**: drop any `sseq` ≤ the last accepted one (out-of-order or
   replayed); count drops.
4. **Staleness**: a ping/pong exchange every 1 s estimates clock offset from the
   minimum-RTT sample. Drop `ori` samples older than **100 ms** (Proposal) on the
   Mac clock. Offset is used for staleness and metrics only, never for the sim.
5. **Map**: convert to a quaternion (avoids the gimbal lock noted in P1 Appendix
   A), take the rotation relative to the stored neutral, and extract pitch (tilt
   top edge away/toward) and roll (rotate like a wheel) for a **landscape grip**
   (Proposal). Apply dead zone (default 2°), full-deflection angle (default 30°,
   adjustable 10°–60°), exponential and inversion as for other profiles; the
   profile saturates its output to [−1, 1] by design (labeled device mapping).
6. **Emit** a CONTRACTS input event `{v, seq, step, wall_ms, source:"iphone",
   controls:{pitch, roll}}` at most once per simulation step, latest sample
   wins. Yaw, throttle and discrete controls stay on keyboard/touchpad
   (Proposal; §10 Q-P4). Roll→yaw mixing remains the boundary assist.

**Recenter** (phone button, or the existing Mac recenter key `Enter`) stores the
current orientation as neutral. **Pause** (phone button or Mac toggle) stops the
profile from emitting and hands over per §6. Replay stays deterministic because
the log holds only the emitted normalized controls with `applied_step` and
`seq`; raw samples are never logged (CONTRACTS §3, SEC).

## 6. Fallback rules (Proposal)

Whenever the iPhone profile stops being the trusted source it emits
`source_lost` with a reason; the Mac shows a banner and text cue; keyboard/
touchpad become active immediately; and, by default, **the simulation pauses**
so control is never lost silently mid-flight. The learner resumes with
keyboard/touchpad or after the phone is live and recentered (setting "pause on
phone loss", default on).

| Trigger | Detection | Reason |
| --- | --- | --- |
| Permission denied or no API | `NotAllowedError` (F2) or `DeviceOrientationEvent` undefined | `permission_denied` (pairing never hands over control) |
| Sensor silent | No `ori` within 1 s after permission | `sensor_unavailable` |
| Backgrounding, app switch, lock | Phone `visibilitychange` → `state: hidden` (best effort); events stop (F3) | `phone_hidden` |
| Disconnect | Data channel `close`, ICE `failed`/`disconnected`, or no valid message for **250 ms** | `disconnected` |
| Stale/out-of-order stream | > 20 % samples dropped over 1 s | `degraded` |
| User pause or unpair | Explicit message or button | `paused` / `unpaired` |

The phone requests a screen wake lock while live (F16) to avoid auto-lock;
refusal is shown, not fatal. Re-establishing after `disconnected` within the
same session needs a new pairing (keys are not reused).

## 7. Latency budget (Proposal, to be fixed before evaluation)

End-to-end = start of phone motion → first changed photon of the attitude
indicator on the Mac display. Components on option A:

| Stage | Proposed allowance | Basis |
| --- | --- | --- |
| iPhone sensor fusion + event dispatch | **Measure** | Not specified (F4) |
| Phone JS + send | ≤ 2 ms | Proposal |
| Wi-Fi one-way | ≤ 10 ms p95 | Proposal; **Measure** via RTT/2 |
| Mac receive → input event to worker | ≤ 2 ms | Proposal |
| Wait for next step | ≤ 8.3 ms | dt = 1/120 s (CONTRACTS §2) |
| State stream + interpolation | ≤ 33.3 ms | 60 Hz stream plus one interval of interpolation delay (CONTRACTS §2) |
| Render + display scan-out | ≤ 16.7 ms | Two frames at 120 Hz; refresh measured per run |

Proposed acceptance on the reference Mac/iPhone, same 5 GHz access point:
motion-to-photon **p50 ≤ 70 ms, p95 ≤ 100 ms**; the phone path adds **≤ 30 ms
p95** over the keyboard path measured with the same method (E5); delivered
sample rate **median ≥ 50 Hz**, inter-sample gap **p99 ≤ 50 ms**; zero accepted
samples after unpair. Numbers are proposals until the orchestrator fixes them in
SPEC/EVAL (R-INPUT-3 requires this before evaluation).

**Measurement method (Proposal).**

1. Component timing: log `ts_ms`, Mac receive time, offset/RTT from ping/pong,
   `applied_step` and render frame time in an opt-in, in-memory diagnostic
   session; export only aggregate histograms.
2. End-to-end: a separate camera at ≥ 240 fps films the iPhone and Mac display
   together; the phone is tilted sharply from rest against a fixed stop; count
   frames from motion onset to indicator change (≈ 4.2 ms resolution); ≥ 30
   trials per browser pair; same procedure for a key press.
3. Record exact iOS, iPhone model, phone browser, macOS, Chrome/Safari versions,
   display refresh, access point/band and channel; repeat once with competing
   network load. Results go to RESULTS, not to this document.

## 8. Security and privacy mitigations (Proposal for SEC)

| Threat | Mitigation | Verification |
| --- | --- | --- |
| Spoofed or unpaired input | Only the DTLS channel whose fingerprints were pinned via QR (`fm`) and encrypted signalling (`fP`) and confirmed by matching codes on both devices; single-use id, 120 s expiry, one phone at a time; mailbox rate-limited | Foreign device with a photographed/expired QR; tampered offer/answer; second phone |
| Malicious signalling server or MITM | Signalling payloads AES-GCM-encrypted with `k` from the QR; fingerprint check (F10); short code exposes substitution (F15) | Mailbox that swaps SDP; code mismatch aborts |
| Replay or reordering | Strictly increasing `sseq`, 100 ms staleness window, fresh keys and certificates per pairing | Replayed captures, duplicated and reordered messages |
| Eavesdropping | DTLS encryption mandatory (F9, F10); secrets only in URL fragment; no third-party STUN/TURN | Packet capture on the LAN shows DTLS only; server logs contain no fragment |
| Flooding / malformed data | ≤ 256 bytes, ≤ 240 messages/s, validation before mapping; drops counted and shown | Fuzzed and oversized messages, high-rate sender |
| Storage or leakage of samples | Raw samples held only in memory for the current mapping; not logged, persisted or sent beyond the pairing; only normalized controls enter the input log; diagnostics opt-in and aggregate | Storage (IndexedDB/localStorage) and network inspection |
| Untrusted local CA on learner phones | Learners use an HTTPS origin with a public certificate; local CA only for developers, documented and removable | Setup review |
| Phone page code integrity | Served from the project origin with a strict CSP, no third-party scripts | Built-bundle inspection |

## 9. Proposed edits for the orchestrator

- **SPEC R-INPUT-3**: name the pitch/roll mapping, pairing expiry and short-code
  confirmation; reference the fixed budget in §7 and the "pause on phone loss"
  default once decided.
- **SEC**: replace the paired-phone row with §8; add the signalling mailbox data
  flow (encrypted, in-memory, 120 s) and the local-CA developer risk.
- **CONTRACTS §3** (minor version): add `iphone` as a `source`; define the
  `source_lost` reason enum of §6; state that the iPhone profile saturates.
- **EVAL/E5**: add the §7 measurement procedure and fixtures for each §6
  trigger and §8 verification.
- **TODO 1.13**: split into specification (this document), prototype (option A
  on the dev server) and measurement.

## 10. Open questions

- **Q-P1** Hosting of the HTTPS phone page and mailbox (hosting is undecided);
  is a developer-only local CA acceptable meanwhile?
- **Q-P2** Reference iPhone model, iOS version and phone browser (Safari only,
  or Chrome too).
- **Q-P3** Grip: landscape "wheel" (proposed) or portrait "stick"?
- **Q-P4** Axes: pitch/roll only (proposed), or also yaw/throttle?
- **Q-P5** Default on phone loss: auto-pause (proposed) or continue on keyboard?
- **Q-P6** Accept the §7 budget numbers, or set different targets?
- Unverified platform behaviour (note "Not found"): iOS treatment of private-CA
  HTTPS, mDNS candidates, Chrome LNA gating of WebRTC, real sensor rate.
