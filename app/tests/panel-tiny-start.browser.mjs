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
  const full = { width: 720, height: 715 };
  const geometry = page => page.evaluate(() => {
    const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return { surface: box('.instruments'), viewport: box('.cockpit-viewport'),
      deckHeight: document.querySelector('.flight-app').style.getPropertyValue('--deck-height') };
  });
  const fitted = page => page.waitForFunction(() => {
    const viewport = document.querySelector('.cockpit-viewport')?.getBoundingClientRect();
    const surface = document.querySelector('.instruments')?.getBoundingClientRect();
    return viewport && surface && viewport.width > 600 && viewport.height > 100 && surface.width > 400 && surface.height > 100;
  }, null, { timeout: 10000 });
  const assertFitted = (label, g) => {
    assert(g.surface.y >= g.viewport.y - 1 && g.surface.y < g.viewport.bottom, `${label}: fitted panel is inside its viewport ${JSON.stringify(g)}`);
    assert(g.surface.x >= -1 && g.surface.right <= full.width + 1, `${label}: panel fits the window width ${JSON.stringify(g)}`);
  };
  const open = async viewport => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.stack ?? String(error)));
    await installSceneryFixture(page); await page.goto(origin);
    await page.waitForSelector('.cockpit-fitted'); await page.waitForTimeout(1200);
    return { context, page, errors };
  };
  // Cold starts at real one-pixel sizes (a 0 override would disable emulation).
  for (const [label, width, height] of [['1×1', 1, 1], ['1-pixel width', 1, 715], ['1-pixel height', 720, 1]]) {
    const { context, page, errors } = await open({ width, height });
    await page.setViewportSize(full); await fitted(page);
    assertFitted(`${label} start`, await geometry(page));
    assert.deepEqual(errors, [], `${label} start: no page errors`);
    console.log(`Panel fitted after a ${label} start.`);
    await context.close();
  }
  // Collapse and restore to the same size: the fit must not keep the tiny layout.
  const { context, page, errors } = await open(full);
  await fitted(page);
  const reference = await geometry(page);
  for (const [label, width, height] of [['1×1', 1, 1], ['1-pixel width', 1, 715], ['8-pixel width', 8, 715], ['1-pixel height', 720, 1]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(400);
    await page.setViewportSize(full); await fitted(page); await page.waitForTimeout(200);
    const g = await geometry(page);
    assertFitted(`${label} collapse`, g);
    assert(Math.abs(g.viewport.height - reference.viewport.height) < .5 && g.deckHeight === reference.deckHeight,
      `${label} collapse restores the original fit ${JSON.stringify({ reference, g })}`);
    console.log(`Panel restored after a ${label} collapse.`);
  }
  assert.deepEqual(errors, [], 'collapse and restore: no page errors');
  await context.close();
  console.log('Tiny-start cockpit panel regression passed.');
} finally {
  await browser?.close();
  server.kill();
}
