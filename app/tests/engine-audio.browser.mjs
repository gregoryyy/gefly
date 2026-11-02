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
  await page.evaluate(() => {
    document.querySelector('#audio-toggle').click();
    const volume = document.querySelector('#audio-volume');
    volume.value = '20'; volume.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 0, 'synthetic UI events cannot unlock audio');
  assert.equal(await page.locator('#audio-volume-value').textContent(), '30%', 'synthetic input cannot change the sound preference');
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
  await page.locator('#audio-toggle').click(); await silence();
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('#audio-toggle').click(); await awaitAudible(); assert((await sound()).rms > .001);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const paused = await stats(); await silence();
  const frequencies = (await sound()).frequencies;
  await page.locator('#throttle').evaluate(input => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150); assert.deepEqual((await sound()).frequencies, frequencies, 'pending throttle does not invent a running RPM');
  frozen(paused, await stats());
  checks.push('actual engine graph is created by Start only; audio, mute and pause obey current RPM without physics changes');

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
  await page.locator('#audio-toggle').click(); await page.locator('#review-play').click(); await silence();
  assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'quick mute works while Options is disabled in Review');
  await page.locator('#review-play').click(); await page.locator('#audio-toggle').click(); await page.locator('#review-exit').click();
  assert.equal(await page.evaluate(() => window.__soundContexts.length), 1, 'resume/review never recreates the graph');
  checks.push('volume, actual RPM pitch change and recorded playback use one graph; Review pause/mute preserve frozen physics');

  // Native OfflineAudioContext renders the exact runtime graph for waveform, spectrum and auditory review.
  const renders = await page.evaluate(async () => {
    const { createEngineAudioGraph } = await import('/src/engine-audio.ts');
    const { engineAudioParameters } = await import('/src/engine-audio-parameters.ts');
    const base = window.__soundStates.at(-1);
    const result = [];
    for (const [name, rpm, fuel, active, volume] of [['idle', 900, .000006, true, .3], ['cruise', 2400, .000008, true, .3],
      ['maximum', 2700, .00001, true, 1], ['paused', 2400, .000008, false, 1], ['stopped', 0, 0, true, 1],
      ['windmill', 1600, 0, true, .3], ['missing', null, 0, true, .3]]) {
      const context = new OfflineAudioContext(1, 48000 * 2, 48000);
      const graph = createEngineAudioGraph(context);
      const sample = rpm === null ? { ...base, prop_radps: undefined } : { ...base,
        prop_radps: rpm * Math.PI / 30, manifold_pressure_pa: name === 'idle' ? 35000 : 95000,
        fuel_flow_m3ps: fuel, mixture_norm: fuel ? 1 : 0 };
      const parameters = engineAudioParameters(sample); graph.update(parameters, volume, active);
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
      result.push({ name, parameters, rms: Math.sqrt(sum / count), peak, mean: mean / count,
        harmonics: rpm ? [1, 2, 3, 4, 5].map(h => amplitude(rpm / 30 * h)) : [],
        sampleRate: buffer.sampleRate, samples: ['idle', 'cruise'].includes(name) ? Array.from(values) : null });
      graph.dispose();
    }
    return result;
  });
  for (const render of renders) {
    assert(Number.isFinite(render.rms) && render.peak < .98, `${render.name} graph remains bounded`);
    if (['paused', 'stopped', 'missing'].includes(render.name)) assert(render.rms < 1e-5, `${render.name} is silent`);
    else assert(render.rms > .0001, `${render.name} has actual rendered content`);
    if (render.samples) await writeFile(`${output}/engine-audio-${render.name}.wav`, wav(render.samples, render.sampleRate));
  }
  const cruise = renders.find(r => r.name === 'cruise');
  assert(cruise.harmonics.filter(a => a > .00005).length >= 2, 'engine waveform includes multiple audible harmonics');
  observations.renders = renders.map(({ samples, ...render }) => render);
  checks.push('shared native offline graph renders bounded multi-harmonic audio; paused/stopped/missing silence and windmilling are verified');

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
  await rejected.waitForFunction(() => document.querySelector('#audio-toggle').dataset.audioState === 'unavailable');
  assert.equal(await rejected.locator('#status').textContent(), 'Flying', 'activation rejection does not stop simulation');
  assert.equal(await rejected.locator('#audio-toggle').getAttribute('aria-label'), 'Retry engine sound');
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
