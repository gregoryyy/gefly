import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { navigationSignal, validNavRecord } from '../../studies/e1-browser/sim/navigation.js';
import { eddfApproachPractice } from './navigation-approach.ts';
import { setNavigationCatalogue, navigationIndication, bearingDistanceIndication } from './radio-nav.ts';

const bytes = readFileSync(new URL('../public/navdata/rhein-main-v1.json', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../public/navdata/manifest.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(bytes.toString('utf8'));
test('regional source inventory retains explicit components, original GS heights and historical edition', () => {
  assert.equal(bytes.length, manifest.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  assert.equal(pkg.id, manifest.id); assert.equal(pkg.edition, '2013.10'); assert.equal(pkg.historical, true);
  assert.equal(pkg.records.length, 86); assert(pkg.records.every(validNavRecord));
  const eddf = pkg.records.filter(r => r.airport === 'EDDF');
  assert.equal(eddf.length, 6); assert(eddf.every(r => r.gs?.angle_deg === 3));
  assert.deepEqual(eddf.filter(r => r.dme).map(r => r.id).sort(), ['IFCW','IFNE','IFNW']);
  const ifcw = eddf.find(r => r.id === 'IFCW');
  assert.equal(ifcw.frequency_khz,111550); assert.equal(ifcw.gs.elevation_m,364*.3048); assert.equal(ifcw.dme.bias_nm,1);
  assert.equal(eddf.find(r=>r.id==='IFCE').gs.elevation_m,355*.3048);
  const ffm = pkg.records.find(r=>r.id==='FFM');
  assert.equal(ffm.frequency_khz,114200); assert.equal(ffm.lat_deg,50.053742); assert(ffm.dme);
  for(const id of ['GTQ','STR']) {
    const rows=pkg.records.filter(r=>r.id===id);
    assert.equal(rows.length,1); assert.equal(rows[0].dme,null);
    assert(pkg.component_issues.some(i=>i.station_uid===rows[0].uid&&i.source_line_ids.length===2));
  }
});
test('source-derived EDDF fixture receives actual LOC/GS, independent FFM VOR and DME bias', () => {
  const p=eddfApproachPractice(pkg);
  assert(p.ic.lon_rad*180/Math.PI>8.45&&p.ic.lon_rad*180/Math.PI<8.9);
  assert(p.ic.lat_rad*180/Math.PI>49.85&&p.ic.lat_rad*180/Math.PI<50.35);
  const signal=navigationSignal(p.navigation,p.ic,pkg.records,pkg.source_label);
  assert(signal.valid); assert(signal.gs_valid); assert.equal(signal.station_id,'IFCW');
  assert(signal.cdi_norm>.2 && signal.cdi_norm<.25, 'separate LOC and GS antennas produce an intercept offset'); assert(signal.gs_norm>.42&&signal.gs_norm<.44);
  assert(signal.dme_valid); assert(Math.abs(signal.dme_nm-(signal.dme_slant_nm-1))<1e-10);
  const ffm=navigationSignal(p.navigation,p.ic,pkg.records,pkg.source_label,2);
  assert(ffm.valid); assert.equal(ffm.station_id,'FFM'); assert.equal(ffm.course_reference,'MAG');
  setNavigationCatalogue(pkg);
  const displayed=navigationIndication(p.navigation,p.ic);
  assert.equal(displayed.station_uid,signal.station_uid); assert.equal(displayed.gs_norm,signal.gs_norm);
  const bearing=bearingDistanceIndication(p.navigation,p.ic);
  assert.equal(bearing.valid,false); assert.equal(bearing.bearing_true_deg,null); assert(bearing.dme_valid);
  assert.throws(()=>eddfApproachPractice(null),/unavailable/);
});
