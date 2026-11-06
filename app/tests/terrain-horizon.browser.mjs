// Declared synthetic mechanism fixture, not a measured elevation/physics case.
// Exercise the checkout's real provider and Cesium GPU through public APIs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5363';
const server = spawn(process.execPath, ['--input-type=module', '-e', `
  import { createServer } from 'vite';
  const server = await createServer({cacheDir: ${JSON.stringify(`${output}/terrain-horizon-vite-${process.pid}`)},
    server: {host:'127.0.0.1',port:5363,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});
  await server.listen(); server.printUrls();
`], { cwd: app, stdio: 'pipe' });
let serverLog = '', browser;
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });
const errors = [], externalRequests = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 150 && !serverLog.includes('Local:'); i++) {
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, serviceWorkers: 'block' });
  page.on('pageerror', error => { errors.push(String(error)); process.stderr.write(String(error) + '\n'); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) externalRequests.push(request.url());
  });
  // Read Vite's transformed public import so a fresh optimizer cache does not
  // depend on a preexisting node_modules/.vite URL or unbundled CommonJS.
  const transformed = await (await fetch(`${origin}/src/global-terrain-provider.ts`)).text();
  const cesiumEntry = transformed.match(/from\s+["']([^"']*\/cesium\.js[^"']*)["']/)?.[1];
  assert(cesiumEntry, 'Vite resolved the installed Cesium dependency');
  await page.route(`${origin}/terrain-horizon-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `
<!doctype html><link rel="stylesheet" href="/node_modules/cesium/Build/Cesium/Widgets/widgets.css">
<style>html,body,#scene{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="scene"></div>
<script type="module">
import * as C from ${JSON.stringify(cesiumEntry)};
import {createGlobalTerrainProvider} from '/src/global-terrain-provider.ts';
import {WORLD_TERRAIN,worldCellAt,worldTileId} from '/studies/e1-browser/sim/world-terrain.js';
const rad=Math.PI/180, nodes=129*129;
// 1-degree constant coarse horizon, a remote starter patch, and one valid
// profile-specific resident cell. All heights below are synthetic and declared.
const world={version:1,id:'synthetic-world',width:361,height:181,west_rad:-Math.PI,east_rad:Math.PI,
  south_rad:-Math.PI/2,north_rad:Math.PI/2,physical_m:new Float64Array(361*181).fill(1500),geoid_m:new Float64Array(361*181).fill(40)};
const fine={version:1,id:'synthetic-starter',width:2,height:2,west_rad:8.45*rad,east_rad:8.9*rad,
  south_rad:49.85*rad,north_rad:50.35*rad,physical_m:new Float64Array(4).fill(500),geoid_m:new Float64Array(4).fill(40)};
const [col,row]=worldCellAt(47.15*rad,8.45*rad),west=(-180+col*WORLD_TERRAIN.step)*rad,south=(-90+row*WORLD_TERRAIN.step)*rad;
const grid={version:1,id:worldTileId(col,row),slot:0,width:129,height:129,source:'global',source_detail:'copernicus',
  copernicus_nodes:nodes,coarse_nodes:0,sha256:'a'.repeat(64),west_rad:west,east_rad:west+WORLD_TERRAIN.step*rad,
  south_rad:south,north_rad:south+WORLD_TERRAIN.step*rad,physical_m:new Float64Array(nodes).fill(400),geoid_m:new Float64Array(nodes).fill(40)};
const provider=createGlobalTerrainProvider(world,fine,[grid]);
const widget=new C.CesiumWidget(document.querySelector('#scene'),{baseLayer:false,terrainProvider:provider,
  useDefaultRenderLoop:true,scene3DOnly:true,showRenderLoopErrors:false});
widget.scene.globe.maximumScreenSpaceError=1;
widget.scene.renderError.addEventListener((_,error)=>(window.renderErrors??=[]).push(String(error)));
window.renderErrors=[];
const latitude=(grid.south_rad+grid.north_rad)/2,east=grid.east_rad;
const probe={latitude,longitude:east},xy=provider.tilingScheme.positionToTileXY(probe,14);
const finest=provider.getTileDataAvailable(xy.x,xy.y,14)?14:12;
const vertex=2**-finest*rad,delta=2*vertex,band=.125*rad;
const points=[{name:'interior',latitude,longitude:(grid.west_rad+east)/2,expected:440},
  {name:'inside-edge',latitude,longitude:east-delta,expected:440},
  {name:'boundary',latitude,longitude:east,expected:440},
  {name:'outside-edge',latitude,longitude:east+delta,
    expected:1540-1100*(1-delta/band)**2*(1+2*delta/band)}];
window.fixture={widget,provider,points,finest,sourceId:grid.id,sourceStep:WORLD_TERRAIN.step};
window.moveTo=name=>{const point=points.find(p=>p.name===name);widget.scene.camera.setView({
  destination:C.Cartesian3.fromRadians(point.longitude,point.latitude,1440),
  orientation:{heading:0,pitch:-Math.PI/2,roll:0}});};
window.moveTo('boundary');window.fixtureReady=true;
</script>` }));
  await page.goto(`${origin}/terrain-horizon-fixture.html`);
  await page.waitForFunction(() => window.fixtureReady, null, { timeout: 60000 }).catch(error => {
    throw new Error(`Terrain fixture failed: ${JSON.stringify(errors)}; ${error.message}`);
  });
  const observations = [];
  // One camera sees the seam. Then center the interior point independently so
  // a legacy quarter-degree cell's center is genuinely in the rendered frustum.
  for (const names of [['inside-edge', 'boundary', 'outside-edge'], ['interior']]) {
    await page.evaluate(name => window.moveTo(name), names[0] === 'interior' ? 'interior' : 'boundary');
    const batch = await page.evaluate(async names => {
      const {widget,provider,points,finest}=window.fixture,scene=widget.scene,globe=scene.globe,ellipsoid=globe.ellipsoid;
      const selected=points.filter(point=>names.includes(point.name));
      const cpu=[];
      for(const point of selected){const xy=provider.tilingScheme.positionToTileXY(point,finest);
        const data=await provider.requestTileGeometry(xy.x,xy.y,finest),rect=provider.tilingScheme.tileXYToRectangle(xy.x,xy.y,finest);
        cpu.push({...point,cpu:data.interpolateHeight(rect,point.longitude,point.latitude)});}
      let result;
      const start=performance.now();
      while(performance.now()-start<45000){
        await new Promise(resolve=>setTimeout(resolve,100));
        result=cpu.map(point=>{const surface=ellipsoid.cartographicToCartesian({...point,height:0}),
          origin=ellipsoid.cartographicToCartesian({...point,height:20000}),normal=ellipsoid.geodeticSurfaceNormal(surface),
          hit=globe.pick({origin,direction:{x:-normal.x,y:-normal.y,z:-normal.z}},scene),gpu=hit?ellipsoid.cartesianToCartographic(hit).height:null;
          return {...point,gpu,getHeight:globe.getHeight(point)};});
        if(globe.tilesLoaded&&result.every(point=>point.gpu!==null&&Math.abs(point.gpu-point.expected)<.25))return result;
      }
      throw new Error('Terrain seam did not settle: '+JSON.stringify({result,tilesLoaded:globe.tilesLoaded}));
    }, names);
    observations.push(...batch);
  }
  const fixture = await page.evaluate(() => ({ sourceId: fixture.sourceId, sourceStep: fixture.sourceStep,
    finest: fixture.finest, renderErrors }));
  for (const point of observations) {
    assert(Math.abs(point.cpu - point.expected) < .02, `${point.name}: provider preserves the declared surface`);
    assert(Math.abs(point.gpu - point.expected) < .25, `${point.name}: rendered height agrees with the declared surface`);
  }
  const inside = observations.find(point => point.name === 'inside-edge');
  const outside = observations.find(point => point.name === 'outside-edge');
  assert(Math.abs(outside.gpu - inside.gpu) < 1, 'exterior seam does not recreate the 1100m synthetic wall');
  assert.deepEqual(errors, []); assert.deepEqual(fixture.renderErrors, []); assert.deepEqual(externalRequests, []);
  await page.screenshot({ path: `${output}/terrain-horizon-browser.png` });
  const result = { scope: 'Synthetic declared source/provider/public-GPU boundary mechanism; no real elevation or flight-fidelity claim',
    browser: await browser.version(), fixture, observations, errors, externalRequests };
  await writeFile(`${output}/terrain-horizon-browser.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  await page.evaluate(() => window.fixture.widget.destroy());
} finally {
  await browser?.close(); server.kill('SIGTERM');
  setTimeout(() => server.kill('SIGKILL'), 2000).unref();
}
