# Open Rhein-Main navigation source survey

Researcher: Codex subagent `ap_research`. Accessed 2026-11-03, approximately
02:15–02:22 Europe/Berlin. Supports R-NAV-1/R-NAV-2/R-DATA-1/R-REGION-1 and the
[raw request](../input/2026-11-03-rhein-main-navigation.md). Research is not an
acceptance of present operational validity, antenna survey accuracy or procedures.

## Finding and recommendation

FlightGear's original NAV810 file supplies a coherent, openly licensed historical
VOR/DME/LOC/GS inventory for a useful regional increment. Its embedded edition is
**cycle 2013.10**, not a current AIRAC. The 2026 repository commit date does not
update that edition. OurAirports is a permissive alternative for VOR/DME/NDB and
airport anchors, but does not supply ILS components and does not declare an AIRAC.

There is an additional FlightGear provenance issue: the last navigation-file
change in 2014 explicitly calibrated GS antenna heights to FlightGear scenery.
The original earlier revision is available. **Recommendation, not a product
decision:** use the single pre-calibration snapshot for the historical navigation
inventory, rather than mix present community VOR data with old ILS data or silently
present FlightGear-adjusted heights as surveyed antenna elevations. Neither
snapshot establishes a named modern vertical datum or current real-world service.

No dedicated deep-research service is installed. Method: official project/data
publisher pages, pinned public repository API/raw downloads, source-byte hashes,
NAV810 format inspection and original FlightGear consumer-code cross-checks.
Downloads and derived exploratory rows remain in `/tmp/gefly-rhein-main-nav/`;
only these original notes and the raw request were written to the repository.

## Inspected source register

| ID | Source, exact revision and link | Rights and applicability |
| --- | --- | --- |
| FG1 | Official [FlightGear fgdata repository](https://gitlab.com/flightgear/fgdata), project 9225950, commit `fdcf1e08f5682690f4b932ca3dfa666ce744cdd3`, committed 2026-11-02 14:23:49 UTC; [pinned nav.dat.gz](https://gitlab.com/flightgear/fgdata/-/raw/fdcf1e08f5682690f4b932ca3dfa666ce744cdd3/Navaids/nav.dat.gz). | File header: Robin A. Peel, copyright 2013; **GPL-2.0-or-later**, no warranty. Header edition: `810 Version - data cycle 2013.10, build 20131334, metadata NavXP810.` Preserve the complete copyright/license header and a GPL copy when distributing source-derived data. |
| FG2 | [Navigation-file history](https://gitlab.com/api/v4/projects/9225950/repository/commits?ref_name=fdcf1e08f5682690f4b932ca3dfa666ce744cdd3&path=Navaids/nav.dat.gz&per_page=1): last change `d0db413dc06ac7d32522ecccfeab58bf5201a335`, 2014-03-27; [commit record](https://gitlab.com/api/v4/projects/9225950/repository/commits/d0db413dc06ac7d32522ecccfeab58bf5201a335). | Commit title identifies GS-height calibration to FlightGear scenery. Actual decompressed comparison confirms changed EDDF GS elevations; positions/frequencies in the selected EDDF records remain the same. |
| FG3 | Parent before that change, `5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95`; [pinned original historical nav.dat.gz](https://gitlab.com/flightgear/fgdata/-/raw/5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95/Navaids/nav.dat.gz). | Same NAV810 2013.10/build20131334 header and GPL-2.0-or-later grant. Avoids the specifically documented subsequent FlightGear GS-height calibration; still not certified survey data. |
| FG4 | fgdata [LICENSE.md](https://gitlab.com/flightgear/fgdata/-/raw/fdcf1e08f5682690f4b932ca3dfa666ce744cdd3/LICENSE.md), pinned FG1 commit. | Complete GNU GPL version 2 text; the navigation-file header supplies its explicit later-version option. `COPYING` and `Navaids/AptNavGNULicence.txt` are absent at the inspected tree; do not cite them as retrieved files. |
| XP1 | Laminar Research, [X-Plane Navigation Data File Specification NAV810](https://developer.x-plane.com/wp-content/uploads/2015/11/XP-NAV810-Spec.pdf), 7 pages, document footer 17 September 2015; especially pp.2–7. | Primary format authority. It documents GPL redistribution with preservation of the complete data header. File rows, not this specification's example rows, supply the regional values. Specification is cite-only; no PDF bundled. |
| FG5 | Original FlightGear consumer code at `807e406dd3bceca816942490a999970e157dbcfa`: [navradio.cxx](https://raw.githubusercontent.com/FlightGear/flightgear/807e406dd3bceca816942490a999970e157dbcfa/src/Instrumentation/navradio.cxx), [dme.cxx](https://raw.githubusercontent.com/FlightGear/flightgear/807e406dd3bceca816942490a999970e157dbcfa/src/Instrumentation/dme.cxx), [navrecord.cxx](https://raw.githubusercontent.com/FlightGear/flightgear/807e406dd3bceca816942490a999970e157dbcfa/src/Navaids/navrecord.cxx), [navdb.cxx](https://raw.githubusercontent.com/FlightGear/flightgear/807e406dd3bceca816942490a999970e157dbcfa/src/Navaids/navdb.cxx). | GPL-2.0-or-later headers. Read to resolve magnetic sign, packed GS values, coordinates, DME subtraction and pairing. No FlightGear source implementation copied into this note. |
| OA1 | [OurAirports open data](https://ourairports.com/data/), [dictionary](https://ourairports.com/help/data-dictionary.html), repository commit `72322ae9555947b969dda8effa793072159a9a1e` (2026-11-02 02:53:26 UTC), [pinned navaids.csv](https://raw.githubusercontent.com/davidmegginson/ourairports-data/72322ae9555947b969dda8effa793072159a9a1e/navaids.csv), [LICENSE](https://raw.githubusercontent.com/davidmegginson/ourairports-data/72322ae9555947b969dda8effa793072159a9a1e/LICENSE). | Publisher public-domain release; repository uses the Unlicense. No accuracy/fitness guarantee. Download date or daily generation is not an AIRAC/current-service guarantee. Schema lists VOR, VOR-DME, VORTAC, DME, TACAN and NDB variants; no LOC/GS. |
| OA2 | [OurAirports EDDF page](https://ourairports.com/airports/EDDF/), facility record inspected 2026-11-03, record update shown 2026-01-29. | Open community airport coordinate `50.026706, 8.558350`, used only as an explicitly provisional exploratory regional anchor. It is **not verified as the official airport reference point**. User comments are untrusted and were not research evidence. |
| OP1 | Fraport, [Online-Bericht 2012](https://www.fraport.com/content/dam/fraport-company/documents/konzern/verantwortung/publikationen/geord_nachhaltigkeitsberichte/2012/bericht-2012---gesamtdokument-online-version.pdf/_jcr_content/renditions/original.media_file.download_attachment.file/bericht-2012---gesamtdokument-online-version.pdf), PDF pp.91–94 (printed report sections 90–93). | Primary airport-operator cross-check, cite-only: describes an additional 3.2° ILS trial on the northwest runway from 18 October 2012. It does **not** establish specific frequency/ident/antenna rows. The base FG inventory has only 3.0° GS entries, so cannot be described as every actual ILS variant even for that period. |

DFS AIP/portal material was not machine-retrieved or incorporated. The existing
[EDFE source note](2026-11-01-edfe-aerodrome-sources.md) records its automated-use
and redistribution restrictions. No current DFS AIRAC, NOTAM, station operational
status, service-volume limitation or real procedure has been verified here.

## Exact reusable artifacts

All paths below are temporary research inputs, not shipped application assets.
The gzip SHA is the preferred upstream integrity boundary. `.dat` files named
`original-bytes` preserve the raw decompression; the convenience `.dat` copies were
decoded as Latin-1 and re-encoded UTF-8 and therefore have different byte hashes.

| Artifact under `/tmp/gefly-rhein-main-nav/` | SHA-256 |
| --- | --- |
| `fg-pinned-nav.dat.gz` (FG1, 681007 bytes) | `6274e9722782e24b9f318d677b52206c99b1e01a42372998658417fbb2fc836c` |
| `fg-nav-original-bytes.dat` (FG1, 2043823 bytes) | `4f50673cdd59c75e4ac6a1896624dfcc6ea75798ca6b76492c21c2b3417cd012` |
| `fg-pre-calibration-nav.dat.gz` (FG3, 680628 bytes) | `24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839` |
| `fg-pre-calibration-original-bytes.dat` (FG3, 2043824 bytes) | `b65a1425bed63febfdbf97d57fa9e2a5565641bf00f1c9dca9a6c518b0c7c5d5` |
| `fg-LICENSE.md` | `451d3aa0291bac2c0826061ede585cbadd12b2237a84624f4d611986f371d73c` |
| `oa-pinned-navaids.csv` (1524931 bytes) | `d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1` |
| `oa-LICENSE` | `6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e` |
| `fg-pinned-navradio.cxx` | `6a1c72ee73b1f403714186b3f885a961b2039800ac98a576861ea3aae285f48f` |
| `fg-pinned-dme.cxx` | `113a3379d1df2e8e83c23bc5dcf1cc84b0f1890aff077a14862d62493b64c348` |
| `fg-pinned-navrecord.cxx` | `eb73159c97d1ea091b9a859f7b2c9f72a4e208023666a37c9a3a1f767dcf5a09` |
| `fg-pinned-loader.cxx` (upstream `navdb.cxx`) | `48703f4fe4f2022df3257d4ad4b4e26089b3d39cbc964cdc5c0fe11b376c264e` |

`fg-pre-calibration-regional-rows.json` and `fg-regional-rows.json` hold exploratory
filtered rows with original line numbers. They are convenience results, not a
versioned production schema. Root integration owns any compiler, manifest,
license notice and accepted source choice.

## NAV810 interpretation and sign

Fields are whitespace-delimited. Row types: 2 NDB; 3 VOR family; 4 ILS LOC;
5 standalone LOC; 6 GS; 7/8/9 markers; 12 paired DME; 13 DME with displayed
frequency. Identifiers are not globally unique. Preserve airport/runway identity,
frequency and component type when joining ILS/DME rows. Frequency is MHz×100 for
VOR/LOC/GS/DME rows and kHz for NDB; a GS frequency is the paired NAV tuning
frequency, not its actual UHF carrier. Separate DME coordinates/elevation are
authoritative for the chosen source; do not reuse a LOC position or airport
elevation as a substitute.

- Latitude/longitude are decimal geodetic degrees, north/east positive. FlightGear
  reads them through `SGGeod::fromDegFt` and uses WGS84 inverse geodesy. Treat this
  as the source consumer's horizontal interpretation; the header does not provide
  a separate datum realization statement.
- Elevation is **feet MSL** in the NAV810 definition. It does not identify
  DHHN2016, EGM96 or another vertical realization. Missing/suspicious zero
  elevations must not silently become surveyed zero or synthesized airport data.
- LOC bearings are **true degrees**. Type-3 column 7 is the VOR station's slaved
  variation, not present-day WMM declination. Consumer `navradio.cxx` sets the VOR
  twist from that field, calculates station radial as true outbound bearing minus
  twist and selected true course as OBS plus twist (lines 469, 483, 932 in the
  pinned file). Therefore **true = station radial + slaved variation**; positive
  is east. For LOC, FlightGear sets twist to zero and uses the true course field.
  Do not apply station variation to LOC bearings or replace it with OurAirports'
  separate magnetic-variation field.
- Type-6 column 7 is `GS_angle_deg × 100000 + GS_true_course_deg`. Decode angle
  with `floor(packed / 1000) / 100` and course with `packed % 1000`, as verified
  by `FGNavRecord::glideSlopeAngleDeg` and navradio's GS-axis construction.
  Example: `325123.456` means 3.25° and 123.456° true; division/rounding that
  collapses it to 3° is wrong. Preserve GS and LOC bearings separately where the
  records differ slightly.
- Type-12/13 column 7 is **DME bias in NM**. `dme.cxx` lines 208–211 subtracts it
  from geometric slant distance and clamps the result to zero. IFCW has a
  1.000 NM bias: indication is `max(0, slant_nm − 1)`, not added bias or pure
  horizontal range. A matching type-3 family name alone does not create DME.

OurAirports' dictionary separately distinguishes slaved station variation from
magnetic variation and has DME-specific fields. This survey deliberately resolved
the sign using the actual original consumer rather than the dictionary's wording.

## Bounded inventory and reference records

Exploratory filter: spherical great-circle distance, Earth radius 6371000 m,
100 NM = 185200 m, provisional OA2 center above. It yields 241 rows in either FG
revision: 40 NDB, 31 VOR-family, 35 ILS LOC, 4 standalone LOC, 35 GS, 22 outer
markers, 22 middle markers, 35 paired-DME rows and 17 standalone-DME rows. Of 31
VOR-family rows, 25 have actual matching DME rows by ident and frequency. These
counts are filter evidence, not official regional completeness or current status.

Nearby reference VOR/DME values from FG3 include FFM 114.20 MHz (50.053742,
8.637092; 491 ft), RID 112.20 (49.781692,8.541486;328 ft), TAU 116.70
(50.250461,8.162517;1343 ft), GED 110.80 and FUL 112.10. FRD is a standalone
DME at 115.90 MHz, 50.030467,8.567053,441 ft. FFM/RID/TAU have explicit
paired DME rows; all three type-3 station slaved variations are 0.0° in FG3.
This preserves historical values; it does not assert those installations operate
in that configuration today.

EDDF LOC/GS records in FG3 (antenna coordinates, feet MSL as the source labels
them; every GS angle is 3.0°):

| Runway / ident / MHz | LOC lat,lon / ft / course true | GS lat,lon / ft / course true | Actual DME-ILS record |
| --- | --- | --- | --- |
| 07C / IFCE / 110.55 | 50.046217,8.591547 /364/69.614° | 50.032567,8.539847 /355/69.590° | absent |
| 07L / IFNE / 111.75 | 50.04636890,8.53576845 /357/69.586° | 50.038802,8.50044060 /357/69.586° | 50.038802,8.50044060 /357ft; bias0 NM |
| 07R / IFSE / 110.95 | 50.041236,8.591492 /362/69.619° | 50.027492,8.539389 /328/69.594° | absent |
| 25C / IFCW / 111.55 | 50.031700,8.530794 /329/249.568° | 50.042903,8.583114 /364/249.568° | 50.042903,8.583114 /364ft; bias1 NM |
| 25L / IFSW / 111.15 | 50.026722,8.530750 /328/249.570° | 50.037992,8.582733 /362/249.594° | absent |
| 25R / IFNW / 111.35 | 50.03659583,8.49488084 /357/249.586° | 50.04570516,8.52932127 /357/249.586° | 50.04570516,8.52932127 /357ft; bias0 NM |

The later FG1 GS heights for the same order are 329/324/318/364/348/342 ft.
These differences are the documented calibration change, not a newly surveyed
edition. Being below the airport's published field elevation is not itself proof
of an error: an airport field elevation need not equal every antenna location.

EDFH has IHAE runway03 at 109.30 MHz and IHAW runway21 at111.30, with separate
LOC and 3.0° GS rows; exact raw rows/line numbers are in the scratch regional JSON.
No ETOU-associated record was found in this file. This absence is **missing source
coverage**, not evidence that ETOU has no real radio navigation facilities.

## Implementation handoff and remaining gates

Freeze one exact source snapshot, original notice and license; declare the date and
the historical simulator purpose visibly. Keep radio components separate, and
carry missing DME/GS/elevation through as unavailable. Distinguish station magnetic
radials, true LOC/GS geometry and the prototype's current TRUE DG teaching control.
Use source reception ranges only as simulator data; no terrain mask, official
service-sector/altitude restrictions, outages or multipath validity is established.

Validate source hashes, parser row counts/units, nonzero station-variation sign,
3.25° unpacking, actual separate DME coordinates/bias, same-frequency ambiguity,
near-station/range/sector flags, opposite-course and GS above/below cases, and
recorded configuration. Demonstrate a real-identifier intercept through actual
native dynamics and conditional LOC/GS reception without presenting an old dataset
as current clearance/procedure authority. Root owns specification and decisions;
independent reviewers must validate the resulting implementation and evidence.
