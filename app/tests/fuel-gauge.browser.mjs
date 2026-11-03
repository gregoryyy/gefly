import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
// Actual JSBSim quantity display plus isolated presentation reference cases.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5205';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5205,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; }); server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [];
const assertReadoutRows = async (page, context) => {
  const rows = await page.locator('.engine-secondary-readouts > div').evaluateAll(elements => elements.map(row => {
    const box = row.getBoundingClientRect();
    const parts = [...row.children].map(part => {
      const range = document.createRange(); range.selectNodeContents(part);
      const rect = part.getBoundingClientRect();
      return { text: part.textContent, lines: range.getClientRects().length, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, parts, overflow: row.scrollWidth > row.clientWidth + 1 };
  }));
  assert.deepEqual(rows.map(row => row.parts[0].text), ['OIL PRESS', 'OIL TEMP', 'FUEL FLOW', 'EXHST GAS'], `${context}: complete single-line labels`);
  for (const row of rows) {
    assert(row.parts.every(part => part.lines === 1), `${context}: each label, reading and unit stays on one line`);
    assert(Math.min(...row.parts.map(part => part.bottom)) > Math.max(...row.parts.map(part => part.top)), `${context}: label, reading and unit occupy the same row`);
    assert(row.parts[0].right <= row.parts[1].left + 1 && row.parts[1].right <= row.parts[2].left + 1, `${context}: label, value and unit do not overlap`);
    assert(!row.overflow && row.parts.every(part => part.left >= row.left - 1 && part.right <= row.right + 1), `${context}: readouts fit their row`);
  }
  return rows;
};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, serverOutput); await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = Worker; window.fuelStates = []; window.fuelStats = [];
    window.Worker = class extends Native {
      constructor(...args) { super(...args); if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.fuelWorker = this; this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.fuelStates.push(data); if (data.type === 'stats') window.fuelStats.push(data);
        }); }
    };
  });
  await installSceneryFixture(page); await page.goto(origin); await page.waitForFunction(() => !document.querySelector('#start').disabled && Number.isFinite(window.fuelStates.at(-1)?.fuel_left_m3));
  await prepareFlightUI(page);
  const actual = await page.evaluate(() => window.fuelStates.at(-1));
  const capacity = await page.evaluate(async () => (await import('/src/c172x-instrument-references.ts')).C172X_TANK_CAPACITY_M3);
  const stats = async () => {
    const count = await page.evaluate(() => window.fuelStats.length);
    await page.evaluate(() => window.fuelWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.fuelStats.length > count, count); return page.evaluate(() => window.fuelStats.at(-1));
  };
  const before = await stats();
  for (const side of ['left', 'right']) {
    const quantity = actual[`fuel_${side}_m3`];
    assert.equal(Number(await page.locator(`#engine-fuel-${side}-needle`).getAttribute('data-quantity-m3')), quantity);
    assert(Math.abs(Number(await page.locator(`#engine-fuel-${side}-needle`).getAttribute('data-fraction')) - quantity / capacity) < 1e-12);
    assert.equal(await page.locator(`#engine-fuel-${side}`).textContent(), (quantity / .003785411784).toFixed(1));
  }
  const heights = await page.evaluate(() => ['throttle', 'mixture-control'].map(id => document.getElementById(id).getBoundingClientRect().height));
  assert.equal(heights[0], heights[1], 'power levers share the same travel');
  await page.locator('#scene').focus(); await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#engine-switch').textContent.includes('OFF'));
  assert.equal((await stats()).step, before.step, 'paused E stages a command without advancing physics');
  await page.locator('#engine-switch').click();
  await page.waitForFunction(() => document.querySelector('#engine-switch').textContent.includes('ON'));
  assert.equal(await page.locator('#engine-running').textContent(), 'RUN');
  await assertReadoutRows(page, 'desktop cockpit');
  await page.screenshot({ path: `${output}/engine-panel-reference.png` });
  checks.push('actual native L/R quantities and model capacity drive both needles and US-gallon readouts; equal power travel and paused E remain operable');

  const fixture = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fixture.route(`${origin}/fuel-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="fixture"></div>' }));
  await fixture.goto(`${origin}/fuel-fixture.html`);
  await fixture.evaluate(async state => {
    const { createEnginePanel } = await import('/src/engine-panel.ts');
    window.fixtureState = state; window.fuelCallbacks = { engine: 0, mixture: 0 };
    window.fuelPanel = createEnginePanel({ container: document.querySelector('#fixture'), onEngine() { window.fuelCallbacks.engine++; },
      onMixture() { window.fuelCallbacks.mixture++; }, onOpen() {}, onClose() {} });
  }, actual);
  const present = async (left, right, recorded = false) => fixture.evaluate(({ left, right, recorded }) => {
    window.fuelPanel.update({ ...window.fixtureState, fuel_left_m3: left, fuel_right_m3: right }, recorded, true);
    const svg = document.querySelector('#engine-fuel-gauge');
    return { available: svg.dataset.available, recorded: svg.dataset.recorded, title: document.querySelector('#engine-fuel-title').textContent,
      flag: document.querySelector('#engine-fuel-flag').textContent, left: document.querySelector('#engine-fuel-left-needle').dataset.fraction,
      right: document.querySelector('#engine-fuel-right-needle').dataset.fraction,
      leftTransform: document.querySelector('#engine-fuel-left-needle').getAttribute('transform'),
      rightTransform: document.querySelector('#engine-fuel-right-needle').getAttribute('transform'),
      leftLow: !document.querySelector('#engine-fuel-left-low').hidden,
      rightLow: !document.querySelector('#engine-fuel-right-low').hidden };

  }, { left, right, recorded });
  const full = await present(capacity, capacity); assert.equal(full.left, '1'); assert.equal(full.right, '1'); assert.equal(full.flag, '');
  assert.equal(full.leftLow, false); assert.equal(full.rightLow, false);
  assert.equal(await fixture.locator('.fuel-low-zone').count(), 2);
  assert.equal(await fixture.locator('.fuel-low-marker').count(), 2);
  assert.equal(await fixture.locator('.fuel-low-label').allTextContents().then(text => text.join(',')), 'LOW');
  const boundary = await present(capacity * .25, capacity * .250001);
  assert.equal(boundary.leftLow, true, 'lower-quarter boundary includes the exact quarter-tank quantity');
  assert.equal(boundary.rightLow, false, 'quantity immediately above the reference is not marked low');
  const below = await present(capacity * .249999, capacity * .1);
  assert.equal(below.leftLow, true); assert.equal(below.rightLow, true);
  assert.match(below.title, /left LOW.*right LOW/);
  assert.match(await fixture.locator('#engine-fuel-description').textContent(), /display reference, not an aircraft low-fuel warning/);
  await fixture.screenshot({ path: `${output}/engine-panel-low-reference.png` });

  const unequal = await present(capacity / 4, capacity * .75); assert.equal(unequal.left, '0.25'); assert.equal(unequal.right, '0.75');
  assert.equal(unequal.leftTransform, 'rotate(-35 44 50)'); assert.equal(unequal.rightTransform, 'rotate(-35 56 50)');
  const orientation = await fixture.evaluate(() => {
    const labels = [...document.querySelectorAll('.fuel-labels text')].filter(label => ['L', 'R'].includes(label.textContent));
    const left = document.querySelector('.fuel-left-scale').getBBox(), right = document.querySelector('.fuel-right-scale').getBBox();
    const bounds = [...document.querySelectorAll('.fuel-dial path,.fuel-dial text,.fuel-dial circle')].map(element => {
      const box = element.getBBox(); return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height };
    });
    return { scales: { left: { x: left.x, y: left.y, width: left.width, height: left.height }, right: { x: right.x, y: right.y, width: right.width, height: right.height } }, bounds, labels: labels.map(label => {
      const box = label.getBoundingClientRect(), matrix = label.getCTM(); return { label: label.textContent, x: box.x, b: matrix.b, c: matrix.c, a: matrix.a, d: matrix.d };
    }) };
  });
  const { left: leftScale, right: rightScale } = orientation.scales;
  assert(Math.abs(leftScale.x - (100 - rightScale.x - rightScale.width)) < 1e-5 && Math.abs(leftScale.y - rightScale.y) < 1e-5
    && Math.abs(leftScale.width - rightScale.width) < 1e-5 && Math.abs(leftScale.height - rightScale.height) < 1e-5, 'fuel scales are exactly mirrored around the dial center');
  assert(orientation.bounds.every(box => box.x >= 0 && box.y >= 0 && box.right <= 100 && box.bottom <= 100), 'fuel scale, labels and base needle geometry stay inside the SVG');
  assert(orientation.bounds.filter(box => box.right > box.x && box.bottom > box.y).every(box =>
    [[box.x, box.y], [box.right, box.y], [box.x, box.bottom], [box.right, box.bottom]].every(([x, y]) => Math.hypot(x - 50, y - 50) <= 48)),
  'fuel marker and label bounding-box corners stay inside the circular bezel');
  assert(orientation.labels[0].x < orientation.labels[1].x, 'L is left and R is right');
  assert(orientation.labels.every(label => Math.abs(label.b) < 1e-6 && Math.abs(label.c) < 1e-6 && label.a > 0 && label.d > 0), 'rotated fuel labels remain upright');
  assert(await fixture.locator('.engine-switch-row').evaluate(row => row.previousElementSibling.classList.contains('engine-power-controls')), 'engine switch and actual RUN are below the power levers');
  const empty = await present(0, 0); assert.equal(empty.left, '0'); assert.equal(empty.right, '0'); assert.equal(empty.leftLow, true); assert.equal(empty.rightLow, true);
  const recorded = await present(capacity * .75, capacity / 4, true); assert.equal(recorded.recorded, 'true'); assert.match(recorded.title, /Recorded model tank contents/); assert.equal(recorded.leftLow, false); assert.equal(recorded.rightLow, true);
  assert(await fixture.locator('#engine-switch').isDisabled()); assert(await fixture.locator('#mixture-control').isDisabled());
  await fixture.locator('#engine-switch').evaluate(button => button.click()); assert.deepEqual(await fixture.evaluate(() => window.fuelCallbacks), { engine: 0, mixture: 0 });
  const over = await present(capacity * 1.2, capacity / 2); assert.equal(over.flag, 'OVR'); assert.equal(over.left, '1');
  await fixture.evaluate(() => window.fuelPanel.update({ ...window.fixtureState, fuel_left_m3: undefined }, false, true));
  assert.equal(await fixture.locator('#engine-fuel-gauge').getAttribute('data-available'), 'false');
  assert.equal(await fixture.locator('#engine-fuel-flag').textContent(), 'INOP');
  assert.equal(await fixture.locator('#engine-fuel-left').textContent(), '—');
  assert(await fixture.locator('#engine-fuel-left-low').evaluate(element => element.hidden));
  assert(await fixture.locator('#engine-fuel-right-low').evaluate(element => element.hidden));
  assert.equal(await fixture.locator('#engine-fuel-gauge').getAttribute('data-left-low'), '');
  assert.equal(await fixture.locator('#engine-fuel-gauge').getAttribute('data-right-low'), '');
  await present(capacity * .5, capacity * .5);
  await assertReadoutRows(fixture, 'standalone engine panel');
  checks.push('mirrored lower-quarter reference arcs and markers; independent LOW badges handle exact boundary, above/below, empty, recorded and unavailable quantities without claiming reserves');

  checks.push('controlled full/empty/unequal quantities give independent reference angles; recorded controls are read-only, overrange is marked and missing fuel is INOP');
  await fixture.evaluate(() => window.fuelPanel.dispose());
  assert.equal(await fixture.locator('#fixture').evaluate(element => element.childElementCount), 0); assert.equal(await fixture.locator('#engine-dialog').count(), 0); await fixture.close();

  await page.setViewportSize({ width: 390, height: 568 }); await page.locator('#engine-open').click();
  await page.locator('#engine-dialog').waitFor({ state: 'visible' });
  assert(await page.locator('#engine-fuel-gauge').isVisible());
  await assertReadoutRows(page, 'mobile engine dialog');
  const box = await page.locator('#engine-fuel-gauge').boundingBox(); assert(box.x >= 0 && box.x + box.width <= 390);
  await page.screenshot({ path: `${output}/fuel-gauge-mobile.png` }); await page.screenshot({ path: `${output}/engine-panel-mobile.png` }); await page.locator('#engine-close').click();
  const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  assert.deepEqual(errors, []);
  checks.push('mobile engine dialog retains the round fuel display and clean disposal; presentation and staged controls leave native physics unchanged');
  await writeFile(`${output}/fuel-gauge-browser.json`, JSON.stringify({ checks, actual, capacity_m3: capacity }, null, 2) + '\n');
  console.log(JSON.stringify({ checks }, null, 2));
} finally { await browser?.close(); server.kill(); }
