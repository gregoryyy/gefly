// Actual browser Web Audio graph, actual JSBSim state, and shared offline-render graph.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5200';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import {createServer} from 'vite';
 const s=await createServer({server:{host:'127.0.0.1',port:5200,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});
 await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', c => { serverOutput += c; }); server.stderr.on('data', c => { serverOutput += c; });
const checks = [], observations = {};
function wav(samples, sampleRate) {
  const result = Buffer.alloc(44 + samples.length * 2);
  result.write('RIFF', 0); result.writeUInt32LE(result.length - 8, 4); result.write('WAVEfmt ', 8);
  result.writeUInt32LE(16, 16); result.writeUInt16LE(1, 20); result.writeUInt16LE(1, 22);
  result.writeUInt32LE(sampleRate, 24); result.writeUInt32LE(sampleRate * 2, 28);
  result.writeUInt16LE(2, 32); result.writeUInt16LE(16, 34); result.write('data', 36);
  result.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) result.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return result;
}
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw new Error(`Engine-audio server timed out: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', e => errors.push(e.stack ?? String(e)));
  page.on('request', request => { const u = new URL(request.url()); if (['https:', 'http:'].includes(u.protocol)) hosts.add(u.hostname); });
  await page.addInitScript(() => {
    window.__soundContexts = []; window.__soundAnalysers = []; window.__soundOscillators = []; window.__soundSources = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); window.__soundContexts.push(this); }
      createOscillator() { const n = super.createOscillator(); window.__soundOscillators.push(n); return n; }
      createBufferSource() { const n = super.createBufferSource(); window.__soundSources.push(n); return n; }
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...rest) {
      if (destination === this.context.destination && window.__soundContexts.includes(this.context)) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 8192;
        window.__soundAnalysers.push(analyser); connect.call(this, analyser); connect.call(analyser, destination);
        return destination;
      }
      return connect.call(this, destination, ...rest);
    };
    const NativeWorker = window.Worker;
    window.__soundStates = []; window.__soundStats = []; window.__soundInputs = []; window.__soundWorkerCount = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__soundWorker = this; window.__soundWorkerCount++;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') { window.__soundStates.push({ ...event.data }); if (window.__soundStates.length > 4000) window.__soundStates.shift(); }
          if (event.data?.type === 'stats') window.__soundStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__soundWorker && message?.type === 'input') window.__soundInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && Number.isFinite(window.__soundStates.at(-1)?.prop_radps));
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 0, 'page load does not create an audio context');
  assert.equal(await page.locator('#audio-toggle').getAttribute('data-audio-state'), 'locked');
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'engine sound defaults off');
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-keyshortcuts'), 'S');
  await page.evaluate(() => {
    document.querySelector('#audio-toggle').click();
    const volume = document.querySelector('#audio-volume');
    volume.value = '20'; volume.dispatchEvent(new Event('input', { bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true }));
  });
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 0, 'synthetic UI events cannot unlock audio');
  assert.equal(await page.locator('#audio-volume-value').textContent(), '30%', 'synthetic input cannot change the sound preference');
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'synthetic S cannot enable sound');
  await page.locator('#controls-settings').click();
  await page.locator('#audio-volume').focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('s');
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 0, 'volume editing while off does not create a context');
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'S in a settings input does not toggle sound');
  await page.keyboard.press('ArrowRight'); await page.locator('#settings-close').click();
  await page.locator('#view-menu > summary').click(); await page.keyboard.press('s');
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 0, 'S in an open menu does not create a context');
  await page.locator('#view-menu > summary').click();
  const state = () => page.evaluate(() => window.__soundStates.at(-1));
  const stats = async () => {
    const n = await page.evaluate(() => window.__soundStats.length);
    await page.evaluate(() => window.__soundWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.__soundStats.length > n, n);
    return page.evaluate(() => window.__soundStats.at(-1));
  };
  const frozen = (before, after) => { assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  const sound = () => page.evaluate(() => {
    const context = window.__soundContexts[0], analyser = window.__soundAnalysers.at(-1);
    if (!context || !analyser) return { rms: 0, peak: 0, context: context?.state ?? 'absent', frequencies: [] };
    const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
    return { rms: context.state === 'running' ? Math.sqrt(values.reduce((s, x) => s + x * x, 0) / values.length) : 0,
      peak: context.state === 'running' ? Math.max(...values.map(Math.abs)) : 0, context: context.state,
      frequencies: window.__soundOscillators.map(n => n.frequency.value) };
  });
  const awaitAudible = () => page.waitForFunction(() => {
    const context = window.__soundContexts[0], analyser = window.__soundAnalysers.at(-1);
    if (!context || context.state !== 'running' || !analyser) return false;
    const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
    return Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length) > .001;
  });
  const silence = async () => { await page.waitForTimeout(350); const s = await sound(); assert(s.rms < 1e-4, `audio silent: ${JSON.stringify(s)}`); return s; };
  await startOrResume(page);
  await page.waitForFunction(() => window.__soundStates.at(-1)?.step > 10);
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 0, 'Start keeps default-off audio locked without creating a graph');
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('#scene').focus(); await page.keyboard.down('s'); await page.keyboard.down('s'); await page.keyboard.up('s');
  await page.waitForFunction(() => window.__soundContexts.length === 1 && document.querySelector('#audio-toggle').dataset.audioState === 'playing');
  await awaitAudible();
  const audible = await sound(); assert(audible.rms > .001 && audible.peak < .98, `actual graph produces bounded engine audio: ${JSON.stringify(audible)}`);
  assert(audible.frequencies.length >= 2, 'engine graph has more than one tonal component');
  observations.live = { ...audible, actual: await state() };
  await page.locator('#audio-toggle').focus();
  const beforeAudioKeys = await page.evaluate(() => ({ inputs: window.__soundInputs.length,
    throttle: document.querySelector('#throttle').value, ap: window.__soundStates.at(-1).ap_mode }));
  for (const key of ['q', '0', 'r', 'p', ']']) await page.keyboard.press(key);
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#status').textContent(), 'Flying');
  assert.equal(await page.locator('#throttle').inputValue(), beforeAudioKeys.throttle);
  assert.equal((await state()).ap_mode, beforeAudioKeys.ap);
  assert.equal(await page.evaluate(() => window.__soundInputs.length), beforeAudioKeys.inputs, 'focused sound button contains flight shortcuts');
  await page.keyboard.press('s'); await silence();
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'focused quick sound button accepts S');
  await page.keyboard.press('s'); await awaitAudible();
  await page.locator('#audio-toggle').click(); await silence();
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('#audio-toggle').click(); await awaitAudible(); assert((await sound()).rms > .001);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const paused = await stats(); await silence();
  await page.locator('#scene').focus(); await page.keyboard.press('s');
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('s'); await silence();
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'false', 'S toggles while paused without making the paused graph audible');
  frozen(paused, await stats());
  const frequencies = (await sound()).frequencies;
  await page.locator('#throttle').evaluate(input => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150); assert.deepEqual((await sound()).frequencies, frequencies, 'pending throttle does not invent a running RPM');
  frozen(paused, await stats());
  checks.push('sound defaults off without a context; trusted non-repeating S enables one actual graph, UI/menu guards contain shortcuts and pause silences it');

  await page.locator('#controls-settings').click();
  await page.locator('#audio-volume').focus(); await page.keyboard.press('Home'); await silence();
  assert.equal(await page.locator('#audio-volume-value').textContent(), '0%');
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#audio-volume-value').textContent(), '30%');
  await page.locator('#settings-close').click();
  await startOrResume(page); await page.waitForTimeout(700);
  const idle = { ...await sound(), actual: await state() };
  await page.locator('#scene').focus(); await page.keyboard.press('9');
  await page.waitForFunction(previous => Math.abs(window.__soundStates.at(-1).prop_radps - previous) > 10, idle.actual.prop_radps);
  await page.waitForTimeout(400);
  const powered = { ...await sound(), actual: await state() };
  assert.notDeepEqual(powered.frequencies, idle.frequencies, 'actual RPM change changes synthesis frequency');
  assert(powered.rms > .001 && powered.peak < .98); observations.idle = idle; observations.powered = powered;
  await page.locator('#pause').click(); await silence();
  await page.locator('#review-flight').click(); await silence();
  const reviewPhysics = await stats();
  await page.locator('#review-play').click(); await awaitAudible();
  assert((await sound()).rms > .001, 'playing recorded states produces sound');
  await page.locator('#review-play').click(); await silence(); frozen(reviewPhysics, await stats());
  await page.locator('#scene').focus(); await page.keyboard.press('s'); await page.locator('#review-play').click(); await silence();
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'quick mute works while Options is disabled in Review');
  await page.locator('#review-play').click(); await page.locator('#scene').focus(); await page.keyboard.press('s'); await page.locator('#review-exit').click();
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 1, 'resume/review never recreates the graph');
  checks.push('volume, actual RPM pitch change and recorded playback use one graph; Review pause/mute preserve frozen physics');

  // Native OfflineAudioContext renders the exact runtime graph for waveform, spectrum and auditory review.
  const renders = await page.evaluate(async () => {
    const { createEngineAudioGraph } = await import('/src/engine-audio.ts');
    const { engineAudioParameters } = await import('/src/engine-audio-parameters.ts');
    const base = window.__soundStates.at(-1);
    const result = [];
    for (const [name, rpm, fuel, active, volume, tas_mps] of [['idle', 900, .000006, true, .3, 0], ['cruise', 2400, .000008, true, .3, 40],
      ['maximum', 2700, .00001, true, 1, 120], ['paused', 2400, .000008, false, 1, 60], ['stopped', 0, 0, true, 1, 0],
      ['windmill', 1600, 0, true, .3, 40], ['missing', null, 0, true, .3, 0],
      ['wind-10', 0, 0, true, .3, 10], ['wind-40', 0, 0, true, .3, 40], ['wind-70', 0, 0, true, .3, 70],
      ['missing-engine-wind', null, 0, true, .3, 40], ['stopped-fuel-flow', 1600, .000008, true, .3, 40],
      ['whistle-low', 0, 0, true, .3, 20], ['whistle-55', 0, 0, true, .3, 55], ['whistle-80', 0, 0, true, .3, 80],
      ['fast-cruise', 2400, .000008, true, .3, 70], ['engine-idle', 900, .000008, true, .3, 0], ['engine-cruise', 2400, .000008, true, .3, 0],
      ['rolling-8', 0, 0, true, .3, 0], ['rolling-20', 0, 0, true, .3, 0], ['airborne-ground', 0, 0, true, .3, 0], ['stationary-ground', 0, 0, true, .3, 0]]) {
      const context = new OfflineAudioContext(1, 48000 * 2, 48000);
      const graph = createEngineAudioGraph(context);
      const sample = name === 'missing' ? null : { ...base, tas_mps,
        prop_radps: rpm === null ? undefined : rpm * Math.PI / 30, manifold_pressure_pa: name === 'idle' ? 35000 : 95000,
        engine_running: name === 'stopped-fuel-flow' || rpm === 0 ? 0 : 1,
        fuel_flow_m3ps: fuel, mixture_norm: fuel ? 1 : 0 };
      if (name.startsWith('rolling-') || name.endsWith('-ground')) Object.assign(sample, {
        ground_forward_mps: name === 'stationary-ground' ? 0 : name === 'rolling-8' ? 8 : 20, ground_side_mps: 0,
        gear_nose_wow: 0, gear_left_wow: name === 'airborne-ground' ? 0 : 1, gear_right_wow: name === 'airborne-ground' ? 0 : 1,
        gear_nose_load_n: 0, gear_left_load_n: 5000, gear_right_load_n: 5000 });
      const parameters = engineAudioParameters(sample);
      // Isolate the actual whistle branch for spectral evidence; mixed previews
      // and real-time checks below retain the complete production graph.
      if (name.startsWith('whistle-')) parameters.wind_gain = 0;
      graph.update(parameters, volume, active);
      const buffer = await context.startRendering(), values = buffer.getChannelData(0);
      const first = 24000, count = values.length - first;
      let sum = 0, peak = 0, mean = 0;
      for (let i = first; i < values.length; i++) { sum += values[i] ** 2; mean += values[i]; peak = Math.max(peak, Math.abs(values[i])); }
      const amplitude = frequency => {
        let real = 0, imaginary = 0;
        for (let i = first; i < values.length; i++) {
          const angle = 2 * Math.PI * frequency * i / buffer.sampleRate;
          real += values[i] * Math.cos(angle); imaginary -= values[i] * Math.sin(angle);
        }
        return 2 * Math.hypot(real, imaginary) / count;
      };
      const whistle = name.startsWith('whistle-') ? (() => {
        const powers = [];
        for (let frequency = 100; frequency <= 6000; frequency += 25) {
          const coefficient = 2 * Math.cos(2 * Math.PI * frequency / buffer.sampleRate);
          let previous = 0, older = 0;
          for (let i = first; i < values.length; i++) { const next = values[i] + coefficient * previous - older; older = previous; previous = next; }
          powers.push({ frequency, power: Math.max(0, previous * previous + older * older - coefficient * previous * older) });
        }
        const total = powers.reduce((sum, bin) => sum + bin.power, 0), maximum = Math.max(...powers.map(bin => bin.power));
        return { centroid_hz: total ? powers.reduce((sum, bin) => sum + bin.frequency * bin.power, 0) / total : 0,
          maximum_bin_fraction: total ? maximum / total : 0, occupied_bins: powers.filter(bin => bin.power > maximum / 100 && bin.power > 0).length };
      })() : null;
      result.push({ name, parameters, rms: Math.sqrt(sum / count), peak, mean: mean / count,
        harmonics: rpm ? [1, 2, 3, 4, 5].map(h => amplitude(rpm / 30 * h)) : [],
        windSpectrum: name.startsWith('wind-') ? [150, 300, 600, 1000, 1600].map(amplitude) : [],
        whistle,
        sampleRate: buffer.sampleRate, samples: ['idle', 'cruise', 'wind-40', 'fast-cruise', 'rolling-20'].includes(name) ? Array.from(values) : null });
      graph.dispose();
    }
    return result;
  });
  for (const render of renders) {
    assert(Number.isFinite(render.rms) && render.peak < .98, `${render.name} graph remains bounded`);
    if (['paused', 'stopped', 'missing', 'whistle-low', 'airborne-ground', 'stationary-ground'].includes(render.name)) assert(render.rms < 1e-5, `${render.name} is silent`);
    else assert(render.rms > .0001, `${render.name} has actual rendered content`);
    if (render.samples) await writeFile(`${output}/engine-audio-${render.name}.wav`, wav(render.samples, render.sampleRate));
    if (render.name === 'fast-cruise') await writeFile(`${output}/engine-audio-wind-whistle-mix.wav`, wav(render.samples, render.sampleRate));
  }
  const cruise = renders.find(r => r.name === 'cruise');
  assert(cruise.harmonics.filter(a => a > .00005).length >= 2, 'engine waveform includes multiple audible harmonics');
  const wind10 = renders.find(r => r.name === 'wind-10'), wind40 = renders.find(r => r.name === 'wind-40'), wind70 = renders.find(r => r.name === 'wind-70');
  assert(wind10.rms < wind40.rms && wind40.rms < wind70.rms, 'engine-off wind envelope increases with actual true airspeed');
  assert(wind40.windSpectrum.filter(amplitude => amplitude > 1e-6).length >= 3, 'independent wind has broadband content');
  const whistle55 = renders.find(r => r.name === 'whistle-55'), whistle80 = renders.find(r => r.name === 'whistle-80');
  assert(whistle55.whistle.centroid_hz < whistle80.whistle.centroid_hz && whistle55.rms < whistle80.rms,
    'observed broad whistle band rises in frequency and strength with actual TAS while engine RPM stays zero');
  for (const render of [whistle55, whistle80]) assert(render.whistle.occupied_bins > 10 && render.whistle.maximum_bin_fraction < .2,
    `${render.name} energy occupies a broad noise band instead of a single tone`);
  assert.equal(wind40.parameters.exhaust_gain + wind40.parameters.mechanical_gain + wind40.parameters.propeller_gain, 0);
  assert.equal(renders.find(r => r.name === 'stopped-fuel-flow').parameters.exhaust_gain, 0, 'actual stopped engine cannot fire from lingering fuel flow');
  assert(renders.find(r => r.name === 'engine-cruise').rms > renders.find(r => r.name === 'engine-idle').rms * 3,
    'engine-only cruise is measurably stronger than idle at matched manifold pressure/fuel, with no wind');
  assert(renders.find(r => r.name === 'rolling-20').rms > renders.find(r => r.name === 'rolling-8').rms,
    'rolling grows with actual ground motion while TAS and engine RPM remain zero');
  observations.renders = renders.map(({ samples, ...render }) => render);
  checks.push('shared native offline graph renders engine harmonics and wind; broad whistle band centroid/strength rise with TAS, low-speed whistle and zero-TAS/zero-RPM are silent');

  const contacts = await page.evaluate(async () => {
    const { createEngineAudioGraph } = await import('/src/engine-audio.ts');
    const { engineAudioParameters } = await import('/src/engine-audio-parameters.ts');
    const base = { ...window.__soundStates.at(-1), step: 0, t_s: 0, tas_mps: 0, prop_radps: 0, fuel_flow_m3ps: 0, engine_running: 0,
      ground_forward_mps: 0, ground_side_mps: 0, gear_nose_wow: 0, gear_left_wow: 0, gear_right_wow: 0,
      gear_nose_load_n: 0, gear_left_load_n: 0, gear_right_load_n: 0 };
    const result = [];
    for (const name of ['initial-contact', 'continuous-touchdown', 'resume-contact', 'forward-seek', 'backward-seek', 'second-wheel', 'pulse-then-forward-seek', 'pulse-then-backward-seek']) {
      const context = new OfflineAudioContext(1, 48000, 48000), graph = createEngineAudioGraph(context);
      const state = (step, time, mask) => engineAudioParameters({ ...base, step, t_s: time, gear_left_wow: mask & 2 ? 1 : 0, gear_right_wow: mask & 4 ? 1 : 0 });
      graph.update(name === 'initial-contact' ? state(0, 0, 2) : name === 'backward-seek' ? state(120, 1, 0) : state(0, 0, 0), 1, true);
      const first = context.suspend(.25), second = name.startsWith('pulse-then-') ? context.suspend(.3) : name === 'second-wheel' ? context.suspend(.55) : context.suspend(.6);
      const rendering = context.startRendering(); await first;
      const next = name === 'forward-seek' ? state(120, 1, 2) : name === 'backward-seek' ? state(1, 1 / 120, 2) : state(1, 1 / 120, 2);
      if (name === 'resume-contact') graph.update(next, 1, false);
      graph.update(next, 1, true); await context.resume(); await second;
      graph.update(name === 'second-wheel' ? state(2, 2 / 120, 6) : name === 'pulse-then-forward-seek' ? state(120, 1, 2)
        : name === 'pulse-then-backward-seek' ? state(0, 0, 2) : next, 1, true); await context.resume();
      const buffer = await rendering, values = buffer.getChannelData(0);
      const rms = (start, end) => { const slice = values.subarray(start * 48000, end * 48000); return Math.sqrt(slice.reduce((sum, x) => sum + x * x, 0) / slice.length); };
      result.push({ name, before: rms(.05, .2), contact: rms(.25, .45), after_discontinuity: rms(.31, .35), later: rms(.6, .75), tail: rms(.85, 1),
        samples: name === 'continuous-touchdown' ? Array.from(values) : null });
      graph.dispose();
    }
    return result;
  });
  for (const contact of contacts) {
    assert(contact.before < 1e-6 && contact.tail < 1e-5, `${contact.name} has no unsolicited baseline or lingering impact`);
    if (['continuous-touchdown', 'second-wheel', 'pulse-then-forward-seek', 'pulse-then-backward-seek'].includes(contact.name)) assert(contact.contact > 1e-5, `${contact.name} produces a real bounded contact pulse`);
    else assert(contact.contact < 1e-6, `${contact.name} cannot fabricate an impact`);
    if (contact.name.startsWith('pulse-then-')) assert(contact.after_discontinuity < 1e-6, 'a discontinuity cancels the active old pulse, not just future contact detection');
    if (contact.name === 'second-wheel') assert(contact.later > 1e-5, 'a later newly contacting wheel produces its own short pulse');
    else assert(contact.later < 1e-5, 'repeated held contact cannot re-trigger');
    if (contact.samples) await writeFile(`${output}/engine-audio-touchdown.wav`, wav(contact.samples, 48000));
  }
  observations.contacts = contacts.map(({ samples, ...contact }) => contact);
  checks.push('native offline contact pulses follow actual per-wheel transitions once; first contact frame, pause/resume and forward/backward seeks never invent impacts');

  // A controlled telemetry fixture isolates wind in a real-time native context;
  // this is sound rendering evidence, not a simulated aircraft reference case.
  const windPage = await browser.newPage();
  await windPage.addInitScript(() => {
    const Native = window.AudioContext; window.windContexts = []; window.windSources = [];
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.windContexts.push(this); }
      createBufferSource() { const source = super.createBufferSource(); window.windSources.push(source); return source; }
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...rest) {
      if (destination === this.context.destination && window.windContexts.includes(this.context)) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 8192; window.windAnalyser = analyser;
        connect.call(this, analyser); connect.call(analyser, destination); return destination;
      }
      return connect.call(this, destination, ...rest);
    };
    window.windRms = () => {
      const analyser = window.windAnalyser;
      if (!analyser || analyser.context.state !== 'running') return 0;
      const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
      return Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length);
    };
    window.windBandSpectrum = () => {
      const analyser = window.windAnalyser, bins = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(bins); const binHz = analyser.context.sampleRate / analyser.fftSize;
      const powers = [];
      for (let i = Math.ceil(100 / binHz); i <= Math.floor(6000 / binHz); i++) powers.push({ frequency: i * binHz, power: 10 ** (bins[i] / 10) });
      const total = powers.reduce((sum, bin) => sum + bin.power, 0), maximum = Math.max(...powers.map(bin => bin.power));
      return { centroid_hz: powers.reduce((sum, bin) => sum + bin.frequency * bin.power, 0) / total,
        occupied_bins: powers.filter(bin => bin.power > maximum / 100).length };
    };
  });
  await windPage.route(`${origin}/wind-audio-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
    <button id="wind-enable">Enable sound</button><input id="wind-tas" type="range" min="0" max="80" value="20" aria-label="Fixture actual TAS m/s">
    <button id="wind-pause">Pause</button><button id="wind-mute">Mute</button>
    <script type="module">
      import {createEngineAudio} from '/src/engine-audio.ts';
      window.windAudio=createEngineAudio();let active=true;
      const state={step:0,t_s:0,lat_rad:0,lon_rad:0,alt_msl_m:100,roll_rad:0,pitch_rad:0,heading_rad:0,
        tas_mps:20,prop_radps:0,manifold_pressure_pa:80000,fuel_flow_m3ps:0,engine_running:0};
      window.windFixtureState=state;
      const update=()=>windAudio.update(state,active);
      document.querySelector('#wind-enable').onclick=()=>{windAudio.setMuted(false);update();void windAudio.unlock();};
      document.querySelector('#wind-tas').oninput=event=>{state.tas_mps=event.target.valueAsNumber;update();};
      document.querySelector('#wind-pause').onclick=()=>{active=!active;update();};
      document.querySelector('#wind-mute').onclick=()=>windAudio.setMuted(!windAudio.getStatus().muted);
    </script>` }));
  await windPage.goto(`${origin}/wind-audio-fixture.html`); await windPage.waitForFunction(() => !!window.windAudio);
  assert.equal(await windPage.evaluate(() => window.windContexts.length), 0);
  await windPage.locator('#wind-enable').click(); await windPage.waitForFunction(() => window.windRms() > 1e-4);
  await windPage.waitForTimeout(350); const slowWindRms = await windPage.evaluate(() => window.windRms());
  const slowWhistle = await windPage.evaluate(() => window.windBandSpectrum());
  assert.equal(await windPage.evaluate(() => window.windAudio.getStatus().state), 'playing', 'wind-only audio reports playing with stopped propeller');
  assert(await windPage.evaluate(() => window.windSources.length === 2 && window.windSources[0].buffer !== window.windSources[1].buffer), 'wind uses its own original noise buffer');
  await windPage.locator('#wind-tas').focus(); await windPage.keyboard.press('End'); await windPage.waitForTimeout(350);
  const fastWindRms = await windPage.evaluate(() => window.windRms()); assert(fastWindRms > slowWindRms, 'real-time engine-off wind increases with actual TAS');
  const fastWhistle = await windPage.evaluate(() => window.windBandSpectrum());
  assert(fastWhistle.centroid_hz > slowWhistle.centroid_hz && fastWhistle.occupied_bins > 20,
    'native broad airflow/whistle band shifts upward with TAS while engine remains stopped');
  await windPage.keyboard.press('Home'); await windPage.waitForTimeout(350);
  assert(await windPage.evaluate(() => window.windRms() < 1e-4), 'engine-off zero-TAS real-time graph is silent');
  assert.equal(await windPage.evaluate(() => window.windAudio.getStatus().state), 'ready');
  await windPage.keyboard.press('End'); await windPage.waitForFunction(() => window.windRms() > 1e-4);
  await windPage.locator('#wind-pause').click(); await windPage.waitForTimeout(350);
  assert(await windPage.evaluate(() => window.windRms() < 1e-4), 'wind follows pause gate');
  await windPage.locator('#wind-pause').click(); await windPage.waitForFunction(() => window.windRms() > 1e-4);
  await windPage.locator('#wind-mute').click(); await windPage.waitForTimeout(350);
  assert(await windPage.evaluate(() => window.windRms() < 1e-4), 'wind follows mute gate');
  await windPage.evaluate(() => {
    Object.assign(window.windFixtureState, { tas_mps: 0, ground_forward_mps: 0, ground_side_mps: 0,
      gear_nose_wow: 0, gear_left_wow: 0, gear_right_wow: 0, gear_nose_load_n: 0, gear_left_load_n: 0, gear_right_load_n: 0 });
    window.windAudio.setMuted(false); window.windAudio.update(window.windFixtureState, true);
  });
  await windPage.waitForTimeout(350); await windPage.evaluate(() => window.windContexts[0].suspend());
  await windPage.evaluate(() => {
    Object.assign(window.windFixtureState, { step: 1, t_s: 1 / 120, gear_left_wow: 1 });
    window.windAudio.update(window.windFixtureState, true);
  });
  await windPage.locator('#wind-enable').click(); await windPage.waitForTimeout(60);
  assert(await windPage.evaluate(() => window.windRms() < 1e-4), 'audio-device suspension cannot queue a stale touchdown pulse for resume');
  await windPage.evaluate(() => window.windAudio.dispose()); await windPage.waitForFunction(() => window.windContexts[0].state === 'closed');
  observations.windRealtime = { slow_tas_mps: 20, slow_rms: slowWindRms, slow_whistle: slowWhistle,
    fast_tas_mps: 80, fast_rms: fastWindRms, fast_whistle: fastWhistle };
  await windPage.close();
  checks.push('real-time native graph plays wind and a rising whistle with engine stopped, follows actual TAS, zero speed, pause and mute, and disposes');

  const groundPage = await browser.newPage();
  await groundPage.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...rest) {
      if (destination === window.groundContext?.destination) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 8192; window.groundAnalyser = analyser;
        connect.call(this, analyser); connect.call(analyser, destination); return destination;
      }
      return connect.call(this, destination, ...rest);
    };
    window.groundRms = () => {
      if (!window.groundAnalyser || window.groundContext.state !== 'running') return 0;
      const values = new Float32Array(window.groundAnalyser.fftSize); window.groundAnalyser.getFloatTimeDomainData(values);
      return Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length);
    };
  });
  await groundPage.route(`${origin}/ground-audio-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
    <button id="ground-start">Start actual landing and ground audio</button><button id="ground-pause">Pause</button><script type="module">
    import{createEngineAudioGraph}from'/src/engine-audio.ts';import{engineAudioParameters}from'/src/engine-audio-parameters.ts';
    window.groundFrames=[];window.groundClunks=[];window.groundAirSamples=[];window.groundPaused=false;let previousMask=null,last=null;
    document.querySelector('#ground-start').onclick=()=>{
      window.groundContext=new AudioContext();window.groundGraph=createEngineAudioGraph(groundContext);void groundContext.resume();
      window.groundWorker=new Worker('/studies/e1-browser/sim/worker.js',{type:'module'});
      groundWorker.onmessage=({data})=>{
        if(data.type==='ready'){groundWorker.postMessage({type:'input',step:0,wall_ms:performance.timeOrigin+performance.now(),elevator:0,aileron:-.109375,rudder:0,throttle:0});groundWorker.postMessage({type:'run',until_step:480});}
        if(data.type==='state'){
          const parameters=engineAudioParameters(data);
          // Isolate ground voices from actual native telemetry; no physics or
          // wheel/contact values are changed, and no artificial state is sent.
          last={...parameters,exhaust_gain:0,mechanical_gain:0,propeller_gain:0,wind_gain:0,wind_whistle_gain:0};
          groundGraph.update(last,1,!groundPaused);groundFrames.push({state:data,parameters:last});
          const next=parameters.wheel_contact_mask;
          if(next===0&&groundClunks.length===0)groundAirSamples.push(groundRms());
          if(previousMask!==null&&(next&~previousMask))groundClunks.push({step:data.step,new_wheels:next&~previousMask,audible_event:groundGraph.hasContactSound()});
          previousMask=next;
        }
      };
      groundWorker.postMessage({type:'init',aircraft:'c172x',ground_collision:true,landing_preset:'normal',dt_s:1/120,state_hz:120,
        ic:{lat_rad:49.96*Math.PI/180,lon_rad:8.643*Math.PI/180,heading_rad:82*Math.PI/180}});
    };
    document.querySelector('#ground-pause').onclick=()=>{groundPaused=true;groundWorker.postMessage({type:'pause'});groundGraph.update(last,1,false);};
    </script>` }));
  await groundPage.goto(`${origin}/ground-audio-fixture.html`); await groundPage.locator('#ground-start').click();
  await groundPage.waitForFunction(() => window.groundFrames.at(-1)?.state.step >= 12);
  assert(await groundPage.evaluate(() => window.groundAirSamples.length > 0 && window.groundAirSamples.every(rms => rms < 1e-4)),
    'actual airborne phase has no rolling/contact sound even while moving');
  await groundPage.waitForFunction(() => window.groundFrames.at(-1)?.parameters.rolling_gain > .001 && window.groundRms() > 1e-4);
  const actualGround = await groundPage.evaluate(() => ({ frame: window.groundFrames.at(-1), events: window.groundClunks, rms: window.groundRms() }));
  assert(actualGround.events.length > 0 && actualGround.events.every(event => event.new_wheels > 0 && event.audible_event), 'actual native wheel contact drives real contact envelopes');
  assert(actualGround.frame.state.gear_left_load_n + actualGround.frame.state.gear_right_load_n + actualGround.frame.state.gear_nose_load_n > 0);
  await groundPage.locator('#ground-pause').click(); await groundPage.waitForTimeout(350);
  assert(await groundPage.evaluate(() => window.groundRms() < 1e-4), 'actual ground audio pauses without a trailing contact pulse');
  await groundPage.evaluate(async () => { groundWorker.terminate();groundGraph.dispose();await groundContext.close(); });
  await groundPage.close(); observations.actualLandingAudio = actualGround;
  checks.push('actual WASM landing is silent before wheel contact, then actual WOW/load/ground motion drive audible rolling and contact envelopes; pause clears both');

  await startOrResume(page); await awaitAudible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await silence(); assert.equal(await page.locator('#status').textContent(), 'Paused', 'visibility policy synchronously stops live flight/audio');
  await page.evaluate(() => { delete document.hidden; });
  const beforeReset = await stats();
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  await silence(); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 1, 'flight reset keeps the same audio context');
  assert((await stats()).step < beforeReset.step, 'real flight reset replaces the worker state while audio remains silent');
  checks.push('visibility-policy pause and flight reset silence the existing graph synchronously');

  const unsupported = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await unsupported.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await unsupported.goto(origin); await unsupported.waitForFunction(() => !document.querySelector('#start').disabled);
  assert(await unsupported.locator('#audio-toggle').isDisabled());
  await startOrResume(unsupported); await unsupported.waitForFunction(() => document.querySelector('#status').textContent === 'Flying');
  await unsupported.close();
  const rejected = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await rejected.addInitScript(() => { AudioContext.prototype.resume = () => Promise.reject(new Error('test activation rejection')); });
  await rejected.goto(origin); await rejected.waitForFunction(() => !document.querySelector('#start').disabled);
  await startOrResume(rejected);
  await rejected.locator('#scene').focus(); await rejected.keyboard.press('s');
  await rejected.waitForFunction(() => document.querySelector('#audio-toggle').dataset.audioState === 'unavailable');
  assert.equal(await rejected.locator('#status').textContent(), 'Flying', 'activation rejection does not stop simulation');
  assert.equal(await rejected.locator('#audio-toggle').getAttribute('aria-label'), 'Retry engine sound (S)');
  await rejected.close();
  checks.push('missing Web Audio and rejected activation remain explicit while flight continues');

  const recovery = await browser.newPage();
  await recovery.addInitScript(() => {
    const Native = window.AudioContext;
    window.__recoveryContexts = []; window.__failGraphOnce = true;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.__recoveryContexts.push(this); }
      createGain() { if (window.__failGraphOnce) { window.__failGraphOnce = false; throw new Error('test one-time graph creation failure'); } return super.createGain(); }
    };
  });
  await recovery.route(`${origin}/audio-recovery.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><button id="activate">Activate</button><script type="module">
    import {createEngineAudio} from '/src/engine-audio.ts'; window.recovery=createEngineAudio();
    document.querySelector('button').onclick=()=>window.recovery.unlock();</script>` }));
  await recovery.goto(`${origin}/audio-recovery.html`); await recovery.waitForFunction(() => !!window.recovery);
  await recovery.locator('#activate').click();
  await recovery.waitForFunction(() => window.recovery.getStatus().state === 'unavailable');
  await recovery.waitForFunction(() => window.__recoveryContexts[0].state === 'closed');
  await recovery.locator('#activate').click(); await recovery.waitForFunction(() => window.recovery.getStatus().unlocked);
  assert.equal(await recovery.evaluate(() => window.__recoveryContexts.length), 2, 'only the failed context is replaced');
  await recovery.evaluate(() => window.recovery.dispose()); await recovery.waitForFunction(() => window.__recoveryContexts[1].state === 'closed');
  await recovery.close();
  checks.push('partial graph failure releases the failed native context, retries successfully and disposes');

  for (const [width, height] of [[390, 844], [390, 568], [1440, 900]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(120);
    const geometry = await page.locator('.topbar').evaluate(e => {
      const r = e.getBoundingClientRect(), b = document.querySelector('#audio-toggle').getBoundingClientRect();
      return { right: r.right, bottom: r.bottom, width: document.documentElement.scrollWidth, button: { left: b.left, right: b.right, top: b.top, bottom: b.bottom } };
    });
    assert.equal(geometry.width, width); assert(geometry.right <= width && geometry.button.right <= width && geometry.button.left >= 0);
    assert(geometry.button.top >= 0 && geometry.button.bottom <= geometry.bottom);
    if (width === 390) assert(geometry.bottom < 108, 'sound control does not create an extra mobile header row');
  }
  await page.screenshot({ path: `${output}/engine-audio-controls.png` });
  assert.equal(await page.evaluate(() => window.__soundWorkerCount), 2, 'only explicit reset creates another flight worker');
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  checks.push('quick mute stays visible on narrow layouts with no extra header row, requests or flight workers');
  await writeFile(`${output}/engine-audio-browser.json`, `${JSON.stringify({ result: 'pass', checks, observations }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'pass', checks, observations }, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
