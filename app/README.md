# Web application boundary

Reserved for the browser flight scene, cockpit views, input calibration and
exercise feedback. Current stack decisions are recorded in [ARCH](../docs/ARCH.md);
there is no runnable application here yet. Consume shared contracts and authoritative
simulation/sensor state rather than implementing a second UI flight model.

Root [ARCH](../docs/ARCH.md), [SPEC](../docs/SPEC.md) and contributor rules apply.
An explicit task dispatch determines ownership; the proposed initial stream is code2.
