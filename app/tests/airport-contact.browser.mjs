// R-COMM-2 / R-AIR-3 / TODO 2.0.194: real app, worker and COM directory. Tuning the ACTIVE
// COM1 to EDFE's source channel near EDFE shows simulated text with the simulator QNH;
// the altimeter changes only through the explicit action and Review stays read-only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const port = 5388, origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/airport-contact-vite',server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', data => { log += data; });
server.stderr.on('data', data => { log += data; });
const checks = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 150 && !log.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => document.querySelector('#start') && !document.querySelector('#start').disabled, null, { timeout: 90000 });
  const contact = page.locator('#airport-contact'), action = contact.locator('.airport-contact-qnh');
  const reference = () => page.locator('#altimeter-reference').textContent();
  const setAltimeter = async hpa => {
    await page.locator('#altimeter-open').click();
    await page.locator('#altimeter-setting').fill(String(hpa)); await page.locator('#altimeter-setting').dispatchEvent('change');
    await page.locator('#altimeter-close').click();
  };
  const boxOf = async selector => page.evaluate(selector => {
    const element = document.querySelector(selector); if (!element) return null;
    const style = getComputedStyle(element); const r = element.getBoundingClientRect();
    return style.display === 'none' || style.visibility === 'hidden' || !r.width || !r.height ? null : { x: r.x, y: r.y, width: r.width, height: r.height };
  }, selector);
  const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  /** The message must not cover the named overlays at the current viewport. */
  const assertClear = async (label, selectors) => {
    const box = await boxOf('#airport-contact');
    for (const selector of selectors) assert(!overlap(box, await boxOf(selector)), `${label}: airport text overlaps ${selector}`);
    return box;
  };
  const OVERLAYS = ['#flight-controls-panel', '#pointer-mode', '#camera-fov', '.scenery-label', '#radio-nav-systems', '.simulation-rate-overlay', '.topbar', '#initial-balance-status', '#flight-gate'];

  // Standby alone never makes contact; the ACTIVE channel does.
  await page.locator('#com1-standby').fill('118.405'); await page.locator('#com1-standby').press('Enter');
  await page.waitForTimeout(600);
  assert.equal(await contact.isHidden(), true, 'standby tuning alone is not a contact');
  await page.locator('#com1-swap').click();
  await page.waitForFunction(() => /EDFE Egelsbach Radio/.test(document.querySelector('#airport-contact .airport-contact-title')?.textContent ?? ''));
  assert.equal(await contact.isVisible(), true);
  const text = await contact.innerText();
  assert.match(text, /COM1 118\.405 · EDFE Egelsbach Radio/);
  assert.match(text, /Welcome to Frankfurt-Egelsbach Airport\. QNH 1013 hPa \(29\.92 inHg\)\./);
  assert.match(text, /Simulated text, not ATC/);
  const live = page.locator('.airport-contact-live');
  assert.equal(await live.getAttribute('role'), 'status'); assert.equal(await live.getAttribute('aria-live'), 'polite');
  assert.match(await live.textContent(), /Welcome to Frankfurt-Egelsbach Airport/);
  assert.equal(await page.locator('#airport-contact [role="status"]').count(), 0, 'live region is outside the hideable box');
  checks.push('ACTIVE COM1 118.405 near EDFE shows simulated welcome and QNH 1013 hPa / 29.92 inHg; persistent live region announces it');

  // Small, off the forward-view centre and clear of other overlays (expanded state, before the 10 s collapse).
  const box = await contact.boundingBox(), scene = await page.locator('#scene').boundingBox();
  assert(box.width * box.height < 0.06 * scene.width * scene.height, 'message stays small');
  assert(!(box.x < scene.x + scene.width / 2 && box.x + box.width > scene.x + scene.width / 2
    && box.y < scene.y + scene.height / 2 && box.y + box.height > scene.y + scene.height / 2), 'message avoids scene centre');
  await page.screenshot({ path: `${output}airport-contact.png` });
  const sizes = [];
  for (const controls of [false, true]) {
    if (controls) {
      // Show the live control panel and leave the first-start gate (which, by design, layers over
      // the text on ≤420 px screens), then retune for a fresh (expanded) contact.
      await page.setViewportSize({ width: 1440, height: 900 }); await prepareFlightUI(page, { controls: true });
      await startOrResume(page); await page.waitForTimeout(300);
      await page.locator('#scene').focus(); await page.keyboard.press('Space');
      await page.waitForFunction(() => document.querySelector('#flight-gate').hidden);
      await page.locator('#com1-swap').click(); await page.waitForTimeout(600); await page.locator('#com1-swap').click();
      await page.waitForFunction(() => !document.querySelector('#airport-contact').hidden && !document.querySelector('#airport-contact').classList.contains('compact'));
    }
    for (const [width, height] of [[1440, 900], [1100, 800], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
      await contact.hover(); // keep it expanded while measuring
      if (controls) assert(await boxOf('#flight-controls-panel'), `${width}×${height}: live control panel shown`);
      // On phone widths the short scene cannot fit both; the first-start gate layers above the text and stays usable.
      const measured = await assertClear(`${width}×${height}${controls ? ' with controls' : ''}`, width > 620 ? OVERLAYS : OVERLAYS.filter(s => s !== '#flight-gate'));
      if (await boxOf('#flight-gate')) assert(await page.evaluate(() => {
        const r = document.querySelector('#start').getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('#start') !== null;
      }), `${width}×${height}: Start remains on top`);
      assert(measured, `${width}×${height}: message visible`);
      assert(measured.width >= 150, `${width}×${height}: message keeps a readable width`);
      sizes.push(`${width}×${height}${controls ? '+controls' : ''}: ${Math.round(measured.width)}×${Math.round(measured.height)}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await page.mouse.move(5, 5); await page.waitForTimeout(250);
  checks.push(`message clear of live controls/pointer/FOV/scenery/radio/top-bar overlays (${sizes.join('; ')})`);

  // The default setting already equals the simulator QNH; a set 1013.00 hPa also counts as the announced QNH 1013.
  assert.match(await action.textContent(), /Altimeter on QNH 1013/); assert.equal(await action.isDisabled(), true);
  await setAltimeter(1013);
  await page.waitForFunction(() => /CUSTOM PRESSURE/.test(document.querySelector('#altimeter-reference')?.textContent ?? ''));
  await page.waitForTimeout(400);
  assert.match(await action.textContent(), /Altimeter on QNH 1013/, '1013.00 hPa is inside the announced QNH 1013');
  await setAltimeter(1000);
  await page.waitForFunction(() => !document.querySelector('#airport-contact .airport-contact-qnh').disabled);
  assert.match(await action.textContent(), /Set altimeter QNH 1013/);
  await page.waitForTimeout(800);
  assert.match(await reference(), /CUSTOM PRESSURE/, 'contact never changes the altimeter automatically');
  await action.click();
  await page.waitForFunction(() => /QNH/.test(document.querySelector('#altimeter-reference')?.textContent ?? ''));
  await page.waitForFunction(() => document.querySelector('#airport-contact .airport-contact-qnh').disabled);
  checks.push('1013.00 hPa counts as on QNH 1013; explicit action sets the exact simulator QNH through the existing worker path');

  // Fly briefly, then Review: the text box is hidden and does not cover the recorded control readouts.
  await setAltimeter(1000);
  await page.waitForFunction(() => /CUSTOM PRESSURE/.test(document.querySelector('#altimeter-reference')?.textContent ?? ''));
  await startOrResume(page); await page.waitForTimeout(1500);
  await page.locator('#scene').focus(); await page.keyboard.press('KeyR');
  await page.waitForFunction(() => document.querySelector('.flight-app')?.dataset.review === 'true');
  for (const [width, height] of [[1440, 900], [1100, 800]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(400);
    assert(await boxOf('#flight-controls-panel'), 'recorded control panel visible in Review');
    assert.equal(await boxOf('#airport-contact'), null, `${width}×${height}: airport text hidden in Review`);
    await assertClear(`Review ${width}×${height}`, ['#flight-controls-panel']);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('.flight-app')?.dataset.review === 'false');
  await page.waitForFunction(() => /Set altimeter QNH 1013/.test(document.querySelector('#airport-contact .airport-contact-qnh')?.textContent ?? ''));
  assert.equal(await contact.locator('.airport-contact-title').textContent(), 'COM1 118.405 · EDFE Egelsbach Radio');
  checks.push('Review hides the text (no overlap with recorded controls at 1440×900 and 1100×800); live action returns after Review');

  // Collapse keeps an available action reachable; once on QNH the pill fades out.
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => document.querySelector('#airport-contact')?.classList.contains('compact'), null, { timeout: 15000 });
  assert.equal(await contact.isVisible(), true);
  assert.match(await contact.locator('.airport-contact-compact').textContent(), /^EDFE · QNH 1013 · sim$/);
  const pill = await contact.boundingBox();
  assert(pill.height < 40 && pill.width <= 330, 'collapsed pill is one line');
  await page.screenshot({ path: `${output}airport-contact-compact.png`, clip: { x: pill.x - 20, y: pill.y - 20, width: pill.width + 40, height: pill.height + 40 } });
  await action.click(); await page.mouse.move(5, 5);
  await page.waitForFunction(() => document.querySelector('#airport-contact').hidden);
  assert.match(await reference(), /QNH/);
  checks.push(`message collapses to a ${Math.round(pill.width)}×${Math.round(pill.height)} px pill; it hides once the altimeter is on QNH`);

  // A new contact (retune) announces again; dismissal hides it.
  await page.locator('#com1-swap').click(); await page.waitForTimeout(600);
  assert.equal(await live.textContent(), '', 'live region clears when the contact ends');
  await page.locator('#com1-swap').click();
  await page.waitForFunction(() => !document.querySelector('#airport-contact').hidden && !document.querySelector('#airport-contact').classList.contains('compact'));
  assert.match(await live.textContent(), /Welcome to Frankfurt-Egelsbach Airport/);
  await contact.locator('.airport-contact-dismiss').click();
  await page.waitForTimeout(600);
  assert.equal(await contact.isHidden(), true);
  checks.push('ending a contact clears the live region; retuning announces again; dismiss hides it');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: browser.version(), checks }, null, 2));
} finally { await browser?.close(); server.kill(); }
