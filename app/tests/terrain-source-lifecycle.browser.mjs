// R-WORLD-11 / R-SIM-2: real nested source Worker, native pacing and lifecycle.
// The source-only CPU delay demonstrates isolation; it supplies no geography,
// aircraft state, steering, terrain nodes or replacement physics implementation.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { RUNTIME_FILES } from '../runtime.ts';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5391';
// Serve instrumentation at the HTTP boundary: browser routing does not
// consistently observe nested-Worker requests in Chromium.
const physicsProbe = `
const ProbeWorker = globalThis.Worker;
let probeSourceIdentity = 0;
globalThis.Worker = class extends ProbeWorker {
 constructor(url, options) {
  super(url, options);
  if(options?.name==='gefly-terrain-source') {
   this.probeIdentity=++probeSourceIdentity;
   postMessage({type:'source-lifecycle',phase:'created',identity:this.probeIdentity});
   this.addEventListener('message',({data})=>{
    if(data.type==='source-cpu') postMessage({...data,type:'source-cpu-probe',identity:this.probeIdentity,step:stepIndex,running});
   });
  }
 }
 terminate() { if(this.probeIdentity)postMessage({type:'source-lifecycle',phase:'terminated',identity:this.probeIdentity}); return super.terminate(); }
};
`;
const sourceProbe = `
import {WorldTerrainStream as ProbeStream} from './terrain-stream.js';
const probeCompose=ProbeStream.prototype.compose;
let probeComposition=0;
ProbeStream.prototype.compose=async function(...args){
 const composition=++probeComposition;
 postMessage({type:'source-cpu',phase:'start',composition,wall_ms:performance.timeOrigin+performance.now()});
 const end=performance.now()+250;while(performance.now()<end){}
 const value=await probeCompose.apply(this,args);
 postMessage({type:'source-cpu',phase:'end',composition,wall_ms:performance.timeOrigin+performance.now()});
 return value;
};
`;
let browser, page, corruptWorld = false;
const sim = fileURLToPath(new URL('../../studies/e1-browser/sim/', import.meta.url));
const requests = [];
const server = createServer(async (request, response) => {
  const path = new URL(request.url, origin).pathname;
  requests.push(path);
  try {
    if (path === '/terrain-source-fixture.html') {
      response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Terrain source lifecycle</title>'); return;
    }
    if (path.startsWith('/scenery/elevation/copernicus/')) { response.writeHead(404).end('fixture unavailable'); return; }
    let file;
    if (path.startsWith('/studies/e1-browser/sim/')) {
      const name = path.slice('/studies/e1-browser/sim/'.length);
      if (!RUNTIME_FILES.includes(name)) { response.writeHead(404).end(); return; }
      file = resolve(sim, name);
    } else if (path.startsWith('/terrain/') && /^[a-z0-9/_.-]+$/.test(path)) file = resolve(app, 'public', '.' + path);
    else { response.writeHead(404).end(); return; }
    let bytes = await readFile(file);
    if (path.endsWith('/sim/worker.js')) bytes = Buffer.from(physicsProbe + bytes.toString());
    if (path.endsWith('/sim/terrain-source-worker.js')) bytes = Buffer.from(sourceProbe + bytes.toString());
    if (corruptWorld && path.endsWith('/terrain/world/world-v1.f32')) { bytes = Buffer.from(bytes); bytes[0] ^= 1; }
    response.setHeader('Content-Type', path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.json') ? 'application/json' : path.endsWith('.js') || path.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store'); response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
const result = { checks: [], errors: [] };
try {
  await mkdir(output, { recursive: true });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5391, '127.0.0.1', resolve); });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  page = await browser.newPage({ serviceWorkers: 'block' });
  page.on('pageerror', error => result.errors.push(String(error)));
  await page.goto(`${origin}/terrain-source-fixture.html`);
  await page.evaluate(() => {
    window.messages = [];
    window.worker = new Worker('/studies/e1-browser/sim/worker.js', { type: 'module' });
    worker.addEventListener('message', ({ data }) => messages.push(data.type === 'terrain-tile'
      ? { type: data.type, id: data.grid.id, sha256: data.grid.sha256 } : data));
    worker.addEventListener('error', event => messages.push({ type: 'error', message: event.message }));
    window.init = { type: 'init', aircraft: 'c172x', terrain: true, streaming_terrain: true, kap140: true,
      dt_s: 1 / 120, state_hz: 40, ic: { lat_rad: 49.96 * Math.PI / 180, lon_rad: 8.615 * Math.PI / 180,
        alt_msl_m: 1200, heading_rad: Math.PI / 2, tas_mps: 45 } };
    worker.postMessage(init);
  });
  const wait = predicate => page.waitForFunction(predicate, null, { timeout: 60000 });
  await wait(() => messages.some(m => m.type === 'ready') || messages.some(m => m.type === 'error'));
  assert.deepEqual(await page.evaluate(() => messages.filter(m => m.type === 'error')), []);
  assert.equal(await page.evaluate(() => messages.filter(m => m.type === 'terrain-tile').length), 9);
  result.checks.push('Actual production physics Worker starts its nested terrain source Worker and installs exactly nine source-identified native tiles');
  await page.evaluate(() => { worker.postMessage({ type: 'autopilot-capture' }); worker.postMessage({ type: 'run' }); });
  await wait(() => messages.some(m => m.type === 'source-cpu-probe' && m.phase === 'end' && m.running && m.composition > 9));
  const overlap = await page.evaluate(() => {
    const end = messages.find(m => m.type === 'source-cpu-probe' && m.phase === 'end' && m.running && m.composition > 9);
    const start = messages.find(m => m.type === 'source-cpu-probe' && m.phase === 'start' && m.identity === end.identity && m.composition === end.composition);
    return { start, end };
  });
  assert(overlap.end.step > overlap.start.step, JSON.stringify(overlap));
  result.cpuOverlap = overlap;
  result.checks.push('Native fixed steps continue while the separate nested source Worker executes a synchronous250ms composition probe during predictive loading');
  const stats = async () => {
    const count = await page.evaluate(() => messages.filter(m => m.type === 'stats').length);
    await page.evaluate(() => worker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => messages.filter(m => m.type === 'stats').length > count, count);
    return page.evaluate(() => { const m = messages.filter(m => m.type === 'stats').at(-1); return { step: m.step, digest: m.digest, final_state: m.final_state }; });
  };
  await page.evaluate(() => worker.postMessage({ type: 'pause' }));
  const paused = await stats();
  await page.waitForTimeout(1200);
  assert.deepEqual(await stats(), paused);
  result.paused = paused;
  result.checks.push('Manual pause cancels optional warming and preserves native step, pose and digest after delayed source completion; no automatic resume');
  await page.evaluate(() => worker.postMessage({ ...init, ic: { ...init.ic, heading_rad: 0 } }));
  await wait(() => messages.filter(m => m.type === 'ready').length === 2 || messages.some(m => m.type === 'error'));
  assert.deepEqual(await page.evaluate(() => messages.filter(m => m.type === 'error')), []);
  const lifecycle = await page.evaluate(() => messages.filter(m => m.type === 'source-lifecycle'));
  assert.deepEqual(lifecycle.map(({ phase, identity }) => ({ phase, identity })), [
    { phase: 'created', identity: 1 }, { phase: 'terminated', identity: 1 }, { phase: 'created', identity: 2 },
  ]);
  assert.equal((await stats()).step, 0);
  result.lifecycle = lifecycle;
  result.checks.push('A serialized new-flight init terminates the previous source Worker, creates a fresh source/cache epoch and initializes native step zero without stale source errors');
  corruptWorld = true;
  await page.evaluate(() => worker.postMessage(init));
  await wait(() => messages.some(m => m.type === 'error'));
  const failure = await page.evaluate(() => messages.filter(m => m.type === 'error').at(-1));
  assert.match(failure.message, /integrity check failed/);
  assert.equal(await page.evaluate(() => messages.filter(m => m.type === 'ready').length), 2);
  result.sourceFailure = failure;
  result.checks.push('Corrupt required world source visibly fails the actual Worker initialization; no inline fallback or ready flight is published');
  assert.deepEqual(result.errors, []); result.result = 'pass';
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  result.result = 'fail'; result.failure = String(error); result.requests = requests;
  result.messages = await page?.evaluate(() => ({
    errors: messages.filter(m => m.type === 'error'), lifecycle: messages.filter(m => m.type === 'source-lifecycle'),
    cpu: messages.filter(m => m.type === 'source-cpu-probe').slice(-25),
    states: messages.filter(m => m.type === 'state').filter((_, i) => i % 100 === 0).map(({ step, lat_rad, lon_rad, tas_mps }) => ({ step, lat_rad, lon_rad, tas_mps })),
  })).catch(() => null);
  throw error;
}
finally {
  await writeFile(`${output}/terrain-source-lifecycle-browser.json`, JSON.stringify(result, null, 2) + '\n');
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
