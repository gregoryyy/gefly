// Extracts the plan from docs/TODO.md: milestones (`## n. Title`), items (`- [x] n.n.n Title`),
// their status and hierarchy, and what each item derives from or is blocked by.

import { type Extraction, type NewFact, type NodeInfo, type NodeRef, textHash } from '../model/facts.ts';
import { findIds } from '../read/ids.ts';
import { plain, proseLines, stripLinks } from '../read/markdown.ts';
import type { Doc } from './requirements.ts';

const BY = 'assure/plan@0.1';
const MILESTONE = /^##\s+(\d+)\.\s+(.*)$/;
const ITEM = /^\s*[-*]\s+\[([ xX])\]\s+(\d+(?:\.\d+)+)\.?\s+(.*)$/;

/** TODO nodes and their `defined-in`, `part-of`, `derives-from` and `blocked-by` facts. */
export function extractPlan(doc: Doc, at: string): Extraction {
  const nodes: NodeInfo[] = [];
  const facts: NewFact[] = [];
  const raw = doc.text.split('\n');
  const fact = (subject: NodeRef, relation: NewFact['relation'], object: NodeRef, source: string, certainty: NewFact['certainty'] = 'declared') =>
    facts.push({ at, by: BY, subject, relation, object, certainty, source });
  proseLines(doc.text).forEach((prose, i) => {
    const source = `${doc.path}:${i + 1}`;
    const milestone = MILESTONE.exec(raw[i]);
    if (milestone) {
      nodes.push({ kind: 'todo', id: milestone[1], title: plain(milestone[2]), source, hash: textHash(raw[i]) });
      fact({ kind: 'todo', id: milestone[1] }, 'defined-in', { kind: 'document', id: doc.path }, source);
      return;
    }
    const item = ITEM.exec(raw[i]);
    if (!item) return;
    const [, tick, id, text] = item;
    const self: NodeRef = { kind: 'todo', id };
    nodes.push({ kind: 'todo', id, title: plain(text), status: tick === ' ' ? 'open' : 'done', source, hash: textHash(raw[i]) });
    fact(self, 'defined-in', { kind: 'document', id: doc.path }, source);
    fact(self, 'part-of', { kind: 'todo', id: id.slice(0, id.lastIndexOf('.')) }, source, 'derived');
    const body = stripLinks(ITEM.exec(prose)?.[3] ?? '');
    const blockedAt = body.search(/blocked by/i);
    for (const m of findIds(body, { bare: true })) {
      const blocked = blockedAt >= 0 && m.at > blockedAt && m.ref.kind === 'question';
      fact(self, blocked ? 'blocked-by' : 'derives-from', m.ref, source);
    }
  });
  // A milestone is done when all its items are.
  for (const n of nodes) {
    if (n.status) continue;
    const items = nodes.filter((m) => m.id.startsWith(`${n.id}.`));
    n.status = items.length && items.every((m) => m.status === 'done') ? 'done' : 'open';
  }
  return { nodes, facts };
}
