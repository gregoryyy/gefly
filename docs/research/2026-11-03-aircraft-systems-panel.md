# First aircraft systems panel

The [UND C172S electrical trainer](https://mediafiles.aero.und.edu/aero.und.edu/aviation/trainers/c172s-electrical-system/)
(accessed 2026-11-03) describes a 24 V main battery, 28 V/60 A alternator,
BAT/ALT master interlocking, avionics and lighting switches, and negative battery
current during discharge. This institution-produced training source describes a
Nav III installation; it does not validate this project's classic cockpit or
native generic 172P model. No source diagrams/assets are copied.

This increment borrows switch names, nominal supply voltages, current sign and
master interlocking. It adds a separate, instantaneous teaching circuit model.
The panel's MODEL label and tooltips distinguish estimates from native telemetry.

`app/src/aircraft-systems.ts` declares generic current estimates: base 2 A,
avionics 8 A, beacon 2 A, navigation lights 3 A, strobe 3 A, taxi 5 A,
landing 8 A, pitot heat 4 A and panel lighting 1 A. These are project estimates,
not measured currents, breaker ratings or installed-aircraft limits. An operating
alternator supplies the modeled load with zero steady battery current; otherwise
the battery supplies it. BAT off removes modeled bus power and ALT selection.

No depletion/recharging dynamics, low-RPM alternator curve, circuit breakers,
external light rendering, avionics power/failure coupling, starter restriction or
pitot icing is implemented. Magneto/native engine behavior is unchanged. Switches
are recorded independently of flight dynamics; older traces show unavailable.
