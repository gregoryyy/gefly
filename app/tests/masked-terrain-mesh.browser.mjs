// Real Cesium worker and full-scene GPU checks; no scenery or native flight fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5273';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5273,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', chunk => { log += chunk; }); server.stderr.on('data', chunk => { log += chunk; });
try {
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) {
    if (server.exitCode !== null) throw new Error(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => requests.push(request.url()));
  await page.route(`${origin}/masked-mesh-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><script type="module">
    import{createMaskedTerrainMesh}from'/src/masked-terrain-mesh.ts';
    import{Rectangle,GeographicTilingScheme,Cartesian2,Cartesian3,Intersections2D,CesiumWidget,CustomHeightmapTerrainProvider}from'/node_modules/.vite/deps/cesium.js';
    window.checkMeshes=async()=>{
      const rectangle=Rectangle.fromDegrees(8,50,8+.25/16,50+.25/16);
      const tilingScheme=new GeographicTilingScheme({rectangle,numberOfLevelZeroTilesX:1,numberOfLevelZeroTilesY:1});
      const cases=[];
      for(const [name,width,heights] of [
        ['hole',2,new Float64Array([NaN,10,0,0])],
        ['empty',129,new Float64Array(129*129).fill(NaN)],
        ['negative',2,new Float64Array([NaN,-90,-100,-100])],
        ['affine',129,Float64Array.from({length:129*129},(_,i)=>Math.floor(i/129)<64?NaN:
          -100+250*(i%129)/128+500*(1-Math.floor(i/129)/128))]]) {
        const data=createMaskedTerrainMesh(rectangle,heights,width,0);
        const mesh=await data.createMesh({tilingScheme,x:0,y:0,level:0,throttle:false});
        // Independently sample the actual worker mesh to check the provider's
        // height-query contract after Cesium has replaced its pre-mesh buffers.
        const sample=(u,v)=>{
          for(let i=0;i<mesh.indices.length;i+=3){
            const ids=Array.from(mesh.indices.slice(i,i+3));
            const uv=ids.map(index=>mesh.encoding.decodeTextureCoordinates(mesh.vertices,index,new Cartesian2()));
            const bary=Intersections2D.computeBarycentricCoordinates(u,v,uv[0].x,uv[0].y,uv[1].x,uv[1].y,uv[2].x,uv[2].y);
            if(bary.x>=-1e-12&&bary.y>=-1e-12&&bary.z>=-1e-12)
              return ids.reduce((sum,index,j)=>sum+mesh.encoding.decodeHeight(mesh.vertices,index)*[bary.x,bary.y,bary.z][j],0);
          }
        };
        cases.push({name,indices:mesh.indices.length,withoutSkirts:mesh.indexCountWithoutSkirts,
          vertices:mesh.vertexCountWithoutSkirts,finite:Array.from(mesh.vertices).every(Number.isFinite),
          indicesAvoidMissing:Array.from(mesh.indices).every(index=>Number.isFinite(heights[index])),
          zeroAreaOnly:mesh.indices.length===3&&mesh.indices[0]===mesh.indices[1]&&mesh.indices[1]===mesh.indices[2],
          lower:sample(.75,.25)??null,upper:sample(.25,.75)??null,
          postMeshLower:data.interpolateHeight(rectangle,rectangle.west+.75*rectangle.width,rectangle.south+.25*rectangle.height)??null,
          postMeshUpper:data.interpolateHeight(rectangle,rectangle.west+.25*rectangle.width,rectangle.south+.75*rectangle.height)??null});
      }
      return cases;
    };
    window.checkEmptyGlobe=async()=>{
      const rectangle=Rectangle.fromDegrees(8,50,8+.25/16,50+.25/16);
      const tilingScheme=new GeographicTilingScheme({rectangle,numberOfLevelZeroTilesX:1,numberOfLevelZeroTilesY:1});
      const provider=new CustomHeightmapTerrainProvider({width:129,height:129,tilingScheme,callback:()=>new Float64Array(129*129)});
      provider.requestTileGeometry=(x,y,level)=>level===0?Promise.resolve(createMaskedTerrainMesh(rectangle,new Float64Array(129*129).fill(NaN),129,0)):undefined;
      provider.getTileDataAvailable=(x,y,level)=>x===0&&y===0&&level===0;
      provider.getLevelMaximumGeometricError=()=>1e-6;
      const container=document.createElement('div');container.style.cssText='width:800px;height:600px';document.body.append(container);
      const widget=new CesiumWidget(container,{terrainProvider:provider,baseLayer:false,skyBox:false,skyAtmosphere:false});
      const renderErrors=[];widget.scene.renderError.addEventListener((_,error)=>renderErrors.push(String(error)));
      widget.camera.setView({destination:Cartesian3.fromRadians((rectangle.west+rectangle.east)/2,(rectangle.south+rectangle.north)/2,5000),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});
      try{
        for(let i=0;i<120;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
        const root=widget.scene.globe._surface._levelZeroTiles?.[0];
        const height=widget.scene.globe.getHeight({longitude:(rectangle.west+rectangle.east)/2,latitude:(rectangle.south+rectangle.north)/2,height:0});
        const ray=widget.camera.getPickRay(new Cartesian2(400,300));
        return {renderErrors,gpuUploaded:!!root?.data?.vertexArray,indices:root?.data?.renderedMesh?.indices.length,
          height:height??null,pick:widget.scene.globe.pick(ray,widget.scene)??null};
      }finally{widget.destroy();container.remove();}
    };window.ready=true;
  </script>` }));
  await page.goto(`${origin}/masked-mesh-fixture.html`);
  await page.waitForFunction(() => window.ready, { timeout: 15000 });
  const cases = await page.evaluate(() => window.checkMeshes());
  console.log(JSON.stringify(cases));
  assert.deepEqual(errors, []);
  assert(requests.some(url => url.includes('createVerticesFromQuantizedTerrainMesh')), 'actual Cesium worker loaded');
  for (const item of cases) {
    assert(item.finite && (item.indicesAvoidMissing||(item.name==='empty'&&item.zeroAreaOnly)), `${item.name}: finite encoding; only the empty zero-area sentinel may reference an unsupported vertex`);
    assert.equal(item.indices, item.withoutSkirts, 'no skirts bridge missing terrain');
    assert.equal(item.upper, null, `${item.name}: real worker mesh preserves absent triangle`);
    assert.equal(item.postMeshUpper, null, `${item.name}: post-mesh queries preserve absent triangle`);
    if(item.lower===null) assert.equal(item.postMeshLower,null);
    else assert(Math.abs(item.postMeshLower-item.lower)<.1,`${item.name}: post-mesh query agrees with actual decoded geometry within worker encoding error`);
  }
  assert.equal(cases[0].indices, 3); assert(Math.abs(cases[0].lower - 2.5) < .01);
  assert.equal(cases[1].indices, 3); assert(cases[1].zeroAreaOnly);assert.equal(cases[1].vertices, 129*129); assert.equal(cases[1].lower, null);
  assert.equal(cases[2].indices, 3); assert(Math.abs(cases[2].lower + 97.5) < .01);
  assert(cases[3].indices>3);assert(Math.abs(cases[3].lower-212.5)<.1);
  const emptyGlobe=await page.evaluate(()=>window.checkEmptyGlobe());
  console.log('Full-scene empty terrain',JSON.stringify(emptyGlobe));
  assert.deepEqual(emptyGlobe.renderErrors,[],'empty terrain uploads without stopping the real render loop');
  assert(emptyGlobe.gpuUploaded,'the empty terrain root actually reaches GPU upload');
  assert.equal(emptyGlobe.indices,3,'GPU upload contains only the degenerate sentinel');
  assert.equal(emptyGlobe.height,null,'empty mesh supplies no getHeight ground');
  assert.equal(emptyGlobe.pick,null,'empty mesh supplies no ray-pick ground');
  assert.deepEqual(errors,[],'the full-scene GPU check has no uncaught browser errors');
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/masked-terrain-mesh-browser.json`, JSON.stringify({ cases, emptyGlobe, errors, workerRequests: requests.filter(url => url.includes('/Workers/')) }, null, 2));
  console.log('PASS actual Cesium worker: partial, all-missing and negative-height meshes retain real holes without skirts');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
