# JSBSim height datum and Cessna 172S cockpit controls

Status: focused research for contracts v1. Part A is **verified** by reading JSBSim
source at tag v1.3.3 and by local numerical checks; Part B is **verified** against one
manufacturer manual copy (S17), with unconfirmed items marked. Not a data pack and not
a fidelity validation.
Researcher: Claude Code subagent `researcher`, dispatched by the orchestrator.
Accessed: 2026-11-01 12:40–13:10, Europe/Berlin.
Scope: GAPS [Q18](../GAPS.md) O-3 (geoid/MSL model, JSBSim `h-sl` datum, terrain for
AGL; contract fixture U-6) and O-7 (exact 172S control list and detents); supports
TODO 1.4 and [CONTRACTS](../design/CONTRACTS.md) §1 and the controls table.

## Question and method

A. Which datum do JSBSim's height properties use, how are latitude/longitude
interpreted, how is terrain supplied, and where should a geoid and the Hessen DGM1
(DHHN2016 normal heights) enter?
B. Which cockpit controls of a classic-panel 172S (s/n 172S9491–172S9809) matter for a
circuit that starts at the holding point with the engine running, with positions and
detents from public sources?

Method: structured investigation; no deep-research skill or service ran. JSBSim was
shallow-cloned at tag `v1.3.3` into a session scratch directory (not the repository);
`git log` shows commit `66f7fafc07fe13e7ede9db20873030fed2881713` (16 Oct 2026). Source
was read directly; line numbers below refer to that tree. Geoid grids were downloaded
from the PROJ CDN to scratch and evaluated with pyproj 3.8.0 / PROJ 9.8.1 in a scratch
virtual environment. The 172S manual (S17) was re-downloaded (SHA-256 prefix
`420dbdaf5517a7a0`, identical to the copy in the
[172S sources note](2026-11-01-c172s-fr172-sources.md)) and converted with
`pdftotext -layout`; the OCR text was read, figures were not inspected visually.

## Source register

| ID | Title | Publisher | Revision / date | URL | Rights | Status |
| --- | --- | --- | --- | --- | --- | --- |
| J1 | JSBSim source tree | JSBSim Team | tag v1.3.3, commit `66f7faf`, 16 Oct 2026 | [GitHub](https://github.com/JSBSim-Team/jsbsim/tree/v1.3.3) | LGPL-2.1 (accepted, GAPS Q17) | **Read** (files listed below) |
| G1 | EGM2008 2.5′ geoid grid `us_nga_egm08_25.tif` | NGA via PROJ-data | PROJ CDN, SHA-256 `4191d471eefebf24…` | [cdn.proj.org](https://cdn.proj.org/us_nga_egm08_25.tif) | PROJ-data readme: "Public Domain" | **Read** (evaluated) |
| G2 | EGM96 15′ grid `us_nga_egm96_15.tif` | NGA via PROJ-data | SHA-256 `db493027562c9b00…` | [cdn.proj.org](https://cdn.proj.org/us_nga_egm96_15.tif) | "Public Domain" | **Read** (evaluated) |
| G3 | German Combined Quasigeoid GCG2016 `de_bkg_gcg2016.tif`, ETRS89/DREF91/2016 (EPSG:10283) → DHHN2016 height (EPSG:7837) | BKG via PROJ-data | added in PROJ-data 1.16, SHA-256 `598f18324dea7f8e…` | [cdn.proj.org](https://cdn.proj.org/de_bkg_gcg2016.tif); [BKG product page](https://gdz.bkg.bund.de/index.php/default/digitale-geodaten/geodaetische-basisdaten/quasigeoid-der-bundesrepublik-deutschland-quasigeoid.html) | PROJ-data readme: CC BY 4.0, credit "© Bundesamt für Kartographie und Geodäsie" | **Read** (evaluated); BKG's own terms page not read |
| G4 | PROJ-data `files.geojson`, `us_nga_README.txt`, `de_bkg_README.txt` | OSGeo PROJ | CDN, accessed 2026-11-01 | [cdn.proj.org](https://cdn.proj.org/files.geojson) | MIT/X (PROJ-data metadata) | **Read** |
| S17 | Cessna Model 172S Information Manual (reprint of POH/AFM 172SPHUS, Rev 5, 19 Jul 2004; original issue 8 Jul 1998) | Cessna Aircraft Company; copy hosted by a flying club | 499 pages | [befa.org copy](https://www.befa.org/wp-content/uploads/2019/12/POH-Cessna-172S.pdf) | "COPYRIGHT © 1998" Cessna; notice says the manual is for general purposes only and not kept current. Third-party hosting grants no reuse right | **Read** (Sections 1, 4, 7, 9 Supplement 2 front matter) |
| S5 | EASA TCDS IM.A.051 Issue 11 | EASA | 17 Nov 2025 | see [172S sources](2026-11-01-c172s-fr172-sources.md) | as recorded there | Not re-read; cited from that note |
| S1b | FAA TCDS 3A12 Rev 80 | FAA | 26 May 2010 | see [172S sources](2026-11-01-c172s-fr172-sources.md) | US government work | Not re-read |

The GeographicLib online geoid calculator was refused by its host's bot protection and
was not used. The JSBSim reference manual and Doxygen site were not read; source
comments and code are the evidence.

## Part A: JSBSim height and geodesy (J1)

### Verified from source

| Item | Finding | Citation (v1.3.3) |
| --- | --- | --- |
| Planet model | Default Earth is the WGS-84 ellipsoid: `a = 20925646.32546 ft`, `b = 20855486.5951 ft`, WGS-84 GM and J2, gravity type `gtWGS84` (J2 gravity). A planet file may override a, b, GM, J2 | `src/models/FGInertial.cpp:58-64`, `:92-120` |
| `position/h-sl-ft`, `h-sl-meters` | `GetAltitudeASL()` = `|r_ECEF| − GetSeaLevelRadius()` | tie `src/models/FGPropagate.cpp:856-859`; getter `:579-582`; metres `FGPropagate.h:338` |
| "Sea level radius" | `GetSeaLevelRadius()` = `a·(b/a)/sqrt(1 − e²cos²ψ)` with ψ the **geocentric** latitude, i.e. the radius of the WGS-84 ellipsoid surface along the geocentric radius vector. **No geoid is involved** | `src/math/FGLocation.cpp:273-279` |
| `position/geod-alt-ft` | Geodetic height above the WGS-84 ellipsoid along the ellipsoid normal (Fukushima 2006 method) | tie `FGPropagate.cpp:870`; `FGLocation.cpp:318-347`; `FGLocation.h:278-282` |
| `h-sl` vs `geod-alt` | Same ellipsoid, different direction (radial vs normal). Locally computed with J1's formulas at 49.96° N, 8.64° E: difference +0.6 mm at 117 m, +5.5 mm at 1,000 m, +16 mm at 3,000 m. Treat both as **ellipsoidal heights**; "ASL"/"MSL" in JSBSim names means "above the reference ellipsoid" | own script (scratch), inference from code above |
| Meaning in comments | The initial-condition code states "an altitude above the mean sea level (or a position radius which is the same)", confirming that JSBSim equates MSL with the ellipsoid | `src/initialization/FGInitialCondition.cpp:771-772` |
| Latitude properties | `position/lat-gc-*` are **geocentric**; `position/lat-geod-*` are geodetic (read-only at run time); longitude is common. `FGLocation::SetPositionGeodetic(lon, lat, h)` takes **geodetic** latitude and height above the ellipsoid | `FGPropagate.cpp:860-869`; `FGLocation.h:217-228`, `:248-276`; `FGLocation.cpp:243-254` |
| IC latitude | `ic/lat-gc-*` geocentric, `ic/lat-geod-*` geodetic. In an `<initialize>` XML file, `<latitude>` is **geocentric unless `type="geod"`/`"geodetic"`** | `FGInitialCondition.cpp:1086-1097`, ties `:1491`, `:1570-1591`; header doc `FGInitialCondition.h:184-189` |
| Latitude error size | Geocentric minus geodetic latitude at 50° N is 0.1897° (≈ 21 km north–south). Mixing the two is a gross error | own script |
| Writing heights | Run-time `position/h-sl-ft` setter scales the ECEF vector (constant geocentric latitude): numerically, +1,000 m moves the geodetic latitude ≈ 3.3 m south. `ic/h-sl-ft` after `ic/lat-geod-*` uses a branch that keeps the geodetic latitude | `FGPropagate.cpp:586-591`; `FGLocation.cpp:214-223`; `FGInitialCondition.cpp:756-821`; own script |
| Atmosphere input | The atmosphere and winds use `GetAltitudeASL()` (`h-sl`) as geometric altitude; the standard atmosphere converts it to geopotential with `EarthRadius = 6356766 m` | `src/FGFDMExec.cpp:448`, `:453`; `src/models/atmosphere/FGStandardAtmosphere.h:319-322`, `:361` |
| Ground callback | Terrain is supplied by an `FGGroundCallback` whose `GetAGLevel(t, location, contact, normal, v, w)` returns height above ground and fills contact point, surface normal and surface velocities. Set by `FGInertial::SetGroundCallback()` | `src/input_output/FGGroundCallback.h:62-119`; `src/models/FGInertial.h:93-151` |
| Default callback | `FGDefaultGroundCallback`: ground is the ellipsoid raised by one constant `mTerrainElevation` (ft); normal is the ellipsoid normal; `AGL = geod-alt − mTerrainElevation` | `src/input_output/FGGroundCallback.cpp:41-57`; `FGGroundCallback.h:125-145`; created at `FGInertial.cpp:76` |
| `h-agl`, terrain properties | `position/h-agl-ft` = callback AGL; `position/terrain-elevation-asl-ft` returns the contact point's **geodetic (ellipsoidal) height** and its setter calls `SetTerrainElevation` (the default callback's constant). `ic/terrain-elevation-ft` documented as "above sea level" is the same ellipsoidal quantity | `FGPropagate.cpp:605-619`, `:633-651`, ties `:871-878`; `FGInitialCondition.cpp:646-680`; `FGInertial.cpp:227-237` |
| Gear contact | Landing gear forces use the callback contact point and normal | `src/models/FGLGear.cpp:299` |
| Bindings | The Python bindings in v1.3.3 expose no ground-callback hook (no match in `python/`); only the constant terrain elevation property is reachable. A custom callback requires C++ (e.g. the WASM driver) | search of `python/*.pyx.in`, `*.pxd` |

### Geoid values near the region (G1–G3, evaluated here)

Undulation/height anomaly (metres, ellipsoidal minus physical height):

| Point | EGM96 | EGM2008 | GCG2016 |
| --- | --- | --- | --- |
| 49.96° N 8.64° E (near EDFE, approximate) | 48.12 | 48.00 | 47.80 |
| 50.0379° N 8.5622° E (near EDDF, approximate) | 48.15 | 48.01 | 47.82 |

On a 0.1° grid over 48.4–51.8° N, 6.0–11.4° E (roughly the 100 NM region): EGM2008
44.1–49.7 m; GCG2016 − EGM2008 between −0.26 and −0.09 m where GCG2016 is defined
(Germany). The points are approximate, not official ARP coordinates.

### Implications (inference and proposal)

1. JSBSim has **no geoid**. Its `h-sl`, `geod-alt`, terrain elevation and AGL all refer
   to the WGS-84 ellipsoid (mm-level differences between radial and normal heights).
   Contract fixture U-6 can therefore assert: `h-sl` ≈ `geod-alt` (|Δ| < 0.02 m below
   3,000 m) and `h-agl` = `geod-alt` − terrain with the default callback.
2. If true ellipsoidal heights were fed to JSBSim, its atmosphere would be evaluated
   ≈ 48 m too high (about 5–6 hPa at sea level, roughly 8.3 m/hPa), unless terrain and
   QNH were also shifted. This conflicts with QNH/QFE realism (R-SIM-3).
3. **Recommended convention (proposal):** run JSBSim in a *regional physical-height
   frame*: the bridge passes JSBSim heights that are physical heights (DHHN2016 normal
   height in Germany, EGM2008 orthometric height elsewhere) and treats JSBSim's
   ellipsoid as that height surface. Then:
   - `h_msl_m` = JSBSim `position/geod-alt-ft` × 0.3048 (prefer `geod-alt` over `h-sl`:
     it is normal-direction and consistent with `SetPositionGeodetic`).
   - The custom ground callback returns DGM1 heights **unchanged** (they are already
     DHHN2016), so field elevations, terrain and the atmosphere share one datum.
   - `h_ell_m = h_msl_m + ζ(lat, lon)`, computed **outside the dynamics** (bridge or
     environment module, once per published state) and never fed back. Use **GCG2016**
     inside Germany (the official quasigeoid for DHHN2016, matches DGM1), and
     **EGM2008** as the global fallback and outside GCG2016 coverage. Record both model
     ids and grid hashes in `env`.
   - Rendering (CesiumJS uses WGS-84 ellipsoidal heights) receives `h_ell_m`.
   - Error budget: geodetic latitude/longitude are unaffected by the vertical shift
     (height is along the normal); the 44–50 m variation over the region tilts the
     vertical by a few arc-seconds (gravity direction effect negligible); GCG2016 vs
     EGM2008 differ by ≤ 0.26 m locally.
4. Positions must be set with `ic/lat-geod-*` (or `type="geod"` in XML), never through
   `lat-gc`, and the bridge should not write `position/h-sl-ft` at run time (it shifts
   geodetic latitude). The E1 study driver already uses `ic/lat-geod-rad` and
   `ic/h-sl-ft` (`studies/e1-jsbsim/wasm/driver.cpp:41-43`).
5. A deterministic terrain callback must be a pure function of location (and sim time),
   with its tiles loaded before stepping; asynchronous fetches inside a step would
   break replay.
6. Alternative (not recommended): keep JSBSim fully ellipsoidal and convert terrain to
   ellipsoidal heights (DGM1 + ζ), then patch atmosphere altitude. That needs a JSBSim
   source change or a custom atmosphere, and AIP elevations would need conversion too.

### Open points (A)

- WGS-84 vs ETRS89 horizontal difference (sub-metre to about 1 m in 2026, not
  computed here) is separate from the vertical datum and remains open.
- Which vertical reference the German AIP uses for aerodrome elevations was not
  researched; ICAO practice refers elevations to MSL with EGM96 for WGS-84 conversion
  (*unverified*).
- BKG's own licence page for GCG2016 was not read; CC BY 4.0 rests on the PROJ-data
  readme (G4). Attribution text must be carried if the grid is redistributed.

## Part B: 172S cockpit controls for a circuit from the holding point (S17)

Configuration: conventional panel, POH/AFM 172SPHUS Rev 5. The chosen range
172S9491–172S9809 is after the fuel-return change (s/n 172S9491, S17 p. 7-24, Fig. 7-6
sheet 2) and after the split avionics master change (s/n 172S8704, S17 p. 7-34).
Entries are short factual extracts or paraphrase with page reference; checklists and
figures are not reproduced.

| Control | Positions / sense / detents | Source (S17 unless noted) | Status |
| --- | --- | --- | --- |
| Primary flight controls | Cable/linkage; control wheel for ailerons and elevator; rudder/brake pedals | p. 7-6 | Verified |
| Surface travels | Ailerons up 20°/down 15°; elevator up 28°/down 23°; rudder 16°10′ each way; elevator tab up 22°/down 19° | S5 §2 C.21 | Verified (TCDS) |
| Nose-wheel steering | Via rudder pedals through a spring-loaded bungee, about 10° each side; up to 30° with differential braking; minimum turning radius about 27 ft | p. 7-12 | Verified; bungee force law not given |
| Elevator trim | Manual, vertically mounted wheel on the centre pedestal with position indicator; forward = nose down, aft = nose up. Electric trim only "if installed" | p. 7-6, p. 7-12, Fig. 7-2 item 35; p. 4-15 item 19 | Verified; wheel travel, turns and takeoff mark **unconfirmed** |
| Throttle | Push-pull; full forward open, full aft closed; knurled friction lock at the base | p. 7-19 | Verified; travel **unconfirmed** |
| Mixture | Red knob with lock button; full forward rich, full aft idle cutoff; vernier by rotation, rapid movement with button pressed | p. 7-19 | Verified; continuous, no intermediate detents stated |
| Wing flaps | Electric; switch lever in a slotted panel with mechanical stops at 10°, 20° and 30°; lever moved right to clear the 10° and 20° stops; scale and pointer to the left; 10 A FLAP breaker. Positions: 0 (up), 10, 20, 30 | p. 7-13; S5 travel 0–30° | Verified; extension/retraction time and whether the lever is spring-return or follow-up **unconfirmed** (figure not read) |
| Toe brakes | Hydraulic disc brake per main wheel; master cylinder on each pilot pedal; pilot and copilot pedals interconnected | p. 7-29 | Verified |
| Parking brake | Handle under the left side of the panel: set brakes with pedals, pull handle aft, rotate 90° down | p. 7-29 | Verified |
| Fuel selector | Three positions BOTH, RIGHT, LEFT (no OFF on the selector); BOTH for take-off, climb, landing | p. 7-24, p. 7-26 | Verified |
| Fuel shutoff valve | Separate knob on the pedestal; ON = pushed full in, OFF = pulled full out | p. 7-12, Fig. 7-6; p. 4-11 item 9 | Verified |
| Auxiliary fuel pump | Switch/breaker labelled FUEL PUMP; used for priming and engine-driven pump failure, off for normal take-off | Fig. 7-7A labels; p. 4-12; p. 3-5 | Verified (schematic label from OCR) |
| Master switch | Split rocker MASTER: right half BAT, left half ALT; up ON, down OFF | p. 7-33 | Verified |
| Avionics master | Two-section (split) rocker from s/n 172S8704, one section per avionics bus; up ON | p. 7-34 | Verified |
| Ignition | Rotary key switch OFF, R, L, BOTH, START (clockwise); START spring-loaded, returns to BOTH | p. 7-22 | Verified |
| Exterior lights | Navigation, dual landing/taxi lights (left wing), beacon, wing-tip strobes; breaker/switches lower left panel, up ON. Labels BCN, LAND, TAXI, NAV, STROBE in the schematic | p. 7-37; Fig. 7-7A | Verified; exact panel order **unconfirmed** |
| Interior lights | Dimming controls for radio/panel and glareshield/pedestal below the centre panel | Fig. 7-2 items 31–32; p. 7-37 | Verified; outside first circuit |
| Pitot heat | 5 A switch/breaker PITOT HEAT, lower left panel | p. 7-41 | Verified |
| Alternate static air | Valve below the throttle, pulled on to use cabin static | p. 7-41 | Verified |
| Carburettor heat | **Absent.** Engine is fuel injected (p. 1-4); induction has a spring-loaded, automatically opening alternate air door (about 10 % power loss at full throttle when open); no carb-heat control in the panel list (Fig. 7-2) or text search | p. 1-4, p. 7-22, Fig. 7-2 | Verified (absence by document search) |
| Altimeter | Barometric altimeter; knob at lower left sets the barometric scale | p. 7-43 | Verified; **scale units (inHg/hPa) and setting range not stated** in S17; depends on the installed instrument (EU aircraft often hPa or dual) |
| Airspeed indicator | Knots; TAS window with pressure-altitude/temperature ring set by the lower left knob | p. 7-42 | Verified |
| Transponder | KT 76C with blind encoder; mode knob OFF, SBY, TST, ON, ALT; VFR code button | p. 7-46; Section 9 Supplement 2, Figure 1 legend | Verified modes; physical detent order **unconfirmed** |
| Nav/com, audio | KX 155A nav/com with KI 208 or KI 209A; KMA 26 audio panel; ELT 3000-11. Fig. 7-2 shows a second nav/com, ADF and GPS, which are options | p. 7-46; Fig. 7-2; Section 9 log | Verified; optional fit to be chosen (GAPS Q3) |
| Cabin heat / air | Push-pull controls on the right panel | Fig. 7-2 items 25–26 | Verified; not needed for first circuit |
| Control lock | Exists (p. 7-18); not used at holding point | contents p. 7-1 | Not read in detail |

Procedural context (cited, not copied): the before-take-off checklist sets mixture
rich, fuel selector BOTH, trim and flaps for take-off (0°–10°) and ends with brakes
release (p. 4-15); normal take-off uses flaps 0°–10° (p. 4-15); landing allows 0°–10°
below 110 KIAS and 10°–30° below 85 KIAS (p. 4-17); balked landing retracts to 20°
first (p. 4-17). A scenario starting at the holding point therefore implies an initial
state with engine running, master and avionics on, fuel selector BOTH, shutoff ON,
fuel pump OFF, ignition BOTH, and parking brake per the scenario author.

### Rights

S17 is Cessna copyright (1998) and its notice says it is for general purposes only and
not kept current. Positions and labels above are facts cited by page; no text block,
figure or checklist is reproduced. Do not add the PDF or its figures to the repository.
FAA TCDS values are US government works; EASA values are cited facts from a
"proprietary document" (see the [172S sources note](2026-11-01-c172s-fr172-sources.md)).

### Open points (B)

- Altimeter subscale units and range, trim wheel travel and takeoff index, flap
  actuation time and lever behaviour, throttle/mixture travel and the KT 76C knob
  order need the installed-equipment documentation or figure inspection.
- Whether the simulated aircraft is a US or EU-registered example (hPa altimeter,
  8.33 kHz radio) is a configuration choice for GAPS Q3.
- S17 is Rev 5 (2004); later revisions applicable to 172S9491–172S9809 were not checked.

## Handoff to product and orchestrator

- CONTRACTS §1: define `h_msl_m` as JSBSim-native (regional physical height) and
  `h_ell_m` as derived with a named quasigeoid/geoid (GCG2016 in Germany, EGM2008
  fallback); fixture U-6 assertions in Implication 1; lat via `ic/lat-geod-*` only.
- CONTRACTS controls: flap detents {0, 10, 20, 30}°; ignition {OFF, R, L, BOTH,
  START(spring)}; fuel selector {LEFT, BOTH, RIGHT}; fuel shutoff {ON, OFF}; split
  `master_bat`/`master_alt` confirmed; carb heat absent confirmed; add `pitot_heat`,
  `alt_static`, lights {BCN, LAND, TAXI, NAV, STROBE} and transponder mode if in scope.
- Remaining TBD-src items are listed under the open points above.

## JSBSim seed handling

Appended by the product role, 2026-11-01, from a direct read of the JSBSim
source at tag `v1.3.3`, commit `66f7faf` (same tree as Part A). Supports
[CONTRACTS](../design/CONTRACTS.md) §5 and fixture R-8.

`simulation/randomseed` is tied to `FGFDMExec::SRand`
(`src/FGFDMExec.cpp:155`), which stores the value and re-seeds the shared
generator (`src/FGFDMExec.cpp:1373–1377`). The property is an `int`, stored as
`unsigned int` (`src/FGFDMExec.h:633, 691`). The executive is constructed with
seed 0 (`src/FGFDMExec.cpp:83`), so an unseeded run is deterministic, not
clock-seeded. The generator is `std::default_random_engine` with
`uniform_real_distribution` on [−1, 1) and `normal_distribution(0, 1)`
(`src/FGJSBBase.h:72–97`); both the engine and the distribution algorithms are
implementation-defined by the C++ library, so sequences can differ between
toolchains — another reason replay is same-build. Consumers of the shared
generator: turbulence in `FGWinds` (`src/models/atmosphere/FGWinds.cpp:76, 227,
308–311`), sensor noise in `FGSensor` (`src/models/flight_control/FGSensor.cpp:55,
190–192`) and `<random>`-type functions without a `seed` attribute
(`src/math/FGFunction.cpp:298–309`). `atmosphere/randomseed` and
`<sensor>/randomseed` create separate generators (`FGWinds.cpp:500–503, 598`;
`FGSensor.cpp:289–292`). A `seed="time_now"` attribute seeds from the system clock
(`FGFunction.cpp:303–304`, `FGJSBBase.h:75–78`); aircraft-package validation
rejects it. `ResetToInitialConditions` (`src/FGFDMExec.cpp:685`) does not re-seed
(no seed call in its body), so the generator continues.
