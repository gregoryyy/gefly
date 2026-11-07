import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCountryPhotoBackoff } from './country-photo-backoff.ts';

test('country errors share a bounded cooldown and ignore late old-generation results', () => {
  let now = 1000, next = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const backoff = createCountryPhotoBackoff({ now: () => now,
    schedule: (run, delay) => { const id = ++next; timers.set(id, { at: now + delay, run }); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: timer => { timers.delete(timer as unknown as number); } });
  const events: string[] = [], a = backoff.subscribe((id, blocked) => events.push(`scene:${id}:${blocked}`));
  const b = backoff.subscribe((id, blocked) => events.push(`map:${id}:${blocked}`));
  const old = backoff.generation('ch');
  backoff.failure('ch', old); backoff.failure('ch', old);
  assert.equal(backoff.isBlocked('ch'), false);
  backoff.failure('ch', old);
  assert.equal(backoff.isBlocked('ch'), true); assert.equal(backoff.isBlocked('at'), false);
  assert.equal(timers.size, 1); assert.deepEqual(events, ['scene:ch:true', 'map:ch:true']);
  for (let i = 0; i < 100; i++) backoff.failure('ch', old);
  assert.equal(timers.size, 1, 'old in-flight failures cannot extend cooldown');
  now += 29999; assert.equal(backoff.isBlocked('ch'), true);
  now++; const scheduled = [...timers.values()][0]; assert.equal(scheduled.at, now); scheduled.run();
  assert.equal(backoff.isBlocked('ch'), false); assert.equal(timers.size, 0);
  assert.deepEqual(events.slice(-2), ['scene:ch:false', 'map:ch:false']);
  backoff.failure('ch', old); backoff.failure('ch', old); backoff.failure('ch', old);
  assert.equal(backoff.isBlocked('ch'), false, 'late pre-cooldown errors remain ignored after retry');
  const current = backoff.generation('ch');
  backoff.failure('ch', current); now += 5001; backoff.failure('ch', current); backoff.failure('ch', current);
  assert.equal(backoff.isBlocked('ch'), false, 'failures outside the five-second window do not accumulate');
  backoff.failure('ch', current); assert.equal(backoff.isBlocked('ch'), true);
  a(); assert.equal(timers.size, 1, 'remaining renderer retains one timer');
  b(); assert.equal(timers.size, 0, 'last disposal cancels retry');
  assert.equal(backoff.isBlocked('ch'), false);
  backoff.failure('ch', current); backoff.failure('ch', current); backoff.failure('ch', current);
  assert.equal(timers.size, 0, 'late errors after disposal cannot resurrect work');
});

test('German state photo failures do not block neighboring sources', () => {
  const timers: (() => void)[] = [];
  const backoff = createCountryPhotoBackoff({ now: () => 1, schedule: fn => { timers.push(fn); return 1 as unknown as ReturnType<typeof setTimeout>; }, cancel: () => {} });
  const dispose = backoff.subscribe(() => {});
  for (let i = 0; i < 3; i++) backoff.failure('nrw');
  assert.equal(backoff.isBlocked('nrw'), true);
  assert.equal(backoff.isBlocked('bb'), false);
  assert.equal(backoff.isBlocked('ch'), false);
  assert.equal(backoff.isBlocked('at'), false);
  timers[0]();
  assert.equal(backoff.isBlocked('nrw'), false);
  dispose();
});
