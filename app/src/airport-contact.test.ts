// R-COMM-2 / R-DATA-1 / TODO 2.0.194: simulated airport contact after COM tuning.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Airport } from './airport-catalogue.ts';
import type { AirportComDirectory, AirportComStation } from './airport-com.ts';
import { CONTACT_RANGE_NM, CONTACT_RELEASE_NM, contactMessage, createAirportContactTracker, findAirportContact,
  formatQnh, qnhActionState, type ContactSource } from './airport-contact.ts';

const root = new URL('../public/airports/', import.meta.url);
const regional: ContactSource = {
  airports: JSON.parse(readFileSync(new URL('regional.json', root), 'utf8')),
  directory: { stations: JSON.parse(readFileSync(new URL('com-regional.json', root), 'utf8')), retrieved: '2026-11-03', source: 'OurAirports' },
};
const EDFE = { lat: 49.96, lon: 8.643043 };
/** Due north of EDFE by the given distance (1 NM = 1 arc-minute of latitude on the 3440.065 NM sphere). */
const north = (nm: number) => ({ lat: EDFE.lat + nm / 3440.065 * 180 / Math.PI, lon: EDFE.lon });
const airport = (id: string, lat: number, lon: number, type = 'small_airport'): Airport =>
  ({ id, name: `${id} field`, type, icao: id.startsWith('X') ? '' : id, local: '', lat, lon, elevation_ft: 300, iso_region: 'DE-HE' });
const station = (id: string, airport_id: string, channel_khz: number, service = 'INFO', description = ''): AirportComStation =>
  ({ id, airport_id, service, description, channel_khz, source_frequency_mhz: String(channel_khz / 1000) });
const fixture = (airports: Airport[], stations: AirportComStation[]): ContactSource =>
  ({ airports, directory: { stations, retrieved: '2026-01-01', source: 'fixture' } as AirportComDirectory });

test('ACTIVE COM on the EDFE source channel near EDFE yields one airport contact with simulator QNH', () => {
  const contact = findAirportContact({ receiver: 1, channel_khz: 118405 }, north(3), [regional]);
  assert.equal(contact?.kind, 'contact');
  if (contact?.kind !== 'contact') return;
  assert.equal(contact.airport.id, 'EDFE'); assert.equal(contact.station.description, 'Egelsbach Radio');
  assert(Math.abs(contact.distance_nm - 3) < 0.01);
  const message = contactMessage(contact, 101325);
  assert.equal(message.title, 'COM1 118.405 · EDFE Egelsbach Radio');
  assert.equal(message.detail, 'Welcome to Frankfurt-Egelsbach Airport. QNH 1013 hPa (29.92 inHg).');
  assert.match(message.note, /Simulated text, not ATC/); assert.match(message.note, /2026-11-03 snapshot, not current/);
  assert.match(message.note, /simulator sea-level pressure, no weather/);
  assert.deepEqual(message.qnh, { hpa: '1013', inhg: '29.92' });
  assert.match(contactMessage(contact, undefined).detail, /QNH unavailable/);
});

test('range, invalid tuning and position gates never fabricate a contact', () => {
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118405 }, north(CONTACT_RANGE_NM + 0.5), [regional]), null);
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118405 }, north(CONTACT_RANGE_NM - 0.5), [regional])?.kind, 'contact');
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118500 }, EDFE, [regional]), null, 'unlisted channel');
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118404 }, EDFE, [regional]), null, 'not a channel designator');
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118405 }, { lat: NaN, lon: 8 }, [regional]), null);
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118405 }, null, [regional]), null);
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118405 }, EDFE, []), null, 'no data means no contact');
});

test('a channel shared by several airports in range is reported as ambiguous, without a QNH action', () => {
  const contact = findAirportContact({ receiver: 2, channel_khz: 119150 }, EDFE, [regional]);
  assert.equal(contact?.kind, 'shared');
  if (contact?.kind !== 'shared') return;
  assert.equal(contact.reason, 'several-in-range'); assert(contact.count >= 4);
  assert.deepEqual(contact.airports.map(a => a.airport.id), ['EDFE', 'EDDF', 'ETOU']);
  const message = contactMessage(contact, 101325);
  assert.equal(message.qnh, null); assert.match(message.title, /^COM2 119\.150 · LANGEN INFORMATION$/);
  assert.match(message.detail, /Shared channel: \d+ airports within 25 NM \(EDFE, EDDF, ETOU\)/);
});

test('a service name listed for several airports is shared even when only one airport is in range', () => {
  const far = [airport('EDXA', 51, 10), airport('EDXB', 51.5, 10)];
  const source = fixture([airport('EDQQ', EDFE.lat, EDFE.lon), ...far], [
    station('1', 'EDQQ', 128950, 'AFIS', 'Langen Information'), station('2', 'EDXA', 128950, 'AFIS', 'LANGEN INFORMATION'),
    station('3', 'EDXB', 128950, 'AFIS', 'Langen Information '),
  ]);
  const contact = findAirportContact({ receiver: 1, channel_khz: 128950 }, EDFE, [source]);
  assert.equal(contact?.kind, 'shared'); assert.equal(contact?.kind === 'shared' && contact.reason, 'shared-name');
  assert.match(contactMessage(contact!, 101325).detail, /Shared service name listed for 3 airports/);
});

test('non-aerodrome services, 121.5 emergency and closed airports are ignored; duplicate sources count one airport', () => {
  const source = fixture([airport('EDQA', EDFE.lat, EDFE.lon), airport('EDQC', EDFE.lat, EDFE.lon + 0.01, 'closed')], [
    station('1', 'EDQA', 120000, 'FIS', 'Somewhere Information'), station('2', 'EDQA', 120500, 'APP', 'Approach'),
    station('3', 'EDQC', 121000, 'INFO', 'Closed Radio'), station('4', 'EDQA', 122000, 'INFO', 'Qa Radio'),
    station('5', 'EDQA', 121500, 'TWR', 'Guard'),
  ]);
  for (const channel_khz of [120000, 120500, 121000, 121500]) assert.equal(findAirportContact({ receiver: 1, channel_khz }, EDFE, [source]), null);
  const duplicate = fixture([airport('EDQA', EDFE.lat, EDFE.lon)], [station('9', 'EDQA', 122000, 'INFO', '')]);
  const contact = findAirportContact({ receiver: 1, channel_khz: 122000 }, EDFE, [source, duplicate]);
  assert.equal(contact?.kind, 'contact');
  assert.equal(contact?.kind === 'contact' && contact.station.description, 'Qa Radio', 'earlier source wins');
  const fallbackName = findAirportContact({ receiver: 1, channel_khz: 122000 }, EDFE, [duplicate]);
  assert.equal(contactMessage(fallbackName!, 101325).title, 'COM1 122.000 · EDQA EDQA field INFO');
});

test('tracker announces once per contact, merges COM1/COM2, keeps hysteresis and freezes in Review', () => {
  const tracker = createAirportContactTracker();
  const run = (active: { receiver: 1 | 2; channel_khz: number }[], position = north(2), reviewing = false) =>
    tracker.update({ active, position, sources: [regional], reviewing });
  assert.deepEqual(run([{ receiver: 1, channel_khz: 118000 }]).contacts, []);
  const first = run([{ receiver: 1, channel_khz: 118405 }]);
  assert.equal(first.announce.length, 1); assert.equal(first.contacts.length, 1);
  assert.equal(run([{ receiver: 1, channel_khz: 118405 }]).announce.length, 0, 'repeated frames do not re-announce');
  const both = run([{ receiver: 1, channel_khz: 118405 }, { receiver: 2, channel_khz: 118405 }]);
  assert.equal(both.contacts.length, 1); assert.deepEqual(both.contacts[0].receivers, [1, 2]); assert.equal(both.announce.length, 0);
  assert.equal(contactMessage(both.contacts[0], 101325).title.startsWith('COM1/COM2 118.405'), true);
  // Established contact survives between the entry and release ranges.
  assert.equal(run([{ receiver: 1, channel_khz: 118405 }], north(CONTACT_RANGE_NM + 1)).contacts.length, 1);
  assert.equal(run([{ receiver: 1, channel_khz: 118405 }], north(CONTACT_RELEASE_NM + 0.5)).contacts.length, 0);
  assert.equal(run([{ receiver: 1, channel_khz: 118405 }], north(CONTACT_RANGE_NM + 1)).contacts.length, 0, 'no re-entry above entry range');
  assert.equal(run([{ receiver: 1, channel_khz: 118405 }]).announce.length, 1, 'a new contact after leaving is announced again');
  // Review freezes the tracker: recorded state cannot create or end contacts.
  const frozen = run([{ receiver: 1, channel_khz: 118000 }], north(60), true);
  assert.equal(frozen.contacts.length, 1); assert.equal(frozen.announce.length, 0);
  assert.equal(run([{ receiver: 1, channel_khz: 118405 }]).announce.length, 0, 'leaving Review does not repeat the same contact');
  assert.equal(run([{ receiver: 1, channel_khz: 121730 }]).announce.length, 1, 'apron channel is a separate contact');
  tracker.reset(); assert.equal(run([{ receiver: 1, channel_khz: 121730 }]).announce.length, 1);
});

test('QNH text uses whole hPa rounded down and inHg to 0.01; out-of-range pressure is unavailable', () => {
  assert.deepEqual(formatQnh(101325), { hpa: '1013', inhg: '29.92' });
  assert.deepEqual(formatQnh(100999.6), { hpa: '1009', inhg: '29.83' });
  assert.deepEqual(formatQnh(102000), { hpa: '1020', inhg: '30.12' });
  for (const value of [NaN, undefined, null, 79999, 110001, Infinity]) assert.equal(formatQnh(value as number), null);
});

test('altimeter action is explicit, read-only in Review and locked when controls are unavailable', () => {
  const base = { reviewing: false, controlsAvailable: true, qnh_pa: 101325, setting_pa: 100000 };
  assert.deepEqual(qnhActionState(base), { enabled: true, label: 'Set altimeter QNH 1013' });
  assert.deepEqual(qnhActionState({ ...base, reviewing: true }), { enabled: false, label: 'Review · read only' });
  assert.deepEqual(qnhActionState({ ...base, controlsAvailable: false }), { enabled: false, label: 'Altimeter locked' });
  assert.deepEqual(qnhActionState({ ...base, setting_pa: 101325.5 }), { enabled: false, label: 'Altimeter on QNH 1013' });
  assert.deepEqual(qnhActionState({ ...base, qnh_pa: undefined }), { enabled: false, label: 'QNH unavailable' });
});
