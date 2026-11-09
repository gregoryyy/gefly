// Actual app/worker shortcut boundaries; scenery pixels alone are deterministic.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5294';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5294,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
const checks = [], errors = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; ; i++) {
    if (i === 100 || server.exitCode !== null) throw new Error(log || 'Map UX server did not start');
    if (log.includes('Local:')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = Worker; window.uxStates = []; window.uxStats = []; window.uxApCommands = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.uxWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.uxStates.push(data);
          if (data.type === 'stats') window.uxStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (message?.type === 'kap140' || message?.type === 'autopilot-capture') window.uxApCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => window.uxStates.at(-1)?.kap_profile === 1 && !document.querySelector('#start').disabled, null, { timeout: 60000 });
  const scene = page.locator('#scene'), overlay = page.locator('#flight-plan-overlay');
  const stats = async () => {
    const count = await page.evaluate(() => window.uxStats.length);
    await page.evaluate(() => window.uxWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.uxStats.length > count, count);
    return page.evaluate(() => window.uxStats.at(-1));
  };
  const frozen = async before => {
    const after = await stats();
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  };
  // Panel interaction releases a held vertical button through the existing
  // neutralization path. Count engagement/target commands separately, retaining
  // every raw command in the evidence and comparing the full paused state.
  const apCount = () => page.evaluate(() => window.uxApCommands.filter(message =>
    !(message.type === 'kap140' && message.command?.action === 'vertical' && message.command.value === 0)).length);
  const mapShown = () => page.locator('#practice-map-panel').isVisible();
  const baseline = await stats(), commands = await apCount();
  await scene.focus(); await page.keyboard.press('p'); await overlay.waitFor({ state: 'visible' });
  assert.equal(await mapShown(), false, 'P creates the planner without opening the map');
  assert.equal(await overlay.evaluate(element => element.closest('#practice-map-panel')), null);
  assert.equal(await overlay.evaluate(element => element.classList.contains('floating-overlay')), false);
  assert.equal(await page.locator('#toggle-flight-plan').getAttribute('aria-pressed'), 'true');
  await frozen(baseline); assert.equal(await apCount(), commands);
  checks.push('P opens a nonmodal independent plan portal while paused, without AP engagement/target commands or native-state change');

  await scene.focus(); await page.keyboard.press('i');
  await page.locator('#view-menu > summary').click();
  assert(await page.locator('#toggle-flight-plan').evaluate(button => {
    const r = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }), 'View menu remains above the nonmodal plan overlay');
  await page.locator('#view-menu > summary').click();
  checks.push('global View menu remains reachable above the nonmodal planner');

  const name = overlay.getByLabel('GPS fix name', { exact: true });
  await name.fill('fix'); await page.keyboard.press('p'); await page.keyboard.press('Shift+KeyP');
  assert.equal(await name.inputValue(), 'fixpP'); assert(await overlay.isVisible());
  await frozen(baseline); assert.equal(await apCount(), commands);
  await overlay.getByRole('button', { name: 'Close flight plan', exact: true }).focus();
  for (const key of ['a', 'e', 'n', '5', 'ArrowUp', '=']) await page.keyboard.press(key);
  await frozen(baseline); assert.equal(await apCount(), commands);
  assert.equal(await page.locator('#simulation-rate-overlay').textContent(), 'SIM 1×');
  await overlay.getByRole('button', { name: 'Close flight plan', exact: true }).click();
  await overlay.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#toggle-flight-plan').getAttribute('aria-pressed'), 'false');
  checks.push('plain/shifted P remain text; focused planner controls block aircraft/AP/rate shortcuts; first Close click updates visibility');

  await scene.focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.uxStates.at(-1)?.kap_engaged === 1);
  assert.equal(await page.locator('#capture-autopilot').getAttribute('aria-keyshortcuts'), 'A');
  assert.equal(await apCount(), commands + 1);
  const held = await stats();
  await page.keyboard.press('p'); await overlay.waitFor({ state: 'visible' });
  await frozen(held); assert.equal(await apCount(), commands + 1);
  await scene.focus(); await page.keyboard.press('p'); await overlay.waitFor({ state: 'hidden' });
  await page.keyboard.press('a'); await page.waitForFunction(() => window.uxStates.at(-1)?.kap_engaged === 0);
  assert.equal(await apCount(), commands + 2);
  await page.keyboard.press('Shift+KeyP'); assert.equal(await apCount(), commands + 2);
  checks.push('A retains AP capture/disconnect; plain P opens/closes the plan without changing engaged AP and Shift+P has no AP binding');

  await page.evaluate(() => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) document.querySelector('#scene').dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', [modifier]: true, bubbles: true }));
  });
  assert.equal(await overlay.isVisible(), false);
  await page.evaluate(() => document.querySelector('#scene').dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', repeat: true, bubbles: true })));
  assert.equal(await overlay.isVisible(), false);
  await page.keyboard.press('o'); await page.locator('#control-settings').waitFor({ state: 'visible' });
  const modalCommands = await apCount();
  await page.locator('#settings-close').focus(); await page.keyboard.press('p'); await page.keyboard.press('a');
  assert.equal(await overlay.isVisible(), false); assert.equal(await apCount(), modalCommands);
  await page.keyboard.press('Escape'); await page.locator('#control-settings').waitFor({ state: 'hidden' });
  checks.push('modifier/repeat and modal guards prevent unintended plan/AP commands');

  await startOrResume(page); await page.waitForFunction(() => window.uxStates.at(-1)?.t_s > 1);
  await scene.focus(); await page.keyboard.press('Space');
  await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review === 'true');
  const reviewFrozen = await stats(), reviewCommands = await apCount();
  await page.keyboard.press('p'); await overlay.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.map-flight-plan-context')?.textContent.includes('recorded aircraft'));
  await scene.focus(); await page.keyboard.press('a');
  await frozen(reviewFrozen); assert.equal(await apCount(), reviewCommands);
  const reviewTime = await page.locator('#review-time').inputValue();
  await overlay.getByRole('button', { name: 'Close flight plan', exact: true }).focus();
  await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('#review-time').inputValue(), reviewTime);
  await page.setViewportSize({ width: 390, height: 844 });
  const rect = await overlay.boundingBox(); assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 391 && rect.y + rect.height <= 845);
  assert.equal(await mapShown(), false);
  checks.push('plan remains current and bounded with map closed in narrow Review; AP shortcut stays read-only');
  await page.screenshot({ path: `${output}/map-ux-plan-narrow.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/map-ux-shortcuts.json`, JSON.stringify({ result: 'pass', checks, errors,
    apCommands: await page.evaluate(() => window.uxApCommands), browser: browser.version() }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} catch (error) {
  await writeFile(`${output}/map-ux-shortcuts.json`, JSON.stringify({ result: 'fail', checks, errors, error: String(error) }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
