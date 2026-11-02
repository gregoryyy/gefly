# Ideal pressure-altimeter increment

Scope: partial R-AIR-3 in the local generic research simulator. These references
support an ideal pressure indication and reference-setting demonstration, not a
validated 172S instrument installation or accepted EDFE datum.

## Engine pressure and units

The pinned [JSBSim v1.3.3 FGAtmosphere source](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.3.3/src/models/FGAtmosphere.cpp)
binds `atmosphere/P-psf` to the modeled ambient pressure. Its `ConvertFromPSF`
implementation converts to Pa by dividing by `0.0208854342`. The getter itself
returns psf; its overload taking a number is an **altitude**, not a pressure-unit
selector. Read the property and convert at the bridge boundary rather than
passing an enum to that overload. The corresponding
[standard-atmosphere source](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.3.3/src/models/atmosphere/FGStandardAtmosphere.cpp)
binds `atmosphere/P-sl-psf` to sea-level pressure and calculates the atmosphere
from its own geometric/geopotential-height model. Do not reconstruct static
pressure from the application's uncorrected geometric altitude.

[NIST's conversion table](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)
independently lists 1 lbf/ft² = 47.88026 Pa and conventional 1 inHg = 3386.389 Pa.
The former is rounded in the table. The bridge uses the exact SI derivation
`0.45359237 × 9.80665 / 0.3048² = 47.88025898033584 Pa/psf`, retaining
the documented difference from JSBSim's rounded internal conversion.
Use 100 Pa per hPa. A display-unit change must preserve the underlying Pa value.

## Model and derivation

[NASA TP–2009-215402, section 4, table 4-5](https://ntrs.nasa.gov/api/citations/20100021405/downloads/20100021405.pdf)
gives the troposphere pressure-height relation and constants. Using positive
lapse-rate magnitude `L = 0.0065 K/m`, `T0 = 288.15 K`, `p0 = 101325 Pa` and
`g0 = 9.80665 m/s²`, invert it as:

```text
H(p) = (T0/L) × [1 − (p/p0)^(R×L/g0)]
```

[NASA TP–2007-213475, appendix A](https://ntrs.nasa.gov/api/citations/20120003268/downloads/20120003268.pdf)
explicitly lists dry-air `R = 287.053 J/(kg·K)`. This is an ideal ISA/geopotential
pressure-height scale. Do not equate it exactly with JSBSim's geometric altitude.
The selected numerical domain is −2000 through 11000 m on that pressure-height
scale (the troposphere rows in NASA table 4-4), not an aircraft flight envelope.
Return unavailable outside it rather than extend the formula through higher layers.

For the ideal adjustable instrument, derive:

```text
indicated_m = H(ambient_static_pa) − H(setting_pa)
```

This scale-offset derivation follows [Transport Canada's description of the
Kollsman mechanism](https://tc.canada.ca/en/aviation/publications/aviation-safety-letter/issue-4-2024/high-low-look-out-krazy-kollsman):
changing the setting rotates the mechanism, and matching station pressure gives
zero. The [NWS altimeter-setting equation](https://www.weather.gov/media/epz/wxcalc/altimeterSetting.pdf)
also rearranges to a difference of pressure powers, rather than simply replacing
`p0` with the setting in the atmospheric pressure-ratio equation. Its 0.3 hPa
station-pressure correction belongs to that meteorological reduction procedure;
it is **not** added to the simulator's static pressure. This is a documented ideal
model derivation, not a sourced manufacturer's calibration, lag or error model.

## Demonstration and checks

[EASA's altimeter-setting bulletin](https://www.easa.europa.eu/community/system/files/2023-08/EUR%20OPS%20Bulletin%202023_001.pdf)
distinguishes QNH altitude, standard-pressure flight levels and QFE height above
the declared reference. The bounded demo uses actual engine sea-level pressure
for its atmosphere reference, 101325 Pa for STD, and launch-point pressure for a
**launch-point practice QFE**. The launch point is airborne: it is neither EDFE
field elevation nor terrain/AGL. With the default standard atmosphere, QNH and
STD coincide; that coincidence must be visible. Presets are teaching shortcuts,
not a claim that the mechanical altimeter has QNH/QFE hardware modes.

Numerical checks include independently hand-evaluated source-equation fixtures:
89874.6 Pa gives approximately 1000 m pressure height, 22632.1 Pa approximately
11000 m, and 100000 Pa approximately 110.884 m. These are calculation fixtures,
not separately accepted aircraft data. Also check setting direction, zero when
setting equals ambient pressure, and a unit conversion. EASA's
[ATM/ANS guidance](https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-atm-ans-regulation-eu?erules-id=ERULES-1963177438-3335)
provides a useful independent near-sea-level sensitivity example: 1013 versus
1013.25 hPa differs by about 6.8 ft. Do not use only a formula/inverse round trip
as evidence. Application practice bounds, such as 800–1100 hPa, are not sourced
installed-instrument limits. No weather feed, accepted airport elevation,
transition-procedure lesson or aircraft-specific accuracy is accepted here.
