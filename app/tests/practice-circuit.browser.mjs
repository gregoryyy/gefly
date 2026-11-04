// Actual browser/map/worker integration. Basemap pixels are deterministic fixtures;
// imported circuit positions below are explicitly synthetic replay observations.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5251';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5251,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, log = '';
server.stdout.on('data', chunk => { log += chunk; }); server.stderr.on('data', chunk => { log += chunk; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = Worker; window.circuitStates = []; window.circuitStats = [];
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (!String(args[0]).includes('/sim/worker.js')) return;
      window.circuitWorker = this;
      this.addEventListener('message', ({ data }) => {
        if (data.type === 'state') window.circuitStates.push(data);
        if (data.type === 'stats') window.circuitStats.push(data);
      });
    } };
  });
  // Observe the real map and public controller, preserving their implementation.
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'));
    assert(/const controller\s*=\s*\{/.test(source), 'controller observer marker exists in transformed module');
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.circuitMap = new LibreMap({')
      .replace(/const controller\s*=\s*\{/, 'const controller = window.circuitController = {') });
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.circuitStates.length);
  await prepareFlightUI(page, { controls: false });
  const scene = page.locator('#scene'), panel = page.locator('#practice-map-panel');
  await scene.focus(); await page.keyboard.press('m');
  try { await page.waitForFunction(() => window.circuitMap?.getSource('practice-circuit') && window.circuitController); }
  catch (error) { throw Error(`${error} · ${JSON.stringify(await page.evaluate(() => ({ map: !!window.circuitMap, controller: !!window.circuitController, source: !!window.circuitMap?.getSource('practice-circuit'), status: document.querySelector('.practice-map-status')?.textContent })))} · ${errors.join('; ')}`); }
  const activate = async () => {
    if (!(await panel.evaluate(e => e.classList.contains('overlay-active')))) {
      await panel.getByRole('button', { name: 'Circuit guide', exact: true }).focus();
      await page.keyboard.press('Enter'); // supported first-key activation, without toggling the button
    }
  };
  await activate();
  const toggle = panel.getByRole('button', { name: 'Circuit guide', exact: true });
  const fit = panel.getByRole('button', { name: 'Fit circuit', exact: true });
  const data = () => page.evaluate(async () => await window.circuitMap.getSource('practice-circuit').getData());
  const stats = async () => {
    const count = await page.evaluate(() => window.circuitStats.length);
    await page.evaluate(() => window.circuitWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.circuitStats.length > n, count);
    return page.evaluate(() => window.circuitStats.at(-1));
  };
  const unchanged = async before => {
    const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  };
  const expectRunway = async runway => {
    await page.waitForFunction(async r => {
      const source = await window.circuitMap.getSource('practice-circuit').getData();
      return source.features.length === 5 && source.features.every(feature => feature.properties.runway === r)
        && document.querySelectorAll('.practice-map-circuit-label').length === 5
        && document.querySelector('.practice-map-circuit-readout').textContent.includes(`EDFE ${r}`);
    }, runway);
    const guide = await data();
    assert.equal(new Set(guide.features.map(f => f.properties.id)).size, 5);
    assert(guide.features.every(f => f.geometry.type === 'LineString' && f.geometry.coordinates.length === 2 && f.geometry.coordinates.flat().every(Number.isFinite)));
    assert.equal(await panel.locator('.practice-map-circuit-label').count(), 5);
    return guide;
  };
  const scrollMapToTop = async () => {
    const header = await panel.locator('.practice-map-heading').boundingBox();
    await page.mouse.move(header.x + header.width - 65, header.y + header.height / 2);
    await page.mouse.wheel(0, -3000);
    await page.waitForFunction(() => document.querySelector('#practice-map-panel').scrollTop === 0);
  };
  const expectRendered = async () => {
    await scrollMapToTop();
    await page.waitForFunction(() => new Set(window.circuitMap.queryRenderedFeatures({ layers: ['practice-circuit-guide'] }).map(feature => feature.properties.id)).size === 5);
    const wholeGuideVisible = await page.evaluate(async () => {
      const viewport = document.querySelector('.practice-map-viewport').getBoundingClientRect();
      const header = document.querySelector('.practice-map-heading').getBoundingClientRect();
      const source = await window.circuitMap.getSource('practice-circuit').getData();
      return viewport.top >= header.bottom - 1 && source.features.every(feature => feature.geometry.coordinates.every(coordinate => {
        const p = window.circuitMap.project(coordinate);
        return p.x >= 0 && p.x <= viewport.width && p.y >= 0 && p.y <= viewport.height;
      })) && [...document.querySelectorAll('.practice-map-circuit-label')].every(element => {
        const b = element.getBoundingClientRect();
        return b.left >= viewport.left - 1 && b.right <= viewport.right + 1 && b.top >= viewport.top - 1 && b.bottom <= viewport.bottom + 1;
      });
    });
    assert(wholeGuideVisible, 'all five projected legs and labels fit the unobstructed map viewport');
    assert.deepEqual(await page.evaluate(() => window.circuitMap.getPaintProperty('practice-circuit-guide', 'line-dasharray')), [3, 2]);
    assert(await panel.locator('.practice-map-circuit-note').isVisible());
    assert.match(await panel.locator('.practice-map-circuit-note').textContent(), /Generated practice guide.*not published EDFE route.*no altitude\/speed\/obstacle guidance/);
  };
  const initial = await stats();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false'); assert.equal((await data()).features.length, 0); assert(await fit.isDisabled());
  await toggle.click(); const guide26 = await expectRunway('26'); await fit.click(); await expectRendered();
  assert.equal(await panel.getByRole('button', { name: 'Follow', exact: true }).getAttribute('aria-pressed'), 'false');
  await unchanged(initial);
  await panel.locator('#airport-play-runway').selectOption('08'); await expectRunway('08');
  // Without an active EDFE flight, another selected airport has no invented guide.
  await panel.locator('.practice-map-airports > summary').click(); await panel.getByLabel('Search airports').fill('EDDF');
  await panel.locator('.practice-map-airport-list button').filter({ hasText: /^EDDF ·/ }).first().click();
  await page.waitForFunction(async () => !(await window.circuitMap.getSource('practice-circuit').getData()).features.length);
  assert(await fit.isDisabled()); assert.equal(await panel.locator('.practice-map-circuit-label').count(), 0);
  await panel.getByLabel('Search airports').fill('EDFE'); await panel.locator('.practice-map-airport-list button').filter({ hasText: /^EDFE ·/ }).first().click();
  await panel.locator('.practice-map-airports > summary').click(); await expectRunway('08');
  await scene.focus(); await page.keyboard.press('m'); await page.keyboard.press('m'); await activate();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true', 'guide preference survives map hide/show'); await expectRunway('08'); await unchanged(initial);
  await panel.locator('#airport-play-runway').selectOption('26'); await panel.locator('#airport-play-start').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying' && window.circuitStates.at(-1)?.step > 90 && window.circuitStates.at(-1)?.heading_rad > Math.PI, null, { timeout: 60000 });
  await scene.focus(); await page.keyboard.press('Space'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await activate(); await panel.locator('#airport-play-runway').selectOption('08'); await expectRunway('26');
  assert.match(await panel.locator('.practice-map-circuit-readout').textContent(), /EDFE 26.*Right-hand/);
  const frozen26 = await stats(); await fit.click(); await unchanged(frozen26);
  await panel.locator('#airport-play-start').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying' && window.circuitStates.at(-1)?.step > 90 && window.circuitStates.at(-1)?.heading_rad < Math.PI, null, { timeout: 60000 });
  await scene.focus(); await page.keyboard.press('Space'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await activate(); await expectRunway('08'); const frozen08 = await stats(); await fit.click(); await expectRendered();
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/practice-circuit-live.png', import.meta.url)) });
  await toggle.click(); assert.equal((await data()).features.length, 0); assert.equal(await panel.locator('.practice-map-circuit-label').count(), 0);
  await toggle.click(); await expectRunway('08'); await unchanged(frozen08);
  await scene.focus(); await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await expectRunway('08');
  const downloading = page.waitForEvent('download'); await page.locator('#review-save').click();
  const download = await downloading, saved = JSON.parse(await readFile(await download.path(), 'utf8'));
  const leg = id => guide26.features.find(f => f.properties.id === id);
  const midpoint = item => [(item.geometry.coordinates[0][0] + item.geometry.coordinates[1][0]) / 2, (item.geometry.coordinates[0][1] + item.geometry.coordinates[1][1]) / 2];
  const positions = ['upwind', 'downwind', 'final'].map(id => midpoint(leg(id)));
  const synthetic = { ...saved, context: { ...saved.context, runway: '26' }, samples: positions.map(([lon, lat], i) => ({
    ...saved.samples[Math.min(i, saved.samples.length - 1)], state: { ...saved.samples[Math.min(i, saved.samples.length - 1)].state,
      step: i * 120, t_s: i, lat_rad: lat * Math.PI / 180, lon_rad: lon * Math.PI / 180 },
  })) };
  const load = async recording => {
    await page.locator('#recording-file').setInputFiles({ name: 'synthetic-circuit-review.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recording)) });
    await page.waitForFunction(() => document.querySelector('#recording-file').value === '');
    assert.match(await page.locator('#notice').textContent(), /^Loaded recording/);
  };
  await load(synthetic); await expectRunway('26');
  assert.match(await panel.locator('.practice-map-circuit-readout').textContent(), /Nearest guide leg: Upwind.*0 m/);
  await page.locator('#review-time').evaluate(input => { input.value = '1'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('.practice-map-circuit-readout').textContent.includes('Nearest guide leg: Downwind'));
  assert.deepEqual(await page.evaluate(() => window.circuitMap.getFilter('practice-circuit-nearest')), ['==', ['get', 'id'], 'downwind']);
  await activate(); await fit.click(); await expectRendered(); await unchanged(frozen08);
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/practice-circuit-review.png', import.meta.url)) });
  const unknown = { ...synthetic }; delete unknown.context; await load(unknown);
  await page.waitForFunction(async () => !(await window.circuitMap.getSource('practice-circuit').getData()).features.length);
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true'); assert.equal(await panel.locator('.practice-map-circuit-label').count(), 0);
  assert.match(await panel.locator('.practice-map-circuit-readout').textContent(), /recording runway unknown/); await unchanged(frozen08);
  await page.locator('#review-exit').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused'); await expectRunway('08');
  // Exercise the public map boundary with invalid position while suppressing
  // host repaint calls briefly. This changes no native input or source trace.
  await page.evaluate(() => {
    const controller = window.circuitController; window.restoreCircuitUpdate = controller.update;
    controller.update = () => {};
    window.restoreCircuitUpdate({ ...window.circuitStates.at(-1), lat_rad: NaN }, [], 'live');
  });
  assert.equal((await data()).features.length, 0); assert.equal(await panel.locator('.practice-map-circuit-label').count(), 0);
  assert.match(await panel.locator('.practice-map-circuit-readout').textContent(), /aircraft position unknown/);
  await page.evaluate(() => {
    window.circuitController.update = window.restoreCircuitUpdate;
    window.circuitController.update(window.circuitStates.at(-1), [], 'live');
  });
  await expectRunway('08'); await unchanged(frozen08);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(180); await activate();
  await panel.locator('#map-overlap').click(); await fit.click(); await expectRendered(); await expectRunway('08'); await unchanged(frozen08);
  assert((await panel.boundingBox()).width <= 390);
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/practice-circuit-mobile.png', import.meta.url)) });
  assert.deepEqual(errors, []);
  // Optional manual product capture; CI remains independent of live services.
  if (process.env.CAPTURE_PUBLIC_CIRCUIT === '1') {
    const publicPage = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
    try {
      await publicPage.route('**/src/practice-map.ts*', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('map = new LibreMap({', 'map = window.publicCircuitMap = new LibreMap({') });
      });
      await publicPage.goto(origin); await publicPage.waitForFunction(() => !document.querySelector('#start').disabled);
      await prepareFlightUI(publicPage, { controls: false });
      await publicPage.locator('#scene').focus(); await publicPage.keyboard.press('m');
      const publicMap = publicPage.locator('#practice-map-panel');
      await publicPage.waitForFunction(() => window.publicCircuitMap?.getSource('practice-circuit'));
      await publicMap.locator('.practice-map-heading').click();
      await publicMap.getByRole('button', { name: 'Circuit guide', exact: true }).click();
      await publicMap.getByRole('button', { name: 'Fit circuit', exact: true }).click();
      await publicPage.waitForFunction(() => window.publicCircuitMap?.isSourceLoaded('basemap') && document.querySelector('.practice-map-status').hidden, null, { timeout: 20000 });
      const header = await publicMap.locator('.practice-map-heading').boundingBox();
      await publicPage.mouse.move(header.x + header.width - 65, header.y + header.height / 2); await publicPage.mouse.wheel(0, -3000);
      await publicPage.waitForFunction(() => document.querySelector('#practice-map-panel').scrollTop === 0);
      await publicPage.screenshot({ path: fileURLToPath(new URL('../../output/flight/practice-circuit-public.png', import.meta.url)) });
      console.log('Public-map product capture saved.');
    } catch (error) { console.log(`Public-map capture unavailable: ${error.message}`); }
    finally { await publicPage.close(); }
  }
  console.log(JSON.stringify({ result: 'pass', checks: [
    'off-default dashed MapLibre circuit vertices and directional labels render with fit/follow and paused native invariance',
    'pre-start runway selection, other-airport unavailability and map hide/show retain honest guide context',
    'real EDFE26/08 starts override the selector with actual practice context',
    'synthetic imported Review positions select/highlight their own nearest guide leg; legacy unknown context clears the guide',
    'invalid map state clears lines/labels/nearest, and mobile guide remains bounded without native changes',
  ], browser: browser.version() }, null, 2));
} finally { await browser?.close(); server.kill(); }
