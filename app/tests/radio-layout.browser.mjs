import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5242';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5242', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error('Radio layout server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  assert.equal(await page.locator('#nav-demo, .nav-demo').count(), 0);
  const measurements = [];
  for (const width of [1440, 1200, 1024]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(150);
    const geometry = await page.locator('#radio-nav-systems .radio-nav-content').evaluate(content => {
      const box = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
      return { stack: box(content), receivers: [...content.querySelectorAll('.radio-receiver')].map(box),
        stations: box(content.querySelector('#nav-stations-open')),
        controls: [...content.querySelectorAll('input, button')].map(box) };
    });
    assert(Math.abs(geometry.receivers[0].height - geometry.receivers[1].height) < 1, 'receivers share height');
    assert(geometry.stack.bottom - geometry.stations.bottom < 12, 'station button uses bottom of stack');
    for (const r of geometry.controls) assert(r.top >= geometry.stack.top && r.bottom <= geometry.stack.bottom + 1, 'controls fit inside stack');
    measurements.push({ width, ...geometry });
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(150);
  const old = await page.locator('#com1-standby').inputValue();
  await page.locator('#com1-up').click();
  assert.notEqual(await page.locator('#com1-standby').inputValue(), old);
  const tuned = await page.locator('#com1-standby').inputValue(); await page.locator('#com1-swap').click();
  assert.equal(await page.locator('#com1-active').textContent(), Number(tuned).toFixed(3));
  await page.locator('#nav-stations-open').click();
  assert(!/\bLAB\b/.test(await page.locator('.nav-stations-list').innerText()));
  await page.keyboard.press('Escape');
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/radio-layout.png', import.meta.url)), clip: await page.locator('.flight-deck').boundingBox() });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.radio-nav-open').click();
  assert(await page.locator('#radio-nav-dialog').isVisible());
  assert(await page.locator('#com1-standby').isVisible());
  assert.equal(await page.locator('#nav-demo').count(), 0);
  await page.locator('#radio-nav-close').click();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks: ['equal-height receivers fill stack at desktop widths', 'no clipping or LAB controls', 'COM tuning/swap and historical directory work', 'mobile radio dialog remains reachable'], measurements }, null, 2));
} finally { await browser?.close(); server.kill(); }
