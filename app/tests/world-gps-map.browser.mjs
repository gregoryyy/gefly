// Actual working-app map/editor/native regression; cartography is a fixture.
// This integration awaits the separate full map-UX publication slice.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5355';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/world-gps-map-vite',server:{host:'127.0.0.1',port:5355,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', data => { log += data; }); server.stderr.on('data', data => { log += data; });
const result = { checks: [], errors: [] };
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  page.on('pageerror', error => result.errors.push(String(error)));
  await page.addInitScript(() => {
    localStorage.setItem('gefly.flight-location.v1', JSON.stringify({ version: 1, mode: 'airborne',
      lat_rad: 48.8566 * Math.PI / 180, lon_rad: 2.3522 * Math.PI / 180, alt_msl_m: 1200, heading_rad: 0 }));
    const Native = window.Worker;
    window.gpsMessages = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.gpsWorker = this;
        this.addEventListener('message', ({ data }) => { if (['state', 'stats', 'error'].includes(data.type)) gpsMessages.push(data); });
      }
    };
  });
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), text = await response.text();
    assert(text.includes('map = new LibreMap({'));
    await route.fulfill({ response, body: text.replace('map = new LibreMap({',
      'window.worldGpsSnapshot = () => planStore.getSnapshot(); map = window.worldGpsMap = new LibreMap({') });
  });
  await installSceneryFixture(page);
  await page.route('**/scenery/**/*.pbf', route => route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) }));
  await page.route('**/scenery/elevation/copernicus/**', route => route.fulfill({ status: 503, body: 'optional source unavailable in fixture' }));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => gpsMessages.some(message => message.type === 'state') && !document.querySelector('#start').disabled, null, { timeout: 60000 });
  const stats = async () => {
    const count = await page.evaluate(() => gpsMessages.length);
    await page.evaluate(() => gpsWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => gpsMessages.slice(count).some(message => message.type === 'stats'), count);
    return page.evaluate(count => gpsMessages.slice(count).find(message => message.type === 'stats'), count);
  };
  await page.locator('#scene').focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => gpsMessages.filter(message => message.type === 'state').at(-1)?.kap_engaged === 1);
  const baseline = await stats();
  const channels = () => page.locator('#com1-active,#com2-active,#nav1-active,#nav2-active').allTextContents();
  const beforeChannels = await channels();
  assert.equal(beforeChannels.length, 4, 'all active radio displays are observed');
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  const map = page.locator('#practice-map-panel'); await map.waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.worldGpsMap && worldGpsMap.loaded());
  await map.getByRole('button', { name: 'Fit path', exact: true }).click();
  const rightClick = async ([lon, lat], action) => {
    await page.evaluate(([lon, lat]) => worldGpsMap.jumpTo({ center: [lon, lat], zoom: 9 }), [lon, lat]);
    const point = await page.evaluate(([lon, lat]) => { const p = worldGpsMap.project([lon, lat]); return { x: p.x, y: p.y }; }, [lon, lat]);
    const bounds = await map.locator('.maplibregl-canvas').boundingBox();
    await page.mouse.click(bounds.x + point.x, bounds.y + point.y, { button: 'right' });
    const popup = map.locator('.maplibregl-popup'); await popup.waitFor({ state: 'visible' });
    await popup.getByRole('button', { name: action, exact: true }).click();
  };
  await rightClick([2.3522, 48.8566], 'Create GPS fix');
  assert.equal(await page.evaluate(() => worldGpsSnapshot().fixes.length), 1);
  let snapshot = await page.evaluate(() => worldGpsSnapshot());
  assert(Math.abs(snapshot.fixes[0].lon_deg - 2.3522) < .01);
  assert(Math.abs(snapshot.fixes[0].lat_deg - 48.8566) < .01);
  assert.equal(snapshot.fixes[0].anonymous, true);
  result.checks.push('trusted right-click in Paris creates an anonymous GPS fix outside the former region');
  await rightClick([-4.4861, 48.3904], 'Add waypoint');
  snapshot = await page.evaluate(() => worldGpsSnapshot());
  assert.equal(snapshot.fixes.length, 2); assert.equal(snapshot.waypoints.length, 1);
  assert(snapshot.waypoints[0].lon_deg < 0);
  result.checks.push('trusted right-click in western France atomically creates a fix and route waypoint');
  await page.locator('#scene').focus(); await page.keyboard.press('p');
  const planner = page.locator('#flight-plan-overlay .map-flight-plan'); await planner.waitFor({ state: 'visible' });
  await planner.getByLabel('GPS fix name', { exact: true }).fill('Cape test');
  await planner.getByLabel('Latitude °N', { exact: true }).fill('-33.9249');
  await planner.getByLabel('Longitude °E', { exact: true }).fill('18.4241');
  await planner.getByRole('button', { name: 'Create GPS fix', exact: true }).click();
  snapshot = await page.evaluate(() => worldGpsSnapshot());
  assert.equal(snapshot.fixes.length, 3); assert.equal(snapshot.fixes[2].name, 'Cape test');
  const cape = planner.locator('li[data-fix-id="USER-0003"]');
  assert.match(await cape.textContent(), /33\.92490°\s*S/);
  await cape.getByRole('button', { name: 'GPS target', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#map-gps-readout').textContent.includes('USER-0003'));
  result.checks.push('manual southern-hemisphere entry and GPS direct-to readout accept worldwide coordinates');
  const beforeInvalid = await page.evaluate(() => JSON.stringify(worldGpsSnapshot()));
  await planner.getByLabel('Latitude °N', { exact: true }).fill('91');
  await planner.getByRole('button', { name: 'Create GPS fix', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.stringify(worldGpsSnapshot())), beforeInvalid);
  assert(await planner.getByRole('alert').isVisible());
  result.checks.push('invalid worldwide coordinates leave fixes, route and selection unchanged');
  const after = await stats();
  assert.equal(after.step, baseline.step); assert.equal(after.digest, baseline.digest);
  assert.deepEqual(after.final_state, baseline.final_state); assert.deepEqual(await channels(), beforeChannels);
  assert.equal(await page.evaluate(() => gpsMessages.filter(message => message.type === 'state').at(-1).kap_engaged), 1);
  assert.deepEqual(await page.evaluate(() => gpsMessages.filter(message => message.type === 'error')), []);
  assert.deepEqual(result.errors, []);
  result.checks.push('paused native pose, full state, digest, AP engagement and active radio frequencies remain unchanged');
  result.final = { step: after.step, digest: after.digest, fixes: snapshot.fixes.length };
  result.wasm_sha256 = createHash('sha256').update(await readFile(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))).digest('hex');
  result.limits = ['Working-app integration only; the separate source/editor PR does not publish complete map UI wiring.',
    'Cartography and optional elevation service failures are fixtures; no new source coverage or aircraft fidelity accepted.'];
  await page.screenshot({ path: `${output}/world-gps-map.png` });
  await writeFile(`${output}/world-gps-map.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(`Worldwide GPS working-app regression: ${result.checks.length} groups passed; native state unchanged.`);
} finally { await browser?.close(); server.kill(); }
