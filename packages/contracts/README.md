# Contracts

[assessment-airspeed.ts](assessment-airspeed.ts) defines readonly source,
calibration and discriminated mapping-result types for the bounded
[assessment airspeed slice](../../docs/design/ASSESSMENT-AIRSPEED.md).
Its SI quantities and provenance metadata support evaluator-derived CAL IAS;
they do not add cockpit indication or simulation/replay digest fields.

The broader boundary remains reserved for explicit units, coordinate frames,
sign conventions, simulation state, normalized inputs, snapshots, scenarios and
replay metadata. Freeze each required interface slice before parallel coding.
One integration owner applies shared changes; both coders and reviewers
participate in interface review. Types alone do not implement those broader
runtime contracts.
