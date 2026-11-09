// R-COMM-2 / R-AIR-3 / TODO 2.0.194: real app, worker and COM directory. Tuning the ACTIVE
// COM1 to EDFE's source channel near EDFE shows simulated text with the simulator QNH;
// the altimeter changes only through the explicit action and Review stays read-only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture } from './flight-actions.mjs';

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
  assert.equal(await contact.locator('[role="status"]').getAttribute('aria-live'), 'polite');
  checks.push('ACTIVE COM1 118.405 near EDFE shows simulated welcome and QNH 1013 hPa / 29.92 inHg');

  // Small and off the forward view centre.
  const box = await contact.boundingBox(), scene = await page.locator('#scene').boundingBox();
  assert(box.width * box.height < 0.06 * scene.width * scene.height, 'message stays small');
  assert(!(box.x < scene.x + scene.width / 2 && box.x + box.width > scene.x + scene.width / 2
    && box.y < scene.y + scene.height / 2 && box.y + box.height > scene.y + scene.height / 2), 'message avoids scene centre');
  await page.screenshot({ path: `${output}airport-contact.png` });
  checks.push(`message ${Math.round(box.width)}×${Math.round(box.height)} px, outside the scene centre`);

  // The default setting already equals the simulator QNH; change it through the dialog first.
  assert.match(await action.textContent(), /Altimeter on QNH 1013/); assert.equal(await action.isDisabled(), true);
  await page.locator('#altimeter-open').click();
  await page.locator('#altimeter-setting').fill('1000'); await page.locator('#altimeter-setting').dispatchEvent('change');
  await page.locator('#altimeter-close').click();
  await page.waitForFunction(() => /CUSTOM PRESSURE/.test(document.querySelector('#altimeter-reference')?.textContent ?? ''));
  await page.waitForFunction(() => !document.querySelector('#airport-contact .airport-contact-qnh').disabled);
  assert.match(await action.textContent(), /Set altimeter QNH 1013/);
  await page.waitForTimeout(800);
  assert.match(await reference(), /CUSTOM PRESSURE/, 'contact never changes the altimeter automatically');
  await action.click();
  await page.waitForFunction(() => /QNH/.test(document.querySelector('#altimeter-reference')?.textContent ?? ''));
  await page.waitForFunction(() => document.querySelector('#airport-contact .airport-contact-qnh').disabled);
  checks.push('explicit action sets the altimeter to the simulator QNH through the existing worker path');

  // Fly briefly, then Review: no live action, and recorded state does not change contact.
  await page.locator('#altimeter-open').click();
  await page.locator('#altimeter-setting').fill('1000'); await page.locator('#altimeter-setting').dispatchEvent('change');
  await page.locator('#altimeter-close').click();
  await page.waitForFunction(() => /CUSTOM PRESSURE/.test(document.querySelector('#altimeter-reference')?.textContent ?? ''));
  await page.locator('#start').click(); await page.waitForTimeout(1500);
  await page.locator('#scene').focus(); await page.keyboard.press('KeyR');
  await page.waitForFunction(() => document.querySelector('.flight-app')?.dataset.review === 'true');
  await page.waitForFunction(() => /Review · read only/.test(document.querySelector('#airport-contact .airport-contact-qnh')?.textContent ?? ''));
  assert.equal(await action.isDisabled(), true);
  checks.push('Review shows the action as read only; live action returns after Review');
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('.flight-app')?.dataset.review === 'false');
  await page.waitForFunction(() => /Set altimeter QNH 1013/.test(document.querySelector('#airport-contact .airport-contact-qnh')?.textContent ?? ''));
  assert.equal(await contact.locator('.airport-contact-title').textContent(), 'COM1 118.405 · EDFE Egelsbach Radio');

  // Collapse keeps the action reachable; dismissal hides it until a new contact.
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => document.querySelector('#airport-contact')?.classList.contains('compact'), null, { timeout: 15000 });
  assert.equal(await contact.isVisible(), true);
  assert.match(await contact.locator('.airport-contact-compact').textContent(), /^EDFE · QNH 1013$/);
  const pill = await contact.boundingBox();
  assert(pill.height < 40 && pill.width <= 330, 'collapsed pill is one line');
  await page.screenshot({ path: `${output}airport-contact-compact.png`, clip: { x: pill.x - 20, y: pill.y - 20, width: pill.width + 40, height: pill.height + 40 } });
  checks.push(`message collapses to a ${Math.round(pill.width)}×${Math.round(pill.height)} px pill that keeps the QNH action`);
  await contact.locator('.airport-contact-dismiss').click();
  assert.equal(await contact.isHidden(), true);
  checks.push('dismiss hides the message');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: browser.version(), checks }, null, 2));
} finally { await browser?.close(); server.kill(); }
