// Trusted-pointer regression for hold-look borrowing the pointer without moving
// the yoke midpoint. Uses the real app/worker; never injects flight state.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5208';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import {createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5208,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', chunk => { log += chunk; });
server.stderr.on('data', chunk => { log += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try { if (log.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, log);
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.__pointerInputs = []; window.__pointerStats = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__pointerWorker = this;
        this.addEventListener('message', event => {
          if (event.data?.type === 'stats') window.__pointerStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__pointerWorker && message?.type === 'input') window.__pointerInputs.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  const mode = expected => page.waitForFunction(expected => document.querySelector('#scene').dataset.pointerMode === expected, expected);
  const axes = () => page.evaluate(() => ['roll-control', 'pitch-control'].map(id => Number(document.getElementById(id).textContent)));
  const stats = async () => {
    const count = await page.evaluate(() => window.__pointerStats.length);
    await page.evaluate(() => window.__pointerWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__pointerStats.length > count, count);
    return page.evaluate(() => window.__pointerStats.at(-1));
  };
  const frozen = (a, b) => { assert.equal(a.step, b.step); assert.equal(a.digest, b.digest); assert.deepEqual(a.final_state, b.final_state); };
  const hold = async (x, y) => {
    await page.mouse.down(); await page.waitForTimeout(300); await mode('look');
    await page.mouse.move(x, y, { steps: 3 }); await page.mouse.up(); await mode('yoke');
  };
  const before = await stats();
  await page.mouse.click(1000, 160); await mode('yoke');
  await page.mouse.move(1075, 130);
  const original = await axes(); assert(original[0] > 0 && original[1] > 0);
  await hold(1250, 230);
  await page.mouse.move(1075, 130);
  assert.deepEqual(await axes(), original, 'paused look release preserves both original-axis references');
  await page.mouse.move(1000, 160);
  const neutral = await axes(); assert.equal(neutral[1], 0);
  frozen(before, await stats());

  await startOrResume(page);
  await page.mouse.click(1000, 160); await mode('yoke');
  await page.mouse.move(1075, 130);
  const liveAxes = await axes();
  await page.waitForFunction(() => window.__pointerInputs.length > 0);
  const commands = () => page.evaluate(() => {
    const input = window.__pointerInputs.at(-1);
    return { aileron: input.aileron, elevator: input.elevator };
  });
  await page.waitForTimeout(60);
  const originalCommands = await commands();
  await hold(1250, 230);
  assert.deepEqual(await axes(), neutral, 'release stays neutral instead of issuing a release-position yoke command');
  await page.mouse.move(1075, 130); await page.waitForTimeout(60);
  assert.deepEqual(await axes(), liveAxes);
  assert.deepEqual(await commands(), originalCommands, 'actual commands remain relative to the pre-look midpoint');
  // Captured look can finish outside. Entering immediately restores the same
  // original-anchor input, and a later short click still toggles it off.
  await hold(1450, 430);
  await page.mouse.move(1075, 130); await mode('yoke');
  assert.deepEqual(await axes(), liveAxes);
  await page.mouse.move(1000, 160); assert.deepEqual(await axes(), neutral);
  await page.mouse.click(1000, 160); await mode('off');
  await page.mouse.click(1100, 160); await mode('yoke');
  await page.mouse.move(1175, 130); assert.deepEqual(await axes(), liveAxes, 'a short click can intentionally establish a new midpoint');
  await page.keyboard.press('Escape'); await mode('off');
  await page.locator('#pause').click();
  const paused = await stats(); await page.waitForTimeout(100); frozen(paused, await stats());
  assert.deepEqual(errors, []);
  const result = { result: 'pass', checks: [
    'paused hold-look preserves original midpoint without advancing actual JSBSim',
    'live hold-look preserves original midpoint and actual aileron/elevator commands',
    'outside release/re-entry and short-click toggle retain their separate behavior',
  ], originalCommands };
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/pointer-yoke-browser.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await browser?.close(); server.kill(); }
