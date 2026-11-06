// Task150 actual full application, Vite runtime route, browser Worker and local
// unchanged WASM. Only launch storage and passive Worker observation are added;
// source modules, APIs, terrain responses and aircraft telemetry are unmodified.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5365', hash = bytes => createHash('sha256').update(bytes).digest('hex');
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/copernicus-native-vite-cache',server:{host:'127.0.0.1',port:5365,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverLog = '', browser, page, expired = false;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const report = { observed_utc: new Date().toISOString(), errors: [], request_failures: [], source_responses: [], runtime_responses: [], inputs: {} };
const bodyReads = [];
const timeout = setTimeout(() => { expired = true; void browser?.close(); server.kill(); }, 90000);
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverLog.includes('Local:'); i++) {
    assert.equal(server.exitCode, null, serverLog); await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  report.browser = browser.version();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('requestfailed', request => report.request_failures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/scenery/elevation/')) report.source_responses.push({ path, status: response.status() });
    if (path.endsWith('/copernicus-terrain.js') || path.endsWith('/jsbsim.wasm')) {
      const observed = { path, status: response.status() }; report.runtime_responses.push(observed);
      bodyReads.push(response.body().then(bytes => { observed.bytes = bytes.length; observed.sha256 = hash(bytes); }));
    }
  });
  await page.addInitScript(() => {
    localStorage.setItem('gefly.flight-location.v1', JSON.stringify({ version: 1, mode: 'airborne',
      lat_rad: -33.9715 * Math.PI / 180, lon_rad: 18.6021 * Math.PI / 180, alt_msl_m: 1200, heading_rad: Math.PI / 2 }));
    window.copernicusObservation = { messages: [], commands: [], tiles: new Map(), maximum: 0, workers: [] };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        this.__observeCopernicusFlight = true;
        window.copernicusObservation.workers.push(this);
        this.addEventListener('message', ({ data }) => {
          const observed = window.copernicusObservation;
          if (data.type === 'terrain-tile') {
            const g = data.grid;
            const tile = { id: g.id, slot: g.slot, width: g.width, height: g.height, source: g.source,
              source_detail: g.source_detail, copernicus_nodes: g.copernicus_nodes, coarse_nodes: g.coarse_nodes,
              west_rad: g.west_rad, south_rad: g.south_rad, east_rad: g.east_rad, north_rad: g.north_rad };
            observed.tiles.set(g.id, tile); observed.maximum = Math.max(observed.maximum, observed.tiles.size);
            observed.messages.push({ type: data.type, tile });
          } else {
            if (data.type === 'terrain-remove') observed.tiles.delete(data.id);
            if (['state', 'ready', 'stats', 'error', 'terrain-loading', 'terrain-remove'].includes(data.type)) observed.messages.push(data);
          }
        });
        this.addEventListener('error', event => window.copernicusObservation.messages.push({ type: 'error', message: event.message }));
      }
      postMessage(message, ...args) {
        if (this.__observeCopernicusFlight && ['init', 'run', 'stop', 'stats'].includes(message?.type)) window.copernicusObservation.commands.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const o = window.copernicusObservation;
    return o.messages.some(message => message.type === 'error')
      || !document.querySelector('#start')?.disabled && o.messages.some(message => message.type === 'state');
  }, null, { timeout: 60000 });
  report.initial = await page.evaluate(() => ({ messages: window.copernicusObservation.messages,
    commands: window.copernicusObservation.commands, tiles: [...window.copernicusObservation.tiles.values()],
    maximum: window.copernicusObservation.maximum, worker_count: window.copernicusObservation.workers.length,
    status: document.querySelector('#status')?.textContent, notice: document.querySelector('#notice')?.textContent }));
  assert.deepEqual(report.initial.messages.filter(message => message.type === 'error'), []);
  assert.equal(report.initial.worker_count, 1); assert.equal(report.initial.status, 'Paused');
  assert.equal(report.initial.commands.filter(command => command.type === 'run').length, 0);
  assert.equal(report.initial.tiles.length, 9); assert.equal(report.initial.maximum, 9);
  for (const tile of report.initial.tiles) {
    assert.match(tile.id, /^world30-c\d+-r\d+$/); assert.equal(tile.source_detail, 'copernicus');
    assert.equal(tile.copernicus_nodes, 16641); assert.equal(tile.coarse_nodes, 0);
    assert(Math.abs((tile.east_rad - tile.west_rad) * 180 / Math.PI - 1 / 32) < 1e-11);
    assert(Math.abs((tile.north_rad - tile.south_rad) * 180 / Math.PI - 1 / 32) < 1e-11);
  }
  const initialState = report.initial.messages.find(message => message.type === 'state');
  assert.equal(initialState.terrain_profile, 1); assert.equal(initialState.terrain_source, 2);
  assert.equal(initialState.step, 0); assert.equal(initialState.t_s, 0);
  assert(Math.abs(initialState.lat_rad * 180 / Math.PI + 33.9715) < 1e-8);
  assert(Math.abs(initialState.lon_rad * 180 / Math.PI - 18.6021) < 1e-8);
  assert(Math.abs(initialState.alt_msl_m - 1200) < .25);
  async function stats() {
    const start = await page.evaluate(() => window.copernicusObservation.messages.length);
    await page.evaluate(() => window.copernicusObservation.workers[0].postMessage({ type: 'stats' }));
    await page.waitForFunction(start => window.copernicusObservation.messages.slice(start).some(message => message.type === 'stats'), start);
    return page.evaluate(() => window.copernicusObservation.messages.filter(message => message.type === 'stats').at(-1));
  }
  const before = await stats(); await page.waitForTimeout(500); const after = await stats();
  assert.equal(after.step, 0); assert.equal(after.t_s, 0); assert.equal(after.digest, before.digest);
  assert.deepEqual(after.final_state, before.final_state);
  await page.waitForFunction(() => document.querySelector('#scene')?.dataset.terrainDetail === 'copernicus', null, { timeout: 15000 });
  report.scene = await page.evaluate(() => ({ dataset: { ...document.querySelector('#scene').dataset },
    source_label: document.querySelector('.scenery-label')?.textContent, status: document.querySelector('#status')?.textContent }));
  assert.match(report.scene.source_label, /Copernicus/);
  assert.equal(Number(report.scene.dataset.terrainCopernicusNodes), 16641);
  assert.equal(Number(report.scene.dataset.terrainCoarseNodes), 0);
  await Promise.all(bodyReads);
  const helper = report.runtime_responses.find(response => response.path === '/studies/e1-browser/sim/copernicus-terrain.js');
  assert(helper); assert.equal(helper.status, 200);
  assert.equal(helper.sha256, hash(await readFile(new URL('../../studies/e1-browser/sim/copernicus-terrain.js', import.meta.url))));
  const wasm = report.runtime_responses.find(response => response.path.endsWith('/jsbsim.wasm'));
  assert(wasm); assert.equal(wasm.status, 200);
  assert.equal(wasm.sha256, hash(await readFile(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))));
  assert.equal(report.source_responses.length, 16);
  assert(report.source_responses.every(response => response.status === 200 && response.path.startsWith('/scenery/elevation/copernicus/')));
  assert.deepEqual(report.errors, []);
  assert(!report.request_failures.some(request => /copernicus|jsbsim|worker\.js/.test(request.url)));
  report.paused = { before_digest: before.digest, after_digest: after.digest, final_state: after.final_state, step: after.step, t_s: after.t_s };
  report.scope = 'Actual complete application startup through its Vite runtime route and session validator at FACT; real source/native responses. Passive Worker observer only, no module/API/data replacement. No Task162 distant overview or aircraft-fidelity acceptance.';
  report.build_record = JSON.parse(await readFile(new URL('../../studies/e1-browser/sim/dist/build-info.json', import.meta.url), 'utf8'));
  report.wasm_build_record_matches = report.build_record.wasm_sha256 === wasm.sha256;
  for (const file of ['app/runtime.ts', 'app/src/session.ts', 'app/src/scene.ts', 'app/copernicus-terrain-server.ts', 'studies/e1-browser/sim/worker.js']) report.inputs[file] = hash(await readFile(new URL('../../' + file, import.meta.url)));
  assert(!expired); report.result = 'pass';
  await page.screenshot({ path: output + '/copernicus-native-browser.png' });
  await writeFile(output + '/copernicus-native-browser.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ result: report.result, browser: report.browser, helper_status: helper.status,
    source_cells: report.source_responses.length, resident_tiles: report.initial.tiles.length,
    H_m: initialState.terrain_height_msl_m, source_label: report.scene.source_label, paused_digest: after.digest, wasm_sha256: wasm.sha256 }));
} catch (error) {
  report.result = 'fail'; report.failure = String(error); report.server_log = serverLog;
  if (page && !page.isClosed()) {
    report.page = await page.evaluate(() => ({ status: document.querySelector('#status')?.textContent,
      notice: document.querySelector('#notice')?.textContent, messages: window.copernicusObservation?.messages })).catch(() => null);
  }
  await writeFile(output + '/copernicus-native-browser-attempt.json', JSON.stringify(report, null, 2));
  throw error;
} finally {
  clearTimeout(timeout); await browser?.close(); server.kill();
}
