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
async function temporalWorkerFixture(page) {
  await page.evaluate(async () => {
    const [{ createSession }, { createStallWarningDelivery }, { createFlightWarningMonitor },
      { createFlightWarningsPanel }, { createEngineAudio }] = await Promise.all([
      import('/src/session.ts'), import('/src/stall-warning-delivery.ts'), import('/src/flight-warnings.ts'),
      import('/src/flight-warnings-panel.ts'), import('/src/engine-audio.ts'),
    ]);
    document.body.innerHTML = '<main class="flight-app" style="position:relative;width:640px;height:240px"><button id="temporal-start" disabled>Start native climb diagnostic</button><aside id="temporal-warnings"></aside></main>';
    const result = { scope: 'Component integration: actual worker + real session validation + delivery + warning panel + original Web Audio graph. Explicit native test controls/initial condition; not whole-app UI maneuver or physical speaker output.',
      acceptedPeaks: [], wirePeaks: [], transitions: [], gain: [], errors: [], nativeConfig: { fixed_step_s: 1 / 120, state_hz: 60, simulation_rate: 10,
        control: 'Native diagnostic heading assist, .2 throttle, elevator0→-.4566 over960steps', altitude_m: 1200 } };
    window.temporalResult = result;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); window.temporalWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state' && data.stall_warning_peak_norm > 0) result.wirePeaks.push({ ...data });
        });
      }
      postMessage(message, ...args) {
        if (message.type === 'init') message = { type: 'init', dt_s: 1 / 120, state_hz: 60, aircraft: 'c172x', kap140: false,
          terrain: false, regional_navigation: false, ground_collision: true,
          ic: { lat_rad: 49.96 * Math.PI / 180, lon_rad: 8.643 * Math.PI / 180, alt_msl_m: 1200, heading_rad: 82 * Math.PI / 180, tas_mps: 45 } };
        if (message.type === 'run') {
          // Genuine native controls only. State and warning responses pass through
          // unchanged, including the current raw zero and worker-produced pair.
          for (let step = 0; step <= 960; step++) super.postMessage({ type: 'input', step, wall_ms: 0,
            elevator: -.4566 * step / 960, aileron: 0, rudder: 0, throttle: .2 });
          message = { ...message, until_step: 1500 };
        }
        return super.postMessage(message, ...args);
      }
    };
    let latest = null, base = null, running = false, finished = false, firstRecent_ms = null, previousSignature = '';
    const delivery = createStallWarningDelivery(), monitor = createFlightWarningMonitor();
    const panel = createFlightWarningsPanel({ container: document.querySelector('#temporal-warnings') });
    const NativeContext = window.AudioContext;
    class CapturingContext extends NativeContext {
      constructor() { super({ sinkId: { type: 'none' } }); }
      createOscillator() {
        const oscillator = super.createOscillator(), connect = oscillator.connect;
        oscillator.connect = function(destination, ...args) {
          if (oscillator.frequency.value === 450 && destination instanceof GainNode) {
            for (const method of ['setTargetAtTime', 'setValueAtTime']) {
              const original = destination.gain[method];
              destination.gain[method] = function(...values) {
                result.gain.push({ method, values, now_ms: performance.now(), context: oscillator.context.state,
                  step: latest?.step, raw: latest?.stall_warning_norm,
                  label: document.querySelector('[data-warning=stall]')?.textContent });
                return original.apply(this, values);
              };
            }
          }
          return connect.call(this, destination, ...args);
        };
        return oscillator;
      }
    }
    const audio = createEngineAudio({ AudioContext: CapturingContext });
    const session = createSession({
      onReady() { document.querySelector('#temporal-start').disabled = false; },
      onStatus() {}, onError(message) { result.errors.push(message); },
      onState(state) {
        latest = state; base = monitor.update(state);
        if (state.stall_warning_peak_norm > 0) result.acceptedPeaks.push({ ...state });
        delivery.accept(state, { now_ms: performance.now(), enabled: running });
      },
    });
    session.reset();
    document.querySelector('#temporal-start').onclick = async () => {
      audio.setMuted(false); await audio.unlock();
      session.setAutopilot(2, 82 * Math.PI / 180); session.setSimulationRate(10);
      running = true; session.start();
    };
    function render() {
      if (finished) return;
      const now_ms = performance.now(), pulse = delivery.present({ now_ms, enabled: running });
      if (latest && base) {
        const shown = { ...base, stall: pulse.active ? 'active' : base.stall, stallRecent: pulse.recent };
        panel.update(shown, false); audio.update(latest, running, { warnings: shown, live: true });
        const light = document.querySelector('[data-warning=stall]');
        const signature = `${shown.stall}/${pulse.recent}`;
        if (signature !== previousSignature) {
          previousSignature = signature;
          result.transitions.push({ now_ms, step: latest.step, raw: latest.stall_warning_norm,
            status: shown.stall, recent: pulse.recent, label: light.textContent, title: light.title, aria: light.getAttribute('aria-label') });
        }
        if (pulse.recent && firstRecent_ms === null) firstRecent_ms = now_ms;
        if (firstRecent_ms !== null && !pulse.active && now_ms >= firstRecent_ms + 200) {
          result.minimum_ms = now_ms - firstRecent_ms;
          running = false; session.pause(); audio.update(null, false);
          // Reuse the unchanged captured real-session packet in isolated
          // presentation epochs to check caller lifecycle/audio boundaries.
          // 'hidden' below is the component eligibility boundary, not a claim
          // of a browser-tab visibility transition.
          const captured = result.acceptedPeaks.find(state => state.stall_warning_norm === 0);
          result.suppression = [];
          if (captured) for (const boundary of ['mute', 'pause', 'hidden', 'Review', 'loading']) {
            const gate = createStallWarningDelivery(), at_ms = performance.now();
            gate.accept(captured, { now_ms: at_ms, enabled: true });
            const retained = gate.present({ now_ms: at_ms, enabled: true });
            const clearWarnings = { ...monitor.update(captured), stall: 'clear', stallRecent: false };
            const recentWarnings = { ...clearWarnings, stall: 'active', stallRecent: true };
            audio.update(captured, true, { warnings: clearWarnings, live: true });
            const before = result.gain.filter(event => event.values[0] > 0).length;
            if (boundary === 'mute') {
              audio.setMuted(true); audio.update(captured, true, { warnings: recentWarnings, live: true });
              audio.setMuted(false);
            } else {
              gate.present({ now_ms: at_ms, enabled: false });
              audio.update(captured, false, { warnings: recentWarnings, live: boundary !== 'Review' });
            }
            audio.update(captured, true, { warnings: recentWarnings, live: true });
            audio.update(captured, true, { warnings: recentWarnings, live: true });
            const after = result.gain.filter(event => event.values[0] > 0).length;
            const resumed = boundary === 'mute' ? null : gate.present({ now_ms: at_ms, enabled: true });
            result.suppression.push({ boundary, retained, positiveBefore: before, positiveAfter: after, resumed });
          }
          audio.update(null, false); session.dispose();
          audio.dispose(); panel.dispose(); window.Worker = NativeWorker;
          finished = true; result.finished = true; return;
        }
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    window.temporalDispose = () => { finished = true; session.dispose(); audio.dispose(); panel.dispose(); window.Worker = NativeWorker; };
  });
  try {
    await page.locator('#temporal-start').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('#temporal-start').disabled || window.temporalResult.errors.length, null, { timeout: 60000 });
    assert.deepEqual(await page.evaluate(() => window.temporalResult.errors), [], 'actual native fixture must load before activation');
    await page.locator('#temporal-start').click();
    await page.waitForFunction(() => window.temporalResult.finished || window.temporalResult.errors.length, null, { timeout: 30000 });
    const result = await page.evaluate(() => window.temporalResult);
    assert.deepEqual(result.errors, []);
    const rawClearPeak = result.acceptedPeaks.find(state => state.stall_warning_norm === 0 && state.stall_warning_peak_norm > 0);
    assert(rawClearPeak, 'real session receives an unchanged worker-produced peak while current native warning is zero');
    assert(result.wirePeaks.some(state => state.step === rawClearPeak.step && state.stall_warning_peak_norm === rawClearPeak.stall_warning_peak_norm));
    const recent = result.transitions.find(event => event.recent && event.raw === 0);
    assert(recent); assert.equal(recent.label, 'RECENT STALL'); assert.match(recent.title, /current signal is clear/);
    assert.match(recent.aria, /current native signal clear/);
    assert(result.minimum_ms >= 200, 'native event receives the wall-clock minimum before clear');
    assert(result.gain.some(event => event.values[0] > 0 && event.context === 'running' && event.raw === 0 && event.label === 'RECENT STALL'), 'actual recent-only event reaches original connected450Hz gain');
    assert(result.gain.at(-1).values[0] === 0, 'warning expiry/lifecycle cancels gain');
    assert.equal(result.suppression.length, 5);
    for (const sample of result.suppression) {
      assert.equal(sample.retained.recent, true);
      assert.equal(sample.positiveAfter, sample.positiveBefore, `${sample.boundary} cannot replay a cached recent-only horn`);
      if (sample.resumed) assert.deepEqual(sample.resumed, { active: false, recent: false });
    }
    return result;
  } finally {
    const result = await page.evaluate(() => window.temporalResult).catch(() => null);
    if (result) await writeFile(`${output}/flight-warning-task132-temporal-browser.json`, JSON.stringify(result, null, 2));
    await page.evaluate(() => window.temporalDispose?.());
  }
}
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
  observations.temporal = await temporalWorkerFixture(page);
  await writeFile(`${output}/flight-warning-task132-temporal-browser.json`, JSON.stringify(observations.temporal, null, 2));
  if (process.env.WARNING_TEMPORAL_ONLY === '1') {
    console.log(JSON.stringify({ result: 'pass', temporalMinimum_ms: observations.temporal.minimum_ms, acceptedPeakSteps: observations.temporal.acceptedPeaks.map(state => state.step) }));
  } else {
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
  await engage(); await page.locator('#scene').focus(); await page.locator('#ap-engage').click();
  await page.waitForFunction(() => window.warningStates.at(-1)?.kap_engaged === 0 && window.warningDisconnects.length === 2);
  await page.waitForTimeout(650); assert.equal(await page.evaluate(() => window.warningDisconnects.length), 2, 'explicit manual AP switch-off produces one cue');
  await page.keyboard.press('s'); await engage(); await disconnect(); await page.keyboard.press('s'); await page.waitForTimeout(650);
  assert.equal(await page.evaluate(() => window.warningDisconnects.length), 2, 'muted disconnect never replays after unmute');
  await engage(); await disconnect(); await page.waitForFunction(() => window.warningDisconnects.length === 3);
  assert.equal(await page.evaluate(() => window.warningContexts.length), 1, 'new cues reuse one existing context');
  checks.push('Actual live worker AP capture, explicit AP-button switch-off and raw-rudder disconnect produce exactly one cue per audible edge; default-off, mute/unmute and single-context policy hold');
  assert.deepEqual(errors, []); observations.audio_output = 'Offline PCM and native real-time silent sink; human listening and physical output device are not evaluated.';
  await writeFile(`${output}/flight-warnings-audio-browser.json`, `${JSON.stringify({ result: 'pass', checks, observations }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'pass', checks }));
  }
} catch (error) {
  await mkdir(output, { recursive: true }); await writeFile(`${output}/${process.env.WARNING_TEMPORAL_ONLY === '1' ? 'flight-warning-task132-temporal-failure' : 'flight-warnings-audio-browser'}.json`, `${JSON.stringify({ result: 'fail', checks, observations, error: String(error) }, null, 2)}\n`); throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
