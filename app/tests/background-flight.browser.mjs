// Real Chrome tab visibility and native JSBSim worker. Only scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5286';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5286,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, browserProtocol, page, chromeProcess, chromeProfile, log = '';
const errors = [], checks = [], observations = {};
server.stdout.on('data', data => { log += data; }); server.stderr.on('data', data => { log += data; });
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const brief = stats => ({ step: stats.step, t_s: stats.t_s, dt_s: stats.dt_s, digest: stats.digest,
  kap_engaged: stats.kap_engaged, kap_lateral: stats.kap_lateral, kap_vertical: stats.kap_vertical,
  kap_heading_bug_rad: stats.kap_heading_bug_rad, kap_hold_pressure_altitude_m: stats.kap_hold_pressure_altitude_m,
  dropped_steps: stats.dropped_steps, final_state: stats.final_state });
const latchedKeys = ['throttle', 'flap_norm', 'mixture_norm', 'mixture_auto', 'pitch_trim_norm', 'engine_running', 'brake_norm'];
function assertFrozen(before, after, message) {
  assert.equal(after.step, before.step, message); assert.equal(after.t_s, before.t_s, message);
  assert.equal(after.digest, before.digest, message); assert.deepEqual(after.final_state, before.final_state, message);
}
function assertProgress(before, after) {
  assert(after.step > before.step && after.t_s > before.t_s, 'actual native time and steps advance while the page is hidden');
  assert.equal(after.dt_s, 1 / 120);
  assert(Math.abs((after.t_s - before.t_s) - (after.step - before.step) / 120) < 1e-8, 'background pacing retains fixed 1/120 s integration');
}
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) {
    if (server.exitCode !== null) throw Error(log); await sleep(100);
  }
  assert(log.includes('Local:'), log);
  // Connect without Playwright's force-visible/focused overrides. They remain
  // active on its owned CDP session even if a second session disables them.
  // A fresh profile and the default context isolate this actual-browser check.
  chromeProfile = await mkdtemp(join(tmpdir(), 'gefly-background-chrome-'));
  const chromeExecutable = process.env.CHROME || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : chromium.executablePath());
  const chromeArgs = ['--headless=new', `--user-data-dir=${chromeProfile}`, '--remote-debugging-port=0', '--no-first-run',
    '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-extensions', '--window-size=1440,1000', 'about:blank'];
  // Headless Chrome still generates genuine active/inactive-tab lifecycle
  // events while preventing the user's desktop input from entering the test.
  chromeProcess = spawn(chromeExecutable, chromeArgs, { stdio: 'pipe' });
  let chromeLog = ''; chromeProcess.stderr.on('data', data => { chromeLog = (chromeLog + data).slice(-16000); });
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    if (chromeProcess.exitCode !== null) throw Error(`Chrome exited: ${chromeLog}`);
    try { port = Number((await readFile(join(chromeProfile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch {}
    if (!port) await sleep(100);
  }
  assert(Number.isInteger(port) && port > 0 && port < 65536, `Chrome debugging endpoint unavailable: ${chromeLog}`);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
  browserProtocol = await browser.newBrowserCDPSession();
  const context = browser.contexts()[0]; assert(context, 'the fresh browser default context is available');
  observations.chromeLaunch = { executable: chromeExecutable,
    args: chromeArgs.filter(arg => !arg.startsWith('--user-data-dir=')), noDefaults: true };
  page = await context.newPage(); await page.setViewportSize({ width: 1440, height: 900 });
  page.on('pageerror', error => errors.push(String(error)));
  const pageProtocol = await context.newCDPSession(page);
  // Playwright otherwise forces every page to remain focused and visible, even
  // in headful Chrome. Disable that override before observing real tab changes.
  await pageProtocol.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.backgroundFlight = { states: [], stats: [], commands: [], lifecycle: [], ready: null };
    const record = event => window.backgroundFlight.lifecycle.push({ type: event.type, trusted: event.isTrusted,
      hidden: document.hidden, visibility: document.visibilityState, focused: document.hasFocus(), at_ms: performance.now(),
      step: window.backgroundFlight.states.at(-1)?.step });
    document.addEventListener('visibilitychange', record); window.addEventListener('blur', record); window.addEventListener('focus', record);
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.backgroundFlight.worker = this;
        const workerId = (window.backgroundFlight.workerCount ?? 0) + 1;
        window.backgroundFlight.workerCount = workerId; this.backgroundWorkerId = workerId;
        this.addEventListener('message', ({ data }) => {
          const target = window.backgroundFlight;
          if (data.type === 'ready') { target.ready = data; target.readyWorker = workerId; }
          if (data.type === 'stats') target.stats.push({ ...data, worker_id: workerId });
          if (data.type === 'state') { target.states.push({ ...data, worker_id: workerId, received_hidden: document.hidden }); if (target.states.length > 2400) target.states.shift(); }
        });
      }
      postMessage(message, ...args) {
        if (this === window.backgroundFlight.worker) window.backgroundFlight.commands.push({ ...message,
          worker_id: this.backgroundWorkerId, sent_hidden: document.hidden, at_ms: performance.now() });
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.backgroundFlight.states.length, null, { timeout: 60000 });
  // Cross-process navigation can recreate the renderer's emulation state.
  await pageProtocol.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  const other = await context.newPage(); await other.goto('about:blank');
  const otherProtocol = await context.newCDPSession(other);
  await otherProtocol.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.bringToFront();
  const { targetInfo } = await pageProtocol.send('Target.getTargetInfo');
  const browserWindow = await pageProtocol.send('Browser.getWindowForTarget', { targetId: targetInfo.targetId });
  const otherInfo = await otherProtocol.send('Target.getTargetInfo');
  const otherWindow = await otherProtocol.send('Browser.getWindowForTarget', { targetId: otherInfo.targetInfo.targetId });
  assert.equal(otherWindow.windowId, browserWindow.windowId, 'both real pages are tabs of the same Chrome window');
  observations.browserWindow = { flight: browserWindow, other: otherWindow };
  const visible = () => page.waitForFunction(() => !document.hidden, null, { polling: 100, timeout: 10000 });
  const hide = async () => {
    await other.bringToFront();
    await page.waitForFunction(() => document.hidden && document.visibilityState === 'hidden', null, { polling: 100, timeout: 10000 });
  };
  const show = async () => {
    await page.bringToFront(); await visible(); await sleep(250); await visible();
  };
  await visible(); await prepareFlightUI(page, { controls: false });
  const scene = page.locator('#scene');
  const stats = async () => {
    const count = await page.evaluate(() => window.backgroundFlight.stats.length);
    await page.evaluate(() => window.backgroundFlight.worker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.backgroundFlight.stats.length > count, count, { polling: 100 });
    return page.evaluate(() => window.backgroundFlight.stats.at(-1));
  };
  const input = () => page.evaluate(() => window.backgroundFlight.commands.filter(command => command.type === 'input').at(-1));
  const state = () => page.evaluate(() => window.backgroundFlight.states.at(-1));

  await scene.focus(); await page.keyboard.press('7');
  await page.locator('#flap-control').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await page.locator('#mixture-control').focus(); await page.keyboard.press('End');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await page.locator('#pitch-trim-control').focus(); await page.keyboard.press('ArrowDown');
  await scene.focus(); await page.keyboard.press('e'); await page.keyboard.press('e'); await page.keyboard.press('n');
  if(await page.locator('#status').textContent() !== 'Flying') await startOrResume(page);
  await page.waitForFunction(() => document.querySelector('#status').textContent==='Flying'&&window.backgroundFlight.states.at(-1)?.step >= 30);
  await scene.focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.backgroundFlight.states.at(-1)?.kap_engaged === 1);
  const activeBefore = await stats(), selected = await input();
  assert.equal(selected.throttle, .7); assert.equal(selected.flap_norm, 1 / 3);
  assert(selected.mixture_norm > 0 && selected.mixture_norm < 1, 'actual keyboard selection leaves a nondefault mixture setting');
  assert.equal(selected.mixture_auto, false); assert.equal(selected.engine_running, true); assert.equal(selected.brake_norm, 1);
  const commandIndex = await page.evaluate(() => window.backgroundFlight.commands.length);
  await hide(); const hiddenBefore = await stats(); await sleep(1800); const hiddenAfter = await stats();
  assertProgress(hiddenBefore, hiddenAfter);
  for (const key of ['kap_engaged', 'kap_lateral', 'kap_vertical', 'kap_heading_bug_rad', 'kap_hold_pressure_altitude_m'])
    assert.equal(hiddenAfter[key], activeBefore[key], `backgrounding preserves AP authority/target ${key}`);
  const hiddenInput = await input(); for (const key of latchedKeys) assert.equal(hiddenInput[key], selected[key], `backgrounding preserves ${key}`);
  const backgroundCommands = await page.evaluate(index => window.backgroundFlight.commands.slice(index), commandIndex);
  assert(!backgroundCommands.some(command => command.type === 'pause' || command.type === 'kap140' && command.command.action === 'disconnect'));
  assert((await page.evaluate(() => window.backgroundFlight.states.filter(s => s.received_hidden).length)) > 0);
  observations.autopilot = { before: brief(activeBefore), hiddenBefore: brief(hiddenBefore), hiddenAfter: brief(hiddenAfter),
    latched: Object.fromEntries(latchedKeys.map(key => [key, selected[key]])), backgroundCommands };
  checks.push('actual hidden Chrome tab advances native time/steps at fixed dt while preserving AP targets and latched controls');

  await show(); await scene.focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.backgroundFlight.states.at(-1)?.kap_engaged === 0);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => Math.abs(window.backgroundFlight.states.at(-1)?.elevator_cmd_norm) > .01);
  const heldBefore = await stats(), heldInput = await input(); assert.equal(heldInput.pilot_override, true);
  const releaseIndex = await page.evaluate(() => window.backgroundFlight.commands.length);
  await hide(); const released = await input();
  assert(Math.abs(released.elevator)<1e-12); assert(Math.abs(released.rudder)<1e-12); assert.equal(released.pilot_override, false);
  for (const key of latchedKeys) assert.equal(released[key], selected[key], `held-input release preserves ${key}`);
  await sleep(1000); const releasedAfter = await stats(); assertProgress(heldBefore, releasedAfter);
  const releaseCommands = await page.evaluate(index => window.backgroundFlight.commands.slice(index), releaseIndex);
  assert(releaseCommands.some(command => command.type === 'input' && command.elevator === 0 && command.pilot_override === false));
  assert(!releaseCommands.some(command => command.type === 'pause'));
  observations.heldRelease = { before: brief(heldBefore), after: brief(releasedAfter), commands: releaseCommands };
  await show(); await page.keyboard.up('ArrowUp');
  checks.push('actual window backgrounding releases held manual input synchronously without pausing or resetting selected power/mixture/flaps/trim');

  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await sleep(100); const paused = await stats(); await hide(); await sleep(700); const pausedHidden = await stats();
  assertFrozen(paused, pausedHidden, 'manual Pause remains authoritative while hidden');
  await show(); await sleep(500); const pausedVisible = await stats(); assertFrozen(paused, pausedVisible, 'foreground return cannot resume a manually paused flight');
  observations.manualPause = { before: brief(paused), hidden: brief(pausedHidden), visible: brief(pausedVisible) };
  checks.push('explicit Pause remains frozen across actual hidden/visible transitions, with no focus autoresume');

  await scene.focus(); await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const review = await stats(); await hide(); await sleep(700); const reviewHidden = await stats(); assertFrozen(review, reviewHidden, 'Review never advances native physics');
  await show(); await sleep(300); assertFrozen(review, await stats(), 'foreground Review stays stopped');
  assert.equal(await page.locator('#status').textContent(), 'Review');
  await page.locator('#review-exit').click(); await sleep(200); assertFrozen(review, await stats(), 'exiting Review entered from Pause remains paused');
  observations.review = { before: brief(review), hidden: brief(reviewHidden) };
  checks.push('Review stays native-state frozen while hidden and after foreground return');

  // Hold a real runtime response so ready/continuation acknowledgements arrive
  // only after the user-selected action's page has genuinely become hidden.
  let nextRuntimeGate;
  await context.route('**/studies/e1-browser/sim/dist/jsbsim.mjs*', async route => {
    const gate = nextRuntimeGate; nextRuntimeGate = null;
    if(gate) { gate.enter(); await gate.blocked; }
    await route.continue();
  });
  async function acknowledgeWhileHidden(trigger) {
    let enter, release;
    const entered = new Promise(resolve=>{enter=resolve;}), blocked = new Promise(resolve=>{release=resolve;});
    nextRuntimeGate = { enter, blocked };
    const workerId = (await page.evaluate(()=>window.backgroundFlight.workerCount))+1;
    try {
      await trigger();
      await Promise.race([entered,sleep(10000).then(()=>{throw Error('Expected the replacement worker runtime request');})]);
      await hide(); assert.equal(await page.evaluate(()=>document.hidden),true); release();
      await page.waitForFunction(id=>window.backgroundFlight.readyWorker===id&&document.querySelector('#status').textContent==='Flying'
        &&window.backgroundFlight.states.some(s=>s.worker_id===id&&s.step>5),workerId,{polling:100,timeout:30000});
      const before=await stats();await sleep(600);const after=await stats();assertProgress(before,after);
      assert(await page.evaluate(id=>window.backgroundFlight.commands.some(command=>command.worker_id===id&&command.type==='run'&&command.sent_hidden),workerId),
        'an explicit pending start runs on the real hidden page after native readiness');
      return {worker_id:workerId,before:brief(before),after:brief(after)};
    } finally { release(); nextRuntimeGate=null; }
  }
  if(await page.locator('#status').textContent()!=='Flying')await startOrResume(page);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying');
  observations.pendingReady=await acknowledgeWhileHidden(async()=>{
    await page.locator('#flight-menu > summary').click();await page.locator('#reset').click();
  });
  checks.push('explicit restart flight intent survives an actual hidden tab before the replacement native worker becomes ready');
  await show();await scene.focus();await page.keyboard.press('r');
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review');
  await page.locator('#review-time').focus();await page.keyboard.press('End');
  await page.waitForFunction(()=>!document.querySelector('#review-continue').disabled);
  observations.pendingContinuation=await acknowledgeWhileHidden(()=>page.locator('#review-continue').click());
  checks.push('explicit Continue live from Review starts after native acknowledgement while the real tab is hidden');
  await show();await page.locator('#pause').click();

  const lifecycle = await page.evaluate(() => window.backgroundFlight.lifecycle);
  assert(lifecycle.some(event => event.type === 'visibilitychange' && event.hidden && event.trusted), 'Chrome generated a trusted hidden visibility transition');
  assert(lifecycle.some(event => event.type === 'visibilitychange' && !event.hidden && event.trusted), 'Chrome generated a trusted visible transition');
  assert.deepEqual(errors, []);
  const ready = await page.evaluate(() => window.backgroundFlight.ready);
  await writeFile(`${output}/background-flight-browser.json`, JSON.stringify({ result: 'pass', browser: browser.version(),
    headless: true, backgroundMethod: 'Actual tab activation in one headless Chrome window', defaultBackgroundThrottling: true, playwrightFocusEmulation: false,
    trustedWindowBlurObserved: lifecycle.some(event=>event.type==='blur'&&event.trusted), checks, observations, lifecycle, nativeBuild: ready.build,
    limitations: 'Short actual hidden-tab checks establish continued progress, not guaranteed wall-clock speed or operation through OS sleep/browser suspension.' }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks, browser: browser.version(), lifecycle }, null, 2));
} catch (error) {
  await mkdir(output, { recursive: true });
  const diagnostic = page && !page.isClosed() ? await page.evaluate(() => ({ status: document.querySelector('#status')?.textContent,
    notice: document.querySelector('#notice')?.textContent, visibility: document.visibilityState,
    lifecycle: window.backgroundFlight?.lifecycle, states: window.backgroundFlight?.states.slice(-5), commands: window.backgroundFlight?.commands.slice(-12) })).catch(() => null) : null;
  await writeFile(`${output}/background-flight-browser.json`, JSON.stringify({ result: 'fail', error: String(error), errors, checks, observations, diagnostic }, null, 2));
  throw error;
} finally {
  if(browserProtocol)await browserProtocol.send('Browser.close').catch(()=>{});
  await browser?.close();
  if (chromeProcess && chromeProcess.exitCode === null) {
    chromeProcess.kill('SIGTERM');
    await Promise.race([new Promise(resolve => chromeProcess.once('exit', resolve)), sleep(5000)]);
  }
  if (chromeProfile) await rm(chromeProfile, { recursive: true, force: true });
  server.kill('SIGTERM');
}
