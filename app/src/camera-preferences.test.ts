import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAMERA_PREFERENCES_KEY, createCameraPreferences } from './camera-preferences.ts';

test('R-VIEW-1 return animation choice survives a new controller without saving pose', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const first = createCameraPreferences(storage);
  assert.equal(first.read(), true); first.write(false);
  assert.equal(createCameraPreferences(storage).read(), false);
  assert.deepEqual(JSON.parse(values.get(CAMERA_PREFERENCES_KEY)!), { version: 1, animate_return: false });
  first.write(true); assert.equal(createCameraPreferences(storage).read(), true);
});

test('R-INPUT-1 malformed, oversized and denied camera preferences safely keep controls available', () => {
  for (const raw of ['null', '[]', '{', '{}', '{"version":2,"animate_return":false}',
    '{"version":1,"animate_return":0}', '{"version":1,"animate_return":false,"yaw":2}', ' '.repeat(129)]) {
    assert.equal(createCameraPreferences({ getItem: () => raw, setItem() {} }).read(), true);
  }
  const denied = createCameraPreferences({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.equal(denied.read(), true); assert.doesNotThrow(() => denied.write(false));
  assert.equal(createCameraPreferences(null).read(), true);
});
