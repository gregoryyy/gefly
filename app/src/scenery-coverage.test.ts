import assert from 'node:assert/strict';
import {test} from 'node:test';
import {distanceMeters,tilesWithinRadius,planSceneryPrefetch,planStartupSceneryPrefetch} from './scenery-coverage.ts';
const DEG=Math.PI/180;
test('spherical distance wraps date line and rejects unavailable positions',()=>{
 assert(Math.abs(distanceMeters(0,179.9*DEG,0,-179.9*DEG)-22238.9853)<.1);
 assert.equal(distanceMeters(0,0,0,0),0);assert.equal(distanceMeters(NaN,0,0,0),Infinity);
});
test('radius includes intersecting edge/corner tiles whose centers lie outside the circle',()=>{
 const tiles=tilesWithinRadius(0,0,2,1,30);assert.deepEqual(new Set(tiles.map(t=>t.key)),new Set(['2/1/1','2/2/1','2/1/2','2/2/2']));
 const edge=tilesWithinRadius(0.001*DEG,-.001*DEG,12,200,30);
 assert(edge.some(t=>t.x===2048&&t.y===2048),'diagonal rectangle intersection is retained');
 assert.equal(new Set(edge.map(t=>t.key)).size,edge.length);
});
test('untruncated geographic radius covers sampled great-circle perimeter points',()=>{
 const lat=49.96*DEG,lon=8.643*DEG,radius=10000,tiles=new Set(tilesWithinRadius(lat,lon,12,radius,512).map(t=>t.key));
 const d=radius/6371000,n=4096;
 for(let bearing=0;bearing<360;bearing+=15){
  const angle=bearing*DEG,pointLat=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(angle));
  const pointLon=lon+Math.atan2(Math.sin(angle)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(pointLat));
  const x=Math.floor((pointLon+Math.PI)/(2*Math.PI)*n),y=Math.floor((1-Math.asinh(Math.tan(pointLat))/Math.PI)/2*n);
  assert(tiles.has(`12/${x}/${y}`),`radius perimeter bearing${bearing}deg has no missing tile`);
 }
});
test('wrapped date-line tiles, pole clamp and huge radius stay bounded and deterministic',()=>{
 const date=tilesWithinRadius(0,Math.PI,8,1000,20);assert(date.some(t=>t.x===0));assert(date.some(t=>t.x===255));
 for(const lat of [-90,90]){const tiles=tilesWithinRadius(lat*DEG,1,10,1000,20);assert(tiles.length);assert(tiles.every(t=>t.y>=0&&t.y<1024));}
 const limited=tilesWithinRadius(.87,.15,20,10000000,7);assert.equal(limited.length,7);assert.deepEqual(limited,tilesWithinRadius(.87,.15,20,10000000,7));
 for(const args of [[NaN,0,10,1000,4],[0,4,10,1000,4],[0,0,23,1000,4],[0,0,10,-1,4],[0,0,10,1000,0]])assert.deepEqual(tilesWithinRadius(...args as [number,number,number,number,number]),[]);
});
test('prefetch uses declared source coverage, nearby detail first and bounded correct terrain assets',()=>{
 const lat=49.96*DEG,lon=8.643*DEG;
 for(const vector of [false,true]){
  const urls=planSceneryPrefetch(lat,lon,vector);assert(urls.length>10&&urls.length<=200);assert.equal(new Set(urls).size,urls.length);
  assert(urls[0].startsWith(vector?'/scenery/vector/14/':'/scenery/imagery/14/'));
  assert(urls.some(u=>u.startsWith('/scenery/map/10/')));assert(urls.some(u=>u.startsWith('/terrain/region/e')));
  assert(urls.filter(u=>u.startsWith('/scenery/map/')).length<=48);assert(urls.filter(u=>u.includes('/11/')).length<=64);assert(urls.filter(u=>u.includes('/14/')).length<=64);assert(urls.filter(u=>u.endsWith('.f32')).length<=24);
  assert(urls.every(u=>!u.startsWith(vector?'/scenery/imagery/':'/scenery/vector/')));
  for(const url of urls.filter(u=>u.endsWith('.f32'))){const match=/e(\d+)-n(\d+)\.f32$/.exec(url)!;assert(+match[1]>=600&&+match[1]<1400&&+match[2]>=4700&&+match[2]<5175);}
 }
 for(const [lat,lon] of [[48.14,11.58],[48.78,9.18],[49.24,7],[50.36,7.6],[51.3,9.4]]) {
  const urls=planSceneryPrefetch(lat*DEG,lon*DEG,false);
  assert(urls.some(url=>url.startsWith('/scenery/imagery/')),'all five states can warm photography');
  assert(urls.some(url=>url.startsWith('/terrain/region/')),'all five states can warm physical terrain');
  assert(urls.length<=200);
 }
 assert(planSceneryPrefetch(0,0,false).every(url=>url.startsWith('/scenery/osm/')));assert.deepEqual(planSceneryPrefetch(NaN,0,true),[]);
 assert(!planSceneryPrefetch(52.5*DEG,13*DEG,false).some(u=>u.startsWith('/scenery/imagery/')),'outside aerial coverage is omitted');
 assert(planSceneryPrefetch(52.5*DEG,13*DEG,true).some(u=>u.startsWith('/scenery/vector/')),'vector declared coverage extends north');
});

test('startup prefetch warms bounded nearest tiles for both map modes without photos or remote URLs',()=>{
 const lat=49.96*DEG,lon=8.643*DEG,urls=planStartupSceneryPrefetch(lat,lon);
 assert.equal(urls.length,16);assert.equal(new Set(urls).size,16);assert.deepEqual(urls,planStartupSceneryPrefetch(lat,lon));
 for(const [prefix,z,budget,suffix] of [['map',15,8,'png'],['vector',14,4,'pbf'],['vector',11,4,'pbf']] as const){
  const group=urls.filter(url=>url.startsWith(`/scenery/${prefix}/${z}/`));assert.equal(group.length,budget);
  const center=tilesWithinRadius(lat,lon,z,0,1)[0].key;
  assert.equal(group[0],`/scenery/${prefix}/${center}.${suffix}`,'containing tile comes first in each layer');
 }
 assert(urls.slice(0,8).every(url=>url.startsWith('/scenery/map/15/')));
 assert(urls.every(url=>/^\/scenery\/(?:map\/15\/\d+\/\d+\.png|vector\/(?:11|14)\/\d+\/\d+\.pbf)$/.test(url)));
});
test('startup prefetch clips regional providers while using bounded global OSM elsewhere',()=>{
 for(const [lat,lon] of [[NaN,0],[0,Infinity],[91*DEG,0],[0,181*DEG]])assert.deepEqual(planStartupSceneryPrefetch(lat,lon),[]);
 const north=planStartupSceneryPrefetch(52*DEG,13*DEG);assert(north.length>0&&north.length<=16);assert(north.every(url=>/^\/scenery\/(vector|osm)\//.test(url)));
 for(const [lat,lon] of [[47,6],[51.75,14],[55.1,15.1],[47.2,5.8]]){
  const urls=planStartupSceneryPrefetch(lat*DEG,lon*DEG);assert(urls.length<=16);
  for(const url of urls){
   const match=/\/(map|vector|osm)\/(\d+)\/(\d+)\/(\d+)\./.exec(url)!;
   const [,kind,z,x,y]=match,n=2**Number(z),west=Number(x)/n*360-180,east=(Number(x)+1)/n*360-180;
   const south=Math.atan(Math.sinh(Math.PI*(1-2*(Number(y)+1)/n)))/DEG,north=Math.atan(Math.sinh(Math.PI*(1-2*Number(y)/n)))/DEG;
   const bounds=kind==='map'?[6,47,14,51.75]:kind==='vector'?[5.8,47.2,15.1,55.1]:[-180,-85.0511287798066,180,85.0511287798066];
   assert(east>=bounds[0]&&west<=bounds[2]&&north>=bounds[1]&&south<=bounds[3],url);
  }
 }
});

test('world fallback warming stays canonical and bounded across continents and date line, without polar map claims',()=>{
 for(const [lat,lon] of [[35.68,139.69],[-33.86,151.21],[40.7,-74],[0,179.99],[0,-179.99],[84.9,0]]) {
  for(const vector of [false,true]) {
   const urls=planSceneryPrefetch(lat*DEG,lon*DEG,vector);
   assert(urls.length>0&&urls.length<=32); assert(urls.every(url=>url.startsWith('/scenery/osm/')));
   assert.equal(new Set(urls).size,urls.length);
   for(const url of urls) {const [,z,x,y]=/\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url)!;assert(+z<=14&&+x<2**+z&&+y<2**+z);}
  }
  const startup=planStartupSceneryPrefetch(lat*DEG,lon*DEG);assert(startup.length>0&&startup.length<=16);
 }
 for(const lat of [-90,90]) {
  assert.deepEqual(planSceneryPrefetch(lat*DEG,0,false),[]);
  assert.deepEqual(planStartupSceneryPrefetch(lat*DEG,0),[]);
 }
});

test('nearby warming survives transient visible work; new locations wait and disable cancels', async () => {
 const descriptors=new Map(['window','navigator','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const messages: {urls:string[]}[]=[];
 const active={postMessage:(message:{urls:string[]})=>messages.push(message)};
 const serviceWorker={register:async()=>({active}),ready:Promise.resolve({active}),addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker}});
 Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:503})});
 let cache: ReturnType<typeof import('./scenery-cache.ts').createSceneryCache> | undefined;
 try {
  const {createSceneryCache}=await import('./scenery-cache.ts');
  cache=createSceneryCache({dataset:{}} as unknown as HTMLElement);
  const lat=49.96*DEG,lon=8.643*DEG;
  cache.update(lat,lon,true,true,false);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(messages.length,0,'initial visible work finishes before warming starts');
  cache.update(lat,lon,true,true,true);assert(messages.at(-1)!.urls.length>0);
  const started=messages.length;
  for(const settled of [false,true,false,true])cache.update(lat,lon,true,true,settled);
  assert.equal(messages.length,started,'nearby busy/idle changes do not discard warming progress');
  cache.update(lat+.02,lon,true,true,false);
  assert.deepEqual(messages.at(-1)!.urls,[],'movement makes the previous warm plan obsolete');
  const cancelled=messages.length;
  cache.update(lat+.02,lon,true,true,false);assert.equal(messages.length,cancelled);
  cache.update(lat+.02,lon,true,true,true);assert(messages.at(-1)!.urls.length>0);
  cache.update(lat+.02,lon,true,false,false);assert.deepEqual(messages.at(-1)!.urls,[],'actual disabling still cancels');
  const disabled=messages.length;cache.update(lat+.02,lon,true,false,false);assert.equal(messages.length,disabled);
 } finally {
  cache?.dispose();
  for(const [key,descriptor] of descriptors)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);
 }
});

test('R-WORLD-9 forward corridor keeps current detail first and shares the existing source budgets', () => {
 const lat=40.7*DEG,lon=-74*DEG;
 const ahead={lat_rad:lat,lon_rad:lon+.08};
 // An invalid/over-budget caller cannot request a distant speculative region.
 assert.deepEqual(planSceneryPrefetch(lat,lon,true,ahead),planSceneryPrefetch(lat,lon,true));
 const endpoint={lat_rad:lat,lon_rad:lon+.075*DEG};
 const local=planSceneryPrefetch(lat,lon,true),urls=planSceneryPrefetch(lat,lon,true,endpoint);
 assert.deepEqual(urls.slice(0,4),local.filter(url=>url.startsWith('/scenery/osm/14/')).slice(0,4));
 const aheadDetail=planSceneryPrefetch(endpoint.lat_rad,endpoint.lon_rad,true).filter(url=>url.startsWith('/scenery/osm/14/'));
 assert(aheadDetail.some(url=>urls.includes(url)&&!local.includes(url)),'new endpoint detail is actually warmed');
 assert(urls.length<=32&&new Set(urls).size===urls.length);
 assert(urls.every(url=>/^\/scenery\/osm\/(11|14)\/\d+\/\d+\.pbf$/.test(url)));
 assert.deepEqual(urls,planSceneryPrefetch(lat,lon,true,endpoint));
 for(const vector of [false,true]){
  const region=planSceneryPrefetch(49.96*DEG,8.643*DEG,vector,{lat_rad:49.96*DEG,lon_rad:8.73*DEG});
  assert(region.length<=200&&new Set(region).size===region.length);
  assert(region.filter(url=>url.startsWith('/scenery/osm/')).length<=32);
  assert(region.filter(url=>url.startsWith('/scenery/map/')).length<=32);
  assert(region.filter(url=>url.startsWith('/terrain/region/')).length<=24);
  assert(region.filter(url=>url.startsWith(vector?'/scenery/vector/14/':'/scenery/imagery/14/')).length<=64);
  assert(region.filter(url=>url.startsWith(vector?'/scenery/vector/11/':'/scenery/imagery/11/')).length<=48);
 }
});

test('R-WORLD-9 forward detail follows actual direction and wraps canonical date-line URLs',()=>{
 const lat=40.7*DEG,lon=-74*DEG;
 const east=planSceneryPrefetch(lat,lon,true,{lat_rad:lat,lon_rad:lon+.075*DEG});
 const west=planSceneryPrefetch(lat,lon,true,{lat_rad:lat,lon_rad:lon-.075*DEG});
 assert.notDeepEqual(east,west);
 const center=tilesWithinRadius(lat,lon,14,0,1)[0].x;
 const xs=(urls:readonly string[])=>urls.filter(url=>url.startsWith('/scenery/osm/14/')).map(url=>Number(url.split('/')[4]));
 assert(Math.max(...xs(east))>Math.max(...xs(west)));
 assert(Math.min(...xs(west))<Math.min(...xs(east)));
 assert(xs(east).includes(center)&&xs(west).includes(center));
 const date=planSceneryPrefetch(0,179.99*DEG,true,{lat_rad:0,lon_rad:-179.95*DEG});
 assert(date.length>0&&date.length<=32);
 assert(date.some(url=>/^\/scenery\/osm\/14\/(0|1)\//.test(url)));
 for(const url of date){const [,z,x,y]=/\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url)!;assert(+x>=0&&+x<2**+z&&+y>=0&&+y<2**+z);}
 const local=planSceneryPrefetch(lat,lon,true);
 assert.deepEqual(planSceneryPrefetch(lat,lon,true,{lat_rad:NaN,lon_rad:lon}),local);
 assert.deepEqual(planSceneryPrefetch(lat,lon,true,{lat_rad:lat,lon_rad:lon}),local);
});

test('R-WORLD-9 display prediction replans on course changes and clears speculative warming on pause/Review/reset',async()=>{
 const descriptors=new Map(['window','navigator','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const messages:{urls:string[]}[]=[];
 const active={postMessage:(message:{urls:string[]})=>messages.push(message)};
 const serviceWorker={register:async()=>({active}),ready:Promise.resolve({active}),addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker}});
 Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:503})});
 let cache:ReturnType<typeof import('./scenery-cache.ts').createSceneryCache>|undefined;
 try{
  const {createSceneryCache}=await import('./scenery-cache.ts');
  cache=createSceneryCache({dataset:{}} as unknown as HTMLElement);
  const lat=40.7*DEG,lon=-74*DEG,step=50/(6371000*Math.cos(lat));
  cache.update(lat,lon,true,true,true,{t_s:0,live:true,simulation_rate:10});
  await new Promise(resolve=>setImmediate(resolve));
  const base=messages.length;
  cache.update(lat,lon+step,true,true,true,{t_s:1,live:true,simulation_rate:10});
  assert.equal(messages.length,base+1,'valid motion starts the ahead plan');
  const east=messages.at(-1)!.urls;
  for(let frame=0;frame<30;frame++)cache.update(lat,lon+step,true,true,true,{t_s:1,live:true,simulation_rate:10});
  assert.equal(messages.length,base+1,'identical render frames preserve background progress');
  cache.update(lat,lon+step*2,true,true,true,{t_s:2,live:true,simulation_rate:10});
  assert.equal(messages.length,base+1,'small endpoint changes stay below500m hysteresis');
  cache.update(lat,lon+step,true,true,true,{t_s:3,live:true,simulation_rate:10});
  assert.equal(messages.length,base+2,'opposite groundtrack replaces obsolete ahead requests');
  assert.notDeepEqual(messages.at(-1)!.urls,east);
  const fast=messages.at(-1)!.urls;
  cache.update(lat,lon+step,true,true,true,{t_s:3,live:true,simulation_rate:1});
  assert.notDeepEqual(messages.at(-1)!.urls,fast,'confirmed rate changes rescale the existing measured groundtrack');
  cache.update(lat,lon+step,true,true,true,{t_s:4,live:true,simulation_rate:1});
  assert.deepEqual(messages.at(-1)!.urls,planSceneryPrefetch(lat,lon+step,true),'stationary authoritative motion clears ahead requests');
  cache.update(lat,lon+step,true,true,true,{t_s:4,live:false,simulation_rate:10});
  assert.deepEqual(messages.at(-1)!.urls,planSceneryPrefetch(lat,lon+step,true),'paused/Review display keeps local warming only');
  const paused=messages.length;
  cache.update(lat,lon+step,true,true,true,{t_s:3,live:false,simulation_rate:10});
  assert.equal(messages.length,paused,'paused frames do not replan');
  cache.update(lat,lon+step,true,true,true,{t_s:4,live:true,simulation_rate:10});
  cache.update(lat,lon+step*2,true,true,true,{t_s:5,live:true,simulation_rate:10});
  cache.update(lat,lon+step*2,true,true,true,{t_s:0,live:true,simulation_rate:10});
  assert.deepEqual(messages.at(-1)!.urls,planSceneryPrefetch(lat,lon+step*2,true),'new-flight time reset clears ahead requests');
  cache.update(NaN,lon,true,true,true,{t_s:1,live:true});
  assert.deepEqual(messages.at(-1)!.urls,[],'invalid location cancels obsolete display work');
 }finally{
  cache?.dispose();
  for(const [key,descriptor] of descriptors)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);
 }
});
