# Paired-iPhone orientation control: platform and transport sources

Status: focused primary-source research for TODO 1.13 (R-INPUT-3, GAPS
[Q16](../GAPS.md)). Platform rules are **verified** from the cited specifications;
browser behaviour on the reference iPhone/Mac, update rates and latency are
**not measured**. Nothing was built or run on a device.
Author: Claude Code subagent `product` (own source research), dispatched by the
orchestrator. Accessed: 2026-11-01 16:30–16:45, Europe/Berlin.
Used by: [PHONE-CONTROL](../design/PHONE-CONTROL.md).

## Question and method

Which browser rules govern reading iPhone orientation in a web page, and which
transport and pairing patterns let that page drive a Mac browser session on a
local network without accounts? Which latency facts are sourced and which must
be measured?

Method: structured multi-source investigation (no deep-research skill installed).
Specifications and RFCs were downloaded with `curl` to the session scratch
directory, converted to text and searched; the passages cited below were read in
context. WebFetch could not resolve w3.org/MDN from its own resolver, so MDN was
not used; MDN is secondary to the specifications anyway. Search queries:
"DeviceOrientationEvent.requestPermission Safari iOS 13", "Chrome Local Network
Access permission prompt".

## Source register

| ID | Title | Publisher | Version / date | URL | Status |
| --- | --- | --- | --- | --- | --- |
| P1 | Device Orientation and Motion | W3C Devices and Sensors WG | Candidate Recommendation Draft, 26 Oct 2026 | [w3.org/TR/orientation-event](https://www.w3.org/TR/orientation-event/) | Read: §4 Permissions, §6 API, §9 automation ranges, Changes |
| P2 | New WebKit Features in Safari 13 | WebKit (Apple) | 2019 blog post | [webkit.org](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/) | Read (permission paragraph) |
| P3 | App Review Guidelines §2.5.6 | Apple | page as accessed | [developer.apple.com](https://developer.apple.com/app-store/review/guidelines/) | Read (§2.5.6) |
| P4 | Secure Contexts | W3C WebAppSec | CRD, 10 Nov 2023 | [w3.org/TR/secure-contexts](https://www.w3.org/TR/secure-contexts/) | Read: §3.1 algorithm |
| P5 | Mixed Content | W3C WebAppSec | CRD, 23 Feb 2023 | [w3.org/TR/mixed-content](https://www.w3.org/TR/mixed-content/) | Status only; rule cited via P4 note |
| P6 | Local Network Access (blog, update 29 Sep 2025) | Chrome for Developers | published 9 Jun 2025 | [developer.chrome.com](https://developer.chrome.com/blog/local-network-access) | Read |
| P7 | WebRTC Data Channels, RFC 8831 | IETF | Jan 2021 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8831) | Read §5–6 |
| P8 | Security Architecture for WebRTC, RFC 8827 | IETF | Jan 2021 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8827) | Read §4 (fingerprints, DTLS) |
| P9 | ICE, RFC 8445 | IETF | Jul 2018 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8445) | Read §5.1.1.1 host candidates |
| P10 | WebRTC IP Address Handling, RFC 8828 | IETF | Jan 2021 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8828) | Read §5 modes |
| P11 | mDNS ICE candidates | IETF MMUSIC | draft-03, Dec 2021, expired Jun 2022 | [datatracker](https://datatracker.ietf.org/doc/html/draft-ietf-mmusic-mdns-ice-candidates) | Read abstract; expired draft, informative only |
| P12 | WebRTC: Real-Time Communication in Browsers | W3C WebRTC WG | editor's draft as accessed | [w3c.github.io/webrtc-pc](https://w3c.github.io/webrtc-pc/) | Read: `RTCConfiguration.iceServers`, `RTCDataChannelInit`, `RTCCertificate.getFingerprints` |
| P13 | The WebSocket Protocol, RFC 6455 | IETF | Dec 2011 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc6455) | Downloaded; TCP framing known, not re-read in depth |
| P14 | Announcing WebRTC and Media Capture | WebKit (Apple) | 2017 blog post | [webkit.org](https://webkit.org/blog/7726/announcing-webrtc-and-media-capture/) | Read (availability sentence) |
| P15 | CTAP 2.2, §11.5 hybrid transports | FIDO Alliance | PS 14 Jul 2025 | [fidoalliance.org](https://fidoalliance.org/specs/fido-v2.2-ps-20250714/fido-client-to-authenticator-protocol-v2.2-ps-20250714.html) | Read §11.5, §11.5.1 |
| P16 | ZRTP, RFC 6189 | IETF | Apr 2011 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc6189) | Read intro and §7 SAS concept |
| P17 | Screen Wake Lock API | W3C | Working Draft as accessed | [w3.org/TR/screen-wake-lock](https://www.w3.org/TR/screen-wake-lock/) | Read `request()` steps |
| P18 | WebKit Features in Safari 16.4 | WebKit (Apple) | 2023 blog post | [webkit.org](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) | Read (Screen Wake Lock entry) |

## Verified findings

Orientation API (P1, P2, P3):

- F1. `DeviceOrientationEvent` and `ondeviceorientation` are `[SecureContext]`;
  events fire only when the relevant settings object is a secure context (P1 §6, Changes).
- F2. `DeviceOrientationEvent.requestPermission()` checks transient user
  activation; without it the promise is rejected with `NotAllowedError` (P1 §6).
  It requests `accelerometer` and `gyroscope` (plus `magnetometer` for absolute).
  P1 marks this integration "at risk" because of low test pass rates.
- F3. Events are not delivered when the document's visibility state is not
  "visible" (P1 §6 firing steps). Background tabs and a locked phone give no samples.
- F4. Angles are intrinsic Tait-Bryan Z-X'-Y'': alpha [0, 360), beta [−180, 180),
  gamma [−90, 90), in degrees, each value limited to 0.1° precision against
  passive fingerprinting (P1 §6, §9). The spec defines no event rate.
- F5. Safari 13 on iOS/iPadOS requires `requestPermission()` before orientation
  and motion events are delivered (P2).
- F6. iOS apps that browse the web must use WebKit, except under EU/Japan
  alternative-engine entitlements (P3 §2.5.6). Chrome on iPhone is therefore
  normally WebKit; behaviour must be tested per browser anyway.

Secure context and local network (P4, P6):

- F7. An origin is potentially trustworthy if its scheme is `https`/`wss`, its
  host is in 127.0.0.0/8 or ::1, it is `localhost`/`*.localhost`, or it is a file
  or configured trustworthy origin (P4 §3.1). **Inference:** a page served to the
  iPhone as `http://192.168.x.y` or `http://mac.local` is not a secure context, so
  F1 blocks orientation; the phone page must be HTTPS with a certificate the
  phone accepts.
- F8. Chrome 142 launches a Local Network Access permission prompt for public
  sites connecting to local addresses; the request is secure-context-only;
  WebSocket, WebTransport and WebRTC were "not yet gated" and are planned (P6).

Transport (P7–P14):

- F9. Data channels run SCTP over DTLS; ordered and unordered delivery are
  supported; with zero retransmissions and unordered delivery each message is
  sent once and delivered in arrival order, a "UDP-like service" (P7 §5–6).
  Browsers expose `ordered` and `maxRetransmits` in `RTCDataChannelInit` (P12).
- F10. Each side's DTLS certificate fingerprint travels in the signalling
  message; security against the signalling server rests on that fingerprint and
  an optional identity assertion (P8 §4). `RTCCertificate.getFingerprints()`
  exposes the local fingerprint to the page (P12).
- F11. Host candidates come from local interfaces such as Wi-Fi (P9 §5.1.1.1);
  `iceServers` defaults to an empty list (P12), so two devices on one subnet need
  no STUN/TURN in principle. RFC 8828 limits local-address exposure without user
  consent (P10 §5); P11 proposes concealing them with mDNS names. **Inference:**
  candidates may arrive as `*.local` names and need multicast DNS on the Wi-Fi;
  networks that isolate clients (guest/AP isolation) block both direct WebRTC and
  local WebSocket.
- F12. WebKit added WebRTC to Safari on macOS High Sierra and iOS 11 (P14).
  Current data-channel interoperability with Chrome on macOS is not verified here.
- F13. WebSocket (P13) runs over TCP: in-order, reliable; a lost segment delays
  later samples (head-of-line blocking). `ws://` from an HTTPS page is mixed
  content (P5); `wss://` to a LAN host again needs a phone-trusted certificate.

Pairing patterns (P15, P16) and screen (P17, P18):

- F14. CTAP hybrid (passkeys on a phone) shows a QR code carrying a public key
  and a 16-byte secret; the key authenticates the platform, the secret
  authenticates the phone; traffic goes through a tunnel service, with BLE
  advertisements to show proximity (P15 §11.5–11.5.1).
- F15. ZRTP displays a short authentication string on both ends so users can
  detect a man in the middle by comparing it verbally (P16 §7).
- F16. Screen Wake Lock `request()` rejects with `NotAllowedError` when the
  document is hidden (P17); Safari 16.4 lists Screen Wake Lock (P18).

## Not found or not verified

- Actual `deviceorientation` rate and jitter on the reference iPhone/iOS; no
  primary source states it. Must be measured (event `timeStamp` deltas).
- iOS Safari treatment of a self-signed or private-CA HTTPS page as a secure
  context after the user accepts a warning; whether iOS's Local Network privacy
  prompt applies to Safari pages.
- Safari mDNS candidate behaviour, data-channel latency on Wi-Fi, and Chrome 142+
  LNA gating of WebRTC/WebSocket at the time of implementation.
- Reference iPhone model and iOS version (not given in GAPS Q16).

## Implications and handoff

Transport and pairing proposals, the latency budget and the SEC/SPEC edits are
in [PHONE-CONTROL](../design/PHONE-CONTROL.md). The hard platform constraint is
F1/F7: whatever transport is chosen, the iPhone page must be a secure context,
and samples stop whenever it is hidden (F3). Confidence: high for F1–F11, F14–F16
(normative text read); medium for the inferences in F7, F11, F13.
