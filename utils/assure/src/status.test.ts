import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractStatus } from './status.ts';

const todo = { path: 'docs/TODO.md', text: '## 1. Work\n- [x] 1.1 Deliver thing (R-DEMO-1).\n' };
const gaps = { path: 'docs/GAPS.md', text: '## Resolved questions\n### Q1. Choice\nAnswer: selected.\nResolved: recorded.\n' };
const body = (text: string, tasks = '1.1') => `\nTODO: ${tasks} complete. Agent: fixture reviewer.\n\n**Implementation notes**\n\n${text}\n\n**Deviations**\n\nFixture only.\n`;
const done = (text: string) => ({ path: 'docs/DONE.md', text });

test('AS2 reproduces ef22bac-style misassigned duplicate body and chronological drift', () => {
  const wrong = 'Rebuilt the complete progress records from main history, repaired mixed and truncated entries and carried the selected stack and source values into the authoritative documents.';
  const text = `## 2026-11-01 19:06 — Repair records${body(wrong)}\n## 2026-11-01 18:49 — Plan aircraft model${body(wrong)}\n## 2026-11-01 19:00 — Extract performance${body('Independent performance extraction.')}`;
  const result = extractStatus(todo, gaps, done(text), 'worktree');
  assert(result.problems.some((p) => p.check === 'done-duplicate-body'));
  assert(result.problems.some((p) => p.check === 'done-order'));
});

test('AS2 corrected records and duplicate timestamp with different titles remain valid', () => {
  const text = `## 2026-11-01 19:06 — Repair records${body('Repair the progress records.')}\n## 2026-11-01 19:00 — Extract performance${body('Extract performance points.')}\n## 2026-11-01 19:00 — Plan model${body('Plan aircraft model independently.')}`;
  const result = extractStatus(todo, gaps, done(text), 'worktree');
  assert.deepEqual(result.problems, []);
  assert.equal(new Set(result.nodes.filter((n) => n.kind === 'done').map((n) => n.id)).size, 3);
  assert(result.facts.some((f) => f.relation === 'records' && f.object.id === '1.1'));
});

test('AS2 duplicate full heading and truncated metadata are actionable errors', () => {
  const heading = '## 2026-11-01 19:06 — Duplicate';
  const result = extractStatus(todo, gaps, done(`${heading}${body('First work.')}\n${heading}\nTODO: 1.1\n`), 'worktree');
  assert(result.problems.some((p) => p.check === 'done-duplicate-heading'));
  assert(result.problems.some((p) => p.check === 'done-metadata'));
});

test('AS2 plain Answer alone and partial open questions do not become resolved decisions', () => {
  const questions = { path: 'docs/GAPS.md', text: '## Open questions\n### Q1. Variant and avionics\nAnswer: variant selected.\nResolved (variant): only one part.\n\n## Resolved questions\n### Q2. Platform\nAnswer: web.\nResolved: whole choice.\n### Q3. Still needs recording\nAnswer: mentioned.\n' };
  const result = extractStatus(todo, questions, done(''), 'worktree');
  assert.equal(result.nodes.find((n) => n.id === 'Q1')?.status, 'open');
  assert.equal(result.nodes.find((n) => n.id === 'Q1')?.attrs?.partial, 'true');
  assert.equal(result.nodes.find((n) => n.id === 'Q2')?.status, 'resolved');
  assert.equal(result.nodes.find((n) => n.id === 'Q3')?.status, 'open');
});

test('AS2 actual TODO metadata expands ranges and slash lists without treating versions as task references', () => {
  const result = extractStatus(todo, gaps, done(`## 2026-11-01 19:06 — Tasks${body('Work.', '0.1–0.3, 0.8.1/0.8.2; parent 1.1 remains open')}`), 'worktree');
  assert.deepEqual(result.facts.filter((f) => f.relation === 'records').map((f) => f.object.id), ['0.1', '0.2', '0.3', '0.8.1', '0.8.2']);
  const version = extractStatus({ ...todo, text: '## 1. Work\n- [ ] 1.1 Draft v1.1; port 3000, schema 1.0.\n' }, gaps, done(''), 'worktree');
  assert(!version.facts.some((f) => f.object.kind === 'todo' && f.object.id === '1.0'));
});
