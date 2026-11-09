import { KAP_FIELDS, validKapState } from './kap140.js';
import { NAVIGATION_FIELDS, validNavigation } from './navigation.js';

const OPTIONAL_LEGACY = new Set(['kap_cws', 'kap_gs_base_mps']);
const exactKeys = (value, fields) => !!value && typeof value === 'object' && !Array.isArray(value)
  && Reflect.ownKeys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));
const finiteFields = (value, fields) => fields.every(key => Object.hasOwn(value, key) && typeof value[key] === 'number' && Number.isFinite(value[key]));

/** Canonical version-one storage/worker envelope. Missing fields are not mode
 * defaults; only capture of explicitly supported legacy telemetry fills them. */
export function validAutopilotReload(value) {
  return exactKeys(value, ['version', 'kap', 'navigation']) && value.version === 1
    && exactKeys(value.kap, KAP_FIELDS) && finiteFields(value.kap, KAP_FIELDS)
    && value.kap.kap_profile === 1 && value.kap.kap_sensor_fault === 0 && value.kap.kap_cws === 0 && validKapState(value.kap)
    && exactKeys(value.navigation, NAVIGATION_FIELDS) && finiteFields(value.navigation, NAVIGATION_FIELDS) && validNavigation(value.navigation);
}

/** No aliases to selected/live state survive a reload/persistence boundary. */
export function copyAutopilotReload(value) {
  if (!validAutopilotReload(value)) throw new TypeError('Invalid autopilot reload snapshot.');
  return Object.freeze({ version: 1,
    kap: Object.freeze(Object.fromEntries(KAP_FIELDS.map(key => [key, value.kap[key]]))),
    navigation: Object.freeze(Object.fromEntries(NAVIGATION_FIELDS.map(key => [key, value.navigation[key]]))),
  });
}

/** Capture acknowledged telemetry only. CWS is momentary and always released;
 * GS requires its recorded internal reference rather than an invented target. */
export function captureAutopilotReload(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state) || state.kap_profile !== 1 || state.kap_sensor_fault !== 0
    || !KAP_FIELDS.filter(key => !OPTIONAL_LEGACY.has(key)).every(key => Object.hasOwn(state, key))
    || !validKapState(state) || !finiteFields(state, NAVIGATION_FIELDS) || !validNavigation(state)
    || (state.kap_vertical === 2 && !Object.hasOwn(state, 'kap_gs_base_mps'))) return null;
  const kap = Object.fromEntries(KAP_FIELDS.map(key => [key, key === 'kap_cws' ? 0 : (state[key] ?? 0)]));
  const navigation = Object.fromEntries(NAVIGATION_FIELDS.map(key => [key, state[key]]));
  const value = { version: 1, kap, navigation };
  return validAutopilotReload(value) ? copyAutopilotReload(value) : null;
}
