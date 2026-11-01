# Paired-iPhone orientation control

Status: **product proposal for TODO 1.13**, 2026-11-01; not decided, not built,
not measured. Specifies the optional R-INPUT-3 profile (GAPS [Q16](../GAPS.md))
for the Mac browser session described in [CONTROLS](CONTROLS.md). [SPEC](../SPEC.md)
owns requirement text, [SEC](../SEC.md) owns threats and controls, and
[CONTRACTS](CONTRACTS.md) §3 owns the input schema. Sources: the
[phone-control research note](../research/2026-11-01-phone-control-sources.md)
(findings **F1–F18**, sources **P1–P20**).

Marking: **Fact (Fn)** = verified in a cited source; **Inference** = reasoning
from sourced facts; **Proposal** = product choice awaiting the orchestrator/user;
**Measure** = must be measured on the reference devices before use.

## 1. Learner problem and scope

A learner on the reference MacBook Pro (Apple M1 Pro) with Chrome (Safari second) wants an
analogue, yoke-like pitch/roll input without buying hardware. Tilting a paired
iPhone moves the controls; keyboard/touchpad remain available and take over
whenever the phone cannot be trusted. Scope limits:

- Optional profile, never a launch prerequisite (R-INPUT-1 unchanged); phone page
  in a mobile browser, no native app (Proposal); R-INPUT-2 out of scope.
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

Pattern: QR-carried secret as in CTAP hybrid (F14), a hash commitment before the
short authentication string as in ZRTP (F15), and a code the user **types** on
the Mac. Threat assumption: anyone who photographs the QR learns `k`, and the
mailbox may be hostile; the QR alone must not let either one pair.

1. **Mac, start.** In Input settings the user clicks "Pair iPhone". The Mac page
   generates a pairing id (128-bit random), a pairing key `k` (128-bit,
   WebCrypto), a Mac nonce `nM` (128-bit, kept secret for now), a fresh
   `RTCCertificate` and its SHA-256 fingerprint `fM` (P12). It shows a QR code
   and a 120 s countdown.
2. **QR content.** `https://<phone-origin>/phone#id=<id>&k=<k>&fm=<fM>`. Secrets
   sit in the URL fragment: the fragment is dereferenced only by the user agent
   (RFC 3986 §3.5), is excluded from the HTTP target URI (RFC 9110 §7.1) and from
   `Referer` (RFC 9110 §10.1.3) (Fact F17). The phone page reads it once, then
   calls `history.replaceState` to drop it from the visible URL and history
   (Proposal; whether Safari history/iCloud sync could otherwise retain it is
   unverified). Single-use QR.
3. **Offer.** The Mac gathers all ICE candidates before sending (**non-trickle**:
   wait for `iceGatheringState` "complete", timeout 3 s), then posts one
   encrypted offer containing the SDP (with `fM`) and the commitment
   `cM = SHA-256("gefly-commit" ‖ id ‖ nM)`.
4. **Phone, connect.** The iPhone camera opens the page. One tap "Connect and
   allow motion" calls `DeviceOrientationEvent.requestPermission()` (F2), fetches
   and decrypts the offer, requires its fingerprint to equal `fm` (so nobody can
   impersonate the Mac to the phone), generates its own certificate `fP` and
   nonce `nP`, gathers all candidates and posts **one** encrypted answer with
   `fP` and `nP`.
5. **Channel up.** The Mac accepts exactly one answer per pairing id; a second
   answer, or any answer after the first, **aborts the pairing** and wipes keys
   (the mailbox also refuses a second write). DTLS completes; both sides verify
   the peer fingerprint against the signalled value. Only now, inside the DTLS
   channel, the Mac reveals `nM`; the phone checks it against `cM`. Because `fP`
   is fixed before `nM` is known, a hostile mailbox cannot grind certificates to
   match a code (ZRTP-style commitment, F15).
6. **Confirm by typing.** The phone, and only the phone, displays the 6-digit
   code `HKDF(k, "gefly-sas" ‖ id ‖ fM ‖ fP ‖ nM ‖ nP)`. The user types it into
   the Mac, which computes the same value from its own view of `fP`/`nP`. A
   phone that is not on the Mac's DTLS channel never receives `nM` and shows no
   code. Three wrong entries or 30 s without entry abort and wipe keys. Before a
   correct entry no sample reaches the input boundary.
7. **Calibrate.** The phone asks the user to hold it in the neutral grip and tap
   "Set neutral"; the Mac shows the live mapped pitch/roll before control is
   handed over.
8. **Paired state.** The Mac input-mode indicator shows "iPhone: live / paused /
   held / lost" with text and icon (no colour-only cue); the phone shows
   "Controlling Gefly on <Mac session name>" and the same state.
9. **Unpair.** One click on the Mac or one tap on the phone closes the channel,
   wipes `k`, nonces and certificates and returns to keyboard/touchpad. Closing
   or reloading either page also unpairs; nothing is persisted; one phone at a time.

**Signalling encryption.** Offer and answer use AES-GCM with separate keys
`HKDF(k, "gefly-offer")` and `HKDF(k, "gefly-answer")`; each key encrypts exactly
one message, with a fresh random 96-bit nonce, so a nonce is never reused under
a key. Additional authenticated data is `pv ‖ id ‖ role` (`role` = "offer" or
"answer"), so a blob cannot be replayed under another pairing or role.

## 5. Messages and the input boundary (Proposal)

Orientation events are **change-driven** ("significant change") and angles may
be `null` (Fact F18), so a still phone can go silent. The phone therefore
**resends its latest sample at a fixed 60 Hz** from a timer (Proposal; iOS
timer behaviour is **Measure**).

Phone → Mac, JSON, ≤ 256 bytes per message; the phone protocol version is `pv`,
distinct from the CONTRACTS semver `v`:

```text
{t:"ori", pv:1, sseq, tx_ms, ev_ms, alpha_deg, beta_deg, gamma_deg, scr_deg}
{t:"state", pv:1, sseq, tx_ms, st:"live"|"paused"|"hidden"|"visible"|"recenter"}
{t:"ping", pv:1, sseq, tx_ms}           Mac → phone: {t:"pong", sseq, tx_ms, mac_ms}
```

- `sseq`: per-pairing integer, strictly increasing across all phone messages,
  including resends (a resend is a new message carrying an old sample).
  Limitation (orchestrator note): with resends, a sensor that silently stops
  while the page stays visible looks like a phone held still, so the axis is held
  at its last value without fallback. Proposal: use `devicemotion` events (which
  fire continuously) as the sensor-liveness signal; until verified on the reference
  iPhone this remains a labelled limitation.
- `tx_ms`: phone clock at send time; the basis for staleness. `ev_ms`: the
  event's `timeStamp`, kept for latency metrics only (a still phone legitimately
  has an old `ev_ms`).
- Angles in degrees as delivered (F4), each possibly `null`; `scr_deg` is the
  phone's screen angle. Degrees exist only inside the iPhone profile; it
  converts to radians once.

The Mac iPhone profile (inside the input module) applies, in order:

1. **Authenticate**: accept messages only from the confirmed channel (§4).
2. **Validate**: reject non-finite values and alpha ∉ [0, 360), beta ∉ [−180,
   180), gamma ∉ [−90, 90) (F4 ranges), unknown `t`/`pv`, oversize messages;
   count and drop, never clamp (CONTRACTS §3). A sample with any `null` angle is
   dropped; only nulls for 1 s ⇒ `sensor_unavailable` (§6).
3. **Order/replay**: drop any `sseq` ≤ the last accepted one (out-of-order or
   replayed); count drops.
4. **Staleness**: a ping/pong exchange every 1 s estimates the clock offset from
   the minimum-RTT sample. Drop messages whose `tx_ms`, mapped to the Mac clock,
   is older than **100 ms** (Proposal). The offset is used for staleness and
   metrics only, never for the sim.
5. **Map**: convert to a quaternion (avoids the gimbal lock noted in P1
   Appendix A), take the rotation relative to the stored neutral, and extract
   pitch (tilt top edge away/toward) and roll (rotate like a wheel) for a
   **landscape grip** (Proposal). Apply dead zone (default 2°), full-deflection
   angle (default 30°, adjustable 10°–60°), exponential and inversion as for
   other profiles; the profile saturates its output to [−1, 1] by design
   (labeled device mapping).
6. **Emit** a CONTRACTS input proposal `{v, proposal_id, step, wall_ms, source:"iphone",
   controls:{pitch, roll}}` (the worker assigns `seq`, CONTRACTS §10.3) at most once per simulation step, latest sample
   wins. Yaw, throttle and discrete controls stay on keyboard/touchpad
   (Proposal; §10 Q-P4). Roll→yaw mixing remains the boundary assist.

**Recenter** (phone button or Mac `Enter`) stores the current orientation as
neutral; **pause** (phone or Mac) stops emitting and hands over per §6. Replay
stays deterministic: the log holds only emitted normalized controls with
`applied_step`/`seq`, never raw samples (CONTRACTS §3, SEC); `source_lost`, the
handover and every automatic or manual sim pause/resume are **log events with
their `step` and `seq`**, so replay reproduces the timeline without phone data.

## 6. Fallback and resume rules (Proposal)

Whenever the iPhone profile stops being the trusted source it emits
`source_lost` with a reason; the Mac shows a banner and text cue;
keyboard/touchpad become active immediately and may override any axis during the
hold; phone-driven axes not overridden hold their last values for 0.5 s and then
centre through one input with `source: "fallback"`, with a visible warning (GAPS
Q19; [CONTRACTS §10.4](CONTRACTS.md#104-device-loss-fallback-gaps-q19)), so control
is never lost silently mid-flight. Pausing on phone loss is a **Proposal** (optional
setting, default off), not decided by Q19 and not part of contract v1.1; if adopted
and enabled, the sim never resumes by itself and the learner resumes on the Mac, on
keyboard/touchpad or, where the table allows, back on the phone.

| Trigger | Detection | Reason | Return to phone control |
| --- | --- | --- | --- |
| Permission denied or no API | `NotAllowedError` (F2) or `DeviceOrientationEvent` undefined | `permission_denied` | Not in this pairing; control is never handed over |
| Sensor silent or null | No non-null `ori` within 1 s of permission or for any 1 s while live (F18) | `sensor_unavailable` | Re-pair |
| Backgrounding, app switch, lock | Phone `state: hidden` (best effort) or no message for **250 ms** on an open channel (events and timers stop, F3) | `phone_hidden` | **Resume window 60 s** on the same channel |
| Disconnect | Data channel `close`, ICE `failed`, or resume window expired | `disconnected` | Re-pair (keys are not reused) |
| Stale/out-of-order stream | > 20 % messages dropped over 1 s | `degraded` | Resume window, as `phone_hidden` |
| User pause or unpair | Explicit message or button | `paused` / `unpaired` | Pause: resume window; unpair: re-pair |

**Resume window.** While the channel stays open, the state is "held": keys,
`sseq` continuity and the channel remain; samples are ignored. When the phone
is visible again within 60 s (`state: visible`, valid samples flowing), it
asks the user to hold the neutral grip and tap "Set neutral" (**mandatory
re-recenter**); only then can the learner switch back to the phone and resume
on the Mac. After 60 s, or if the channel closes meanwhile, the state becomes
`disconnected`: keys are wiped and a new pairing is required. If iOS closes the
data channel while backgrounded (**Measure**), the outcome is `disconnected`.

The phone requests a screen wake lock while live (F16); refusal is shown, not fatal.

## 7. Latency budget (Proposal, to be fixed before evaluation)

End-to-end = start of phone motion → first changed photon of the attitude
indicator on the Mac display. Components on option A, with the expected mean
(uniform waits average half the period) and a worst-case allowance:

| Stage | Expected mean | Worst-case allowance | Basis |
| --- | --- | --- | --- |
| iPhone sensor fusion + event dispatch | **Measure** | **Measure** | Not specified (F4) |
| Phone 60 Hz send timer | 8.3 ms | 16.7 ms | Resend timer (§5); an event may wait for the next tick |
| Phone JS + send | 1 ms | 2 ms | Proposal |
| Wi-Fi one-way | 3 ms | 10 ms (p95) | Proposal; **Measure** via RTT/2 |
| Mac receive → input event to worker | 1 ms | 2 ms | Proposal |
| Wait for next step | 4.2 ms | 8.3 ms | dt = 1/120 s (CONTRACTS §2) |
| State stream + interpolation | 25 ms | 33.3 ms | 60 Hz stream wait plus one interval of interpolation delay (CONTRACTS §2) |
| Render + display scan-out | 12.5 ms | 16.7 ms | 1–2 frames at 120 Hz; refresh measured per run |
| **Sum excluding sensor** | **≈ 55 ms** | **≈ 89 ms** | |

Sending on each event and using the timer only for resends would remove the
timer row (implementation choice to measure). Proposed
acceptance on the reference Mac/iPhone, same 5 GHz access point:
motion-to-photon **p50 ≤ 70 ms** (≈ 15 ms left for the sensor stage) and **p95 ≤
110 ms** (≈ 20 ms left for sensor and jitter beyond the worst-case sum); the
phone path adds **≤ 40 ms p95** over the keyboard path measured with the same
method (E5); delivered message rate **median ≥ 55 Hz**, inter-message gap **p99
≤ 50 ms**; zero accepted samples after unpair. Numbers are proposals until the
orchestrator fixes them in SPEC/EVAL (R-INPUT-3 requires this before
evaluation); if the sensor stage measures larger, the budget is re-proposed
rather than silently relaxed.

**Measurement method (Proposal).**

1. Component timing: log `ev_ms`, `tx_ms`, Mac receive time, offset/RTT from ping/pong,
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
| Spoofed or unpaired input | Only the DTLS channel whose Mac fingerprint is pinned via the QR (`fm`) and whose phone side proved itself by the code typed on the Mac; single-use id, 120 s expiry, exactly one answer, one phone at a time; mailbox rate-limited | Foreign device with a photographed/expired QR; tampered offer/answer; second answer; second phone |
| Photographed QR plus hostile mailbox (knows `k`) | Phone pins `fM`, so the Mac cannot be impersonated; a forged answer leaves the real phone off-channel, so it shows no code to type; commitment `cM` to `nM` revealed after `fP` is fixed prevents grinding certificates to a matching code; a second answer aborts | Attacker answer with a photographed QR; certificate-grinding simulation; duplicate answers |
| Signalling tampering or replay | AES-GCM with per-role keys from `k`, one message per key, random 96-bit nonce, AAD `pv ‖ id ‖ role`; non-trickle single offer/answer | Swapped, replayed or cross-pairing blobs are rejected |
| Replay or reordering on the channel | Strictly increasing `sseq`, 100 ms staleness on send time `tx_ms`, fresh keys, nonces and certificates per pairing | Replayed captures, duplicated and reordered messages |
| Eavesdropping | DTLS encryption mandatory (F9, F10); secrets only in the URL fragment (F17), stripped with `history.replaceState`; no third-party STUN/TURN | Packet capture on the LAN shows DTLS only; server logs contain no fragment; phone history inspection |
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
  `source_lost` reason enum of §6; state that the iPhone profile saturates; log
  automatic and manual pause/resume with `step`/`seq`.
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
- **Q-P5** ~~Default on phone loss: auto-pause (proposed) or continue on keyboard?~~
  Q19 as recorded: hold 0.5 s, then centre, keyboard/touchpad active at once.
  Not decided by Q19: optional auto-pause (Proposal, default off). Whether Q19's
  "yes to proposals" covers the 60 s resume window and mandatory re-recenter is
  for the orchestrator to confirm in GAPS.
- **Q-P6** Accept the §7 budget numbers and the 60 Hz resend rate?
- Unverified platform behaviour (note "Not found"): iOS treatment of private-CA
  HTTPS, mDNS candidates, Chrome LNA gating of WebRTC, real sensor rate, timer
  throttling and data-channel survival when Safari is backgrounded.

## Decisions (GAPS Q19, 2026-11-01 18:13)

The user accepted the recommendations for Q-P1..Q-P6 and named the reference phone:
**iPhone 13 mini, latest iOS**, Safari. Hosting: the simulator's static host once
chosen, a local HTTPS dev server meanwhile. Grip: landscape, yoke-like, screen up.
Axes: roll tilt → aileron, pitch tilt → elevator, rudder on keyboard. Phone loss:
hold last values 0.5 s, then centre, with a visible warning. Budget: p95 ≤ 110 ms end
to end and ≤ 40 ms over keyboard, measured on the reference devices.
