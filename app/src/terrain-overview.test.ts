import test from 'node:test';
import assert from 'node:assert/strict';
import { TerrainOverview, overviewCenter, overviewId, validTerrainOverview, decodeCopernicusOverview,
  composeTerrainOverview, sampleTerrainOverview, readCopernicusOverview, type TerrainOverviewGrid } from './terrain-overview.ts';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { terrainDigest, validWorldTerrainTile } from '../../studies/e1-browser/sim/world-terrain.js';
const RAD=Math.PI/180,N=129*129;
const world:TerrainGrid={version:1,id:'world-overview-fixture',width:361,height:181,west_rad:-Math.PI,east_rad:Math.PI,
  south_rad:-Math.PI/2,north_rad:Math.PI/2,physical_m:new Float64Array(361*181).fill(100),geoid_m:new Float64Array(361*181).fill(30)};
function payload(col:number,row:number,h=1000){const bytes=new ArrayBuffer(64+N*4),v=new DataView(bytes);
  new Uint8Array(bytes).set([71,70,67,79,80,51,48,0]);for(const [offset,value]of[[8,2],[12,col],[16,row],[20,129]])v.setUint32(offset,value,true);
  for(let i=0;i<N;i++)v.setFloat32(64+i*4,h,true);return bytes;}
const raw=(col:number,row:number,h=1000)=>decodeCopernicusOverview(payload(col,row,h),col,row);
function regional(h=200):TerrainGrid{return {version:1,id:'e850-n5000',width:129,height:129,west_rad:8.5*RAD,east_rad:8.75*RAD,
  south_rad:50*RAD,north_rad:50.25*RAD,physical_m:new Float64Array(N).fill(h),geoid_m:new Float64Array(N).fill(45),sha256:'a'.repeat(64)} as TerrainGrid;}
const noRegional=async()=>[];
const fetchCells:typeof fetch=async input=>{const match=/copernicus-overview\/(\d+)\/(\d+)\.bin$/.exec(String(input));assert(match,String(input));
  const bytes=payload(+match[1],+match[2]);return new Response(bytes,{headers:{'content-length':String(64+N*4),ETag:`"${await terrainDigest(bytes)}"`,'X-Copernicus-Source':'Copernicus-GLO30-Public-COG-2021'}});};

test('R-WORLD-11 overview decoder enforces v2 identity, exact bytes, reserved header and physical values',async()=>{
  const good=await raw(793,224);assert.equal(good.physical_m[100],1000);assert.match(good.sha256,/^[a-f0-9]{64}$/);
  for(const mutate of[(v:DataView)=>v.setUint32(8,1,true),(v:DataView)=>v.setUint32(12,794,true),(v:DataView)=>v.setUint8(24,1),
    (v:DataView)=>v.setFloat32(64,Infinity,true),(v:DataView)=>v.setFloat32(64,-1000,true),(v:DataView)=>v.setFloat32(64,10000,true)]){
    const bytes=payload(793,224);mutate(new DataView(bytes));await assert.rejects(decodeCopernicusOverview(bytes,793,224));}
  await assert.rejects(decodeCopernicusOverview(payload(793,224).slice(1),793,224));
  for(const [col,row]of[[-1,224],[1440,224],[1,0],[1,719],[1.5,5]])await assert.rejects(raw(col,row));
});
test('R-WORLD-11 overview is a separately branded complete display grid rejected by native validators',async()=>{
  const grid=(await composeTerrainOverview(world,793,224,await raw(793,224),[]))!;
  assert(validTerrainOverview(grid));assert.equal(validateTerrainGrid(grid),false);assert.equal(validWorldTerrainTile(grid),false);
  assert.equal(grid.id,'display-overview-c793-r224');assert.equal(grid.copernicus_nodes,N);
  assert.equal(sampleTerrainOverview([grid],-33.9*RAD,18.4*RAD)?.ellipsoid_m,1030);
  for(const bad of[{...grid,version:1},{...grid,slot:0},{...grid,id:'world30-c793-r224'},{...grid,source:'regional'},
    {...grid,sha256:'wrong'},{...grid,copernicus_sha256:null},{...grid,physical_m:new Float64Array(1)}, {...grid,regional_nodes:1}])assert(!validTerrainOverview(bad));
});
test('R-WORLD-11 valid regional H/N wins, Copernicus fills only absent regional nodes, incomplete cells are omitted',async()=>{
  const source=regional(),cop=await raw(754,560);
  const full=(await composeTerrainOverview(world,754,560,null,[source]))!;assert.equal(full.source,'regional');assert.equal(full.physical_m[0],200);assert.equal(full.geoid_m[0],45);
  const partial={...source,masked:true as const,physical_m:source.physical_m.slice(),geoid_m:source.geoid_m.slice()};partial.physical_m[500]=NaN;partial.geoid_m[500]=NaN;
  const mixed=(await composeTerrainOverview(world,754,560,cop,[partial]))!;assert.equal(mixed.source,'mixed');assert.equal(mixed.regional_nodes,N-1);assert.equal(mixed.physical_m[500],1000);assert.equal(mixed.geoid_m[500],30);
  const missing=await raw(754,560);missing.physical_m[500]=NaN;
  assert.equal(await composeTerrainOverview(world,754,560,missing,[partial]),null,'one uncovered node omits the whole cell');
  assert.equal(await composeTerrainOverview(world,754,560,null,[partial]),null);
  await assert.rejects(composeTerrainOverview(world,754,560,cop,[{...source,id:'invented'}]));
});
test('R-WORLD-11 overview windows wrap dateline, bound latitude and preserve shared composed edges',async()=>{
  assert.deepEqual(overviewCenter(0,Math.PI),[1439,360]);assert.deepEqual(overviewCenter(0,-Math.PI),[0,360]);
  for(const [lat,lon]of[[NaN,0],[90*RAD,0],[0,4]])assert.equal(overviewCenter(lat,lon),null);
  assert.throws(()=>overviewId(0,0));
  const a=(await composeTerrainOverview(world,1439,360,await raw(1439,360),[]))!,b=(await composeTerrainOverview(world,0,360,await raw(0,360),[]))!;
  assert.equal(sampleTerrainOverview([a],.1*RAD,Math.PI)?.ellipsoid_m,sampleTerrainOverview([b],.1*RAD,-Math.PI)?.ellipsoid_m);
});
test('R-WORLD-11 loader is sequential, publishes one batch per quarter cell and reuses/cache-bounds cells',async()=>{
  let active=0,maxActive=0,calls=0;const batches:(readonly TerrainOverviewGrid[])[]=[],statuses:any[]=[];
  const fetcher:typeof fetch=async(...args)=>{active++;calls++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,1));try{return await fetchCells(...args);}finally{active--;}};
  const loader=new TerrainOverview(world,g=>batches.push(g),{fetcher,regional:noRegional,onStatus:s=>statuses.push(s)});
  await loader.update(-33.9*RAD,18.4*RAD);assert.equal(batches.length,1);assert.equal(batches[0].length,9);assert.equal(calls,9);assert.equal(maxActive,1);
  await loader.update(-33.91*RAD,18.41*RAD);assert.equal(batches.length,1);assert.equal(calls,9);
  for(let i=1;i<=10;i++)await loader.update(-33.9*RAD,(18.4+i*.25)*RAD);
  assert(statuses.every(s=>s.cache<=32));assert.equal(batches.length,11);assert(batches.every(b=>b.length<=9));assert.equal(maxActive,1);assert.equal(calls,39);
  loader.dispose();
});
test('R-WORLD-11 obsolete/cancelled work cannot publish, completed cache survives temporary cancellation',async()=>{
  let unblock:()=>void=()=>{};let blocked=true,started:()=>void=()=>{};const pending=new Promise<void>(r=>{started=r;});
  const fetcher:typeof fetch=async(input,init)=>{if(blocked){blocked=false;started();await new Promise<void>(r=>{unblock=r;});}return fetchCells(input,init);};
  const batches:(readonly TerrainOverviewGrid[])[]=[];const loader=new TerrainOverview(world,g=>batches.push(g),{fetcher,regional:noRegional});
  const old=loader.update(-33.9*RAD,18.4*RAD);await pending;const newer=loader.update(-33.9*RAD,20.4*RAD);unblock();await Promise.all([old,newer]);
  assert.equal(batches.length,1);assert(batches[0].every(g=>g.col>=800));loader.cancel(false);assert.equal(batches.length,1);
  await loader.update(-33.9*RAD,20.4*RAD);assert.equal(batches.length,1,'completed quarter-window is not republished after temporary loading');loader.dispose();
});
test('R-WORLD-11 deadline bounds even noncooperative optional work and all-missing cells remain unavailable',async()=>{
  const statuses:any[]=[];const loader=new TerrainOverview(world,g=>{if(g.length)assert.fail('cancelled regional work cannot install')},{budgetMs:10,regional:()=>new Promise(()=>{}),onStatus:s=>statuses.push(s)});
  const started=performance.now();await loader.update(-33.9*RAD,18.4*RAD);assert(performance.now()-started<1000);assert.equal(statuses.at(-1).state,'unavailable');loader.dispose();
  const batches:(readonly TerrainOverviewGrid[])[]=[];const missing=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,fetcher:async input=>{const m=/(\d+)\/(\d+)\.bin$/.exec(String(input))!;const bytes=payload(+m[1],+m[2],NaN);return new Response(bytes,{headers:{ETag:`"${await terrainDigest(bytes)}"`,'X-Copernicus-Source':'Copernicus-GLO30-Public-COG-2021'}});}});
  await missing.update(-33.9*RAD,18.4*RAD);assert.equal(batches.length,1);assert.equal(batches[0].length,0);missing.dispose();
});

test('R-WORLD-11 temporary native-loading cancellation resumes completed cells without refetching them',async()=>{
  let calls=0,secondStarted:()=>void=()=>{},release:()=>void=()=>{};
  const second=new Promise<void>(r=>{secondStarted=r;});const counts=new Map<string,number>();
  const fetcher:typeof fetch=async(input,init)=>{const key=String(input);counts.set(key,(counts.get(key)??0)+1);calls++;
    if(calls===2){secondStarted();await new Promise<void>(r=>{release=r;});}return fetchCells(input,init);};
  const batches:(readonly TerrainOverviewGrid[])[]=[];const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,fetcher});
  const loading=loader.update(-33.9*RAD,18.4*RAD);await second;loader.cancel(false);release();await loading;assert.equal(batches.length,0);
  await loader.update(-33.9*RAD,18.4*RAD);assert.equal(batches.length,1);assert.equal(batches[0].length,9);
  assert.equal(counts.get('/scenery/elevation/copernicus-overview/793/224.bin'),1,'completed center survives transient loading cancellation');loader.dispose();
});
test('R-WORLD-11 batch deadline publishes completed whole cells once and omits the blocked cell',async()=>{
  let calls=0;const statuses:any[]=[],batches:(readonly TerrainOverviewGrid[])[]=[];
  const fetcher:typeof fetch=async(input,init)=>{if(++calls===2)return new Promise(()=>{});return fetchCells(input,init);};
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,fetcher,budgetMs:100,onStatus:s=>statuses.push(s)});
  await loader.update(-33.9*RAD,18.4*RAD);assert.equal(batches.length,1);assert.equal(batches[0].length,1);assert.equal(statuses.at(-1).state,'partial');assert.equal(statuses.at(-1).missing,8);loader.dispose();
});

test('R-WORLD-11 loader skips remote DSM for a complete regional cell and shares its boundary priority',async()=>{
  const requested:string[]=[],batches:(readonly TerrainOverviewGrid[])[]=[];
  const fetcher:typeof fetch=async(...args)=>{requested.push(String(args[0]));return fetchCells(...args);};
  const loader=new TerrainOverview(world,g=>batches.push(g),{fetcher,regional:async()=>[regional()]});
  await loader.update(50.1*RAD,8.6*RAD);assert.equal(batches.length,1);assert.equal(batches[0].length,9);
  assert.equal(requested.length,8);assert(!requested.includes('/scenery/elevation/copernicus-overview/754/560.bin'));
  const center=batches[0].find(g=>g.col===754&&g.row===560)!,west=batches[0].find(g=>g.col===753&&g.row===560)!;
  assert.equal(center.source,'regional');for(let y=0;y<129;y++){assert.equal(center.physical_m[y*129],west.physical_m[y*129+128]);assert.equal(center.geoid_m[y*129],west.geoid_m[y*129+128]);}
  loader.dispose();
});

test('R-WORLD-11 overview fetch requires exact strong body ETag and declared fixed source',async()=>{
  const bytes=payload(793,224),hash=await terrainDigest(bytes),source='Copernicus-GLO30-Public-COG-2021';
  const request=(body:ArrayBuffer,etag:string|null,fixedSource:string|null):typeof fetch=>async()=>new Response(body,{headers:{...(etag===null?{}:{ETag:etag}),...(fixedSource===null?{}:{'X-Copernicus-Source':fixedSource})}});
  assert.equal((await readCopernicusOverview(793,224,request(bytes,`"${hash}"`,source))).sha256,hash);
  for(const tag of[null,hash,`W/"${hash}"`,'"not-a-hash"',`"${'0'.repeat(64)}"`])await assert.rejects(readCopernicusOverview(793,224,request(bytes,tag,source)));
  for(const invalid of[null,'wrong-source'])await assert.rejects(readCopernicusOverview(793,224,request(bytes,`"${hash}"`,invalid)));
  const tampered=bytes.slice(0);new DataView(tampered).setFloat32(64,1001,true);await assert.rejects(readCopernicusOverview(793,224,request(tampered,`"${hash}"`,source)));
});
test('R-WORLD-11 flat/Review/reset clear partial caches and suppress delayed obsolete completion',async()=>{
  let second:()=>void=()=>{},release:()=>void=()=>{},calls=0;const pending=new Promise<void>(r=>{second=r;});
  const batches:(readonly TerrainOverviewGrid[])[]=[];
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,fetcher:async(input,init)=>{if(++calls===2){second();await new Promise<void>(r=>{release=r;});}return fetchCells(input,init);}});
  const old=loader.update(-33.9*RAD,18.4*RAD);await pending;loader.cancel(false);assert(loader.hasSources,'cached partial cells exist even with no published display');
  loader.cancel(true);assert.equal(loader.hasSources,false,'flat/Review/reset clears a partial unpublished cache');release();await old;
  assert.equal(batches.length,1);assert.equal(batches[0].length,0);assert.equal(loader.hasSources,false);loader.dispose();
});

const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function eventually(check:()=>boolean,label:string,timeout=5000){
  const start=performance.now();while(!check()){assert(performance.now()-start<timeout,label);await new Promise(r=>setTimeout(r,2));}await turn();
}
function latch(){let release:()=>void=()=>{};const promise=new Promise<void>(resolve=>{release=resolve;});return{promise,release};}

test('R-WORLD-11 visible demand is bounded to32 scheduled owners, deduplicates inflight work and resolves outside preload',async()=>{
  const first=latch(),release=latch(),calls:string[]=[],resolved:any[]=[],batches:any[]=[];
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,onResolved:r=>resolved.push(r),fetcher:async(input,init)=>{
    calls.push(String(input));if(calls.length===1){first.release();await release.promise;}return fetchCells(input,init);
  }});
  const cells=Array.from({length:40},(_,i)=>({col:900+i,row:250}));
  try{
    loader.requestCells(cells);await first.promise;
    loader.requestCells([...cells,...Array.from({length:40},(_,i)=>({col:1000+i,row:250}))]);
    release.release();await eventually(()=>loader.sourceOutcomes.length===32,'32 admitted demands complete');
    assert.equal(calls.length,32,'inflight owner is part of the bounded scheduled set');assert.equal(new Set(calls).size,32);
    assert.equal(resolved.length,32);assert(resolved.every(r=>r.grid&&r.col>=900&&r.col<932));
    assert.equal(batches.length,0,'visible-owner completion does not fabricate a current nine-cell preload batch');
    assert(loader.sourceOutcomes.every(o=>!o.missing&&o.sha256?.length===64));
  }finally{release.release();loader.dispose();}
});

test('R-WORLD-11 preload and visible demand share one fetch owner and reuse the completed preload cell',async()=>{
  const first=latch(),release=latch(),calls:string[]=[],resolved:any[]=[],batches:any[]=[];let active=0,maxActive=0;
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,onResolved:r=>resolved.push(r),fetcher:async(input,init)=>{
    active++;maxActive=Math.max(active,maxActive);calls.push(String(input));
    try{if(calls.length===1){first.release();await release.promise;}return await fetchCells(input,init);}finally{active--;}
  }});
  try{
    const preload=loader.update(-33.9*RAD,18.4*RAD);await first.promise;
    loader.requestCells([{col:900,row:250},{col:793,row:224}]);release.release();await preload;
    await eventually(()=>loader.sourceOutcomes.length===10,'one visible owner completes after nine preload owners');
    assert.equal(maxActive,1);assert.equal(calls.length,10);assert.equal(new Set(calls).size,10);
    assert.equal(batches.length,1);assert.equal(batches[0].length,9);
    assert(resolved.some(r=>r.col===900&&r.row===250&&r.grid));
    assert.equal(calls.filter(url=>url.endsWith('/793/224.bin')).length,1);
  }finally{release.release();loader.dispose();}
});

test('R-WORLD-11 a duplicate queued during an inflight failure cannot retry its immutable missing outcome',async()=>{
  const first=latch(),release=latch(),resolved:any[]=[];let calls=0;
  const loader=new TerrainOverview(world,()=>{}, {regional:noRegional,onResolved:r=>resolved.push(r),fetcher:async()=>{
    calls++;if(calls===1){first.release();await release.promise;}return new Response(null,{status:502});
  }});
  try{
    const cell={col:793,row:224};loader.requestCells([cell]);await first.promise;loader.requestCells([cell]);release.release();
    await eventually(()=>loader.sourceOutcomes.length===1,'one missing outcome published');
    loader.requestCells([cell]);await turn();await turn();assert.equal(calls,1);assert.equal(resolved.length,1);
    assert.deepEqual(loader.sourceOutcomes,[{col:793,row:224,missing:true}]);
  }finally{release.release();loader.dispose();}
});

test('R-WORLD-11 a demand missing outcome also suppresses a later preload retry of that owner',async()=>{
  const calls:string[]=[],batches:any[]=[];let missing=true;
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,fetcher:async(input,init)=>{
    calls.push(String(input));return missing?new Response(null,{status:502}):fetchCells(input,init);
  }});
  try{
    loader.requestCells([{col:793,row:224}]);await eventually(()=>loader.sourceOutcomes.length===1,'missing demand settles');missing=false;
    await loader.update(-33.9*RAD,18.4*RAD);
    assert.equal(calls.filter(url=>url.endsWith('/793/224.bin')).length,1);
    assert.equal(batches.length,1);assert.equal(batches[0].length,8);assert(!batches[0].some((g:TerrainOverviewGrid)=>g.col===793&&g.row===224));
    assert(loader.sourceOutcomes.find(o=>o.col===793&&o.row===224)?.missing);
  }finally{loader.dispose();}
});

test('R-WORLD-11 cancelled demand suppresses late noncooperative completion and deadline outcomes cannot be retried',async()=>{
  const started=latch(),release=latch(),fetchFinished=latch(),resolved:any[]=[];
  const loader=new TerrainOverview(world,()=>{}, {regional:noRegional,onResolved:r=>resolved.push(r),fetcher:async(input,init)=>{
    started.release();await release.promise;const response=await fetchCells(input,init);fetchFinished.release();return response;
  }});
  try{
    loader.requestCells([{col:900,row:250}]);await started.promise;loader.cancel(true);release.release();await fetchFinished.promise;await turn();await turn();
    assert.equal(loader.sourceOutcomes.length,0);assert.equal(resolved.length,0);assert.equal(loader.hasSources,false);
  }finally{release.release();loader.dispose();}
  const deadlineResults:any[]=[];let regionalCalls=0,remoteCalls=0;
  const deadline=new TerrainOverview(world,()=>{}, {budgetMs:10,regional:()=>{regionalCalls++;return new Promise(()=>{});},
    fetcher:async()=>{remoteCalls++;throw Error('deadline must not start remote work');},onResolved:r=>deadlineResults.push(r)});
  try{
    const start=performance.now();deadline.requestCells([{col:901,row:250}]);await eventually(()=>deadline.sourceOutcomes.length===1,'deadline discloses one missing source',1000);
    assert(performance.now()-start<1000);assert.equal(remoteCalls,0);assert.equal(deadlineResults.length,1);assert.equal(deadlineResults[0].grid,null);
    deadline.requestCells([{col:901,row:250}]);await turn();assert.equal(regionalCalls,1);
  }finally{deadline.dispose();}
});

test('R-WORLD-11 the512 outcome budget blocks unseen demand and preload fetches until an explicit epoch reset',async()=>{
  const calls:string[]=[],statuses:any[]=[],resolved:any[]=[],batches:any[]=[];
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,onResolved:r=>resolved.push(r),onStatus:s=>statuses.push(s),fetcher:async input=>{
    calls.push(String(input));return new Response(null,{status:502});
  }});
  try{
    for(let batch=0;batch<16;batch++){
      loader.requestCells(Array.from({length:32},(_,i)=>({col:batch*32+i,row:250})));
      await eventually(()=>loader.sourceOutcomes.length===(batch+1)*32,'metadata batch '+batch+' settles');
    }
    assert.equal(calls.length,512);assert.equal(resolved.length,512);assert.equal(loader.sourceOutcomes.length,512);
    loader.requestCells([{col:900,row:250}]);await eventually(()=>loader.budgetExhausted,'unknown demand exposes exhausted epoch');
    await loader.update(-33.9*RAD,18.4*RAD);
    assert.equal(calls.length,512,'the budget is an admission boundary, not just a truncated ledger');
    assert.equal(resolved.length,512);assert.equal(loader.sourceOutcomes.length,512);assert.equal(statuses.at(-1).state,'pending');
    assert(batches.every(g=>g.length===0),'unadmitted positive owners cannot enter a preload batch');
    loader.cancel(true);assert.equal(loader.budgetExhausted,false);assert.equal(loader.sourceOutcomes.length,0);
    loader.requestCells([{col:900,row:250}]);await eventually(()=>loader.sourceOutcomes.length===1,'new explicit epoch admits the source again');assert.equal(calls.length,513);
  }finally{loader.dispose();}
});

for (const path of ['preload','demand'] as const) test(`R-WORLD-11 ${path} rejects a changed positive H/N hash after payload eviction and closes optional admission`,async()=>{
  let h=1000;const batches:(readonly TerrainOverviewGrid[])[]=[],resolved:any[]=[],statuses:any[]=[],calls:string[]=[];
  const loader=new TerrainOverview(world,g=>batches.push(g),{regional:noRegional,onResolved:r=>resolved.push(r),onStatus:s=>statuses.push(s),fetcher:async input=>{
    calls.push(String(input));const match=/(\d+)\/(\d+)\.bin$/.exec(String(input))!,bytes=payload(+match[1],+match[2],h);
    return new Response(bytes,{headers:{ETag:`"${await terrainDigest(bytes)}"`,'X-Copernicus-Source':'Copernicus-GLO30-Public-COG-2021'}});
  }});
  try{
    await loader.update(-33.9*RAD,18.4*RAD);
    const original=loader.sourceOutcomes.find(o=>o.col===793&&o.row===224)!;assert(!original.missing);
    // More than32 distinct payloads ensure the first owner has left the LRU;
    // its immutable identity remains in the separately bounded metadata ledger.
    for(let i=1;i<=12;i++)await loader.update(-33.9*RAD,(18.4+i)*RAD);
    const outcomes=loader.sourceOutcomes,batchCount=batches.length,resolvedCount=resolved.length,callCount=calls.length;h=1500;
    if(path==='preload')await loader.update(-33.9*RAD,18.4*RAD);
    else{loader.requestCells([{col:793,row:224}]);await eventually(()=>loader.stopped!==null,'evicted changed demand closes admission');}
    assert.match(loader.stopped!,/changed or unavailable retained source/);assert.equal(calls.length,callCount+1,'the evicted owner was actually fetched with changed bytes');
    assert.equal(batches.length,batchCount,'changed geometry cannot enter a new preload batch');assert.equal(resolved.length,resolvedCount,'changed geometry cannot reach onResolved');
    assert.deepEqual(loader.sourceOutcomes,outcomes);assert.equal(loader.sourceOutcomes.find(o=>o.col===793&&o.row===224)?.sha256,original.sha256);
    assert.equal(statuses.at(-1).state,'pending');assert(loader.hasSources,'completed previous terrain remains available');
    loader.cancel(false);await loader.update(-33.9*RAD,18.4*RAD);loader.requestCells([{col:1000,row:250}]);await turn();
    assert.equal(calls.length,callCount+1,'temporary loading pause does not reopen the stopped epoch');assert.equal(batches.length,batchCount);
    loader.cancel(true);assert.equal(loader.stopped,null);await loader.update(-33.9*RAD,18.4*RAD);
    const replacement=loader.sourceOutcomes.find(o=>o.col===793&&o.row===224)!;assert.notEqual(replacement.sha256,original.sha256,'only explicit reset permits a new source epoch');
  }finally{loader.dispose();}
});

test('R-WORLD-11 stop retains completed terrain, cancels late demand and blocks same-list reentrant admission until reset',async()=>{
  const resolved:any[]=[],calls:string[]=[];let closeOnCached=false;
  const loader=new TerrainOverview(world,()=>{}, {regional:noRegional,onResolved:r=>{resolved.push(r);if(closeOnCached)loader.stop('provider history capacity');},fetcher:async(input,init)=>{calls.push(String(input));return fetchCells(input,init);}});
  try{
    await loader.update(-33.9*RAD,18.4*RAD);const before=loader.sourceOutcomes;
    closeOnCached=true;loader.requestCells([{col:793,row:224},{col:1000,row:250}]);await turn();
    assert.equal(loader.stopped,'provider history capacity');assert.equal(calls.length,9,'a callback stop closes remaining owners in the same synchronous request list');assert.deepEqual(loader.sourceOutcomes,before);
    assert(loader.hasSources);loader.stop('new reason');assert.equal(loader.stopped,'provider history capacity');
    loader.cancel(false);await loader.update(-33.9*RAD,20.4*RAD);assert.equal(calls.length,9);
    loader.cancel(true);closeOnCached=false;assert.equal(loader.stopped,null);await loader.update(-33.9*RAD,20.4*RAD);assert.equal(calls.length,18);
  }finally{loader.dispose();}
  const first=latch(),release=latch(),finished=latch(),late:any[]=[];
  const blocked=new TerrainOverview(world,()=>{}, {regional:noRegional,onResolved:r=>late.push(r),fetcher:async(input,init)=>{first.release();await release.promise;const response=await fetchCells(input,init);finished.release();return response;}});
  try{
    blocked.requestCells([{col:900,row:250}]);await first.promise;blocked.stop('provider geometry conflict');release.release();await finished.promise;await turn();await turn();
    assert.equal(late.length,0);assert.equal(blocked.sourceOutcomes.length,0);assert.equal(blocked.stopped,'provider geometry conflict');assert(blocked.hasSources);
  }finally{release.release();blocked.dispose();}
});
