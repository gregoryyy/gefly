import assert from 'node:assert/strict';
import {test} from 'node:test';
import {distanceMeters,tilesWithinRadius,planSceneryPrefetch} from './scenery-coverage.ts';
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
  for(const url of urls.filter(u=>u.endsWith('.f32'))){const match=/e(\d+)-n(\d+)\.f32$/.exec(url)!;assert(+match[1]>=825&&+match[1]<1000&&+match[2]>=4925&&+match[2]<5075);}
 }
 assert.deepEqual(planSceneryPrefetch(0,0,false),[]);assert.deepEqual(planSceneryPrefetch(NaN,0,true),[]);
 assert(!planSceneryPrefetch(52*DEG,13*DEG,false).some(u=>u.startsWith('/scenery/imagery/')),'outside aerial coverage is omitted');
 assert(planSceneryPrefetch(52*DEG,13*DEG,true).some(u=>u.startsWith('/scenery/vector/')),'vector declared coverage extends north');
});
