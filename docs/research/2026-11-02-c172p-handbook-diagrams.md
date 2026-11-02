# Source facts for original C172P handbook diagrams

Scope: bounded loading, flight-limit and contact reference diagrams, not a reproduction of the handbook or an
acceptance of the selected 172S model. No manufacturer scan or illustration is
redistributed. The application draws original plots from numerical facts in
[aircraft-handbook-data](../../app/src/aircraft-handbook-data.ts). Source inches
and pounds are retained at this reference-diagram boundary, separately from SI
simulation state.

## Loading and CG

The manufacturer-authored [1982 Model 172P handbook scan](https://www.glasscockpitaviation.com/wp-content/uploads/2022/07/cessna-n54829-poh.pdf)
is the same third-party-hosted source identified in the
[airspeed research](2026-11-02-c172p-airspeed-markings.md), SHA-256
`5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c`.
Complete PDF pages 21, 22 and 105 were rendered and visually inspected.

Printed page 2-6 gives a 2400 lb normal-category takeoff/landing maximum; the
2407 lb ramp value is different. Printed page 2-7 gives these exact CG limits:

| Category | Forward arm at 1950 lb or less | Forward arm at maximum weight | Aft arm |
| --- | --- | --- | --- |
| Normal | 35.0 in | 39.5 in at 2400 lb | 47.3 in |
| Utility | 35.0 in | 36.5 in at 2100 lb | 40.5 in |

The forward boundary varies linearly between the stated weight points. The
datum is the lower front face of the firewall. Figure 6-8 on printed page 6-14
(PDF page 105) confirms the plotted shape and a 1500 lb lower plotting bound.
That bound is a **chart crop, not a certified minimum weight**. Utility-category
rear-seat/baggage restrictions remain relevant; the outline alone does not
determine whether a loading is permissible. No current simulated mass/CG point
is exported or invented. Source applicability and amendments remain unverified
beyond this fixed reference, as documented in the airspeed note.

## Published flight-envelope references

The user's clarification selects loading and flight-envelope diagrams. Complete
PDF pages 19 and 23 were rendered and visually inspected for this extension.
Printed page 2-8 gives the following flight load-factor limits at maximum takeoff
weight:

| Category | Maximum weight | Flaps up | Flaps down |
| --- | ---: | --- | --- |
| Normal | 2400 lb | +3.8 g / -1.52 g | +3.0 g |
| Utility | 2100 lb | +4.4 g / -1.76 g | +3.0 g |

No negative flaps-down value is stated; zero must not be substituted. Figure 2-1
on printed page 2-4 gives **normal-category** maneuvering references:

| Weight | VA KCAS | VA KIAS |
| --- | ---: | ---: |
| 2400 lb | 97 | 99 |
| 2000 lb | 91 | 92 |
| 1600 lb | 81 | 82 |

There is no 2200 lb row and no interpolation is added. The introduction specifies
utility VA as 102 KIAS at 2100 lb without a corresponding KCAS value. It cannot
be plotted as 102 KCAS.

An original normal-category chart may show separate load-factor and KCAS speed
guides, with the VA weight table. These published limits do not define the full
V-n boundary: stall/negative-stall curves, gust boundaries, flap-down negative
limits and a current aircraft operating point are absent. No polygon fills or
connecting curves imply an approved operating region. The source's design-load
footnote is not converted into an operating allowance or a damage threshold.

## Gear and structure contacts

The pinned [JSBSim v1.3.3 c172x definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
has source SHA-256 `b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840`.
Its structural coordinates are inches, positive aft/right/up; see the
[FGLGear frame description](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.h).

| Contact | X aft, in | Y right, in | Z up, in |
| --- | ---: | ---: | ---: |
| Nose wheel | -6.8 | 0 | -20 |
| Left main | 58.2 | -50.25 | -18.46 |
| Right main | 58.2 | 50.25 | -18.46 |
| Tail | 188 | 0 | 8 |
| Left tip | 43.2 | -214.8 | 59.4 |
| Right tip | 43.2 | 214.8 | 59.4 |

The first three are wheel contacts; the latter three are structure contacts.
An original top-view diagram uses X longitudinally and Y laterally, with Z in an
accessible coordinate table. The origin is the model datum, not the CG. Modeled
strut reaction is not structural stress or an accepted safe-load limit; this
diagram adds no damage model or aircraft-geometry validation.
