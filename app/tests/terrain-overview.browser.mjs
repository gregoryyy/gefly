// Author-run integration evidence. Real Vite/Copernicus/Worker/WASM; module
// observers expose closures but never replace source data or native messages.
// Read-only private render-list inspection is diagnostic only. Production uses
// public Cesium APIs. Separate static CPU providers never touch live guards.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

await fs.mkdir(new URL('../../output/flight/',import.meta.url),{recursive:true});
const app=fileURLToPath(new URL('../',import.meta.url)),origin='http://127.0.0.1:5367';
const sourcePaths=['app/src/scene.ts','app/src/global-terrain-provider.ts','app/src/terrain-overview.ts',
  'app/src/terrain-detail-budget.ts','app/src/main.ts','app/src/types.ts','app/copernicus-terrain-server.ts'];
const digest=b=>createHash('sha256').update(b).digest('hex');
const sourceHashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,digest(await fs.readFile(new URL('../../'+p,import.meta.url)))])));
const result={scope:'Author-run actual-source full-app static west Table / fresh east >=850 simulated seconds; renderer-only near-contact component case; no independent acceptance or aircraft fidelity claim',
  rawSourceHashesBefore:await sourceHashes(),servedCompiledModuleHashes:{},observerTransformedModuleHashes:{},requests:[],errors:[],cases:[]};
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/terrain-overview-vite-'+process.pid,server:{host:'127.0.0.1',port:5367,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let log='',browser;
server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
const save=()=>fs.writeFile(new URL('../../output/flight/terrain-overview-no-churn.json',import.meta.url),JSON.stringify(result,null,2));
const once=(source,from,to)=>{assert.equal(source.split(from).length,2,'Observer marker must be unique: '+from);return source.replace(from,to);};

async function prepare(label,heading){
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>result.errors.push({label,error:String(e)}));
  page.on('requestfinished',async request=>{if(request.url().includes('/elevation/'))result.requests.push({label,url:request.url(),status:(await request.response())?.status(),timing:request.timing()});});
  for(const name of ['scene','global-terrain-provider','terrain-overview','terrain-detail-budget'])await page.route(`**/src/${name}.ts`,async route=>{
    const response=await route.fetch();let source=await response.text();
    result.servedCompiledModuleHashes[`${label}/${name}`]=digest(source);
    if(name==='scene'){
      source=once(source,'const scene = widget.scene;',`const scene = widget.scene;
        window.__ovScene=scene;window.__ovSource14=[];window.__ovQueues=[];window.__ovChanges=[];window.__ovRenderErrors=[];
        scene.globe.terrainProviderChanged.addEventListener(()=>__ovChanges.push({wall:performance.now()}));
        scene.globe.tileLoadProgressEvent.addEventListener(n=>__ovQueues.push({wall:performance.now(),n}));
        scene.renderError.addEventListener((_,e)=>__ovRenderErrors.push(String(e)));`);
      source=once(source,'displayOverview = grids;',`displayOverview = grids;Object.defineProperty(window,'__ovDisplayOverview',{configurable:true,get:()=>displayOverview});(window.__ovBatches??=[]).push({wall:performance.now(),ids:grids.map(g=>g.id),hashes:grids.map(g=>g.sha256)});`);
      source=once(source,'overviewStatus.hidden = true;','overviewStatus.hidden = true;window.__ovStatus=overviewStatus;');
      source=once(source,'const overviewLoader = new TerrainOverview','const overviewLoader = window.__ovLoader = new TerrainOverview');
      source=once(source,'const flightScene = {','const flightScene = window.__ovFlightScene = {');
      source=once(source,'setTerrainTiles(tiles) {',`setTerrainTiles(tiles) {window.__ovNativeTiles=tiles;(window.__ovInstalls??=[]).push({wall:performance.now(),ids:tiles.map(g=>g.id),hashes:tiles.map(g=>g.sha256)});`);
    }else if(name==='global-terrain-provider'){
      // overviewTiles is reassigned on history updates: a captured array is stale.
      source=once(source,'if (!heights) return undefined;',`if (!heights) return undefined;
        if(provider===window.__ovScene?.globe.terrainProvider&&level===14){const r=tilingScheme.tileXYToRectangle(x,y,level);window.__ovSource14.push({x,y,level,west:r.west,east:r.east,south:r.south,north:r.north,wall:performance.now()});if(window.__ovSource14.length>512)window.__ovSource14.shift();}`);
      source=once(source,'const coarsePreviews =',`if(!window.__ovCpuProbe)window.__ovSources={world,fine,selected,get overviewTiles(){return overviewTiles},sampleAtlas,sampleWorldTerrain};const coarsePreviews =`);
    }
    result.observerTransformedModuleHashes[`${label}/${name}`]=digest(source);
    await route.fulfill({response,body:source});
  });
  await page.addInitScript(({heading})=>{
    localStorage.setItem('gefly.flight-location.v1',JSON.stringify({version:1,lat_rad:-33.9715*Math.PI/180,lon_rad:18.6021*Math.PI/180,alt_msl_m:1900,heading_rad:heading*Math.PI/180,mode:'airborne'}));
    window.__ovStates=[];window.__ovCommands=[];const Native=Worker;
    window.Worker=class extends Native{constructor(...args){super(...args);if(String(args[0]).includes('/sim/worker.js')){
      window.__ovWorker=this;this.addEventListener('message',({data})=>{if(data.type==='state')__ovStates.push({wall:performance.now(),state:data});});}}
      postMessage(data,...args){if(this===window.__ovWorker&&['kap140','autopilot-capture','simulation-rate','input'].includes(data?.type))__ovCommands.push(structuredClone(data));return super.postMessage(data,...args);}};
  },{heading});
  await page.goto(origin);await page.waitForFunction(()=>window.__ovStates?.length&&!document.querySelector('#start').disabled&&window.__ovSources?.selected.size===9,null,{timeout:90000});
  await page.addStyleTag({content:'#flight-gate{display:none!important}'});
  // This publication base has session-only view settings: use its actual UI.
  // A localStorage key from the unpublished root app would silently do nothing.
  await page.locator('#toggle-map-terrain').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#toggle-map-terrain').getAttribute('aria-pressed')==='true'&&document.querySelector('#scene').dataset.sceneryMode==='vector');
  await page.evaluate(async()=>{
    const text=await(await fetch('/src/global-terrain-provider.ts')).text();
    const url=text.match(/from\s+["']([^"']*\/cesium\.js[^"']*)["']/)?.[1];if(!url)throw Error('Cesium compiled import unavailable');
    window.__ovC=await import(url);window.__ovProviderModule=await import('/src/global-terrain-provider.ts');window.__ovModule=await import('/src/terrain-overview.ts');
    window.__ovNativeDigests=async()=>Promise.all(__ovNativeTiles.map(async g=>({id:g.id,declared:g.sha256,
      physical:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',g.physical_m))).map(v=>v.toString(16).padStart(2,'0')).join(''),
      geoid:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',g.geoid_m))).map(v=>v.toString(16).padStart(2,'0')).join('')})));
    window.__ovTarget25=()=>{const n=__ovStates.at(-1).state,d=25000/6371008.8,b=n.heading_rad,a=n.lat_rad;
      const latitude=Math.asin(Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(b));
      return{latitude,longitude:n.lon_rad+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(latitude)),height:0};};
    window.__ovProbe=async target=>{
      const s=__ovScene,g=s.globe,e=g.ellipsoid,src=__ovSources,C=__ovC;
      // Independent CPU provider construction allows at most nine overview cells.
      // Choose the target owner first; omit irrelevant history rather than copying
      // the live guard state or changing it with a probe request.
      const owner=src.overviewTiles.find(t=>target.longitude>=t.west_rad&&target.longitude<=t.east_rad&&target.latitude>=t.south_rad&&target.latitude<=t.north_rad);
      let cpuProvider;window.__ovCpuProbe=true;
      try{cpuProvider=__ovProviderModule.createGlobalTerrainProvider(src.world,src.fine,[...src.selected.values()],owner?[owner]:src.overviewTiles.slice(0,9));}
      finally{window.__ovCpuProbe=false;}
      const xy=cpuProvider.tilingScheme.positionToTileXY(target,14),data=await cpuProvider.requestTileGeometry(xy.x,xy.y,14),rect=cpuProvider.tilingScheme.tileXYToRectangle(xy.x,xy.y,14);
      const cpu=data?.interpolateHeight(rect,target.longitude,target.latitude)??null;
      const zero=e.cartographicToCartesian({...target,height:0}),origin=e.cartographicToCartesian({...target,height:20000}),normal=e.geodeticSurfaceNormal(zero);
      const hit=g.pick(new C.Ray(origin,C.Cartesian3.negate(normal,new C.Cartesian3())),s),gpu=hit?e.cartesianToCartographic(hit).height:null;
      const under=g._surface._tilesToRender.filter(t=>target.longitude>=t.rectangle.west&&target.longitude<=t.rectangle.east&&target.latitude>=t.rectangle.south&&target.latitude<=t.rectangle.north).map(t=>({level:t.level,x:t.x,y:t.y}));
      const source=__ovModule.sampleTerrainOverview(src.overviewTiles,target.latitude,target.longitude),actual=src.sampleAtlas(src.fine,src.selected,target.latitude,target.longitude),coarse=src.sampleWorldTerrain(src.world,target.latitude,target.longitude);
      let overviewTriangle=null;
      if(under.length){const tile=under.reduce((a,b)=>a.level>b.level?a:b),r=g.terrainProvider.tilingScheme.tileXYToRectangle(tile.x,tile.y,tile.level),width=Math.min(181,2**(tile.level+2)+1),buffer=new Float64Array(width*width);let complete=true;
        for(let y=0;y<width;y++)for(let x=0;x<width;x++){const lat=y===0?r.north:y===width-1?r.south:r.north-y/(width-1)*r.height,lon=x===0?r.west:x===width-1?r.east:r.west+x/(width-1)*r.width,v=__ovModule.sampleTerrainOverview(src.overviewTiles,lat,lon);if(!v)complete=false;else buffer[y*width+x]=v.ellipsoid_m;}
        if(complete)overviewTriangle=new C.HeightmapTerrainData({buffer,width,height:width}).interpolateHeight(r,target.longitude,target.latitude);
      }
      return{target,source,actual,coarse,cpu,gpu,overviewTriangle,gpuMinusOverviewTriangle:gpu!==null&&overviewTriangle!==null?gpu-overviewTriangle:null,under,owner:owner?.id??null};
    };
  });
  const row={label,heading,started:Date.now(),initial:await page.evaluate(()=>__ovStates.at(-1)),nativeDigestsBefore:await page.evaluate(()=>__ovNativeDigests()),snapshots:[],movement:[]};result.cases.push(row);
  await page.locator('#scene').focus();await page.keyboard.press('a');await page.waitForFunction(()=>__ovStates.at(-1).state.kap_engaged===1,null,{timeout:15000});
  return{context,page,row};
}

async function settle(page,timeout=45000){
  const started=Date.now();let last;
  while(Date.now()-started<timeout){last=await page.evaluate(()=>({loaded:__ovScene.globe.tilesLoaded,last:__ovQueues.at(-1),dataset:{...document.querySelector('#scene').dataset},changes:__ovChanges.length,wall:performance.now()}));
    if(last.loaded&&(!last.last||last.last.n===0&&last.wall-last.last.wall>1000))return{...last,wait_ms:Date.now()-started};await page.waitForTimeout(250);}
  return{...last,wait_ms:Date.now()-started,timedOut:true};
}

async function snapshot(page,row,label,target){
  const queue=await settle(page),probe=await page.evaluate(target=>__ovProbe(target??__ovTarget25()),target??null);
  const observation=await page.evaluate(()=>({state:__ovStates.at(-1).state,dataset:{...document.querySelector('#scene').dataset},providerChanges:__ovChanges,providerInfo:__ovProviderModule.globalTerrainOverviewInfo(__ovScene.globe.terrainProvider),overviewIds:__ovSources.overviewTiles.map(g=>g.id),nativeIds:__ovNativeTiles.map(g=>g.id),camera:{position:__ovScene.camera.positionCartographic,heading:__ovScene.camera.heading,pitch:__ovScene.camera.pitch,fovy:__ovScene.camera.frustum.fovy},renderErrors:__ovRenderErrors}));
  const entry={label,queue,probe,...observation};row.snapshots.push(entry);console.log('SNAPSHOT',JSON.stringify(entry));await save();return entry;
}

async function narrowFov(page){await page.locator('#scene').evaluate(el=>{for(let i=0;i<5;i++)el.dispatchEvent(new WheelEvent('wheel',{deltaY:-200,deltaX:0,bubbles:true,cancelable:true}));});await page.waitForFunction(()=>Number(document.querySelector('#scene').dataset.fovDeg)===20);}
async function unchangedPaused(page){const before=await page.evaluate(()=>__ovStates.at(-1));await page.evaluate(()=>__ovWorker.postMessage({type:'simulation-rate',rate:1}));await page.waitForFunction(wall=>__ovStates.at(-1).wall>wall,before.wall);const after=await page.evaluate(()=>__ovStates.at(-1));assert.deepEqual(after.state,before.state);return{before,after};}

async function metadataOnlyCase(page,row){
  await page.waitForFunction(()=>window.__ovDisplayOverview?.length===9,null,{timeout:60000});
  row.syntheticMetadataComponent=await page.evaluate(()=>{
    const original=__ovDisplayOverview,provider=__ovScene.globe.terrainProvider,changes=__ovChanges.length;
    const metadata=g=>({id:g.id,sha256:g.sha256,regional_nodes:g.regional_nodes,copernicus_nodes:g.copernicus_nodes,source:g.source,copernicus_sha256:g.copernicus_sha256});
    const synthetic=original.map(g=>({...g,regional_nodes:129*129,copernicus_nodes:0,source:'regional',copernicus_sha256:null}));
    const before=original.map(metadata);
    // Declared component fixture invokes the existing install/status callbacks;
    // it does not replace source requests, raw data, geometry hashes or buffers.
    __ovLoader.install(synthetic);__ovLoader.notify('ready');
    const during={metadata:__ovDisplayOverview.map(metadata),status:__ovStatus.textContent,sameProvider:__ovScene.globe.terrainProvider===provider,changes:__ovChanges.length,
      sameHeightArrays:__ovDisplayOverview.every((g,i)=>g.physical_m===original[i].physical_m&&g.geoid_m===original[i].geoid_m)};
    __ovLoader.install(original);__ovLoader.notify('ready');
    const after={metadata:__ovDisplayOverview.map(metadata),status:__ovStatus.textContent,sameProvider:__ovScene.globe.terrainProvider===provider,changes:__ovChanges.length};
    return{scope:'Synthetic metadata-only Scene callback component, restored to original actual metadata before actual-source GPU probes; no native state/source arrays changed',before,during,after,initialChanges:changes};
  });
  const c=row.syntheticMetadataComponent;assert(c.during.sameProvider&&c.after.sameProvider);assert.equal(c.during.changes,c.initialChanges);assert.equal(c.after.changes,c.initialChanges);assert(c.during.sameHeightArrays);
  assert(c.during.metadata.every(g=>g.source==='regional'&&g.regional_nodes===129*129&&g.copernicus_nodes===0&&g.copernicus_sha256===null));assert.match(c.during.status,/regional elevation/);assert.deepEqual(c.after.metadata,c.before);await save();
}

try{
  for(let i=0;i<150&&!log.includes('Local:');i++){if(server.exitCode!==null)throw Error(log);await new Promise(r=>setTimeout(r,100));}assert(log.includes('Local:'),log);
  browser=await chromium.launch({headless:true,channel:'chrome'});result.browser=await browser.version();
  const west=await prepare('static-west',274),table={latitude:-33.9628*Math.PI/180,longitude:18.4098*Math.PI/180,height:0};
  await metadataOnlyCase(west.page,west.row);
  const westDefault=await snapshot(west.page,west.row,'default-60-table',table);await west.page.screenshot({path:fileURLToPath(new URL('../../output/flight/terrain-overview-no-churn-table.png',import.meta.url))});
  await narrowFov(west.page);await snapshot(west.page,west.row,'minimum-20-table',table);
  west.row.paused=await unchangedPaused(west.page);west.row.nativeDigestsAfter=await west.page.evaluate(()=>__ovNativeDigests());assert.deepEqual(west.row.nativeDigestsBefore,west.row.nativeDigestsAfter);
  west.row.all=await west.page.evaluate(()=>({queues:__ovQueues,changes:__ovChanges,batches:__ovBatches,installs:__ovInstalls,commands:__ovCommands}));await west.context.close();await save();

  const east=await prepare('fresh-east',90);const eastInitial=await snapshot(east.page,east.row,'default-60-initial-forward25');
  const baselineChanges=eastInitial.providerChanges.length;
  for(const rate of[1.5,2,5,10]){await east.page.keyboard.press('Equal');await east.page.waitForFunction(rate=>__ovStates.at(-1).state.simulation_rate===rate,rate);}
  await east.page.keyboard.press('Space');const movementStarted=Date.now();let lastCenter=null;
  while(Date.now()-movementStarted<240000){await east.page.waitForTimeout(5000);const row=await east.page.evaluate(()=>{const n=__ovStates.at(-1).state;return{wall:performance.now(),state:n,center:[Math.floor((n.lon_rad*180/Math.PI+180)*4),Math.floor((n.lat_rad*180/Math.PI+90)*4)],providerChanges:__ovChanges.length,overviewHistory:__ovSources.overviewTiles.length,providerInfo:__ovProviderModule.globalTerrainOverviewInfo(__ovScene.globe.terrainProvider),dataset:{...document.querySelector('#scene').dataset},tilesLoaded:__ovScene.globe.tilesLoaded,lastQueue:__ovQueues.at(-1)};});east.row.movement.push(row);console.log('MOVEMENT',JSON.stringify(row));await save();
    if(row.state.collision_mask)throw Error('Flight collided before completing moving coverage proof');
    const centerKey=row.center.join('/');
    if(lastCenter!==null&&centerKey!==lastCenter){
      await east.page.keyboard.press('Space');await east.page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
      await snapshot(east.page,east.row,'quarter-crossing-'+centerKey+'-forward25');
      await east.page.keyboard.press('Space');
    }
    lastCenter=centerKey;
    if(row.state.t_s>=850&&new Set(east.row.movement.map(r=>r.center.join('/'))).size>=3)break;
  }
  await east.page.keyboard.press('Space');await east.page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  await east.page.evaluate(()=>__ovWorker.postMessage({type:'simulation-rate',rate:1}));await east.page.waitForFunction(()=>__ovStates.at(-1).state.simulation_rate===1);
  const eastFinal=await snapshot(east.page,east.row,'default-60-final-forward25');
  await narrowFov(east.page);await snapshot(east.page,east.row,'minimum-20-final-forward25');
  east.row.paused=await unchangedPaused(east.page);east.row.nativeBeforeRendererCase=await east.page.evaluate(()=>__ovNativeDigests());

  // Explicit renderer-only pose. Stop this page's RAF, never modify or step the
  // paused worker; render the real current provider at native H+0.25m and look
  // down. CPU finest probe above was a distinct provider with independent guards.
  await east.page.evaluate(()=>{window.requestAnimationFrame=()=>0;window.__ovContactState={...__ovStates.at(-1).state};const n=__ovContactState;n.alt_msl_m=n.terrain_height_msl_m+.25;n.ground_height_ellipsoid_m=n.terrain_height_ellipsoid_m+.25;n.ground_agl_m=.25;n.roll_rad=0;n.pitch_rad=0;});
  await east.page.waitForTimeout(100);
  const contactStarted=Date.now();let contact;
  while(Date.now()-contactStarted<45000){contact=await east.page.evaluate(async()=>{const n=__ovContactState;__ovFlightScene.update(n,'cockpit',{yaw_rad:0,pitch_rad:-70*Math.PI/180,fov_rad:60*Math.PI/180});const probe=await __ovProbe({latitude:n.lat_rad,longitude:n.lon_rad,height:0});return{scope:'Renderer-only pose at native H+0.25m; native Worker remains paused and unchanged',pose:n,probe,dataset:{...document.querySelector('#scene').dataset},source14:__ovSource14.filter(r=>n.lon_rad>=r.west&&n.lon_rad<=r.east&&n.lat_rad>=r.south&&n.lat_rad<=r.north),tilesLoaded:__ovScene.globe.tilesLoaded,providerChanges:__ovChanges.length};});if(contact.tilesLoaded&&contact.probe.under.some(t=>t.level>=14)&&contact.source14.length)break;await east.page.waitForTimeout(150);}
  east.row.nearContact=contact;east.row.nativeAfterRendererCase=await east.page.evaluate(()=>__ovNativeDigests());assert.deepEqual(east.row.nativeAfterRendererCase,east.row.nativeBeforeRendererCase);east.row.pausedAfterRendererCase=await unchangedPaused(east.page);assert.deepEqual(east.row.pausedAfterRendererCase.after.state,east.row.paused.after.state);
  east.row.closedOverviewComponent=await east.page.evaluate(async()=>{
    const provider=__ovScene.globe.terrainProvider,changes=__ovChanges.length,n=__ovStates.at(-1).state;
    __ovLoader.stop('source outcome capacity (declared component fixture)');
    await __ovLoader.update(n.lat_rad,n.lon_rad+.1);__ovLoader.requestCells([{col:900,row:400}]);
    const target=new __ovC.Cartographic(20.125*Math.PI/180,10.125*Math.PI/180),xy=provider.tilingScheme.positionToTileXY(target,13),data=await provider.requestTileGeometry(xy.x,xy.y,13),r=provider.tilingScheme.tileXYToRectangle(xy.x,xy.y,13);
    const result={scope:'Declared optional-capacity Scene lifecycle fixture after all actual-source probes; Worker remains paused',stopped:__ovLoader.stopped,info:__ovProviderModule.globalTerrainOverviewInfo(provider),dataset:{...document.querySelector('#scene').dataset},sameProvider:provider===__ovScene.globe.terrainProvider,changesBefore:changes,changesAfter:__ovChanges.length,unknownHeight:data?.interpolateHeight(r,target.longitude,target.latitude)};
    if(!result.stopped||!result.info.closed||!result.sameProvider||changes!==result.changesAfter||!Number.isFinite(result.unknownHeight))throw Error('Closed optional overview did not retain provider and settle unknown geometry');
    return result;
  });
  east.row.all=await east.page.evaluate(()=>({queues:__ovQueues,changes:__ovChanges,batches:__ovBatches,installs:__ovInstalls,commands:__ovCommands,renderErrors:__ovRenderErrors}));
  await east.page.screenshot({path:fileURLToPath(new URL('../../output/flight/terrain-overview-no-churn-contact.png',import.meta.url))});await east.context.close();
  result.rawSourceHashesAfter=await sourceHashes();assert.deepEqual(result.rawSourceHashesAfter,result.rawSourceHashesBefore,'Source freeze held throughout run');
  const checks={staticTableSource:westDefault.probe.source?.physical_m>1000,staticTableGPU:westDefault.probe.gpu!==null&&Math.abs(westDefault.probe.gpu-(westDefault.probe.overviewTriangle??NaN))<.25,
    moving850:east.row.movement.at(-1).state.t_s>=850,twoQuarterCrossings:new Set(east.row.movement.map(r=>r.center.join('/'))).size>=3,
    noMovingProviderReassignments:eastFinal.providerChanges.length===baselineChanges,
    everyQueueSettles:result.cases.every(c=>c.snapshots.every(s=>!s.queue.timedOut&&s.queue.loaded)),
    movingForward25Source:eastFinal.probe.source!==null&&eastFinal.probe.actual===null,
    perCrossingGPU:east.row.snapshots.filter(s=>s.label.startsWith('quarter-crossing-')).length>=2&&east.row.snapshots.filter(s=>s.label.startsWith('quarter-crossing-')).every(s=>s.probe.overviewTriangle!==null&&Math.abs(s.probe.gpu-s.probe.overviewTriangle)<.25),
    movingForward25GPU:eastFinal.probe.overviewTriangle!==null&&eastFinal.probe.gpu!==null&&Math.abs(eastFinal.probe.gpu-eastFinal.probe.overviewTriangle)<.25,
    nearContactL14:contact.source14.length>0&&contact.probe.under.some(t=>t.level>=14),nearContactGPU:contact.probe.gpu!==null&&Math.abs(contact.probe.gpu-contact.pose.terrain_height_ellipsoid_m)<.25,
    noRenderErrors:result.cases.every(c=>(c.all.renderErrors??[]).length===0),noPageErrors:result.errors.length===0};
  result.checks=checks;await save();for(const[key,passed]of Object.entries(checks))assert(passed,key+' failed');console.log('PASS',JSON.stringify(checks));
}catch(error){result.failure={message:String(error),stack:error.stack,serverLog:log};result.rawSourceHashesAfter=await sourceHashes();await save();throw error;}
finally{await browser?.close();server.kill('SIGTERM');setTimeout(()=>server.kill('SIGKILL'),2000).unref();}
