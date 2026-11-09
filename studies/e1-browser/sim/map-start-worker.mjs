// R-PLAY-2 actual production Worker + current native runtime. Only local asset
// transport is adapted; terrain, initialization and all reported states are real.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Worker, parentPort, isMainThread } from 'node:worker_threads';

if (!isMainThread) {
  globalThis.self = globalThis;
  globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer);
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (typeof url !== 'string' || !url.startsWith('/')) return fetchOriginal(url, options);
    parentPort.postMessage({ type: 'diagnostic-asset', url });
    try { return new Response(await readFile(new URL('../../../app/public' + url.split('?')[0], import.meta.url))); }
    catch { return new Response(null, { status: 404 }); }
  };
  await import('./worker.js');
  parentPort.on('message', data => self.onmessage({ data }));
  parentPort.postMessage({ type: 'diagnostic-ready' });
} else {
  const RAD = Math.PI / 180, results = [];
  const wasmUrl = new URL('./dist/jsbsim.wasm', import.meta.url);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const wasmHash = hash(await readFile(wasmUrl));
  async function harness() {
    const worker = new Worker(new URL(import.meta.url)), messages = []; let error;
    worker.on('message', message => { if (message.type !== 'terrain-tile') messages.push(message); });
    worker.on('error', value => { error = value; });
    async function wait(type, start = 0, allowError = false) {
      const limit = Date.now() + 25000;
      while (Date.now() < limit) {
        if (error) throw error;
        const failure = messages.slice(start).find(m => m.type === 'error'); if (failure && !allowError) throw Error(failure.message);
        const found = messages.slice(start).find(m => m.type === type); if (found) return found;
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      throw Error(`Timeout waiting for ${type}`);
    }
    await wait('diagnostic-ready');
    return { worker, messages, wait, send: message => worker.postMessage(message),
      async stats() { const start = messages.length; worker.postMessage({type:'stats'}); return wait('stats',start); } };
  }
  const request = (height, lat = 40.75, lon = -74) => ({ type:'init', aircraft:'c172x', dt_s:1/120, state_hz:60,
    terrain:true, streaming_terrain:true, ground_collision:true, height_agl_ft:height,
    ic:{lat_rad:lat*RAD,lon_rad:lon*RAD,heading_rad:1.2,alt_msl_m:99999,tas_mps:99999} });
  {
    const h = await harness();
    try {
      for (const [height,lat,lon] of [[0,40.75,-74],[1000,40.75,-74],[5000,40.75,-74],[10000,40.75,-74],
        [1000,49.96,8.643],[1000,28,88],[5000,28,88],[10000,28,88]]) {
        const start = h.messages.length; h.send(request(height,lat,lon));
        const ready = await h.wait('ready',start), state = await h.wait('state',start);
        assert.equal(state.step,0); assert.equal(state.t_s,0); assert.equal(state.terrain_profile,1);
        if (height === 0) {
          assert.equal(state.throttle_norm,0); assert.equal(state.brake_left_norm,1); assert.equal(state.brake_right_norm,1);
          assert.equal(state.gear_nose_wow,1); assert.equal(state.gear_left_wow,1); assert.equal(state.gear_right_wow,1);
          assert(Math.hypot(state.ground_forward_mps,state.ground_side_mps)<.05,'existing native runway-settling speed criterion');
        } else {
          // Existing engineering coordinate/display budget, not an aircraft
          // tolerance. Bridge IC uses h-sl-ft; readback uses geod-alt-ft.
          assert(Math.abs((state.alt_msl_m-state.terrain_height_msl_m)-height*.3048)<.25,
            JSON.stringify({message:'AGL arithmetic uses active physical H, not ellipsoid or supplied MSL',height,lat,lon,
              alt_msl_m:state.alt_msl_m,H_m:state.terrain_height_msl_m,native_AGL_m:state.ground_agl_m,
              delta_m:state.alt_msl_m-state.terrain_height_msl_m-height*.3048}));
          assert(Math.abs(state.tas_mps-90*1852/3600)<1e-8);
          assert.equal(state.gear_nose_wow,0); assert.equal(state.gear_left_wow,0); assert.equal(state.gear_right_wow,0);
        }
        const before = await h.stats(); await new Promise(resolve=>setTimeout(resolve,25)); const after = await h.stats();
        assert.equal(after.step,0); assert.equal(after.digest,before.digest); assert.deepEqual(after.final_state,before.final_state);
        results.push({height_agl_ft:height,lat_deg:lat,lon_deg:lon,trim:ready.trim,state,paused_digest:after.digest,
          coordinate_height_error_m:height>0?state.alt_msl_m-state.terrain_height_msl_m-height*.3048:null});
      }
    } finally { await h.worker.terminate(); }
  }
  const rejected = [];
  {
    const h = await harness();
    try {
      for (const change of [{height_agl_ft:undefined},{height_agl_ft:2000},{height_agl_ft:NaN},{height_agl_ft:'1000'},
        {terrain:false},{streaming_terrain:false},{landing_preset:'normal'},{resume_state:{}},{runway_start:true},
        {ic:{lat_rad:89.5*RAD,lon_rad:0,heading_rad:0}},{ic:{lat_rad:0,lon_rad:4,heading_rad:0}},
        {ic:{lat_rad:0,lon_rad:0,heading_rad:2*Math.PI}}]) {
        const start = h.messages.length; h.send({...request(1000),regional_navigation:true,...change});
        const failure = await h.wait('error',start,true); assert.match(failure.message,/map start height\/position/);
        assert(!h.messages.slice(start).some(m=>m.type==='diagnostic-asset'),'invalid request rejected before terrain/navigation asset I/O');
        assert(!h.messages.slice(start).some(m=>m.type==='ready'||m.type==='state'));
        rejected.push({change,error:failure.message});
      }
    } finally { await h.worker.terminate(); }
  }
  assert.equal(hash(await readFile(wasmUrl)),wasmHash,'native binary unchanged throughout the diagnostic');
  const build = JSON.parse(await readFile(new URL('./dist/build-info.json',import.meta.url),'utf8'));
  const files = {};
  for (const file of ['./map-start.js','./worker.js','../../../app/src/session.ts','../../../app/public/terrain/world/world-v1.f32']) files[file]=hash(await readFile(new URL(file,import.meta.url)));
  const report = {scope:'Actual Node Worker/current native bytes; arithmetic, request isolation and paused launch only, not aircraft performance, surveyed ground or established native build provenance',
    coordinate_budget_m:.25,coordinate_budget_scope:'Existing engineering/native coordinate-display budget, not aircraft fidelity. Ground choice uses native wheel settling, not zero CG height. Original1e-6assertion failure retained separately.',
    max_abs_coordinate_height_error_m:Math.max(...results.map(r=>Math.abs(r.coordinate_height_error_m??0))),
    wasm_sha256:wasmHash,build_record_wasm_sha256:build.wasm_sha256,build_record_matches:wasmHash===build.wasm_sha256,files,results,rejected};
  await writeFile(new URL('../../../output/flight/map-start-worker-task137.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:'pass',native_launches:results.length,rejected_before_asset_io:rejected.length,wasm_sha256:wasmHash,
    max_abs_coordinate_height_error_m:report.max_abs_coordinate_height_error_m,
    high_terrain:results.filter(r=>r.lat_deg===28).map(r=>({height_agl_ft:r.height_agl_ft,H_m:r.state.terrain_height_msl_m,MSL_m:r.state.alt_msl_m,error_m:r.coordinate_height_error_m,trim:r.trim}))},null,2));
}
