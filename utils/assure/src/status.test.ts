import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completionRecords, extractStatus } from './status.ts';

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

test('AS2 progress, partial and pending DONE wording is not a completion record', () => {
  for (const wording of ['1.1 in progress', '1.1 in-progress', '1.1 partially done', '1.1 partly complete', '1.1 started',
    '1.1 complete pending review', '1.1 not complete', '1.1 incomplete', '1.1 preparation', '1.1 refined', '1.1 retained', '1.1 verification portion']) {
    const text = `## 2026-11-01 19:06 — Progress\n\nTODO: ${wording}. Agent: fixture reviewer.\n\n**Implementation notes**\n\nWork.\n\n**Deviations**\n\nNone.\n`;
    const result = extractStatus(todo, gaps, done(text), 'worktree');
    assert(!result.facts.some((f) => f.relation === 'records' && f.object.id === '1.1'), wording);
    assert(result.facts.some((f) => f.relation === 'refs' && f.object.id === '1.1'), wording);
  }
});

test('AS2 explicit completion wording and bare task lists remain completion records', () => {
  for (const wording of ['1.1 complete', '1.1 completed', '1.1 done', '1.1 recorded', '1.1', '0.9 and 1.1', '1.0–1.1']) {
    const text = `## 2026-11-01 19:06 — Finish\n\nTODO: ${wording}; 1.2 in progress. Agent: fixture reviewer.\n\n**Implementation notes**\n\nWork.\n\n**Deviations**\n\nNone.\n`;
    const result = extractStatus(todo, gaps, done(text), 'worktree');
    assert(result.facts.some((f) => f.relation === 'records' && f.object.id === '1.1'), wording);
    assert(!result.facts.some((f) => f.relation === 'records' && f.object.id === '1.2'), wording);
  }
});

const complete = (metadata: string) => Object.fromEntries(completionRecords(metadata).map((r) => [r.id, r.complete]));

test('AS2 completion is classified per task ID, so excepted and open IDs are not completed', () => {
  assert.deepEqual(complete('1.1 complete apart from 1.1.3'), { '1.1': false, '1.1.3': false });
  assert.deepEqual(complete('1.1 complete except 1.1.3'), { '1.1': false, '1.1.3': false });
  assert.deepEqual(complete('1.1 complete, except 1.1.3'), { '1.1': false, '1.1.3': false });
  assert.deepEqual(complete('1.0 complete, 1.1 complete other than 1.1.2'), { '1.0': true, '1.1': false, '1.1.2': false });
  for (const wording of ['1.1 complete except tests', '1.1 complete but unverified', '1.1 complete with known limitations',
    '1.1 complete without review', '1.1 complete, but tests missing', '1.1 complete pending review'])
    assert.deepEqual(complete(wording), { '1.1': false }, wording);
  assert.deepEqual(complete('1.1 and 1.2 complete, 1.3 open'), { '1.1': true, '1.2': true, '1.3': false });
  assert.deepEqual(complete('1.1 complete and 1.2 in progress'), { '1.1': true, '1.2': false });
  assert.deepEqual(complete('1.1.3, 1.5.1 and 1.5.2 complete'), { '1.1.3': true, '1.5.1': true, '1.5.2': true });
  assert.deepEqual(complete('1.3, 1.5 and 1.7 refined'), { '1.3': false, '1.5': false, '1.7': false });
});

test('AS2 mandated peer pending and pending merge markers remain completion records', () => {
  assert.deepEqual(complete('1.20 complete (peer pending)'), { '1.20': true });
  assert.deepEqual(complete('1.20 complete, *peer pending*'), { '1.20': true });
  assert.deepEqual(complete('1.4 complete pending merge'), { '1.4': true });
  assert.deepEqual(complete('1.4 pending'), { '1.4': false });
  const text = `## 2026-11-01 19:06 — Finish\n\nTODO: 1.1 complete (peer pending). Agent: fixture reviewer.\n\n**Implementation notes**\n\nWork.\n\n**Deviations**\n\nNone.\n`;
  assert(extractStatus(todo, gaps, done(text), 'worktree').facts.some((f) => f.relation === 'records' && f.object.id === '1.1'));
});

test('AS2 bare lists accept hyphen, en dash, em dash and "to" ranges', () => {
  for (const range of ['0.1-0.3', '0.1–0.3', '0.1—0.3', '0.1 — 0.3', '0.1 to 0.3'])
    assert.deepEqual(complete(range), { '0.1': true, '0.2': true, '0.3': true }, range);
  assert.deepEqual(complete('0.1 to 0.3 in progress'), { '0.1': false, '0.2': false, '0.3': false });
});

test('AS2 not-complete wording in a later segment without task IDs qualifies earlier IDs', () => {
  for (const wording of ['1.1 complete, verification pending', '1.1 complete, pending', '1.1 complete, unreviewed',
    '1.1 complete, tests not run', '1.1 done-ish', '1.1 complete-ish'])
    assert.deepEqual(complete(wording), { '1.1': false }, wording);
  assert.deepEqual(complete('1.1 complete, peer pending'), { '1.1': true });
  assert.deepEqual(complete('1.1 complete, pending merge'), { '1.1': true });
  assert.deepEqual(complete('1.1 complete, verified'), { '1.1': true });
  assert.deepEqual(complete('1.1 complete; review pending'), { '1.1': true }, 'a separate clause does not qualify');
});
