// Actual Cesium/MapLibre with fixture tiles: at EDFE (Hessen) no country photo
// source is named, 3D credits follow rendered source tiles (none for NRW/PNOA
// looking south), and a tile or 2D view at the NRW border keeps the NRW credit.
// GEFLY_PHOTO_CREDIT_HEADING_DEG=0 looks north, where rendered NRW-border
// terrain is legitimately credited.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.GEFLY_PHOTO_CREDIT_PORT || 5521);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/photo-credit-vite',server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
const FOREIGN = /Geobasis NRW|PNOA 2024|swisstopo|basemap\.at|GeoBasis-DE\/LGB/;
const tileAt = (lat, lon, z) => { const n = 2 ** z; return { z, x: Math.floor((lon + 180) / 360 * n), y: Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n) }; };

function png(red, green, blue, alpha, size = 256) {
  const crc32 = bytes => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
  const chunk = (name, bytes) => { const type = Buffer.from(name), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([type, bytes]))); return Buffer.concat([len, type, bytes, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = y * (1 + size * 4) + 1 + x * 4; raw[i] = red; raw[i + 1] = green; raw[i + 2] = blue; raw[i + 3] = alpha; }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

try {
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(log);
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 149) throw new Error(`Vite unavailable: ${log}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  // EDFE at 400 m, heading south: Hessen only, far from every country source.
  await page.addInitScript(heading => localStorage.setItem('gefly.flight-location.v1', JSON.stringify({ version: 1,
    lat_rad: 49.9608 * Math.PI / 180, lon_rad: 8.6436 * Math.PI / 180, alt_msl_m: 400, heading_rad: heading, mode: 'airborne' })),
  Number(process.env.GEFLY_PHOTO_CREDIT_HEADING_DEG ?? 180) * Math.PI / 180);
  await installSceneryFixture(page);
  await page.route('**/scenery/imagery/**', route => route.fulfill({ contentType: 'image/png', body: png(0, 0, 0, 0, 512) }));
  await page.route('**/scenery/osm/**', route => route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) }));
  // Every country tile is opaque: any rendered country tile would be credited.
  const opaque = png(191, 48, 41, 255), transparent = png(0, 0, 0, 0);
  await page.route('**/scenery/photo-country/**', route => {
    const match = new URL(route.request().url()).pathname.match(/^\/scenery\/photo-country\/(ch|at|nrw|bb|es)\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (!match) return route.abort();
    requests.push(match[0]);
    return route.fulfill({ contentType: 'image/png', body: Number(match[2]) < 7 ? transparent : opaque });
  });
  await page.route('**/src/scene.ts*', async route => {
    const response = await route.fetch(), source = await response.text(), marker = 'const scene = widget.scene;';
    assert.equal(source.split(marker).length, 2, 'Cesium observation marker');
    await route.fulfill({ response, body: source.replace(marker, 'const scene = window.__creditScene = widget.scene;') });
  });
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text(), marker = 'map = new LibreMap({';
    assert.equal(source.split(marker).length, 2, 'MapLibre observation marker');
    await route.fulfill({ response, body: source.replace(marker, 'map = window.__creditMap = new LibreMap({') });
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.__creditScene && !document.querySelector('#start')?.disabled, null, { timeout: 90000 });
  await prepareFlightUI(page, { controls: false });
  await page.waitForFunction(() => document.querySelector('#scene')?.dataset.worldMap === 'ready' && window.__creditScene.globe.tilesLoaded, null, { timeout: 60000 });
  await page.waitForTimeout(3000);

  // 3D: status, rendered credits and the per-tile wiring of the actual providers.
  // Rendered terrain tiles (a Cesium internal, read only by this test) show which
  // country imagery is actually drawn with a credit; distant Alpine terrain can be.
  const scene3d = await page.evaluate(() => {
    const deg = r => +(r * 180 / Math.PI).toFixed(2), rendered = [];
    for (const tile of window.__creditScene.globe._surface._tilesToRender) {
      for (const tileImagery of tile.data?.imagery ?? []) {
        const imagery = tileImagery.readyImagery; if (!imagery) continue;
        const id = String(imagery.imageryLayer.imageryProvider.url ?? '').match(/\/photo-country\/([a-z]+)\//)?.[1];
        if (id && imagery.credits?.length) rendered.push({ id, imagery: [imagery.level, imagery.x, imagery.y], terrainLevel: tile.level,
          terrain: [deg(tile.rectangle.west), deg(tile.rectangle.south), deg(tile.rectangle.east), deg(tile.rectangle.north)], distance_km: Math.round(tile._distance / 1000) });
      }
    }
    return { rendered, status: document.querySelector('#imagery-status')?.textContent ?? '',
      country: document.querySelector('#scene')?.dataset.countryImagery, credits: document.querySelector('#scene-credits')?.textContent ?? '',
      spain: !document.querySelector('#scene .visible-spain-photo-credit')?.hidden };
  });
  if (process.env.GEFLY_PHOTO_CREDIT_DIAGNOSE) console.log(JSON.stringify(scene3d.rendered));
  assert.equal(scene3d.country, 'off', 'R-WORLD-14 EDFE names no country photo source');
  assert.doesNotMatch(scene3d.status, /North Rhine-Westphalia|Switzerland|Austria|Spain|Berlin/);
  const names = { ch: 'swisstopo', at: 'basemap.at', nrw: 'Geobasis NRW', bb: 'GeoBasis-DE/LGB', es: 'PNOA 2024' };
  const renderedIds = new Set(scene3d.rendered.map(item => item.id));
  for (const [id, name] of Object.entries(names)) {
    assert.equal(scene3d.credits.includes(name), renderedIds.has(id), `R-DATA-1 ${id} is credited exactly when a rendered tile can carry its pixels`);
  }
  assert.doesNotMatch(scene3d.credits, /PNOA 2024|GeoBasis-DE\/LGB/, 'R-WORLD-16 no Spanish or Berlin credit at EDFE');
  if (!process.env.GEFLY_PHOTO_CREDIT_HEADING_DEG) assert.doesNotMatch(scene3d.credits, /Geobasis NRW/, 'R-WORLD-14 no NRW credit at EDFE looking south');
  assert.equal(scene3d.spain, false, 'R-WORLD-16 the visible PNOA credit stays hidden in Germany');
  const edfe = tileAt(49.9608, 8.6436, 12), border = tileAt(51.0, 8.55, 15), dusseldorf = tileAt(51.2277, 6.7735, 12);
  const before = requests.length;
  const wiring = await page.evaluate(async ({ edfe, border, dusseldorf }) => {
    const layers = window.__creditScene.imageryLayers, providers = {};
    for (let i = 0; i < layers.length; i++) {
      const url = String(layers.get(i).imageryProvider.url ?? ''), id = url.match(/\/photo-country\/([a-z]+)\//)?.[1];
      if (id) providers[id] = layers.get(i).imageryProvider;
    }
    const credit = (provider, t) => provider.getTileCredits(t.x, t.y, t.z).map(item => item.html).join(' ');
    const empty = await providers.nrw.requestImage(edfe.x, edfe.y, edfe.z);
    return { ids: Object.keys(providers).sort(), layerCredit: Object.values(providers).some(provider => provider.credit),
      edfe: Object.fromEntries(Object.entries(providers).map(([id, provider]) => [id, credit(provider, edfe)])),
      border: credit(providers.nrw, border), lowLevel: credit(providers.nrw, { ...dusseldorf, z: 6, x: dusseldorf.x >> 6, y: dusseldorf.y >> 6 }),
      interior: credit(providers.nrw, dusseldorf), empty: { width: empty.width, height: empty.height } };
  }, { edfe, border, dusseldorf });
  assert.deepEqual(wiring.ids, ['at', 'bb', 'ch', 'es', 'nrw']);
  assert.equal(wiring.layerCredit, false, 'country providers carry no layer-wide credit');
  for (const [id, html] of Object.entries(wiring.edfe)) assert.equal(html, '', `${id} tile at EDFE is uncredited`);
  assert.match(wiring.border, /Geobasis NRW/, 'R-DATA-1 a Hessen tile at the NRW border keeps the NRW credit');
  assert.match(wiring.interior, /Geobasis NRW/);
  assert.equal(wiring.lowLevel, '', 'below the proxy detail level nothing is credited');
  assert.deepEqual(wiring.empty, { width: 1, height: 1 }, 'a tile outside the coverage cut-off is a local transparent image');
  assert(!requests.slice(before).some(path => path === `/scenery/photo-country/nrw/${edfe.z}/${edfe.x}/${edfe.y}.png`), 'the cut-off tile was not requested');

  // 2D Aerial: EDFE shows and credits no country source; the NRW border view does.
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.waitForFunction(() => !!window.__creditMap && window.__creditMap.isStyleLoaded(), null, { timeout: 45000 });
  const map = page.locator('#practice-map-panel');
  await page.locator('#scene').focus(); await page.keyboard.press(',');
  await page.waitForFunction(() => document.querySelector('#practice-map-panel')?.dataset.extendedMenu === 'true');
  await map.getByRole('button', { name: 'Show aerial imagery' }).click();
  // A user drag stops following the aircraft, so the test can move the view.
  await page.evaluate(() => window.__creditMap.fire('dragstart'));
  const settle = async (lat, lon) => {
    await page.evaluate(({ lat, lon }) => window.__creditMap.jumpTo({ center: [lon, lat], zoom: 10 }), { lat, lon });
    await page.waitForFunction(() => window.__creditMap.loaded(), null, { timeout: 45000 });
    await page.waitForTimeout(500);
    return page.evaluate(() => ({ attribution: document.querySelector('#map-credits')?.textContent ?? '',
      visibility: Object.fromEntries(['ch', 'at', 'nrw', 'bb', 'es'].map(id => [id, window.__creditMap.getLayoutProperty(`country-photo-${id}`, 'visibility')])),
      spain: !!document.querySelector('#practice-map-panel .visible-spain-photo-credit') && !document.querySelector('#practice-map-panel .visible-spain-photo-credit').hidden }));
  };
  const flat = await settle(49.9608, 8.6436);
  assert.deepEqual(flat.visibility, { ch: 'none', at: 'none', nrw: 'none', bb: 'none', es: 'none' }, 'R-WORLD-14 no country layer in a Hessen view');
  assert.doesNotMatch(flat.attribution, FOREIGN, 'R-WORLD-14 R-WORLD-16 2D attribution at EDFE names no foreign source');
  assert.equal(flat.spain, false);
  const nearBorder = await settle(51.0, 8.55);
  assert.equal(nearBorder.visibility.nrw, 'visible', 'the NRW layer returns when the view reaches its border');
  await page.waitForFunction(() => document.querySelector('#map-credits')?.textContent?.includes('Geobasis NRW'), null, { timeout: 30000 });
  // A viewport-only hide keeps the MapLibre source instead of recreating it.
  await page.evaluate(() => { window.__nrwSource = window.__creditMap.getSource('country-photo-nrw'); });
  assert.equal((await settle(49.9608, 8.6436)).visibility.nrw, 'none');
  assert.equal((await settle(51.0, 8.55)).visibility.nrw, 'visible');
  assert(await page.evaluate(() => window.__creditMap.getSource('country-photo-nrw') === window.__nrwSource), 'viewport toggles do not recreate the NRW source');
  assert.deepEqual(errors, []);
  console.log('PASS photo-source credits: EDFE status names no source; 3D credits match rendered source tiles; 2D EDFE view shows no country layer; NRW border tile and view credited; cut-off tile not requested; viewport toggles keep the source');
} finally {
  await browser?.close();
  server.kill();
}
