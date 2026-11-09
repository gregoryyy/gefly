import { installSceneryFixture } from './flight-actions.mjs';
// Actual-browser regression: a page that first lays out at a zero or tiny size
// (as editor-embedded browsers do) must not throw and must fit the cockpit
// panel once the window becomes usable. No aircraft fidelity claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5291';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5291', '--strictPort'], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (attempt === 99) throw new Error(`Panel server timed out: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  for (const [label, width, height] of [['0×0', 0, 0], ['zero width', 0, 715], ['zero height', 720, 0], ['1×1', 1, 1]]) {
    const context = await browser.newContext({ viewport: { width: 720, height: 715 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack ?? String(error)));
    await installSceneryFixture(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
    await page.goto(origin);
    await page.waitForSelector('.cockpit-fitted');
    await page.waitForTimeout(1500);
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await page.setViewportSize({ width: 720, height: 715 });
    await page.waitForFunction(() => {
      const viewport = document.querySelector('.cockpit-viewport')?.getBoundingClientRect();
      const surface = document.querySelector('.instruments')?.getBoundingClientRect();
      return viewport && surface && viewport.width > 600 && viewport.height > 100 && surface.width > 400 && surface.height > 100;
    }, null, { timeout: 10000 });
    const geometry = await page.evaluate(() => {
      const box = element => { const r = document.querySelector(element).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
      return { surface: box('.instruments'), viewport: box('.cockpit-viewport') };
    });
    assert(geometry.surface.y >= geometry.viewport.y - 1 && geometry.surface.y < geometry.viewport.bottom,
      `${label}: fitted panel is inside its viewport ${JSON.stringify(geometry)}`);
    assert(geometry.surface.x >= -1 && geometry.surface.right <= 721, `${label}: panel fits the window width ${JSON.stringify(geometry)}`);
    assert.deepEqual(errors, [], `${label}: no page errors`);
    console.log(`Panel recovered after a ${label} start.`);
    await context.close();
  }
  console.log('Tiny-start cockpit panel regression passed.');
} finally {
  await browser?.close();
  server.kill();
}
