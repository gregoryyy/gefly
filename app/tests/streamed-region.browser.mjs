// Actual app, JSBSim WASM, and public DEM. Only map/photo tiles are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { prepareFlightUI, activateFlightMap } from './flight-actions.mjs';
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
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  let fixtureRequests=0; const fixtureKinds={map:0,imagery:0}, fetched=[];
  await context.route('**/scenery/**',route=>{fixtureRequests++;fixtureKinds[route.request().url().includes('/imagery/')?'imagery':'map']++;return route.fulfill({contentType:'image/png',body:route.request().url().includes('/imagery/')?png512:png256});});
  await context.route('**/src/scene.ts',async route=>{const response=await route.fetch(),source=await response.text();assert(source.includes('widget.resolutionScale ='));await route.fulfill({response,body:source.replace('widget.resolutionScale =','window.__regionalWidget = widget; window.__regionalGraphicsErrors=[]; window.__recordRegionalGraphicsError=error=>{const text=String(error.message??error);if(window.__regionalGraphicsErrors.length<8&&!window.__regionalGraphicsErrors.includes(text))window.__regionalGraphicsErrors.push(text);}; widget.scene.renderError.addEventListener((_,error)=>window.__recordRegionalGraphicsError(error)); widget.scene.globe.terrainProviderChanged.addEventListener(()=>widget.scene.globe.terrainProvider.errorEvent.addEventListener(window.__recordRegionalGraphicsError)); widget.resolutionScale =')});});
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
  async function waitReady(id){try{await page.waitForFunction(id=>window.regionalMessages.some(m=>m.worker===id&&m.type==='ready')&&window.regionalMessages.some(m=>m.worker===id&&m.type==='state')&&!document.querySelector('#start').disabled,id,{timeout:20000});}catch(error){console.error(await page.evaluate(()=>({status:document.querySelector('#status').textContent, errors:window.regionalMessages.filter(m=>m.type==='error'), last:window.regionalMessages.slice(-3)})));throw error;}}
  async function stats(){const n=await page.evaluate(()=>window.regionalMessages.length);await page.evaluate(()=>window.regionalWorkers.at(-1).postMessage({type:'stats'}));await page.waitForFunction(n=>window.regionalMessages.slice(n).some(m=>m.type==='stats'),n);return page.evaluate(()=>window.regionalMessages.filter(m=>m.type==='stats').at(-1));}
  async function frozen(before){const after=await stats();assert.equal(after.step,before.step);assert.equal(after.digest,before.digest);assert.deepEqual(after.final_state,before.final_state);}
  async function mesh(finest){return page.evaluate(async finest=>{
    const started=performance.now(), widget=window.__regionalWidget, state=window.regionalMessages.filter(m=>m.type==='state').at(-1);let observed;
    while(performance.now()-started<60000){await new Promise(r=>requestAnimationFrame(r));
      const point={longitude:state.lon_rad,latitude:state.lat_rad,height:0},provider=widget.scene.globe.terrainProvider;
      const exactRenderedHeight=widget.scene.globe.getHeight(point),renderedEdgeRays=[];
      let height=exactRenderedHeight,renderedRayOffset_rad=[0,0];
      // Unskirted masked tiles cannot bridge unsupported source areas. At an
      // exact shared root edge, Float32 Cartesian vertex encoding can leave a
      // sub-millimetre ray seam. Record an adjacent ray only for an undefined
      // edge query; exact-center source/geometry agreement is still mandatory.
      const rootXY=provider.tilingScheme.positionToTileXY(point,0);
      if(!Number.isFinite(height)&&rootXY){
        const root=provider.tilingScheme.tileXYToRectangle(rootXY.x,rootXY.y,0);
        const lonEdge=Math.min(Math.abs(state.lon_rad-root.west),Math.abs(state.lon_rad-root.east))<1e-12;
        const latEdge=Math.min(Math.abs(state.lat_rad-root.south),Math.abs(state.lat_rad-root.north))<1e-12;
        for(const [dlon,dlat] of [...(lonEdge?[[-1e-10,0],[1e-10,0]]:[]),...(latEdge?[[0,-1e-10],[0,1e-10]]:[])]){
          const candidate=widget.scene.globe.getHeight({longitude:state.lon_rad+dlon,latitude:state.lat_rad+dlat,height:0});
          renderedEdgeRays.push({offset_rad:[dlon,dlat],height:candidate??null});
          if(!Number.isFinite(height)&&Number.isFinite(candidate)){height=candidate;renderedRayOffset_rad=[dlon,dlat];}
        }
      }
      const contains=t=>t&&state.lon_rad>=t.rectangle.west&&state.lon_rad<=t.rectangle.east&&state.lat_rad>=t.rectangle.south&&state.lat_rad<=t.rectangle.north;
      let node=widget.scene.globe._surface._levelZeroTiles?.find(contains),level=-1;
      while(node){if(node.data?.renderedMesh)level=node.level;node=[node._southwestChild,node._southeastChild,node._northwestChild,node._northeastChild].find(contains);}
      observed={height,level,finest,tilesLoaded:widget.scene.globe.tilesLoaded};
      if(widget.scene.globe.tilesLoaded&&Number.isFinite(height)&&level>=0) {
        const xy=provider.tilingScheme.positionToTileXY(point,finest);
        if(!xy || !provider.getTileDataAvailable(xy.x,xy.y,finest) || provider.getTileDataAvailable(xy.x*2,xy.y*2,finest+1)) throw Error('Unexpected terrain provider LOD');
        const geometry=await provider.requestTileGeometry(xy.x,xy.y,finest);
        const finestHeight=geometry.interpolateHeight(provider.tilingScheme.tileXYToRectangle(xy.x,xy.y,finest),state.lon_rad,state.lat_rad);
        return {height,exactRenderedHeight:exactRenderedHeight??null,renderedRayOffset_rad,renderedEdgeRays,level,finest,finestHeight,expected:state.terrain_height_ellipsoid_m,provider:provider.constructor.name,geometry:geometry.constructor.name};
      }
    } throw Error('Rendered mesh unavailable '+JSON.stringify({observed,graphicsErrors:window.__regionalGraphicsErrors,roots:widget.scene.globe._surface._levelZeroTiles?.map(t=>({x:t.x,y:t.y,state:t.state,renderable:t.renderable,indices:t.data?.renderedMesh?.indices.length,terrainState:t.data?.terrainState})),dataset:document.querySelector('#scene').dataset}));
  },finest);}
  await page.goto(origin);await waitReady(0);await prepareFlightUI(page,{controls:false});
  assert(fetched.length>=9&&fetched.length<=16,`initial regional source halo downloads: ${fetched.length}`);
  const first=await page.evaluate(()=>window.regionalMessages.filter(m=>m.worker===0&&m.type==='terrain-tile').map(m=>m.id));
  assert.equal(new Set(first).size,9);assert(Number(await page.locator('#scene').getAttribute('data-terrain-cached'))<=73);
  checks.push('initial worker installs nine composite cells using a bounded regional source halo of at most16 tiles');
  const allPresets=[['darmstadt',49.87,8.65],['odenwald',49.65,8.85],['spessart',50,9.5],['westerwald',50.45,7.8],['marburg',50.8,8.77],['kassel',51.3,9.4],['stuttgart',48.78,9.18],['munich',48.14,11.58],['saarbruecken',49.24,7],['koblenz',50.36,7.6],['alps',47.58,11]];
  const requested=process.env.GEFLY_REGION_PRESETS?.split(',');
  if(requested) assert(requested.length&&requested.every(id=>allPresets.some(preset=>preset[0]===id)),'unknown requested regional preset');
  const presets=requested?allPresets.filter(preset=>requested.includes(preset[0])):allPresets;
  for(const [id,lat,lon] of presets){
    const before=fetched.length,sceneryBefore=fixtureRequests,worker=await page.evaluate(()=>window.regionalWorkers.length);
    await page.locator('#flight-menu > summary').click();await page.locator('#flight-research').evaluate(element => { element.open = true; }); await page.locator(`[data-region="${id}"]`).click();await waitReady(worker);
    const s=await latest();assert(Math.abs(s.lat_rad-lat*Math.PI/180)<1e-8&&Math.abs(s.lon_rad-lon*Math.PI/180)<1e-8);
    assert(fetched.length-before<=16&&fetched.length-before>0);
    const resident=await page.evaluate(worker=>{const set=new Set();let max=0;for(const m of window.regionalMessages.filter(m=>m.worker===worker)){if(m.type==='terrain-tile')set.add(m.id);if(m.type==='terrain-remove')set.delete(m.id);max=Math.max(max,set.size);}return max;},worker);assert(resident<=9);
    const m=await mesh(id==='darmstadt'?5:4);observations[id]={...m,fixtureRequests:fixtureRequests-sceneryBefore};console.log(id,JSON.stringify(observations[id]));assert.equal(m.provider,'CustomHeightmapTerrainProvider');
    assert(Math.abs(m.finestHeight-m.expected)<=.25,`${id}: finest provider geometry differs from native terrain`);
    assert(Math.hypot(...m.renderedRayOffset_rad)<=1e-10,'rendered ray offset is bounded to less than 0.7 mm on Earth');
    if(Math.hypot(...m.renderedRayOffset_rad)>0){
      assert.equal(m.exactRenderedHeight,null,'adjacent rays never replace a finite primary height');
      assert(m.renderedEdgeRays.length>=2&&m.renderedEdgeRays.every(ray=>Number.isFinite(ray.height)&&Math.abs(ray.height-m.expected)<=.25),
        `${id}: actual rendered heights on both supported sides of the root edge agree with the native center`);
    }
    assert(Math.abs(m.height-m.expected)<=.25,`${id}: native ${m.expected} versus actual Cesium mesh ${m.height} at level ${m.level}`);
    assert(Number(await page.locator('#scene').getAttribute('data-terrain-cached'))<=73);
    if(id==='odenwald'){await page.locator('#view-menu > summary').click();await page.locator('#chase').click();await page.screenshot({path:`${output}/streamed-odenwald-fixture-imagery.png`});}
  }
  checks.push(`${presets.length} requested regional presets use real native heights and actual Cesium mesh within 0.25 m at the aircraft`);
  await page.locator('#start').click();await page.waitForFunction(()=>window.regionalMessages.filter(m=>m.type==='state').at(-1)?.step>30);
  await page.locator('#pause').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const paused=await stats();await page.locator('#view-menu > summary').click();await page.locator('#toggle-map').click();
  const panel=page.locator('#practice-map-panel');await activateFlightMap(page);
  await panel.locator('.maplibregl-canvas').focus();await page.keyboard.press(',');
  await page.waitForFunction(()=>document.querySelector('#practice-map-panel').dataset.extendedMenu==='true');
  await panel.getByRole('button',{name:'Charts',exact:true}).click();
  assert.equal(await panel.locator('#flight-map-charts a').first().getAttribute('href'),'https://openflightmaps.org/downloads/ed/');
  assert.equal(await panel.locator('#flight-map-charts a').last().getAttribute('href'),'https://aip.dfs.de/');
  await panel.getByRole('button',{name:'Charts',exact:true}).click();await panel.locator('.practice-map-airports > summary').click();await panel.getByLabel('Search airports').fill('EDFE');
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
    const badContext=await browser.newContext({viewport:{width:1000,height:700},serviceWorkers:'block'});
    await badContext.route('**/scenery/**',route=>route.fulfill({contentType:'image/png',body:route.request().url().includes('/imagery/')?png512:png256}));
    await badContext.route('**/terrain/region/*.f32*',async route=>{
      if(mode==='missing')return route.fulfill({status:404,body:''});
      const response=await route.fetch(), data=Buffer.from(await response.body());data[0]^=1;
      return route.fulfill({response,body:data});
    });
    await badContext.addInitScript(()=>{const NativeWorker=window.Worker;window.testReady=0;window.testState=null;window.Worker=class extends NativeWorker {constructor(...args){super(...args);if(String(args[0]).includes('/sim/worker.js'))this.addEventListener('message',e=>{if(e.data?.type==='ready')window.testReady++;if(e.data?.type==='state')window.testState=e.data;});}};});
    const bad=await badContext.newPage();await bad.goto(origin);
    await bad.waitForFunction(()=>window.testReady===1&&window.testState&&!document.querySelector('#start').disabled,null,{timeout:60000});
    assert.equal(await bad.locator('#status').textContent(),'Paused');
    const fallback=await bad.evaluate(()=>window.testState);
    assert.equal(fallback.step,0);assert(Number.isFinite(fallback.terrain_height_msl_m));
    assert([2,3].includes(fallback.terrain_source),'optional regional failure retains explicit global/mixed fallback provenance');
    await badContext.close();
  }
  checks.push('missing and corrupt optional regional tiles retain bounded global fallback and paused readiness; mandatory world-package failure remains a separate fail-closed check');
  assert.deepEqual(await page.evaluate(()=>window.__regionalGraphicsErrors),[]);
  assert(fixtureRequests>0);assert.deepEqual([...hosts],['127.0.0.1']);assert.deepEqual(errors,[]);
  observations.fixtureRequests=fixtureRequests; observations.fixtureKinds=fixtureKinds;
  await writeFile(`${output}/streamed-region-browser.json`,JSON.stringify({checks,observations,imagery:'synthetic PNG fixture; not photographic fidelity evidence'},null,2)+'\n');
  console.log(JSON.stringify({result:'pass',checks,observations},null,2));
}catch(error){
  await writeFile(`${output}/streamed-region-browser.json`,JSON.stringify({result:'fail',checks,observations,errors,error:String(error),imagery:'synthetic PNG fixture; not photographic fidelity evidence'},null,2)+'\n');
  throw error;
}finally{await browser?.close();server.kill('SIGTERM');}
