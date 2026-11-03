// Real application/JSBSim and map interactions; only map/photo pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5232';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5232,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, serverOutput = '';
const checks = [], errors = [];
server.stdout.on('data', value => { serverOutput += value; });
server.stderr.on('data', value => { serverOutput += value; });
try {
  for (let i = 0; ; i++) {
    if (i === 100 || server.exitCode !== null) throw new Error(`Map server did not start: ${serverOutput}`);
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.rightMapStates = []; window.rightMapStats = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/sim/worker.js')) return;
        window.rightMapWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.rightMapStates.push(data);
          if (data.type === 'stats') window.rightMapStats.push(data);
        });
      }
    };
  });
  // Observe the real MapLibre instance without replacing map data or behavior.
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'), 'MapLibre observer marker exists');
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__rightFlightMap = new LibreMap({') });
  });
  await installSceneryFixture(page);
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.rightMapStates.length, null, { timeout: 60000 });
  const scene = page.locator('#scene'), panel = page.locator('#practice-map-panel');
  const activate = async () => {
    if (!(await panel.evaluate(element => element.classList.contains('overlay-active')))) await panel.locator('.practice-map-heading').click();
  };
  const stats = async () => {
    const count = await page.evaluate(() => window.rightMapStats.length);
    await page.evaluate(() => window.rightMapWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.rightMapStats.length > count, count);
    return page.evaluate(() => window.rightMapStats.at(-1));
  };
  const frozen = async before => {
    const after = await stats();
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  };
  const pathData = () => page.evaluate(async () => await window.__rightFlightMap.getSource('recorded-path').getData());

  const initialPaused = await stats();
  await scene.focus();
  for (const key of ['Shift+KeyM','Alt+KeyM','Control+KeyM']) await page.keyboard.press(key);
  await scene.evaluate(element => {
    element.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'KeyM',key:'m',metaKey:true}));
    element.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'KeyM',key:'m',repeat:true}));
  });
  assert.equal(await panel.isVisible(),false,'modifiers and repeat do not toggle the map');
  await page.keyboard.press('o');
  await page.locator('#view-menu > summary').click();
  await page.keyboard.press('m');
  assert.equal(await panel.isVisible(),false,'open menu guards plain M');
  await page.keyboard.press('o');
  await page.keyboard.press('Alt+Shift+KeyO');
  await page.locator('#control-settings').waitFor({state:'visible'});
  await page.keyboard.press('m');
  assert.equal(await panel.isVisible(),false,'modal dialog guards M');
  await page.evaluate(()=>{
    window.rightMapOptionsClosed=false;
    document.querySelector('#control-settings').addEventListener('close',()=>{window.rightMapOptionsClosed=true;},{once:true});
  });
  await page.locator('#settings-close').click();
  await page.waitForFunction(()=>window.rightMapOptionsClosed&&document.activeElement?.id==='scene');
  await frozen(initialPaused);
  checks.push('M ignores repeat/modifiers, open menus and modal dialogs without moving paused physics');

  await scene.focus(); await page.keyboard.press('m');
  await panel.waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__rightFlightMap?.getSource('recorded-path') && ![...document.querySelectorAll('.practice-map-toolbar button')].some(button => button.disabled));
  await panel.locator('.maplibregl-ctrl-scale').waitFor({state:'visible'});
  assert.match(await panel.locator('.maplibregl-ctrl-scale').textContent(),/nm/i);
  await frozen(initialPaused);
  await panel.locator('.maplibregl-canvas').focus(); await page.keyboard.press('m');
  await panel.waitFor({state:'hidden'});
  assert.equal(await page.locator('.flight-app').getAttribute('data-flight-map'),'false');
  await scene.focus(); await page.keyboard.press('m');
  await panel.waitFor({state:'visible'});
  await activate();
  await panel.locator('.practice-map-airports summary').click();
  const airportSearch = panel.getByLabel('Search airports');
  await airportSearch.focus(); await page.keyboard.press('m');
  assert.equal(await airportSearch.inputValue(),'m');
  assert.equal(await panel.isVisible(),true,'typing M in search does not close the map');
  await airportSearch.fill('');
  await panel.locator('.practice-map-airports summary').click();
  await frozen(initialPaused);
  checks.push('M toggles from scene and map focus, search typing stays local, and the map has a nautical scale');

  const desktop = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
    return { map:rect('#practice-map-panel'), scene:rect('#scene'), cockpit:rect('.flight-deck') };
  });
  assert(desktop.map.x > 1440 / 2 && desktop.map.width >= 360 && desktop.map.width <= 640);
  assert(desktop.scene.right <= desktop.map.x - 8, '3D view and map occupy separate right/left areas');
  assert(desktop.map.bottom <= desktop.cockpit.y, 'map stays above the cockpit');
  assert.equal(Math.round(desktop.cockpit.width), 1440, 'cockpit remains full width');
  assert((await panel.locator('.practice-map-viewport').boundingBox()).height >= 180);
  await scene.focus(); await page.keyboard.press('o');
  const headerBox = await page.locator('.topbar').boundingBox();
  assert((await panel.boundingBox()).y >= headerBox.y + headerBox.height, 'visible menu bar stays above the dock');
  await page.keyboard.press('o');
  checks.push('desktop map docks on the right beside the 3D view and above the full-width cockpit; shown menus remain unobstructed');

  await page.locator('#start').click();
  await scene.focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.rightMapStates.at(-1)?.step > 120);
  const firstPath = await pathData();
  assert(firstPath.features[0]?.geometry.coordinates.length >= 2, 'real flight creates a trail');
  await page.waitForFunction(async length => (await window.__rightFlightMap.getSource('recorded-path').getData()).features[0]?.geometry.coordinates.length > length, firstPath.features[0].geometry.coordinates.length);
  await scene.focus(); await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const paused = await stats();
  await activate();
  await panel.getByRole('button', { name:'Fit path', exact:true }).click();
  assert.equal(await panel.getByRole('button', { name:'Follow', exact:true }).getAttribute('aria-pressed'), 'false');
  await panel.getByRole('button', { name:'Follow', exact:true }).click();
  assert.equal(await panel.getByRole('button', { name:'Follow', exact:true }).getAttribute('aria-pressed'), 'true');
  const following = await page.evaluate(() => {
    const center=window.__rightFlightMap.getCenter(), state=window.rightMapStates.at(-1);
    return {lon:center.lng,lat:center.lat,expectedLon:state.lon_rad*180/Math.PI,expectedLat:state.lat_rad*180/Math.PI};
  });
  assert(Math.abs(following.lon-following.expectedLon)<1e-7 && Math.abs(following.lat-following.expectedLat)<1e-7);
  const canvas = panel.locator('.maplibregl-canvas'), box = await canvas.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down(); await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2,{steps:5}); await page.mouse.up();
  assert.equal(await panel.getByRole('button', { name:'Follow', exact:true }).getAttribute('aria-pressed'), 'false');
  await frozen(paused);
  checks.push('trail grows from actual flight states; Fit, Follow and pan preserve paused native state');

  await panel.locator('.practice-map-navigation-status').filter({hasText:'144 community sources'}).waitFor();
  assert.equal(await panel.getByRole('button',{name:'Show public map',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('imagery','visibility')),'none');
  await panel.getByRole('button',{name:'Show aerial imagery',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('imagery','visibility')),'visible');
  await panel.getByRole('button',{name:'Show public map',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('imagery','visibility')),'none');
  const navData = await page.evaluate(async () => await window.__rightFlightMap.getSource('navigation-aids').getData());
  assert.equal(navData.features.length, 277);
  assert.equal(navData.features.filter(feature => feature.properties.component === 'station').length, 210);
  assert((await panel.locator('.practice-map-navigation-marker').count()) <= 80);
  await panel.getByRole('button',{name:'Show navigation aids',exact:true}).click();
  assert.equal(await panel.locator('.practice-map-navigation-marker').count(),0);
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('navigation-stations','visibility')),'none');
  await panel.getByRole('button',{name:'Show navigation aids',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('navigation-stations','visibility')),'visible');
  assert((await panel.locator('.practice-map-navigation-marker').count()) <= 80);
  assert.match(await panel.locator('.practice-map-navigation-status').textContent(),/144 community sources.*66 historical LOC\/ILS.*2013\.10.*not current AIS/);
  await frozen(paused);
  checks.push('public map is default; aerial and 210 sourced community/historical stations toggle without altering paused physics; DOM labels stay bounded');

  // A new raster request really fails while the independently held path remains.
  const beforeFailure = await pathData();
  await page.route('**/scenery/map/**',route=>route.fulfill({status:503,contentType:'text/plain',body:'Unavailable fixture'}));
  await panel.getByRole('button',{name:'Fit region',exact:true}).click();
  await panel.locator('.practice-map-status').filter({hasText:/unavailable/i}).waitFor({timeout:30000});
  assert.deepEqual(await pathData(),beforeFailure);
  await frozen(paused);
  checks.push('failed map tile responses retain the aircraft/path overlay and leave physics unchanged');

  await scene.focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.practice-map-mode').textContent.includes('Recorded'));
  const reviewPath = await pathData();
  assert(reviewPath.features[0]?.geometry.coordinates.length >= firstPath.features[0].geometry.coordinates.length, 'Review retains the whole recorded trail');
  await frozen(paused);
  checks.push('Review selects the recorded aircraft frame while retaining the full flown path without changing physics');
  await scene.focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review!=='true');

  await page.setViewportSize({width:390,height:844});
  await panel.waitFor({ state:'visible' });
  const mobile = await page.evaluate(() => {
    const p=document.querySelector('#practice-map-panel').getBoundingClientRect(), c=document.querySelector('.flight-deck').getBoundingClientRect();
    return {x:p.x,right:p.right,bottom:p.bottom,cockpitTop:c.y,viewport:document.querySelector('.practice-map-viewport').getBoundingClientRect().height};
  });
  assert(mobile.x>=0&&mobile.right<=390&&mobile.bottom<=mobile.cockpitTop);
  assert(mobile.viewport>=160);
  await activate();
  await panel.getByRole('button', {name:/Close (practice|flight) map/}).click();
  await panel.waitFor({state:'hidden'});
  await page.setViewportSize({width:1440,height:900});
  await scene.focus(); await page.keyboard.press('Alt+Shift+KeyM');
  await panel.waitFor({state:'visible'});
  await page.waitForFunction(() => document.querySelectorAll('.practice-map-viewport .maplibregl-canvas').length===1);
  assert.equal(await panel.locator('.maplibregl-canvas').count(),1);
  await frozen(paused);
  assert.deepEqual(errors,[]);
  checks.push('narrow map remains inside the scene above the cockpit; close/reopen restores one map canvas');
  console.log(JSON.stringify({checks,browser:browser.version(),imagery:'Deterministic scenery pixels only; actual map and flight state'},null,2));
} finally { await browser?.close(); server.kill(); }
