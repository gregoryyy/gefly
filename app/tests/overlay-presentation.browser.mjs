import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5227';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5227', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser;
try {
  for (let i = 0; ; i++) {
    if (i === 100 || server.exitCode !== null) throw new Error('Vite did not start');
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage();
  await page.route(origin + '/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await page.goto(origin);
  await page.setContent(`<main id="fixture"><header class="topbar"><button id="cockpit">Cockpit</button><button id="toggle-map">Map</button><button id="reset" disabled>Restart</button><button id="controls-settings">Options</button><button id="eddf-ils-practice">ILS practice</button></header><button id="outside">Outside</button><input id="typing"><dialog id="dialog"><input></dialog><aside id="practice-map-panel"><button id="map-action">Map action</button></aside><aside id="flight-controls-panel"><button id="control-action">Control</button></aside></main>`);
  await page.evaluate(async () => {
    const { createOverlayPresentation } = await import('/src/overlay-presentation.ts');
    const { installMenuShortcuts } = await import('/src/menu-shortcuts.ts');
    window.hits = []; window.activations = 0;
    document.querySelectorAll('button').forEach(button => button.addEventListener('click', () => window.hits.push(button.id)));
    createOverlayPresentation({ root: document.querySelector('#fixture'), title: document.querySelector('.topbar'), onActivate: () => window.activations++ });
    installMenuShortcuts(document.querySelector('#fixture'));
  });
  const opacity = id => page.locator(id).evaluate(element => getComputedStyle(element).opacity);
  assert.equal(await page.locator('.topbar').isVisible(), false);
  assert.equal(await opacity('#practice-map-panel'), '0.5');
  await page.locator('#map-action').click();
  assert.deepEqual(await page.evaluate(() => window.hits), []);
  assert.equal(await opacity('#practice-map-panel'), '1');
  assert.equal(await page.evaluate(() => window.activations), 1);
  await page.locator('#map-action').click();
  assert.deepEqual(await page.evaluate(() => window.hits), ['map-action']);
  await page.locator('#outside').click();
  assert.equal(await opacity('#practice-map-panel'), '0.5');
  await page.evaluate(() => { document.querySelector('#practice-map-panel').innerHTML = '<button id="new-map-action">New action</button>'; document.querySelector('#new-map-action').onclick = () => window.hits.push('new'); });
  await page.locator('#new-map-action').click();
  assert(!await page.evaluate(() => window.hits.includes('new')));
  await page.locator('#new-map-action').click();
  assert(await page.evaluate(() => window.hits.includes('new')));
  await page.locator('#outside').click();
  await page.locator('#outside').focus();
  assert.equal(await opacity('#practice-map-panel'), '0.5');
  await page.keyboard.press('Tab'); // input
  await page.keyboard.press('Tab'); // map button
  assert.equal(await opacity('#practice-map-panel'), '1');
  await page.keyboard.press('i');
  assert(await page.locator('.topbar').isVisible());
  const beforeRemoved = await page.evaluate(() => window.hits.length);
  for (const key of ['M','I','O','R','F','J']) await page.keyboard.press(`Alt+Shift+Key${key}`);
  assert.equal(await page.evaluate(() => window.hits.length), beforeRemoved, 'removed Alt+Shift chords invoke no fixture commands');
  assert.equal(await page.locator('#toggle-map').getAttribute('aria-keyshortcuts'), null);
  assert(await page.locator('.topbar').isVisible(), 'modifier chords do not toggle the title bar');
  await page.locator('#typing').focus();
  await page.keyboard.press('o'); await page.keyboard.press('i');
  assert(await page.locator('.topbar').isVisible());
  assert.equal(await page.locator('#typing').inputValue(), 'oi', 'both shortcut letters remain editable text');
  await page.evaluate(() => document.querySelector('#dialog').showModal());
  await page.keyboard.press('o'); await page.keyboard.press('i');
  assert(await page.locator('.topbar').isVisible());
  const flight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  flight.on('pageerror', error => errors.push(String(error)));
  const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aS8AAAAASUVORK5CYII=', 'base64');
  await flight.route('**/scenery/{map,imagery}/**', route => route.fulfill({ contentType: 'image/png', body: tile }));
  await flight.goto(origin);
  await flight.waitForFunction(() => !document.querySelector('#start').disabled, null, { timeout: 60000 });
  assert.equal(await flight.locator('.topbar').isVisible(), false);
  assert.equal(await flight.locator('#flight-controls-panel').isVisible(), false);
  await flight.locator('#scene').focus();
  await flight.keyboard.press('o');
  await flight.locator('#control-settings').waitFor({ state: 'visible' });
  assert.equal(await flight.locator('.topbar').isVisible(), false, 'O opens Options while the title bar stays hidden');
  assert((await flight.locator('#controls-settings').getAttribute('aria-keyshortcuts')).split(/\s+/).includes('O'));
  assert.equal(await flight.locator('#controls-settings kbd').textContent(), 'O');
  await flight.locator('#settings-close').focus(); await flight.keyboard.press('i'); await flight.keyboard.press('o');
  assert.equal(await flight.locator('.topbar').isVisible(), false, 'an open modal guards both shortcuts');
  await flight.locator('#settings-close').click(); await flight.locator('#scene').focus();
  await flight.evaluate(() => {
    const scene = document.querySelector('#scene');
    for (const key of ['o', 'i']) for (const guard of ['repeat', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      scene.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, code: `Key${key.toUpperCase()}`, [guard]: true }));
    }
  });
  assert.equal(await flight.locator('.topbar').isVisible(), false);
  assert.equal(await flight.locator('#control-settings').isVisible(), false, 'repeat or modifier combinations do not trigger the plain shortcuts');
  await flight.evaluate(() => {
    const editable = document.createElement('input'); editable.id = 'shortcut-typing'; document.querySelector('.flight-app').append(editable); editable.focus();
  });
  await flight.keyboard.press('o'); await flight.keyboard.press('i');
  assert.equal(await flight.locator('#shortcut-typing').inputValue(), 'oi');
  assert.equal(await flight.locator('.topbar').isVisible(), false);
  assert.equal(await flight.locator('#control-settings').isVisible(), false);
  await flight.locator('#shortcut-typing').evaluate(element => element.remove());
  await flight.locator('#scene').focus(); await flight.keyboard.press('i');
  assert(await flight.locator('.topbar').isVisible());
  await flight.keyboard.press('o'); await flight.locator('#control-settings').waitFor({ state: 'visible' });
  assert(await flight.locator('.topbar').isVisible(), 'O does not toggle a visible title bar');
  await flight.locator('#settings-close').click();
  for (const [selector, key] of [['#controls-settings','O'],['#toggle-map',','],['#cycle-landmarks','.'],['#pause','Space']])
    assert.equal(await flight.locator(selector).getAttribute('aria-keyshortcuts'), key);
  for (const selector of ['#reset','#toggle-controls','#handbook-open','#eddf-ils-practice']) {
    assert.equal(await flight.locator(selector).getAttribute('aria-keyshortcuts'), null, `${selector} has no assigned shortcut`);
    assert.equal(await flight.locator(`${selector} kbd`).count(), 0);
  }
  assert.equal(await flight.locator('.topbar [aria-keyshortcuts*="Alt"]').count(), 0);
  assert(!(await flight.locator('.topbar kbd').allTextContents()).some(text => /Alt.*Shift|⌥⇧/.test(text)));
  assert(await flight.locator('#review-flight').isDisabled());
  await flight.keyboard.press('r');
  assert.notEqual(await flight.locator('.flight-app').getAttribute('data-review'), 'true');
  await flight.locator('#view-menu > summary').click();
  assert(await flight.locator('#view-menu').evaluate(e => e.open));
  await flight.keyboard.press('i');
  assert.equal(await flight.locator('#view-menu').evaluate(e => e.open), false);
  assert.equal(await flight.locator('.topbar').isVisible(), false);
  await flight.keyboard.press('i');
  await flight.locator('#start').click();
  await flight.locator('#view-menu > summary').click();
  await flight.locator('#toggle-controls').click();
  assert(await flight.locator('#flight-controls-panel').isVisible());
  assert.equal(await flight.locator('#flight-controls-panel').evaluate(e => getComputedStyle(e).opacity), '0.5');
  const button = flight.locator('#roll-left');
  const box = await button.boundingBox();
  await flight.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await flight.mouse.down();
  await flight.waitForTimeout(150);
  assert.equal(await button.evaluate(e => e.classList.contains('held')), false);
  assert.equal(await flight.locator('#scene').getAttribute('data-pointer-mode'), 'off');
  await flight.mouse.up();
  await flight.mouse.down();
  await flight.waitForFunction(() => document.querySelector('#roll-left').classList.contains('held'));
  await flight.mouse.up();
  await flight.keyboard.press('Space');
  await flight.locator('#scene').focus(); await flight.keyboard.press(',');
  const map = flight.locator('#practice-map-panel');
  await map.waitFor({ state: 'visible' });
  await flight.getByRole('button', { name: 'Zoom map in' }).waitFor({ state: 'visible' });
  await flight.waitForFunction(() => !document.querySelector('[aria-label="Zoom map in"]').disabled, null, { timeout: 60000 });
  const canvas = flight.locator('.maplibregl-canvas');
  await canvas.evaluate(e => { window.mapWheels = 0; e.addEventListener('wheel', () => window.mapWheels++); });
  await canvas.hover({ position: { x: 30, y: 30 } });
  await flight.mouse.wheel(0, -300);
  await flight.waitForTimeout(500);
  assert.equal(await flight.getByRole('button', { name: 'Follow', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await flight.evaluate(() => window.mapWheels), 0);
  await canvas.click({ position: { x: 30, y: 30 } });
  const markersBefore = await flight.locator('.maplibregl-marker').evaluateAll(es => es.map(e => e.style.transform));
  await flight.mouse.wheel(0, -300);
  await flight.waitForTimeout(1500);
  assert.equal(await flight.evaluate(() => window.mapWheels), 1);
  assert.notDeepEqual(await flight.locator('.maplibregl-marker').evaluateAll(es => es.map(e => e.style.transform)), markersBefore, 'active wheel changes map projection');
  await flight.keyboard.press('r');
  await flight.waitForFunction(() => document.querySelector('.flight-app').dataset.review === 'true');
  assert(await flight.locator('#reset').isDisabled());
  assert(await flight.locator('#controls-settings').isDisabled());
  await flight.locator('#scene').focus(); await flight.keyboard.press('i');
  assert.equal(await flight.locator('.topbar').isVisible(), false);
  await flight.keyboard.press('o');
  assert.equal(await flight.locator('#control-settings').isVisible(), false, 'O respects disabled Options during Review');
  assert.equal(await flight.locator('.topbar').isVisible(), false, 'disabled O still never toggles the title bar');
  await flight.keyboard.press('i'); assert(await flight.locator('.topbar').isVisible(), 'I remains a view action in Review');
  await flight.keyboard.press('Alt+Shift+KeyR');
  assert.equal(await flight.locator('.flight-app').getAttribute('data-review'), 'true');
  assert.deepEqual(errors, []);
  console.log('Overlay presentation and integrated flight browser checks passed.');
} finally {
  await browser?.close();
  server.kill();
}
