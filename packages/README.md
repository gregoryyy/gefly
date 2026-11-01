# Runtime module boundaries

`package.json` declares an ESM source boundary for these modules; it selects no
package manager, workspace build system or dependencies.

The narrow assessment airspeed mapping and repository-data adapter in
[training](training/README.md), with readonly types in
[contracts](contracts/README.md), are implemented as pure TypeScript. They run
without a package installer or whole-workspace build system. The remaining scope
notes reserve responsibilities; current runtime decisions live in
[ARCH](../docs/ARCH.md), while broader package/workspace tooling remains to be
selected. Root documents apply; no local document supersedes them.

| Module | Scope |
| --- | --- |
| [contracts](contracts/README.md) | Assessment airspeed types; broader versioned schemas, units, frames and state/input contracts reserved |
| [simulation](simulation/README.md) | Deterministic stepping and flight-dynamics adapter |
| [aircraft](aircraft/README.md) | Applicable aircraft configuration and systems |
| [avionics](avionics/README.md) | Instrument/sensor and avionics behavior |
| [training](training/README.md) | Assessment airspeed mapping; broader exercises, assists, feedback and assessment reserved |

Actual implementation follows [ARCH](../docs/ARCH.md), [SPEC](../docs/SPEC.md) and
foundation decisions; paths do not authorize a worker without a dispatch.
