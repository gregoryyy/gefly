import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approachGuideDisclosure, approachPoints, approachThreshold, GUIDE_LENGTH_M, validApproachGuide, type ApproachGuide } from './approach-guide.ts';
const guide: ApproachGuide = { airportId:'EDFE', airportName:'Egelsbach', runwayIdent:'08', lat_deg:50, lon_deg:8,
  heading_deg_true:90, displaced_threshold_ft:1000, source:'OurAirports' };
test('R-NAV-3 visual guide anchors a known displaced threshold and rises three degrees outward', () => {
  assert(validApproachGuide(guide)); const threshold=approachThreshold(guide); assert(threshold.lon_deg>guide.lon_deg);
  const points=approachPoints(guide); assert.equal(points.length,31); assert.equal(points[0].distance_m,0);
  assert(Math.abs(points[0].lon_deg-threshold.lon_deg)<1e-10); assert(points.at(-1)!.lon_deg<threshold.lon_deg);
  assert.equal(points.at(-1)!.distance_m,GUIDE_LENGTH_M); assert(Math.abs(points.at(-1)!.height_above_threshold_m - GUIDE_LENGTH_M*Math.tan(3*Math.PI/180))<1e-9);
});
test('R-NAV-3 unknown displacement uses physical end without claiming a known threshold',()=>{
  const missing={...guide,displaced_threshold_ft:null}; assert(validApproachGuide(missing));
  assert(Math.abs(approachThreshold(missing).lon_deg-guide.lon_deg)<1e-10);
});
test('R-NAV-3 validates untrusted selection and handles antimeridian',()=>{
  for(const invalid of [{...guide,lat_deg:NaN},{...guide,heading_deg_true:361},{...guide,source:''},{...guide,displaced_threshold_ft:-1},{...guide,displaced_threshold_ft:10001}]) assert(!validApproachGuide(invalid));
  assert(validApproachGuide({...guide,heading_deg_true:360}));
  const points=approachPoints({...guide,lat_deg:0,lon_deg:-179.99,heading_deg_true:90,displaced_threshold_ft:0});
  assert(points.every(p=>p.lon_deg>=-180&&p.lon_deg<180)); assert(points.at(-1)!.lon_deg>179);
});
test('R-NAV-3 disclosure keeps source, terrain-height and unknown-threshold limits for the popup and chip tooltip',()=>{
  const known=approachGuideDisclosure(guide), unknown=approachGuideDisclosure({...guide,displaced_threshold_ft:null});
  assert.match(known,/Egelsbach 08/); assert.match(known,/terrain-height approximation/); assert.match(known,/not a published or obstacle-cleared approach/);
  assert.match(known,/OurAirports$/); assert.doesNotMatch(known,/threshold position unknown/);
  assert.match(unknown,/runway end used; threshold position unknown/);
});
