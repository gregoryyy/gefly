// Real map/application/JSBSim; only scenery pixels are deterministic fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume, activateFlightMap } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5287';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5287,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
const checks = [], errors = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; ; i++) {
    if (i === 100 || server.exitCode !== null) throw new Error(log);
    if (log.includes('Local:')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('dialog', async dialog => { errors.push(`Unexpected dialog: ${dialog.message()}`); await dialog.dismiss(); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker; window.planStates = []; window.planStats = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.planWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.planStates.push(data);
          if (data.type === 'stats') window.planStats.push(data);
        });
      }
    };
  });
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'));
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__planMap = new LibreMap({').replace('function refreshPointSearch() {', 'function refreshPointSearch() { window.__waypointSnapshot = () => planStore.getSnapshot();') });
  });
  await installSceneryFixture(page); await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.planStates.length && !document.querySelector('#start').disabled);
  await prepareFlightUI(page, { controls: false });
  await page.locator('#scene').focus(); await page.keyboard.press('i');
  await page.locator('#scene').focus(); await page.keyboard.press('a');
  await page.waitForFunction(() => window.planStates.at(-1)?.kap_engaged === 1);
  const stats = async () => {
    const n = await page.evaluate(() => window.planStats.length);
    await page.evaluate(() => window.planWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.planStats.length > n, n);
    return page.evaluate(() => window.planStats.at(-1));
  };
  const frozen = async before => {
    const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
    assert.equal(await page.evaluate(() => window.planStates.at(-1).kap_engaged), 1);
  };
  const channels = () => page.locator('#com1-active,#com2-active,#nav1-active,#nav2-active').allTextContents();
  const check=message=>{checks.push(message);console.log(message);};
  const baseline = await stats(), initialChannels = await channels();
  const fov = await page.locator('#scene').getAttribute('data-fov-deg');
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  const panel = page.locator('#practice-map-panel'), canvas = panel.locator('.maplibregl-canvas');
  await page.waitForFunction(() => window.__planMap?.getSource('flight-plan-route') && window.__waypointSnapshot
    && !Array.from(document.querySelectorAll('.practice-map-toolbar button')).some(button=>button.disabled));
  const planner = page.locator('#flight-plan-overlay .map-flight-plan');
  const openPlanner = async () => {
    if (await page.locator('#flight-plan-overlay').isHidden()) { await page.locator('#scene').focus(); await page.keyboard.press('p'); }
  };
  const rows = planner.locator('.map-flight-plan-fixes > li');
  const snapshot = () => page.evaluate(() => window.__waypointSnapshot());
  await panel.locator('.practice-map-navigation-status').filter({hasText:'144 community sources'}).waitFor({state:'attached'});
  await panel.locator('.practice-map-navigation-status').filter({hasText:'regional fixes'}).waitFor({state:'attached'});
  await page.evaluate(() => {
    window.waypointContexts = [];
    document.addEventListener('contextmenu', event => window.waypointContexts.push(event), true);
    window.addEventListener('pointerup', event => {
      const canvas = window.__planMap.getCanvas(), rect = canvas.getBoundingClientRect();
      const position = window.__planMap.unproject([event.clientX - rect.left, event.clientY - rect.top]);
      window.waypointRelease = { lon: position.lng, lat: position.lat, canvas: event.target === canvas };
    }, true);
  });
  const barePoint = async () => canvas.evaluate(canvas => {
    const r = canvas.getBoundingClientRect();
    for (const y of [.7,.5,.85,.3]) for (const x of [.7,.95,.5,.3,.1]) {
      const p = {x:r.left+r.width*x,y:r.top+r.height*y};
      if (document.elementFromPoint(p.x,p.y) === canvas) return p;
    }
    throw new Error('No bare canvas for waypoint gesture');
  });
  const recenter = async center => { await page.evaluate(center => window.__planMap.jumpTo({center,zoom:13}),center); await page.waitForTimeout(35); };
  const rightCreate = async center => {
    await recenter(center);
    const before = await snapshot(), point = await barePoint(), contexts = await page.evaluate(() => window.waypointContexts.length);
    await page.mouse.click(point.x,point.y,{button:'right'});
    const actual = await page.evaluate(() => window.waypointRelease);
    assert.deepEqual(await snapshot(),before,'opening a location popup has no side effects');
    await panel.getByRole('region',{name:'Map location',exact:true}).getByRole('button',{name:'Add waypoint',exact:true}).click();
    await page.waitForFunction(n => window.__waypointSnapshot().fixes.length === n + 1,before.fixes.length);
    const after = await snapshot(), fix = after.fixes.at(-1);
    assert(actual.canvas); assert.equal(fix.anonymous,true); assert.equal(fix.name,fix.id);
    assert.equal(after.waypoints.length,before.waypoints.length+1); assert.equal(after.waypoints.at(-1).id,fix.id);
    assert(Math.abs(fix.lon_deg-actual.lon)<1e-10 && Math.abs(fix.lat_deg-actual.lat)<1e-10,'exact actual MapLibre release coordinates');
    await page.waitForFunction(n => window.waypointContexts.length > n,contexts);
    assert((await page.evaluate(n=>window.waypointContexts.slice(n).map(event=>({prevented:event.defaultPrevented})),contexts)).every(e=>e.prevented),'handled context menu suppressed');
    return fix;
  };
  assert(!await panel.evaluate(e=>e.classList.contains('floating-overlay')),'map is immediately interactive and undimmed');
  assert.equal(await panel.evaluate(e=>getComputedStyle(e).opacity),'1');
  const beforeZoom=await page.evaluate(()=>window.__planMap.getZoom());
  await panel.getByRole('button',{name:'Zoom map out',exact:true}).click();
  assert((await page.evaluate(()=>window.__planMap.getZoom()))<beforeZoom,'first toolbar click works');
  await page.locator('#scene').focus();
  let point = await barePoint();
  const beforeWheel=await page.evaluate(()=>window.__planMap.getZoom());
  assert.equal(await panel.getByRole('button',{name:'Follow',exact:true}).getAttribute('aria-pressed'),'true');
  await canvas.evaluate(element=>element.addEventListener('wheel',()=>{
    window.followAtFirstWheel=document.querySelector('.practice-map-toolbar button:last-child').getAttribute('aria-pressed');
  },{once:true}));
  await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-200);
  assert.equal(await page.evaluate(()=>window.followAtFirstWheel),'false','Follow releases during the first wheel dispatch, before MapLibre delayed zoom');
  await page.waitForFunction(z=>window.__planMap.getZoom()>z,beforeWheel);
  assert.equal((await snapshot()).fixes.length,0,'scene to first map wheel does not create a point');
  point=await barePoint();await page.mouse.click(point.x,point.y,{button:'right'});
  await panel.getByRole('region',{name:'Map location',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await snapshot()).fixes.length,0,'first right-click and cancellation create no fix or waypoint');
  assert((await page.evaluate(()=>window.waypointContexts.map(event=>({prevented:event.defaultPrevented})))).every(event=>event.prevented),'handled canvas context menu is suppressed');
  // Actual left drag disables Follow, keeping subsequent camera probes stable.
  const center = await page.evaluate(()=>{window.panStarts=0;window.panTargets=[];window.followJumps=[];const map=window.__planMap,jump=map.jumpTo;map.jumpTo=function(...args){window.followJumps.push({active:this.dragPan.isActive(),options:args[0]});return jump.apply(this,args);};map.on('dragstart',()=>window.panStarts++);document.addEventListener('pointerdown',event=>window.panTargets.push(event.target.className),true);return map.getCenter().toArray();});
  point=await barePoint();await page.mouse.click(point.x,point.y);await canvas.focus();
  point=await barePoint();
  await page.mouse.move(point.x,point.y); await page.mouse.down();
  assert(await page.evaluate(()=>window.__planMap.dragPan.isActive()),'actual primary down arms MapLibre panning');
  // A deliberate human pause crosses the host's250ms Follow repaint interval.
  // jumpTo must not reset the native gesture before the user starts moving.
  await page.waitForTimeout(350);
  assert(await page.evaluate(()=>window.__planMap.dragPan.isActive()),`Follow must preserve the pending gesture: ${JSON.stringify(await page.evaluate(()=>window.followJumps))}`);
  for(let i=1;i<=8;i++){
    await page.mouse.move(point.x-45*i/8,point.y);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForFunction(center=>window.panStarts>0 && window.__planMap.getCenter().toArray().some((v,i)=>Math.abs(v-center[i])>1e-10),center,{timeout:5000});
  assert.notDeepEqual(await page.evaluate(()=>window.__planMap.getCenter().toArray()),center,JSON.stringify(await page.evaluate(()=>({starts:window.panStarts,targets:window.panTargets,contexts:window.waypointContexts.map(event=>({prevented:event.defaultPrevented,button:event.button})),enabled:window.__planMap.dragPan.isEnabled(),follow:document.querySelector('.practice-map-toolbar button:last-child').getAttribute('aria-pressed')}))));
  assert.equal((await snapshot()).fixes.length,0);
  await rightCreate([8.7,50]); await frozen(baseline);
  assert.match(await panel.locator('.practice-map-status').textContent(),/USER-0001 added as waypoint 1/);
  check('first map click/wheel work without activation or dimming; right-click cancel does nothing, explicit Add waypoint creates once, native left pan survives Follow');
  await recenter([8.8,50.02]);point=await barePoint();
  const beforeFix=await snapshot();await page.mouse.click(point.x,point.y,{button:'right'});
  assert.deepEqual(await snapshot(),beforeFix);
  await panel.getByRole('region',{name:'Map location',exact:true}).getByRole('button',{name:'Create GPS fix',exact:true}).click();
  assert.equal((await snapshot()).fixes.length,beforeFix.fixes.length+1);
  assert.equal((await snapshot()).waypoints.length,beforeFix.waypoints.length,'Create GPS fix does not append a waypoint');
  assert.equal((await page.evaluate(async()=>await window.__planMap.getSource('gps-target').getData())).features.length,0,'creation does not auto-select GPS');

  await openPlanner();
  const create = async(name,lat,lon)=>{
    await planner.getByLabel('GPS fix name',{exact:true}).fill(name);
    await planner.getByLabel('Latitude °N',{exact:true}).fill(String(lat));
    await planner.getByLabel('Longitude °E',{exact:true}).fill(String(lon));
    await planner.getByRole('button',{name:'Create GPS fix',exact:true}).click();
  };
  await create('Start',49.9,8.6); await create('Destination',50.3,9.6);
  await rows.filter({hasText:'Custom: Start'}).getByRole('button',{name:'Set start',exact:true}).click();
  await rows.filter({hasText:'Custom: Destination'}).getByRole('button',{name:'Set destination',exact:true}).click();
  const endpoints=await snapshot(); await planner.getByRole('button',{name:'Navigate plan',exact:true}).click();
  assert.equal((await snapshot()).activeLegIndex,0);
  await rightCreate([8.85,50.05]); const edited=await snapshot();
  assert.deepEqual(edited.start,endpoints.start); assert.deepEqual(edited.destination,endpoints.destination); assert.equal(edited.activeLegIndex,null);
  assert.equal((await page.evaluate(async()=>await window.__planMap.getSource('gps-target').getData())).features.length,0);
  await frozen(baseline); assert.deepEqual(await channels(),initialChannels); assert.equal(await page.locator('#scene').getAttribute('data-fov-deg'),fov);
  check('waypoint edits preserve endpoints, stop only plan navigation, and preserve native/AP/radio/camera state');

  await recenter([9,50.1]); point=await barePoint(); let before=await snapshot();
  await page.keyboard.down('Control'); await page.mouse.click(point.x,point.y); await page.keyboard.up('Control');
  assert.deepEqual(await snapshot(),before,'Control-click opens a menu without creation');
  await panel.getByRole('region',{name:'Map location',exact:true}).getByRole('button',{name:'Add waypoint',exact:true}).click();
  await page.waitForFunction(n=>window.__waypointSnapshot().fixes.length===n+1,before.fixes.length);
  assert.equal((await snapshot()).waypoints.length,before.waypoints.length+1);
  assert.equal(await panel.locator('.map-point-popup').count(),0,'Control-click does not open a source popup');
  point=await barePoint(); before=await snapshot();
  await page.mouse.move(point.x,point.y); await page.mouse.down({button:'right'}); await page.mouse.move(point.x+35,point.y-20,{steps:5}); await page.mouse.up({button:'right'});
  assert.deepEqual(await snapshot(),before,'right drag never creates');
  const contexts=await page.evaluate(()=>window.waypointContexts.length);
  await page.locator('#flight-plan-overlay').getByRole('button',{name:'Close flight plan',exact:true}).click({button:'right'}); await page.keyboard.press('Escape');
  assert.deepEqual(await snapshot(),before);
  assert((await page.evaluate(n=>window.waypointContexts.slice(n).map(event=>({prevented:event.defaultPrevented})),contexts)).some(e=>!e.prevented),'native control context menu preserved');
  await frozen(baseline);
  check('Control-click menu adds once only on explicit action; right drag does nothing; native control context menu remains available');

  await planner.getByRole('button',{name:'Pick on map',exact:true}).click();
  await recenter([9.1,50.15]); point=await barePoint(); before=await snapshot(); await page.mouse.click(point.x,point.y);
  await page.waitForFunction(()=>document.querySelector('#practice-map-panel').dataset.pickingGpsFix==='false');
  assert.deepEqual(await snapshot(),before,'left Pick fills without creation');
  assert(Number.isFinite(Number(await planner.getByLabel('Latitude °N').inputValue())));
  point=await barePoint(); await page.mouse.move(point.x,point.y); await page.mouse.down({button:'right'});
  await page.locator('#scene').focus(); await page.keyboard.press('m'); await page.keyboard.press('m'); await page.mouse.up({button:'right'});
  assert.deepEqual(await snapshot(),before,'hide/reopen cancels pending gesture'); await activateFlightMap(page);
  // Out-of-region rejection is obsolete: 2.0.157 accepts worldwide custom fixes on main.
  await frozen(baseline);
  check('left Pick stays confirmation-based; close/reopen cancels pending right input');

  await page.route('**/scenery/osm/**',route=>route.abort('failed'));
  await recenter([10.5,48.5]); await panel.locator('.practice-map-status').filter({hasText:'Some map tiles unavailable'}).waitFor();
  await rightCreate([10.55,48.55]);
  assert.match(await panel.locator('.practice-map-status').textContent(),/added as waypoint.*Some map tiles unavailable/);
  for(let i=(await snapshot()).waypoints.length;i<30;i++) await rightCreate([8+i*.035,49.3+i*.012]);
  before=await snapshot(); await recenter([9.8,50.4]); point=await barePoint(); await page.mouse.click(point.x,point.y,{button:'right'});
  assert.deepEqual(await snapshot(),before);
  await panel.getByRole('region',{name:'Map location',exact:true}).getByRole('button',{name:'Add waypoint',exact:true}).click();
  assert.deepEqual(await snapshot(),before); assert.match(await panel.locator('.practice-map-status').textContent(),/30/);
  await panel.getByRole('region',{name:'Map location',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(new Set(before.fixes.map(f=>f.id)).size,before.fixes.length);
  await planner.getByRole('button',{name:'Remove waypoint 1',exact:true}).click();
  const next=await rightCreate([9.85,50.45]); assert.equal(next.id,`USER-${String(before.fixes.length+1).padStart(4,'0')}`,'failed limit consumes no ID');
  await frozen(baseline);
  check('tile failure warning retained during editing; 30-point limit rejects atomically without consuming identity');

  await planner.getByRole('button',{name:'Remove waypoint 1',exact:true}).click();
  await page.locator('#scene').focus(); await startOrResume(page); await page.waitForFunction(()=>window.planStates.at(-1).step>120);
  const liveStep=await page.evaluate(()=>window.planStates.at(-1).step); await activateFlightMap(page); await rightCreate([9.9,50.5]);
  await page.waitForFunction(step=>window.planStates.at(-1).step>step+5,liveStep);
  assert.equal(await page.locator('#status').textContent(),'Flying'); assert.deepEqual(await channels(),initialChannels);
  assert.equal(await page.evaluate(()=>window.planStates.at(-1).kap_engaged),1);
  await page.locator('#scene').focus(); await page.keyboard.press('Space'); await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const paused=await stats(); await page.locator('#scene').focus(); await page.keyboard.press('r'); await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review');
  await activateFlightMap(page);
  await openPlanner();
  await planner.getByRole('button',{name:'Remove waypoint 1',exact:true}).click(); await rightCreate([9.95,50.55]);
  assert.match(await planner.locator('.map-flight-plan-context').textContent(),/Current plan.*recorded aircraft position/);
  await frozen(paused); assert.deepEqual(await channels(),initialChannels);
  check('live creation keeps worker/AP running; Review edits current plan without advancing native state');
  await page.screenshot({path:`${output}/map-waypoint-review.png`});
  assert.deepEqual(errors,[]); await writeFile(`${output}/map-waypoint-browser.json`,JSON.stringify({browser:browser.version(),checks},null,2));
  console.log(`Map waypoint browser: ${checks.length} groups passed.`);
} finally { await browser?.close(); server.kill(); }
