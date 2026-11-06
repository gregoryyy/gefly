import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadOfmOverlaySource, OFM_OVERLAY_METADATA, OFM_OVERLAY_METADATA_URL, validateOfmOverlaySource } from './ofm-overlay-source.ts';

test('R-CHART-1 source metadata retains the verified edition, validity and safe source/report actions', () => {
  const source = validateOfmOverlaySource(structuredClone(OFM_OVERLAY_METADATA));
  assert.equal(source.edition, 'AIRAC 2611');
  assert.equal(source.validFrom, '2026-10-29T00:00:00Z'); assert.equal(source.validTo, '2026-11-26T00:00:00Z');
  assert.equal(source.minzoom, 7); assert.equal(source.maxzoom, 13); assert.equal(source.tileSize, 256);
  assert.equal(source.reportUrl, 'mailto:info@openflightmaps.org');
  source.tiles[0] = '/changed';
  assert.equal(validateOfmOverlaySource(OFM_OVERLAY_METADATA).tiles[0], '/charts/ofm/2611/{z}/{x}/{y}.png');
});

test('R-CHART-1 metadata cannot inject a provider, cycle alias, links, limits or unexpected fields', () => {
  for (const changed of [null, [], { ...OFM_OVERLAY_METADATA, tiles: ['https://example.com/{z}/{x}/{y}'] },
    { ...OFM_OVERLAY_METADATA, tiles: ['/charts/ofm/latest/{z}/{x}/{y}.png'] },
    { ...OFM_OVERLAY_METADATA, reportUrl: 'javascript:alert(1)' }, { ...OFM_OVERLAY_METADATA, sourceUrl: 'https://example.com' },
    { ...OFM_OVERLAY_METADATA, edition: 'current' }, { ...OFM_OVERLAY_METADATA, maxzoom: 22 },
    { ...OFM_OVERLAY_METADATA, extra: true }, { ...OFM_OVERLAY_METADATA, schema: 2 }]) {
    assert.throws(() => validateOfmOverlaySource(changed));
  }
});

test('R-CHART-1 metadata fetch is bounded, credential-free, abortable and retryable after failure', async () => {
  const original = globalThis.fetch; let fail = true, requests = 0;
  globalThis.fetch = async (url, init) => {
    requests++; assert.equal(url, OFM_OVERLAY_METADATA_URL); assert.equal(init?.redirect, 'error');
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.cache, 'no-store'); assert(init?.signal);
    if (fail) return new Response('unavailable', { status: 503 });
    return Response.json(OFM_OVERLAY_METADATA);
  };
  try {
    await assert.rejects(loadOfmOverlaySource(), /unavailable/); fail = false;
    assert.equal((await loadOfmOverlaySource()).edition, 'AIRAC 2611'); assert.equal(requests, 2);
    globalThis.fetch = async () => new Response(' '.repeat(16385));
    await assert.rejects(loadOfmOverlaySource(), /byte limit/);
    globalThis.fetch = async () => new Response('{}', { headers: { 'content-length': '16385' } });
    await assert.rejects(loadOfmOverlaySource(), /unavailable/);
    const cancelled = new AbortController(); cancelled.abort();
    globalThis.fetch = async (_url, init) => { assert(init?.signal?.aborted); throw init.signal.reason; };
    await assert.rejects(loadOfmOverlaySource(cancelled.signal));
  } finally { globalThis.fetch = original; }
});
