# Terrain root preparation and streamed-window retention

TODO2.0.154; R-WORLD-11/R-WORLD-9/R-SIM-2. The user reports slow 3D vector
terrain and repeated reloads during flight. The integrated app was observed at
10×. Cesium queues nonrenderable level-zero meshes before visibility culling;
4050 roots cannot finish when native windows advance every few seconds.

This foundation revision uses two180° roots and181-node final grids. Spacing
2^-L degrees matches its legacy native grid at L9; far/fine limitsL12/L14 retain
the prior finest spacing. Safe same-epoch updates retain the provider through
unchanged source cells; strict geometry/feather/coarse-preview and capacity
guards conservatively rebuild when necessary. Static combined Review inputs
remain bounded at 73 and retain prior regional filtering behavior.

Independent component/type checks cover this legacy source port. Later integrated
world30 browser tests establish the mechanism and actual source-aligned design:
NY45s10×/eight updates/one initial provider, 393 textures,22rendered public height
samples max0.04911m error, no errors. These are NOT represented as an actual
PR85 browser run. The separate later per-frame source-metadata scan and imagery
queue fixes are outside this foundation source diff.

Remaining limits include conservative rebuilds, progressive source-dependent
imagery, device/network variability and unchanged unverified native build
provenance. No all-world GPU-height or calibrated aircraft acceptance is claimed.
