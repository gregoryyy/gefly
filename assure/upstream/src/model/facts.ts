// The lineage graph's vocabulary: nodes, relations, facts, and the typed schema that every
// fact must satisfy before it's stored (docs/assure/ASSR.md, "Keeping the graph right").

import { createHash } from 'node:crypto';

/** Kinds of nodes in the lineage graph. */
export type NodeKind =
  | 'requirement'
  | 'question'
  | 'assumption'
  | 'threat'
  | 'todo'
  | 'done'
  | 'commit'
  | 'document'
  | 'object'
  | 'test';

/** Typed relations between nodes (docs/assure/SPEC.md, "Relations"). */
export type Relation =
  | 'defined-in'
  | 'part-of'
  | 'derives-from'
  | 'blocked-by'
  | 'implements'
  | 'records'
  | 'verifies'
  | 'mitigates'
  | 'changes'
  | 'refs';

/** How a fact was established; reports never present an uncertain or stale fact as confirmed (R-ASR-5). */
export type Certainty = 'confirmed' | 'declared' | 'derived' | 'uncertain' | 'stale';

/** A node, identified by its kind and its ID in the project (`R-PIV-1`, `Q4`, a path, a hash). */
export interface NodeRef {
  kind: NodeKind;
  id: string;
}

/** A fact as an extractor or a person asserts it, before the store assigns its identity. */
export interface NewFact {
  /** Commit the fact belongs to, or `worktree` for uncommitted state. */
  at: string;
  /** Extractor with version, agent with model, or person. */
  by: string;
  subject: NodeRef;
  relation: Relation;
  object: NodeRef;
  certainty: Certainty;
  /** Where the fact comes from: `path:line`, a commit hash, a reason for a retraction. */
  source: string;
  /** ID of the fact this one replaces. */
  supersedes?: string;
  /** ID of the fact this one withdraws. */
  retracts?: string;
}

/** A stored fact. */
export interface Fact extends NewFact {
  /** Content hash of the fact's identity fields; asserting the same fact again yields the same ID. */
  id: string;
}

const ALL: readonly NodeKind[] = [
  'requirement',
  'question',
  'assumption',
  'threat',
  'todo',
  'done',
  'commit',
  'document',
  'object',
  'test',
];

/** Allowed subject and object kinds per relation; facts outside them are rejected (R-ASR-1). */
export const SCHEMA: Readonly<Record<Relation, { subject: readonly NodeKind[]; object: readonly NodeKind[] }>> = {
  'defined-in': { subject: ['requirement', 'question', 'assumption', 'threat', 'todo', 'done'], object: ['document'] },
  'part-of': { subject: ['todo', 'object'], object: ['todo', 'object', 'document'] },
  'derives-from': { subject: ['todo'], object: ['requirement', 'question', 'assumption', 'threat'] },
  'blocked-by': { subject: ['todo'], object: ['question'] },
  implements: { subject: ['commit', 'object'], object: ['todo', 'requirement'] },
  records: { subject: ['done'], object: ['todo'] },
  verifies: { subject: ['test'], object: ['requirement', 'question', 'threat', 'todo'] },
  mitigates: { subject: ['object'], object: ['threat'] },
  changes: { subject: ['commit'], object: ['object', 'test'] },
  refs: { subject: ['commit', 'document', 'object', 'test', 'done'], object: ALL },
};

/** Pairs of subject and object kinds that a relation allows only together (beyond the lists above). */
const PAIRS: Partial<Record<Relation, readonly [NodeKind, NodeKind][]>> = {
  'part-of': [
    ['todo', 'todo'],
    ['object', 'object'],
    ['object', 'document'],
  ],
  implements: [
    ['commit', 'todo'],
    ['object', 'requirement'],
  ],
};

/** Schema violations of a fact; empty when the fact is well-typed. */
export function validate(fact: NewFact): string[] {
  const rule = SCHEMA[fact.relation];
  const errors: string[] = [];
  if (!rule) return [`unknown relation "${fact.relation}"`];
  if (!rule.subject.includes(fact.subject.kind)) {
    errors.push(`"${fact.relation}" can't start at a ${fact.subject.kind}`);
  }
  if (!rule.object.includes(fact.object.kind)) {
    errors.push(`"${fact.relation}" can't end at a ${fact.object.kind}`);
  }
  const pairs = PAIRS[fact.relation];
  if (!errors.length && pairs && !pairs.some(([a, b]) => a === fact.subject.kind && b === fact.object.kind)) {
    errors.push(`"${fact.relation}" can't link a ${fact.subject.kind} to a ${fact.object.kind}`);
  }
  if (!fact.subject.id || !fact.object.id) errors.push('subject and object need IDs');
  if (!fact.source) errors.push('a fact needs a source');
  return errors;
}

/**
 * Identity of a fact. Time and author are left out on purpose: re-extracting the same
 * repository state yields the same IDs, which keeps the graph rebuildable (R-ASR-3).
 */
export function factId(fact: NewFact): string {
  const key = [
    fact.at,
    fact.subject.kind,
    fact.subject.id,
    fact.relation,
    fact.object.kind,
    fact.object.id,
    fact.source,
    fact.supersedes ?? '',
    fact.retracts ?? '',
  ].join('\u001f');
  return createHash('sha1').update(key).digest('hex').slice(0, 16);
}

/** What extractors know about a node besides its identity (docs/assure/SPEC.md, "Nodes"). */
export interface NodeInfo extends NodeRef {
  title?: string;
  status?: string;
  /** Where the node is stated: `path:line`. */
  source?: string;
  /** Hash of the node's text, to notice when it changes (R-ASR-11). */
  hash?: string;
  /** Further fields by kind: a commit's time, a DONE entry's PR, a question's blocking flag. */
  attrs?: Record<string, string>;
}

/** Nodes and facts from one extractor. */
export interface Extraction {
  nodes: NodeInfo[];
  facts: NewFact[];
}

/** A node as one string: `kind:id`. */
export function nodeKey(node: NodeRef): string {
  return `${node.kind}:${node.id}`;
}

/** Reads `kind:id`; undefined when the kind is unknown. */
export function parseNodeKey(key: string): NodeRef | undefined {
  const i = key.indexOf(':');
  const kind = key.slice(0, i) as NodeKind;
  return i > 0 && ALL.includes(kind) ? { kind, id: key.slice(i + 1) } : undefined;
}

/** A link is what a fact states, apart from where and by whom: subject, relation, object. */
export interface Link {
  subject: NodeRef;
  relation: Relation;
  object: NodeRef;
}

/** A link as one string: `kind:id relation kind:id`. */
export function linkKey(link: Link): string {
  return `${nodeKey(link.subject)} ${link.relation} ${nodeKey(link.object)}`;
}

/** Short content hash for node text and bodies. */
export function textHash(text: string): string {
  return createHash('sha1').update(text.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 12);
}
