import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navigationSignal, validNavigation, DEFAULT_NAVIGATION } from './navigation.js';
import { DEFAULT_RADIO_NAV, navigationIndication } from '../../../app/src/radio-nav.ts';

test('worker fictional NAV1 signal agrees with displayed LAB CDI over positions/courses', () => {
  for (const [lat,lon] of [[49.9,8.643],[50.02,8.643],[49.94,8.63],[49.98,8.66]]) {
    for (const obs of [0,45,90,180,270,359]) {
      const config = {...DEFAULT_RADIO_NAV,radio_demo_enabled:1,radio_obs_deg:obs};
      const position={lat_rad:lat*Math.PI/180,lon_rad:lon*Math.PI/180,alt_msl_m:1200};
      const expected=navigationIndication(config,position), actual=navigationSignal(config,position);
      assert.equal(actual.valid,expected.valid);
      if (expected.valid) assert(Math.abs(actual.cdi_norm-expected.cdi_norm)<1e-12);
      assert.equal(actual.gs_valid,false);
    }
  }
});
test('invalid/untuned sources cannot become captured guidance; LOC tuning is distinct from signal validity', () => {
  const p={lat_rad:49.9*Math.PI/180,lon_rad:8.643*Math.PI/180};
  assert.equal(navigationSignal(DEFAULT_NAVIGATION,p).valid,false);
  assert.equal(navigationSignal({...DEFAULT_NAVIGATION,radio_nav_active_khz:110300},p).kind,2);
  assert.equal(navigationSignal({...DEFAULT_NAVIGATION,radio_nav_active_khz:110300},p).valid,false);
  assert.equal(navigationSignal({...DEFAULT_NAVIGATION,radio_demo_enabled:1},{lat_rad:Math.PI,lon_rad:0}).valid,false);
  assert.equal(navigationSignal(null,p).valid,false);
  for (const c of [{}, {...DEFAULT_NAVIGATION,radio_obs_deg:360}, {...DEFAULT_NAVIGATION,radio_nav_active_khz:113801}, {...DEFAULT_NAVIGATION,radio_demo_enabled:true}]) assert.equal(validNavigation(c),false);
});

const ant={lat_deg:0,lon_deg:0,elevation_m:0,range_nm:60};
const base={uid:'vor',id:'V',name:'Synthetic VOR',frequency_khz:113800,kind:'VOR',...ant,variation_deg_east:-1,front_course_true_deg:null,airport:null,runway:null,dme:{...ant,bias_nm:1},gs:null,source_line_ids:[1]};
const loc={...base,uid:'loc',id:'I',frequency_khz:110300,kind:'LOC',variation_deg_east:null,front_course_true_deg:0,airport:'TEST',runway:'00',dme:null,gs:{...ant,angle_deg:3,front_course_true_deg:0}};
const cfg=(freq,obs=0)=>({...DEFAULT_NAVIGATION,radio_nav_active_khz:freq,radio_obs_deg:obs});
const point=(lat,lon,alt=1000)=>({lat_rad:lat*Math.PI/180,lon_rad:lon*Math.PI/180,alt_msl_m:alt});
test('station calibration, true course, DME bias and absence are distinct',()=>{
 const p=point(.1,0),out=navigationSignal(cfg(113800,1),p,[base]);assert.equal(out.valid,true);assert(Math.abs(out.radial_true_deg)<1e-10);assert(Math.abs(out.radial_magnetic_deg-1)<1e-10);assert(Math.abs(out.course_true_deg)<1e-10);assert(Math.abs(out.cdi_norm)<1e-10);assert(out.dme_valid);assert(Math.abs(out.dme_slant_nm-out.dme_nm-1)<1e-10);
 const missing=navigationSignal(cfg(113800),p,[{...base,dme:null}]);assert.equal(missing.dme_valid,false);assert.equal(missing.dme_nm,null);
});
test('localizer ignores OBS, reverse sensing, and GS is front-only',()=>{
 const alt=Math.tan(3*Math.PI/180)*.08*Math.PI/180*6371000;
 const front=point(-.08,0,alt), a=navigationSignal(cfg(110300,0),front,[loc]),b=navigationSignal(cfg(110300,270),front,[loc]);assert.equal(a.valid,true);assert.equal(a.gs_valid,true);assert(Math.abs(a.gs_norm)<1e-12);assert.equal(a.cdi_norm,b.cdi_norm);assert.equal(a.course_rad,b.course_rad);
 const high=navigationSignal(cfg(110300),point(-.08,0,alt+60),[loc]);const low=navigationSignal(cfg(110300),point(-.08,0,alt-60),[loc]);assert(high.gs_norm<0);assert(low.gs_norm>0);
 const f=navigationSignal(cfg(110300),point(-.08,-.002,alt),[loc]),back=navigationSignal(cfg(110300),point(.08,-.002,alt),[loc]);assert(f.valid&&back.valid);assert.equal(back.gs_valid,false);assert(Math.sign(f.cdi_norm)===Math.sign(back.cdi_norm));
});
test('co-channel ambiguity and invalid records fail closed; LAB is isolated',()=>{
 const p=point(.1,0);assert.equal(navigationSignal(cfg(113800),p,[base,{...base,uid:'other'}]).valid,false);assert.equal(navigationSignal(cfg(113800),p,[base,{...base,uid:'nearer',lat_deg:.04}]).valid,false);assert.equal(navigationSignal(cfg(113800),p,[{...base,variation_deg_east:null}]).valid,false);assert.equal(navigationSignal(cfg(113800),p,[]).valid,false);
 const lab=navigationSignal({...cfg(113800),radio_demo_enabled:1},point(49.9,8.643),[base]);assert.equal(lab.station_id,'LAB');assert.match(lab.source_label,/Fictional/);
});
test('package loader rejects invalid hash, retries, validates and caches success',async()=>{
 const {loadNavigationPackage}=await import('./navigation.js');const oldFetch=globalThis.fetch;
 const pkg={version:1,id:'synthetic',edition:'2013.10',historical:true,source_label:'Synthetic',vertical_reference:'test',records:[base]};
 const bytes=new TextEncoder().encode(JSON.stringify(pkg));const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');let broken=true,calls=0;
 globalThis.fetch=async url=>{calls++;return new Response(url.endsWith('manifest.json')?JSON.stringify({version:1,id:'synthetic',asset:'test.json',bytes:bytes.length,sha256:broken?'0'.repeat(64):digest}):bytes);};
 try{await assert.rejects(loadNavigationPackage(),/hash mismatch/);broken=false;const loaded=await loadNavigationPackage();assert.deepEqual(loaded,{...pkg,sha256:digest});assert(Object.isFrozen(loaded)&&Object.isFrozen(loaded.records)&&Object.isFrozen(loaded.records[0].dme));const prior=calls;await loadNavigationPackage();assert.equal(calls,prior);}finally{globalThis.fetch=oldFetch;}
});
test('NAV2 uses its own channel and OBS; legacy three-field input remains supported',()=>{
 const legacy={radio_nav_active_khz:113800,radio_obs_deg:1,radio_demo_enabled:0},p=point(.1,0);assert(validNavigation(legacy));assert(navigationSignal(legacy,p,[base]).valid);assert.equal(navigationSignal(legacy,p,[base],'test',2).valid,false);assert.equal(validNavigation({...legacy,radio_obs2_deg:1}),false);
 const dual={...legacy,radio_nav2_active_khz:113800,radio_obs2_deg:11};const a=navigationSignal(dual,p,[base],'test',1),b=navigationSignal(dual,p,[base],'test',2);assert(a.valid&&b.valid);assert(Math.abs(a.cdi_norm)<1e-10);assert(Math.abs(b.cdi_norm-1)<1e-10);
});

test('DME range is independent of lateral service range',()=>{
 const p=point(.1,0), shortVor={...base,range_nm:1};const r=navigationSignal(cfg(113800),p,[shortVor]);assert.equal(r.valid,false);assert.equal(r.dme_valid,true);assert.equal(r.station_id,'V');
});
test('historical LFQP and ETAR co-channel runway overlaps fail closed',async()=>{
 const {readFile}=await import('node:fs/promises');const p=JSON.parse(await readFile(new URL('../../../app/public/navdata/rhein-main-v1.json',import.meta.url)));
 function fiveMileFront(r){const a=r.gs??r,lat=a.lat_deg*Math.PI/180,lon=a.lon_deg*Math.PI/180,b=(r.front_course_true_deg+180)*Math.PI/180,d=5*1852/6371000;return {lat_rad:Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(b)),lon_rad:lon+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(b)))),alt_msl_m:a.elevation_m+Math.tan(3*Math.PI/180)*5*1852};}
 for(const [airport,runway] of [['LFQP','06'],['ETAR','26']]){const r=p.records.find(x=>x.airport===airport&&x.runway===runway&&x.kind==='LOC');assert(r);const position=fiveMileFront(r),single=navigationSignal(cfg(r.frequency_khz),position,[r]),combined=navigationSignal(cfg(r.frequency_khz),position,p.records);assert(single.valid&&single.gs_valid,`${airport} single source is usable`);assert.equal(combined.valid,false,`${airport} overlap must not invent a runway`);assert.equal(combined.gs_valid,false);assert.equal(combined.dme_valid,false);assert.match(combined.reason,/Ambiguous/);}
});
test('co-channel sources outside usable sectors do not mask one usable source',()=>{
 const p=point(-.08,0,400),opposite={...loc,uid:'outside',lat_deg:.02,lon_deg:.02,front_course_true_deg:90,dme:null,gs:null};const separation=Math.hypot(.10,.02)*Math.PI/180*6371000/1852;assert(separation<opposite.range_nm,'fixture station is within its range');const a=navigationSignal(cfg(110300),p,[loc,opposite]);assert.equal(a.station_uid,'loc');assert.equal(a.valid,true);
});

test('co-channel VOR presence survives OBS ambiguity and station passage',()=>{
 const one={...base,dme:null},other={...base,uid:'other',lat_deg:0,lon_deg:-.1,dme:null};
 const ambiguousObs=navigationSignal(cfg(113800,91),point(.1,0),[one]);assert.equal(ambiguousObs.valid,false);assert.match(ambiguousObs.reason,/ambiguity/);
 for(const p of [point(.1,0),point(0,0)]){const signal=navigationSignal(cfg(113800,91),p,[one,other]);assert.equal(signal.valid,false);assert.equal(signal.dme_valid,false);assert.match(signal.reason,/Ambiguous/);}
});

test('worldwide historical VOR/DME channels reach both receiver paths without replacing regional records',async()=>{
 const {readFile}=await import('node:fs/promises');
 const world=JSON.parse(await readFile(new URL('../../../app/public/navdata/world-v1.bin',import.meta.url)));
 const regional=JSON.parse(await readFile(new URL('../../../app/public/navdata/rhein-main-v1.json',import.meta.url)));
 assert.equal(world.records.length,7923);
 for(const record of regional.records) assert.deepEqual(world.records.find(r=>r.uid===record.uid),record);
 for(const uid of ['vor-klo-114850','vor-cpt-114350','vor-ctv-115700']){
  const r=world.records.find(r=>r.uid===uid);assert(r);
  const p=point(r.lat_deg-.05,r.lon_deg,1500);
  const config={...cfg(r.frequency_khz),radio_nav2_active_khz:r.frequency_khz,radio_obs2_deg:0};
  for(const receiver of [1,2]){
   const result=navigationSignal(config,p,world.records,world.source_label,receiver);
   assert.equal(result.valid,true,uid);assert.equal(result.dme_valid,true,uid);assert.equal(result.station_uid,uid);
   assert.equal(result.course_reference,'MAG');assert.match(result.source_label,/Worldwide NAV 2013.10/);
   assert(result.dme_nm>3&&result.dme_nm<3.2);
  }
 }
 const dme=world.records.find(r=>r.uid==='dme-amu-116300-26030');assert(dme);
 const result=navigationSignal(cfg(dme.frequency_khz),point(dme.lat_deg-.05,dme.lon_deg,1500),world.records,world.source_label);
 assert.equal(result.valid,false);assert.equal(result.dme_valid,true);assert.equal(result.station_kind,'DME');assert.equal(result.bearing_true_deg,null);
});

test('worldwide paired localizer and glideslope use supplied source geometry',async()=>{
 const {readFile}=await import('node:fs/promises');const world=JSON.parse(await readFile(new URL('../../../app/public/navdata/world-v1.bin',import.meta.url)));
 const r=world.records.find(r=>r.uid==='loc-ikl-108300-lszh-14');assert(r?.gs&&r.dme);
 const b=(r.front_course_true_deg+180)*Math.PI/180,d=5*1852/6371000,lat=r.gs.lat_deg*Math.PI/180,lon=r.gs.lon_deg*Math.PI/180;
 const phi=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(b));
 const p={lat_rad:phi,lon_rad:lon+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(phi)),alt_msl_m:r.gs.elevation_m+Math.tan(r.gs.angle_deg*Math.PI/180)*5*1852};
 const result=navigationSignal(cfg(r.frequency_khz),p,world.records,world.source_label);
 assert.equal(result.station_uid,r.uid);assert.equal(result.valid,true);assert.equal(result.gs_valid,true);assert.equal(result.dme_valid,true);assert(Math.abs(result.gs_norm)<.02);
 const conflicting=world.records.find(r=>r.uid==='vor-abb-108450');assert(conflicting);assert.equal(conflicting.dme,null);
});

test('mutable caller records are revalidated after tuning or mutation',()=>{
 const mutable={...base},records=[mutable],p=point(.1,0);
 assert.equal(navigationSignal(cfg(113800),p,records).valid,true);
 mutable.frequency_khz=114000;
 assert.equal(navigationSignal(cfg(113800),p,records).valid,false);
 assert.equal(navigationSignal(cfg(114000),p,records).valid,true);
 mutable.variation_deg_east=null;
 assert.equal(navigationSignal(cfg(114000),p,records).valid,false);
});

test('worldwide loader verifies bounded opaque package, freezes/indexes services and rejects unapproved binary paths',async()=>{
 const {readFile}=await import('node:fs/promises'),oldFetch=globalThis.fetch;
 const bytes=await readFile(new URL('../../../app/public/navdata/world-v1.bin',import.meta.url)),manifest=JSON.parse(await readFile(new URL('../../../app/public/navdata/manifest.json',import.meta.url)));
 try{
  let calls=0;globalThis.fetch=async url=>{calls++;return new Response(url.endsWith('manifest.json')?JSON.stringify(manifest):bytes);};
  const module=await import('./navigation.js?worldwide-loader');const pkg=await module.loadNavigationPackage();
  assert.equal(pkg.sha256,manifest.sha256);assert.equal(pkg.records.length,7923);assert(Object.isFrozen(pkg.records)&&Object.isFrozen(pkg.records[0]));
  const r=pkg.records.find(r=>r.uid==='vor-cpt-114350');
  for(let i=0;i<20;i++) assert.equal(module.navigationSignal(cfg(r.frequency_khz),point(r.lat_deg-.05,r.lon_deg,1500),pkg.records,pkg.source_label).station_uid,r.uid);
  await module.loadNavigationPackage();assert.equal(calls,2,'cached verified package has no repeated fetch');
  for(const [label,changed] of [['wrong-identity',{id:'synthetic'}],['wrong-binary',{asset:'other.bin'}],['oversize',{bytes:8*1024*1024+1}]]){
   calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({...manifest,...changed}));};
   const fresh=await import(`./navigation.js?${label}`);await assert.rejects(fresh.loadNavigationPackage(),/Invalid navigation manifest/);assert.equal(calls,1);
  }
 }finally{globalThis.fetch=oldFetch;}
});
