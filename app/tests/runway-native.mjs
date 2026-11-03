// Actual native gear / public terrain regression, not calibrated C172S performance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import create from '../../studies/e1-browser/sim/dist/jsbsim.mjs';
import { loadTerrainPackage } from '../../studies/e1-browser/sim/terrain.js';
import { groundCollisionContact } from '../../studies/e1-browser/sim/collision.js';
import { groundFields } from '../../studies/e1-browser/sim/cockpit.js';
import { EDFE_RUNWAYS, airportOffset } from '../src/airport-geometry.ts';
const grid = await loadTerrainPackage(async url => new Response(await readFile(new URL('../public' + url, import.meta.url))));
const results=[];
for (const runway of EDFE_RUNWAYS) {
  const m=await create(), p=m._malloc(grid.physical_m.byteLength);
  m.HEAPF64.set(grid.physical_m,p/8);
  assert.equal(m._gf_configure_terrain_grid(grid.west_rad,grid.south_rad,grid.east_rad,grid.north_rad,grid.width,grid.height,p,grid.physical_m.length),0);m._free(p);
  const start=airportOffset(runway,Math.sin(runway.heading_true_rad)*20,Math.cos(runway.heading_true_rad)*20);
  assert(m._gf_init_runway(.1,start.lat_rad,start.lon_rad,runway.heading_true_rad)<0,'unsupported coarse timestep rejected');
  assert.equal(m._gf_init_runway(1/120,start.lat_rad,start.lon_rad,runway.heading_true_rad),0);
  const read=()=>{const s=m._gf_state()/8,g=m._gf_ground_state()/8;return {s:Array.from(m.HEAPF64.subarray(s,s+14)),g:groundFields(Array.from(m.HEAPF64.subarray(g,g+18)))};};
  let {s,g}=read();assert.equal(s[0],0);assert(Math.hypot(g.ground_forward_mps,g.ground_side_mps)<.05);
  assert.equal(g.gear_nose_wow+g.gear_left_wow+g.gear_right_wow,3);
  for(let step=0;step<1200;step++)assert.equal(m._gf_step(),0);
  ({s,g}=read());assert(Math.hypot(g.ground_forward_mps,g.ground_side_mps)<.05);assert.equal(g.structure_contact_mask,0);
  assert.equal(groundCollisionContact(g.ground_agl_m,s[4],s[5],g.structure_contact_mask,undefined,g).mask,0);
  m._gf_set_secondary_inputs(0,0);
  let airborne=false, rotated=false;
  for(let step=0;step<7200;step++) {
    ({s,g}=read());assert(s.every(Number.isFinite));
    rotated ||= s[7] > 29;
    // A scripted pilot holds wings/heading level and rotates; no FDM coefficients change.
    const clip=x=>Math.max(-.5,Math.min(.5,x));
    const yaw=Math.atan2(Math.sin(s[6]-runway.heading_true_rad),Math.cos(s[6]-runway.heading_true_rad));
    m._gf_set_inputs(rotated?clip(2*(s[5]-.12)+.5*s[12]):0,clip(-2*s[4]-.6*s[11]),clip(3*yaw+.5*s[13]),.9);assert.equal(m._gf_step(),0);
    ({s,g}=read());assert.equal(g.structure_contact_mask,0);
    if(g.ground_agl_m>20){airborne=true;results.push({runway:runway.id,takeoff_time_s:s[0]-10,agl_m:g.ground_agl_m});break;}
  }
  assert(airborne,'released brakes, power and rotation achieve actual native takeoff');
}
console.log(JSON.stringify({result:'pass',results},null,2));
