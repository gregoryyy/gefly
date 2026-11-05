# Repeated scenery reloads during accelerated flight

Recorded 2026-11-05 19:43 Europe/Berlin. Author: user; transcription: Codex.

> ok it works smoothly now, however, after a few seconds the whole scenery gets reloaded

Clarification:

> now it doesn't load for 10 seconds, after 20 more seconds details is gone, another 10 seconds to load, then later again

Follow-up:

> now nothing loads any more, sometimes it seems it tries to but after half a second stops and resets

The actual integrated-browser UI was observed at SIM10× during read-only diagnosis. This is observed context for this reload report, not proof of pacing at the earlier control-instability report. Scope: prevent repeated whole-scene invalidation from starving terrain detail while retaining authoritative source/height updates and bounded rendering memory.
