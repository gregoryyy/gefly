// R-WORLD-9/11: actual browser production Worker + unchanged native WASM.
// Instrumentation observes staging; it does not supply positions or terrain.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5341';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/predictive-vite-cache',server:{host:'127.0.0.1',port:5341,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', data => { log += data; });
server.stderr.on('data', data => { log += data; });
const observations = { errors: [], probes: [] };
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  page.on('pageerror', error => observations.errors.push(String(error)));
  await page.route(`${origin}/predictive-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Predictive terrain worker check</title>' }));
  await page.route('**/studies/e1-browser/sim/worker.js', async route => {
    const response = await route.fetch();
    const probe = `
import {WorldTerrainStream as ProbeStream} from './terrain-stream.js';
let probeFetches=0;
const probeFetch=globalThis.fetch;
globalThis.fetch=(...args)=>{if(String(args[0]).startsWith('/terrain/'))probeFetches++;return probeFetch(...args);};
const probePrefetch=ProbeStream.prototype.prefetch,probeMove=ProbeStream.prototype.move;
const probeSeen=new WeakSet();
ProbeStream.prototype.prefetch=function(...args){
 const promise=probePrefetch.apply(this,args),task=this.prefetchTask;
 if(task&&!probeSeen.has(task)){
  probeSeen.add(task);const started=performance.now();
  postMessage({type:'predictive-probe',action:'started',key:task.key,resident:this.tiles.size});
  promise.then(ready=>postMessage({type:'predictive-probe',action:'prepared',key:task.key,ready,elapsed_ms:performance.now()-started,resident:this.tiles.size}));
 }
 return promise;
};
ProbeStream.prototype.move=async function(...args){
 const prepared=this.prepared,task=this.prefetchTask,key=this.center(...args)?.join(','),fetches=probeFetches,started=performance.now();
 await probeMove.apply(this,args);
 postMessage({type:'predictive-probe',action:'move',key,prepared:prepared?.key===key,inflight:task?.key===key,new_fetches:probeFetches-fetches,elapsed_ms:performance.now()-started,resident:this.tiles.size});
};
`;
    await route.fulfill({ response, body: probe + await response.text() });
  });
  await page.goto(`${origin}/predictive-fixture.html`);
  await page.evaluate(async () => {
    const { DEFAULT_LOADING } = await import('/studies/e1-browser/sim/loading.js');
    window.messages = [];
    window.worker = new Worker('/studies/e1-browser/sim/worker.js', { type: 'module' });
    worker.addEventListener('message', ({ data }) => {
      messages.push(data.type === 'terrain-tile' ? { type: data.type, id: data.grid.id, slot: data.grid.slot } : data);
    });
    worker.addEventListener('error', event => messages.push({ type: 'error', message: event.message }));
    worker.postMessage({ type: 'init', aircraft: 'c172x', kap140: true, terrain: true, streaming_terrain: true, ground_collision: false,
      loading: { ...DEFAULT_LOADING, external_kg: 0 },
      dt_s: 1 / 120, state_hz: 20, ic: { lat_rad: 40.7 * Math.PI / 180, lon_rad: -74.03 * Math.PI / 180,
        alt_msl_m: 3000, heading_rad: Math.PI / 2, tas_mps: 45 } });
  });
  await page.waitForFunction(() => messages.some(message => message.type === 'ready') || messages.some(message => message.type === 'error'), null, { timeout: 60000 });
  let errors = await page.evaluate(() => messages.filter(message => message.type === 'error'));
  assert.deepEqual(errors, []);
  await page.evaluate(() => {
    worker.postMessage({ type: 'autopilot-capture' });
  });
  await page.waitForFunction(() => messages.some(message => message.type === 'state' && message.kap_engaged === 1)
    || messages.some(message => message.type === 'autopilot-rejected'));
  assert.deepEqual(await page.evaluate(() => messages.filter(message => message.type === 'autopilot-rejected')), []);
  await page.evaluate(() => {
    worker.postMessage({ type: 'simulation-rate', rate: 10 });
    worker.postMessage({ type: 'run', until_step: 12000 });
  });
  await page.waitForFunction(() => messages.some(message => message.type === 'stats' && message.step === 12000) || messages.some(message => message.type === 'error'), null, { timeout: 60000 });
  const messages = await page.evaluate(() => window.messages);
  errors = messages.filter(message => message.type === 'error');
  assert.deepEqual(errors, []);
  observations.probes = messages.filter(message => message.type === 'predictive-probe');
  observations.final = messages.filter(message => message.type === 'stats').at(-1);
  observations.states = messages.filter(message => message.type === 'state').filter((_, index) => index % 20 === 0)
    .map(({ step, t_s, lat_rad, lon_rad, tas_mps, heading_rad, simulation_rate }) => ({ step, t_s, lat_rad, lon_rad, tas_mps, heading_rad, simulation_rate }));
  await writeFile(`${output}/predictive-terrain-browser-attempt.json`, JSON.stringify(observations, null, 2) + '\n');
  const prepared = observations.probes.filter(probe => probe.action === 'prepared' && probe.ready);
  const hits = observations.probes.filter(probe => probe.action === 'move' && probe.prepared);
  assert(prepared.length > 0, 'production paced worker prepares ahead of the actual aircraft');
  assert(hits.length > 0, 'a real terrain-window crossing adopts a completed speculative window');
  assert(hits.every(hit => hit.new_fetches === 0 && hit.resident <= 9), 'prepared handoff needs no new terrain fetch and stays within native residency');
  let resident = new Set(), maximum = 0;
  for (const message of messages) {
    if (message.type === 'terrain-tile') resident.add(message.id);
    if (message.type === 'terrain-remove') resident.delete(message.id);
    maximum = Math.max(maximum, resident.size);
  }
  assert(maximum <= 9);
  observations.max_resident = maximum;
  assert.equal(observations.final.step, 12000);
  assert.equal(observations.final.simulation_rate, 10);
  const offset = messages.length;
  await page.evaluate(() => worker.postMessage({ type: 'stats' }));
  await page.waitForFunction(offset => messages.slice(offset).some(message => message.type === 'stats'), offset);
  const paused = await page.evaluate(offset => messages.slice(offset), offset);
  const after = paused.find(message => message.type === 'stats');
  assert.equal(after.digest, observations.final.digest);
  assert.deepEqual(after.final_state, observations.final.final_state);
  assert.equal(after.step, observations.final.step);
  assert(!paused.some(message => message.type === 'predictive-probe' && message.action === 'started'), 'paused stats do not start speculative work');
  assert.deepEqual(observations.errors, []);
  observations.wasm_sha256 = createHash('sha256').update(await readFile(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))).digest('hex');
  observations.limits = ['Actual production worker and native flight; prototype wrappers observe staging only.',
    'One New York flight at 10×; no worldwide latency, GPU mesh, device or aircraft-fidelity acceptance.',
    'Native WASM is unchanged; recorded build provenance remains independently unverified.'];
  await writeFile(`${output}/predictive-terrain-browser.json`, JSON.stringify(observations, null, 2) + '\n');
  console.log(`Predictive terrain browser: ${prepared.length} prepared windows, ${hits.length} completed handoffs, max ${maximum} resident; fixed 12000 steps and paused state unchanged.`);
  await page.evaluate(() => worker.terminate());
} finally {
  await browser?.close();
  server.kill();
}
