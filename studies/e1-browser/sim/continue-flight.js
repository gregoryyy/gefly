// Reconstructed native initial conditions from a modern trace, not a checkpoint.
import {validKapState} from './kap140.js';
import {validNavigation,NAVIGATION_FIELDS} from './navigation.js';
const bounds = {
 t_s:[0,1e9],step:[0,1e9],lat_rad:[-Math.PI/2,Math.PI/2],lon_rad:[-Math.PI,Math.PI],alt_msl_m:[-1000,11000],roll_rad:[-Math.PI,Math.PI],pitch_rad:[-Math.PI/2,Math.PI/2],heading_rad:[-2*Math.PI,2*Math.PI],
 aero_u_mps:[-200,200],aero_v_mps:[-200,200],aero_w_mps:[-200,200],aero_p_radps:[-20,20],aero_q_radps:[-20,20],aero_r_radps:[-20,20],
 elevator_cmd_norm:[-1,1],aileron_cmd_norm:[-1,1],rudder_cmd_norm:[-1,1],throttle_norm:[0,1],pitch_trim_norm:[-1,1],pitch_trim_initial_norm:[-1,1],flap_command_norm:[0,1],flap_rad:[-1e-6,Math.PI/6+1e-6],brake_left_norm:[0,1],brake_right_norm:[0,1],mixture_norm:[0,1],mixture_auto:[0,1],engine_running:[0,1],engine_command_on:[0,1],prop_radps:[0,500],fuel_left_m3:[0,.2],fuel_right_m3:[0,.2],
 altimeter_setting_pa:[80000,110000],altimeter_qnh_pa:[80000,110000],altimeter_qfe_pa:[80000,110000],altimeter_qfe_datum_m:[-1000,11000],gear_nose_wow:[0,1],gear_left_wow:[0,1],gear_right_wow:[0,1],collision_mask:[0,0],structure_contact_mask:[0,0],
};
export const CONTINUATION_FIELDS=Object.freeze(Object.keys(bounds));
const packed=CONTINUATION_FIELDS.slice(0,32);
export function resumeProblem(state,dt=1/120){
 if(!state||typeof state!=='object'||Array.isArray(state))return 'Selected frame is unavailable.';
 if(!Number.isFinite(dt)||dt<1e-4||dt>1/60)return 'Continuation requires a supported fixed simulation step.';
 if(!Number.isFinite(state.tas_mps)||state.tas_mps<0||state.tas_mps>350)return 'Selected frame lacks supported true-airspeed telemetry.';
 for(const [key,[lo,hi]] of Object.entries(bounds))if(!Number.isFinite(state[key])||state[key]<lo||state[key]>hi)return `Selected frame lacks supported ${key} telemetry.`;
 for(const key of ['step','mixture_auto','engine_running','engine_command_on','gear_nose_wow','gear_left_wow','gear_right_wow'])if(!Number.isInteger(state[key]))return `Selected frame has invalid ${key}.`;
 if(state.terrain_profile!==undefined&&state.terrain_profile!==1)return 'Selected terrain profile is unsupported.';
 if(!validNavigation(state)||NAVIGATION_FIELDS.some(key=>!Number.isFinite(state[key])))return 'Selected navigation configuration is unavailable.';
 if(state.kap_profile!==1||!validKapState(state))return 'Selected autopilot configuration is unavailable.';
 if(state.kap_cws===1)return 'Release CWS before choosing a continuation frame.';
 if(state.kap_vertical===2&&!Number.isFinite(state.kap_gs_base_mps))return 'Captured glideslope continuation is unavailable; its internal reference was not recorded.';
 if(state.kap_sensor_fault)return 'Selected autopilot frame has a sensor fault.';
 return null;
}
export function resumeValues(state,dt=1/120){const problem=resumeProblem(state,dt);if(problem)throw new TypeError(problem);return new Float64Array(packed.map(key=>state[key]));}
