// KAP 140 operating modes over generic research servos, not installed performance.
import { pressureAltitude_m, validSetting } from './altimeter.js';
const FT = 0.3048, FPM = FT / 60, TAU = 2 * Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const heading = v => ((v % TAU) + TAU) % TAU;
const VS_MIN = -2000 * FPM, VS_MAX = 1500 * FPM;
export const KAP_FIELDS = Object.freeze(['kap_profile','kap_engaged','kap_lateral','kap_lateral_arm','kap_vertical','kap_alt_arm','kap_gs_arm','kap_lateral_alert','kap_vertical_alert','kap_hdg_prompt','kap_heading_bug_rad','kap_selected_altitude_m','kap_vs_target_mps','kap_hold_pressure_altitude_m','kap_baro_setting_pa','kap_baro_units','kap_display_page','kap_indicated_altitude_m','kap_nav_valid','kap_nav_kind','kap_gs_valid','kap_elevator_norm','kap_sensor_fault','kap_cws','kap_gs_base_mps']);
const REQUIRED_KAP_FIELDS = KAP_FIELDS.filter(key => key !== 'kap_cws' && key !== 'kap_gs_base_mps');
const valueless = new Set(['ap','disconnect','hdg','nav','apr','rev','alt','arm','baro','baro-units']);
export function validKapCommand(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(k => k !== 'action' && k !== 'value')) return false;
  if (valueless.has(c.action)) return c.value === undefined;
  if (typeof c.value !== 'number' || !Number.isFinite(c.value)) return false;
  switch (c.action) {
    case 'heading': return Math.abs(c.value) <= 100 * TAU;
    case 'select-altitude': return c.value >= -1000 && c.value <= 20000;
    case 'baro-setting': return validSetting(c.value) && pressureAltitude_m(c.value) !== null;
    case 'vertical': return [-1,0,1].includes(c.value);
    case 'cws': return c.value === 0 || c.value === 1;
    default: return false;
  }
}
export function validKapState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  if (!KAP_FIELDS.some(k => Object.hasOwn(s, k))) return true;
  if (REQUIRED_KAP_FIELDS.some(k => !Object.hasOwn(s, k) || !Number.isFinite(s[k]))) return false;
  if (Object.hasOwn(s, 'kap_cws') && s.kap_cws !== 0 && s.kap_cws !== 1) return false;
  if (Object.hasOwn(s,'kap_gs_base_mps') && (!Number.isFinite(s.kap_gs_base_mps) || s.kap_gs_base_mps<VS_MIN || s.kap_gs_base_mps>VS_MAX)) return false;
  const member = (k, values) => values.includes(s[k]);
  return member('kap_profile',[1]) && member('kap_engaged',[0,1]) && member('kap_lateral',[0,1,2,3,4]) && member('kap_lateral_arm',[0,2,3,4]) && member('kap_vertical',[0,1,2]) && member('kap_alt_arm',[0,1]) && member('kap_gs_arm',[0,1]) && member('kap_lateral_alert',[0,1,2,3,4]) && member('kap_vertical_alert',[0,2]) && member('kap_hdg_prompt',[0,1]) && s.kap_heading_bug_rad >= 0 && s.kap_heading_bug_rad < TAU && s.kap_selected_altitude_m >= -1000 && s.kap_selected_altitude_m <= 20000 && s.kap_vs_target_mps >= VS_MIN && s.kap_vs_target_mps <= VS_MAX && s.kap_hold_pressure_altitude_m >= -2000 && s.kap_hold_pressure_altitude_m <= 20000 && validSetting(s.kap_baro_setting_pa) && member('kap_baro_units',[0,1]) && member('kap_display_page',[0,1,2]) && s.kap_indicated_altitude_m >= -5000 && s.kap_indicated_altitude_m <= 25000 && member('kap_nav_valid',[0,1]) && member('kap_nav_kind',[0,1,2,3]) && member('kap_gs_valid',[0,1]) && Math.abs(s.kap_elevator_norm) <= 1 && member('kap_sensor_fault',[0,1]);
}
export const validSensors = s => !!s && [s.t_s,s.dt_s,s.heading_rad,s.physical_altitude_m,s.pressure_altitude_m,s.vertical_speed_mps,s.nav?.cdi_norm,s.nav?.course_rad,s.nav?.gs_norm].every(Number.isFinite) && s.dt_s >= 0 && s.t_s >= 0 && s.pressure_altitude_m >= -2000 && s.pressure_altitude_m <= 20000 && (s.elevator_norm === undefined || Number.isFinite(s.elevator_norm) && Math.abs(s.elevator_norm) <= 1) && typeof s.nav.valid === 'boolean' && typeof s.nav.gs_valid === 'boolean' && [0,1,2,3].includes(s.nav.kind);
export function createKap140(initial) {
  if (!validSensors(initial)) throw new TypeError('Invalid KAP sensors');
  let engaged=0, lat=0, latArm=0, vert=0, altArm=0, gsArm=0, latAlert=0, vertAlert=0, cws=0;
  let bug=heading(initial.heading_rad), selected=clamp(initial.pressure_altitude_m,-1000,20000), vs=clamp(initial.vertical_speed_mps,VS_MIN,VS_MAX), hold=initial.pressure_altitude_m, baro=101325, units=0, page=0, pageUntil=0;
  let gesture=0, gestureStart=0, gestureLast=0, gestureMoved=false, lastAltPress=-Infinity, gsBase=0, gsInhibited=false, hdgPromptUntil=0;
  // Last sensors that passed validation, and a latched simulator fault flag.
  // Invalid sensors are never silently skipped: an engaged AP disconnects and
  // kap_sensor_fault stays set until the next explicit AP/disconnect press.
  // This is a generic simulator safety substitution, not sourced KAP 140 logic.
  let lastValid=initial, sensorFault=0;
  const show = (which,t) => {page=which; pageUntil=t+3;};
  // Source-loss annunciations belong to an engagement: disconnect clears them,
  // so a stale NAV/GS alert never shows with AP OFF or carries into a new
  // engagement (generic simulator scoping; alert timing is not sourced).
  const disconnect = () => {engaged=0; cws=0; lat=0; latArm=0; vert=0; altArm=0; gsArm=0; gesture=0; gsInhibited=false; latAlert=0; vertAlert=0; hdgPromptUntil=0;};
  const setVS = (s, display=false) => {vert=0; vs=clamp(s.vertical_speed_mps,VS_MIN,VS_MAX); if (display) show(1,s.t_s);};
  // End the stale VS display on ALT capture, including while paused. An
  // intentionally displayed BARO page keeps its existing expiry.
  const captureAlt = (s, target=s.pressure_altitude_m) => {vert=1; hold=target; altArm=0; if(page===1){page=0;pageUntil=0;}};
  const sourceOK = (mode,s) => s.nav.valid && s.nav.kind !== 0 && (mode !== 4 || s.nav.kind === 2);
  const setNav = (mode,s) => {
    if (latAlert === mode) {latAlert=0; return;}
    if (mode === 4 && s.nav.kind !== 2) return;
    gsInhibited=false;
    // Cancelling only an armed mode leaves the active lateral mode (HDG or ROL)
    // in place, consistent with the arming path. Cancelling an active NAV/APR/REV
    // keeps the existing generic reversion to ROL.
    if (latArm === mode) {latArm=0; gsArm=0; return;}
    if (lat === mode) {lat=0; latArm=0; gsArm=0; return;}
    if (!sourceOK(mode,s)) {latAlert=mode; lat=0; latArm=0; gsArm=0; return;}
    // The 5 s HDG prompt accompanies an accepted arm/capture only.
    hdgPromptUntil=s.t_s+5;
    if (Math.abs(s.nav.cdi_norm) <= .5) {lat=mode; latArm=0;} else {latArm=mode; if (lat !== 1) lat=0;}
  };
  function command(c,s) {
    if (!validKapCommand(c) || !validSensors(s)) return false;
    switch(c.action) {
      case 'disconnect': disconnect(); sensorFault=0; break;
      case 'ap': if (engaged) disconnect(); else {engaged=1;lat=0;latArm=0;setVS(s,true);} sensorFault=0; break;
      case 'cws':
        if (!engaged || cws === c.value) break;
        cws=c.value; gesture=0; gestureMoved=false;
        if (cws) {vs=clamp(s.vertical_speed_mps,VS_MIN,VS_MAX); show(1,s.t_s);}
        else {
          if (vert===1) hold=s.pressure_altitude_m;
          else if (vert===0) vs=clamp(s.vertical_speed_mps,VS_MIN,VS_MAX);
          show(1,s.t_s);
        }
        break;
      case 'heading': bug=heading(c.value); break;
      case 'select-altitude': selected=c.value; if (engaged) altArm=1; page=0; pageUntil=0; break;
      case 'baro-setting': baro=c.value; show(2,s.t_s); break;
      case 'baro': show(2,s.t_s); break;
      case 'baro-units': units=1-units; show(2,s.t_s); break;
      case 'arm': altArm=1-altArm; break;
      case 'hdg': if (latAlert===1) latAlert=0; else if (engaged) {lat=lat===1?0:1;latArm=0;gsArm=0;} break;
      case 'nav': if (engaged) setNav(2,s); break;
      case 'apr': if (engaged) setNav(3,s); break;
      case 'rev': if (engaged) setNav(4,s); break;
      case 'alt':
        if (s.t_s-lastAltPress <= 1 && vertAlert===2) vertAlert=0;
        lastAltPress=s.t_s;
        if (engaged) {if (vert===1) setVS(s,true); else captureAlt(s); gsArm=0; gsInhibited=true;} break;
      case 'vertical': {
        // Release must always clear a held command, including after GS capture.
        if (c.value===0) {if (engaged && gesture && gestureMoved && vert===1) captureAlt(s); gesture=0; gestureMoved=false; break;}
        if (!engaged || vert===2) break;
        const dir=Math.sign(c.value);
        gesture=dir; gestureStart=s.t_s; gestureLast=s.t_s; gestureMoved=false;
        if (vert===0) {if (page===1 && s.t_s<pageUntil) vs=clamp(vs+dir*100*FPM,VS_MIN,VS_MAX); show(1,s.t_s);}
        else hold=clamp(hold+dir*20*FT,-2000,20000);
        break;
      }
    }
    return true;
  }
  /** Returns false when sensors are invalid; the AP then disconnects visibly. */
  function step(s) {
    if (!validSensors(s)) {if (engaged) disconnect(); sensorFault=1; return false;}
    lastValid=s;
    if (page && s.t_s>=pageUntil) page=0;
    if (hdgPromptUntil && s.t_s>=hdgPromptUntil) hdgPromptUntil=0;
    if (engaged && cws) {
      // Optional CWS borrows both servos without discarding mode selection. The
      // current measured VS remains visible for the whole held gesture.
      vs=clamp(s.vertical_speed_mps,VS_MIN,VS_MAX); show(1,s.t_s); return true;
    }
    if (gesture && engaged && vert!==2) {
      const elapsed=Math.max(0,s.t_s-Math.max(gestureLast,gestureStart+.5));
      if (elapsed>0) {gestureMoved=true; if (vert===0) {vs=clamp(vs+gesture*300*FPM*elapsed,VS_MIN,VS_MAX); show(1,s.t_s);} else {vs=gesture*500*FPM;} }
      gestureLast=s.t_s;
    }
    if (!engaged) return true;
    if (latArm && !sourceOK(latArm,s)) {latAlert=latArm;latArm=0;lat=0;gsArm=0;}
    if (lat>=2 && !sourceOK(lat,s)) {latAlert=lat;lat=0;gsArm=0;}
    if (latArm && Math.abs(s.nav.cdi_norm)<=.5) {lat=latArm;latArm=0;}
    const gsAvailable=!gsInhibited && lat===3 && s.nav.kind===2 && s.nav.valid && s.nav.gs_valid;
    if (vert===2 && !gsAvailable) {setVS(s);vertAlert=2;gsArm=0;}
    // Recapturing GS ends the GS source-loss alert for that loss.
    if (gsAvailable && vert!==2) {gsArm=1; if (Math.abs(s.nav.gs_norm)<=.2) {gsBase=clamp(s.vertical_speed_mps,VS_MIN,VS_MAX);vert=2;gsArm=0;altArm=0;vertAlert=0;}}
    else if (!gsAvailable) gsArm=0;
    if (vert===0 && altArm) {
      const target=selected+pressureAltitude_m(baro), diff=target-s.pressure_altitude_m;
      // Explicit simulator anticipation, not a published KAP 140 capture law.
      if (diff*vs>=0 && vs!==0 && diff*s.vertical_speed_mps>=0 && Math.abs(diff)<=Math.max(20*FT,Math.abs(vs)*3)) {captureAlt(s,target);}
    }
    return true;
  }
  function snapshot(input) {
    // Invalid sensors are reported as a fault with invalid NAV/GS, never as
    // fresh values; the other displayed values are the last validated ones.
    const valid=validSensors(input), s=valid?input:lastValid, fault=+(sensorFault || !valid);
    return {kap_profile:1,kap_engaged:engaged,kap_lateral:lat,kap_lateral_arm:latArm,kap_vertical:vert,kap_alt_arm:altArm,kap_gs_arm:gsArm,kap_lateral_alert:latAlert,kap_vertical_alert:vertAlert,kap_hdg_prompt:+(s.t_s<hdgPromptUntil),kap_heading_bug_rad:bug,kap_selected_altitude_m:selected,kap_vs_target_mps:vs,kap_hold_pressure_altitude_m:hold,kap_baro_setting_pa:baro,kap_baro_units:units,kap_display_page:cws?1:page,kap_indicated_altitude_m:s.pressure_altitude_m-pressureAltitude_m(baro),kap_nav_valid:valid?+s.nav.valid:0,kap_nav_kind:s.nav.kind,kap_gs_valid:valid?+s.nav.gs_valid:0,kap_elevator_norm:s.elevator_norm??0,kap_sensor_fault:fault,kap_cws:cws,kap_gs_base_mps:gsBase};
  }
  function guidance(input) {
    const s=validSensors(input)?input:lastValid;
    let h=bug;
    if (latArm && lat===1) h=heading(bug+(latArm===4?Math.PI:0)+(latArm===4?-1:1)*Math.sign(s.nav.cdi_norm)*Math.PI/4);
    else if (lat>=2) h=heading(bug+(lat===4?Math.PI:0)+(lat===4?-1:1)*clamp(s.nav.cdi_norm,-1,1)*Math.PI/4);
    // GS correction is a bounded simulator convention, not KAP 140 tuning.
    const v=vert===2 ? clamp(gsBase+s.nav.gs_norm*3,VS_MIN,VS_MAX) : vs;
    return {lateral_mode:engaged && !cws?(lat===0?1:2):0,heading_rad:h,vertical_mode:engaged && !cws?(vert===1 && !(gesture && gestureMoved)?2:1):0,vertical_target:vert===1 && !(gesture && gestureMoved)?s.physical_altitude_m+hold-s.pressure_altitude_m:v};
  }
  function restore(recorded,s) {
    if (!recorded || recorded.kap_profile!==1 || !validKapState(recorded) || !validSensors(s)
      || recorded.kap_cws===1 || (recorded.kap_vertical===2 && !Number.isFinite(recorded.kap_gs_base_mps)) || recorded.kap_sensor_fault) return false;
    engaged=recorded.kap_engaged;lat=recorded.kap_lateral;latArm=recorded.kap_lateral_arm;vert=recorded.kap_vertical;
    altArm=recorded.kap_alt_arm;gsArm=recorded.kap_gs_arm;latAlert=recorded.kap_lateral_alert;vertAlert=recorded.kap_vertical_alert;
    bug=recorded.kap_heading_bug_rad;selected=recorded.kap_selected_altitude_m;vs=recorded.kap_vs_target_mps;hold=recorded.kap_hold_pressure_altitude_m;
    baro=recorded.kap_baro_setting_pa;units=recorded.kap_baro_units;page=recorded.kap_display_page;pageUntil=s.t_s+3;
    gsBase=recorded.kap_gs_base_mps??0;hdgPromptUntil=recorded.kap_hdg_prompt?s.t_s+5:0;gesture=0;gestureMoved=false;cws=0;sensorFault=0;lastValid=s;
    return true;
  }
  return {command,step,snapshot,guidance,restore};
}
