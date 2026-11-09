// Actual native telemetry and real UI; only background scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5250';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const diagnosticStage = process.env.WARNING_DIAGNOSTIC_STAGE === 'baseline' ? 'baseline' : 'candidate';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5250,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', x => { log += x; }); server.stderr.on('data', x => { log += x; });
const checks = [];
try {
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(r => setTimeout(r, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  // UI-only diagnosis: real current header/component/styles, with explicitly
  // synthetic active warnings. This establishes stacking, not native onset.
  const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const header = mainSource.match(/<header class="topbar">[\s\S]*?<\/header>/)?.[0];
  assert(header, 'current application header is available for layout diagnosis');
  await page.route(`${origin}/warning-panel-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"><main class="flight-app">${header}<aside id="flight-warnings"></aside><aside id="flight-plan-overlay" class="flight-plan-overlay"><div class="flight-plan-overlay-heading"><strong>Flight plan</strong><button>Close</button></div></aside></main></div><script type="module">import '/src/style.css';import{createFlightWarningsPanel}from'/src/flight-warnings-panel.ts';import{createFlightPlanPanel}from'/src/map-flight-plan-panel.ts';const p=createFlightPlanPanel({onAction:()=>({ok:true,value:undefined})});document.querySelector('#flight-plan-overlay').append(p.element);window.warningFixture=createFlightWarningsPanel({container:document.querySelector('#flight-warnings')});window.warningFixture.update({stall:'active',terrain:'active',terrainClearance_m:10,terrainClosure_mps:5,terrainTime_s:2},false);window.fixtureReady=true;</script></body></html>` }));
  await page.goto(`${origin}/warning-panel-fixture.html`);
  await page.waitForFunction(() => window.fixtureReady === true);
  const layout = [];
  for (const width of [1440, 812, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const headerVisible of [false, true]) for (const planVisible of [false, true]) {
      await page.evaluate(({ headerVisible, planVisible }) => {
        document.querySelector('.topbar').hidden = !headerVisible;
        document.querySelector('#flight-plan-overlay').hidden = !planVisible;
      }, { headerVisible, planVisible });
      layout.push(await page.evaluate(() => {
        const light = document.querySelector('[data-warning=stall]');
        const rect = light.getBoundingClientRect(), header = document.querySelector('.topbar').getBoundingClientRect();
        light.style.pointerEvents = 'auto';
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        light.style.pointerEvents = '';
        return { width: innerWidth, height: innerHeight, headerVisible: !document.querySelector('.topbar').hidden,
          planVisible: !document.querySelector('#flight-plan-overlay').hidden, light: rect.toJSON(), header: header.toJSON(),
          topAtBadge: top?.outerHTML.slice(0, 250), unobscured: top === light || light.contains(top) };
      }));
      if (headerVisible && planVisible) {
        await mkdir(output, { recursive: true });
        await page.screenshot({ path: `${output}/flight-warning-task132-${diagnosticStage}-stacking-${width}.png` });
      }
    }
  }
  const recentPresentation = await page.evaluate(() => {
    const warnings = { stall: 'active', terrain: 'clear', stallRecent: true, terrainClearance_m: 100, terrainClosure_mps: 0, terrainTime_s: null };
    const light = document.querySelector('[data-warning=stall]');
    window.warningFixture.update(warnings, false);
    const recent = { text: light.textContent, title: light.title, aria: light.getAttribute('aria-label'), marker: light.dataset.recent };
    window.warningFixture.update({ ...warnings, stallRecent: false }, false);
    const current = { text: light.textContent, aria: light.getAttribute('aria-label'), marker: light.dataset.recent };
    window.warningFixture.update(warnings, true);
    const review = { text: light.textContent, title: light.title, aria: light.getAttribute('aria-label'), marker: light.dataset.recent };
    return { recent, current, review };
  });
  assert.equal(recentPresentation.recent.text, 'RECENT STALL');
  assert.match(recentPresentation.recent.aria, /current native signal clear/);
  assert.match(recentPresentation.recent.title, /current signal is clear/);
  assert.equal(recentPresentation.current.text, 'STALL !');
  assert.equal(recentPresentation.current.aria, 'stall active');
  assert.equal(recentPresentation.review.text, 'STALL !');
  assert.equal(recentPresentation.review.marker, 'false');
  await page.evaluate(() => window.warningFixture.update({stall:'unavailable',terrain:'clear',terrainClearance_m:null,terrainClosure_mps:null,terrainTime_s:null},false));
  const unavailableVisible = await page.locator('[data-warning=stall]').isVisible();
  const unavailableLabel = await page.locator('[data-warning=stall]').textContent();
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/flight-warning-task132-${diagnosticStage}-layout.json`, JSON.stringify({ kind: 'synthetic UI only; no native onset assertion', layout, recentPresentation, unavailableVisible, unavailableLabel, browser: browser.version() }, null, 2));
  if (process.env.WARNING_UI_ONLY === '1') {
    console.log(JSON.stringify({ layout, unavailableVisible }, null, 2));
    assert(layout.every(row => row.unobscured), 'active warning badge stays above nonmodal panels/header');
    assert(unavailableVisible, 'missing warning telemetry has a visible unavailable indication');
    assert.match(unavailableLabel, /N\/A/);
    for (const row of layout) {
      assert(row.light.x >= 0 && row.light.right <= row.width && row.light.y >= 0 && row.light.bottom <= row.height, 'badge stays inside viewport');
      if (row.headerVisible) assert(row.light.top >= row.header.bottom, 'badge clears actual responsive header');
    }
    process.exitCode = 0;
  } else {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.warningContexts = []; window.warningStallGainEvents = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super({ ...args[0], sinkId: { type: 'none' } }); window.warningContexts.push(this); }
      createOscillator() {
        const oscillator = super.createOscillator(), connect = oscillator.connect;
        oscillator.connect = function(destination, ...args) {
          // Identify the actual connected stall oscillator, not a gain index or
          // injected warning. Forward every original Web Audio operation.
          if (oscillator.frequency.value === 450 && destination instanceof GainNode) {
            for (const method of ['setTargetAtTime', 'setValueAtTime']) {
              const original = destination.gain[method];
              destination.gain[method] = function(...values) {
                window.warningStallGainEvents.push({ method, values, contextState: oscillator.context.state,
                  hidden: document.hidden, status: document.querySelector('#audio-toggle')?.dataset.audioState,
                  warningStatus: document.querySelector('[data-warning=stall]')?.dataset.status,
                  reviewing: document.querySelector('#flight-warnings')?.dataset.review,
                  state: window.warningStates?.at(-1) });
                return original.apply(this, values);
              };
            }
          }
          return connect.call(this, destination, ...args);
        };
        return oscillator;
      }
    };
    const Native = window.Worker;
    window.warningStates = []; window.warningStats = []; window.warningWorkerId = 0;
    window.warningPanelEvents = [];
    addEventListener('DOMContentLoaded', () => {
      let signature = '';
      new MutationObserver(() => {
        const stall = document.querySelector('#flight-warnings [data-warning=stall]');
        const terrain = document.querySelector('#flight-warnings [data-warning=terrain]');
        if (!stall || !terrain) return;
        const next = `${window.warningWorkerId}/${stall.dataset.status}/${stall.dataset.recent}/${terrain.dataset.status}`;
        if (next === signature) return; signature = next;
        window.warningPanelEvents.push({ worker_id: window.warningWorkerId, stall: stall.dataset.status,
          recent: stall.dataset.recent,
          terrain: terrain.dataset.status, text: stall.textContent, color: getComputedStyle(stall).color,
          state: window.warningStates.at(-1) });
        if (window.warningPanelEvents.length > 100) window.warningPanelEvents.shift();
      }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-status', 'data-recent'] });
    }, { once: true });
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.warningWorker = this; const id = ++window.warningWorkerId;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') { window.warningStates.push({ ...data, worker_id: id }); if (window.warningStates.length > 5000) window.warningStates.shift(); }
          if (data.type === 'stats') window.warningStats.push(data);
        });
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.warningStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const panel = page.locator('#flight-warnings'), scene = page.locator('#scene');
  const status = name => panel.locator(`[data-warning=${name}]`).getAttribute('data-status');
  const stats = async () => {
    const n = await page.evaluate(() => window.warningStats.length);
    await page.evaluate(() => window.warningWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.warningStats.length > n, n);
    return page.evaluate(() => window.warningStats.at(-1));
  };
  const frozen = async before => { const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  assert.equal(await status('stall'), 'clear'); assert.equal(await status('terrain'), 'clear');
  assert.equal(await panel.evaluate(e => getComputedStyle(e).pointerEvents), 'none');
  assert(await panel.isHidden());
  assert(await panel.locator('[data-warning=stall]').isHidden());
  assert(await panel.locator('[data-warning=terrain]').isHidden());
  const initial = await stats(); await page.locator('#controls-settings').click(); await page.locator('#settings-close').click(); await frozen(initial);
  checks.push('clear warnings leave no fixed labels or empty panel; paused Options preserve physics');

  await startOrResume(page); await page.waitForFunction(() => window.warningStates.at(-1).step >= 60);
  await page.locator('#pause').click(); await page.waitForTimeout(80);
  const paused = await stats();
  await scene.focus(); await page.keyboard.press('r'); await page.locator('#flight-review').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#flight-warnings').dataset.review === 'true');
  assert.equal(await panel.getAttribute('data-review'), 'true'); assert.match(await panel.textContent(), /REVIEW/);
  assert(await panel.isHidden(), 'clear replay cues leave no fixed REVIEW label');
  assert.match(await panel.getAttribute('aria-label'), /recomputed/);
  await page.locator('#review-time').focus(); await page.keyboard.press('End'); await frozen(paused);
  await scene.focus(); await page.keyboard.press('r'); await frozen(paused);
  checks.push('Review labels recomputed recorded-state cues and never advances actual paused flight');

  const preset = async name => {
    const id = await page.evaluate(() => window.warningWorkerId);
    await page.locator('#flight-menu > summary').click();
    if (!await page.locator('#flight-research').evaluate(element => element.open)) await page.locator('#flight-research > summary').click();
    await page.locator(`[data-landing=${name}]`).click();
    await page.waitForFunction(id => window.warningWorkerId > id && !document.querySelector('#start').disabled, id, { timeout: 60000 });
  };
  await preset('hard');
  const hard = await page.evaluate(() => window.warningStates.at(-1));
  assert(hard.ground_agl_m > 0 && hard.ground_agl_m < 4 && hard.ground_down_mps >= 3);
  await page.waitForFunction(() => document.querySelector('[data-warning=terrain]').dataset.status === 'active');
  assert(await panel.locator('[data-warning=terrain]').isVisible());
  assert(await panel.locator('[data-warning=stall]').isHidden());
  assert((await panel.boundingBox()).y >= (await page.locator('.topbar').boundingBox()).height);
  assert.match(await panel.textContent(), /TERRAIN !/); await frozen(await stats());
  await preset('normal');
  await page.waitForFunction(() => document.querySelector('[data-warning=terrain]').dataset.status === 'clear');
  assert.equal(await status('terrain'), 'clear', 'normal shallow native descent is not labeled as a terrain warning');
  assert(await panel.isHidden(), 'terrain cue disappears again when clear');
  await startOrResume(page);
  await page.waitForFunction(() => window.warningStates.at(-1).on_ground === 1 || window.warningStates.at(-1).collision_mask > 0, null, { timeout: 10000 });
  await page.waitForFunction(() => [...document.querySelectorAll('#flight-warnings [data-warning]')].every(e => e.dataset.status === 'clear'));
  checks.push('native steep-descent preset activates terrain, shallow descent stays clear, and real contact suppresses warnings');

  // Reset preserves a running flight's intent; pause the landing first.
  if ((await page.locator('#pause').textContent()).trim().startsWith('Pause')) await page.locator('#pause').click();
  const id = await page.evaluate(() => window.warningWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#flight-research').evaluate(element => { element.open = true; }); await page.locator('#airborne-practice').click();
  await page.waitForFunction(id => window.warningWorkerId > id && !document.querySelector('#start').disabled, id, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.warningContexts.length), 0, 'default-off sound creates no context');
  await startOrResume(page); await scene.focus(); await page.keyboard.press('Backquote');
  // Existing repeatable stress fixture, not a stall procedure or a source of
  // aircraft limits. Retained-trim manual pull alone can roll off before onset.
  await page.locator('#pitch-trim-control').focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => window.warningStates.at(-1).pitch_trim_norm === -1);
  await scene.focus();
  // Combine the existing scene-yoke and keyboard travel for a repeatable test
  // maneuver; no aircraft/model values or native state are replaced.
  const sceneBox = await scene.boundingBox();
  const centerX = sceneBox.x + sceneBox.width / 2, centerY = sceneBox.y + sceneBox.height / 2;
  await page.mouse.click(centerX, centerY);
  await page.waitForFunction(() => document.querySelector('#scene').dataset.pointerMode === 'yoke');
  await page.mouse.move(centerX, centerY + 150);
  await page.keyboard.down('ArrowDown');
  try {
    await page.waitForFunction(() => window.warningStates.at(-1).elevator_cmd_norm < -.7, null, { timeout: 10000 });
    await page.waitForFunction(() => window.warningPanelEvents.some(e => e.worker_id === window.warningWorkerId && e.stall === 'active'), null, { timeout: 20000 });
  } catch (error) {
    await mkdir(output, { recursive: true });
    const trace = await page.evaluate(() => ({ states: window.warningStates.slice(-800), mode: document.querySelector('#scene').dataset.pointerMode, status: document.querySelector('#pause').textContent, panel: window.warningPanelEvents, notice: document.querySelector('#notice').textContent }));
    await writeFile(`${output}/flight-warning-stall-diagnostic.json`, JSON.stringify(trace));
    throw error;
  }
  assert.equal(await page.evaluate(() => window.warningContexts.length), 0, 'genuine positive native warning remains silent with default sound off');
  await page.keyboard.press('s');
  await page.waitForFunction(() => window.warningStallGainEvents.some(event => event.values[0] > 0
    && event.contextState === 'running' && event.state?.stall_warning_norm > 0 && event.state?.on_ground === 0), null, { timeout: 10000 });
  const horn = await page.evaluate(() => window.warningStallGainEvents.filter(event => event.values[0] > 0 && event.state?.stall_warning_norm > 0).at(-1));
  assert.equal(horn.hidden, false); assert.equal(horn.reviewing, 'false');
  assert.equal(horn.warningStatus, 'active'); assert.equal(horn.contextState, 'running');
  await page.keyboard.press('Space'); await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => window.warningStallGainEvents.at(-1)?.values[0] === 0);
  const stall = await page.evaluate(() => window.warningStates.filter(s => s.stall_warning_norm > 0 && s.on_ground === 0).at(-1));
  assert(stall.stall_warning_norm > 0);
  const stallEvent = await page.evaluate(() => window.warningPanelEvents.filter(e => e.worker_id === window.warningWorkerId && e.stall === 'active' && e.recent !== 'true' && e.state?.stall_warning_norm > 0).at(-1));
  const recentEvents = await page.evaluate(() => window.warningPanelEvents.filter(e => e.worker_id === window.warningWorkerId && e.recent === 'true'));
  assert.match(stallEvent.text, /STALL !/);
  checks.push('actual idle maximum-nose-up-trim/pull stress fixture produces native stall warning, visible STALL and connected450Hz gain; explicit Pause silences it');
  // The source warning is brief and can clear before the pause command is
  // acknowledged. Select the exact recorded positive native frame for the
  // layout check rather than extending/injecting a live warning.
  await scene.focus(); await page.keyboard.press('r');
  await page.locator('#flight-review').waitFor({ state: 'visible' });
  await page.locator('#review-time').evaluate((element, time_s) => {
    element.value = String(time_s); element.dispatchEvent(new Event('input', { bubbles: true }));
  }, horn.state.t_s);
  await page.waitForFunction(() => document.querySelector('[data-warning=stall]').dataset.status === 'active');
  const positiveSchedules = await page.evaluate(() => window.warningStallGainEvents.filter(event => event.values[0] > 0).length);
  await scene.focus(); await page.keyboard.press('p'); await page.keyboard.press('m');
  await page.locator('#flight-plan-overlay').waitFor({ state: 'visible' });
  const nativeLayout = [];
  const stoppedStall = await stats();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(100);
    nativeLayout.push(await panel.locator('[data-warning=stall]').evaluate(light => {
      const rect = light.getBoundingClientRect(); light.style.pointerEvents = 'auto';
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      light.style.pointerEvents = '';
      return { width: innerWidth, rect: rect.toJSON(), active: light.dataset.status,
        reviewing: document.querySelector('#flight-warnings').dataset.review,
        unobscured: top === light || light.contains(top), topAtBadge: top?.outerHTML.slice(0, 200) };
    }));
  }
  await writeFile(`${output}/flight-warning-task132-native-chain.json`, JSON.stringify({ horn, nativeLayout, stoppedStall }, null, 2));
  assert(nativeLayout.every(row => row.active === 'active' && row.unobscured), 'native active STALL remains readable with actual map/plan/topbar open');
  await frozen(stoppedStall);
  assert.equal(await page.evaluate(() => window.warningStallGainEvents.filter(event => event.values[0] > 0).length), positiveSchedules, 'selected recorded active warning stays silent in Review');
  checks.push('exact recorded native-positive frame stays visible above actual map/plan/topbar at desktop/mobile sizes; Review is silent and paused native state unchanged');
  const bounds = await panel.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/flight-warning-panel-mobile.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/flight-warnings-browser.json`, JSON.stringify({ checks, hard, stall, stallEvent, recentEvents, horn, nativeLayout,
    audioOutput: 'Real native telemetry and original connected Web Audio automation observed through silent sink; physical speakers/human listening not evaluated.', browser: browser.version() }, null, 2));
  console.log(JSON.stringify({ checks, browser: browser.version() }, null, 2));
  assert(layout.every(row => row.unobscured), 'active warning badge stays above nonmodal panels/header');
  assert(unavailableVisible, 'missing warning telemetry has a visible unavailable indication');
  }
} finally { await browser?.close(); server.kill(); }
