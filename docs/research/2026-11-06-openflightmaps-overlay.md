# OpenFlightMaps integration assessment

Recorded 2026-11-06 09:12 Europe/Berlin by Codex orchestrator. Task2.0.168, R-DATA-1/R-NAV-1. Research, not selected data ingestion.

The [ED download page](https://openflightmaps.org/downloads/ed/) is the requested region. Its client-side product selector did not expose a verified current edition/download in this inspection. Do not treat a publisher page as an ingested current product.

The [official FAQ](https://openflightmaps.org/faq/) lists AIXM, OpenAir and CUP data. OFMX is identified separately by the publisher repository. The archived [GitHub OFMX repository](https://github.com/openflightmaps/ofmx) redirects to the current [publisher repository](https://gitlab.com/openflightmaps/ofmx) and [format wiki](https://gitlab.com/openflightmaps/ofmx/-/wikis/home). The GitLab format contents were not retrievable in this inspection. These support a simplified MapLibre aviation overlay above the existing base map: aerodromes, navigation features and airspace can be separate selectable layers with source/edition metadata. This is preferable to deriving features from rendered chart pixels. Actual feature mapping, CRS, completeness and edition checks remain future ingestion work.

The [publisher about page](https://openflightmaps.org/about/) describes General Users License use including commercial derivatives, attribution and end-user error reporting/correction obligations. Data and rendered plates have distinct rights; the FAQ warns that rendered plates can contain separately protected products. Verify the exact selected edition and full applicable license before redistribution; this assessment does not authorize hotlinking chart tiles or infer plate rights from database terms. No OFM data/dependency is added here.

A later integration should supply visible attribution, edition/coverage/validity, source links and a user-driven error-report action. Nothing automatically submits reports or treats OFM as operationally authoritative. The existing publisher link remains available.
