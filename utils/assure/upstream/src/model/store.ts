// An append-only fact store. There is no update and no delete: a change is a new fact that
// supersedes the old one, a withdrawal is a fact that retracts it (docs/assure/ASSR.md,
// "Database and API"). The in-memory store serves the skeleton and tests; a SQLite store can
// implement the same interface at level 2.

import { type Fact, type NewFact, type NodeRef, type Relation, factId, validate } from './facts.ts';

/** Filter for queries; unset fields match everything. */
export interface Query {
  subject?: Partial<NodeRef>;
  relation?: Relation;
  object?: Partial<NodeRef>;
  /** Include facts that were superseded or retracted. */
  withdrawn?: boolean;
}

/** The store's interface: assert, query, supersede, retract. */
export interface FactStore {
  assert(fact: NewFact): Fact;
  supersede(id: string, next: NewFact): Fact;
  retract(id: string, reason: string, by: string): Fact;
  query(q?: Query): Fact[];
  /** All facts in the order they were asserted, including supersessions and retractions. */
  log(): readonly Fact[];
}

/** Thrown when a fact breaks the typed schema (R-ASR-1). */
export class SchemaError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`fact rejected: ${errors.join('; ')}`);
    this.name = 'SchemaError';
    this.errors = errors;
  }
}

function matches(node: NodeRef, filter?: Partial<NodeRef>): boolean {
  return !filter || ((!filter.kind || node.kind === filter.kind) && (!filter.id || node.id === filter.id));
}

/** In-memory implementation of {@link FactStore}. */
export class MemoryStore implements FactStore {
  readonly #facts: Fact[] = [];
  readonly #byId = new Map<string, Fact>();
  readonly #withdrawn = new Set<string>();

  assert(fact: NewFact): Fact {
    const errors = validate(fact);
    if (errors.length) throw new SchemaError(errors);
    const id = factId(fact);
    // Asserting a known fact again is a no-op, so extraction can run repeatedly (R-ASR-3).
    const known = this.#byId.get(id);
    if (known) return known;
    for (const ref of [fact.supersedes, fact.retracts]) {
      if (ref && !this.#byId.has(ref)) throw new SchemaError([`unknown fact ${ref}`]);
    }
    const stored: Fact = { ...fact, id };
    this.#facts.push(stored);
    this.#byId.set(id, stored);
    if (fact.supersedes) this.#withdrawn.add(fact.supersedes);
    if (fact.retracts) this.#withdrawn.add(fact.retracts);
    return stored;
  }

  supersede(id: string, next: NewFact): Fact {
    return this.assert({ ...next, supersedes: id });
  }

  retract(id: string, reason: string, by: string): Fact {
    const old = this.#byId.get(id);
    if (!old) throw new SchemaError([`unknown fact ${id}`]);
    return this.assert({
      at: old.at,
      by,
      subject: old.subject,
      relation: old.relation,
      object: old.object,
      certainty: 'declared',
      source: reason,
      retracts: id,
    });
  }

  query(q: Query = {}): Fact[] {
    return this.#facts.filter(
      (f) =>
        !f.retracts &&
        (q.withdrawn || !this.#withdrawn.has(f.id)) &&
        (!q.relation || f.relation === q.relation) &&
        matches(f.subject, q.subject) &&
        matches(f.object, q.object),
    );
  }

  log(): readonly Fact[] {
    return this.#facts;
  }
}

/** Facts as JSON Lines, one fact per line, in assertion order. */
export function toJsonl(store: FactStore): string {
  return store.log().map((f) => JSON.stringify(f)).join('\n') + (store.log().length ? '\n' : '');
}
