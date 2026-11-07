// Real Cesium/WebGL mechanism and app integration. Synthetic terrain/cartography
// are declared fixtures; this is not an elevation or aircraft-fidelity test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const port = Number(process.env.GEFLY_OSM_RELIEF_PORT || 5496), origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e', `
  import {createServer} from 'vite';
  const s=await createServer({cacheDir:${JSON.stringify(`${output}/osm-relief-vite-${process.pid}`)},
    server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});
  await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverLog = '', browser;
server.stdout.on('data', c => { serverLog += c; }); server.stderr.on('data', c => { serverLog += c; });
const pageErrors = [], checks = [], observations = {};
try {
  await mkdir(output, { recursive: true });
  for (let i=0;i<150 && !serverLog.includes('Local:');i++) {
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve,100));
  }
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath:process.env.CHROME } : {channel:'chrome'}) });
  const page = await browser.newPage({viewport:{width:1000,height:760},serviceWorkers:'block'});
  page.on('pageerror', e => pageErrors.push(String(e)));
  const osmRequests=[]; page.on('request', request => { if (/\/scenery\/osm\//.test(request.url())) osmRequests.push(request.url()); });
  const transformed = await (await fetch(`${origin}/src/global-terrain-provider.ts`)).text();
  const cesiumEntry = transformed.match(/from\s+["']([^"']*\/cesium\.js[^"']*)["']/)?.[1];
  assert(cesiumEntry, 'Vite resolved installed Cesium');
  await page.route(`${origin}/osm-relief-fixture.html`, route => route.fulfill({contentType:'text/html', body:`<!doctype html>
<link rel="stylesheet" href="/node_modules/cesium/Build/Cesium/Widgets/widgets.css">
<style>html,body,#scene{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="scene"></div>
<script type="module">
import * as C from ${JSON.stringify(cesiumEntry)};
import {createOsmReliefMaterial} from '/src/osm-relief.ts';
const bounds=C.Rectangle.fromDegrees(8.4,49.8,8.9,50.2),size=65;
const tiling=new C.GeographicTilingScheme({rectangle:bounds,numberOfLevelZeroTilesX:1,numberOfLevelZeroTilesY:1});
const elevation=(lon,lat)=>Math.max(0,1600*(1-Math.abs(lon-8.65)/.08))*Math.max(0,Math.min(1,(.12-Math.abs(lat-50))/.04));
const provider=new C.CustomHeightmapTerrainProvider({tilingScheme:tiling,width:size,height:size,callback(x,y,level){
  if(level>6)return undefined;const rect=tiling.tileXYToRectangle(x,y,level),heights=new Float64Array(size*size);
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
    const lat=C.Math.toDegrees(rect.north+(rect.south-rect.north)*row/(size-1));
    const lon=C.Math.toDegrees(rect.west+(rect.east-rect.west)*col/(size-1));heights[row*size+col]=elevation(lon,lat);
  }return heights;}});
provider.getTileDataAvailable=(x,y,level)=>level<=6;
provider.getLevelMaximumGeometricError=level=>level>=6?1e-6:1200/2**level;
const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
ctx.fillStyle='#719762';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#e8dfb2';ctx.lineWidth=5;
for(let y=20;y<512;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y+35);ctx.stroke();}
ctx.fillStyle='#152521';ctx.font='bold 20px sans-serif';ctx.fillText('SYNTHETIC MAP',150,250);
const imagery=new C.SingleTileImageryProvider({url:canvas.toDataURL(),rectangle:bounds,tileWidth:512,tileHeight:512});
const widget=new C.CesiumWidget(document.querySelector('#scene'),{baseLayer:false,terrainProvider:provider,
 useDefaultRenderLoop:true,scene3DOnly:true,showRenderLoopErrors:false,contextOptions:{webgl:{preserveDrawingBuffer:true}}});
const scene=widget.scene;scene.imageryLayers.add(new C.ImageryLayer(imagery));scene.globe.maximumScreenSpaceError=1;
scene.fog.enabled=false;scene.globe.enableLighting=false;scene.renderError.addEventListener((_,e)=>(window.renderErrors??=[]).push(String(e)));
window.renderErrors=[];const material=createOsmReliefMaterial();
window.fixture={scene,widget,material,elevation};window.setMaterial=on=>{scene.globe.material=on?material:undefined;scene.requestRender();};
window.setHeading=deg=>{scene.camera.setView({destination:C.Cartesian3.fromDegrees(8.65,50,14000),orientation:{heading:C.Math.toRadians(deg),pitch:-Math.PI/2,roll:0}});scene.requestRender();};
window.setHeading(0);window.fixtureReady=true;
</script>`}));
  await page.goto(`${origin}/osm-relief-fixture.html`);
  await page.waitForFunction(()=>window.fixtureReady, null,{timeout:60000});
  await page.waitForFunction(()=>window.fixture.scene.globe.tilesLoaded, null,{timeout:60000});
  await page.waitForTimeout(800);
  async function capture(on,heading,name){
    await page.evaluate(({on,heading})=>{window.setHeading(heading);window.setMaterial(on);},{on,heading});
    await page.waitForFunction(()=>window.fixture.scene.globe.tilesLoaded, null,{timeout:60000});
    await page.waitForTimeout(600);
    return await page.screenshot({path:`${output}/${name}.png`});
  }
  async function difference(a,b){return await page.evaluate(async ({a,b})=>{
    const decode=async s=>{const image=new Image();image.src='data:image/png;base64,'+s;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return {width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data};};
    const x=await decode(a),y=await decode(b);let changed=0,total=0,max=0;
    for(let i=0;i<x.data.length;i+=4){const d=Math.max(Math.abs(x.data[i]-y.data[i]),Math.abs(x.data[i+1]-y.data[i+1]),Math.abs(x.data[i+2]-y.data[i+2]));if(d>=3)changed++;total+=d;max=Math.max(max,d);}
    return {pixels:x.data.length/4,changed,mean:total/(x.data.length/4),max};
  },{a:a.toString('base64'),b:b.toString('base64')});}
  const unshaded=await capture(false,0,'osm-relief-fixture-off');
  const shaded=await capture(true,0,'osm-relief-fixture-on');
  observations.synthetic = await difference(unshaded,shaded);
  assert(observations.synthetic.changed > 500, `actual sloped GPU terrain must change pixels: ${JSON.stringify(observations.synthetic)}`);
  const unshadedRotated=await capture(false,180,'osm-relief-fixture-rotated-off');
  const shadedRotated=await capture(true,180,'osm-relief-fixture-rotated-on');
  observations.rotated = await difference(unshadedRotated,shadedRotated);
  assert(observations.rotated.changed > 500, `shading remains visible from opposite camera direction: ${JSON.stringify(observations.rotated)}`);
  const sample=async(image,x,y)=>page.evaluate(async ({data,x,y})=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return [...ctx.getImageData(x,y,1,1).data];},{data:image.toString('base64'),x,y});
  const samplePairs=[];
  for(const [x,y] of [[100,400],[300,400],[700,400],[900,400]]) samplePairs.push({x,y,off:await sample(unshaded,x,y),on:await sample(shaded,x,y),rotatedOff:await sample(unshadedRotated,999-x,759-y),rotatedOn:await sample(shadedRotated,999-x,759-y)});
  observations.samples=samplePairs;
  for(const i of [0,1,3]) assert(Math.abs(samplePairs[i].on[1]-samplePairs[i].off[1])<=2, 'flat and sun-facing reference pixels stay approximately unchanged');
  assert(samplePairs[2].off[1]-samplePairs[2].on[1]>=3, 'opposing ridge face is visibly darker');
  assert(Math.abs((samplePairs[2].off[1]-samplePairs[2].on[1])-(samplePairs[2].rotatedOff[1]-samplePairs[2].rotatedOn[1]))<=2, 'same world face remains similarly shaded after 180° camera rotation');
  assert.deepEqual(await page.evaluate(()=>window.renderErrors), []);
  checks.push('actual Cesium GPU imagery darkens declared synthetic sloped terrain at two camera orientations');
  await page.evaluate(()=>window.fixture.widget.destroy());
  observations.scope = 'Synthetic heightmap and map image fixture; no real OSM, terrain accuracy, or aircraft-fidelity claim.';
  if (!process.env.GEFLY_OSM_RELIEF_SYNTHETIC_ONLY) {
  // In the actual application, compare the render mode plumbing and worker
  // state. Source instrumentation only exposes the existing scene object.
  await installSceneryFixture(page);
  await page.route('**/scenery/osm/**/*.pbf', route => route.fulfill({status:200,contentType:'application/x-protobuf',body:Buffer.alloc(0)}));
  await page.route(url => /\/src\/scene(?:\.ts)?$/.test(url.pathname), async route => {
    const response=await route.fetch(),source=await response.text();
    assert(source.includes('const scene = widget.scene;'));
    const materialLine='const nextMaterial = wantsRelief && !reliefFailed ? osmRelief : undefined;';
    assert(source.includes(materialLine));
    assert(source.includes('widget.render();'));
    const instrumented=source.replace('const scene = widget.scene;', 'const scene = widget.scene; window.__reliefScene = scene;')
      .replace(materialLine, 'const nextMaterial = window.__reliefForceOff ? undefined : wantsRelief && !reliefFailed ? osmRelief : undefined;')
      .replace('let loadSlow = false;', 'window.__reliefApply=applyImageryMode; let loadSlow = false;')
      .replace('widget.render();', `if(window.__reliefMountainView) scene.camera.setView({destination:Cartesian3.fromDegrees(8.49,50.28,3000),orientation:{heading:Math.PI,pitch:-0.2,roll:0}});
    widget.render();`);
    await route.fulfill({response,body:instrumented});
  });
  await page.addInitScript(()=>{
    const Native=window.Worker;window.__reliefStates=[];window.__reliefStats=[];
    window.Worker=class extends Native {
      constructor(...args){super(...args);if(!String(args[0]).includes('/sim/worker.js'))return;window.__reliefWorker=this;
        this.addEventListener('message',({data})=>{if(data.type==='state')window.__reliefStates.push(data);if(data.type==='stats')window.__reliefStats.push(data);});}
    };
  });
  await page.goto(origin);
  await page.waitForFunction(()=>window.__reliefScene && window.__reliefStates.length && !document.querySelector('#start')?.disabled,null,{timeout:60000});
  await prepareFlightUI(page,{controls:false});await page.locator('#start').click();
  await page.waitForFunction(()=>window.__reliefStates.at(-1)?.step>20,null,{timeout:60000});
  await page.locator('#scene').focus();await page.keyboard.press('Space');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='Paused');
  const stats=async()=>{const n=await page.evaluate(()=>window.__reliefStats.length);await page.evaluate(()=>window.__reliefWorker.postMessage({type:'stats'}));await page.waitForFunction(n=>window.__reliefStats.length>n,n);return page.evaluate(()=>window.__reliefStats.at(-1));};
  const before=await stats();
  await page.locator('#view-menu > summary').click();await page.locator('#toggle-map-terrain').click();
  await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.osmRelief==='active',null,{timeout:60000});
  assert(await page.evaluate(()=>!!window.__reliefScene.globe.material),'3D vector mode uses a material');
  const vector=await page.locator('#scene').evaluate(e=>({...e.dataset}));
  const flatCheck=await page.evaluate(()=>{const scene=window.__reliefScene;const before=scene.globe.terrainProvider;window.__reliefApply(false);const state={status:document.querySelector('#scene').dataset.osmRelief,material:!!scene.globe.material,sameProvider:before===scene.globe.terrainProvider};window.__reliefApply(true);return state;});
  assert.deepEqual(flatCheck,{status:'off',material:false,sameProvider:true},'flat-study branch disables the material without resetting the terrain provider');
  observations.flat=flatCheck;

  // Fixed camera over the bundled Hessen height grid, with synthetic map tiles.
  await page.evaluate(()=>{window.__reliefMountainView=true;window.__reliefForceOff=true;});
  await page.waitForFunction(()=>Math.abs(window.__reliefScene.camera.positionCartographic.latitude*180/Math.PI-50.28)<.001 && window.__reliefScene.globe.tilesLoaded,null,{timeout:60000});await page.waitForTimeout(2000);
  observations.camera=await page.evaluate(()=>({lat:window.__reliefScene.camera.positionCartographic.latitude*180/Math.PI,lon:window.__reliefScene.camera.positionCartographic.longitude*180/Math.PI,height:window.__reliefScene.camera.positionCartographic.height,heading:window.__reliefScene.camera.heading,pitch:window.__reliefScene.camera.pitch,canvasCount:document.querySelectorAll('#scene canvas').length,loaded:document.querySelector('#scene').dataset.mapTerrainLoaded}));
  const overlays=await page.addStyleTag({content:'body * { visibility:hidden !important; } #scene canvas { visibility:visible !important; }'});
  const mountainOff=await page.locator('#scene canvas').first().screenshot({path:`${output}/osm-relief-hessen-off.png`});
  await page.evaluate(()=>{window.__reliefForceOff=false;});await page.waitForTimeout(1300);
  const mountainOn=await page.locator('#scene canvas').first().screenshot({path:`${output}/osm-relief-hessen-on.png`});
  observations.hessen=await difference(mountainOff,mountainOn);
  assert(observations.hessen.changed>100, `bundled Hessen mountain surface must show a GPU pixel change: ${JSON.stringify(observations.hessen)}`);
  await overlays.evaluate(e=>e.remove());await page.evaluate(()=>{window.__reliefMountainView=false;});
  await page.waitForFunction(()=>Number(document.querySelector('#scene').dataset.worldMapLoaded)>0 && Number(document.querySelector('#scene').dataset.worldMapQueued)===0,null,{timeout:60000});
  await page.waitForTimeout(1500);
  const requestsBefore=osmRequests.length;
  const sameProvider=await page.evaluate(()=>{const scene=window.__reliefScene,provider=scene.globe.terrainProvider;for(let i=0;i<5;i++){window.__reliefApply(false);window.__reliefApply(true);}return scene.globe.terrainProvider===provider;});
  await page.waitForTimeout(1000);
  const requestsAfter=osmRequests.length;
  assert(sameProvider,'relief changes do not replace terrain provider');
  assert.equal(requestsAfter,requestsBefore,'relief-only changes do not cause OSM requests at a settled camera');
  observations.reload={sameProvider,requestsBefore,requestsAfter};
  checks.push('repeated relief material changes retain terrain provider and do not initiate OSM requests at a settled camera');
  checks.push('bundled Hessen elevation under synthetic map tiles shows visible GPU relief at fixed mountain viewpoint');
  await page.locator('#view-menu > summary').click();await page.locator('#toggle-map-terrain').click();
  await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.osmRelief==='off',null,{timeout:60000});
  assert(await page.evaluate(()=>!window.__reliefScene.globe.material),'photo mode removes globe material');
  const after=await stats();assert.equal(after.step,before.step);assert.equal(after.digest,before.digest);
  observations.app={vectorMode:vector.osmRelief,photoMode:'off',step:after.step,digest:after.digest};
  checks.push('actual app switches shading only with 3D vector mode and paused native step/digest stay unchanged');
  }
  assert.deepEqual(pageErrors, []);
  await writeFile(`${output}/osm-relief-browser.json`,JSON.stringify({result:'pass',browser:await browser.version(),checks,observations,pageErrors},null,2)+'\n');
  console.log(JSON.stringify({result:'pass',checks,observations,pageErrors},null,2));
} finally { await browser?.close(); server.kill('SIGTERM'); setTimeout(()=>server.kill('SIGKILL'),2000).unref(); }
