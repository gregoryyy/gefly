import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { checkNavdata, workerNavdata } from './navdata-identity.ts';

const a = 'a'.repeat(64), b = 'b'.repeat(64);
const ui = (sha256: string | null, error: string | null = null) => ({ settled: true, sha256, error });

test('F55 R-NAV-4 matching UI and worker hashes pass', () => {
  assert.deepEqual(checkNavdata(ui(a), workerNavdata({ navdata_sha256: a, navdata_error: null })), { status: 'match', sha256: a });
});

test('F55 mismatch, UI failure and worker error are visible errors', () => {
  assert.equal(checkNavdata(ui(a), workerNavdata({ navdata_sha256: b, navdata_error: null })).status, 'error');
  const uiFailure = checkNavdata(ui(null, 'Navigation manifest unavailable'), { settled: false, sha256: null, error: null });
  assert.equal(uiFailure.status, 'error', 'a UI failure is reported before the worker answers');
  assert.match((uiFailure as { message: string }).message, /manifest unavailable/);
  const worker = checkNavdata(ui(a), workerNavdata({ navdata_sha256: null, navdata_error: 'Navigation package hash mismatch' }));
  assert.match((worker as { message: string }).message, /flight engine: Navigation package hash mismatch/);
  assert.equal(checkNavdata(ui(a), workerNavdata({ navdata_sha256: null, navdata_error: null })).status, 'error', 'worker without data');
});

test('F55 malformed or missing worker reports never pass', () => {
  assert.equal(checkNavdata(ui(a), workerNavdata(undefined)).status, 'error');
  assert.equal(checkNavdata(ui(a), workerNavdata({})).status, 'error');
  assert.equal(checkNavdata(ui(a), workerNavdata({ navdata_sha256: a.toUpperCase(), navdata_error: null })).status, 'error');
  assert.equal(checkNavdata(ui(a), workerNavdata({ navdata_sha256: a, navdata_error: 42 })).status, 'error');
});

test('pending until both sides settle', () => {
  assert.deepEqual(checkNavdata({ settled: false, sha256: null, error: null }, workerNavdata({ navdata_sha256: a, navdata_error: null })), { status: 'pending' });
  assert.deepEqual(checkNavdata(ui(a), { settled: false, sha256: null, error: null }), { status: 'pending' });
});
