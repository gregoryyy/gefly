// Generic operational altitude alerter. Selector or BARO edits establish a new
// baseline without sounds; exact hardware reset behavior is not established.
const FT = .3048, APPROACH = 1000 * FT, BAND = 200 * FT;
export const ALERT_FIELDS = Object.freeze(['kap_alert_state', 'kap_alert_sequence']);
export function validAlertState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!ALERT_FIELDS.some(k => Object.hasOwn(value, k))) return true;
  return ALERT_FIELDS.every(k => Object.hasOwn(value, k)) &&
    [0,1,2,3].includes(value.kap_alert_state) &&
    Number.isSafeInteger(value.kap_alert_sequence) && value.kap_alert_sequence >= 0;
}
const valid = s => !!s && ['t_s','indicated_altitude_m','selected_altitude_m','baro_setting_pa'].every(k => Number.isFinite(s[k])) && s.t_s >= 0 && s.baro_setting_pa > 0;
export function createAltitudeAlert(initial) {
  if (!valid(initial)) throw new TypeError('Invalid altitude alert sensors');
  let previous = {...initial}, distance = initial.indicated_altitude_m - initial.selected_altitude_m;
  let crossed=false, deviation=false, state=Math.abs(distance)>BAND && Math.abs(distance)<APPROACH ? 1 : 0, sequence=0, flashUntil=0;
  function update(s) {
    if (!valid(s) || s.t_s < previous.t_s) return;
    const next=s.indicated_altitude_m-s.selected_altitude_m;
    if (s.selected_altitude_m!==previous.selected_altitude_m || s.baro_setting_pa!==previous.baro_setting_pa) {
      previous={...s}; distance=next; crossed=false; deviation=false; state=Math.abs(next)>BAND && Math.abs(next)<APPROACH ? 1 : 0; flashUntil=0; return;
    }
    // Equal simulation times cannot add events, including repeated paused updates.
    if (s.t_s===previous.t_s) return;
    const oldAbs=Math.abs(distance), newAbs=Math.abs(next);
    const crossesTarget=distance!==0 && (next===0 || Math.sign(next)!==Math.sign(distance));
    const minimum=crossesTarget?0:Math.min(oldAbs,newAbs);
    if (oldAbs>APPROACH && minimum<=APPROACH) sequence++;
    if (minimum<=BAND && newAbs>BAND && (oldAbs<=BAND || crossesTarget)) {deviation=true;sequence++;}
    if (!crossed && crossesTarget) {
      crossed=true;flashUntil=s.t_s+2;
    }
    if (newAbs<=BAND || newAbs>=APPROACH) deviation=false;
    // At exactly 1000 ft preserve the crossing direction: arrival lights the
    // cue, departure clears it, and a stationary boundary retains its state.
    const approachBand = newAbs>BAND && (newAbs<APPROACH ||
      (newAbs===APPROACH && (oldAbs>APPROACH || (oldAbs===APPROACH && state===1))));
    state=s.t_s<flashUntil?2:deviation?3:(approachBand?1:0);
    previous={...s};distance=next;
  }
  return {update,snapshot:()=>({kap_alert_state:state,kap_alert_sequence:sequence})};
}
