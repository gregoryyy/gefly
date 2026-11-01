import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractRequirements } from './requirements.ts';

const doc = (text: string) => [{ path: 'docs/x.md', text }];

test('R-ASR-3: a tag after a statement defines the requirement at its line', () => {
  const facts = extractRequirements(doc('Intro.\n\nItems never move silently. [R-POS-1]\n'), 'worktree').facts;
  assert.deepEqual(
    facts.map((f) => [f.relation, f.subject.id, f.source]),
    [['defined-in', 'R-POS-1', 'docs/x.md:3']],
  );
});

test('R-ASR-3: other mentions are references from the document', () => {
  const facts = extractRequirements(doc('- [ ] 2.1 Build the lanes (R-LANE-1)\n'), 'worktree').facts;
  assert.deepEqual(
    facts.map((f) => [f.relation, f.subject.id, f.object.id]),
    [['refs', 'docs/x.md', 'R-LANE-1']],
  );
});

test('R-ASR-3: code spans and fenced blocks are not extracted', () => {
  const text = 'Format: `[R-PIV-1]` and ` [R-PIV-2]`.\n\n```text\nA line [R-PIV-3]\n```\n';
  assert.deepEqual(extractRequirements(doc(text), 'worktree'), { nodes: [], facts: [] });
});

test('R-ASR-3: extraction is deterministic for the same input', () => {
  const text = 'One. [R-A-1]\nTwo refers to R-A-1.\n';
  assert.deepEqual(extractRequirements(doc(text), 'worktree'), extractRequirements(doc(text), 'worktree'));
});

test('R-ASR-7: a definition gives the requirement node its statement, status and hash', () => {
  const { nodes } = extractRequirements(doc('- **Stable.** Items never move silently. [R-POS-1]\n| Old rule [R-POS-2] *retired* |\n'), 'worktree');
  assert.deepEqual(nodes.map((n) => [n.id, n.title, n.status]), [
    ['R-POS-1', 'Stable. Items never move silently.', 'active'],
    ['R-POS-2', 'Old rule', 'retired'],
  ]);
  assert.match(nodes[0].hash ?? '', /^[0-9a-f]{12}$/);
});

test('R-ASR-7: two requirements on one line each get their own statement', () => {
  const { nodes } = extractRequirements(doc('First rule. [R-A-1] Second rule. [R-A-2]\n'), 'worktree');
  assert.deepEqual(nodes.map((n) => n.title), ['First rule.', 'Second rule.']);
});
