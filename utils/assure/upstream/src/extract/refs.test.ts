import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractRefs, parseLog, parseRefList } from './refs.ts';

test('parseRefList reads TODO items, continuing a TODO list with bare numbers', () => {
  const { refs, unknown } = parseRefList('TODO 0.2.6, 0.4.5, 1.2.1');
  assert.deepEqual(refs.map((r) => `${r.kind}:${r.id}`), ['todo:0.2.6', 'todo:0.4.5', 'todo:1.2.1']);
  assert.deepEqual(unknown, []);
});

test('parseRefList expands question ranges and reads requirements, assumptions and threats', () => {
  const { refs } = parseRefList('GAPS Q1-Q3, A7, SEC T2, R-LENS-1');
  assert.deepEqual(refs.map((r) => r.id), ['Q1', 'Q2', 'Q3', 'A7', 'T2', 'R-LENS-1']);
});

test('R-ASR-12: a Refs: line that Git did not read as a trailer is marked', () => {
  const log = 'abc\u001f2026-10-25T12:00:00+01:00\u001fWork\u001f\u001fBody.\n\nRefs: TODO 1.1\n\nCo-Authored-By: X\u001e';
  const [commit] = parseLog(log);
  assert.equal(commit.unparsed, true);
  assert.equal(extractRefs([commit]).nodes[0].attrs?.unparsed, 'Refs');
});

test('parseRefList reports tokens it cannot place instead of guessing', () => {
  const { refs, unknown } = parseRefList('0.6, something else');
  assert.deepEqual(refs, []);
  assert.deepEqual(unknown, ['0.6', 'something else']);
});

test('R-ASR-7: parseLog and extractRefs turn trailers into commit nodes and facts', () => {
  const log = 'abc\u001f2026-10-25T12:00:00+01:00\u001fAdd IDs\u001fTODO 0.6.1, R-ASR-1\u001e\ndef\u001f2026-10-25T11:00:00+01:00\u001fSetup\u001f\u001e';
  const commits = parseLog(log);
  assert.equal(commits.length, 2);
  const { nodes, facts } = extractRefs(commits);
  assert.deepEqual(nodes.map((n) => [n.id, n.title]), [['abc', 'Add IDs'], ['def', 'Setup']]);
  assert.deepEqual(
    facts.map((f) => [f.subject.id, f.relation, f.object.kind, f.object.id]),
    [
      ['abc', 'implements', 'todo', '0.6.1'],
      ['abc', 'refs', 'requirement', 'R-ASR-1'],
    ],
  );
});
