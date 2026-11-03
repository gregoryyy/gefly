import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
// Actual-browser responsive cockpit geometry; no aircraft fidelity claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5193';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5193', '--strictPort'], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const observations = [];
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (attempt === 99) throw new Error(`Layout server timed out: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack ?? String(error)));
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForSelector('.cockpit-fitted');
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page);
  const geometry = () => page.evaluate(() => {
    const rect = selector => {
      const element = document.querySelector(selector), r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, font: parseFloat(s.fontSize), display: s.display };
    };
    return { width: innerWidth, height: innerHeight, scale: Number(document.querySelector('.flight-app').dataset.cockpitScale),
      deck: rect('.flight-deck'), surface: rect('.instruments'), primary: rect('.primary-instruments'),
      aircraft: rect('.engine-controls'), face: rect('#airspeed'), nav1: rect('#nav1-gauge .navigation-gauge-face'), nav2: rect('#nav2-gauge .navigation-gauge-face'), bearing: rect('#bearing-gauge .navigation-gauge-face'), rpmFace: rect('#rpm-gauge .navigation-gauge-face'), fuel: rect('#engine-fuel-gauge'), pressure: rect('#altimeter-open'), flaps: rect('#flap-control'), trim: rect('#pitch-trim-control'),
      ap: rect('.autopilot-content'), apButton: rect('#ap-engage'), engine: rect('#engine-systems'), radio: rect('#radio-nav-systems'),
      rpm: rect('#engine-rpm'), frequency: rect('#com1-standby'), throttle: rect('#throttle'), mixture: rect('#mixture-control'),
      engineOpen: !document.querySelector('#engine-open').hidden, radioOpen: !document.querySelector('#radio-nav-open').hidden,
      appScroll: document.documentElement.scrollWidth };
  });
  let reference;
  for (const [width, height] of [[1440, 900], [1280, 720], [1200, 800], [901, 800], [900, 800], [880, 800], [621, 800], [620, 844], [390, 844], [1440, 600]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(180);
    const g = await geometry(); observations.push(g);
    reference ??= g;
    assert(g.scale > 0 && g.scale <= 1);
    assert(await page.locator('#altimeter-reference').isVisible(), 'active altimeter pressure reference stays visible');
    assert(g.surface.x >= -1 && g.surface.right <= width + 1, 'entire cockpit surface fits width');
    assert(g.surface.bottom <= height + 1 && g.deck.y >= 179, 'deck fits while preserving scene height');
    assert(g.appScroll <= width, 'no page horizontal overflow');
    for (const key of ['face', 'flaps', 'trim', 'ap']) {
      assert(Math.abs(g[key].height / g.scale - reference[key].height) < 3, `${key} keeps the shared scale at ${width}`);
    }
    assert(Math.abs(g.flaps.height - g.trim.height) < 2, 'paired levers keep matching travel');
    assert(Math.abs(g.flaps.y + g.flaps.height / 2 - g.trim.y - g.trim.height / 2) <= 1, 'paired levers align vertically');
    assert.equal(g.ap.display, 'block', 'autopilot remains inline on narrow screens');
    if (width > 620) {
      assert(Math.abs(g.primary.height - g.aircraft.height) < 2);
    }
    if (width > 900) {
      assert(Math.abs(g.primary.height - g.aircraft.height) < 2);
      assert(Math.abs(g.primary.height - g.engine.height) < 2);
      assert(Math.abs(g.primary.height - g.radio.height) < 2);
      for (const key of ['throttle', 'mixture']) assert(Math.abs(g[key].height / g.scale - reference[key].height) < 3);
      for (const key of ['rpm', 'frequency', 'apButton']) assert(Math.abs(g[key].font - reference[key].font) < .1, `${key} canonical font stays fixed`);
      assert.equal(g.engineOpen, false); assert.equal(g.radioOpen, false);
      assert(g.primary.right <= g.engine.x && g.engine.right <= g.aircraft.x && g.aircraft.right <= g.radio.x, 'engine precedes AP/flaps and radio');
      assert(Math.abs(g.nav1.y - g.nav2.y) < 1 && Math.abs(g.bearing.y - g.rpmFace.y) < 1, 'secondary gauge rows align');
      assert(Math.abs(g.face.y - g.nav1.y) < 1, 'six-pack and NAV top faces align');
      assert(g.nav1.x < g.nav2.x && g.bearing.x < g.rpmFace.x && g.bearing.y > g.nav1.bottom, 'NAV1/NAV2 above BRG/RPM');
      assert(g.fuel.height > 40 && g.fuel.bottom <= g.engine.bottom + 1, 'distinct round fuel face fits engine column');
      assert(g.pressure.bottom <= g.primary.bottom && g.pressure.right <= g.primary.right, 'pressure control remains inside primary panel');
      const overflow = await page.evaluate(() => ['.engine-content', '.engine-controls', '.radio-nav-content'].map(selector => {
        const p = document.querySelector(selector), b = p.getBoundingClientRect();
        return { selector, overflow: [...p.querySelectorAll('button,input,svg,output')].some(el => {
          const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.bottom > b.bottom + 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.left < b.left - 1);
        }) };
      }));
      assert(overflow.every(p => !p.overflow), `all controls remain inside compact columns: ${JSON.stringify(overflow)}`);
    } else {
      assert.equal(g.engineOpen, true); assert.equal(g.radioOpen, true);
      await page.locator('#engine-open').click();
      await page.locator('#engine-dialog').waitFor({ state: 'visible' });
      assert(await page.locator('#throttle').isVisible()); assert(await page.locator('#mixture-control').isVisible());
      await page.locator('#engine-close').click();
      await page.locator('#radio-nav-open').click();
      await page.locator('#radio-nav-dialog').waitFor({ state: 'visible' });
      await page.locator('#radio-nav-close').click();
    }
    if (width === 1440 && height === 900) assert(g.deck.height <= 390, 'desktop cockpit is shorter than the previous 449px panel');
    if (width === 390 || (width === 1440 && height === 900)) await page.screenshot({ path: `${output}/panel-layout-${width}.png` });
  }
  // Portaled controls return to the cockpit if a narrow dialog is open during expansion.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForTimeout(180);
  for (const unit of ['engine', 'radio-nav']) {
    await page.locator(`#${unit}-open`).click();
    await page.locator(`#${unit}-dialog`).waitFor({ state: 'visible' });
    await page.setViewportSize({ width: 901, height: 900 });
    await page.locator(`#${unit}-dialog`).waitFor({ state: 'hidden' });
    await page.waitForTimeout(180);
    assert(await page.locator(unit === 'engine' ? '#engine-systems .engine-content' : '#radio-nav-systems .radio-nav-content').isVisible());
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForTimeout(180);
  }
  // Review has room for both its complete readouts and transport above the scaled cockpit.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#start').click();
  await page.waitForTimeout(350);
  await page.locator('#pause').click();
  await page.locator('#scene').focus();
  await page.keyboard.press('r');
  await page.locator('#flight-review').waitFor({ state: 'visible' });
  for (const [width, height] of [[1440, 900], [760, 844], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(200);
    const boxes = await page.evaluate(() => {
      const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }; };
      return { controls: r('.control-panel'), review: r('#flight-review'), header: r('.topbar'), deck: r('.flight-deck') };
    });
    assert(boxes.controls.y >= boxes.header.bottom - 1, `recorded readouts clear header at ${width}`);
    assert(boxes.review.bottom <= boxes.deck.y + 1, 'review transport clears cockpit');
    assert(boxes.controls.bottom <= boxes.review.y || boxes.controls.x >= boxes.review.right, 'recorded readouts and review transport do not overlap');
    if (width === 390) await page.screenshot({ path: `${output}/panel-layout-review-mobile.png` });
  }
  // A fresh mobile load must not depend on desktop-first portal placement.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', error => errors.push(error.stack ?? String(error)));
  await installSceneryFixture(mobile); await mobile.goto(origin); await mobile.waitForFunction(() => !document.querySelector('#start').disabled);
  assert(await mobile.locator('.engine-controls .autopilot-content').isVisible());
  assert(await mobile.locator('#engine-open').isVisible());
  await mobile.close();
  await writeFile(`${output}/panel-layout.json`, `${JSON.stringify(observations, null, 2)}\n`);
  assert.deepEqual(errors, []);
  console.log(`Panel layout: ${observations.length} viewport cases and fresh-mobile portals passed.`);
} finally {
  await browser?.close();
  server.kill();
}
