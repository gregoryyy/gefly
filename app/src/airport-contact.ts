import type { Airport } from './airport-catalogue.ts';
import { airportDistance_nm, isComChannel } from './airport-com.ts';
import type { AirportComDirectory, AirportComStation } from './airport-com.ts';
import { MAX_SETTING_PA, MIN_SETTING_PA, PA_PER_INHG } from './pressure-units.ts';
import { worldAirportCellId } from './world-airport-contract.ts';

/**
 * Simulated airport radio contact (R-COMM-2, TODO 2.0.194). Pure logic only:
 * an ACTIVE COM channel that equals a source-listed AERODROME channel of one
 * airport within range produces a text welcome plus the SIMULATOR's own QNH.
 * It is not ATC, not a METAR/ATIS and never changes the altimeter by itself.
 */

/** Simplified VFR reception range: horizontal great-circle distance only,
 * altitude-agnostic line-of-sight assumption, no terrain masking or RF model. */
export const CONTACT_RANGE_NM = 25;
/** Airports already in the previous result for a channel are kept to this distance (hysteresis). */
export const CONTACT_RELEASE_NM = 27;
/** A non-generic station name listed for this many airports (any channel) is a regional service, e.g. FIS "Langen Information". */
export const SHARED_NAME_AIRPORTS = 3;
/** 121.500 MHz is the international emergency channel (and the COM2 default), never an airport welcome. */
const EMERGENCY_KHZ = 121_500;

/**
 * Allow-list of OurAirports service `type` values that name an aerodrome station
 * (vocabulary checked against the bundled five-state snapshot). Everything else
 * (A/D, APP, ARR, DEP, DIR, RDR, RADAR, ATIS, AWOS, ASOS, FIS, ACC, CTR, CNTR, AAS,
 * VOLMET, PMSV, OPS, MISC, POST, PTD, GCA, VDF, EMR, 8.33, unknown) is excluded.
 */
const AERODROME_SERVICES = new Set(['TWR', 'GND', 'RMP', 'APRON', 'CLD', 'DEL', 'RADIO', 'RDO', 'CTAF', 'UNIC', 'UNICOM', 'A/G', 'INFO', 'AFIS', 'INFORMATION']);
/** Services that may carry a flight-information name; an "… Info/Information" name must be the airport's own. */
const INFO_SERVICES = new Set(['RADIO', 'RDO', 'CTAF', 'UNIC', 'UNICOM', 'A/G', 'INFO', 'AFIS', 'INFORMATION']);
/** Description words that identify radar/approach/control/broadcast/operations units, whatever the source service type. */
const NON_AERODROME_WORDS = new Set(['radar', 'director', 'dir', 'approach', 'app', 'arr', 'arrival', 'dep', 'departure', 'con', 'control',
  'centre', 'center', 'ctr', 'cntr', 'atis', 'awos', 'asos', 'volmet', 'pmsv', 'metro', 'ops', 'misc', 'deicing', 'rng', 'range', 'advsy']);
/** Service words that do not identify a station name. */
const GENERIC_WORDS = new Set(['info', 'information', 'radio', 'rdo', 'twr', 'tower', 'turm', 'gnd', 'ground', 'grond', 'rollkontrolle',
  'apron', 'vorfeld', 'ctaf', 'del', 'delivery', 'clnc', 'initial', 'call', 'unicom', 'unic', 'segelflug', 'north', 'south', 'nord', 'sud',
  'rwy', 'flugplatz', 'airport', 'airfield', 'a', 'g', 'sof']);

export type SourceCoverage = { cells: ReadonlySet<string> } | { bounds: readonly [number, number, number, number] };
export interface ContactSource {
  airports: readonly Airport[]; directory: AirportComDirectory;
  /** Area where the source holds every airport; outside it a channel could look unique only because data is missing. Omitted = complete. */
  coverage?: SourceCoverage;
}
export interface ActiveCom { receiver: 1 | 2; channel_khz: number }
export interface Position_deg { lat: number; lon: number }
interface SourceLabel { retrieved: string; source: string }
export interface AirportContactSingle extends SourceLabel {
  kind: 'contact'; key: string; receivers: (1 | 2)[]; channel_khz: number; idents: string[];
  airport: Airport; station: AirportComStation; distance_nm: number;
}
export interface AirportContactShared extends SourceLabel {
  kind: 'shared'; key: string; receivers: (1 | 2)[]; channel_khz: number; idents: string[];
  /** Nearest first, at most three. */
  airports: { airport: Airport; distance_nm: number }[];
  /** Airports listing the channel within range, or airports listing the regional service name in the directory. */
  count: number; reason: 'several-in-range' | 'regional-name'; label: string;
}
export type AirportContact = AirportContactSingle | AirportContactShared;
type StationClass = 'aerodrome' | 'regional' | 'excluded';

/** Display/de-duplication identifier: ICAO when present, otherwise the source identifier. */
export const airportIdent = (airport: Airport) => airport.icao || airport.id;
const exactChannel = (s: AirportComStation) => isComChannel(s.channel_khz)
  && Math.abs(Number(s.source_frequency_mhz) * 1000 - s.channel_khz) < 1e-6;
/** Comparison folding for German/English source spellings (Zürich/Zuerich/Zurich, München/Muenchen). */
function words(text: string): string[] {
  const folded = text.toLocaleLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  return folded.split(/[^a-z0-9]+/).filter(Boolean);
}
/** Normalized station name, or '' when the description is only service words. */
function nameKey(description: string): string {
  const w = words(description);
  return w.some(word => !GENERIC_WORDS.has(word)) ? w.join(' ') : '';
}
function ownName(description: string, airport: Airport): boolean {
  const named = words(description).filter(w => !GENERIC_WORDS.has(w) && w.length >= 3 && !/^\d+$/.test(w));
  if (!named.length) return true;
  const own = words(`${airport.name} ${airport.icao} ${airport.id}`).filter(w => w.length >= 3);
  return named.some(a => own.some(b => Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))));
}
const validPosition = (p: Position_deg | null | undefined): p is Position_deg => !!p
  && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

interface SourceIndex {
  airports: readonly Airport[]; byId: Map<string, Airport>; byChannel: Map<number, AirportComStation[]>;
  names: Map<string, Set<string>>; classes: Map<string, StationClass>;
}
/** Indexes are rebuilt only when a directory or its airport array changes. */
const indexes = new WeakMap<AirportComDirectory, SourceIndex>();
function index(source: ContactSource): SourceIndex {
  const cached = indexes.get(source.directory);
  if (cached && cached.airports === source.airports) return cached;
  const byId = new Map(source.airports.map(a => [a.id, a]));
  const byChannel = new Map<number, AirportComStation[]>(); const names = new Map<string, Set<string>>();
  for (const station of source.directory.stations) {
    const key = nameKey(station.description);
    if (key) { const ids = names.get(key) ?? new Set<string>(); ids.add(station.airport_id); names.set(key, ids); }
    if (!exactChannel(station)) continue;
    const rows = byChannel.get(station.channel_khz) ?? []; rows.push(station); byChannel.set(station.channel_khz, rows);
  }
  const value: SourceIndex = { airports: source.airports, byId, byChannel, names, classes: new Map() };
  indexes.set(source.directory, value);
  return value;
}
/** Classifies one source row; exported for data-driven tests over the bundled directory. */
export function classifyStation(station: AirportComStation, airport: Airport, source: ContactSource): StationClass {
  const idx = index(source); const cached = idx.classes.get(station.id);
  if (cached) return cached;
  const service = station.service.trim().toUpperCase(); const w = words(station.description);
  let result: StationClass;
  if (!AERODROME_SERVICES.has(service) || w.some(word => NON_AERODROME_WORDS.has(word))) result = 'excluded';
  else if ((idx.names.get(nameKey(station.description))?.size ?? 0) >= SHARED_NAME_AIRPORTS) result = 'regional';
  else if (INFO_SERVICES.has(service) && w.some(word => word === 'info' || word === 'information') && !ownName(station.description, airport)) result = 'regional';
  else result = 'aerodrome';
  idx.classes.set(station.id, result);
  return result;
}

const KM_PER_NM = 1.852;
/** True when the source holds every airport within radius_nm of position. */
export function sourceCovers(source: ContactSource, position: Position_deg, radius_nm: number): boolean {
  const coverage = source.coverage; if (!coverage) return true;
  const dlat = radius_nm * KM_PER_NM / 111.32; const cos = Math.cos(position.lat * Math.PI / 180);
  if (Math.abs(position.lat) + dlat >= 85 || cos <= 0) return false;
  const dlon = dlat / cos;
  const [south, north, west, east] = [position.lat - dlat, position.lat + dlat, position.lon - dlon, position.lon + dlon];
  if ('bounds' in coverage) {
    const [w, s, e, n] = coverage.bounds; return west >= w && east <= e && south >= s && north <= n;
  }
  // World cells are 5° squares; the circle's bounding box touches at most 2×2 of them.
  return [[west, south], [west, north], [east, south], [east, north]].every(([lon, lat]) => coverage.cells.has(worldAirportCellId(lon, lat)));
}

interface Candidate { airport: Airport; station: AirportComStation; cls: StationClass; distance_nm: number; source: ContactSource }

/**
 * Resolves one active channel. Only sources that cover the release circle are used;
 * earlier sources win for the same airport identifier. Airports in `retain` (the
 * previous result for this channel) are kept to CONTACT_RELEASE_NM.
 */
export function findAirportContact(active: ActiveCom, position: Position_deg | null, sources: readonly ContactSource[], retain: ReadonlySet<string> = new Set()): AirportContact | null {
  if (!validPosition(position) || !isComChannel(active.channel_khz) || active.channel_khz === EMERGENCY_KHZ) return null;
  const candidates = new Map<string, Candidate>();
  for (const source of sources) {
    if (!sourceCovers(source, position, CONTACT_RELEASE_NM)) continue;
    const idx = index(source);
    for (const station of idx.byChannel.get(active.channel_khz) ?? []) {
      const airport = idx.byId.get(station.airport_id);
      if (!airport || airport.type === 'closed' || !Number.isFinite(airport.lat) || !Number.isFinite(airport.lon)) continue;
      const cls = classifyStation(station, airport, source); if (cls === 'excluded') continue;
      const ident = airportIdent(airport); const distance_nm = airportDistance_nm(position, airport);
      if (distance_nm > (retain.has(ident) ? CONTACT_RELEASE_NM : CONTACT_RANGE_NM)) continue;
      const existing = candidates.get(ident);
      // One row per airport: the first source wins; within it an aerodrome row, then a named row.
      const better = !existing || (existing.source === source && ((existing.cls !== 'aerodrome' && cls === 'aerodrome')
        || (existing.cls === cls && !existing.station.description.trim() && station.description.trim())));
      if (better) candidates.set(ident, { airport, station, cls, distance_nm, source });
    }
  }
  if (!candidates.size) return null;
  const ordered = [...candidates.values()].sort((a, b) => a.distance_nm - b.distance_nm || airportIdent(a.airport).localeCompare(airportIdent(b.airport)));
  const first = ordered[0]; const idents = ordered.map(c => airportIdent(c.airport));
  const base = { receivers: [active.receiver], channel_khz: active.channel_khz, idents,
    retrieved: first.source.directory.retrieved, source: first.source.directory.source };
  if (ordered.length > 1 || first.cls === 'regional') {
    const reason = ordered.length > 1 ? 'several-in-range' as const : 'regional-name' as const;
    const named = ordered.find(c => c.cls === 'regional') ?? first;
    return { kind: 'shared', key: `shared|${active.channel_khz}`, ...base,
      airports: ordered.slice(0, 3).map(c => ({ airport: c.airport, distance_nm: c.distance_nm })),
      count: reason === 'several-in-range' ? ordered.length : (index(first.source).names.get(nameKey(first.station.description))?.size ?? 1), reason,
      label: (reason === 'regional-name' ? named : first).station.description.trim() || first.station.service.trim() || 'COM' };
  }
  return { kind: 'contact', key: `contact|${active.channel_khz}|${idents[0]}`, ...base,
    airport: first.airport, station: first.station, distance_nm: first.distance_nm };
}

export interface ContactUpdate {
  /** Current contacts, de-duplicated across COM1/COM2 by channel. */
  contacts: AirportContact[];
  /** Contacts that started on this update and should be announced once. */
  announce: AirportContact[];
}

/** Tracks contacts so a message is shown once per contact, not once per frame. Review freezes it. */
export function createAirportContactTracker() {
  let current: AirportContact[] = [];
  return {
    update(input: { active: readonly ActiveCom[]; position: Position_deg | null; sources: readonly ContactSource[]; reviewing: boolean }): ContactUpdate {
      if (input.reviewing) return { contacts: current, announce: [] };
      const previous = new Map(current.map(c => [c.channel_khz, c]));
      const next: AirportContact[] = [];
      // Each distinct channel is resolved once; COM1 and COM2 on the same channel share one result.
      for (const channel_khz of new Set(input.active.map(a => a.channel_khz))) {
        const receivers = input.active.filter(a => a.channel_khz === channel_khz).map(a => a.receiver);
        const contact = findAirportContact({ receiver: receivers[0], channel_khz }, input.position, input.sources,
          new Set(previous.get(channel_khz)?.idents ?? []));
        if (contact) next.push({ ...contact, receivers: [...new Set(receivers)].sort() });
      }
      const keys = new Set(current.map(c => c.key));
      current = next;
      return { contacts: current, announce: current.filter(c => !keys.has(c.key)) };
    },
    reset() { current = []; },
  };
}

/** Spoken-style QNH: whole hPa rounded down, inHg to 0.01. Null outside the practice setting range. */
export function formatQnh(qnh_pa: number | null | undefined): { hpa: string; inhg: string } | null {
  if (typeof qnh_pa !== 'number' || !Number.isFinite(qnh_pa) || qnh_pa < MIN_SETTING_PA || qnh_pa > MAX_SETTING_PA) return null;
  return { hpa: String(Math.floor(qnh_pa / 100 + 1e-9)), inhg: (qnh_pa / PA_PER_INHG).toFixed(2) };
}

const receiverText = (receivers: readonly (1 | 2)[]) => [...receivers].sort().map(r => `COM${r}`).join('/');
const mhz = (channel_khz: number) => (channel_khz / 1000).toFixed(3);

/** Message text; every line states its simulated/non-operational nature. */
export function contactMessage(contact: AirportContact, qnh_pa: number | null | undefined) {
  const head = `${receiverText(contact.receivers)} ${mhz(contact.channel_khz)}`;
  const note = `Simulated text, not ATC · OurAirports ${contact.retrieved} snapshot, not current`;
  if (contact.kind === 'shared') {
    const names = contact.airports.map(a => airportIdent(a.airport)).join(', ');
    return {
      title: `${head} · ${contact.label}`,
      detail: contact.reason === 'several-in-range'
        ? `Shared channel: ${contact.count} airports within ${CONTACT_RANGE_NM} NM (${names}). Tune an airport-specific channel.`
        : `Regional or other-station service${contact.count >= SHARED_NAME_AIRPORTS ? ` listed for ${contact.count} airports` : ''}; no airport contact simulated.`,
      note, qnh: null,
    };
  }
  const qnh = formatQnh(qnh_pa);
  const name = contact.station.description.trim() || `${contact.airport.name} ${contact.station.service.trim()}`.trim();
  return {
    title: `${head} · ${airportIdent(contact.airport)} ${name}`,
    detail: `Welcome to ${contact.airport.name}. ${qnh ? `QNH ${qnh.hpa} hPa (${qnh.inhg} inHg).` : 'QNH unavailable: no simulator pressure reference.'}`,
    note: `${note} · simulator sea-level pressure, no weather`, qnh,
  };
}

/**
 * Explicit altimeter action state; it is never applied automatically. A setting inside
 * the announced whole-hPa window (e.g. 1013.00–1013.99 hPa for "QNH 1013") already
 * counts as on QNH; the action itself sets the exact simulator value.
 */
export function qnhActionState(input: { reviewing: boolean; controlsAvailable: boolean; qnh_pa: number | null | undefined; setting_pa: number | null | undefined }) {
  const qnh = formatQnh(input.qnh_pa);
  if (input.reviewing) return { enabled: false, label: 'Review · read only' };
  if (!qnh) return { enabled: false, label: 'QNH unavailable' };
  const announced_pa = Number(qnh.hpa) * 100;
  if (typeof input.setting_pa === 'number' && input.setting_pa >= announced_pa - 1e-6 && input.setting_pa < announced_pa + 100) return { enabled: false, label: `Altimeter on QNH ${qnh.hpa}` };
  if (!input.controlsAvailable) return { enabled: false, label: 'Altimeter locked' };
  return { enabled: true, label: `Set altimeter QNH ${qnh.hpa}` };
}
