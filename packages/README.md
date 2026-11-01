# Runtime module boundaries

These scope notes reserve responsibilities; current runtime decisions live in
[ARCH](../docs/ARCH.md), while package/workspace tooling remains to be selected. Root documents apply; no local document supersedes them.

| Module | Scope |
| --- | --- |
| [contracts](contracts/README.md) | Versioned types/schemas, units, frames and state/input contracts |
| [simulation](simulation/README.md) | Deterministic stepping and flight-dynamics adapter |
| [aircraft](aircraft/README.md) | Applicable aircraft configuration and systems |
| [avionics](avionics/README.md) | Instrument/sensor and avionics behavior |
| [training](training/README.md) | Exercises, assists, feedback and assessment |

Actual implementation follows [ARCH](../docs/ARCH.md), [SPEC](../docs/SPEC.md) and
foundation decisions; paths do not authorize a worker without a dispatch.
