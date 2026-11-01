// The ledger: confirmations, retractions and declared links that have no other home, one JSON object
// per line in docs/assure/ledger.jsonl, appended and never edited (R-ASR-10). A confirmation records
// the hashes of both ends; if either has changed since, the link becomes stale (R-ASR-11).

import { type Fact, type Link, type NodeInfo, type Relation, SCHEMA, linkKey, nodeKey, parseNodeKey } from './facts.ts';
import { type MemoryStore, SchemaError } from './store.ts';

export const LEDGER_PATH = 'docs/assure/ledger.jsonl';

/** One ledger line. Nodes are written as `kind:id`. */
export interface LedgerEntry {
  action: 'confirm' | 'retract' | 'assert';
  link: { subject: string; relation: Relation; object: string };
  by: string;
  time: string;
  reason?: string;
  /** Hashes of subject and object at the time of a confirmation. */
  hashes?: [string, string];
}

/** What applying the ledger did. */
export interface LedgerOutcome {
  entries: number;
  confirmed: string[];
  retracted: string[];
  asserted: string[];
  stale: { link: string; line: number }[];
  orphans: { link: string; line: number; action: string }[];
  invalid: { line: number; error: string }[];
  appendOnly: boolean;
}

/** Reads a link from `kind:id relation kind:id`. */
export function parseLink(text: string): Link | undefined {
  for (const relation of Object.keys(SCHEMA) as Relation[]) {
    const at = text.indexOf(` ${relation} `);
    if (at < 0) continue;
    const subject = parseNodeKey(text.slice(0, at).trim());
    const object = parseNodeKey(text.slice(at + relation.length + 2).trim());
    if (subject && object) return { subject, relation, object };
  }
  return undefined;
}

/** Parses ledger lines; malformed lines are reported, not skipped silently. */
export function parseLedger(text: string): { entries: (LedgerEntry & { line: number })[]; invalid: LedgerOutcome['invalid'] } {
  const entries: (LedgerEntry & { line: number })[] = [];
  const invalid: LedgerOutcome['invalid'] = [];
  text.split('\n').forEach((raw, i) => {
    if (!raw.trim()) return;
    try {
      const e = JSON.parse(raw) as LedgerEntry;
      if (!['confirm', 'retract', 'assert'].includes(e.action) || !e.link || !parseNodeKey(e.link.subject) || !parseNodeKey(e.link.object) || !e.by || !e.time) {
        invalid.push({ line: i + 1, error: 'needs action, link (kind:id), by and time' });
      } else entries.push({ ...e, line: i + 1 });
    } catch {
      invalid.push({ line: i + 1, error: 'not JSON' });
    }
  });
  return { entries, invalid };
}

/** True when the committed ledger is an unchanged prefix of the current one. */
export function isAppendOnly(committed: string | undefined, current: string): boolean {
  if (!committed) return true;
  const old = committed.split('\n').filter((l) => l.trim());
  const now = current.split('\n').filter((l) => l.trim());
  return old.every((line, i) => now[i] === line);
}

/** Applies ledger entries to the store, in order. */
export function applyLedger(store: MemoryStore, nodes: ReadonlyMap<string, NodeInfo>, text: string, committed?: string, path = LEDGER_PATH): LedgerOutcome {
  const { entries, invalid } = parseLedger(text);
  const outcome: LedgerOutcome = { entries: entries.length, confirmed: [], retracted: [], asserted: [], stale: [], orphans: [], invalid, appendOnly: isAppendOnly(committed, text) };
  for (const e of entries) {
    const link: Link = { subject: parseNodeKey(e.link.subject)!, relation: e.link.relation, object: parseNodeKey(e.link.object)! };
    const key = linkKey(link);
    const source = `${path}:${e.line}`;
    const current = store.query({ subject: link.subject, relation: link.relation, object: link.object }).filter((f) => sameNode(f, link));
    try {
      if (e.action === 'assert') {
        store.assert({ at: 'ledger', by: e.by, ...link, certainty: 'declared', source });
        outcome.asserted.push(key);
      } else if (!current.length) {
        outcome.orphans.push({ link: key, line: e.line, action: e.action });
      } else if (e.action === 'retract') {
        for (const f of current) store.retract(f.id, e.reason ?? source, e.by);
        outcome.retracted.push(key);
      } else {
        const now = [nodes.get(nodeKey(link.subject))?.hash ?? '', nodes.get(nodeKey(link.object))?.hash ?? ''];
        const stale = !e.hashes || e.hashes[0] !== now[0] || e.hashes[1] !== now[1];
        for (const f of current) store.supersede(f.id, { ...strip(f), by: e.by, certainty: stale ? 'stale' : 'confirmed', source });
        if (stale) outcome.stale.push({ link: key, line: e.line });
        else outcome.confirmed.push(key);
      }
    } catch (err) {
      if (!(err instanceof SchemaError)) throw err;
      outcome.invalid.push({ line: e.line, error: err.message });
    }
  }
  return outcome;
}

const sameNode = (f: Fact, l: Link) => f.subject.id === l.subject.id && f.object.id === l.object.id;
const strip = ({ id: _id, supersedes: _s, retracts: _r, ...rest }: Fact) => rest;
