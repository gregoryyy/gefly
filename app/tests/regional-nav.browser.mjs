// Browser integration: real regional catalogue, panel controls and instrument flags.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5211';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import {createServer} from 'vite'; const s=await createServer({server:{host:'127.0.0.1',port:5211,strictPort:true,hmr:false}}); await s.listen();`], { cwd: app, stdio: 'pipe' });
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); if (i === 99) throw Error('Vite did not start'); }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin);
  const info = await page.evaluate(async () => {
    const nav = await import('/src/radio-nav.ts');
    const { createRadioNavPanel } = await import('/src/radio-nav-panel.ts');
    const { createNavigationGauges } = await import('/src/navigation-gauges.ts');
    const data = await (await fetch('/navdata/rhein-main-v1.json')).json(); nav.setNavigationCatalogue(data);
    document.body.innerHTML = '<div id="panel"></div><div id="gauges"></div>';
    const loc = data.records.find(r => r.kind === 'LOC' && r.gs && r.airport === 'EDDF');
    const d = Math.PI / 180, distance = .08, course = loc.front_course_true_deg * d;
    const state = { ...nav.DEFAULT_RADIO_NAV, step: 1, heading_rad: 0,
      lat_rad: (loc.gs.lat_deg - distance * Math.cos(course)) * d,
      lon_rad: (loc.gs.lon_deg - distance * Math.sin(course) / Math.cos(loc.gs.lat_deg * d)) * d,
      alt_msl_m: loc.gs.elevation_m + distance * 111195 * Math.tan(loc.gs.angle_deg * d), prop_radps: 0 };
    let config = { ...nav.DEFAULT_RADIO_NAV };
    const panel = createRadioNavPanel({ container: document.querySelector('#panel'), onChange: c => { config = c; panel.update({ ...state, ...c }, false, true); gauges.update({ ...state, ...c }, false, true); }, onOpen() {}, onClose() {} });
    const gauges = createNavigationGauges({ container: document.querySelector('#gauges'), onObs() {}, onOpen() {}, onClose() {} });
    panel.update({ ...state, ...config }, false, true); gauges.update({ ...state, ...config }, false, true);
    window.navTest = { panel, gauges, state, get config() { return config; }, loc };
    return { id: loc.id, freq: loc.frequency_khz, name: loc.name };
  });
  await page.locator('#nav-stations-open').click();
  assert.match(await page.locator('.nav-stations-dialog').innerText(), /HISTORICAL, NOT CURRENT/);
  const row = page.locator('.nav-station').filter({ hasText: info.name }).first();
  await row.getByRole('button', { name: new RegExp(`to NAV1 standby$`) }).click();
  assert.equal(await page.evaluate(() => window.navTest.config.radio_nav_standby_khz), info.freq);
  assert.notEqual(await page.evaluate(() => window.navTest.config.radio_nav_active_khz), info.freq);
  await row.getByRole('button', { name: new RegExp(`to NAV2 standby$`) }).click();
  assert.equal(await page.evaluate(() => window.navTest.config.radio_nav2_standby_khz), info.freq);
  await page.locator('.nav-stations-close').click();
  await page.locator('#nav1-swap').click(); await page.locator('#nav2-swap').click();
  assert.equal(await page.locator('#nav1-gauge').getAttribute('data-station-kind'), 'LOC');
  assert.equal(await page.locator('#nav2-gauge').getAttribute('data-station-kind'), 'LOC');
  assert.equal(await page.locator('#nav1-gauge').getAttribute('data-gs-valid'), 'true');
  assert.equal(await page.locator('#nav2-gauge').getAttribute('data-gs-valid'), 'false');
  assert.equal(await page.locator('#nav1-gauge .nav-gs-flag').getAttribute('hidden'), '');
  assert.notEqual(await page.locator('#nav1-gauge .nav-to-from-symbol').getAttribute('hidden'), null);
  assert.equal(await page.locator('#bearing-gauge').getAttribute('data-valid'), 'false');
  await page.evaluate(() => { const t = window.navTest; t.panel.update({ ...t.state, ...t.config }, true, true); t.gauges.update({ ...t.state, ...t.config }, true, true); });
  assert(await page.locator('#nav1-swap').isDisabled());
  await page.locator('#nav-stations-open').click();
  assert(await page.locator('.nav-station button').first().isDisabled());
  assert.equal(await page.locator('#nav1-gauge').getAttribute('data-gs-valid'), 'true');
  console.log('Regional NAV browser: standby and swap on both receivers, LOC/GS/bearing flags and read-only Review passed');
} finally { await browser?.close(); server.kill(); }
