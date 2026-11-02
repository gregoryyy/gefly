/** Frozen reference-chart facts, retaining source inches/lb at the diagram boundary.
 * These are not the loaded research aircraft's live mass/CG or accepted 172S data.
 */
import { C172P_CAS_SPEEDS } from './airspeed-markings.ts';
const point = (arm_in: number, weight_lb: number) => Object.freeze({ arm_in, weight_lb });
const POH_URL = 'https://www.glasscockpitaviation.com/wp-content/uploads/2022/07/cessna-n54829-poh.pdf';

export const C172P_CG_ENVELOPE = Object.freeze({
  label: '1982 C172P reference loading limits',
  normal: Object.freeze([point(35, 1500), point(47.3, 1500), point(47.3, 2400), point(39.5, 2400), point(35, 1950)]),
  utility: Object.freeze([point(35, 1500), point(40.5, 1500), point(40.5, 2100), point(36.5, 2100), point(35, 1950)]),
  source: Object.freeze({ url: POH_URL, figure: 'Figure 6-8; Section 2 CG limits',
    pdf_page: 105, printed_page: '6-14', text_pdf_page: 22, text_printed_page: '2-7',
    sha256: '5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c' }),
  limitations: 'Manufacturer reference only, not current model loading or selected-172S calibration. Normal maximum takeoff/landing weight is 2400 lb; utility is 2100 lb and requires unoccupied rear seats and baggage compartment. Other loading limits also apply. The 1500 lb chart floor is a display crop, not a certified minimum weight. Datum: lower front face of firewall. No live mass/CG point is available.',
});

/** Published load-factor limits and separate speed references, not a full V-n boundary. */
export const C172P_FLIGHT_ENVELOPE_REFERENCES = Object.freeze({
  label: '1982 C172P published flight-envelope limit references',
  normal: Object.freeze({ max_weight_lb: 2400,
    flaps_up: Object.freeze({ positive_g: 3.8, negative_g: -1.52 }),
    flaps_down: Object.freeze({ positive_g: 3.0 }) }),
  utility: Object.freeze({ max_weight_lb: 2100,
    flaps_up: Object.freeze({ positive_g: 4.4, negative_g: -1.76 }),
    flaps_down: Object.freeze({ positive_g: 3.0 }), va_kias: 102 }),
  maneuvering_category: 'normal',
  maneuvering: Object.freeze([
    Object.freeze({ weight_lb: 2400, va_kcas: 97, va_kias: 99 }),
    Object.freeze({ weight_lb: 2000, va_kcas: 91, va_kias: 92 }),
    Object.freeze({ weight_lb: 1600, va_kcas: 81, va_kias: 82 }),
  ]),
  speeds: C172P_CAS_SPEEDS,
  source: Object.freeze({ url: POH_URL, loadfactor_pdf_page: 23, loadfactor_printed_page: '2-8',
    speed_pdf_page: 19, speed_printed_page: '2-4',
    sha256: '5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c' }),
  limitations: 'Published fixed load-factor limits and separate speed-reference guides only, not a complete approved V-n operating envelope or current model operating point. Normal factors apply at 2400 lb; utility factors at 2100 lb. A negative flaps-down limit is not stated. Stall, negative-stall and gust boundaries are not modeled; do not join guides into an approved region or infer damage thresholds/design-margin allowances. Normal VA values are listed only at their published weights; utility VA is given only in KIAS, with no KCAS value inferred.',
});

const contact = (id: string, name: string, kind: 'wheel' | 'structure', x_in: number, y_in: number, z_in: number) =>
  Object.freeze({ id, name, kind, x_in, y_in, z_in });

export const C172P_GEAR_LAYOUT = Object.freeze({
  label: 'JSBSim v1.3.3 c172x contact geometry',
  contacts: Object.freeze([
    contact('nose', 'Nose wheel', 'wheel', -6.8, 0, -20),
    contact('left', 'Left main wheel', 'wheel', 58.2, -50.25, -18.46),
    contact('right', 'Right main wheel', 'wheel', 58.2, 50.25, -18.46),
    contact('tail', 'Tail contact', 'structure', 188, 0, 8),
    contact('left-tip', 'Left wingtip contact', 'structure', 43.2, -214.8, 59.4),
    contact('right-tip', 'Right wingtip contact', 'structure', 43.2, 214.8, 59.4),
  ]),
  frame: 'Structural frame in inches: +X aft, +Y right, +Z up; model datum, not aircraft CG.',
  source: Object.freeze({ url: 'https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml',
    sha256: 'b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840' }),
  limitations: 'Generic research-model geometry, not accepted C172S geometry or a damage envelope. Wheels use spring/damper and friction reactions; tail/tip points are structure contacts. Shown loads are modeled strut reactions, not component stress or safe-load limits.',
});
