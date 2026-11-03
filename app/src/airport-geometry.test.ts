import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { EDFE_RUNWAYS, EDFE_REFERENCE, airportLocal, runwayPoint, practicePapiWhites, practiceRunwayLights, sampleAirportPoints } from './airport-geometry.ts';

test('EDFE documented midpoint, true heading and displaced 26 threshold are explicit', () => {
  assert.ok(Math.abs(EDFE_REFERENCE.lat_rad*180/Math.PI-49.9608333333)<1e-8);
  assert.ok(Math.abs(EDFE_REFERENCE.lon_rad*180/Math.PI-8.6415)<1e-8);
  const west=airportLocal(EDFE_RUNWAYS[0]),east=airportLocal(EDFE_RUNWAYS[1]);
  assert.ok(west.east_m<0&&east.east_m>0);
  assert.ok(Math.abs(Math.hypot(east.east_m-west.east_m,east.north_m-west.north_m)-1166)<1e-6);
  assert.equal(EDFE_RUNWAYS[1].displaced_threshold_m,234);
  assert.equal(EDFE_RUNWAYS[0].approximate,true);
  const right=airportLocal(runwayPoint(0,12.5));
  assert.ok(right.north_m<0,'right of easterly runway is south');
});
test('generic practice PAPI reproduces FAA figure indications and rejects non-finite input', () => {
  assert.deepEqual([2.4,2.8,3,3.2,3.6].map(practicePapiWhites),[0,1,2,3,4]);
  assert.equal(practicePapiWhites(NaN),0);
});
test('bounded OSM vector snapshot preserves source geometry without redistributing user metadata', () => {
  const bytes=readFileSync(new URL('../public/airports/scenery/edfe-vector.geojson',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'f3b56bede6bea8b811fc5e837009fa581f2a472b8816d9f17215c4e75b7685e2');
  const data=JSON.parse(bytes.toString());
  const kinds=new Set(data.features.map((f:any)=>f.properties.kind));
  for(const kind of ['runway','taxiway','apron','road','water','forest','windsock'])assert.ok(kinds.has(kind));
  for(const f of data.features) {
    assert.equal(f.properties.user,undefined);assert.equal(f.properties.uid,undefined);
    const walk=(cs:any)=>{if(typeof cs[0]==='number'){assert.ok(cs[0]>=8.625&&cs[0]<=8.664);assert.ok(cs[1]>=49.952&&cs[1]<=49.968);}else cs.forEach(walk);};walk(f.geometry.coordinates);
  }
});

test('synthetic runway lights distinguish displaced threshold and physical end',()=>{
  const lights=practiceRunwayLights();
  assert.ok(lights.some(l=>l.kind==='threshold'&&l.along_m===466&&l.facing===1));
  assert.ok(lights.some(l=>l.kind==='end'&&l.along_m===700&&l.facing===-1));
  assert.ok(lights.filter(l=>l.kind==='edge').length>=48);
});
test('practice light construction fails closed for partial or non-finite terrain',()=>{
  const points=[{lat_rad:1,lon_rad:2},{lat_rad:3,lon_rad:4}];
  assert.equal(sampleAirportPoints(points,lat=>lat===1?120:null),null);
  assert.equal(sampleAirportPoints(points,()=>NaN),null);
  assert.deepEqual(sampleAirportPoints(points,()=>120)?.map(p=>p.ellipsoid_m),[120,120]);
});
