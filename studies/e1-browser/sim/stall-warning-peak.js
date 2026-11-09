// Preserve genuine native warning observations between state publications.
// No threshold, duration or aircraft-state value is synthesized here.
const validStep = step => Number.isSafeInteger(step) && step >= 0;
const validSample = (norm, onGround, contactMask) => Number.isFinite(norm) && norm >= 0
  && (onGround === 0 || onGround === 1) && Number.isSafeInteger(contactMask) && contactMask >= 0 && contactMask <= 127;

export function createStallWarningPeak() {
  let peak = null, previousStep = null;
  function clear() { peak = null; previousStep = null; }
  return {
    clear,
    observe(step, norm, onGround, contactMask) {
      if (!validStep(step) || previousStep !== null && step <= previousStep) { clear(); return; }
      previousStep = step;
      if (!validSample(norm, onGround, contactMask) || onGround || contactMask) { peak = null; return; }
      if (norm > 0 && (!peak || norm > peak.norm)) peak = { norm, step };
    },
    fields(step, norm, onGround, contactMask) {
      if (!validStep(step) || !validSample(norm, onGround, contactMask) || onGround || contactMask || peak && peak.step > step) {
        clear(); return {};
      }
      return peak ? { stall_warning_peak_norm: peak.norm, stall_warning_peak_step: peak.step } : {};
    },
  };
}
