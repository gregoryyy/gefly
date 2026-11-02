// Real bundled heights in Cesium. Renderer-only fixture; no flight dynamics or
// terrain heights are fabricated or replaced by a screenshot/flat mock.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5206';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5206,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; }); server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [], observations = {};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, serverOutput); await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  // Observe the real widget through a read-only reference. No rendering,
  // camera, terrain, shader or simulation behavior is replaced.
  await page.route('**/src/scene.ts', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('widget.resolutionScale ='), 'read-only Cesium observer marker exists');
    await route.fulfill({ response, body: source.replace('widget.resolutionScale =', 'window.__terrainWidget = widget; widget.resolutionScale =') });
  });
  await page.route(`${origin}/terrain-renderer-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><style>html,body{margin:0;height:100%;background:#14202a}#scene{position:relative;width:100vw;height:100vh;overflow:hidden}</style><div id="scene"></div><script type="module">
    import{createScene}from'/src/scene.ts';import{loadTerrainPackage,sampleTerrain}from'/studies/e1-browser/sim/terrain.js';
    window.terrainGrid=await loadTerrainPackage();window.terrainScene=await createScene(document.querySelector('#scene'));window.terrainLook={yaw_rad:0,pitch_rad:.35};
    window.setTerrainPoint=(latitude,longitude,agl=3,heading=320)=>{
      const lat_rad=latitude*Math.PI/180,lon_rad=longitude*Math.PI/180,ground=sampleTerrain(terrainGrid,lat_rad,lon_rad);
      window.terrainState=Object.freeze({step:0,t_s:0,lat_rad,lon_rad,alt_msl_m:ground.physical_m+agl,
        roll_rad:0,pitch_rad:0,heading_rad:heading*Math.PI/180,tas_mps:0,terrain_profile:1,
        terrain_height_msl_m:ground.physical_m,terrain_geoid_m:ground.geoid_m,terrain_height_ellipsoid_m:ground.ellipsoid_m,
        ground_height_ellipsoid_m:ground.ellipsoid_m+agl,ground_agl_m:agl});
      terrainScene.update(terrainState,'chase',terrainLook);return ground;
    };
    window.setTerrainPoint(49.96,8.643);window.terrainReady=true;
  </script>` }));
  await page.goto(`${origin}/terrain-renderer-fixture.html`); await page.waitForFunction(() => window.terrainReady, null, { timeout: 60000 });
  const mesh = (finest = true) => page.evaluate(async finest => {
    const start = performance.now(), state = window.terrainState, widget = window.__terrainWidget;
    while (performance.now() - start < 20000) {
      window.terrainScene.update(state, 'chase', window.terrainLook); await new Promise(resolve => requestAnimationFrame(resolve));
      const height = widget.scene.globe.getHeight({ longitude: state.lon_rad, latitude: state.lat_rad, height: 0 });
      const contains = tile => tile && state.lon_rad >= tile.rectangle.west && state.lon_rad <= tile.rectangle.east
        && state.lat_rad >= tile.rectangle.south && state.lat_rad <= tile.rectangle.north;
      let cursor = widget.scene.globe._surface._levelZeroTiles?.find(contains), meshLevel = -1;
      // Read-only diagnostics follow the same loaded-child walk as getHeight.
      while (cursor) {
        if (cursor.data?.renderedMesh) meshLevel = cursor.level;
        cursor = [cursor._southwestChild, cursor._southeastChild, cursor._northwestChild, cursor._northeastChild].find(contains);
      }
      if (widget.scene.globe.tilesLoaded && Number.isFinite(height) && (!finest || meshLevel === 4)) return { height_m: height, mesh_level: meshLevel,
        expected_m: state.terrain_height_ellipsoid_m, profile: document.querySelector('#scene').dataset.terrain,
        provider: widget.scene.globe.terrainProvider.constructor.name };
    }
    throw new Error('Actual Cesium terrain mesh did not settle');
  }, finest);
  observations.airfield = await mesh();
  assert.equal(observations.airfield.provider, 'CustomHeightmapTerrainProvider');
  assert.equal(observations.airfield.profile, 'public-grid');
  assert(Math.abs(observations.airfield.height_m - observations.airfield.expected_m) <= .25, 'actual airfield mesh agrees with shared ellipsoid surface within predeclared rendering budget');
  await page.waitForFunction(() => document.querySelector('#scene').dataset.imageryTiles === '3');
  observations.airportTexture = await page.evaluate(async () => {
    const widget = window.__terrainWidget, state = window.terrainState;
    for (let i = 0; i < 40; i++) { terrainScene.update(state,'chase',terrainLook); await new Promise(resolve => requestAnimationFrame(resolve)); }
    const layers = widget.scene.imageryLayers, highest = layers.get(layers.length - 1), provider = highest.imageryProvider;
    const tiles = widget.scene.globe._surface._tilesToRender.filter(tile => state.lon_rad >= tile.rectangle.west && state.lon_rad <= tile.rectangle.east
      && state.lat_rad >= tile.rectangle.south && state.lat_rad <= tile.rectangle.north);
    const ready = tiles.flatMap(tile => tile.data?.imagery ?? []).map(item => item.readyImagery)
      .find(imagery => imagery?.imageryLayer === highest && (imagery.texture || imagery.textureWebMercator));
    const texture = ready?.texture || ready?.textureWebMercator;
    return { tiles_loaded: widget.scene.globe.tilesLoaded, layers: layers.length, provider_width: provider.tileWidth,
      provider_height: provider.tileHeight, gpu_width: texture?.width, gpu_height: texture?.height };
  });
  assert.deepEqual(observations.airportTexture, { tiles_loaded: true, layers: 5, provider_width: 3000, provider_height: 1800,
    gpu_width: 3000, gpu_height: 1800 }, 'actual highest airport layer is uploaded at its native resolution before the screenshot');
  await page.screenshot({ path: `${output}/terrain-airport-detail.png` });
  const hill = await page.evaluate(() => window.setTerrainPoint(50.232, 8.46, 3, 135)); observations.hill = await mesh();
  assert(hill.physical_m > 700 && hill.geoid_m > 40, 'public package contains real high-relief heights and an explicit quasigeoid');
  assert(observations.hill.height_m - observations.airfield.height_m > 600, 'rendered terrain is not a zero-height or constant-height globe');
  assert(Math.abs(observations.hill.height_m - observations.hill.expected_m) <= .25, 'actual hill mesh matches the same shared surface');
  assert.equal(await page.locator('#scene').getAttribute('data-terrain-relief'), 'dem-derived');
  await page.evaluate(async () => { window.terrainLook.pitch_rad = -.25;
    for (let i = 0; i < 30; i++) { terrainScene.update(terrainState,'chase',terrainLook); await new Promise(resolve => requestAnimationFrame(resolve)); } });
  await page.screenshot({ path: `${output}/terrain-hill.png` });
  checks.push('actual local public DEM renders both airfield and hills, using H + quasigeoid and matching the shared mesh surface within 0.25 m');

  // Static same-state rendering must neither drift the camera nor flash tiles
  // once the actual terrain and imagery have settled.
  await page.evaluate(() => window.setTerrainPoint(50.14, 8.56, 180, 320)); await mesh(false);
  await page.waitForFunction(() => document.querySelector('#scene').dataset.imageryTiles === '3');
  assert.equal(await page.locator('#scene').getAttribute('data-imagery-airport-detail'), 'ready');
  const stability = await page.evaluate(async () => {
    const widget = window.__terrainWidget, state = window.terrainState, json = JSON.stringify(state);
    for (let i = 0; i < 25; i++) { terrainScene.update(state, 'chase', window.terrainLook); await new Promise(resolve => requestAnimationFrame(resolve)); }
    const position = { ...widget.scene.camera.positionWC };
    const canvas = widget.canvas, gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const read = () => { terrainScene.update(state, 'chase', window.terrainLook); const result = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, result); return result; };
    const before = read();
    for (let i = 0; i < 20; i++) { terrainScene.update(state, 'chase', window.terrainLook); await new Promise(resolve => requestAnimationFrame(resolve)); }
    const after = read(); let changed = 0;
    for (let i = 0; i < before.length; i += 4) if (Math.max(Math.abs(before[i] - after[i]), Math.abs(before[i + 1] - after[i + 1]), Math.abs(before[i + 2] - after[i + 2])) > 2) changed++;
    return { changed_fraction: changed / (canvas.width * canvas.height), state_unchanged: json === JSON.stringify(state),
      camera_drift_m: Math.hypot(widget.scene.camera.positionWC.x - position.x, widget.scene.camera.positionWC.y - position.y, widget.scene.camera.positionWC.z - position.z), camera: position };
  });
  observations.stability = stability; assert(stability.state_unchanged); assert(stability.camera_drift_m < 1e-7);
  assert(stability.changed_fraction < .001, 'settled terrain does not flash under an unchanged camera');
  await page.screenshot({ path: `${output}/terrain-regional-relief.png` });
  checks.push('DEM-derived relief is visible outside photograph coverage; settled camera and terrain pixels remain stable without changing source state');

  await page.setViewportSize({ width: 390, height: 568 });
  await page.evaluate(async () => { for (let i = 0; i < 15; i++) { terrainScene.update(terrainState,'chase',terrainLook); await new Promise(resolve => requestAnimationFrame(resolve)); } });
  const mobile = await page.evaluate(() => {
    const credit = document.querySelector('.cesium-widget-credits').getBoundingClientRect(), status = document.querySelector('#imagery-status').getBoundingClientRect();
    return { credit_top: credit.top, credit_right: credit.right, status_bottom: status.bottom };
  });
  assert(mobile.credit_right <= 390 && mobile.status_bottom <= mobile.credit_top - 3, 'full source attribution remains readable below the status on narrow screens');
  await page.screenshot({ path: `${output}/terrain-mobile.png` });

  const switching = await page.evaluate(() => {
    const widget = window.__terrainWidget, real = widget.scene.globe.terrainProvider;
    const flat = { ...terrainState, ground_height_ellipsoid_m: 3, ground_agl_m: 3, alt_msl_m: 3 };
    for (const key of ['terrain_profile','terrain_height_msl_m','terrain_geoid_m','terrain_height_ellipsoid_m']) delete flat[key];
    terrainScene.update(flat, 'chase'); const flatProvider = widget.scene.globe.terrainProvider;
    const flatMode = document.querySelector('#scene').dataset.terrain;
    terrainScene.update(terrainState, 'chase'); const reusedReal = real === widget.scene.globe.terrainProvider;
    terrainScene.update(flat, 'chase'); const reusedFlat = flatProvider === widget.scene.globe.terrainProvider;
    terrainScene.update(terrainState, 'chase');
    let rejected = false;
    try { terrainScene.update({ ...terrainState, lon_rad: terrainGrid.east_rad + .01 }, 'chase'); } catch { rejected = true; }
    terrainScene.update(terrainState, 'chase');
    return { flatMode, flatProvider: flatProvider.constructor.name, reusedReal, reusedFlat, rejected };
  });
  assert.deepEqual(switching, { flatMode: 'flat-study', flatProvider: 'EllipsoidTerrainProvider', reusedReal: true, reusedFlat: true, rejected: true });
  await page.evaluate(() => window.terrainScene.dispose()); assert(await page.locator('#scene canvas').count() === 0);
  assert.deepEqual(errors, []); assert.deepEqual([...hosts].sort(), ['127.0.0.1']);
  checks.push('explicit flat studies reuse their cached ellipsoid provider; real terrain reuses its provider, refuses uncovered positions and disposes cleanly with local assets only');
  await writeFile(`${output}/terrain-renderer-browser.json`, JSON.stringify({ checks, observations }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, observations }, null, 2));
} finally { await browser?.close(); server.kill(); }
