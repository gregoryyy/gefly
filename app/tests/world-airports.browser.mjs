// Actual worldwide discovery Worker/assets and native engine; scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
import * as flightActions from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const allowMissingPlan = process.env.WORLD_AIRPORT_ALLOW_NO_PLAN === '1';
const allowMissingFeedback = process.env.WORLD_AIRPORT_ALLOW_NO_FEEDBACK === '1';
const allowMissingRelocation = process.env.WORLD_AIRPORT_ALLOW_NO_RELOCATION === '1';
const port = Number(process.env.WORLD_AIRPORT_TEST_PORT ?? 5439);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535, 'test port is a valid local TCP port');
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/world-airports-vite',server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverLog = '', browser, page, phase = 'server';
const evidence = { result: 'running', variant: process.env.WORLD_AIRPORT_TEST_VARIANT ?? 'working-app', checks: [], not_evaluated: [], airports: [], errors: [], worldResponses: [], workers: [], limits: [
  'Actual local generated OurAirports data, discovery Worker and installed native engine are used; cartographic pixels and optional Copernicus failures are deterministic scenery fixtures.',
  'The separately labelled negative page injects unavailable world cells to test regional fallback.',
  'Discovery and standby tuning are checked, not current navigation-data completeness, signal reception, airport geometry accuracy or aircraft fidelity.',
] };
const responseJobs = [];
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(target) {
  await target.addInitScript(() => {
    const Native = window.Worker;
    window.__worldNativeMessages = []; window.__worldNativeCommands = [];
    window.__worldDiscoveryMessages = []; window.__worldDiscoveryRequests = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args);
        if (String(args[0]).includes('world-airport.worker.ts')) {
          window.__worldDiscoveryWorker = this;
          this.addEventListener('message', ({ data }) => window.__worldDiscoveryMessages.push({
            at_ms: performance.now(), type: data?.type, id: data?.id,
            result_count: Array.isArray(data?.value) ? data.value.length : null,
            error: data?.error ?? null, status: data?.status?.status,
          }));
          return;
        }
        if (!String(args[0]).includes('/sim/worker.js')) return;
        window.__worldNativeWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (['state', 'stats', 'error'].includes(data?.type)) window.__worldNativeMessages.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__worldDiscoveryWorker) window.__worldDiscoveryRequests.push({ at_ms: performance.now(), type: message?.type, id: message?.id, query: message?.type === 'search' ? message.value : undefined });
        if (this === window.__worldNativeWorker && message?.type !== 'stats') window.__worldNativeCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  await target.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'), 'read-only MapLibre observation marker exists');
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'window.__worldAirportPlanSnapshot = () => typeof planStore === "undefined" ? null : planStore.getSnapshot(); map = window.__worldAirportMap = new LibreMap({') });
  });
  await installSceneryFixture(target);
  await target.route('**/scenery/**/*.pbf', route => route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) }));
  await target.route('**/scenery/elevation/copernicus/**', route => route.fulfill({ status: 503, body: 'optional elevation unavailable in scenery fixture' }));
}

async function stats(target) {
  const count = await target.evaluate(() => __worldNativeMessages.length);
  await target.evaluate(() => __worldNativeWorker.postMessage({ type: 'stats' }));
  await target.waitForFunction(count => __worldNativeMessages.slice(count).some(row => row.type === 'stats'), count);
  return target.evaluate(count => __worldNativeMessages.slice(count).find(row => row.type === 'stats'), count);
}
const kap = row => Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith('kap_')));
const activeChannels = target => target.locator('#com1-active,#com2-active,#nav1-active,#nav2-active').allTextContents();
async function activateMap(target) {
  if (flightActions.activateFlightMap) await flightActions.activateFlightMap(target);
  else {
    const point = await target.locator('#practice-map-panel .maplibregl-canvas').evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      for (const y of [.7, .5, .3, .85]) for (const x of [.7, .5, .3, .1, .95]) {
        const p = { x: rect.left + rect.width * x, y: rect.top + rect.height * y };
        if (document.elementFromPoint(p.x, p.y) === canvas) return p;
      }
      throw new Error('No bare map canvas for trusted activation');
    });
    await target.mouse.click(point.x, point.y);
  }
}
async function openMap(target) {
  await prepareFlightUI(target, { controls: false });
  await target.locator('#scene').focus(); await target.keyboard.press('m');
  await target.locator('#practice-map-panel').waitFor({ state: 'visible' });
  await target.waitForFunction(() => window.__worldAirportMap?.getSource('airfields'));
  await activateMap(target);
  await target.locator('#scene').focus(); await target.keyboard.press(',');
  await target.locator('.map-point-search').waitFor({ state: 'visible' });
}

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverLog.includes('Local:'); i++) {
    assert.equal(server.exitCode, null, serverLog);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  page.on('pageerror', error => evidence.errors.push(String(error)));
  page.on('worker', worker => evidence.workers.push(worker.url()));
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/airports/world/')) evidence.worldResponses.push({ path, status: response.status(),
      content_encoding: response.headers()['content-encoding'] ?? null, content_length: response.headers()['content-length'] ?? null });
    if (path.endsWith('/airports/world/search.bin')) responseJobs.push(response.body().then(body => {
      evidence.searchDelivery = { bytes: body.length, sha256: sha(body), content_encoding: response.headers()['content-encoding'] ?? null };
    }).catch(error => { evidence.searchDelivery = { error: String(error) }; }));
    if (path.endsWith('/airports/world/catalogue.bin')) responseJobs.push(response.body().then(body => {
      evidence.catalogueDelivery = { bytes: body.length, sha256: sha(body), content_encoding: response.headers()['content-encoding'] ?? null };
    }).catch(error => { evidence.catalogueDelivery = { error: String(error) }; }));
  });
  await fixture(page);
  phase = 'native startup';
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__worldNativeMessages.some(row => row.type === 'state') && !document.querySelector('#start').disabled, null, { timeout: 60000 });
  await page.locator('#scene').focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => __worldNativeMessages.filter(row => row.type === 'state').at(-1)?.kap_engaged === 1);
  await page.locator('#start').click();
  await page.waitForFunction(() => __worldNativeMessages.filter(row => row.type === 'state').at(-1)?.t_s > 1.5);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const baseline = await stats(page), baselineActive = await activeChannels(page);
  assert(baseline.step > 0); assert.equal(baseline.kap_engaged, 1); assert.equal(baselineActive.length, 4);
  evidence.baseline = { step: baseline.step, digest: baseline.digest, kap: kap(baseline), active: baselineActive };
  phase = 'worldwide map startup';
  await openMap(page);
  const panel = page.locator('#practice-map-panel');
  const query = panel.locator('.map-point-search input[type=search]');
  const popup = panel.locator('.map-point-popup');
  const waitSettled = () => page.waitForFunction(() => ['ready', 'empty'].includes(document.querySelector('#practice-map-panel').dataset.worldAirportsStatus), null, { timeout: 45000 });
  await waitSettled();
  assert(evidence.workers.some(url => url.includes('world-airport.worker.ts')), 'a real dedicated discovery Worker is observed');

  async function select(queryText, id = queryText) {
    phase = `global search ${queryText}`;
    await activateMap(page);
    const requestOffset = await page.evaluate(() => __worldDiscoveryRequests.length);
    await query.fill(queryText);
    await page.waitForFunction(({ text, offset }) => {
      const request = __worldDiscoveryRequests.slice(offset).findLast(row => row.type === 'search' && row.query === text);
      return request && __worldDiscoveryMessages.some(row => row.id === request.id && ['result', 'error'].includes(row.type));
    }, { text: queryText, offset: requestOffset }, { timeout: 45000 });
    const response = await page.evaluate(({ text, offset }) => {
      const request = __worldDiscoveryRequests.slice(offset).findLast(row => row.type === 'search' && row.query === text);
      return __worldDiscoveryMessages.find(row => row.id === request.id && ['result', 'error'].includes(row.type));
    }, { text: queryText, offset: requestOffset });
    assert.equal(response.type, 'result', `${queryText} global discovery Worker search succeeds`);
    assert(response.result_count > 0, `${queryText} returns actual global index matches`);
    const button = panel.locator('.map-point-search-row').filter({ has: page.locator('strong', { hasText: new RegExp(`^${id}$`) }) }).first();
    await button.waitFor({ state: 'visible', timeout: 45000 });
    await button.click();
    await popup.waitFor({ state: 'visible' });
    await page.waitForFunction(id => document.querySelector('.map-point-popup')?.dataset.pointId === id &&
      !document.querySelector('.map-point-popup-source')?.textContent.includes('select to load'), id, { timeout: 45000 });
    await waitSettled();
    assert.equal(await panel.getByRole('button', { name: 'Follow', exact: true }).getAttribute('aria-pressed'), 'false');
    return popup;
  }
  async function bounds() {
    const observed = await page.evaluate(async () => ({
      rows: document.querySelectorAll('.map-point-search-row').length,
      airports: document.querySelectorAll('.practice-map-airport-marker').length,
      navaids: document.querySelectorAll('.practice-map-navigation-marker[data-world-record-id]').length,
      cached: Number(document.querySelector('#practice-map-panel').dataset.worldAirportsCached),
      cacheBytes: Number(document.querySelector('#practice-map-panel').dataset.worldAirportsCacheBytes),
      sourceAirports: (await __worldAirportMap.getSource('airfields').getData()).features.length,
      sourceNavaids: (await __worldAirportMap.getSource('world-navigation-aids').getData()).features.length,
    }));
    assert(observed.rows <= 40); assert(observed.airports <= 80); assert(observed.navaids <= 80);
    assert(observed.cached <= 18); assert(observed.cacheBytes <= 25165824);
    assert(observed.sourceAirports <= 20000); assert(observed.sourceNavaids <= 10000);
    return observed;
  }

  for (const id of ['LOWW', 'LFPG', 'LSZH', 'FACT', 'KJFK', 'RJTT', 'NZQN']) {
    await select(id);
    const text = await popup.textContent();
    assert.match(text, /OurAirports/); assert.match(text, /Runway .*ft/);
    const com = popup.locator('button[data-radio-kind=com][data-receiver="1"]').first();
    await com.waitFor({ state: 'visible' });
    const channel = Number(await com.getAttribute('data-channel-khz'));
    await com.click();
    await page.waitForFunction(channel => Math.abs(Number(document.querySelector('#com1-standby').value) * 1000 - channel) < 1e-6, channel);
    assert.deepEqual(await activeChannels(page), baselineActive, `${id} changes standby only`);
    const feedback = popup.locator('.map-point-popup-tuning-feedback').filter({ hasText: 'sent to COM1 standby' });
    if (await feedback.count()) assert.match(await feedback.textContent(), /Swap to activate/);
    else {
      assert(allowMissingFeedback, 'current app exposes standby confirmation feedback');
      const limitation = 'Standby confirmation wording is absent from this branch; WORLD_AIRPORT_ALLOW_NO_FEEDBACK=1 limits only that presentation check. Actual standby mutation and unchanged active channels are still mandatory.';
      if (!evidence.not_evaluated.includes(limitation)) evidence.not_evaluated.push(limitation);
    }
    const centre = await page.evaluate(() => ({ lon: __worldAirportMap.getCenter().lng, lat: __worldAirportMap.getCenter().lat }));
    evidence.airports.push({ id, channel_khz: channel, centre, bounds: await bounds(), details: text });
    if (id === 'LFPG') {
      await popup.getByRole('button', { name: 'GPS target', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#map-gps-readout').textContent.includes('LFPG'));
      evidence.checks.push('a source airport can become the visual GPS target without an autopilot command');
      const addWaypoint = popup.getByRole('button', { name: 'Add waypoint', exact: true });
      if (await addWaypoint.count()) {
        await addWaypoint.click();
        const plan = await page.evaluate(() => __worldAirportPlanSnapshot());
        assert.equal(plan.waypoints.length, 1); assert.match(JSON.stringify(plan.waypoints[0]), /LFPG/);
        assert.match(plan.waypoints[0].source_label, /OurAirports/);
        evidence.checks.push('an explicit source-airport Add waypoint action retains its source identity in the flight plan');
      } else {
        assert(allowMissingPlan, 'current app exposes its existing source point Add waypoint action');
        evidence.not_evaluated.push('Flight-plan action is absent from this branch; WORLD_AIRPORT_ALLOW_NO_PLAN=1 explicitly limits this run.');
      }
    }
    console.log(`Worldwide airport verified: ${id}`);
  }
  evidence.checks.push('seven distant airports resolve through real global search and cells, show source runway details and load COM1 standby without changing active channels');

  await select('Zurich East', 'ZUE');
  const nav = popup.locator('button[data-radio-kind=nav][data-receiver="2"]').first();
  await nav.waitFor({ state: 'visible' }); assert.equal(Number(await nav.getAttribute('data-channel-khz')), 110050);
  await nav.click();
  await page.waitForFunction(() => Number(document.querySelector('#nav2-standby').value) === 110.05);
  assert.deepEqual(await activeChannels(page), baselineActive);
  evidence.checks.push('worldwide VOR-DME selection loads the source110.050MHz into NAV2 standby only, with historical receiver coverage still disclosed');

  await select('Cape Town', 'CB');
  assert.match(await popup.textContent(), /NDB/); assert.match(await popup.textContent(), /463 kHz/);
  assert.match(await popup.textContent(), /Tuning unavailable/);
  assert.equal(await popup.locator('button[data-radio-kind=nav]').count(), 0);
  evidence.checks.push('a source NDB retains its kHz frequency and exposes no unsupported NAV tuning action');

  phase = 'map pan and cache return';
  await select('NZQN');
  const queenstown = await page.evaluate(() => [__worldAirportMap.getCenter().lng, __worldAirportMap.getCenter().lat]);
  await page.evaluate(([lon, lat]) => __worldAirportMap.jumpTo({ center: [lon + 5, lat], zoom: 8 }), queenstown);
  await waitSettled();
  const beforeReturn = evidence.worldResponses.filter(row => row.path.includes('/cells/')).length;
  await page.evaluate(centre => __worldAirportMap.jumpTo({ center: centre, zoom: 11 }), queenstown);
  await waitSettled();
  await page.waitForTimeout(250);
  const afterReturn = evidence.worldResponses.filter(row => row.path.includes('/cells/')).length;
  assert.equal(afterReturn, beforeReturn, 'return to cached adjacent view needs no new cell downloads');
  evidence.cacheReturn = { beforeReturn, afterReturn, bounds: await bounds() };
  evidence.checks.push('map pan/return reuses cached source cells and all observed search, label, source and cache counts stay bounded');

  const afterDiscovery = await stats(page);
  assert.equal(afterDiscovery.step, baseline.step); assert.equal(afterDiscovery.digest, baseline.digest);
  assert.deepEqual(afterDiscovery.final_state, baseline.final_state); assert.deepEqual(kap(afterDiscovery), kap(baseline));
  assert.deepEqual(await activeChannels(page), baselineActive);
  evidence.checks.push('paused native step, digest, complete physical state, AP state and active radio channels remain unchanged during worldwide discovery and standby loading');

  phase = 'recorded Review guards';
  await page.locator('#review-flight').click();
  await page.locator('#flight-review').waitFor({ state: 'visible' });
  const navigationCount = await page.evaluate(() => __worldNativeCommands.filter(message => message.type === 'navigation').length);
  await select('LFPG');
  const reviewTune = popup.locator('button[data-radio-kind=com]');
  assert(await reviewTune.count() > 0);
  for (const button of await reviewTune.all()) assert(await button.isDisabled());
  const flyFrom = popup.getByRole('button', { name: 'Fly from here', exact: true });
  if (await flyFrom.count()) assert(await flyFrom.isDisabled());
  else {
    assert(allowMissingRelocation, 'current app exposes its existing map relocation action');
    evidence.not_evaluated.push('Map relocation is absent from this branch; WORLD_AIRPORT_ALLOW_NO_RELOCATION=1 limits only that Review presentation check. Native state and radio guards remain mandatory.');
  }
  assert.equal(await page.evaluate(() => __worldNativeCommands.filter(message => message.type === 'navigation').length), navigationCount);
  const afterReview = await stats(page);
  assert.equal(afterReview.step, baseline.step); assert.equal(afterReview.digest, baseline.digest);
  assert.deepEqual(afterReview.final_state, baseline.final_state); assert.deepEqual(kap(afterReview), kap(baseline));
  evidence.checks.push(`recorded Review allows worldwide inspection while disabling COM tuning${await flyFrom.count() ? ' and flight relocation' : ''} without sending navigation mutations`);
  await page.locator('#review-exit').click();
  await page.screenshot({ path: `${output}/world-airports.png` });

  phase = 'negative optional-cell failure and regional fallback';
  const failedPage = await browser.newPage({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  await fixture(failedPage);
  const negativeErrors = [];
  failedPage.on('pageerror', error => negativeErrors.push(String(error)));
  await failedPage.route('**/airports/world/cells/*.bin', route => route.fulfill({ status: 503, body: 'injected optional world-cell failure' }));
  await failedPage.goto(origin, { waitUntil: 'domcontentloaded' });
  await failedPage.waitForFunction(() => !document.querySelector('#start').disabled, null, { timeout: 60000 });
  const fallbackBaseline = await stats(failedPage);
  await openMap(failedPage);
  await failedPage.waitForFunction(() => {
    const panel = document.querySelector('#practice-map-panel');
    return panel.dataset.worldAirportsFallback === 'true' && ['partial', 'unavailable'].includes(panel.dataset.worldAirportsStatus);
  }, null, { timeout: 45000 });
  const fallbackPoints = await failedPage.evaluate(async () => await __worldAirportMap.getSource('airfields').getData());
  assert.equal(fallbackPoints.features.length, 731, 'failed optional world cells retain every bundled regional airport');
  const fallbackAfter = await stats(failedPage);
  assert.equal(fallbackAfter.step, fallbackBaseline.step); assert.equal(fallbackAfter.digest, fallbackBaseline.digest);
  assert.deepEqual(fallbackAfter.final_state, fallbackBaseline.final_state); assert.deepEqual(negativeErrors, []);
  evidence.negative = { injected: 'all optional world cells503; manifest/index/regional assets untouched', retained_regional_airports: fallbackPoints.features.length, status: await failedPage.locator('.practice-map-world-status').textContent() };
  evidence.checks.push('injected optional cell failures disclose unavailability and preserve the731entry regional fallback and paused native state');
  await failedPage.close();

  assert.deepEqual(evidence.errors, []);
  assert.deepEqual(await page.evaluate(() => __worldNativeMessages.filter(row => row.type === 'error')), []);
  assert(evidence.worldResponses.some(row => row.path.endsWith('/search.bin') && row.status === 200));
  assert(evidence.worldResponses.filter(row => row.path.includes('/cells/') && row.status === 200).length > 10);
  await Promise.all(responseJobs);
  const descriptorBytes = await readFile(new URL('../public/airports/world/manifest.json', import.meta.url));
  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  assert.equal(descriptor.schema, 1); assert.equal(descriptor.id, 'ourairports-world-catalogue-v1'); assert.equal(descriptor.path, 'catalogue.bin');
  const catalogueBytes = await readFile(new URL('../public/airports/world/catalogue.bin', import.meta.url));
  assert.equal(catalogueBytes.length, descriptor.bytes); assert.equal(sha(catalogueBytes), descriptor.sha256);
  const sourceManifest = JSON.parse(catalogueBytes.toString('utf8'));
  assert.deepEqual(sourceManifest.counts, { airports: 86343, runways: 48411, com: 30394, navaids: 11008 });
  evidence.sourceCounts = sourceManifest.counts;
  assert.equal(evidence.catalogueDelivery.content_encoding, null);
  assert.equal(evidence.catalogueDelivery.bytes, descriptor.bytes); assert.equal(evidence.catalogueDelivery.sha256, descriptor.sha256);
  assert.equal(evidence.searchDelivery.content_encoding, null, 'gzip archive is delivered as binary without automatic HTTP decoding');
  assert.equal(evidence.searchDelivery.bytes, sourceManifest.search.bytes);
  assert.equal(evidence.searchDelivery.sha256, sourceManifest.search.sha256);
  evidence.identities = {
    wasm_sha256: sha(await readFile(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))),
    manifest_sha256: sha(descriptorBytes), catalogue_sha256: sha(catalogueBytes),
    harness_sha256: sha(await readFile(fileURLToPath(import.meta.url))),
    source_sha256: Object.fromEntries(await Promise.all([
      '../src/world-airport-contract.ts', '../src/world-airport.worker.ts', '../src/world-airport-loader.ts',
      '../src/world-airport-repository.ts', '../src/world-airport-data.ts', '../src/practice-map.ts', '../src/main.ts',
      '../../studies/e1-browser/sim/worker.js',
    ].map(async path => [path, sha(await readFile(new URL(path, import.meta.url)))]))),
  };
  evidence.final = { step: afterReview.step, digest: afterReview.digest };
  evidence.discovery = await page.evaluate(() => ({ requests: __worldDiscoveryRequests, responses: __worldDiscoveryMessages }));
  evidence.result = 'pass';
  console.log(`Worldwide OurAirports browser regression: ${evidence.checks.length} groups passed with actual data/discovery Worker/native engine.`);
} catch (error) {
  evidence.result = 'fail'; evidence.failure = { phase, message: String(error), stack: error?.stack };
  if (page) {
    evidence.discovery = await page.evaluate(() => ({ requests: window.__worldDiscoveryRequests, responses: window.__worldDiscoveryMessages })).catch(() => null);
    evidence.failure.status = await page.locator('#practice-map-panel').getAttribute('data-world-airports-status').catch(() => null);
    evidence.failure.mapStatus = await page.locator('.practice-map-world-status').textContent().catch(() => null);
    await page.screenshot({ path: `${output}/world-airports-failure.png` }).catch(() => {});
  }
  throw error;
} finally {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/world-airports.json`, JSON.stringify(evidence, null, 2) + '\n');
  await browser?.close(); server.kill();
}
