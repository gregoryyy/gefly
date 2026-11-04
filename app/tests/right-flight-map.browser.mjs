// Real application/JSBSim and map interactions; only map/photo pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
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
    window.rightMapStates = []; window.rightMapStats = []; window.rightMenuHits = [];
    document.addEventListener('click', event => { const button = event.target.closest?.('.topbar button'); if (button) window.rightMenuHits.push(button.id); }, true);
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
  const scene = page.locator('#scene'), panel = page.locator('#practice-map-panel'), menu = page.locator('#flight-map-extended-menu');
  const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
  await mkdir(output,{recursive:true});
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
  for (const key of ['Shift+KeyM','Alt+KeyM','Control+KeyM','Shift+Comma','Alt+Comma','Control+Comma','Shift+Period','Alt+Period','Control+Period','Shift+Slash','Alt+Slash','Control+Slash','Alt+Shift+KeyM']) await page.keyboard.press(key);
  await scene.evaluate(element => {
    for (const [code,key] of [['KeyM','m'],['Comma',','],['Period','.'],['Slash','/']]) for (const guard of ['metaKey','repeat'])
      element.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code,key,[guard]:true}));
  });
  assert.equal(await panel.isVisible(),false,'modifiers and repeat do not toggle the map');
  await page.keyboard.press(',');
  assert.equal(await panel.isVisible(),false,'extended-menu comma does not open a closed map');
  assert.equal(await scene.getAttribute('data-scenery-mode'),'imagery');
  await page.keyboard.press('i');
  await page.locator('#view-menu > summary').click();
  await page.keyboard.press('m');
  await page.keyboard.press(','); await page.keyboard.press('.'); await page.keyboard.press('/');
  assert.equal(await panel.isVisible(),false,'open menu guards presentation keys');
  assert.equal(await scene.getAttribute('data-landmark-level'),'0');
  await page.keyboard.press('i');
  await page.keyboard.press('o');
  await page.locator('#control-settings').waitFor({state:'visible'});
  await page.keyboard.press('m');
  await page.keyboard.press(','); await page.keyboard.press('.'); await page.keyboard.press('/');
  assert.equal(await panel.isVisible(),false,'modal dialog guards presentation keys');
  assert.equal(await scene.getAttribute('data-landmark-level'),'0');
  await page.evaluate(()=>{
    window.rightMapOptionsClosed=false;
    document.querySelector('#control-settings').addEventListener('close',()=>{window.rightMapOptionsClosed=true;},{once:true});
  });
  await page.locator('#settings-close').click();
  await page.waitForFunction(()=>window.rightMapOptionsClosed&&document.activeElement?.id==='scene');
  await frozen(initialPaused);
  assert.equal(await scene.getAttribute('data-landmark-level'),'0');
  checks.push('M/comma/period/slash ignore repeat/modifiers, open menus and modal dialogs; closed comma does not open map');

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
  assert(await menu.isHidden(),'extended controls are collapsed by default');
  assert(await panel.getByRole('button',{name:'Fit path',exact:true}).isVisible(),'compact view controls remain on the map');
  assert(await panel.getByRole('button',{name:'Show public map',exact:true}).isHidden(),'layer controls are in the collapsed menu');
  const initialViewport=await panel.locator('.practice-map-viewport').boundingBox();
  await scene.focus();await page.keyboard.press(',');await menu.waitFor({state:'visible'});
  const menuBox=await menu.boundingBox(),frontBox=await panel.boundingBox();
  assert(menuBox.y>=frontBox.y+frontBox.height-1,'menu opens below the map, over the cockpit');
  assert(menuBox.x>=frontBox.x-1&&menuBox.x+menuBox.width<=frontBox.x+frontBox.width+1,'menu uses the same right column');
  assert(Math.abs((await panel.locator('.practice-map-viewport').boundingBox()).height-initialViewport.height)<1,'opening the menu leaves map height unchanged');
  await panel.locator('.practice-map-airports summary').click();
  const airportSearch = panel.getByLabel('Search airports');
  await airportSearch.focus(); await page.keyboard.press('m');
  await page.keyboard.press(','); await page.keyboard.press('.'); await page.keyboard.press('/');
  assert.equal(await airportSearch.inputValue(),'m,./');
  assert.equal(await scene.getAttribute('data-landmark-level'),'0');
  assert.equal(await panel.isVisible(),true,'typing map keys in search does not close the map');
  await airportSearch.fill('');
  await panel.locator('.practice-map-airports summary').click();
  await menu.locator('.airport-com > summary').click();
  await menu.locator('.airport-com-filters').waitFor({state:'visible'});
  assert(await menu.locator('.airport-com').isVisible(),'COM list is reachable inside the extended menu');
  await menu.locator('.airport-com > summary').click();
  await scene.focus();await page.keyboard.press(',');await menu.waitFor({state:'hidden'});
  await frozen(initialPaused);
  checks.push('M toggles from scene and map focus, search typing stays local, and the map has a nautical scale');

  const desktop = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
    return { map:rect('#practice-map-panel'), scene:rect('#scene'), cockpit:rect('.flight-deck'), viewport:rect('.practice-map-viewport'),header:rect('.practice-map-heading') };
  });
  assert(desktop.map.x > 1440 / 2 && desktop.map.width >= 360 && desktop.map.width <= 640);
  assert(Math.abs(desktop.scene.right-desktop.map.x)<=2, '3D view and map share the right-column boundary');
  assert(desktop.map.bottom <= desktop.cockpit.y, 'map stays above the cockpit');
  assert.equal(Math.round(desktop.cockpit.width), 1440, 'cockpit remains full width');
  assert(Math.abs(desktop.map.y-desktop.scene.y)<=1,'map starts at the top of the front window');
  assert(desktop.viewport.height>=desktop.scene.height*.9,'actual collapsed map uses at least90% of front-window height');
  assert(desktop.header.height<=32,'header stays compact');
  await page.screenshot({path:`${output}/right-map-full-height.png`});
  await scene.focus(); await page.keyboard.press('i');
  assert(Math.abs((await panel.locator('.practice-map-viewport').boundingBox()).height-desktop.viewport.height)<=1,'showing the title menu does not shrink the map');
  await page.keyboard.press('i');
  checks.push('collapsed actual map fills at least90% of the front window with a30pxheader; title visibility does not resize it');

  // Make trim deliberately noninitial before testing Slash's reassigned action.
  const initialTrim=await page.evaluate(()=>window.rightMapStates.at(-1).pitch_trim_norm);
  await page.locator('#pitch-trim-control').focus(); await page.keyboard.press('ArrowRight');
  const changedTrim=Number(await page.locator('#pitch-trim-control').inputValue()),beforeSlash=await stats();
  assert(Math.abs(changedTrim+initialTrim*100)>.01,'trim command is deliberately different from initial');
  await scene.focus(); await page.keyboard.press('/');
  await page.waitForFunction(()=>document.querySelector('#scene').dataset.sceneryMode==='vector');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(Math.abs(Number(await page.locator('#pitch-trim-control').inputValue())-changedTrim)<1e-6,'Slash preserves staged trim command');
  assert.equal(await page.evaluate(()=>window.rightMapStates.at(-1).pitch_trim_norm),initialTrim,'paused native trim remains unchanged');
  await page.keyboard.press('/');
  await page.waitForFunction(()=>document.querySelector('#scene').dataset.sceneryMode==='imagery');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(Math.abs(Number(await page.locator('#pitch-trim-control').inputValue())-changedTrim)<1e-6,'Slash preserves staged trim command');
  assert.equal(await page.evaluate(()=>window.rightMapStates.at(-1).pitch_trim_norm),initialTrim,'paused native trim remains unchanged');
  await frozen(beforeSlash);
  await page.locator('#pitch-trim-initial').click();
  checks.push('Slash selects vector/photo without resetting deliberately changed trim command or advancing native physics');

  await page.locator('#start').click();
  await scene.focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.rightMapStates.at(-1)?.step > 120);
  await scene.focus(); await page.keyboard.press('m'); await panel.waitFor({state:'hidden'});
  await page.keyboard.press('m'); await panel.waitFor({state:'visible'});
  const regular=await panel.locator('.practice-map-viewport').boundingBox();
  await scene.focus(); await page.keyboard.press(',');
  await menu.waitFor({state:'visible'});
  assert.equal(await page.locator('#map-overlap').getAttribute('aria-keyshortcuts'),',');
  assert.match(await page.locator('#map-overlap').textContent(),/Map menu.*,/);
  assert(Math.abs((await panel.locator('.practice-map-viewport').boundingBox()).height-regular.height)<1);
  await page.screenshot({path:`${output}/right-map-extended-menu.png`});
  const centerBeforeHide=await page.evaluate(()=>{window.rightMapReference=window.__rightFlightMap;return {zoom:window.__rightFlightMap.getZoom(),follow:document.querySelector('.practice-map-toolbar button:last-child').getAttribute('aria-pressed')};});
  await page.keyboard.press('m');await panel.waitFor({state:'hidden'});
  await scene.focus();await page.keyboard.press('m');await panel.waitFor({state:'visible'});
  assert(await menu.isVisible(),'M hide/show retains the chosen menu state');
  assert.deepEqual(await page.evaluate(()=>({zoom:window.__rightFlightMap.getZoom(),follow:document.querySelector('.practice-map-toolbar button:last-child').getAttribute('aria-pressed')})),centerBeforeHide);
  assert(await page.evaluate(()=>window.__rightFlightMap===window.rightMapReference),'M preserves the same MapLibre controller');
  assert(Math.abs((await panel.locator('.practice-map-viewport').boundingBox()).height-regular.height)<1);
  await page.keyboard.press(',');await menu.waitFor({state:'hidden'});
  for (const [index, name] of ['Places','Landmarks','Detailed','Off'].entries()) {
    await scene.focus(); await page.keyboard.press('.');
    await page.waitForFunction(level => Number(document.querySelector('#scene').dataset.landmarkLevel) === level, (index+1)%4);
    assert.match(await page.locator('#cycle-landmarks').textContent(), new RegExp(name));
  }
  await scene.focus();
  const beforeChord = await page.evaluate(() => ({ level:document.querySelector('#scene').dataset.landmarkLevel,
    map:document.querySelector('.flight-app').dataset.flightMap, hits:window.rightMenuHits.length }));
  for (const code of ['J','Y','C','V','M','D','A','F','S','L','H','W','O','R','G','B','N','P','E','T','I',...Array.from({length:10},(_,i)=>`Digit${i}`)])
    await page.keyboard.press(`Alt+Shift+${code.length===1?'Key'+code:code}`);
  assert.deepEqual(await page.evaluate(() => ({level:document.querySelector('#scene').dataset.landmarkLevel,map:document.querySelector('.flight-app').dataset.flightMap})),
    {level:beforeChord.level,map:beforeChord.map}, 'removed Alt+Shift chords cannot change map or labels');
  assert.equal(await page.evaluate(() => window.rightMenuHits.length),beforeChord.hits,'all removed Alt+Shift menu chords dispatch no command');
  assert(await page.locator('#control-settings').isHidden());
  assert.equal(await page.locator('.topbar [aria-keyshortcuts*="Alt"]').count(),0);
  assert(!(await page.locator('.topbar kbd').allTextContents()).some(text=>/Alt.*Shift|⌥⇧/.test(text)));
  checks.push('M opens/closes during actual flight; comma toggles only the below-map menu; period cycles labels; removed Alt+Shift chords neither trigger nor advertise commands');
  const firstPath = await pathData();
  await page.waitForFunction(() => document.querySelector('.practice-map-trajectory polyline')?.getAttribute('points')?.split(' ').length > 1);
  assert(firstPath.features[0]?.geometry.coordinates.length >= 2, 'real flight creates a trail');
  const projectedError = await page.evaluate(coordinate => {
    const expected = window.__rightFlightMap.project(coordinate);
    const actual = document.querySelector('.practice-map-trajectory polyline').points.getItem(0);
    return Math.hypot(actual.x - expected.x, actual.y - expected.y);
  }, firstPath.features[0].geometry.coordinates[0]);
  assert(projectedError < .02, 'visible trajectory is projected from actual recorded coordinates');

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
  // Follow puts ownship/trace DOM markers at the center; drag bare map instead.
  const panStart = {x:box.x+box.width/4,y:box.y+box.height/4};
  assert(await canvas.evaluate((element, point) => document.elementFromPoint(point.x,point.y) === element, panStart), 'pan begins on actual map canvas, not a DOM marker');
  await page.mouse.move(panStart.x,panStart.y);
  await page.mouse.down(); await page.mouse.move(panStart.x+50,panStart.y,{steps:5}); await page.mouse.up();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.practice-map-toolbar button')).find(button=>button.textContent==='Follow').getAttribute('aria-pressed') === 'false');
  await frozen(paused);
  checks.push('trail grows from actual flight states; Fit, Follow and pan preserve paused native state');

  await scene.focus();await page.keyboard.press(',');await menu.waitFor({state:'visible'});
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
  const locationTypes=menu.getByRole('group',{name:'Location types',exact:true});
  const navCheckbox=locationTypes.getByRole('checkbox',{name:'NAV aids',exact:true});
  await navCheckbox.uncheck();
  assert.equal(await panel.locator('.practice-map-navigation-marker').count(),0);
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('navigation-stations','visibility')),'none');
  await navCheckbox.check();
  assert.equal(await page.evaluate(()=>window.__rightFlightMap.getLayoutProperty('navigation-stations','visibility')),'visible');
  assert((await panel.locator('.practice-map-navigation-marker').count()) <= 80);
  assert.match(await panel.locator('.practice-map-navigation-status').filter({hasText:'144 community sources'}).textContent(),/144 community sources.*66 historical LOC\/ILS.*2013\.10.*not current AIS/);
  await frozen(paused);
  checks.push('public map is default; aerial and 210 sourced community/historical stations toggle without altering paused physics; DOM labels stay bounded');

  const popup=panel.locator('.map-point-popup');
  const activeChannels=await page.locator('#com1-active,#com2-active,#nav1-active,#nav2-active').allTextContents();
  const apBefore=await page.evaluate(()=>window.rightMapStates.at(-1).kap_engaged);assert.equal(apBefore,1);
  const tunePopup=async kind=>{
    for(const receiver of [1,2]){
      const button=popup.getByRole('button',{name:`${kind.toUpperCase()}${receiver} standby`,exact:true}).first();
      const channel=Number(await button.getAttribute('data-channel-khz'));await button.click();
      await page.waitForFunction(({kind,receiver,channel})=>Math.round(Number(document.querySelector(`#${kind}${receiver}-standby`).value)*1000)===channel,{kind,receiver,channel});
    }
    assert.deepEqual(await page.locator('#com1-active,#com2-active,#nav1-active,#nav2-active').allTextContents(),activeChannels,'popup tunes standby only');
    assert.equal(await page.evaluate(()=>window.rightMapStates.at(-1).kap_engaged),apBefore);await frozen(paused);
  };
  assert(await navCheckbox.isChecked(),'airport marker is reachable with NAV labels still visible');
  assert.equal(await panel.getByRole('button',{name:'Show navigation aids',exact:true}).count(),0,'location checkbox replaces the duplicate NAV toggle');
  await panel.getByRole('button',{name:'Select Frankfurt-Egelsbach Airport',exact:true}).click();
  await popup.getByRole('button',{name:'COM1 standby',exact:true}).first().waitFor({state:'visible'});
  await tunePopup('com');
  await panel.locator('.maplibregl-popup-close-button').click();
  const pointSearch=menu.getByLabel('Search map points');
  await pointSearch.fill('FFM');
  await menu.locator('.map-point-search-row').first().click();await panel.locator('.maplibregl-popup-close-button').click();
  await panel.getByRole('button',{name:/^Show navigation aid FFM, VOR/}).first().click();
  await tunePopup('nav');await panel.locator('.maplibregl-popup-close-button').click();
  await pointSearch.fill('ASKIK');
  await menu.locator('.map-point-search-row').filter({hasText:'ASKIK'}).first().click();
  await popup.getByRole('button',{name:'GPS target',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#map-gps-readout').textContent.includes('ASKIK'));
  const gps=await page.evaluate(async()=>await window.__rightFlightMap.getSource('gps-target').getData());
  assert.equal(gps.features.length,2);const target=[8.533611,50.052778];
  assert.deepEqual(gps.features.find(f=>f.geometry.type==='Point').geometry.coordinates,target);
  assert.deepEqual(gps.features.find(f=>f.geometry.type==='LineString').geometry.coordinates.at(-1),target);
  await frozen(paused);assert.equal(await page.evaluate(()=>window.rightMapStates.at(-1).kap_engaged),apBefore);
  await page.screenshot({path:`${output}/right-map-point-actions.png`});
  checks.push('actual airport/NAV marker popups tune both standby receivers only; ASKIK source fix sets the exact GPS target; AP and paused native state remain unchanged');

  await panel.locator('.maplibregl-popup-close-button').click();await pointSearch.fill('');
  const typeLabels=['Airfields','Helipads','Seaplane bases','Balloonports','Closed facilities','NAV aids','Fixes'];
  for(const name of typeLabels) assert(await locationTypes.getByRole('checkbox',{name,exact:true}).isChecked(),`${name} defaults on`);
  const layerState=()=>page.evaluate(async()=>{
    const map=window.__rightFlightMap,airports=await map.getSource('airfields').getData(),nav=await map.getSource('navigation-aids').getData(),fixes=await map.getSource('navigation-fixes').getData();
    return {types:airports.features.map(f=>f.properties.type),navCount:nav.features.length,fixCount:fixes.features.length,
      navShown:map.getLayoutProperty('navigation-stations','visibility')!=='none'&&nav.features.length>0,
      fixesShown:map.getLayoutProperty('navigation-fixes','visibility')!=='none'&&fixes.features.length>0};
  });
  const allLocations=await layerState(),retainedPath=await pathData();
  for(const [name,sourceType] of [['Airfields','_airport'],['Helipads','heliport']]){
    const checkbox=locationTypes.getByRole('checkbox',{name,exact:true});await checkbox.uncheck();const hidden=await layerState();
    assert(!hidden.types.some(type=>sourceType==='_airport'?type.endsWith(sourceType):type===sourceType),`${name} filters actual airport GPU features`);
    assert(hidden.types.some(type=>sourceType==='_airport'?type==='heliport':type.endsWith('_airport')),'other airfield categories remain visible');
    assert.equal(await panel.locator(sourceType==='_airport'?'.practice-map-airport-marker[data-type$="_airport"]':'.practice-map-airport-marker[data-type="heliport"]').count(),0);
    assert(hidden.navShown&&hidden.fixesShown,'airfield-type changes retain NAV and fixes');
    await checkbox.check();assert.deepEqual((await layerState()).types,allLocations.types);
  }
  for(const [name,field,selector] of [['NAV aids','navShown','.practice-map-navigation-marker'],['Fixes','fixesShown','.practice-map-fix-marker']]){
    const checkbox=locationTypes.getByRole('checkbox',{name,exact:true});await checkbox.uncheck();const hidden=await layerState();
    assert.equal(hidden[field],false,`${name} hides GPU features`);assert.equal(await panel.locator(selector).count(),0,`${name} removes DOM labels`);
    assert.deepEqual(hidden.types,allLocations.types,'airport features remain intact');await checkbox.check();assert.equal((await layerState())[field],true);
  }
  await pointSearch.focus();await page.keyboard.type('m,./');assert.equal(await pointSearch.inputValue(),'m,./');
  for(const name of typeLabels) assert(await locationTypes.getByRole('checkbox',{name,exact:true}).isChecked(),'typing shortcut keys does not change location choices');
  assert(await panel.isVisible()&&await menu.isVisible());await pointSearch.fill('');
  for(const name of typeLabels) await locationTypes.getByRole('checkbox',{name,exact:true}).uncheck();
  const empty=await layerState();assert.equal(empty.types.length,0);assert(!empty.navShown&&!empty.fixesShown);
  assert.equal(await menu.locator('.map-point-search-row').count(),0,'all-off leaves unified search empty');
  assert.equal(await panel.locator('.practice-map-airport-marker,.practice-map-navigation-marker,.practice-map-fix-marker').count(),0,'all-off removes all location DOM markers');
  await page.waitForFunction(()=>window.__rightFlightMap.queryRenderedFeatures({layers:['airfields','navigation-stations','navigation-components','navigation-fixes']}).length===0);
  assert.deepEqual(await pathData(),retainedPath);assert(await panel.locator('.practice-map-aircraft').isVisible());
  assert.deepEqual(await page.evaluate(async()=>await window.__rightFlightMap.getSource('gps-target').getData()),gps,'GPS line/target is independent of location visibility');
  await scene.focus();await page.keyboard.press('m');await panel.waitFor({state:'hidden'});await page.keyboard.press('m');await panel.waitFor({state:'visible'});
  for(const name of typeLabels) assert(!await locationTypes.getByRole('checkbox',{name,exact:true}).isChecked(),'hide/reopen retains checkbox choices');
  assert.equal(await menu.locator('.map-point-search-row').count(),0);await frozen(paused);
  await activate();
  for(const name of typeLabels) await locationTypes.getByRole('checkbox',{name,exact:true}).check();
  assert.deepEqual((await layerState()).types,allLocations.types);await frozen(paused);
  checks.push('location checkboxes independently filter airfields/helipads/NAV/fixes on map and search; all-off retains aircraft/trail/GPS and choices survive reopen');

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
    return {x:p.x,right:p.right,bottom:p.bottom,cockpitTop:c.y,sceneHeight:document.querySelector('#scene').getBoundingClientRect().height,viewport:document.querySelector('.practice-map-viewport').getBoundingClientRect().height};
  });
  assert(mobile.x>=0&&mobile.right<=390&&mobile.bottom<=mobile.cockpitTop);
  assert(mobile.viewport>=mobile.sceneHeight*.9,'mobile map retains the full front-window height');
  assert(await menu.isVisible());
  await scene.focus();await page.keyboard.press(',');await menu.waitFor({state:'hidden'});
  assert(Math.abs((await panel.locator('.practice-map-viewport').boundingBox()).height-mobile.viewport)<1,'mobile menu close does not resize map');
  await activate();
  await panel.getByRole('button', {name:/Close (practice|flight) map/}).click();
  await panel.waitFor({state:'hidden'});
  await page.setViewportSize({width:1440,height:900});
  await scene.focus(); await page.keyboard.press('m');
  await panel.waitFor({state:'visible'});
  await page.waitForFunction(() => document.querySelectorAll('.practice-map-viewport .maplibregl-canvas').length===1);
  assert.equal(await panel.locator('.maplibregl-canvas').count(),1);
  await frozen(paused);
  assert.deepEqual(errors,[]);
  checks.push('narrow map remains inside the scene above the cockpit; close/reopen restores one map canvas');
  console.log(JSON.stringify({checks,browser:browser.version(),imagery:'Deterministic scenery pixels only; actual map and flight state'},null,2));
} finally { await browser?.close(); server.kill(); }
