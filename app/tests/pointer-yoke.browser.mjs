// Trusted-pointer regression for hold-look borrowing the pointer without moving
// the yoke midpoint. Uses the real app/worker; never injects flight state.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

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
  // Observe the real camera handoff; no production hook or synthetic state.
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const assignment = /cameraLook\s*=\s*\{\s*yaw_rad\s*,\s*pitch_rad\s*,?\s*\}\s*;?/;
    assert(assignment.test(source), 'camera observation binds to the real handoff');
    await route.fulfill({ response, body: source.replace(assignment, value => `${value}; window.__pointerLook = { ...cameraLook }`) });
  });
  await page.addInitScript(() => {
    window.__pointerLook = { yaw_rad: 0, pitch_rad: 0 };
    const Native = window.Worker;
    window.__pointerInputs = []; window.__pointerStats = []; window.__pointerStates = []; window.__pointerApCommands = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__pointerWorker = this;
        this.addEventListener('message', event => {
          if (event.data?.type === 'stats') window.__pointerStats.push(event.data);
          if (event.data?.type === 'state') { window.__pointerStates.push(event.data); if (window.__pointerStates.length > 2000) window.__pointerStates.shift(); }
        });
      }
      postMessage(message, ...args) {
        if (this === window.__pointerWorker && message?.type === 'input') window.__pointerInputs.push(message);
        if (this === window.__pointerWorker && ['kap140', 'autopilot-capture'].includes(message?.type)) window.__pointerApCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  // This exercises the scene yoke independently of the optional stick overlay.
  await prepareFlightUI(page, { controls: false });
  const marker = page.locator('#yoke-center-marker');
  const markerCenter = async () => { await marker.waitFor({state:'visible'}); const box=await marker.boundingBox(); return {x:box.x+box.width/2,y:box.y+box.height/2}; };
  const markerAt = async (x,y) => { const center=await markerCenter(); assert(Math.abs(center.x-x)<1&&Math.abs(center.y-y)<1,JSON.stringify({center,expected:{x,y}})); };
  assert(await marker.isHidden());
  const mode = expected => page.waitForFunction(expected => document.querySelector('#scene').dataset.pointerMode === expected, expected);
  const axes = () => page.evaluate(() => ['roll-control', 'pitch-control'].map(id => Number(document.getElementById(id).textContent)));
  const stats = async () => {
    const count = await page.evaluate(() => window.__pointerStats.length);
    await page.evaluate(() => window.__pointerWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__pointerStats.length > count, count);
    return page.evaluate(() => window.__pointerStats.at(-1));
  };
  const frozen = (a, b) => { assert.equal(a.step, b.step); assert.equal(a.digest, b.digest); assert.deepEqual(a.final_state, b.final_state); };
  const markerObservations = [];
  const observeMarker = async label => {
    const native = await stats();
    markerObservations.push(await marker.evaluate((element, data) => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return { ...data, hidden: element.hidden, display: style.display, opacity: style.opacity,
        zIndex: style.zIndex, pointerEvents: style.pointerEvents,
        width: box.width, height: box.height, x: box.x, y: box.y,
        mode: document.querySelector('#scene').dataset.pointerMode };
    }, { label, nativeStep: native.step }));
  };
  const look = () => page.evaluate(() => ({ ...window.__pointerLook }));
  const hold = async (x, y) => {
    const centerBefore=await markerCenter();
    await page.mouse.down(); await page.waitForTimeout(300); await mode('look');
    await markerAt(centerBefore.x,centerBefore.y);
    await page.mouse.move(x, y, { steps: 3 }); const during = await look();
    await page.mouse.up(); await mode('yoke');
    assert.deepEqual(await look(), during, 'release keeps the dragged camera orientation');
    await markerAt(centerBefore.x,centerBefore.y);
    return during;
  };
  const sceneCenter = async label => {
    await page.waitForFunction(() => {
      const scene = document.querySelector('#scene').getBoundingClientRect();
      const marker = document.querySelector('#yoke-center-marker'), box = marker.getBoundingClientRect();
      return !marker.hidden && Math.abs(box.x + box.width / 2 - (scene.left + scene.right) / 2) < 1
        && Math.abs(box.y + box.height / 2 - (scene.top + scene.bottom) / 2) < 1;
    });
    const rect = await page.locator('#scene').boundingBox();
    await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2); await observeMarker(label);
  };
  assert(await page.locator('#centered-touchpad').isChecked(), 'fresh session uses fixed visible-scene center');
  const initialScene = await page.locator('#scene').boundingBox();
  await page.mouse.click(initialScene.x + initialScene.width * .75, initialScene.y + initialScene.height - 25);
  await mode('yoke'); await sceneCenter('default activation near bottom still centers the visible scene');
  await page.setViewportSize({ width: 1280, height: 860 }); await sceneCenter('default center follows resized visible scene');
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({ state: 'visible' }); await sceneCenter('default center follows scene beside docked map');
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1440, height: 900 }); await sceneCenter('default center restores after map and resize');
  // Explicit opt-out retains the independent relative-anchor regression below.
  await page.locator('#controls-settings').click(); await page.locator('#centered-touchpad').uncheck();
  await page.locator('#settings-close').click();
  await page.waitForFunction(() => !document.querySelector('#control-settings').open && document.activeElement.id === 'scene');
  await page.keyboard.press('Escape'); await mode('off'); await marker.waitFor({ state: 'hidden' });
  const before = await stats();
  await page.mouse.click(1000, 160); await mode('yoke');
  await markerAt(1000,160);
  await page.mouse.move(1075, 130);
  const original = await axes(); assert(original[0] > 0 && original[1] > 0);
  const firstLook = await hold(1250, 230);
  assert(Math.abs(firstLook.yaw_rad - .7) < .001 && Math.abs(firstLook.pitch_rad + .4) < .001);
  const secondLook = await hold(1200, 180);
  assert(Math.abs(secondLook.yaw_rad - .5) < .001 && Math.abs(secondLook.pitch_rad + .2) < .001,
    'the next relative-mode drag accumulates from the retained view');
  await page.mouse.move(1075, 130);
  assert.deepEqual(await axes(), original, 'paused look release preserves both original-axis references');
  await page.mouse.move(1000, 160);
  const neutral = await axes(); assert.equal(neutral[1], 0);
  frozen(before, await stats());
  await page.locator('#controls-settings').click();
  await marker.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#centered-touchpad').isChecked(), false, 'retained look needs no centered-yoke opt in');
  assert.deepEqual(await look(), secondLook);
  await page.locator('#settings-close').click();
  await mode('yoke'); await markerAt(1000, 160);
  assert.deepEqual(await look(), secondLook, 'Options never resets the view');
  frozen(before, await stats());

  await page.mouse.dblclick(1200, 220); await mode('yoke');
  assert.deepEqual(await look(), { yaw_rad: 0, pitch_rad: 0 }, 'trusted browser double-click centers retained look');
  assert.deepEqual(await axes(), neutral, 'double-click ends with neutral controls');
  await page.mouse.move(1075, 130); assert.deepEqual(await axes(), original,
    'the browser pair restores the original relative anchor rather than the double-click location');
  await page.mouse.move(1000, 160); frozen(before, await stats());

  await observeMarker('active yoke before starting');
  await startOrResume(page);
  await mode('yoke'); await markerAt(1000, 160);
  await observeMarker('Start retains selected yoke reference');
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
  await marker.waitFor({state:'hidden'});
  await page.mouse.click(1100, 160); await mode('yoke');
  await page.mouse.move(1175, 130); assert.deepEqual(await axes(), liveAxes, 'a short click can intentionally establish a new midpoint');
  await page.keyboard.press('Escape'); await mode('off');
  assert.deepEqual(await look(), { yaw_rad: 0, pitch_rad: 0 }, 'Escape explicitly centers the view');
  await page.locator('#pause').click();
  const paused = await stats(); await page.waitForTimeout(100); frozen(paused, await stats());

  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await marker.waitFor({state:'hidden'});
  await page.mouse.move(1000, 160); await page.mouse.down(); await page.waitForTimeout(300);
  await page.mouse.move(1050, 120); await page.mouse.up(); await mode('off');
  assert.notEqual((await look()).yaw_rad, 0);
  const reviewInputs = await page.evaluate(() => window.__pointerInputs.length);
  await page.mouse.dblclick(1200, 220); await mode('off');
  assert.deepEqual(await look(), { yaw_rad: 0, pitch_rad: 0 });
  assert.equal(await page.evaluate(() => window.__pointerInputs.length), reviewInputs, 'Review double-click never writes live flight inputs');
  frozen(paused, await stats());
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');

  await page.locator('#controls-settings').click(); await page.locator('#centered-touchpad').check();
  await page.locator('#settings-close').click();
  const rect = await page.locator('#scene').boundingBox();
  const sample = { x: rect.x + rect.width / 2 + 75, y: rect.y + rect.height / 2 - 75 };
  await page.mouse.click(1000, 160); await mode('yoke');
  await markerAt(rect.x+rect.width/2,rect.y+rect.height/2);
  await page.mouse.move(sample.x, sample.y); const centeredAxes = await axes();
  await hold(sample.x + 50, sample.y + 20);
  assert.notEqual((await look()).yaw_rad, 0);
  await page.mouse.dblclick(1200, 220); await mode('yoke');
  assert.deepEqual(await look(), { yaw_rad: 0, pitch_rad: 0 });
  await page.mouse.move(sample.x, sample.y); assert.deepEqual(await axes(), centeredAxes);
  frozen(paused, await stats());
  // Cover actual live presentation: the earlier marker assertions were mainly
  // paused. Starting and AP capture have separate input-neutralization routes.
  await startOrResume(page);
  await mode('yoke');
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await observeMarker('centered yoke while flying');
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await mode('yoke'); await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  const stoppedWithYoke = await stats(); await page.waitForTimeout(80); frozen(stoppedWithYoke, await stats());
  await startOrResume(page); await mode('yoke');
  await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await observeMarker('pause and resume retain centered reference');
  await page.locator('#view-menu > summary').click(); await marker.waitFor({ state: 'hidden' });
  await page.locator('#view-menu > summary').click(); await mode('yoke');
  await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await observeMarker('menu dismissal restores retained marker');
  await page.locator('#scene').focus(); await page.keyboard.down('a');
  await page.mouse.move(rect.x + rect.width / 2 + 30, rect.y + rect.height / 2 - 15);
  await page.keyboard.up('a');
  await page.waitForFunction(() => document.querySelector('#ap-engage').getAttribute('aria-pressed') === 'true');
  await mode('yoke');
  await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.keyboard.press('a');
  await page.waitForFunction(() => {
    const state = window.__pointerStates.at(-1);
    return state?.kap_engaged === 0 && state.ap_mode === 0 && state.ap_aileron_norm === 0 && state.kap_elevator_norm === 0
      && document.querySelector('#ap-engaged-label').textContent === 'OFF';
  });
  await mode('yoke'); await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await observeMarker('A disconnect retains selected reference with both native servo outputs off');
  await page.keyboard.press('a'); await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_engaged === 1);
  await page.locator('#ap-engage').click(); await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_engaged === 0);
  await mode('yoke'); await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.locator('#scene').focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_engaged === 1);
  await observeMarker('AP capture retains selected centered reference');
  const liveMarker = markerObservations.at(-1);
  assert(!liveMarker.hidden && Number(liveMarker.opacity) > 0 && liveMarker.width > 0 && liveMarker.pointerEvents === 'none');
  assert(liveMarker.nativeStep > paused.step, 'marker check observes an advancing native flight');
  await page.screenshot({ path: `${output}/pointer-yoke-live-center.png` });
  const armObservations = [];
  const observeArm = async label => armObservations.push(await page.evaluate(label => {
    const state = window.__pointerStates.at(-1), input = window.__pointerInputs.at(-1);
    return { label, step: state.step, engaged: state.kap_engaged, armed: state.kap_alt_arm,
      selected_altitude_m: state.kap_selected_altitude_m, vertical: state.kap_vertical,
      yokeMode: document.querySelector('#scene').dataset.pointerMode,
      armLabel: document.querySelector('#ap-arm').textContent,
      input: { elevator: input.elevator, aileron: input.aileron, pilot_override: input.pilot_override } };
  }, label));
  await observeArm('A engaged with active centered yoke');
  const armBox = await page.locator('#ap-arm').boundingBox();
  await page.mouse.move((rect.x + rect.width / 2 + armBox.x + armBox.width / 2) / 2,
    Math.min(rect.y + rect.height - 20, (rect.y + rect.height / 2 + armBox.y) / 2), { steps: 5 });
  await page.waitForTimeout(100); await observeArm('pointer crosses scene toward ARM');
  assert.equal(armObservations.at(-1).engaged, 1, 'immediate/passive pointer movement must not disconnect captured AP');
  assert.equal(armObservations.at(-1).input.pilot_override, false);
  await page.locator('#ap-arm').click(); await page.waitForTimeout(100); await observeArm('ARM clicked after crossing scene');
  assert.equal(armObservations.at(-1).engaged, 1); assert.equal(armObservations.at(-1).armed, 1);
  await markerAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.locator('#scene').focus(); await page.keyboard.press('Escape'); await mode('off');
  await page.locator('#ap-engage').click(); await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_engaged === 0);
  await page.keyboard.press('a');
  await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_engaged === 1 && window.__pointerStates.at(-1)?.kap_alt_arm === 0);
  await observeArm('A engaged with yoke off');
  await page.locator('#ap-arm').click(); await page.waitForTimeout(100); await observeArm('ARM clicked with yoke off');
  assert.equal(armObservations.at(-1).engaged, 1); assert.equal(armObservations.at(-1).armed, 1);
  await page.locator('#ap-selector-increase').click(); await page.waitForTimeout(100); await observeArm('altitude preselection auto-arms');
  assert.equal(armObservations.at(-1).armed, 1);
  assert(armObservations.at(-1).selected_altitude_m > armObservations.at(-2).selected_altitude_m);
  await page.locator('#ap-arm').click(); await page.waitForTimeout(100); await observeArm('pressing already-ARMED cancels it');
  assert.equal(armObservations.at(-1).engaged, 1); assert.equal(armObservations.at(-1).armed, 0);
  const oldSelection = armObservations.at(-1).selected_altitude_m;
  await page.locator('#scene').focus(); await page.locator('#ap-engage').click();
  await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_engaged === 0);
  await page.keyboard.press('a');
  await page.waitForFunction(previous => Math.abs(window.__pointerStates.at(-1)?.kap_selected_altitude_m - previous) > 1, oldSelection);
  const typingStart = await page.evaluate(() => window.__pointerApCommands.length);
  await page.locator('#ap-selector-value').fill('2500');
  assert(await page.locator('#ap-selector-value').evaluate(input => document.activeElement === input), 'altitude text remains focused before ARM');
  await page.locator('#ap-arm').click();
  await page.waitForFunction(() => Math.abs(window.__pointerStates.at(-1)?.kap_selected_altitude_m - 2500 * .3048) < 1e-8);
  await page.waitForTimeout(100); await observeArm('direct unblurred altitude typing then ARM');
  const directTypingCommands = await page.evaluate(start => window.__pointerApCommands.slice(start), typingStart);
  assert.equal(armObservations.at(-1).engaged, 1); assert.equal(armObservations.at(-1).armed, 1,
    'the ARM press committing a new altitude must preserve its automatic arm');
  assert.deepEqual(directTypingCommands.filter(message => ['select-altitude', 'arm'].includes(message.command?.action)).map(message => message.command),
    [{ action: 'select-altitude', value: 2500 * .3048 }], 'the same blur/click gesture must not send a duplicate ARM toggle');
  await page.locator('#ap-arm').click();
  await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_alt_arm === 0);
  await observeArm('next explicit ARMED press cancels typed-altitude capture');
  assert.equal(armObservations.at(-1).engaged, 1); assert.equal(armObservations.at(-1).armed, 0);
  const knobStart = await page.evaluate(() => window.__pointerApCommands.length);
  await page.locator('#ap-selector-increase').click(); await page.waitForTimeout(100); await observeArm('knob selection before ARM');
  await page.locator('#ap-arm').click(); await page.waitForTimeout(100); await observeArm('ARM after separately committed knob selection');
  const knobCommands = await page.evaluate(start => window.__pointerApCommands.slice(start), knobStart);
  await page.mouse.click(1000, 160); await mode('yoke');
  const inhibitedStart = await page.evaluate(() => window.__pointerInputs.length);
  await page.locator('#scene').focus(); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(200);
  await observeArm('keyboard steering is inhibited while AP is engaged');
  assert.equal(armObservations.at(-1).engaged, 1);
  assert(await page.evaluate(start => window.__pointerInputs.slice(start).every(input => !input.pilot_override && input.aileron === 0), inhibitedStart));
  await page.keyboard.up('ArrowRight');
  await page.locator('#ap-cws').hover(); await page.mouse.down();
  await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_cws === 1);
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => window.__pointerInputs.at(-1)?.elevator < 0 && window.__pointerStates.at(-1)?.kap_cws === 1);
  await observeArm('held CWS permits manual keyboard input without disconnect');
  assert.equal(armObservations.at(-1).engaged, 1);
  await page.keyboard.up('ArrowDown'); await page.mouse.up();
  await page.waitForFunction(() => window.__pointerStates.at(-1)?.kap_cws === 0 && window.__pointerStates.at(-1)?.kap_engaged === 1);
  await observeArm('CWS release reacquires AP');
  assert.deepEqual(errors, []);
  const result = { result: 'pass', checks: [
    'faint neutral marker follows the authoritative relative/centered yoke reference, retains it through look, and hides off/in Review',
    'fresh default activation near the bottom keeps the marker at the visible-scene center through resize and map docking; relative mode remains an explicit option',
    'Start, pause/resume, menu dismissal, Options Save and AP capture retain the selected yoke mode and neutral marker',
    'A capture tolerates immediate/passive pointer movement and keyboard steering; held CWS permits manual input',
    'paused hold-look preserves original midpoint without advancing actual JSBSim',
    'live hold-look preserves original midpoint and actual aileron/elevator commands',
    'outside release/re-entry and short-click toggle retain their separate behavior',
    'relative-mode look retains and accumulates after release and Options; Escape explicitly centers it',
    'trusted double-click centers relative/centered/Review look, preserves pre-pair mode and relative anchor, and leaves paused native state unchanged',
  ], originalCommands, markerObservations, armObservations, directTypingCommands, knobCommands };
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/pointer-yoke-browser.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await browser?.close(); server.kill(); }
