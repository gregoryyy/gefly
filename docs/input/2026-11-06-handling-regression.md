# Renewed flight-handling regression

Recorded 2026-11-06 01:36 Europe/Berlin. Author: user; transcription: Codex.

After reporting PR91 merged, the user wrote:

> still the plane now behaves very strangely and sensible. this wasn't the case yesterday

Codex asked:

> By “sensible,” do you mean overly sensitive to steering, unstable even after releasing the controls, or both?

The user answered:

> Both

The clarification confirms both excessive steering sensitivity and instability
with the controls released. “Sensible” is interpreted as “sensitive” in this
context; the original wording is preserved above. The comparison with yesterday
is the user's observation, not a measured baseline or an established cause.

This renews the existing [handling report](2026-11-05-control-stability.md) and
open TODO2.0.153. Investigate current native/model response and application input
separately before selecting a repair. No causal connection to terrain, CWS,
merged PRs or an engine rebuild is established by this report.
