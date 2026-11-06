# On-demand airport generator

Recorded 2026-11-06 08:04 Europe/Berlin. Author: user; transcription: Codex.
This is the recording time, not the original time of the earlier question.

Earlier conversation request:

> can the airfields be created on the fly when entering a region, later caching it.

Current instruction:

> build airport generator with the approach suggested

The earlier surface scope selects runways, taxiways and aprons first. Codex's
implementation uses bounded on-demand OSM region packages over existing terrain
with persistent local server caching. Detailed cell/cache/resource choices are
implementation decisions, not a verbatim archived user proposal. No new airport
directory, buildings, lighting, navigation or contact model is selected here.
