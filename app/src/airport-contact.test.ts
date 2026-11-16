// R-COMM-2 / R-DATA-1 / TODO 2.0.194: simulated airport contact after COM tuning.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Airport } from './airport-catalogue.ts';
import { parseComContactData } from './airport-contact-data.ts';
import type { AirportComDirectory, AirportComStation } from './airport-com.ts';
import { CONTACT_RANGE_NM, CONTACT_RELEASE_NM, classifyStation, contactMessage, createAirportContactTracker, findAirportContact,
  formatQnh, qnhActionState, sourceCovers, type ContactSource } from './airport-contact.ts';
import { worldAirportCellId } from './world-airport-contract.ts';

const root = new URL('../public/airports/', import.meta.url);
const regionalAirports: Airport[] = JSON.parse(readFileSync(new URL('regional.json', root), 'utf8'));
const regionalStations: AirportComStation[] = JSON.parse(readFileSync(new URL('com-regional.json', root), 'utf8'));
const regional: ContactSource = { airports: regionalAirports,
  directory: { stations: regionalStations, retrieved: '2026-11-03', source: 'OurAirports' } };
const byId = new Map(regionalAirports.map(a => [a.id, a]));
const EDFE = { lat: 49.96, lon: 8.643043 };
/** Due north of EDFE by the given distance (1 NM = 1 arc-minute of latitude on the 3440.065 NM sphere). */
const north = (nm: number, from = EDFE) => ({ lat: from.lat + nm / 3440.065 * 180 / Math.PI, lon: from.lon });
const airport = (id: string, lat: number, lon: number, type = 'small_airport', name = `${id} field`): Airport =>
  ({ id, name, type, icao: id.startsWith('X') ? '' : id, local: '', lat, lon, elevation_ft: 300, iso_region: 'DE-HE' });
const station = (id: string, airport_id: string, channel_khz: number, service = 'INFO', description = ''): AirportComStation =>
  ({ id, airport_id, service, description, channel_khz, source_frequency_mhz: String(channel_khz / 1000) });
const fixture = (airports: Airport[], stations: AirportComStation[]): ContactSource =>
  ({ airports, directory: { stations, retrieved: '2026-01-01', source: 'fixture' } as AirportComDirectory });
const at = (id: string, channel_khz: number) => findAirportContact({ receiver: 1, channel_khz }, byId.get(id)!, [regional]);

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
  assert.equal(at('EDFE', 121730)?.kind, 'contact', 'EDFE apron is an aerodrome station');
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

test('reviewed non-aerodrome rows in the bundled snapshot never produce a welcome', () => {
  // Radar/director/approach/control, ATIS, AAS and regional FIS names (quality review 2026-11-09).
  const cases: [string, number][] = [['EDDF', 118450], ['EDDF', 127275], ['EDDF', 124200], ['EDDM', 118825], ['EDDS', 119850],
    ['ETSB', 125600], ['EDMS', 132550], ['EDSB', 124100], ['EDMC', 128925], ['EDMG', 132650], ['EDMS', 124650], ['EDSZ', 128955],
    ['EDTD', 120700], ['EDDF', 118030], ['EDDF', 118730], ['EDDS', 126130]];
  for (const [id, channel] of cases) assert.notEqual(at(id, channel)?.kind, 'contact', `${id} ${channel / 1000}`);
  // Langen Information on an airport-unique channel is a regional-name notice, not an airport contact.
  const langen = at('EDMC', 128925);
  assert.equal(langen?.kind, 'shared'); assert.equal(langen?.kind === 'shared' && langen.reason, 'regional-name');
  assert.match(contactMessage(langen!, 101325).detail, /Regional or other-station service listed for \d{3} airports; no airport contact simulated/);
  assert.equal(contactMessage(langen!, 101325).qnh, null);
});

test('data-driven: no single contact over the bundled directory is a radar, director, approach, FIS or ATIS service', () => {
  const services = new Set(['TWR', 'GND', 'RMP', 'APRON', 'CLD', 'DEL', 'RADIO', 'RDO', 'CTAF', 'UNIC', 'UNICOM', 'A/G', 'INFO', 'AFIS', 'INFORMATION']);
  const forbidden = /\b(radar|director|dir|approach|app|arr|dep|departure|con|control|ctr|cntr|atis|awos|asos|volmet|langen|z(u|ue|ü)rich|m(u|ue|ü)nchen info|reims|strasbourg)\b/i;
  let contacts = 0;
  for (const row of regionalStations) {
    const home = byId.get(row.airport_id)!;
    const contact = findAirportContact({ receiver: 1, channel_khz: row.channel_khz }, home, [regional]);
    if (contact?.kind !== 'contact') continue;
    contacts++;
    const { service, description } = contact.station;
    assert(services.has(service.trim().toUpperCase()), `${contact.airport.id} ${service}`);
    assert(!forbidden.test(description), `${contact.airport.id} ${service} ${description}`);
  }
  assert(contacts > 200, `bundled data still yields airport contacts (${contacts})`);
  for (const row of regionalStations) {
    if (/\b(radar|director|atis|approach)\b/i.test(row.description) || ['A/D', 'APP', 'DIR', 'ATIS', 'AAS', 'FIS', 'RDR'].includes(row.service.trim().toUpperCase()))
      assert.equal(classifyStation(row, byId.get(row.airport_id)!, regional), 'excluded', `${row.airport_id} ${row.service} ${row.description}`);
  }
});

test('a channel shared by several airports in range is reported as ambiguous, without a QNH action', () => {
  const contact = findAirportContact({ receiver: 2, channel_khz: 119150 }, EDFE, [regional]);
  assert.equal(contact?.kind, 'shared');
  if (contact?.kind !== 'shared') return;
  assert.equal(contact.reason, 'several-in-range'); assert(contact.count >= 4);
  assert.deepEqual(contact.airports.map(a => a.airport.id), ['EDFE', 'EDDF', 'EDFC']);
  const message = contactMessage(contact, 101325);
  assert.equal(message.qnh, null); assert.match(message.title, /^COM2 119\.150 · LANGEN INFORMATION$/);
  assert.match(message.detail, /Shared channel: \d+ airports within 25 NM \(EDFE, EDDF, EDFC\)/);
});

test('station names: shared names on any channel are regional; named rows must be the airport own; allow-list decides services', () => {
  const far = [airport('EDXA', 51, 10), airport('EDXB', 51.5, 10)];
  const home = airport('EDQQ', EDFE.lat, EDFE.lon, 'small_airport', 'Quellberg Airfield');
  const source = fixture([home, ...far], [
    station('1', 'EDQQ', 128950, 'AFIS', 'Langen Information'), station('2', 'EDXA', 120100, 'AFIS', 'LANGEN INFORMATION'),
    station('3', 'EDXB', 130100, 'INFO', 'Langen Information '), station('4', 'EDQQ', 122100, 'INFO', 'Quellberg Info'),
    station('5', 'EDQQ', 122200, 'AFIS', 'Strasbourg Info'), station('6', 'EDQQ', 122300, 'TWR', 'Stuttgart Director'),
    station('7', 'EDQQ', 122400, 'A/D', 'Quellberg'), station('8', 'EDQQ', 122500, 'ATIS', ''), station('9', 'EDQQ', 122600, 'AAS', 'Quellberg Info'),
    station('10', 'EDQQ', 122700, 'TWR', 'Quellberg ATIS'), station('11', 'EDQQ', 122800, 'RMP', 'Quellberg Vorfeld'),
    station('12', 'EDQQ', 122900, 'TWR', 'Illeshaim Tower / Turm'), station('13', 'EDQQ', 123000, 'TWR', 'TWR'),
    station('14', 'EDQQ', 123100, 'GND', 'Quelberg Ground'),
  ]);
  const kind = (channel_khz: number, s = source) => { const c = findAirportContact({ receiver: 1, channel_khz }, EDFE, [s]); return c?.kind === 'shared' ? c.reason : c?.kind ?? null; };
  assert.equal(kind(128950), 'regional-name', 'same name at 3 airports, different channels');
  assert.equal(kind(122100), 'contact', 'own Info name');
  assert.equal(kind(122200), 'regional-name', 'foreign Info name');
  assert.equal(kind(122900), 'regional-name', 'a tower named for another place gives no welcome');
  assert.equal(kind(123000), 'contact', 'a generic service name');
  assert.equal(kind(123100), 'contact', 'a one-letter source typo still matches');
  for (const channel of [122300, 122400, 122500, 122600, 122700]) assert.equal(kind(channel), null, String(channel));
  assert.equal(kind(122800), 'contact');
  // Bundled reviewer case: EDQB "Illeshaim Tower / Turm" 129.850 is listed at Bad Windsheim.
  assert.equal(at('EDQB', 129850)?.kind, 'shared');
  // A stable name table overrides counts within a (view-dependent) directory.
  const langen = airport('EDQL', EDFE.lat, EDFE.lon, 'small_airport', 'Langen Airfield');
  const lone = fixture([langen], [station('20', 'EDQL', 124000, 'INFO', 'Langen Information')]);
  assert.equal(kind(124000, lone), 'contact');
  assert.equal(kind(124000, { ...fixture([langen], [station('20', 'EDQL', 124000, 'INFO', 'Langen Information')]), regionalNames: new Map([['langen information', 423]]) }), 'regional-name');
});

test('121.5 emergency and closed airports are ignored; duplicate sources count one airport', () => {
  const source = fixture([airport('EDQA', EDFE.lat, EDFE.lon), airport('EDQC', EDFE.lat, EDFE.lon + 0.01, 'closed')], [
    station('3', 'EDQC', 121000, 'INFO', 'Closed Radio'), station('4', 'EDQA', 122000, 'INFO', 'Qa Radio'),
    station('5', 'EDQA', 121500, 'TWR', 'Guard'),
  ]);
  for (const channel_khz of [121000, 121500]) assert.equal(findAirportContact({ receiver: 1, channel_khz }, EDFE, [source]), null);
  const duplicate = fixture([airport('EDQA', EDFE.lat, EDFE.lon)], [station('9', 'EDQA', 122000, 'INFO', '')]);
  const contact = findAirportContact({ receiver: 1, channel_khz: 122000 }, EDFE, [source, duplicate]);
  assert.equal(contact?.kind, 'contact');
  assert.equal(contact?.kind === 'contact' && contact.station.description, 'Qa Radio', 'earlier source wins');
  const fallbackName = findAirportContact({ receiver: 1, channel_khz: 122000 }, EDFE, [duplicate]);
  assert.equal(contactMessage(fallbackName!, 101325).title, 'COM1 122.000 · EDQA EDQA field INFO');
});

test('bundled coverage uses the generated completeness mask: interior covered, border fails closed', () => {
  const data = parseComContactData(JSON.parse(readFileSync(new URL('com-contact.json', root), 'utf8')));
  const bundled: ContactSource = { ...regional, coverage: { grid: data.coverage }, regionalNames: data.regionalNames };
  assert.equal(sourceCovers(bundled, EDFE, CONTACT_RELEASE_NM), true, 'EDFE interior');
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 118405 }, north(3), [bundled])?.kind, 'contact');
  // Border: ETSB 122.100 is shared with DE-0201 outside the five states; the bundled data alone must not welcome.
  const border = { lat: 50.4, lon: 6.8 };
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 122100 }, border, [regional])?.kind, 'contact', 'unmasked bundled data would welcome');
  assert.equal(sourceCovers(bundled, border, CONTACT_RELEASE_NM), false);
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 122100 }, border, [bundled]), null);
  // With complete worldwide cells around the aircraft the channel is reported as shared.
  const ids = new Set([[6, 49.9], [7.5, 49.9], [6, 50.9], [7.5, 50.9]].map(([lon, lat]) => worldAirportCellId(lon, lat)));
  const cells = [...ids].map(id => JSON.parse(readFileSync(new URL(`world/cells/${id}.bin`, root), 'utf8')));
  const world: ContactSource = { airports: cells.flatMap(c => c.airports), directory: { stations: cells.flatMap(c => c.com), retrieved: '2026-11-06', source: 'OurAirports' },
    coverage: { cells: ids }, regionalNames: data.regionalNames };
  const shared = findAirportContact({ receiver: 1, channel_khz: 122100 }, border, [world, bundled]);
  assert.equal(shared?.kind, 'shared'); assert(shared?.idents.includes('ETSB') && shared.idents.includes('DE-0201'), JSON.stringify(shared?.idents));
  // Other border areas named in review (Friedrichshafen, Basel, Salzburg, Hof) are not complete in the bundled mask.
  for (const [lat, lon] of [[47.67, 9.51], [47.6, 7.6], [47.8, 12.9], [50.29, 11.86]]) assert.equal(sourceCovers(bundled, { lat, lon }, CONTACT_RELEASE_NM), false, `${lat},${lon}`);
  assert.equal(sourceCovers(bundled, { lat: 46.9, lon: 8 }, CONTACT_RELEASE_NM), false, 'outside the mask bounds');
});

test('world cells must cover the release circle; longitude spacing uses the highest latitude of the box', () => {
  const inner = { lat: 49.5, lon: 8.5 };
  const cell = worldAirportCellId(inner.lon, inner.lat);
  assert.equal(sourceCovers({ ...regional, coverage: { cells: new Set([cell]) } }, inner, CONTACT_RELEASE_NM), true);
  // 49.9° N lies within 27 NM of the 50° N cell edge: the north cell must also be loaded.
  const edge = { lat: 49.9, lon: 8.5 };
  assert.equal(sourceCovers({ ...regional, coverage: { cells: new Set([cell]) } }, edge, CONTACT_RELEASE_NM), false);
  assert.equal(sourceCovers({ ...regional, coverage: { cells: new Set([cell, worldAirportCellId(8.5, 50.1)]) } }, edge, CONTACT_RELEASE_NM), true);
  // At 52° N the circle reaches 10° E only with cos(52.45°), not cos(52°).
  const high = { lat: 52, lon: 10 - 0.735 };
  assert.equal(sourceCovers({ ...regional, coverage: { cells: new Set([worldAirportCellId(9, 52)]) } }, high, CONTACT_RELEASE_NM), false);
  // A partial world source that holds only one of two same-channel airports must not create a single contact.
  const one = airport('EDQA', EDFE.lat, EDFE.lon), two = airport('EDQB', EDFE.lat + 0.1, EDFE.lon);
  const partial = { ...fixture([one], [station('1', 'EDQA', 122000, 'INFO', 'Qa Radio')]), coverage: { cells: new Set<string>() } };
  const complete = fixture([one, two], [station('1', 'EDQA', 122000, 'INFO', 'Qa Radio'), station('2', 'EDQB', 122000, 'INFO', 'Qb Radio')]);
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 122000 }, EDFE, [partial, complete])?.kind, 'shared');
  assert.equal(findAirportContact({ receiver: 1, channel_khz: 122000 }, EDFE, [partial]), null);
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

test('hysteresis covers every airport of the previous result, so a second airport near 25 NM cannot flip the contact', () => {
  const a = airport('EDQA', EDFE.lat, EDFE.lon); const b = airport('EDQB', north(40).lat, EDFE.lon);
  const source = fixture([a, b], [station('1', 'EDQA', 122000, 'INFO', 'Qa Radio'), station('2', 'EDQB', 122000, 'INFO', 'Qb Radio')]);
  const tracker = createAirportContactTracker();
  // Aircraft 15 NM north of A is 25 NM from B (B is 40 NM north of A).
  const run = (nmFromA: number) => tracker.update({ active: [{ receiver: 1, channel_khz: 122000 }], position: north(nmFromA), sources: [source], reviewing: false });
  assert.equal(run(14).contacts[0].kind, 'contact');
  const shared = run(15.5); assert.equal(shared.contacts[0].kind, 'shared'); assert.equal(shared.announce.length, 1);
  for (const nm of [14.5, 15.5, 14.2, 15.8, 13.5]) {
    const update = run(nm); assert.equal(update.contacts[0].kind, 'shared', String(nm)); assert.equal(update.announce.length, 0);
  }
  assert.equal(run(12.5).contacts[0].kind, 'contact', 'B beyond the 27 NM release range');
});

test('QNH text uses whole hPa rounded down and inHg to 0.01; out-of-range pressure is unavailable', () => {
  assert.deepEqual(formatQnh(101325), { hpa: '1013', inhg: '29.92' });
  assert.deepEqual(formatQnh(100999.6), { hpa: '1009', inhg: '29.83' });
  assert.deepEqual(formatQnh(102000), { hpa: '1020', inhg: '30.12' });
  for (const value of [NaN, undefined, null, 79999, 110001, Infinity]) assert.equal(formatQnh(value as number), null);
});

test('altimeter action is explicit, read-only in Review, locked when unavailable, and on QNH within the announced hPa', () => {
  const base = { reviewing: false, controlsAvailable: true, qnh_pa: 101325, setting_pa: 100000 };
  assert.deepEqual(qnhActionState(base), { enabled: true, label: 'Set altimeter QNH 1013' });
  assert.deepEqual(qnhActionState({ ...base, reviewing: true }), { enabled: false, label: 'Review · read only' });
  assert.deepEqual(qnhActionState({ ...base, controlsAvailable: false }), { enabled: false, label: 'Altimeter locked' });
  for (const setting_pa of [101300, 101325, 101399.9]) assert.deepEqual(qnhActionState({ ...base, setting_pa }), { enabled: false, label: 'Altimeter on QNH 1013' }, String(setting_pa));
  for (const setting_pa of [101299, 101400]) assert.equal(qnhActionState({ ...base, setting_pa }).enabled, true, String(setting_pa));
  assert.deepEqual(qnhActionState({ ...base, qnh_pa: undefined }), { enabled: false, label: 'QNH unavailable' });
});
