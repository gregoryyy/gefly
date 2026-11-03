// Original simulator warning waveforms and actual-worker AP disconnect wiring.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5251';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5251,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
const checks = [], observations = {};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Warning audio server timed out: ${serverOutput}`); await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.route(`${origin}/warning-audio-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Warning waveform fixture</title>' }));
  await page.goto(`${origin}/warning-audio-fixture.html`);
  observations.waveforms = await page.evaluate(async () => {
    const { createEngineAudioGraph } = await import('/src/engine-audio.ts');
    const { engineAudioParameters } = await import('/src/engine-audio-parameters.ts');
    const results = [];
    for (const name of ['stall', 'terrain', 'stall-then-missing', 'terrain-then-missing', 'normal-clear', 'unavailable-warnings',
      'disconnect', 'same-frame-disconnect', 'initial-off', 'muted', 'paused', 'review',
      'forward-seek', 'backward-seek', 'missing-ap', 'disconnect-then-pause', 'disconnect-then-mute', 'disconnect-then-review', 'disconnect-then-seek', 'dispose']) {
      const rate = 48000, context = new OfflineAudioContext(1, rate * 1.6, rate), graph = createEngineAudioGraph(context);
      const state = (step, time_s) => ({ step, t_s: time_s, tas_mps: 0, prop_radps: 0, fuel_flow_m3ps: 0 });
      const warning = (step, time_s, kapEngaged = 1) => ({ step, time_s, kapEngaged, live: true,
        warnings: { stall: 'clear', terrain: 'clear', terrainClearance_m: null, terrainClosure_mps: null, terrainTime_s: null } });
      graph.update(engineAudioParameters(state(0, 0)), 1, true, warning(0, 0, name === 'initial-off' ? 0 : 1));
      const times = [.2, name === 'terrain-then-missing' ? .25 : .4, .7, .95, 1.1], waits = times.map(time => context.suspend(time)), rendering = context.startRendering();
      for (let i = 0; i < times.length; i++) {
        await waits[i]; const time = times[i];
        const frame = warning(Math.round(time * 120), time,
          ['stall', 'terrain', 'stall-then-missing', 'terrain-then-missing', 'normal-clear', 'unavailable-warnings'].includes(name) ? 1 : 0);
        if (name === 'stall' && time < 1.1) frame.warnings.stall = 'active';
        if (name === 'terrain' && time < 1.1) frame.warnings.terrain = 'active';
        if (name === 'stall-then-missing') frame.warnings.stall = i === 0 ? 'active' : 'unavailable';
        if (name === 'terrain-then-missing') frame.warnings.terrain = i === 0 ? 'active' : 'unavailable';
        if (name === 'unavailable-warnings') { frame.warnings.stall = 'unavailable'; frame.warnings.terrain = 'unavailable'; }
        if (name === 'same-frame-disconnect') { frame.step = 0; frame.time_s = 0; }
        if (name === 'forward-seek' || (name === 'disconnect-then-seek' && i > 0)) { frame.step += 1200; frame.time_s += 10; }
        if (name === 'backward-seek') { frame.step = 0; frame.time_s = -1; }
        if (name === 'missing-ap') frame.kapEngaged = null;
        if (name === 'review' || (name === 'disconnect-then-review' && i > 0)) frame.live = false;
        if (name === 'dispose' && i === 1) graph.dispose();
        graph.update(engineAudioParameters(state(frame.step, frame.time_s)), name === 'muted' || (name === 'disconnect-then-mute' && i > 0) ? 0 : 1,
          name !== 'paused' && !(name === 'disconnect-then-pause' && i > 0), frame);
        await context.resume();
      }
      const values = (await rendering).getChannelData(0);
      const rms = (from, to) => { const part = values.subarray(Math.round(from * rate), Math.round(to * rate)); return Math.sqrt(part.reduce((sum, value) => sum + value * value, 0) / part.length); };
      const bins = []; for (let from = 0; from < values.length; from += 480) { const part = values.subarray(from, from + 480); bins.push(Math.sqrt(part.reduce((sum, value) => sum + value * value, 0) / part.length)); }
      const pulses = bins.reduce((count, value, i) => count + (value > .001 && (i === 0 || bins[i - 1] <= .001) ? 1 : 0), 0);
      const dominant = [];
      for (const [from, to] of [[.24, .28], [.40, .44], [.56, .60]]) {
        const frequencies = [450, 650, 1200, 900, 600].map(frequency => { let real = 0, imaginary = 0;
          for (let i = Math.round(from * rate); i < to * rate; i++) { const phase = 2 * Math.PI * frequency * i / rate; real += values[i] * Math.cos(phase); imaginary -= values[i] * Math.sin(phase); }
          return { frequency, magnitude: Math.hypot(real, imaginary) }; });
        dominant.push(frequencies.sort((a, b) => b.magnitude - a.magnitude)[0].frequency);
      }
      results.push({ name, pulses, dominant, rms: rms(0, 1.6), active: rms(.24, .28), after_cancel: rms(.45, 1.0), tail: rms(1.3, 1.6),
        peak: values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0) }); graph.dispose();
    }
    return results;
  });
  for (const result of observations.waveforms) {
    const { name } = result;
    if (name === 'stall') { assert.equal(result.pulses, 1); assert.equal(result.dominant[0], 450); assert(result.after_cancel > .001); }
    else if (name === 'terrain') { assert.equal(result.pulses, 2); assert.equal(result.dominant[0], 650); }
    else if (['disconnect', 'same-frame-disconnect'].includes(name)) { assert.equal(result.pulses, 3); assert.deepEqual(result.dominant, [1200, 900, 600]); }
    else if (name.startsWith('disconnect-then-') || name.endsWith('-then-missing') || name === 'dispose') {
      assert(result.active > .001); assert(result.after_cancel < 1e-6, `${name} cancels immediately`);
    }
    else assert.equal(result.rms, 0, `${name} never fabricates a disconnect`);
    assert(result.peak < .2 && result.tail < 1e-6, `${name} waveform remains bounded and stops`);
  }
  checks.push('Offline native WebAudio: steady450Hz stall, pulsed650Hz terrain and one descending1200/900/600Hz disconnect pattern; pause/mute/Review/seek/disposal cancel and do not replay');

  await page.addInitScript(() => {
    window.warningContexts = []; window.warningDisconnects = []; window.warningStates = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super({ ...args[0], sinkId: { type: 'none' } }); window.warningContexts.push(this); }
      createOscillator() { const oscillator = super.createOscillator(), original = oscillator.frequency.setValueAtTime;
        oscillator.frequency.setValueAtTime = function(value, time) { if (value === 1200) window.warningDisconnects.push({ time }); return original.call(this, value, time); };
        return oscillator; }
    };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker { constructor(...args) { super(...args); if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
      this.addEventListener('message', event => { if (event.data?.type === 'state') window.warningStates.push({ ...event.data }); }); } };
  });
  await installSceneryFixture(page); await page.goto(origin); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page, { controls: false }); await startOrResume(page);
  assert.equal(await page.evaluate(() => window.warningContexts.length), 0, 'default-off sound creates no context');
  await page.locator('#scene').focus(); await page.keyboard.press('s');
  await page.waitForFunction(() => window.warningContexts.length === 1 && document.querySelector('#audio-toggle').dataset.audioState === 'playing');
  const engage = async () => { await page.locator('#scene').focus(); await page.keyboard.press('a'); await page.waitForFunction(() => window.warningStates.at(-1)?.kap_engaged === 1); await page.waitForTimeout(100); };
  const disconnect = async () => { await page.locator('#scene').focus(); await page.keyboard.down('q'); await page.waitForFunction(() => window.warningStates.at(-1)?.kap_engaged === 0); await page.keyboard.up('q'); };
  await engage(); await disconnect(); await page.waitForFunction(() => window.warningDisconnects.length === 1);
  await page.waitForTimeout(650); assert.equal(await page.evaluate(() => window.warningDisconnects.length), 1, 'repeated frames do not duplicate live disconnect');
  await engage(); await page.locator('#scene').focus(); await page.keyboard.press('p');
  await page.waitForFunction(() => window.warningStates.at(-1)?.kap_engaged === 0 && window.warningDisconnects.length === 2);
  await page.waitForTimeout(650); assert.equal(await page.evaluate(() => window.warningDisconnects.length), 2, 'explicit manual AP switch-off produces one cue');
  await page.keyboard.press('s'); await engage(); await disconnect(); await page.keyboard.press('s'); await page.waitForTimeout(650);
  assert.equal(await page.evaluate(() => window.warningDisconnects.length), 2, 'muted disconnect never replays after unmute');
  await engage(); await disconnect(); await page.waitForFunction(() => window.warningDisconnects.length === 3);
  assert.equal(await page.evaluate(() => window.warningContexts.length), 1, 'new cues reuse one existing context');
  checks.push('Actual live worker AP capture, explicit P switch-off and raw-rudder disconnect produce exactly one cue per audible edge; default-off, mute/unmute and single-context policy hold');
  assert.deepEqual(errors, []); observations.audio_output = 'Offline PCM and native real-time silent sink; human listening and physical output device are not evaluated.';
  await writeFile(`${output}/flight-warnings-audio-browser.json`, `${JSON.stringify({ result: 'pass', checks, observations }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'pass', checks }));
} catch (error) {
  await mkdir(output, { recursive: true }); await writeFile(`${output}/flight-warnings-audio-browser.json`, `${JSON.stringify({ result: 'fail', checks, observations, error: String(error) }, null, 2)}\n`); throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
