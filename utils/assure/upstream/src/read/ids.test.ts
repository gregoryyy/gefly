import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanIds } from './ids.ts';

const keys = (text: string, bare = false) => scanIds(text, { bare }).map((r) => `${r.kind}:${r.id}`);

test('R-ASR-7: bare mode reads requirements, questions, assumptions and threats with ranges', () => {
  assert.deepEqual(keys('Stack (GAPS Q4); A1–A3 to check; R-PIV-2 and T13', true), [
    'requirement:R-PIV-2',
    'question:Q4',
    'assumption:A1',
    'assumption:A2',
    'assumption:A3',
    'threat:T13',
  ]);
});

test('R-ASR-7: prefixed mode needs GAPS, SEC or TODO before short IDs and continues their lists', () => {
  assert.deepEqual(keys('controls (SEC T4, T5); see GAPS Q9 and TODO 4.3.3, 4.3.4; Q2 alone is ignored'), [
    'question:Q9',
    'threat:T4',
    'threat:T5',
    'todo:4.3.3',
    'todo:4.3.4',
  ]);
});

test('R-ASR-7: IDs inside words are not read', () => {
  assert.deepEqual(keys('SQ4 A1B T4x R-PIV-2a', true), []);
});
