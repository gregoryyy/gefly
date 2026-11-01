import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { NewFact } from './facts.ts';
import { MemoryStore, SchemaError, toJsonl } from './store.ts';

const defined: NewFact = {
  at: 'abc123',
  by: 'test',
  subject: { kind: 'requirement', id: 'R-PIV-1' },
  relation: 'defined-in',
  object: { kind: 'document', id: 'docs/design/CONCEPT.md' },
  certainty: 'declared',
  source: 'docs/design/CONCEPT.md:57',
};

describe('MemoryStore', () => {
  test('R-ASR-1: assert rejects a fact whose endpoints break the schema', () => {
    const store = new MemoryStore();
    assert.throws(
      () => store.assert({ ...defined, relation: 'verifies' }),
      (e: unknown) => e instanceof SchemaError && e.errors.some((m) => m.includes("can't start at a requirement")),
    );
    assert.equal(store.log().length, 0);
  });

  test('R-ASR-1: assert rejects a fact without a source', () => {
    assert.throws(() => new MemoryStore().assert({ ...defined, source: '' }), SchemaError);
  });

  test('R-ASR-1: assert accepts a well-typed fact and gives it a stable ID', () => {
    const fact = new MemoryStore().assert(defined);
    assert.match(fact.id, /^[0-9a-f]{16}$/);
  });

  test('R-ASR-2: the store offers no update or delete', () => {
    const store = new MemoryStore() as unknown as Record<string, unknown>;
    for (const name of ['update', 'delete', 'remove', 'set']) assert.equal(store[name], undefined);
  });

  test('R-ASR-2: retract keeps the original fact and hides it from queries', () => {
    const store = new MemoryStore();
    const original = store.assert(defined);
    const retraction = store.retract(original.id, 'moved to PERSONAL', 'test');
    assert.equal(retraction.retracts, original.id);
    assert.deepEqual(store.query(), []);
    assert.deepEqual(store.query({ withdrawn: true }), [original]);
    assert.equal(store.log().length, 2);
  });

  test('R-ASR-2: supersede replaces a fact in queries and keeps the old one in history', () => {
    const store = new MemoryStore();
    const old = store.assert(defined);
    const next = store.supersede(old.id, { ...defined, source: 'docs/design/CONCEPT.md:58' });
    assert.deepEqual(store.query(), [next]);
    assert.equal(next.supersedes, old.id);
    assert.equal(store.log().length, 2);
  });

  test('R-ASR-2: supersede and retract refuse unknown facts', () => {
    const store = new MemoryStore();
    assert.throws(() => store.retract('0000000000000000', 'gone', 'test'), SchemaError);
    assert.throws(() => store.supersede('0000000000000000', defined), SchemaError);
  });

  test('R-ASR-3: asserting the same fact twice stores it once, whoever asserts it and when', () => {
    const store = new MemoryStore();
    const a = store.assert(defined);
    const b = store.assert({ ...defined, by: 'someone else' });
    assert.equal(a, b);
    assert.equal(store.log().length, 1);
  });

  test('query filters by relation, subject and object', () => {
    const store = new MemoryStore();
    store.assert(defined);
    store.assert({ ...defined, subject: { kind: 'requirement', id: 'R-PIV-2' } });
    assert.equal(store.query({ subject: { id: 'R-PIV-2' } }).length, 1);
    assert.equal(store.query({ relation: 'refs' }).length, 0);
    assert.equal(store.query({ object: { kind: 'document' } }).length, 2);
  });

  test('toJsonl writes one fact per line in assertion order', () => {
    const store = new MemoryStore();
    const fact = store.assert(defined);
    assert.equal(toJsonl(store), JSON.stringify(fact) + '\n');
    assert.equal(toJsonl(new MemoryStore()), '');
  });
});
