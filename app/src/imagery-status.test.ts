import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { imageryStatusText, REGIONAL_UNAVAILABLE_TEXT, type ImageryObservations } from './imagery-status.ts';

const loaded: ImageryObservations = { settled: true, slow: false, detailLoaded: true, overviewLoaded: true, airportLoaded: true,
  insideDetail: false, insideOverview: true, insideAirport: false, regional: 'ready', regionalLevel: 15, regionalFailedTiles: 0, tilesLoaded: true };

test('F57 R-WORLD-4 whole regional-pyramid failure is announced at every position', () => {
  for (const position of [
    { insideOverview: true, insideDetail: false, insideAirport: false },
    { insideOverview: true, insideDetail: true, insideAirport: true },
    { insideOverview: false, insideDetail: false, insideAirport: false },
  ]) {
    const status = imageryStatusText({ ...loaded, ...position, regional: 'failed', regionalLevel: null });
    assert.ok(status.text.startsWith(REGIONAL_UNAVAILABLE_TEXT), JSON.stringify(position));
    assert.notEqual(status.outcome, 'ready');
  }
  const outside = imageryStatusText({ ...loaded, regional: 'failed', regionalLevel: null, insideOverview: false });
  assert.equal(outside.outcome, 'outside-coverage');
  assert.match(outside.text, /No photographic ground coverage/);
});

test('regional loading and ready states keep the earlier starter messages', () => {
  assert.deepEqual(imageryStatusText({ ...loaded, settled: false }), { outcome: 'loading', text: 'Loading the local Egelsbach aerial photograph…' });
  assert.equal(imageryStatusText({ ...loaded, settled: false, slow: true }).text, 'Aerial imagery is taking longer to load. Controls remain available.');
  assert.deepEqual(imageryStatusText(loaded), { outcome: 'ready', text: '' });
  assert.deepEqual(imageryStatusText({ ...loaded, tilesLoaded: false }), { outcome: 'ready', text: 'Loading regional detail for this view…' });
  assert.equal(imageryStatusText({ ...loaded, regionalFailedTiles: 2 }).outcome, 'degraded');
  assert.deepEqual(imageryStatusText({ ...loaded, regional: 'loading', regionalLevel: null }), { outcome: 'ready', text: 'Regional overview · outside detailed starter area' });
  assert.equal(imageryStatusText({ ...loaded, regional: 'loading', regionalLevel: null, detailLoaded: false, overviewLoaded: false, airportLoaded: false }).outcome, 'error');
});
