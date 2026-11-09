// TODO2.0.133 diagnostic only. Real UI/native responses; scenery pixels only
// are fixtures. No state, loading, terrain, control or worker-response injection.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5296';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const manualOnly = process.env.C172_MANUAL_ONLY === '1';
const artifact = manualOnly ? 'c172-browser-task133-manual-effective' : 'c172-browser-task133';
const report = { scope: 'Actual application diagnostic, not aircraft performance or training-fidelity acceptance. Default loading/terrain/model retained; only background scenery pixels fixture.', cases: [] };
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5296,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
try {
  await mkdir(output, { recursive: true });
  for (let index = 0; index < 100 && !serverOutput.includes('Local:'); index++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(serverOutput.includes('Local:'), serverOutput);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  report.browser = browser.version();
  report.script_sha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  const effectiveManual = { id: 'manual-effective60px-release8deg', pointer_y_px: 60, release_pitch_deg: 8, simulation_rate: 5 };
  const cases = manualOnly ? [effectiveManual] : [{ id: 'KAP-VS400', requested_fpm: 400 }, { id: 'KAP-VS600', requested_fpm: 600 },
    { id: 'KAP-VS1000', requested_fpm: 1000 }, { id: 'manual-centered-pointer15px', pointer_y_px: 15 }, effectiveManual];
  for (const config of cases) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await context.newPage();
    const evidence = { config, result: 'not evaluated', errors: [], observations: [] }; report.cases.push(evidence);
    page.on('pageerror', error => evidence.errors.push(String(error)));
    await page.addInitScript(() => {
      window.c172States = []; window.c172Commands = []; window.c172Events = []; window.c172Build = null;
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
          this.addEventListener('message', ({ data }) => {
            if (data.type === 'state') { window.c172States.push({ ...data }); if (window.c172States.length > 20000) window.c172States.shift(); }
            else if (data.type === 'ready') window.c172Build = structuredClone(data.build);
            else if (['error', 'terrain-loading', 'autopilot-rejected'].includes(data.type)) window.c172Events.push(structuredClone(data));
          });
        }
        postMessage(message, ...args) {
          if (['input', 'kap140', 'autopilot-capture', 'simulation-rate', 'pause', 'run'].includes(message?.type)) window.c172Commands.push(structuredClone(message));
          return super.postMessage(message, ...args);
        }
      };
    });
    const observe = async label => {
      const result = await page.evaluate(label => ({ label, state: window.c172States.at(-1),
        status: document.querySelector('#status').textContent, notice: document.querySelector('#notice').textContent,
        selectedThrottle: document.querySelector('#throttle').value,
        kap: { lateral: document.querySelector('#ap-lateral').textContent, vertical: document.querySelector('#ap-vertical').textContent,
          command: document.querySelector('#ap-vs-command').textContent, target: document.querySelector('#ap-selector-value').value,
          unit: document.querySelector('#ap-selector-unit').textContent, arm: document.querySelector('#ap-arm').textContent },
        warning: document.querySelector('#flight-warnings').textContent,
        pointerMode: document.querySelector('#scene').dataset.pointerMode, focused: document.activeElement?.id }), label);
      evidence.observations.push(result); return result;
    };
    try {
      await installSceneryFixture(page); await page.goto(origin);
      await page.waitForFunction(() => !document.querySelector('#start').disabled && window.c172States.at(-1)?.kap_profile === 1, null, { timeout: 60000 });
      await prepareFlightUI(page, { controls: false });
      await observe('unaltered native-default paused launch');
      await page.locator('#throttle').focus(); await page.keyboard.press('End');
      assert.equal(await page.locator('#throttle').inputValue(), '100');
      assert.equal(await page.locator('#flap-control').inputValue(), '0');
      if (config.requested_fpm) {
        await page.locator('#scene').focus(); await page.keyboard.press('a');
        await page.waitForFunction(() => window.c172States.at(-1)?.kap_engaged === 1 && window.c172States.at(-1).kap_vertical === 1);
        await page.locator('#ap-selector-value').fill('10000');
        await page.locator('#ap-alt').click();
        await page.waitForFunction(() => window.c172States.at(-1)?.kap_vertical === 0 && window.c172States.at(-1).kap_alt_arm === 1);
        await page.locator('#ap-arm').click();
        await page.waitForFunction(() => window.c172States.at(-1)?.kap_alt_arm === 0);
        for (let fpm = 100; fpm <= config.requested_fpm; fpm += 100) {
          await page.locator('#ap-up').click();
          await page.waitForFunction(fpm => Math.abs(window.c172States.at(-1).kap_vs_target_mps * 60 / .3048 - fpm) < .01, fpm, { timeout: 3000 });
        }
      }
      await page.locator('#scene').focus();
      const simulationRate = config.simulation_rate ?? 10;
      for (let index = 0; index < (simulationRate === 5 ? 3 : 4); index++) await page.keyboard.press('Equal');
      await page.waitForFunction(rate => window.c172States.at(-1)?.simulation_rate === rate, simulationRate);
      await observe('actual UI configuration before run');
      await startOrResume(page);
      await page.waitForFunction(() => window.c172States.at(-1)?.throttle_norm === 1 && window.c172States.at(-1).t_s > .1);
      if (config.pointer_y_px) {
        const scene = await page.locator('#scene').boundingBox();
        const beforePull = await observe('native elevator before manual gesture');
        await page.mouse.click(scene.x + scene.width / 2, scene.y + scene.height / 2);
        await page.mouse.move(scene.x + scene.width / 2, scene.y + scene.height / 2 + config.pointer_y_px);
        await page.waitForFunction(() => window.c172States.at(-1)?.elevator_cmd_norm < -.02 && document.querySelector('#scene').dataset.pointerMode === 'yoke');
        if (config.release_pitch_deg) {
          await page.waitForFunction(before => Math.abs(window.c172States.at(-1).elevator_rad - before) > .01, beforePull.state.elevator_rad,
            { timeout: 5000 });
          await observe('confirmed actual elevator movement, not command alone');
          await page.waitForFunction(pitch => window.c172States.at(-1).pitch_rad * 180 / Math.PI >= pitch
            || window.c172States.at(-1).stall_warning_norm > 0 || window.c172States.at(-1).t_s >= 20, config.release_pitch_deg, { timeout: 10000 });
          await observe('manual pull release at pitch threshold or bounded pull limit');
          await page.mouse.move(scene.x + scene.width / 2, scene.y + scene.height / 2);
          await page.waitForFunction(() => Math.abs(window.c172States.at(-1).elevator_cmd_norm) < 1e-9);
          await observe('pointer returned to neutral after effective elevator input');
        }
      } else {
        await page.waitForFunction(fpm => window.c172States.at(-1)?.kap_engaged === 1 && window.c172States.at(-1).kap_vertical === 0
          && Math.abs(window.c172States.at(-1).kap_vs_target_mps * 60 / .3048 - fpm) < .01, config.requested_fpm);
      }
      await observe('confirmed native controls during flight');
      const until_s = config.release_pitch_deg ? 60 : config.pointer_y_px ? 45 : 180;
      await page.waitForFunction(until_s => {
        const state = window.c172States.at(-1);
        return state?.t_s >= until_s || state?.stall_warning_norm > 0 || state?.stall_warning_peak_norm > 0
          || state?.collision_mask > 0 || document.querySelector('#status').textContent === 'Error';
      }, until_s, { timeout: 60000 });
      await observe('first warning/contact or bounded observation endpoint');
      if ((await page.locator('#pause').textContent()).trim().startsWith('Pause')) await page.locator('#pause').click();
      await page.screenshot({ path: `${output}/${artifact}-${config.id}.png` });
      const states = await page.evaluate(() => window.c172States);
      const flying = states.filter(state => state.t_s > 0 && state.throttle_norm === 1);
      assert(flying.length > 0, 'actual native full-power samples are required');
      const minimum = flying.reduce((best, state) => state.cas_mps < best.cas_mps ? state : best);
      evidence.metrics = { min_cas_kt: minimum.cas_mps * 3600 / 1852, minimum_state: minimum,
        first_reported_40_50kt: flying.find(state => state.cas_mps * 3600 / 1852 >= 40 && state.cas_mps * 3600 / 1852 <= 50) ?? null,
        first_native_warning: flying.find(state => state.stall_warning_norm > 0 || state.stall_warning_peak_norm > 0) ?? null,
        final: flying.at(-1), max_abs_bank_deg: Math.max(...flying.map(state => Math.abs(state.roll_rad * 180 / Math.PI))),
        actual_elevator_rad_range: [Math.min(...flying.map(state => state.elevator_rad)), Math.max(...flying.map(state => state.elevator_rad))],
        actual_vs_fpm_range: [Math.min(...flying.map(state => -state.ground_down_mps * 60 / .3048)), Math.max(...flying.map(state => -state.ground_down_mps * 60 / .3048))] };
      evidence.states = states;
      evidence.result = 'diagnostic complete; performance observed without acceptance threshold';
    } catch (error) {
      evidence.result = 'fixture/controller configuration failure; no model conclusion'; evidence.error = String(error);
      await observe('diagnostic failure state').catch(() => {});
      evidence.states = await page.evaluate(() => window.c172States).catch(() => []);
      process.exitCode = 1;
    } finally {
      evidence.commands = await page.evaluate(() => window.c172Commands).catch(() => []);
      evidence.events = await page.evaluate(() => window.c172Events).catch(() => []);
      evidence.build = await page.evaluate(() => window.c172Build).catch(() => null);
      await writeFile(`${output}/${artifact}.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
    console.log(JSON.stringify({ id: config.id, result: evidence.result, min_cas_kt: evidence.metrics?.min_cas_kt,
      warning_t_s: evidence.metrics?.first_native_warning?.t_s, final_t_s: evidence.metrics?.final?.t_s, error: evidence.error }));
  }
} finally { await browser?.close(); server.kill(); }
