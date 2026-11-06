import { practicePapiWhites } from './airport-geometry.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { genericPapiAngle_deg, airportSurfaceMarkings } from './airport-surface-markings.ts';
import { airportSurfaceGeometry } from './airport-surface-geometry.ts';
import type { AirportSurfaceFeature } from './airport-region.ts';
const runway: AirportSurfaceFeature = {id:'osm/way/1',kind:'runway',version:1,timestamp:'2026-11-01T00:00:00Z',surface:'asphalt',ref:'09/27',width_m:30,
 geometry:{type:'LineString',coordinates:[[0,0],[.02,0]]}};
test('paved runways receive white-line geometry and generic PAPI at both ends when large enough',()=>{
 const result=airportSurfaceMarkings(runway,()=>100,1000);
 assert(result.polygons.length>30);assert.equal(result.papi.length,8);
 assert(result.polygons.every(p=>p.every(v=>v.ellipsoid_m===100.18)));
 for(const surface of ['grass','unpaved','dirt','unknown']) assert.equal(airportSurfaceMarkings({...runway,surface},()=>100,1000).polygons.length,0);
 assert.equal(airportSurfaceMarkings({...runway,geometry:{type:'LineString',coordinates:[[0,0],[.005,0]]}},()=>100,1000).papi.length,0);
});
test('runway tarmac lies above taxiway and apron without changing terrain heights',()=>{
 const h=(kind:AirportSurfaceFeature['kind'])=>airportSurfaceGeometry({...runway,kind, ...(kind==='apron'?{geometry:{type:'Polygon' as const,coordinates:[[[0,0],[.001,0],[.001,.001],[0,.001],[0,0]]]}}:{})},()=>100,1000).polygons[0][0].ellipsoid_m;
 assert(h('runway')>h('taxiway'));assert(h('taxiway')>h('apron'));
 assert(airportSurfaceMarkings(runway,()=>null,100).polygons.length===0);
 assert(airportSurfaceMarkings(runway,()=>100,3).polygons.length<=3);
});

test('generic PAPI elevation uses the light unit300m beyond threshold, not distance to threshold',()=>{
 const R=6371000,head={threshold:[0,0] as const,location:[0,300/R*180/Math.PI] as const,heading_rad:0};
 const aircraft={lat_rad:-1000/R,lon_rad:0,ground_height_ellipsoid_m:69.8};
 const angle=genericPapiAngle_deg(head,aircraft,0);
 assert(angle!==null);assert(Math.abs(angle-3.0382327597)<1e-9);assert.equal(practicePapiWhites(angle),2);
 assert.equal(genericPapiAngle_deg(head,{...aircraft,lat_rad:100/R},0),null);
 assert.equal(genericPapiAngle_deg(head,{...aircraft,lon_rad:1000/R},0),null);
 assert.equal(genericPapiAngle_deg(head,aircraft,null),null);
});
