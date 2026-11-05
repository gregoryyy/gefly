import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerrainPrediction } from './terrain-prediction.js';
const R = 6371000, rad = Math.PI / 180;
const position = (t_s, north_m = 0, east_m = 0) => ({ t_s, lat_rad: north_m / R, lon_rad: east_m / R });
test('R-WORLD-9 prediction uses actual ground motion and confirmed pacing with an8km cap', () => {
 const p = createTerrainPrediction(); assert.equal(p.update(position(0)), null);
 const a = p.update(position(1,0,50)); assert(Math.abs(a.east_mps-50)<1e-6); assert(Math.abs(a.north_mps)<1e-6);
 assert(Math.abs(a.distance_m-1000)<1e-6); assert(Math.abs(a.lon_rad-1050/R)<1e-10);
 const fast=p.update(position(1,0,50),10); assert.equal(fast.distance_m,8000); assert(Math.abs(fast.lon_rad-8050/R)<1e-10);
});
test('R-WORLD-9 stationary, invalid, teleport, clock reset and paused duplicates never invent motion', () => {
 const p=createTerrainPrediction(); const s=position(0); assert.equal(p.update(s),null); assert.equal(p.update(position(1)),null);
 assert.equal(p.update(position(2,0,10000)),null); assert.equal(p.update(position(3,0,10050)).distance_m>0,true);
 assert.equal(p.update(position(2,0,10050)),null); assert.equal(p.update(position(40,0,10060)),null);
 assert.equal(p.update({...position(41),lat_rad:NaN}),null); assert.equal(p.update(position(42)),null);
 assert.equal(p.update(position(43,0,50),100),null); assert.equal(p.update(position(44)),null);
 const a=p.update(position(45,0,50)); assert.deepEqual(p.update(position(45,0,50)),a);
 p.reset(); assert.equal(p.update(position(46,0,100)),null);
});
test('R-WORLD-9 dateline crossing predicts east rather than a global teleport; polar limits stay explicit', () => {
 const p=createTerrainPrediction(); p.update({t_s:0,lat_rad:0,lon_rad:Math.PI-20/R});
 const a=p.update({t_s:1,lat_rad:0,lon_rad:-Math.PI+30/R});
 assert(Math.abs(a.east_mps-50)<1e-6); assert(a.lon_rad<0); assert(Math.abs(a.lon_rad-(-Math.PI+1030/R))<1e-9);
 p.reset(); p.update({t_s:0,lat_rad:89.499*rad-50/R,lon_rad:0});
 assert.equal(p.update({t_s:1,lat_rad:89.499*rad,lon_rad:0}),null);
});
