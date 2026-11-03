// Capture the actual app, public scenery and native flight; no fixtures or source rewriting.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5244';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5244', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }), failures = [];
  page.on('pageerror', e => console.error(String(e)));
  page.on('console', e => { if (e.type() === 'error') console.error(e.text()); });
  page.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure()?.errorText }));
  await page.addInitScript(() => {
    const Native = Worker;
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (String(args[0]).includes('/sim/worker.js')) this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.captureState = data; });
    } };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled, null, { timeout: 90000 });
  await page.locator('#scene').focus(); await page.keyboard.press('o');
  await page.locator('#controls-settings').click(); await page.locator('#centered-touchpad').check(); await page.locator('#settings-close').click();
  await page.locator('#scene').focus(); await page.keyboard.press('v'); await page.keyboard.press('a');
  await page.keyboard.press('m');
  await page.locator('#start').click();
  await page.locator('#scene').focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Equal');
  await page.waitForFunction(() => window.captureState?.t_s > 60, null, { timeout: 90000 });
  // Restore normal pacing before capture.
  await page.keyboard.press('Equal');
  await page.waitForFunction(() => window.captureState?.simulation_rate === 1);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await page.mouse.move(600, 260); await page.mouse.down(); await page.waitForTimeout(350);
  await page.mouse.move(600, 335, { steps: 12 }); await page.mouse.up();
  // Activate the map, then fit the genuine retained trajectory including its start at EDFE.
  await page.locator('.practice-map-toolbar').click({ position: { x: 8, y: 3 } });
  await page.getByRole('button', { name: 'Fit path', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('#practice-map-panel').dataset.pathPoints) > 100);
  // Center explicitly on the sourced airport, with room for the complete short flight.
  await page.locator('.practice-map-airports > summary').click();
  await page.getByLabel('Search airports').fill('EDFE');
  await page.locator('.practice-map-airport-list button').filter({ hasText: 'EDFE' }).click({ timeout: 30000 });
  await page.locator('.practice-map-airports > summary').click();
  await page.getByRole('button', { name: 'Zoom map out', exact: true }).click();
  const mapBox = await page.locator('.maplibregl-canvas').boundingBox();
  await page.mouse.move(mapBox.x + mapBox.width * .65, mapBox.y + mapBox.height * .65);
  await page.mouse.down();
  await page.mouse.move(mapBox.x + mapBox.width * .65 - 120, mapBox.y + mapBox.height * .65, { steps: 15 });
  await page.mouse.up();
  await page.waitForFunction(() => [...document.querySelectorAll('.practice-map-airport-marker')].some(e => e.textContent.includes('EDFE')), null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('.practice-map-trajectory polyline')?.getAttribute('points')?.split(' ').length > 100);
  await page.waitForTimeout(25000);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying');
  await page.keyboard.press('o');
  await page.mouse.move(20, 20);
  await page.waitForTimeout(1000);
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  const evidence = await page.evaluate(() => ({ state: window.captureState,
    imagery: document.querySelector('#scene').dataset.imagery,
    pathPoints: document.querySelector('#practice-map-panel').dataset.pathPoints,
    labels: [...document.querySelectorAll('.practice-map-airport-marker')].map(e => e.textContent),
    status: document.querySelector('#status').textContent }));
  await page.screenshot({ path: fileURLToPath(new URL('../../docs/images/gefly-systems-cockpit-flight-map.png', import.meta.url)) });
  await writeFile(new URL('../../output/flight/readme-latest-panel.json', import.meta.url), JSON.stringify({ ...evidence, failures, browser: browser.version(), viewport: '1920x1080', generated: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); server.kill(); }
