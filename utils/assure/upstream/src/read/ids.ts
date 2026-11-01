// Finds IDs of requirements, questions, assumptions, threats and TODO items in text. Bare mode
// is for the plan, where `Q4` or `T13` can only mean a question or a threat; prefixed mode is for
// code comments, where short IDs count only after `GAPS`, `SEC` or `TODO` (docs/assure/SPEC.md).

import type { NodeKind, NodeRef } from '../model/facts.ts';

export const REQUIREMENT = /\bR-[A-Z]+-\d+\b/g;
const SHORT: Record<string, NodeKind> = { Q: 'question', A: 'assumption', T: 'threat' };
const ITEM = String.raw`[QAT]\d+(?:\s*[–-]\s*[QAT]?\d+)?`;
const BARE = new RegExp(String.raw`(?<![\w-])(${ITEM})(?![\w-])`, 'g');
const PREFIXED = new RegExp(String.raw`\b(GAPS|SEC)\s+(${ITEM}(?:\s*,\s*${ITEM})*)(?![\w-])`, 'g');
const TODO = /\bTODO\s+(\d+(?:\.\d+)+(?:\s*,\s*\d+(?:\.\d+)+)*)/g;

/** Expands `A1–A3` into A1, A2, A3; a single ID into itself. */
function expand(token: string): NodeRef[] {
  const m = /^([QAT])(\d+)(?:\s*[–-]\s*[QAT]?(\d+))?$/.exec(token.trim());
  if (!m) return [];
  const last = m[3] ? Number(m[3]) : Number(m[2]);
  const refs: NodeRef[] = [];
  for (let n = Number(m[2]); n <= last && n - Number(m[2]) < 200; n++) refs.push({ kind: SHORT[m[1]], id: `${m[1]}${n}` });
  return refs;
}

/** A found ID and where its match starts in the text (a range's IDs share the range's position). */
export interface Found {
  at: number;
  ref: NodeRef;
}

/** IDs in order of kind (requirements, then short IDs, then TODO items) and position. */
export function scanIds(text: string, opts: { bare: boolean }): NodeRef[] {
  return findIds(text, opts).map((f) => f.ref);
}

/** Like {@link scanIds}, with positions. */
export function findIds(text: string, { bare }: { bare: boolean }): Found[] {
  const found: Found[] = [];
  for (const m of text.matchAll(REQUIREMENT)) found.push({ at: m.index, ref: { kind: 'requirement', id: m[0] } });
  const short: Found[] = [];
  if (bare) {
    for (const m of text.matchAll(BARE)) for (const ref of expand(m[1])) short.push({ at: m.index, ref });
  } else {
    for (const m of text.matchAll(PREFIXED)) {
      for (const token of m[2].split(',')) for (const ref of expand(token)) short.push({ at: m.index, ref });
    }
    for (const m of text.matchAll(TODO)) {
      for (const id of m[1].split(',')) short.push({ at: m.index, ref: { kind: 'todo', id: id.trim() } });
    }
  }
  const order: NodeKind[] = ['question', 'assumption', 'threat', 'todo'];
  short.sort((a, b) => (bare ? a.at - b.at : order.indexOf(a.ref.kind) - order.indexOf(b.ref.kind) || a.at - b.at));
  return [...found, ...short];
}
