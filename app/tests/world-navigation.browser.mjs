// R-NAV-1/R-NAV-4: actual app, historical global station bytes and native worker.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5396';
const DEG = Math.PI / 180, NM = 1852, R = 6371000;
const sha = value => createHash('sha256').update(value).digest('hex');
const manifestBytes = await readFile(`${app}/public/navdata/manifest.json`);
const manifest = JSON.parse(manifestBytes);
const packageBytes = await readFile(`${app}/public/navdata/${manifest.asset}`);
const catalogue = JSON.parse(packageBytes);
assert.equal(catalogue.id, 'world-nav810-2013-10-v1');
assert.equal(sha(packageBytes), manifest.sha256);
const find = (id, kind, frequency_khz) => {
  const matches = catalogue.records.filter(row => row.id === id && row.kind === kind && (frequency_khz === undefined || row.frequency_khz === frequency_khz));
  assert.equal(matches.length, 1, `${id} source fixture is unambiguous`);
  return matches[0];
};
const sources = ['src/main.ts', 'src/radio-nav.ts', 'src/radio-nav-panel.ts', 'src/navigation-gauges.ts',
  '../studies/e1-browser/sim/navigation.js', 'tests/world-navigation.browser.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(sources.map(async path => [path, sha(await readFile(`${app}/${path}`))])));
const sourceBefore = await hashes();
const result = { result: 'running', checks: [], observations: [], errors: [], sourceHashes: sourceBefore,
  package: { id: catalogue.id, source_label: catalogue.source_label, asset: manifest.asset, sha256: manifest.sha256,
    bytes: packageBytes.length, records: catalogue.records.length },
  limits: ['Historical2013.10 simulator sources, not current operational data.',
    'Actual native worker and instrument components; scenery images/optional imagery are fixtures.',
    'No aircraft fidelity, installed receiver calibration or published approach acceptance.'] };
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5396,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let serverLog = '', browser, page;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const save = async () => { await mkdir(output, { recursive: true }); await writeFile(`${output}/world-navigation-browser.json`, JSON.stringify(result, null, 2)); };

try {
  for (let i = 0; !serverLog.includes('Local:'); i++) {
    assert(i < 150 && server.exitCode === null, serverLog); await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  async function launch(record, position = {}) {
    const context = await browser.newContext({ viewport: { width: 1680, height: 1100 }, serviceWorkers: 'block' });
    page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => result.errors.push(String(error)));
    const location = { version: 1, mode: 'airborne', lat_rad: record.lat_deg * DEG - 3 * NM / R,
      lon_rad: record.lon_deg * DEG, alt_msl_m: Math.max(1500, record.elevation_m + 1000), heading_rad: 0, ...position };
    assert(location.alt_msl_m <= 6000, 'fixture fits supported saved launch interface');
    await page.addInitScript(location => {
      localStorage.setItem('gefly.flight-location.v1', JSON.stringify(location));
      const Native = Worker;
      window.worldNavStates = []; window.worldNavStats = []; window.worldNavReady = []; window.worldNavCommands = [];
      window.Worker = class extends Native {
        constructor(...args) {
          super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
          window.worldNavWorker = this;
          this.addEventListener('message', ({ data }) => {
            if (data.type === 'state') worldNavStates.push(data);
            if (data.type === 'stats') worldNavStats.push(data);
            if (data.type === 'ready') worldNavReady.push(data);
          });
        }
        postMessage(message, ...args) {
          if (this === window.worldNavWorker) worldNavCommands.push(structuredClone(message));
          return super.postMessage(message, ...args);
        }
      };
    }, location);
    await installSceneryFixture(page);
    await page.route('**/scenery/**/*.pbf', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
    await page.route('**/scenery/elevation/copernicus/**', route => route.fulfill({ status: 503, body: 'optional elevation fixture unavailable' }));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('#start').disabled && window.worldNavStates.length
      && document.querySelector('.flight-app').dataset.navdata === 'match', null, { timeout: 60000 });
    await prepareFlightUI(page, { controls: false });
    assert.equal(await page.locator('#status').textContent(), 'Paused');
    const initial = await page.evaluate(() => worldNavStates.at(-1));
    assert(Math.abs(initial.lat_rad - location.lat_rad) < 1e-8, 'normal persisted position reaches native launch');
    assert(Math.abs(initial.lon_rad - location.lon_rad) < 1e-8);
    assert.equal(await page.evaluate(() => worldNavReady.at(-1).navdata_sha256), manifest.sha256);
    return { context, initial };
  }
  async function stats() {
    const count = await page.evaluate(() => worldNavStats.length);
    await page.evaluate(() => worldNavWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => worldNavStats.length > count, count);
    return page.evaluate(() => worldNavStats.at(-1));
  }
  async function tune(receiver, frequency_khz, swap = true) {
    const standby = page.locator(`#nav${receiver}-standby`);
    await standby.fill((frequency_khz / 1000).toFixed(2)); await standby.press('Tab');
    const field = receiver === 1 ? 'radio_nav_active_khz' : 'radio_nav2_active_khz';
    if (swap) {
      await page.locator(`#nav${receiver}-swap`).click();
      await page.waitForFunction(({ field, frequency_khz }) => worldNavStates.at(-1)?.[field] === frequency_khz, { field, frequency_khz });
    }
  }
  async function invariant(before) {
    const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  }
  for (const [id, frequency_khz] of [['CPT', 114350], ['KLO', 114850], ['CTV', 115700]]) {
    const record = find(id, 'VOR', frequency_khz); assert(record.dme, `${id} source includes DME`);
    const { context } = await launch(record), before = await stats();
    const active = await page.locator('#nav1-active').textContent();
    await tune(1, record.frequency_khz, false);
    assert.equal(await page.locator('#nav1-active').textContent(), active, 'standby tuning never activates signal');
    assert.notEqual(await page.locator('#nav1-gauge').getAttribute('data-station-id'), id);
    await page.locator('#nav1-swap').click();
    await page.waitForFunction(id => document.querySelector('#nav1-gauge').dataset.stationId === id
      && document.querySelector('#nav1-gauge').dataset.valid === 'true' && worldNavStates.at(-1)?.kap_nav_valid === 1, id);
    await tune(2, record.frequency_khz);
    for (const receiver of [1, 2]) {
      const gauge = page.locator(`#nav${receiver}-gauge`);
      assert.equal(await gauge.getAttribute('data-valid'), 'true'); assert.equal(await gauge.getAttribute('data-dme-valid'), 'true');
      assert.equal(await gauge.getAttribute('data-station-id'), id); assert.equal(await gauge.getAttribute('data-course-reference'), 'MAG');
      assert.match(await gauge.locator('.nav-unit-reference').textContent(), /HIST/);
      assert(await gauge.locator('.nav-cdi-needle').evaluate(element => !element.hasAttribute('hidden')));
      assert(await gauge.locator('.nav-warning-flag').evaluate(element => element.hasAttribute('hidden')));
      const dme = Number((await gauge.locator('.nav-dme-readout').textContent()).match(/[\d.]+/)[0]);
      assert(dme > 2 && dme < 4, `${id} physical slant range is plausible for3NM fixture`);
    }
    const worker = await page.evaluate(() => worldNavStates.at(-1));
    assert.equal(worker.kap_nav_kind, 1); assert.equal(worker.kap_gs_valid, 0);
    assert.equal(await page.locator('#bearing-gauge').getAttribute('data-valid'), 'true');
    await invariant(before);
    if (id === 'CPT') {
      await page.locator('#nav-stations-open').click();
      await page.locator('.nav-stations-nearby').uncheck();
      assert.equal(await page.locator('.nav-station').count(), 200, 'unfiltered world picker bounds DOM rows');
      assert.match(await page.locator('.nav-stations-count').textContent(), /200/);
      await page.locator('.nav-stations-search').fill('CTV');
      const capetown = page.locator('.nav-station').filter({ hasText: /CTV/ });
      assert(await capetown.count() > 0, 'query reaches a distant station beyond capped initial rows');
      assert(await page.locator('.nav-station').count() <= 200);
      await page.locator('.nav-stations-close').click();
      result.checks.push('Worldwide station picker caps unfiltered DOM rows at200 and search reaches distant CapeTown beyond that initial cap');
    }
    result.observations.push({ id, uid: record.uid, frequency_khz: record.frequency_khz, position: { lat_rad: worker.lat_rad, lon_rad: worker.lon_rad,
      alt_msl_m: worker.alt_msl_m }, nav1_worker_valid: worker.kap_nav_valid, nav1_worker_kind: worker.kap_nav_kind,
      nav1_dme: await page.locator('#nav1-gauge .nav-dme-readout').textContent(), step: worker.step });
    result.checks.push(`${id}: real global historical VOR/DME standby→swap on both receivers, magnetic CDI/bearing/DME and native NAV1 source agree without stepping paused physics`);
    if (id === 'CPT') {
      const obs = ((Math.round(-record.variation_deg_east) % 360) + 360) % 360;
      await page.locator('#nav-obs').fill(String(obs)); await page.locator('#nav-obs').press('Tab');
      await page.locator('#scene').focus(); await page.keyboard.press('a');
      await page.waitForFunction(() => worldNavStates.at(-1)?.kap_engaged === 1);
      await page.locator('#ap-nav').click();
      await page.waitForFunction(() => worldNavStates.at(-1)?.kap_lateral === 2);
      const startIndex = await page.evaluate(() => worldNavStates.length);
      const startStep = (await page.evaluate(() => worldNavStates.at(-1))).step;
      await page.locator('#start').click();
      await page.waitForFunction(step => worldNavStates.at(-1)?.step >= step + 180, startStep);
      await page.locator('#pause').click();
      await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
      const frames = await page.evaluate(start => worldNavStates.slice(start), startIndex);
      assert(frames.length > 10, 'actual live worker publications observed');
      assert(frames.every(state => state.kap_nav_valid === 1 && state.kap_engaged === 1
        && state.kap_lateral === 2 && state.kap_nav_kind === 1 && state.kap_sensor_fault === 0 && state.collision_mask === 0),
      'world VOR source stays valid through fixed-step native AP NAV flight');
      result.observations.push({ id: 'CPT-live-NAV', obs_magnetic_deg: obs, start_step: startStep,
        final_step: frames.at(-1).step, observed_frames: frames.length, ap_nav_valid_all_frames: true });
      result.checks.push('CPT: actual live fixed-step flight retains engaged AP NAV capture and valid global VOR source across at least180 native steps without source dropout');
    }
    await context.close();
  }
  {
    const record = find('FRD', 'DME', 115900), { context } = await launch(record), before = await stats();
    await tune(1, record.frequency_khz); await tune(2, record.frequency_khz);
    await page.waitForFunction(() => document.querySelector('#nav1-gauge').dataset.stationId === 'FRD');
    for (const receiver of [1, 2]) {
      const gauge = page.locator(`#nav${receiver}-gauge`);
      assert.equal(await gauge.getAttribute('data-valid'), 'false'); assert.equal(await gauge.getAttribute('data-dme-valid'), 'true');
      assert.match(await gauge.locator('.nav-scale-label').textContent(), /DME ONLY/);
    }
    assert.equal(await page.locator('#bearing-gauge').getAttribute('data-valid'), 'false');
    assert.equal(await page.locator('#bearing-gauge').getAttribute('data-dme-valid'), 'true');
    assert.equal((await page.evaluate(() => worldNavStates.at(-1))).kap_nav_valid, 0);
    await invariant(before); result.checks.push('DME-only source provides distance independently, retains NAV/CDI/bearing invalid and cannot provide AP lateral guidance');
    await context.close();
  }
  {
    const record = find('IFCW', 'LOC', 111550); assert(record.gs);
    const distance_m = 5 * NM, course = record.front_course_true_deg * DEG;
    const { context } = await launch(record, { lat_rad: record.gs.lat_deg * DEG - distance_m / R * Math.cos(course),
      lon_rad: record.gs.lon_deg * DEG - distance_m / R * Math.sin(course) / Math.cos(record.gs.lat_deg * DEG),
      alt_msl_m: record.gs.elevation_m + distance_m * Math.tan(record.gs.angle_deg * DEG), heading_rad: course });
    const before = await stats(); await tune(1, record.frequency_khz); await tune(2, record.frequency_khz);
    await page.waitForFunction(() => document.querySelector('#nav1-gauge').dataset.stationId === 'IFCW'
      && worldNavStates.at(-1)?.kap_nav_valid === 1 && worldNavStates.at(-1)?.kap_gs_valid === 1);
    assert.equal(await page.locator('#nav1-gauge').getAttribute('data-gs-valid'), 'true');
    assert.equal(await page.locator('#nav2-gauge').getAttribute('data-gs-valid'), 'false');
    for (const needle of ['.nav-cdi-needle', '.nav-gs-needle'])
      assert(await page.locator(`#nav1-gauge ${needle}`).evaluate(element => !element.hasAttribute('hidden')));
    assert.equal((await page.evaluate(() => worldNavStates.at(-1))).kap_nav_kind, 2);
    await invariant(before); result.checks.push('Preserved EDDF IFCW source still supplies independent localizer/glideslope bars on NAV1, localizer-only NAV2 and coherent native guidance');
    await context.close();
  }
  assert.deepEqual(result.errors, []); assert.deepEqual(await hashes(), sourceBefore);
  result.browser = browser.version(); result.result = 'pass'; await save();
  console.log(JSON.stringify({ result: result.result, checks: result.checks }, null, 2));
} catch (error) {
  result.result = 'fail'; result.error = String(error); result.serverLog = serverLog;
  result.debug = await page?.evaluate(() => ({ status: document.querySelector('#status')?.textContent,
    navdata: document.querySelector('.flight-app')?.dataset.navdata, navdataError: document.querySelector('#navdata-error')?.textContent,
    state: window.worldNavStates?.at(-1), ready: window.worldNavReady?.at(-1) })).catch(() => null);
  await save(); throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
