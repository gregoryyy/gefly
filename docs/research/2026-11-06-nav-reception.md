# Navigation reception source inventory

2026-11-06 15:49 Europe/Berlin. Author: Codex housekeeping subagent
`/root/nav_signal_housekeeping`. Source inspection only; no runtime reproduction,
implementation acceptance or current-service verification is claimed.

The user reports that tuning VOR/DME and other navaids produces no instrument
signal. The orchestrator owns the reproduction, scope and shared requirements;
this note identifies the existing source boundaries and checks to preserve.

## Existing receiver and discovery boundaries

[SPEC R-NAV-1 and R-NAV-2](../SPEC.md) require supported cockpit navigation and
traceable source records. R-NAV-4 declares a historical regional receiver
increment, while the working-app worldwide discovery requirement deliberately adds community discovery and standby
selection without adding receiver signals. The [architecture](../ARCH.md#worldwide-airport-discovery-boundary)
and [security boundary](../SEC.md#worldwide-community-discovery-packages) make
the same distinction. The working-app OurAirports integration note (`docs/research/2026-11-06-ourairports-integration.md`)
records why displayed NAV frequencies alone do not establish receiver support.

| Inventory | Present use and applicability |
| --- | --- |
| [Historical NAV package](../../app/public/navdata/README.md) | NAV810 cycle2013.10, around100NM from the declared community EDDF reference. VOR, LOC, paired GS/DME and standalone DME; not current AIRAC or actual operating status. Source heights, magnetic calibration, ranges, component coordinates and bias are retained. |
| Working-app worldwide OurAirports package (`app/public/airports/world/README.md`) | Pinned public-domain community discovery of airports/runways/COM/navaids. It provides global map selection and valid standby channels; it is not the receiver's NAV810 catalogue. |
| Fictional LAB | Isolated legacy/test signal. The cockpit selector was removed; archived synthetic fixtures retain their own semantics. |

`main.ts` loads the historical package into the UI via
`setNavigationCatalogue`. The native worker separately calls the same
`loadNavigationPackage`; `navdata-identity.ts` requires identical verified bytes
before regional guidance is considered matched. Loading failure, missing worker
identity or mismatch intentionally disables the UI catalogue and shows an alert.
These are additional diagnostic paths, not evidence that the current report is a
hash mismatch.

`radio-nav.ts` passes only that page-local catalogue to the shared
`studies/e1-browser/sim/navigation.js` receiver calculation. `navigation-gauges.ts`
uses the resulting independent lateral/GS/DME validity fields. A DME-only service
must leave its lateral NAV flag set while allowing a DME readout; an invalid CDI
alone is not proof of failed DME reception.

The map frequency action fills standby. Swapping is required to activate that
channel. Even after swapping, a worldwide discovery record outside the historical
receiver package does not become a signal under the current implementation.
The report may therefore concern this missing product capability, an unswapped
standby selection, an intentional service limit, or a receiver defect; source
inspection alone does not decide which occurred.

## Record compatibility and missing data

`world-airport-contract.ts` and `world-airport-data.ts` retain navaid source ID,
transmitted identifier, name/type, coordinates, nullable elevation in feet,
nullable frequency in kHz, country and associated airport. The current compiler
`utils/airports/world.py` selects those fields. This describes the derived
package; it does not establish that the original CSV lacks every other field.

The historical receiver's `validNavRecord` instead requires explicit range,
source-line identity, altitude in metres, VOR station magnetic calibration, and
independent DME coordinates/height/range/bias. LOC needs a fixed true course;
GS needs its own geometry and angle. A direct cast from worldwide discovery to
this record would either fail validation or require invented values. A receiver
extension needs a separately declared source/geometry contract and applicability
labels; absent source components must remain unavailable. Preserve repeated
identifiers as distinct source identities and co-channel ambiguity safeguards.

NDB/TACAN and out-of-band channels are not made receivable by a VHF NAV tuning
button. The historical package explicitly inventories unsupported NDB/marker
rows, and the supplied instruments have no ADF/marker receiver. Do not relabel
a GPS bearing as radio reception or geographic distance as radio DME.

## Existing regression coverage

These are source inventories of checks, not newly executed test outcomes.

- `app/tests/world-airports.browser.mjs` explicitly excludes signal reception
  from its accepted scope. It selects Zurich East ZUE110.050MHz into NAV2
  **standby only**, asserting unchanged active channels. It separately verifies
  Cape Town CB NDB463kHz has no NAV tuning action.
- `app/tests/regional-nav.browser.mjs` exercises historical standby and swap on
  both receivers, LOC/GS/bearing flags and read-only Review.
- `app/tests/regional-nav-flight.browser.mjs` covers the source-derived EDDF
  practice preset, paused OBS, actual native APR/GS capture and recorded Review.
- `app/src/radio-nav.test.ts` covers tuning/OBS/receivers and synthetic LAB
  bearing/slant-distance distinctions.
- `studies/e1-browser/sim/navigation.test.mjs` covers source calibration,
  independent DME range/bias, LOC/GS sectors, ambiguity, passage, NAV2, invalid
  records and package integrity. `navigation-worker.mjs` covers worker integration.
- `app/src/navdata-identity.test.ts` covers UI/worker package agreement and
  explicit failure; these tests do not establish the new user's runtime state.

## Proposed bounded integration checks

Before accepting a repair, reproduce a named source station at a declared
position/altitude and observe active versus standby frequencies, UI/worker source
identity, reception reason and independent CDI/GS/DME flags. Exercise NAV1 and
NAV2 independently, paused tuning and actual live native guidance. If worldwide
receiver support is added, use a station outside the historical extent and a
separately documented source contract, retaining historical priority/identity,
service absence, component units, magnetic/true references, co-channel handling,
loading/failure bounds and Review behavior. Verify that display and worker/AP
use the same accepted source; a UI-only needle is insufficient.

No shared documents, runtime, dependency, immutable input or another worker's
files were changed by this housekeeping task. The orchestrator should add this
note to the research index when integrating it. Actual reproduction, tests,
quality/validation and peer status belong to subsequent evidence.

## Task2.0.177 integration direction

Recorded15:51 Europe/Berlin: the orchestrator assigned the repair direction: extend the
**same pinned historical NAV810 source worldwide**, rather than synthesizing
receiver records from the OurAirports directory. The initial boundary above is
retained as the diagnosis/pre-change record. R-NAV-1/R-NAV-2/R-NAV-4, source/data
integrity, common worker/instrument calculations and historical applicability
remain the relevant acceptance scope. Implementation and runtime outcomes are
not yet recorded by this housekeeping note.

The existing compiler uses original row range, elevation and multi-purpose
calibration fields. It converts feet→metres and VHF source frequency→kHz;
VOR magnetic calibration, fixed true LOC course, GS angle/course and DME bias
remain distinct. Keep the exact pinned source gzip, full original license notice
and source-line links in the global derived package. Avoid replacing source
ranges with invented generic values merely to obtain a signal.

Global expansion also invalidates assumptions specific to the old100NM subset:
VOR identities formed only from type/identifier/channel can collide across the
world, component searches must remain bounded, and four malformed far-away GS
rows currently have explicit regional exclusions. Record global rejection/
conflict outcomes and preserve unaffected valid services without guessing malformed
components. The package loader, same-byte worker/UI identity and picker/render
budgets need explicit global bounds; do not simply raise assurance extraction
limits for a large generated JSON asset. A small descriptor plus hash-bound
opaque UTF-8 asset can retain file-level provenance, following the established
worldwide directory transport convention.

Current discovery records remain a different edition and source. Matching a
modern community marker to an older NAV810 identifier/frequency does not prove
that their physical components or operating status agree. The UI should identify
historical receiver coverage and make failed/missing signals explainable.


## Delivered reception and measured checks

The pre-change inventory above is historical. The active receiver source now
contains7923 historical services (3720VOR/3490LOC/713standaloneDME), with5685
explicit DME and3171GS components. The original86regional service records remain
identical. Compact UTF-8 package bytes and the original pinned gzip are distributed
with their hash/provenance/license. Independent source audits compare every field
to the original raw source. Four malformed source rows, unsupported channels,
invalid GS angles and ambiguous components do not gain fabricated guidance.

Both working-app and publication [browser records](../reviews/2026-11-06-nav-reception-runtime.json)
pass seven groups: CPT/KLO/CTV standby→swap on both receivers, actual instrument
and native NAV1 agreement, paused state invariance, standalone DME lateral flags,
preserved IFCW LOC/GS bars and200-row searchable picker bounds. Live CPT AP NAV
keeps the source valid across185/220native steps respectively. This establishes
software coupling, not calibrated receiver or servo performance. The source is
historical2013.10 and distinct from modern map discovery. Reload the app once,
load a supported service to standby and swap active; missing modern channels and
unsupported NDB/TACAN direction remain unavailable.

Corrected publication CI passes554Node/22applicationPython/85assurance/11training
cases;247repository-tool tests execute with one platform skip, JSBSim study14of23
with nine optional skips, and C172S study25cases. Fifteen focused navigation tests,
nine compiler tests and six affected regional fixture tests also pass independently.
The initial gate and intentionally interrupted publication browser attempt remain
explicit historical observations in the runtime record. [Quality](../reviews/2026-11-06-nav-reception-quality.md)
and [validation](../reviews/2026-11-06-nav-reception-validation.md) record separate
bounded acceptance; fixture scenery, embedded WebKit and peer limits remain explicit.
