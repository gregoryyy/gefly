import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { C172P_CG_ENVELOPE, C172P_FLIGHT_ENVELOPE_REFERENCES, C172P_GEAR_LAYOUT } from './aircraft-handbook-data.ts';
import { SPATIAL_STALL_SOURCE } from './spatial-stall.ts';
import { C172X_INSTRUMENT_SOURCES } from './c172x-instrument-references.ts';

test('F32 R-DATA-1 in-code sources record revision and unresolved rights', () => {
  const sources = [C172P_CG_ENVELOPE.source, C172P_FLIGHT_ENVELOPE_REFERENCES.source, C172P_GEAR_LAYOUT.source, SPATIAL_STALL_SOURCE,
    ...Object.values(C172X_INSTRUMENT_SOURCES)];
  for (const source of sources) {
    assert.equal(source.rights, 'unresolved (GAPS Q24)');
    assert.ok(typeof source.revision === 'string' && source.revision.length > 0);
    assert.match(source.sha256, /^[0-9a-f]{64}$/);
    assert.ok(Object.isFrozen(source));
  }
  for (const source of [C172P_GEAR_LAYOUT.source, SPATIAL_STALL_SOURCE, C172X_INSTRUMENT_SOURCES.tank_capacity]) {
    assert.equal(source.raw_url, 'https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.3.3/aircraft/c172x/c172x.xml');
    assert.ok(source.sha256.startsWith('b736f4b7'));
    assert.match(source.revision, /raw file bytes at that tag/);
  }
});
