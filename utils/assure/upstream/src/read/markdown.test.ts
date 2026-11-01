import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proseLines, slugger, stripLinks } from './markdown.ts';

test('R-ASR-7: prose lines blank code spans and fenced blocks but keep line numbers', () => {
  assert.deepEqual(proseLines('a `R-X-1` b\n```\nR-X-2\n```\nc'), ['a' + ' '.repeat(9) + 'b', '', '', '', 'c']);
});

test('R-ASR-7: links are reduced to their text', () => {
  assert.equal(stripLinks('see [SEC](SEC.md) T13 and [GAPS](../GAPS.md#q4)'), 'see SEC T13 and GAPS');
});

test('R-ASR-8: headings get GitHub anchors, repeated ones numbered', () => {
  const slug = slugger();
  assert.deepEqual([slug('Claim versus change'), slug('5. Measure precision'), slug('Claim versus change')], [
    'claim-versus-change',
    '5-measure-precision',
    'claim-versus-change-1',
  ]);
});
