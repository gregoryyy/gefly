import type { Airport } from './airport-catalogue.ts';
import { airportDistance_nm, isComChannel } from './airport-com.ts';
import type { AirportComDirectory, AirportComStation } from './airport-com.ts';

/**
 * Simulated airport radio contact (R-COMM-2, TODO 2.0.194). Pure logic only:
 * an ACTIVE COM channel that equals a source-listed aerodrome channel of one
 * airport within range produces a text welcome plus the SIMULATOR's own QNH.
 * It is not ATC, not a METAR/ATIS and never changes the altimeter by itself.
 */

/** Simplified VFR reception range: horizontal great-circle distance only,
 * altitude-agnostic line-of-sight assumption, no terrain masking or RF model. */
export const CONTACT_RANGE_NM = 25;
/** An established contact is kept to this distance so it does not flicker at the edge. */
export const CONTACT_RELEASE_NM = 27;
/** A channel/description pair listed for this many airports is a shared service name (e.g. FIS "Langen Information"). */
export const SHARED_NAME_AIRPORTS = 3;
/** Same hPa/inHg factor as the pressure-altimeter panel. */
export const PA_PER_INHG = 3386.389;
const QNH_MIN_PA = 80_000, QNH_MAX_PA = 110_000;
/** Source service types that are not an aerodrome station; they never produce a welcome. */
const NON_AERODROME = new Set(['FIS', 'ACC', 'VOLMET', 'PMSV', 'RDR', 'RADAR', 'APP', 'ARR', 'DEP', 'GCA', 'VDF', 'EMR']);
/** 121.500 MHz is the international emergency channel (and the COM2 default), never an airport welcome. */
const EMERGENCY_KHZ = 121_500;

export interface ContactSource { airports: readonly Airport[]; directory: AirportComDirectory }
export interface ActiveCom { receiver: 1 | 2; channel_khz: number }
export interface Position_deg { lat: number; lon: number }
interface SourceLabel { retrieved: string; source: string }
export interface AirportContactSingle extends SourceLabel {
  kind: 'contact'; key: string; receivers: (1 | 2)[]; channel_khz: number;
  airport: Airport; station: AirportComStation; distance_nm: number;
}
export interface AirportContactShared extends SourceLabel {
  kind: 'shared'; key: string; receivers: (1 | 2)[]; channel_khz: number;
  /** Nearest first, at most three. */
  airports: { airport: Airport; distance_nm: number }[];
  /** Airports listing the channel within range, or listing the shared service name in the directory. */
  count: number; reason: 'several-in-range' | 'shared-name'; label: string;
}
export type AirportContact = AirportContactSingle | AirportContactShared;

/** Display/de-duplication identifier: ICAO when present, otherwise the source identifier. */
export const airportIdent = (airport: Airport) => airport.icao || airport.id;
const exactChannel = (s: AirportComStation) => isComChannel(s.channel_khz)
  && Math.abs(Number(s.source_frequency_mhz) * 1000 - s.channel_khz) < 1e-6;
const normalized = (text: string) => text.trim().toLocaleLowerCase();
const validPosition = (p: Position_deg | null | undefined): p is Position_deg => !!p
  && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

interface Candidate { airport: Airport; station: AirportComStation; distance_nm: number; source: ContactSource }

/** Indexes are rebuilt only when a directory object changes. */
const indexes = new WeakMap<AirportComDirectory, { byChannel: Map<number, AirportComStation[]>; names: Map<string, Set<string>> }>();
function index(directory: AirportComDirectory) {
  let value = indexes.get(directory);
  if (!value) {
    const byChannel = new Map<number, AirportComStation[]>(); const names = new Map<string, Set<string>>();
    for (const station of directory.stations) {
      if (!exactChannel(station)) continue;
      const rows = byChannel.get(station.channel_khz) ?? []; rows.push(station); byChannel.set(station.channel_khz, rows);
      if (station.description.trim()) {
        const key = `${station.channel_khz}|${normalized(station.description)}`;
        const ids = names.get(key) ?? new Set<string>(); ids.add(station.airport_id); names.set(key, ids);
      }
    }
    value = { byChannel, names }; indexes.set(directory, value);
  }
  return value;
}

/**
 * Resolves one active channel. Earlier sources win for the same airport identifier.
 * `retainAirport` is the identifier of an established contact, kept to CONTACT_RELEASE_NM.
 */
export function findAirportContact(active: ActiveCom, position: Position_deg | null, sources: readonly ContactSource[], retainAirport?: string): AirportContact | null {
  if (!validPosition(position) || !isComChannel(active.channel_khz) || active.channel_khz === EMERGENCY_KHZ) return null;
  const candidates = new Map<string, Candidate>(); let sharedNameAirports = 0;
  for (const source of sources) {
    const byId = new Map(source.airports.map(a => [a.id, a]));
    const { byChannel, names } = index(source.directory);
    for (const station of byChannel.get(active.channel_khz) ?? []) {
      if (NON_AERODROME.has(station.service.trim().toUpperCase())) continue;
      const airport = byId.get(station.airport_id);
      if (!airport || airport.type === 'closed' || !Number.isFinite(airport.lat) || !Number.isFinite(airport.lon)) continue;
      const key = airportIdent(airport); const distance_nm = airportDistance_nm(position, airport);
      if (distance_nm > (key === retainAirport ? CONTACT_RELEASE_NM : CONTACT_RANGE_NM)) continue;
      if (station.description.trim()) sharedNameAirports = Math.max(sharedNameAirports,
        names.get(`${station.channel_khz}|${normalized(station.description)}`)?.size ?? 0);
      const existing = candidates.get(key);
      // One station per airport: keep the first source, then the most descriptive row.
      if (!existing || (existing.source === source && !existing.station.description && station.description)) candidates.set(key, { airport, station, distance_nm, source });
    }
  }
  if (!candidates.size) return null;
  const ordered = [...candidates.values()].sort((a, b) => a.distance_nm - b.distance_nm || airportIdent(a.airport).localeCompare(airportIdent(b.airport)));
  const first = ordered[0]; const label = { retrieved: first.source.directory.retrieved, source: first.source.directory.source };
  if (ordered.length > 1 || sharedNameAirports >= SHARED_NAME_AIRPORTS) {
    const reason = ordered.length > 1 ? 'several-in-range' as const : 'shared-name' as const;
    return { kind: 'shared', key: `shared|${active.channel_khz}`, receivers: [active.receiver], channel_khz: active.channel_khz,
      airports: ordered.slice(0, 3).map(c => ({ airport: c.airport, distance_nm: c.distance_nm })),
      count: reason === 'several-in-range' ? ordered.length : sharedNameAirports, reason,
      label: first.station.description.trim() || first.station.service.trim() || 'COM', ...label };
  }
  return { kind: 'contact', key: `contact|${active.channel_khz}|${airportIdent(first.airport)}`, receivers: [active.receiver],
    channel_khz: active.channel_khz, airport: first.airport, station: first.station, distance_nm: first.distance_nm, ...label };
}

export interface ContactUpdate {
  /** Current contacts, de-duplicated across COM1/COM2 by channel and airport. */
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
      const retained = new Map<number, string>();
      for (const contact of current) if (contact.kind === 'contact') retained.set(contact.channel_khz, airportIdent(contact.airport));
      const next = new Map<string, AirportContact>();
      for (const active of input.active) {
        const contact = findAirportContact(active, input.position, input.sources, retained.get(active.channel_khz));
        if (!contact) continue;
        const existing = next.get(contact.key);
        if (existing) { if (!existing.receivers.includes(active.receiver)) existing.receivers.push(active.receiver); }
        else next.set(contact.key, contact);
      }
      const previous = new Set(current.map(c => c.key));
      current = [...next.values()];
      return { contacts: current, announce: current.filter(c => !previous.has(c.key)) };
    },
    reset() { current = []; },
  };
}

/** Spoken-style QNH: whole hPa rounded down, inHg to 0.01. Null outside the practice setting range. */
export function formatQnh(qnh_pa: number | null | undefined): { hpa: string; inhg: string } | null {
  if (typeof qnh_pa !== 'number' || !Number.isFinite(qnh_pa) || qnh_pa < QNH_MIN_PA || qnh_pa > QNH_MAX_PA) return null;
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
        : `Shared service name listed for ${contact.count} airports; no single airport. Tune an airport-specific channel.`,
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

/** Explicit altimeter action state; it is never applied automatically. */
export function qnhActionState(input: { reviewing: boolean; controlsAvailable: boolean; qnh_pa: number | null | undefined; setting_pa: number | null | undefined }) {
  const qnh = formatQnh(input.qnh_pa);
  if (input.reviewing) return { enabled: false, label: 'Review · read only' };
  if (!qnh) return { enabled: false, label: 'QNH unavailable' };
  if (typeof input.setting_pa === 'number' && Math.abs(input.setting_pa - input.qnh_pa!) <= 1) return { enabled: false, label: `Altimeter on QNH ${qnh.hpa}` };
  if (!input.controlsAvailable) return { enabled: false, label: 'Altimeter locked' };
  return { enabled: true, label: `Set altimeter QNH ${qnh.hpa}` };
}
