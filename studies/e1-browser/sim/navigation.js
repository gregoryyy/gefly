// Shared historical NAV geometry for worker and both instruments. Spherical
// distances, source ranges, beam widths and sectors are instructional models,
// not radio propagation, installed receiver fidelity or operational procedures.
const DEG=Math.PI/180, R=6371000, NM=1852, TAU=2*Math.PI;
const norm=r=>((r%TAU)+TAU)%TAU, signed=r=>Math.atan2(Math.sin(r),Math.cos(r));
const clip=x=>Math.max(-1,Math.min(1,x));
export const DEFAULT_NAVIGATION=Object.freeze({radio_nav_active_khz:113800,radio_obs_deg:0,radio_demo_enabled:0,radio_nav2_active_khz:114000,radio_obs2_deg:0});
export const NAVIGATION_FIELDS=Object.freeze(Object.keys(DEFAULT_NAVIGATION));
const validFrequency=n=>Number.isInteger(n)&&n>=108000&&n<=117950&&n%50===0;
const validObs=n=>Number.isInteger(n)&&n>=0&&n<360;
export function validNavigation(c){return !!c && validFrequency(c.radio_nav_active_khz) && validObs(c.radio_obs_deg) && [0,1].includes(c.radio_demo_enabled) && ((c.radio_nav2_active_khz===undefined && c.radio_obs2_deg===undefined) || (validFrequency(c.radio_nav2_active_khz) && validObs(c.radio_obs2_deg)));}
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const nullableString=v=>v===null || typeof v==='string' && v.length>0 && v.length<=200;
const coord=o=>o && finite(o.lat_deg,-90,90)&&finite(o.lon_deg,-180,180)&&finite(o.elevation_m,-1000,10000)&&finite(o.range_nm,0.01,1000);
export function validNavRecord(r){
 if (!coord(r)||typeof r.uid!=='string'||!r.uid||r.uid.length>300||typeof r.id!=='string'||!r.id||r.id.length>40||typeof r.name!=='string'||!r.name||r.name.length>200||!Number.isInteger(r.frequency_khz)||r.frequency_khz<108000||r.frequency_khz>117950||r.frequency_khz%50!==0||!['VOR','LOC','DME'].includes(r.kind)||!nullableString(r.airport)||!nullableString(r.runway)||!Array.isArray(r.source_line_ids)||!r.source_line_ids.length||!r.source_line_ids.every(n=>Number.isSafeInteger(n)&&n>0)) return false;
 if (!(r.variation_deg_east===null||finite(r.variation_deg_east,-180,180))||!(r.front_course_true_deg===null||finite(r.front_course_true_deg,0,359.999999999))) return false;
 if (r.kind==='VOR' && r.variation_deg_east===null || r.kind==='LOC' && r.front_course_true_deg===null) return false;
 if (r.dme!==null && (!coord(r.dme)||!finite(r.dme.bias_nm,-100,100))) return false;
 if (r.gs!==null && (!coord(r.gs)||!finite(r.gs.angle_deg,.1,10)||!finite(r.gs.front_course_true_deg,0,359.999999999))) return false;
 return (r.kind==='LOC'||r.gs===null) && (r.kind!=='DME'||r.dme!==null);
}
const posValid=p=>p&&finite(p.lat_rad,-Math.PI/2,Math.PI/2)&&finite(p.lon_rad,-Math.PI,Math.PI);
function geometry(origin,p){
 const lat=origin.lat_deg*DEG,lon=origin.lon_deg*DEG,dlon=p.lon_rad-lon,dlat=p.lat_rad-lat;
 const hav=Math.sin(dlat/2)**2+Math.cos(lat)*Math.cos(p.lat_rad)*Math.sin(dlon/2)**2;
 const angle=2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,hav))));
 const out=norm(Math.atan2(Math.sin(dlon)*Math.cos(p.lat_rad),Math.cos(lat)*Math.sin(p.lat_rad)-Math.sin(lat)*Math.cos(p.lat_rad)*Math.cos(dlon)));
 const inbound=norm(Math.atan2(-Math.sin(dlon)*Math.cos(lat),Math.cos(p.lat_rad)*Math.sin(lat)-Math.sin(p.lat_rad)*Math.cos(lat)*Math.cos(dlon)));
 return {angle,distance:angle*R,radial:out,bearing:inbound};
}
// Source coverage is independent of OBS ambiguity and station-passage flags.
function sourceReceivable(r,g,p){
 const dmeAvailable=r.dme && geometry(r.dme,p).distance<=r.dme.range_nm*NM;
 if(r.kind==='DME') return !!dmeAvailable;
 if(g.distance>r.range_nm*NM) return !!dmeAvailable;
 if(r.kind==='VOR'||g.distance<100) return true;
 const course=r.front_course_true_deg*DEG;
 const front=signed(g.radial-(course+Math.PI)),back=signed(g.radial-course);
 const frontSide=Math.abs(front)<Math.PI/2;
 const limit=(frontSide?(g.distance<=10*NM?35:10):10)*DEG;
 return !!dmeAvailable || (frontSide?Math.abs(front):Math.abs(back))<=limit;
}
// Only loader-validated, deeply frozen arrays are indexed. Ad-hoc/mutable test
// or caller arrays retain per-call validation and cannot receive stale indexes.
const catalogueChannels=new WeakMap();
function channelRecords(records,frequency){
 const index=records && catalogueChannels.get(records);
 return index ? index.get(frequency) ?? [] : Array.isArray(records) ? records.filter(r=>validNavRecord(r)&&r.frequency_khz===frequency) : [];
}
const LAB=Object.freeze({uid:'fictional-lab',id:'LAB',name:'Fictional LAB',frequency_khz:113800,kind:'VOR',lat_deg:49.96,lon_deg:8.643,elevation_m:0,range_nm:60,variation_deg_east:0,front_course_true_deg:null,airport:null,runway:null,dme:{lat_deg:49.96,lon_deg:8.643,elevation_m:0,range_nm:60,bias_nm:0},gs:null,source_line_ids:[1]});
export function navigationSignal(c,p,records=[],sourceLabel='Rhein-Main NAV 2013.10',receiver=1){
 const wholeValid=validNavigation(c);
 if(receiver===2 && wholeValid && c.radio_nav2_active_khz!==undefined) c={...c,radio_nav_active_khz:c.radio_nav2_active_khz,radio_obs_deg:c.radio_obs2_deg};
 const configured=wholeValid && (receiver===1 || receiver===2 && c.radio_nav2_active_khz!==undefined),locChannel=configured&&c.radio_nav_active_khz<112000&&Math.floor(c.radio_nav_active_khz/100)%2===1;
 const empty={valid:false,kind:configured?(locChannel?2:1):0,cdi_norm:0,course_rad:configured?c.radio_obs_deg*DEG:0,gs_valid:false,gs_norm:0,station_id:null,station_name:null,station_uid:null,source_label:null,station_kind:null,course_reference:'NONE',course_true_deg:null,to_from:'OFF',radial_true_deg:null,radial_magnetic_deg:null,bearing_true_deg:null,dme_valid:false,dme_nm:null,dme_slant_nm:null,reason:'No station on active channel',gs_reason:'Glideslope unavailable'};
 if(!configured) return {...empty,reason:'Radio configuration unavailable'};
 if(!posValid(p)) return {...empty,reason:'Aircraft position unavailable'};
 const candidates=(c.radio_demo_enabled?(LAB.frequency_khz===c.radio_nav_active_khz?[LAB]:[]):channelRecords(records,c.radio_nav_active_khz)).map(r=>({r,g:geometry(r,p)})).filter(x=>x.g.distance<=x.r.range_nm*NM || x.r.dme && geometry(x.r.dme,p).distance<=x.r.dme.range_nm*NM).sort((a,b)=>a.g.distance-b.g.distance);
 if(!candidates.length) return {...empty,reason:c.radio_demo_enabled?'No fictional LAB signal':'No historical signal in modeled range'};
 // Distance alone cannot identify the active runway or service. Resolve each
 // candidate's own sector and DME range first, then fail closed on overlap.
 if(candidates.length>1){
  const receivable=candidates.filter(({r,g})=>sourceReceivable(r,g,p));
  if(receivable.length>1) return {...empty,reason:'Ambiguous co-channel stations',gs_reason:'Ambiguous co-channel stations'};
  if(receivable.length===0) return {...empty,reason:'No receivable signal in modeled sectors'};
  candidates.splice(0,candidates.length,receivable[0]);
 }
 const {r,g}=candidates[0], kind=r.kind==='VOR'?1:r.kind==='LOC'?2:0;
 let result={...empty,kind,station_id:r.id,station_name:r.name,station_uid:r.uid,station_kind:r.kind,source_label:c.radio_demo_enabled?'Fictional LAB · TRUE':sourceLabel,reason:'Signal unavailable'};
 // DME-only source rows have their antenna at the record coordinates.
 const dme=r.dme;
 if(dme && Number.isFinite(p.alt_msl_m)){
  const dg=geometry(dme,p),rr=R+dme.elevation_m,pr=R+p.alt_msl_m;
  if(rr>0&&pr>0&&dg.distance<=dme.range_nm*NM){const slant=Math.hypot(p.alt_msl_m-dme.elevation_m,2*Math.sqrt(rr*pr)*Math.sin(dg.angle/2))/NM;result={...result,dme_valid:true,dme_slant_nm:slant,dme_nm:Math.max(0,slant-dme.bias_nm)};}
 }
 if(r.kind==='DME') return {...result,reason:'DME only · no lateral guidance'};
 if(g.distance>r.range_nm*NM) return {...result,reason:'Outside modeled lateral service range'};
 if(g.distance<100) return {...result,reason:'Station passage · bearing ambiguous'};
 if(r.kind==='VOR'){
  const radialMag=norm(g.radial-r.variation_deg_east*DEG),difference=signed(radialMag-c.radio_obs_deg*DEG),side=Math.cos(difference),course=norm((c.radio_obs_deg+r.variation_deg_east)*DEG);
  result={...result,course_reference:c.radio_demo_enabled?'TRUE':'MAG',course_true_deg:course/DEG,course_rad:course,radial_true_deg:g.radial/DEG,radial_magnetic_deg:c.radio_demo_enabled?null:radialMag/DEG,bearing_true_deg:g.bearing/DEG};
  if(Math.abs(side)<1e-10) return {...result,reason:'VOR TO/FROM ambiguity'};
  return {...result,valid:true,cdi_norm:clip(-Math.asin(Math.sin(difference))/DEG/10),to_from:side<0?'TO':'FROM',reason:c.radio_demo_enabled?'Fictional LAB · TRUE reference':'Historical VOR · station-calibrated magnetic reference'};
 }
 const course=r.front_course_true_deg*DEG,front=signed(g.radial-(course+Math.PI)),back=signed(g.radial-course),frontSide=Math.abs(front)<Math.PI/2;
 const limit=(frontSide?(g.distance<=10*NM?35:10):10)*DEG, deviation=frontSide?front:signed(back+Math.PI);
 result={...result,course_reference:'TRUE',course_true_deg:r.front_course_true_deg,course_rad:course};
 // Fold reverse-course lobe while retaining reverse-sensing CDI.
 const beam=frontSide?front:Math.asin(Math.sin(deviation));
 if((frontSide?Math.abs(front):Math.abs(back))>limit) return {...result,reason:'Outside modeled localizer sector'};
 result={...result,valid:true,cdi_norm:clip(beam/DEG/2.5),reason:frontSide?'Historical localizer · front sector':'Historical localizer · back sector'};
 if(!r.gs) return {...result,gs_reason:'No paired glideslope'};
 if(!frontSide) return {...result,gs_reason:'Glideslope unavailable on back course'};
 if(!Number.isFinite(p.alt_msl_m)) return {...result,gs_reason:'Aircraft altitude unavailable'};
 const gg=geometry(r.gs,p),gsAz=Math.abs(signed(gg.radial-(r.gs.front_course_true_deg*DEG+Math.PI)));
 if(gg.distance<100||gg.distance>r.gs.range_nm*NM||gsAz>8*DEG) return {...result,gs_reason:'Outside modeled glideslope sector'};
 const angle=Math.atan2(p.alt_msl_m-r.gs.elevation_m,gg.distance)/DEG;
 if(angle<r.gs.angle_deg*.45||angle>r.gs.angle_deg*1.75) return {...result,gs_reason:'Outside modeled glideslope vertical sector'};
 return {...result,gs_valid:true,gs_norm:clip((r.gs.angle_deg-angle)/.7),gs_reason:'Historical glideslope · approximate geometry'};
}

const WORLD_NAVIGATION_ID='world-nav810-2013-10-v1', WORLD_NAVIGATION_ASSET='world-v1.bin';
const WORLD_NAVIGATION_BYTES=8*1024*1024, WORLD_NAVIGATION_RECORDS=10000;
let packagePromise;
function deepFreeze(value) {
  if (value && typeof value==='object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
async function boundedBytes(response, limit) {
  if (!response.body) throw new Error('Navigation response has no body');
  const reader=response.body.getReader(), chunks=[]; let size=0;
  try {
    while (true) {const {done,value}=await reader.read();if(done) break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Navigation response too large');}chunks.push(value);}
  } finally {reader.releaseLock();}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
/** Fetch the declared bounded same-origin package and verify its exact bytes. */
export function loadNavigationPackage(){
 if(packagePromise) return packagePromise;
 packagePromise=(async()=>{
  const manifestResponse=await fetch('/navdata/manifest.json',{cache:'no-store',redirect:'error'});
  if(!manifestResponse.ok) throw new Error('Navigation manifest unavailable');
  const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(manifestResponse,4096)));
  if(!manifest||manifest.version!==1||typeof manifest.id!=='string'||!manifest.id||typeof manifest.asset!=='string'||!(/^[-a-z0-9]+\.json$/.test(manifest.asset)||manifest.id===WORLD_NAVIGATION_ID&&manifest.asset===WORLD_NAVIGATION_ASSET)||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<1||manifest.bytes>(manifest.id===WORLD_NAVIGATION_ID&&manifest.asset===WORLD_NAVIGATION_ASSET?WORLD_NAVIGATION_BYTES:1000000)||typeof manifest.sha256!=='string'||!/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Invalid navigation manifest');
  const response=await fetch(`/navdata/${manifest.asset}`,{cache:'no-store',redirect:'error'});
  if(!response.ok) throw new Error('Navigation package unavailable');
  const limit=manifest.id===WORLD_NAVIGATION_ID&&manifest.asset===WORLD_NAVIGATION_ASSET?WORLD_NAVIGATION_BYTES:1000000;
  const bytes=await boundedBytes(response,limit);
  if(bytes.length!==manifest.bytes) throw new Error('Navigation package length mismatch');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==manifest.sha256) throw new Error('Navigation package hash mismatch');
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!p||p.version!==1||p.id!==manifest.id||p.edition!=='2013.10'||p.historical!==true||typeof p.source_label!=='string'||!p.source_label||typeof p.vertical_reference!=='string'||!p.vertical_reference||!Array.isArray(p.records)||p.records.length>(manifest.id===WORLD_NAVIGATION_ID&&manifest.asset===WORLD_NAVIGATION_ASSET?WORLD_NAVIGATION_RECORDS:1000)||!p.records.every(validNavRecord)||new Set(p.records.map(r=>r.uid)).size!==p.records.length) throw new Error('Invalid navigation package');
  const frozen=deepFreeze({...p,sha256:manifest.sha256}),index=new Map();
  for(const record of frozen.records){const channel=index.get(record.frequency_khz)??[];channel.push(record);index.set(record.frequency_khz,channel);}
  catalogueChannels.set(frozen.records,index);
  return frozen;
 })().catch(e=>{packagePromise=undefined;throw e;});
 return packagePromise;
}
