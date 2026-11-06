// Real app/Cesium/flight Worker, server compiler Worker, browser airport data
// Worker and persistent cache. Only upstream OSM and scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { installSceneryFixture, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5384', cache = output + 'airport-generator-browser-cache';
const sourceLog = output + 'airport-generator-source.jsonl';
const hash = value => createHash('sha256').update(value).digest('hex');
const paths = ['app/src/airport-region.ts', 'app/src/airport-region-read.ts', 'app/src/airport-region-loader.ts',
  'app/src/airport-region-worker.ts', 'app/src/airport-region.worker.ts', 'app/src/airport-surface-geometry.ts',
  'app/src/streamed-airport-scenery.ts', 'app/src/airport-scenery.ts', 'app/src/scene.ts', 'app/airport-region-server.ts'];
const hashes = async () => Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(new URL('../../' + path, import.meta.url)))])));
const result = { scope: 'Actual app/native/Cesium/server and browser airport Workers; synthetic OSM geometry and scenery pixels, not real-source accuracy',
  checks: [], errors: [], responses: [], workers: [], before: await hashes() };
let server, browser, page, log = '';
const program = `
import {createServer} from 'vite';
import {appendFile,mkdir} from 'node:fs/promises';
import {createAirportRegionMiddleware} from './airport-region-server.ts';
const cache=${JSON.stringify(cache)},sourceLog=${JSON.stringify(sourceLog)};
const endpoint='https://overpass.private.coffee/api/interpreter';
const fetcher=async(url,init)=>{
 if(String(url)!==endpoint)throw Error('Fixture forbids other source hosts');
 const query=new URLSearchParams(String(init.body)).get('data')??'';
 const matches=[...query.matchAll(/\\(([-.\\d]+),([-.\\d]+),([-.\\d]+),([-.\\d]+)\\)/g)];
 const box=matches.at(-1)?.slice(1).map(Number);if(!box)throw Error('Missing fixed query bounds');
 const [south,west,north,east]=box,x=Math.round((west+180)*2),y=Math.round((south+90)*2);
 await appendFile(sourceLog,JSON.stringify({x,y,url:String(url)})+'\\n');
 const lon=(west+east)/2,lat=(south+north)/2,id=(x*360+y+1)*10;
 const way=(n,kind,geometry)=>({type:'way',id:n,version:1,timestamp:'2026-11-05T10:00:00Z',user:'fixture-mapper',uid:999,changeset:99,
 tags:{aeroway:kind,surface:'asphalt',width:kind==='runway'?'30':'12',ref:kind==='runway'?'09/27':''},geometry:geometry.map(([lon,lat])=>({lon,lat}))});
 const elements=[way(id,'runway',[[lon-.012,lat],[lon+.012,lat]]),way(id+1,'taxiway',[[lon-.004,lat+.001],[lon+.004,lat+.001]]),
 way(id+2,'apron',[[lon-.001,lat+.001],[lon+.001,lat+.001],[lon+.001,lat+.002],[lon-.001,lat+.002],[lon-.001,lat+.001]])];
 if((x===115||x===116)&&y===255)elements.push(way(9000000,'taxiway',[[-122.001,37.75],[-121.999,37.75]]));
 return new Response(JSON.stringify({osm3s:{timestamp_osm_base:'2026-11-05T10:00:00Z'},elements}),{headers:{'content-type':'application/json'}});
};
await mkdir(cache,{recursive:true});
const airports=createAirportRegionMiddleware({fetcher,cacheDir:cache,minIntervalMs:0});
const fixture={name:'airport-fixture-source',enforce:'pre',configureServer(server){server.middlewares.use(airports);server.httpServer?.once('close',()=>airports.dispose());}};
const vite=await createServer({plugins:[fixture],cacheDir:'../output/flight/airport-generator-vite',server:{host:'127.0.0.1',port:5384,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});
await vite.listen();vite.printUrls();
`;
async function start() {
  log = ''; server = spawn(process.execPath, ['--input-type=module', '-e', program], { cwd: app, stdio: 'pipe' });
  server.stdout.on('data', value => log += value); server.stderr.on('data', value => log += value);
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw Error(log);
    if (log.includes('Local:')) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error(log);
}
async function stop() { if (server && server.exitCode === null) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited; } }
const calls = async () => (await readFile(sourceLog, 'utf8').catch(() => '')).split('\n').filter(Boolean).map(line => JSON.parse(line));
try {
  await mkdir(output, { recursive: true }); await rm(cache, { recursive: true, force: true }); await rm(sourceLog, { force: true });
  await writeFile(output + 'airport-generator-server-fixture.mjs', program); await start();
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  page = await context.newPage(); page.on('pageerror', error => result.errors.push(String(error)));
  page.on('response', response => { if (response.url().includes('/scenery/airports/')) result.responses.push({ url: response.url(), status: response.status(), cache: response.headers()['x-airport-cache'] }); });
  await page.addInitScript(() => {
    localStorage.setItem('gefly.flight-location.v1', JSON.stringify({ version: 1, lat_rad: 37.75 * Math.PI / 180,
      lon_rad: -122.25 * Math.PI / 180, alt_msl_m: 1200, heading_rad: Math.PI / 2, mode: 'airborne' }));
    window.airportWorkers = []; window.airportTerminated = []; window.airportNativeCommands = []; window.airportNativeStates = []; window.airportNativeStats = [];
    window.airportMainReads = 0; window.airportDataReadMessages = 0;
    const Native = Worker;
    window.Worker = class extends Native {
      constructor(url, options) {
        super(url, options); this.airportUrl = String(url); window.airportWorkers.push({ url: String(url), name: options?.name });
        if (String(url).includes('/sim/worker.js')) {
          window.airportNativeWorker = this;
          this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.airportNativeStates.push(data); if (data.type === 'stats') window.airportNativeStats.push(data); });
        } else if (options?.name === 'gefly-airport-data') this.addEventListener('message', ({ data }) => { if (data.type === 'airport-read-observer') window.airportDataReadMessages++; });
      }
      postMessage(message, ...args) {
        if (this === window.airportNativeWorker && ['input', 'run', 'kap140', 'autopilot', 'autopilot-capture', 'navigation'].includes(message?.type)) window.airportNativeCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
      terminate() { window.airportTerminated.push(this.airportUrl); return super.terminate(); }
    };
  });
  await installSceneryFixture(page);
  // Let the actual airport middleware/compiler/cache handle these requests.
  await page.route('**/scenery/airports/**', route => route.continue());
  await page.route('**/src/airport-scenery.ts*', async route => {
    const response = await route.fetch(), source = await response.text(), marker = 'const streamed = createStreamedAirportScenery(scene, sampleHeight);';
    assert.equal(source.split(marker).length, 2);
    await route.fulfill({ response, body: source.replace(marker, marker + ' window.airportObserved = { streamed, scene, sampleHeight };') });
  });
  await page.route('**/src/streamed-airport-scenery.ts*', async route => {
    const response = await route.fetch(), source = await response.text(), marker = 'const clear = () => {';
    assert.equal(source.split(marker).length, 2);
    await route.fulfill({ response, body: source.replace(marker, 'window.airportRenderProbe = { ids: () => [...plan.values()].flatMap(fs => fs.map(f => f.id)) }; ' + marker) });
  });
  await page.route('**/src/airport-region-read.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    const marker = /async function loadAirportRegion\([^)]*\)\s*\{/;
    assert.equal([...source.matchAll(new RegExp(marker.source, 'g'))].length, 1);
    await route.fulfill({ response, body: source.replace(marker, text => text + ' if(typeof document!=="undefined")window.airportMainReads++;else self.postMessage({type:"airport-read-observer"});') });
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.airportNativeStates.length && !document.querySelector('#start').disabled
    && window.airportObserved?.streamed.stats.readyMeshes > 0 && window.airportObserved.streamed.stats.pending === 0, null, { timeout: 90000 });
  const initial = await page.evaluate(() => ({ stats: window.airportObserved.streamed.stats,
    state: window.airportNativeStates.at(-1), ids: window.airportRenderProbe.ids(), workers: window.airportWorkers,
    mainReads: window.airportMainReads, workerReads: window.airportDataReadMessages }));
  result.initial = initial;
  assert.equal(initial.mainReads, 0); assert(initial.workerReads >= 9);
  assert.equal(initial.workers.filter(w => w.name === 'gefly-airport-data').length, 1);
  assert(initial.stats.genericPapi >= 8 && initial.stats.genericPapi <= 288);
  assert(initial.stats.instances > 0 && initial.stats.instances <= 14000); assert(initial.stats.resident <= 6);
  assert.equal(new Set(initial.ids).size, initial.ids.length); assert(initial.ids.includes('osm/way/9000000'));
  assert.equal(initial.state.step, 0); assert.equal(initial.state.t_s, 0);
  assert(initial.stats.deferred >= 0); assert.equal(initial.stats.truncated, 0); // Other nearby cells may await actual receiver coverage.
  const firstCalls = await calls(); assert.equal(firstCalls.length, 9);
  result.checks.push('California source surfaces compile off-thread, load in one dedicated browser worker and reach ready Cesium meshes with bounded/deduplicated geometry while native flight remains paused');

  const nativeStats = async () => {
    const count = await page.evaluate(() => window.airportNativeStats.length);
    await page.evaluate(() => window.airportNativeWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.airportNativeStats.length > count, count);
    return page.evaluate(() => window.airportNativeStats.at(-1));
  };
  const before = await nativeStats(), commandsBefore = await page.evaluate(() => window.airportNativeCommands);
  const transport = await page.evaluate(async () => {
    const { createAirportRegionLoader } = await import('/src/airport-region-loader.ts');
    const loader = createAirportRegionLoader();
    const settle = async () => { for (let i = 0; i < 500 && (loader.stats.pending || loader.stats.queued); i++) await new Promise(r => setTimeout(r, 10)); if (loader.stats.pending || loader.stats.queued) throw Error('Loader timeout'); };
    loader.update(-122.1, 37.75, true); await settle();
    loader.update(.1, 51.75, true); await settle(); const far = loader.stats;
    const beforeBack = performance.getEntriesByType('resource').filter(r => r.name.includes('/scenery/airports/')).length;
    loader.update(-122.1, 37.75, true); await settle();
    const afterBack = performance.getEntriesByType('resource').filter(r => r.name.includes('/scenery/airports/')).length;
    const cached = loader.stats; loader.update(10, 10, false); const disabled = loader.stats;
    loader.dispose(); return { far, cached, disabled, beforeBack, afterBack };
  });
  result.transport = transport; assert.equal(transport.beforeBack, transport.afterBack);
  assert.equal(transport.cached.cached, 18); assert.equal(transport.disabled.status, 'disabled'); assert.equal(transport.disabled.pending, 0);
  const after = await nativeStats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  assert.deepEqual(await page.evaluate(() => window.airportNativeCommands), commandsBefore);
  result.checks.push('Distant-region traversal and cached backtracking use real browser transport without native commands, time or digest changes; disabling/disposal cancels work and terminates its worker');

  await startOrResume(page); await page.waitForFunction(() => window.airportNativeStates.at(-1).step > 60);
  await page.locator('#scene').focus(); await page.keyboard.press('Space'); await page.waitForTimeout(100);
  await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.waitForFunction(() => window.airportObserved.streamed.stats.status === 'disabled');
  const reviewCalls = (await calls()).length; await page.waitForTimeout(300); assert.equal((await calls()).length, reviewCalls);
  result.checks.push('Actual Review disables airport generation and issues no regional source requests');

  const sourceCount = (await calls()).length; assert.equal(sourceCount, 18);
  await stop(); await start(); result.responses.length = 0;
  await page.reload(); await page.waitForFunction(() => window.airportObserved?.streamed.stats.readyMeshes > 0
    && window.airportObserved.streamed.stats.pending === 0 && window.airportNativeStates.length, null, { timeout: 90000 });
  assert.equal((await calls()).length, sourceCount);
  assert(result.responses.length >= 9); assert(result.responses.every(response => response.status === 200 && response.cache === 'disk'));
  result.checks.push('Fresh server process plus page reload reuses validated persistent disk packages with zero further upstream source calls');
  result.workers = await page.evaluate(() => window.airportWorkers); result.after = await hashes();
  assert.deepEqual(result.after, result.before); assert.deepEqual(result.errors, []); result.result = 'pass';
  console.log(JSON.stringify({ result: result.result, checks: result.checks }, null, 2));
} catch (error) { result.result = 'fail'; result.failure = String(error); result.serverLog = log; throw error; }
finally {
  if(page) result.finalState=await page.evaluate(()=>({state:window.airportNativeStates?.at(-1),stats:window.airportObserved?.streamed.stats,workers:window.airportWorkers,gate:document.querySelector('#gate-copy')?.textContent})).catch(()=>null);
  if (page) await page.screenshot({ path: output + 'airport-generator-browser.png' }).catch(() => {});
  await writeFile(output + 'airport-generator-browser.json', JSON.stringify(result, null, 2) + '\n');
  await browser?.close(); await stop();
}
