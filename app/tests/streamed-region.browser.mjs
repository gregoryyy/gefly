// Actual app, JSBSim WASM, and public DEM. Only map/photo tiles are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { prepareFlightUI } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5222';
function crc32(buf) { let c = 0xffffffff; for (const b of buf) { c ^= b; for (let k=0;k<8;k++) c=(c>>>1)^(-(c&1)&0xedb88320); } return (c^0xffffffff)>>>0; }
function chunk(type, data) { const name=Buffer.from(type), size=Buffer.alloc(4), crc=Buffer.alloc(4); size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name,data]))); return Buffer.concat([size,name,data,crc]); }
function png(size) {
  const header=Buffer.alloc(13); header.writeUInt32BE(size,0); header.writeUInt32BE(size,4); header[8]=8;header[9]=6;
  const raw=Buffer.alloc((size*4+1)*size); for(let y=0;y<size;y++) for(let x=0;x<size;x++) { const i=y*(size*4+1)+1+x*4; raw[i]=58+(x>>5)%2*12;raw[i+1]=91+(y>>5)%2*12;raw[i+2]=57;raw[i+3]=255; }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const png256=png(256), png512=png(512);
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5222,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let serverOutput='',browser; server.stdout.on('data',c=>serverOutput+=c);server.stderr.on('data',c=>serverOutput+=c);
const checks=[],observations={},errors=[],hosts=new Set();
try {
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(serverOutput);try{if(serverOutput.includes('Local:')&&(await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert(serverOutput.includes('Local:'),serverOutput); await mkdir(output,{recursive:true});
  browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{channel:'chrome'})});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  let fixtureRequests=0; const fixtureKinds={map:0,imagery:0}, fetched=[];
  await context.route('**/scenery/**',route=>{fixtureRequests++;fixtureKinds[route.request().url().includes('/imagery/')?'imagery':'map']++;return route.fulfill({contentType:'image/png',body:route.request().url().includes('/imagery/')?png512:png256});});
  await context.route('**/src/scene.ts',async route=>{const response=await route.fetch(),source=await response.text();assert(source.includes('widget.resolutionScale ='));await route.fulfill({response,body:source.replace('widget.resolutionScale =','window.__regionalWidget = widget; widget.resolutionScale =')});});
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;window.regionalMessages=[];window.regionalWorkers=[];
    window.Worker=class extends NativeWorker {
      constructor(...args){super(...args);if(!String(args[0]).includes('/sim/worker.js'))return;const id=window.regionalWorkers.length;window.regionalWorkers.push(this);
        this.addEventListener('message',e=>{const m=e.data;if(['ready','state','stats','terrain-loading','terrain-tile','terrain-remove','error'].includes(m?.type))window.regionalMessages.push({worker:id,type:m.type,...(m.type==='terrain-tile'?{id:m.grid.id}:m.type==='terrain-remove'?{id:m.id}:m)});});}
    };
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{const url=new URL(r.url());if(['http:','https:'].includes(url.protocol))hosts.add(url.hostname);if(url.pathname.startsWith('/terrain/region/')&&url.pathname.endsWith('.f32'))fetched.push(url.pathname);});
  const latest=()=>page.evaluate(()=>window.regionalMessages.filter(m=>m.type==='state').at(-1));
  async function waitReady(id){await page.waitForFunction(id=>window.regionalMessages.some(m=>m.worker===id&&m.type==='ready')&&window.regionalMessages.some(m=>m.worker===id&&m.type==='state')&&!document.querySelector('#start').disabled,id,{timeout:60000});}
  async function stats(){const n=await page.evaluate(()=>window.regionalMessages.length);await page.evaluate(()=>window.regionalWorkers.at(-1).postMessage({type:'stats'}));await page.waitForFunction(n=>window.regionalMessages.slice(n).some(m=>m.type==='stats'),n);return page.evaluate(()=>window.regionalMessages.filter(m=>m.type==='stats').at(-1));}
  async function frozen(before){const after=await stats();assert.equal(after.step,before.step);assert.equal(after.digest,before.digest);assert.deepEqual(after.final_state,before.final_state);}
  async function mesh(finest){return page.evaluate(async finest=>{
    const started=performance.now(), widget=window.__regionalWidget, state=window.regionalMessages.filter(m=>m.type==='state').at(-1);
    while(performance.now()-started<60000){await new Promise(r=>requestAnimationFrame(r));const height=widget.scene.globe.getHeight({longitude:state.lon_rad,latitude:state.lat_rad,height:0});
      const contains=t=>t&&state.lon_rad>=t.rectangle.west&&state.lon_rad<=t.rectangle.east&&state.lat_rad>=t.rectangle.south&&state.lat_rad<=t.rectangle.north;
      let node=widget.scene.globe._surface._levelZeroTiles?.find(contains),level=-1;
      while(node){if(node.data?.renderedMesh)level=node.level;node=[node._southwestChild,node._southeastChild,node._northwestChild,node._northeastChild].find(contains);}
      if(widget.scene.globe.tilesLoaded&&Number.isFinite(height)&&level>=0) {
        const provider=widget.scene.globe.terrainProvider, point={longitude:state.lon_rad,latitude:state.lat_rad,height:0};
        const xy=provider.tilingScheme.positionToTileXY(point,finest);
        if(!xy || !provider.getTileDataAvailable(xy.x,xy.y,finest) || provider.getTileDataAvailable(xy.x*2,xy.y*2,finest+1)) throw Error('Unexpected terrain provider LOD');
        const geometry=await provider.requestTileGeometry(xy.x,xy.y,finest);
        const finestHeight=geometry.interpolateHeight(provider.tilingScheme.tileXYToRectangle(xy.x,xy.y,finest),state.lon_rad,state.lat_rad);
        return {height,level,finest,finestHeight,expected:state.terrain_height_ellipsoid_m,provider:provider.constructor.name};
      }
    } throw Error('Rendered mesh unavailable '+JSON.stringify(document.querySelector('#scene').dataset));
  },finest);}
  await page.goto(origin);await waitReady(0);await prepareFlightUI(page,{controls:false});
  assert.equal(fetched.length,9,`initial regional downloads: ${fetched.length}`);
  const first=await page.evaluate(()=>window.regionalMessages.filter(m=>m.worker===0&&m.type==='terrain-tile').map(m=>m.id));
  assert.equal(new Set(first).size,9);assert(Number(await page.locator('#scene').getAttribute('data-terrain-cached'))<=42);
  checks.push('initial worker downloads nine regional tiles on demand');
  for(const [id,lat,lon] of [['darmstadt',49.87,8.65],['odenwald',49.65,8.85],['spessart',50,9.5]]){
    const before=fetched.length,sceneryBefore=fixtureRequests,worker=await page.evaluate(()=>window.regionalWorkers.length);
    await page.locator('#flight-menu > summary').click();await page.locator(`[data-region="${id}"]`).click();await waitReady(worker);
    const s=await latest();assert(Math.abs(s.lat_rad-lat*Math.PI/180)<1e-8&&Math.abs(s.lon_rad-lon*Math.PI/180)<1e-8);
    assert(fetched.length-before<=9&&fetched.length-before>0);
    const resident=await page.evaluate(worker=>{const set=new Set();let max=0;for(const m of window.regionalMessages.filter(m=>m.worker===worker)){if(m.type==='terrain-tile')set.add(m.id);if(m.type==='terrain-remove')set.delete(m.id);max=Math.max(max,set.size);}return max;},worker);assert(resident<=9);
    const m=await mesh(id==='darmstadt'?5:4);observations[id]={...m,fixtureRequests:fixtureRequests-sceneryBefore};assert.equal(m.provider,'CustomHeightmapTerrainProvider');
    assert(Math.abs(m.finestHeight-m.expected)<=.25,`${id}: finest provider geometry differs from native terrain`);
    assert(Math.abs(m.height-m.expected)<=.25,`${id}: native ${m.expected} versus actual Cesium mesh ${m.height} at level ${m.level}`);
    assert(Number(await page.locator('#scene').getAttribute('data-terrain-cached'))<=42);
    if(id==='odenwald'){await page.locator('#view-menu > summary').click();await page.locator('#chase').click();await page.screenshot({path:`${output}/streamed-odenwald-fixture-imagery.png`});}
  }
  checks.push('Darmstadt, Odenwald and Spessart use real native heights and actual Cesium mesh within 0.25 m at the aircraft');
  await page.locator('#start').click();await page.waitForFunction(()=>window.regionalMessages.filter(m=>m.type==='state').at(-1)?.step>30);
  await page.locator('#pause').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const paused=await stats();await page.locator('#view-menu > summary').click();await page.locator('#toggle-map').click();
  const panel=page.locator('#practice-map-panel');await panel.locator('.practice-map-heading').click();await panel.locator('summary').click();await panel.getByLabel('Search airports').fill('EDFE');
  await panel.getByRole('button',{name:/EDFE ·/}).click();assert.match(await panel.locator('.practice-map-airport-detail').textContent(),/OurAirports/);
  await panel.locator('.maplibregl-canvas').focus();await page.keyboard.press('ArrowLeft');await frozen(paused);
  await page.screenshot({path:`${output}/streamed-region-airports-fixture-imagery.png`});
  const recordedStart=await page.evaluate(()=>{const id=window.regionalWorkers.length-1;return window.regionalMessages.find(m=>m.worker===id&&m.type==='state');});
  await page.locator('#scene').focus();await page.keyboard.press('r');await page.locator('#flight-review').waitFor({state:'visible'});
  await page.locator('#review-time').focus();await page.keyboard.press('Home');
  await page.waitForFunction(h=>Math.abs(Number(document.querySelector('#scene').dataset.aircraftHeightEllipsoidM)-h)<1e-5,recordedStart.ground_height_ellipsoid_m);
  await frozen(paused);await page.locator('#review-exit').click();
  checks.push('map search and keyboard pan, and recorded Review, leave paused native step, digest and state unchanged');
  for (const mode of ['missing','corrupt']) {
    const badContext=await browser.newContext({viewport:{width:1000,height:700}});
    await badContext.route('**/scenery/**',route=>route.fulfill({contentType:'image/png',body:route.request().url().includes('/imagery/')?png512:png256}));
    await badContext.route('**/terrain/region/*.f32*',async route=>{
      if(mode==='missing')return route.fulfill({status:404,body:''});
      const response=await route.fetch(), data=Buffer.from(await response.body());data[0]^=1;
      return route.fulfill({response,body:data});
    });
    await badContext.addInitScript(()=>{const NativeWorker=window.Worker;window.testReady=0;window.Worker=class extends NativeWorker {constructor(...args){super(...args);if(String(args[0]).includes('/sim/worker.js'))this.addEventListener('message',e=>{if(e.data?.type==='ready')window.testReady++;});}};});
    const bad=await badContext.newPage();await bad.goto(origin);
    await bad.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Flight stopped.'),null,{timeout:60000});
    assert.equal(await bad.evaluate(()=>window.testReady),0);assert(await bad.locator('#start').isDisabled());
    await badContext.close();
  }
  checks.push('missing and corrupt initial regional tiles fail closed before worker ready');
  assert(fixtureRequests>0);assert.deepEqual([...hosts],['127.0.0.1']);assert.deepEqual(errors,[]);
  observations.fixtureRequests=fixtureRequests; observations.fixtureKinds=fixtureKinds;
  await writeFile(`${output}/streamed-region-browser.json`,JSON.stringify({checks,observations,imagery:'synthetic PNG fixture; not photographic fidelity evidence'},null,2)+'\n');
  console.log(JSON.stringify({result:'pass',checks,observations},null,2));
}finally{await browser?.close();server.kill('SIGTERM');}
