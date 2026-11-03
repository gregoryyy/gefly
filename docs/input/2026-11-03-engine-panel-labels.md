# Compact engine readouts and low-fuel markers, 2026-11-03

User:

> engine panel:  oil press, oil temp, fuel flow, exhst gas, all labels on one line. add markers for low fuel.

Implementation interpretation announced by the orchestrator: show each of the
four readouts as a compact row with its label, value and unit on one line. Add
lower-quarter reference marks to both model tank scales, with independent LOW
indicators when a valid tank quantity is at or below that reference.

The lower-quarter reference is an explicitly stated presentation assumption,
not a separate user confirmation or an aircraft-specific low-fuel, usable-fuel
or reserve limit. Existing model tank capacity and quantity units remain the
basis of the display. Missing quantity stays unavailable; recorded review uses
the selected recorded quantities without changing flight state or controls.

Scope: R-PANEL-1 and R-REVIEW-1; TODO 2.0.53. No new aircraft data, physics,
warning sound or fuel-system behavior is requested by this increment.
