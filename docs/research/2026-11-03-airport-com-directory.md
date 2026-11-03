# Airport COM directory snapshot

Scope: TODO 2.0.43, R-DATA-1 and a directory increment toward R-COMM-1.

The bundled 631 records cover 251 of the 731 airports in the existing five-state
catalogue (Bavaria, Baden-Württemberg, Hesse, Rhineland-Palatinate and Saarland).
They come from [OurAirports' airport-frequencies.csv](https://raw.githubusercontent.com/davidmegginson/ourairports-data/e86a650a968ba239a1288f96c05fcb80688e77a6/airport-frequencies.csv),
commit `e86a650a968ba239a1288f96c05fcb80688e77a6`, retrieved 2026-11-03.
OurAirports releases its community data to the [public domain without accuracy or
fitness guarantees](https://ourairports.com/data/). Source and derived byte hashes
are in `app/public/airports/com-manifest.json`. The existing airport package owns
coordinates and names; COM records join by airport ID. No runtime third-party
request is required.

Raw service identifiers/descriptions are retained, including INFO, AFIS, TWR,
GND, ATIS, APP and military/other types. They do not establish current ATC
availability or permissions. Missing records mean unknown. All source frequencies
are retained verbatim as `source_frequency_mhz`; `channel_khz` is an integer
index for the UI. Out-of-band, non-channel or non-exact-kHz values are visible but
cannot be selected on the VHF tuner. No rounding into a valid channel is allowed.

The source lists EDFE Egelsbach Radio INFO as 118.405, apron RMP as 121.730 and
LANGEN INFORMATION AFIS as 119.150. These are attributed snapshot records, not a
claim of present operational applicability. The Langen row is not reinterpreted
as local airport ATC. An independently verified current official COM inventory
has not been delivered.

[EUROCONTROL's 8.33 VCS handbook](https://www.eurocontrol.int/archive_download/all/node/10364)
explains that channel designators and carrier frequencies differ. For example,
118.005 is a channel name whose carrier is 118.0000 MHz. The tuner retains all
six display digits, accepts 25 kHz names and the three interleaved 8.33 names,
and does not implement RF propagation or bandwidth behavior. Selection loads
COM1 or COM2 standby only; the existing radio swap explicitly activates it.

The directory supplies airport/name/service filtering, a 50 NM nearby filter,
and airport-linked map selection. It does not supply ATC/voice, live ATIS,
communications procedures, service opening hours, sector coverage or currency.
