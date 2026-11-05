import { resumeProblem } from '../../studies/e1-browser/sim/continue-flight.js';
import { DEFAULT_NAVIGATION } from '../../studies/e1-browser/sim/navigation.js';
import { ALTIMETER_FIELDS, COCKPIT_FIELDS, ENGINE_FIELDS, ENGINE_SWITCH_FIELDS, PITCH_TRIM_FIELDS, GROUND_FIELDS, CONTROL_FIELDS, STALL_FIELDS, COLLISION_FIELDS, TERRAIN_FIELDS, type FlightState } from './types.ts';
import { createKap140 } from '../../studies/e1-browser/sim/kap140.js';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createSession } from './session.ts';

class MockWorker {
  static instances: MockWorker[] = [];
  messages: Record<string, unknown>[] = [];
  terminated = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { preventDefault(): void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly url: string;
  readonly options: unknown;
  constructor(url: string, options: unknown) { this.url = url; this.options = options; MockWorker.instances.push(this); }
  postMessage(value: Record<string, unknown>) { this.messages.push(value); }
  terminate() { this.terminated = true; }
  emit(data: unknown) { this.onmessage?.({ data }); }
}

function fixture(t: TestContext) {
  const original = globalThis.Worker;
  globalThis.Worker = MockWorker as unknown as typeof Worker;
  MockWorker.instances = [];
  const states: unknown[] = [], errors: string[] = [], statuses: string[] = [], readies: unknown[] = [], tiles: unknown[] = [], removed: string[] = [], autopilotRejections: string[] = [];
  const session = createSession({
    onState: (state) => states.push(state), onReady: value => {readies.push(value);}, onTerrainTile: value => {tiles.push(value);}, onTerrainRemove: id => {removed.push(id);},
    onAutopilotRejected: message => autopilotRejections.push(message),
    onError: (error) => errors.push(error), onStatus: (status) => statuses.push(status),
  });
  t.after(() => { session.dispose(); globalThis.Worker = original; });
  return { session, states, errors, statuses, readies, tiles, removed, autopilotRejections };
}

const ready = { type: 'ready', trim: { throttle: 0.693, pitch_trim: 0.168, status: 1 } };
const state = {
  type: 'state', step: 3, t_s: 0.025, lat_rad: 0.87, lon_rad: 0.15,
  alt_msl_m: 396.24, roll_rad: 0, pitch_rad: 0.04, heading_rad: 1.43, tas_mps: 46.3,
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('rate changes are bounded worker messages and autopilot capture flushes deliberate neutral handoff while paused', t => {
  const { session, errors, autopilotRejections } = fixture(t);
  assert.equal(session.captureAutopilot(), false, 'not ready cannot dispatch capture');
  session.reset(); const worker = MockWorker.instances[0]; worker.emit(ready);
  for (const rate of [1, 1.5, 2, 5, 10]) session.setSimulationRate(rate);
  assert.deepEqual(worker.messages.filter(m => m.type === 'simulation-rate').map(m => m.rate), [1, 1.5, 2, 5, 10]);
  const count = worker.messages.length;
  for (const rate of [0, -1, 3, NaN, Infinity]) session.setSimulationRate(rate);
  assert.equal(worker.messages.length, count);
  session.input({ elevator: .2, aileron: .3, rudder: 0, throttle: .7, pilot_override: true });
  assert.equal(session.captureAutopilot(), false); assert.equal(worker.messages.length, count);
  session.input({ elevator: 0, aileron: -.109375, rudder: 0, throttle: .7, pilot_override: false });
  assert.equal(session.captureAutopilot(), true);
  assert.equal(worker.messages.at(-2)!.type, 'input');
  assert.equal(worker.messages.at(-2)!.aileron, 0);
  assert.equal(worker.messages.at(-1)!.type, 'autopilot-capture');
  worker.emit({type: 'autopilot-rejected', message: 'Release manual flight input before engaging autopilot.'});
  worker.emit({type: 'autopilot-rejected', message: 42});
  assert.deepEqual(autopilotRejections, ['Release manual flight input before engaging autopilot.']);
  assert.deepEqual(errors, [], 'command rejection does not stop the flight');
  worker.emit({ ...state, simulation_rate: 5 });
  worker.emit({ ...state, simulation_rate: 3 });
  assert.equal(errors.length, 1);
});

test('regional worker messages accept expanded edge slots and reject inconsistent identity', t => {
  const { session, errors, tiles } = fixture(t);
  session.reset(); const worker = MockWorker.instances[0];
  const r = Math.PI / 180;
  for (const [id, slot, west, south] of [['e600-n4700', 0, 6, 47], ['e1375-n5150', 607, 13.75, 51.5]] as const) {
    worker.emit({ type: 'terrain-tile', grid: { version: 1, id, slot, width: 129, height: 129,
      west_rad: west * r, south_rad: south * r, east_rad: (west + .25) * r, north_rad: (south + .25) * r,
      physical_m: new Float64Array(129 * 129).fill(100), geoid_m: new Float64Array(129 * 129).fill(48) } });
  }
  assert.equal(tiles.length, 2); assert.deepEqual(errors, []);
  worker.emit({ type: 'terrain-tile', grid: {
    version: 1, id: 'e625-n4700', slot: 0, width: 129, height: 129,
    west_rad: 6 * r, south_rad: 47 * r, east_rad: 6.25 * r, north_rad: 47.25 * r,
    physical_m: new Float64Array(129 * 129).fill(100), geoid_m: new Float64Array(129 * 129).fill(48),
  } });
  assert.equal(errors.length, 1); assert(worker.terminated);
});

test('ground collision latches the exact stopped frame and blocks controls/resume until fresh restart', t => {
  const { session, states, errors, statuses } = fixture(t);
  session.start(); const worker = MockWorker.instances[0]; worker.emit(ready);
  assert.equal(worker.messages[0].ground_collision, true);
  const impact = { ...state, collision_mask: 16, collision_step: state.step,
    collision_t_s: state.t_s, collision_down_mps: 4, collision_groundspeed_mps: 28 };
  worker.emit(impact);
  assert.equal(statuses.at(-1), 'Ground collision');
  assert.equal((states.at(-1) as Record<string, number>).collision_mask, 16);
  const messages = worker.messages.length;
  session.start(); session.input({ elevator: 1, aileron: 0, rudder: 0, throttle: 1 });
  session.setAutopilot(2); session.setAltimeter(100000);
  assert.equal(worker.messages.length, messages);
  session.pause(); assert.equal(statuses.at(-1), 'Ground collision');
  worker.emit({ ...impact }); assert.deepEqual(errors, []);
  worker.emit({ ...impact, alt_msl_m: impact.alt_msl_m - 1 });
  assert.equal(errors.length, 1); assert.equal(worker.terminated, true);
  session.reset(); const replacement = MockWorker.instances.at(-1)!;
  replacement.emit(ready); replacement.emit(state); session.start();
  assert.equal(replacement.messages.at(-1)?.type, 'run');
});

test('ground collision metadata rejects partial groups, impossible zero identities and disappearing latches', t => {
  const { session, states, errors } = fixture(t);
  session.start(); const worker = MockWorker.instances[0]; worker.emit(ready);
  worker.emit({ ...state, collision_mask: 16, collision_step: 0, collision_t_s: 0,
    collision_down_mps: 4, collision_groundspeed_mps: 28 });
  assert.equal(states.length, 0); assert.equal(errors.length, 1);
  session.reset(); const replacement = MockWorker.instances.at(-1)!; replacement.emit(ready);
  const impact = { ...state, collision_mask: 16, collision_step: state.step,
    collision_t_s: state.t_s, collision_down_mps: -2, collision_groundspeed_mps: 28 };
  replacement.emit(impact);
  replacement.emit({ ...state, collision_mask: 0, collision_step: 0, collision_t_s: 0,
    collision_down_mps: 0, collision_groundspeed_mps: 0 });
  assert.equal(states.length, 1); assert.equal(errors.length, 2);
});

test('session accepts complete spatial-airflow telemetry including warnings above one', t => {
  const { session, states, errors } = fixture(t); session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const airflow = { aero_u_mps: 30, aero_v_mps: -2, aero_w_mps: 8, aero_p_radps: .2,
    aero_q_radps: -.1, aero_r_radps: .05, cg_structural_x_m: 1.05, cg_structural_y_m: .01,
    cg_structural_z_m: .93, aero_alpha_rad: .28, aero_alpha_max_rad: .28,
    stall_warning_norm: 1.5, stall_hysteresis_norm: 1 };
  worker.emit({ ...state, ...airflow });
  assert.equal((states[0] as Record<string, number>).stall_warning_norm, 1.5);
  assert.equal((states[0] as Record<string, number>).cg_structural_x_m, 1.05);
  worker.emit({ ...state, ...airflow, aero_alpha_max_rad: 0 });
  assert.equal(states.length, 1); assert.equal(errors.length, 1);
});

test('session forwards only complete finite control telemetry and rejects partial groups', t => {
  const { session, states, errors } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const controls = { throttle_norm: .7, aileron_cmd_norm: -.45, elevator_cmd_norm: .35,
    rudder_cmd_norm: -.35, aileron_rad: -.12, right_aileron_rad: .08, rudder_rad: -.14 };
  worker.emit({ ...state, ...controls, injected_extra: 5 });
  assert.equal((states[0] as Record<string, number>).throttle_norm, .7);
  assert.equal((states[0] as Record<string, number>).right_aileron_rad, .08);
  assert.equal(Object.hasOwn(states[0] as object, 'injected_extra'), false);
  worker.emit({ ...state, throttle_norm: .7 });
  assert.equal(states.length, 1); assert.equal(errors.length, 1);
});

test('starts a real module worker, waits for ready and sends trimmed input before run', (t) => {
  const { session, errors, states } = fixture(t);
  session.start(); session.start();
  assert.equal(MockWorker.instances.length, 1);
  const worker = MockWorker.instances[0];
  assert.equal(worker.url, '/studies/e1-browser/sim/worker.js');
  assert.deepEqual(worker.options, { type: 'module' });
  assert.equal(worker.messages[0].type, 'init');
  assert.equal(worker.messages[0].dt_s, 1 / 120);
  assert.equal(worker.messages.length, 1);
  worker.emit(ready);
  assert.equal(worker.messages[1].type, 'input');
  assert.equal(worker.messages[1].throttle, 0.693);
  assert.equal(worker.messages[2].type, 'run');
  worker.emit(state);
  assert.equal(states.length, 1);
  assert.equal(Object.hasOwn(states[0] as object, 'type'), false);
  assert.deepEqual(errors, []);
});

test('pause during loading prevents auto-run; resume and reset preserve intent', (t) => {
  const { session } = fixture(t);
  session.start();
  const old = MockWorker.instances[0];
  session.pause(); old.emit(ready);
  assert.equal(old.messages.filter((m) => m.type === 'run').length, 0);
  session.start();
  assert.equal(old.messages.at(-1)?.type, 'run');
  session.reset();
  assert.equal(old.terminated, true);
  const replacement = MockWorker.instances[1];
  old.emit({ type: 'error', message: 'late stale event' });
  replacement.emit(ready);
  assert.equal(replacement.messages.at(-1)?.type, 'run');
  session.pause(); session.reset();
  const pausedReplacement = MockWorker.instances[2];
  pausedReplacement.emit(ready);
  assert.equal(pausedReplacement.messages.some((m) => m.type === 'run'), false);
});

test('high-frequency inputs coalesce to the latest immutable snapshot and stop while paused', async (t) => {
  const { session } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0];
  worker.emit(ready); worker.emit(state);
  const initial = worker.messages.length;
  for (let i = 0; i < 100; i++) {
    session.input({ elevator: i / 100, aileron: 0.2, rudder: -0.1, throttle: 0.8 });
  }
  const final = { elevator: -0.4, aileron: 0.5, rudder: 0, throttle: 0.9 };
  session.input(final); final.elevator = 1;
  assert.equal(worker.messages.length, initial);
  await sleep(70);
  const inputs = worker.messages.slice(initial);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].type, 'input');
  assert.equal(inputs[0].step, 3);
  assert.equal(inputs[0].elevator, -0.4);
  session.pause();
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: 0.5 });
  const pausedCount = worker.messages.length;
  await sleep(70);
  assert.equal(worker.messages.length, pausedCount);
});

test('invalid numerical state stops the worker and reports failure without a fallback', (t) => {
  const { session, errors, states } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0];
  worker.emit(ready); worker.emit({ ...state, tas_mps: NaN });
  assert.equal(worker.terminated, true);
  assert.equal(states.length, 0);
  assert.match(errors[0], /invalid state/);
});

test('invalid controls and worker-load failures are visible; disposed sessions ignore further work', (t) => {
  const { session, errors } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0];
  worker.onerror?.({ preventDefault() {} });
  assert.match(errors[0], /just build-flight-engine/);
  session.start();
  session.input({ elevator: 0, aileron: Infinity, rudder: 0, throttle: 0.5 });
  assert.match(errors[1], /Control input must be finite/);
  session.dispose(); session.start(); session.reset();
  assert.equal(MockWorker.instances.length, 2);
});

test('altimeter setting crosses the worker boundary while paused without resuming flight', (t) => {
  const { session } = fixture(t); session.reset();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const before = worker.messages.length;
  for (const setting of [NaN, Infinity, 79_999, 110_001]) session.setAltimeter(setting);
  assert.equal(worker.messages.length, before);
  session.setAltimeter(99_500);
  assert.deepEqual(worker.messages.at(-1), { type: 'altimeter', setting_pa: 99_500 });
  assert.equal(worker.messages.some((message) => message.type === 'run'), false);
  session.dispose(); const count = worker.messages.length;
  session.setAltimeter(101_325); assert.equal(worker.messages.length, count);
});

test('pressure indications are copied as a complete finite group; partial pressure state fails', (t) => {
  const { session, states, errors } = fixture(t); session.reset();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const air = { p_static_pa: 96_000, altimeter_setting_pa: 101_325, altimeter_indicated_m: 450,
    altimeter_qnh_pa: 101_325, altimeter_qfe_pa: 96_000, altimeter_qfe_datum_m: 396.24 };
  const message = { ...state, ...air }; worker.emit(message);
  assert.equal((states[0] as typeof message).p_static_pa, air.p_static_pa);
  message.altimeter_setting_pa = 88_000;
  assert.equal((states[0] as typeof message).altimeter_setting_pa, 101_325);
  worker.emit({ ...state, p_static_pa: 96_000 });
  assert.match(errors[0], /invalid state/);
});

test('flap and wheel-brake targets cross the coalesced worker boundary without gain changes', async (t) => {
  const { session } = fixture(t); session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready); worker.emit(state);
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: .7, flap_norm: 1/3, brake_norm: 1 });
  await sleep(70);
  assert.equal(worker.messages.at(-1)?.flap_norm, 1/3);
  assert.equal(worker.messages.at(-1)?.brake_norm, 1);
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: .7, flap_norm: 1/3, brake_norm: 0 });
  await sleep(70); assert.equal(worker.messages.at(-1)?.brake_norm, 0);
});

test('partial cockpit snapshots cannot enable secondary controls or display invalid readouts', (t) => {
  const { session, states, errors } = fixture(t); session.reset();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  worker.emit({ ...state, flap_rad: 0, brake_left_norm: 0 });
  assert.equal(states.length, 0); assert.match(errors[0], /invalid state/);
});

test('autopilot capture/disconnect messages do not start paused physics or invent a heading', (t) => {
  const { session } = fixture(t); session.reset(); const worker=MockWorker.instances[0];worker.emit(ready);
  session.setAutopilot(2); assert.deepEqual(worker.messages.at(-1), { type:'autopilot', mode:2 });
  session.setAutopilot(2,-Math.PI/2);
  assert.equal(worker.messages.at(-1)?.target_heading_rad, Math.PI*1.5);
  session.setAutopilot(0); assert.deepEqual(worker.messages.at(-1), {type:'autopilot',mode:0});
  const count=worker.messages.length;session.setAutopilot(2,NaN);assert.equal(worker.messages.length,count);
  assert.equal(worker.messages.some(message=>message.type==='run'),false);
});

test('partial engine/autopilot telemetry cannot enable controls', (t) => {
  const {session,states,errors}=fixture(t);session.reset();const worker=MockWorker.instances[0];worker.emit(ready);
  worker.emit({...state,ap_mode:1,mixture_norm:.5});assert.equal(states.length,0);assert.match(errors[0],/invalid state/);
});

test('trim is coalesced with inputs, copied atomically, and partial telemetry stops flight', async (t) => {
  const { session, states, errors } = fixture(t); session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const trim = { pitch_trim_norm: -.2, pitch_trim_initial_norm: .168, elevator_rad: -.05 };
  const message = { ...state, ...trim }; worker.emit(message);
  message.pitch_trim_norm = .9;
  assert.equal(states[0].pitch_trim_norm, -.2);
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: .7, pitch_trim_norm: -.2 });
  await sleep(70);
  assert.equal(worker.messages.at(-1)?.pitch_trim_norm, -.2);
  session.pause(); const count = worker.messages.length;
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: .7, pitch_trim_norm: .2 });
  await sleep(70); assert.equal(worker.messages.length, count, 'paused trim inputs cannot advance or alter worker');
  worker.emit({ ...state, pitch_trim_norm: -.2 });
  assert.match(errors[0], /invalid state/);
});

test('landing preset is explicit and ground telemetry is atomic', (t) => {
  const { session, states, errors } = fixture(t); session.reset('banked');
  const worker = MockWorker.instances[0];
  assert.equal(worker.messages[0].landing_preset, 'banked');
  worker.emit(ready);
  worker.emit({ ...state, ground_agl_m: 3 });
  assert.equal(states.length, 0); assert.match(errors[0], /invalid state/);
  session.reset();
  assert.equal(MockWorker.instances.at(-1)!.messages[0].landing_preset, undefined);
});

test('paused flight commands are staged and sent before physics resumes', async (t) => {
  const { session } = fixture(t); session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready); worker.emit(state);
  session.pause(); const before = worker.messages.length;
  session.input({ elevator: .2, aileron: -.1, rudder: .3, throttle: .4,
    flap_norm: 2 / 3, pitch_trim_norm: -.2, mixture_norm: .6, mixture_auto: false });
  await sleep(70); assert.equal(worker.messages.length, before);
  session.start();
  const input = worker.messages.at(-2)!;
  assert.equal(input.type, 'input'); assert.equal(worker.messages.at(-1)!.type, 'run');
  assert.equal(input.flap_norm, 2 / 3); assert.equal(input.pitch_trim_norm, -.2);
  assert.equal(input.mixture_norm, .6); assert.equal(input.throttle, .4);
});

test('actual applied flap command is optional but must be finite and normalized', (t) => {
  const { session, states, errors } = fixture(t); session.reset();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const cockpit = { cas_mps: 40, turn_rate_radps: 0, flap_rad: .1,
    brake_left_norm: 0, brake_right_norm: 0, on_ground: 0 };
  worker.emit({ ...state, ...cockpit, flap_command_norm: 2 / 3 });
  assert.equal(states[0].flap_command_norm, 2 / 3);
  worker.emit({ ...state, ...cockpit, flap_command_norm: 1.01 });
  assert.match(errors[0], /invalid state/);
});

test('engine switch command waits for resume and actual running telemetry is atomic', async t => {
  const { session, states, errors } = fixture(t); session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  worker.emit({ ...state, engine_running: 1, engine_command_on: 1 });
  assert.equal(states.at(-1).engine_running, 1);
  session.pause(); const count = worker.messages.length;
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: .7, engine_running: false });
  await sleep(70); assert.equal(worker.messages.length, count);
  session.start(); assert.equal(worker.messages.at(-2)?.engine_running, false);
  worker.emit({ ...state, engine_running: 0, engine_command_on: 1 });
  assert.equal(states.at(-1).engine_running, 0, 'requested ON does not imply combustion');
  worker.emit({ ...state, engine_running: 0 });
  assert.match(errors.at(-1)!, /invalid state/);
});

test('public terrain is explicit at init and complete physical/ellipsoid fields survive the session boundary', t => {
  const { session, states, errors } = fixture(t); session.reset();
  const worker = MockWorker.instances[0]; assert.equal(worker.messages[0].terrain, true); worker.emit(ready);
  const terrain = { terrain_profile: 1, terrain_height_msl_m: 115.25, terrain_geoid_m: 47.8, terrain_height_ellipsoid_m: 163.05 };
  worker.emit({ ...state, ...terrain }); assert.equal(states.at(-1).terrain_geoid_m, 47.8);
  worker.emit({ ...state, ...terrain, terrain_height_ellipsoid_m: 115.25 }); assert.match(errors.at(-1)!, /invalid state/);
  session.reset('normal'); assert.equal(MockWorker.instances.at(-1)!.messages[0].terrain, false);
});


test('KAP commands and NAV1 snapshots have bounded atomic session contracts', t => {
  const {session,states,errors}=fixture(t); session.start(); const worker=MockWorker.instances[0]; worker.emit(ready);
  assert.equal(worker.messages[0].kap140,true);
  const sensors={t_s:0,dt_s:1/120,heading_rad:1,physical_altitude_m:1000,pressure_altitude_m:1000,vertical_speed_mps:0,
    nav:{valid:false,kind:0 as const,cdi_norm:0,course_rad:0,gs_valid:false,gs_norm:0}};
  const fields=createKap140(sensors).snapshot(sensors);
  worker.emit({...state,...fields,radio_nav_active_khz:113800,radio_obs_deg:90,radio_demo_enabled:1});
  assert.equal((states.at(-1) as Record<string,number>).kap_profile,1);
  const count=worker.messages.length;
  session.setKap140({action:'heading',value:NaN}); session.setNavigation({radio_nav_active_khz:113801,radio_obs_deg:0,radio_demo_enabled:0});
  assert.equal(worker.messages.length,count);
  session.setKap140({action:'select-altitude',value:1200}); assert.deepEqual(worker.messages.at(-1),{type:'kap140',command:{action:'select-altitude',value:1200}});
  session.setNavigation({radio_nav_active_khz:113800,radio_obs_deg:180,radio_demo_enabled:1});
  assert.equal((worker.messages.at(-1)!.config as Record<string,number>).radio_obs_deg,180);
  worker.emit({...state,...fields,radio_obs_deg:NaN}); assert.match(errors.at(-1)!,/invalid state/);
});
test('partial KAP data cannot be accepted as current autopilot state', t => {
  const {session,errors}=fixture(t); session.start(); const worker=MockWorker.instances[0]; worker.emit(ready);
  worker.emit({...state,kap_profile:1,kap_engaged:1}); assert.match(errors.at(-1)!,/invalid state/);
});


test('altitude alert extension is optional atomic data, not an invented zero event', t => {
  const {session,states,errors}=fixture(t); session.start(); const worker=MockWorker.instances[0]; worker.emit(ready);
  worker.emit({...state,kap_alert_state:1,kap_alert_sequence:2});
  assert.equal((states.at(-1) as Record<string,number>).kap_alert_sequence,2);
  worker.emit({...state,kap_alert_state:1}); assert.match(errors.at(-1)!,/invalid state/);
});

test('runway start uses real terrain, zero-speed IC and brake hold without inherited EDDF approach setup', t => {
  const {session,errors}=fixture(t);
  const runway={airport:'EDFE',runway:'26',lat_rad:.872,lon_rad:.15,heading_rad:4.64};
  session.reset(undefined,'eddf-ils',runway);
  const worker=MockWorker.instances[0],init=worker.messages[0];
  assert.equal(init.runway_start,true); assert.equal(init.terrain,true); assert.equal(init.streaming_terrain,true);
  assert.equal(init.landing_preset,undefined); assert.equal(init.navigation,undefined);
  assert.equal((init.ic as Record<string,number>).tas_mps,0);
  runway.heading_rad=1; assert.equal((init.ic as Record<string,number>).heading_rad,4.64);
  worker.emit({...ready,trim:{throttle:0,pitch_trim:0,status:0}});session.start();
  const input=worker.messages.find(m=>m.type==='input')!;
  assert.equal(input.brake_norm,1);assert.equal(input.throttle,0);assert.deepEqual(errors,[]);
  const count=MockWorker.instances.length;
  session.reset(undefined,'edfe',{...runway,runway:'00'});assert.equal(MockWorker.instances.length,count);
  session.reset(undefined,'edfe');assert.equal(MockWorker.instances.at(-1)!.messages[0].runway_start,undefined);
});

test('saved regional location starts paused through native airborne or settled ground initialization', t => {
  const { session } = fixture(t);
  session.start(); const old = MockWorker.instances[0]; old.emit(ready);
  const location = { version: 1 as const, lat_rad: 49.87 * Math.PI / 180, lon_rad: 8.65 * Math.PI / 180, alt_msl_m: 900, heading_rad: 2.5, mode: 'airborne' as const };
  session.reset(undefined, 'eddf-ils', undefined, location);
  const restored = MockWorker.instances.at(-1)!; const ic = restored.messages[0].ic as Record<string, number>;
  assert.equal(ic.lat_rad, location.lat_rad); assert.equal(ic.lon_rad, location.lon_rad); assert.equal(ic.alt_msl_m, 900); assert.equal(ic.heading_rad, 2.5);
  assert.equal(restored.messages[0].terrain, true); assert.equal(restored.messages[0].streaming_terrain, true); assert.equal(restored.messages[0].runway_start, undefined);
  restored.emit(ready); assert(!restored.messages.some(m => m.type === 'run'));
  location.alt_msl_m = 1200; assert.equal(ic.alt_msl_m, 900);
  session.reset(undefined, 'edfe', undefined, { ...location, mode: 'ground' });
  const ground = MockWorker.instances.at(-1)!; assert.equal(ground.messages[0].runway_start, true); assert.equal((ground.messages[0].ic as Record<string, number>).tas_mps, 0);
  ground.emit(ready); session.start(); const input = ground.messages.find(m => m.type === 'input')!; assert.equal(input.brake_norm, 1); assert.equal(input.throttle, .693);
  const count = MockWorker.instances.length;
  session.reset(undefined, 'edfe', undefined, { ...location, lon_rad: 4 }); assert.equal(MockWorker.instances.length, count);
  session.reset('hard', 'edfe', undefined, location); assert.equal(MockWorker.instances.length, count);
  session.reset(); assert.equal(MockWorker.instances.at(-1)!.messages[0].runway_start, undefined);
});

test('CWS release flushes the cached neutral controls before release even while paused', t => {
  const { session } = fixture(t); session.reset(); const worker = MockWorker.instances[0]; worker.emit(ready);
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: .7, pilot_override: false });
  session.setKap140({ action: 'cws', value: 0 });
  assert.equal(worker.messages.at(-2)!.type, 'input'); assert.equal(worker.messages.at(-2)!.pilot_override, false);
  assert.deepEqual(worker.messages.at(-1), { type: 'kap140', command: { action: 'cws', value: 0 } });
});

/** Complete synthetic boundary telemetry for ownership tests, not native fidelity. */
function continuationFrame() {
  const fields = Object.fromEntries([...ALTIMETER_FIELDS,...COCKPIT_FIELDS,...ENGINE_FIELDS,...ENGINE_SWITCH_FIELDS,...PITCH_TRIM_FIELDS,...GROUND_FIELDS,...CONTROL_FIELDS,...STALL_FIELDS,...COLLISION_FIELDS,...TERRAIN_FIELDS].map(key=>[key,0]));
  const sensors={t_s:10,dt_s:1/120,heading_rad:1,physical_altitude_m:1000,pressure_altitude_m:1000,vertical_speed_mps:0,
    nav:{valid:false,kind:0,cdi_norm:0,course_rad:0,gs_valid:false,gs_norm:0}};
  const frame = {...fields,...state,type:'state',step:1200,t_s:10,alt_msl_m:1000,tas_mps:40,
    p_static_pa:90000,altimeter_setting_pa:101325,altimeter_qnh_pa:101325,altimeter_qfe_pa:100000,
    manifold_pressure_pa:80000,oil_temp_k:350,egt_k:900,aero_alpha_max_rad:.3,aero_u_mps:40,
    prop_radps:200,mixture_norm:1,engine_running:1,engine_command_on:1,fuel_left_m3:.04,fuel_right_m3:.04,
    throttle_norm:.65,pitch_trim_norm:.168,pitch_trim_initial_norm:.168,terrain_profile:1,
    ...DEFAULT_NAVIGATION,...createKap140(sensors).snapshot(sensors)} as FlightState;
  assert.equal(resumeProblem(frame),null);return frame;
}
test('continuation commits only after ready and actual state, then forwards future state and errors', async t=>{
  const f=fixture(t);f.session.reset();const old=MockWorker.instances[0];old.emit(ready);old.emit(state);
  const selected=continuationFrame(), promise=f.session.restoreFromReview(selected), candidate=MockWorker.instances[1];
  selected.alt_msl_m=2000;assert.equal((candidate.messages[0].resume_state as FlightState).alt_msl_m,1000,'request is an immutable copy');
  assert(!old.terminated);const originalCount=f.states.length;candidate.emit(ready);
  assert(!old.terminated);assert.equal(f.readies.length,1,'candidate ready is staged');
  f.session.start();assert(!old.messages.some(m=>m.type==='run'),'busy continuation cannot restart old native flight');
  candidate.emit(continuationFrame());const restored=await promise;assert.equal(restored.t_s,10);assert(old.terminated);
  assert.equal(f.readies.length,2);assert.equal(f.states.length,originalCount+1);
  candidate.emit({...continuationFrame(),step:1201,t_s:10+1/120});assert.equal(f.states.length,originalCount+2,'committed worker is no longer treated as staging');
  f.session.start();assert.equal(candidate.messages.at(-1)!.type,'run');
  const input=candidate.messages.find(m=>m.type==='input')!;assert.equal(input.throttle,.65);assert.equal(input.pitch_trim_norm,.168);
  candidate.emit({type:'error',message:'post-commit failure'});assert(candidate.terminated);assert.match(f.errors.at(-1)!,/post-commit failure/);
});
test('failed candidate and malformed first state preserve the old ready session and its controls',async t=>{
  const f=fixture(t);f.session.reset();const old=MockWorker.instances[0];old.emit(ready);old.emit(state);
  f.session.input({elevator:.2,aileron:0,rudder:0,throttle:.8});
  const first=f.session.restoreFromReview(continuationFrame()), failure=assert.rejects(first,/native failure/);
  const candidate=MockWorker.instances.at(-1)!;candidate.emit({type:'error',message:'native failure'});await failure;
  assert(candidate.terminated&&!old.terminated);assert.deepEqual(f.errors,[]);assert.equal(f.readies.length,1);
  const second=f.session.restoreFromReview(continuationFrame()), rejected=assert.rejects(second,/invalid state/);
  const invalid=MockWorker.instances.at(-1)!;invalid.emit(ready);invalid.emit({...continuationFrame(),lat_rad:NaN});await rejected;
  assert(!old.terminated);f.session.start();const input=old.messages.find(m=>m.type==='input')!;assert.equal(input.elevator,.2);assert.equal(input.throttle,.8);
});
test('continuation accepts a safe earlier frame even after current live collision and handles state-before-ready',async t=>{
  const f=fixture(t);f.session.reset();const old=MockWorker.instances[0];old.emit(ready);
  old.emit({...state,collision_mask:16,collision_step:3,collision_t_s:.025,collision_down_mps:4,collision_groundspeed_mps:20});
  const pending=f.session.restoreFromReview(continuationFrame()), candidate=MockWorker.instances.at(-1)!;
  candidate.emit(continuationFrame());assert(!old.terminated);candidate.emit(ready);await pending;
  assert(old.terminated);f.session.start();assert.equal(candidate.messages.at(-1)!.type,'run');
});
test('continuation reset/dispose/timeout cancel candidate without allowing stale replies to commit',async t=>{
  const f=fixture(t);f.session.reset();const old=MockWorker.instances[0];old.emit(ready);
  const pending=f.session.restoreFromReview(continuationFrame()), cancelled=assert.rejects(pending,/restart/),candidate=MockWorker.instances.at(-1)!;
  f.session.reset();await cancelled;assert(candidate.terminated);const replacement=MockWorker.instances.at(-1)!;replacement.emit(ready);
  candidate.emit(ready);candidate.emit(continuationFrame());assert(!replacement.terminated);
  t.mock.timers.enable({apis:['setTimeout']});
  const timed=f.session.restoreFromReview(continuationFrame()), timedOut=assert.rejects(timed,/finish loading/), slow=MockWorker.instances.at(-1)!;
  t.mock.timers.tick(30001);await timedOut;assert(slow.terminated&&!replacement.terminated);
  const disposed=f.session.restoreFromReview(continuationFrame()), closed=assert.rejects(disposed,/session closed/),last=MockWorker.instances.at(-1)!;
  f.session.dispose();await closed;assert(last.terminated&&replacement.terminated);
});
test('unsupported or duplicate continuation never allocates an extra worker or resets live state',async t=>{
  const f=fixture(t);f.session.reset();MockWorker.instances[0].emit(ready);
  await assert.rejects(f.session.restoreFromReview(state),/telemetry|configuration/);assert.equal(MockWorker.instances.length,1);
  const pending=f.session.restoreFromReview(continuationFrame());await assert.rejects(f.session.restoreFromReview(continuationFrame()),/already/);assert.equal(MockWorker.instances.length,2);
  const rejected=assert.rejects(pending,/native failure/);MockWorker.instances[1].emit({type:'error',message:'native failure'});await rejected;
});


test('collision continuation preserves the native worker/frame and unlocks only an exact explicit acknowledgement', async t => {
  const { session, states, errors, statuses } = fixture(t); session.start();
  const worker = MockWorker.instances[0]; worker.emit(ready);
  const impact = { ...state, collision_mask: 16, collision_step: state.step, collision_t_s: state.t_s,
    collision_down_mps: 4, collision_groundspeed_mps: 28 };
  worker.emit(impact); const pending = session.continueAfterCollision();
  assert.deepEqual(worker.messages.at(-1), { type: 'collision-continue', step: state.step });
  const clear = { ...impact, collision_mask: 0, collision_step: 0, collision_t_s: 0, collision_down_mps: 0, collision_groundspeed_mps: 0 };
  worker.emit({ type: 'collision-continued', collision_step: state.step, state: clear });
  const continued = await pending; assert.equal(continued.step, impact.step); assert.equal(continued.alt_msl_m, impact.alt_msl_m);
  assert.equal(MockWorker.instances.length, 1); assert.equal(worker.terminated, false); assert.equal(statuses.at(-1), 'Paused');
  assert.equal((states[0] as FlightState).collision_mask, 16, 'the prior impact snapshot remains unchanged');
  session.start(); assert.equal(worker.messages.at(-1)?.type, 'run');
  worker.emit({ ...clear, step: state.step + 1, t_s: state.t_s + 1/120 });
  assert.deepEqual(errors, []); assert.equal((states.at(-1) as FlightState).collision_mask, 0);
});

test('collision continuation rejects worker refusal and cancels on reset without unlocking a later flight', async t => {
  const { session, errors } = fixture(t); session.start(); const worker = MockWorker.instances[0]; worker.emit(ready);
  worker.emit({ ...state, collision_mask: 16, collision_step: state.step, collision_t_s: state.t_s,
    collision_down_mps: 4, collision_groundspeed_mps: 28 });
  let pending = session.continueAfterCollision(); worker.emit({ type: 'collision-continue-rejected', message: 'Contact unavailable' });
  await assert.rejects(pending, /Contact unavailable/); const count = worker.messages.length; session.start(); assert.equal(worker.messages.length, count);
  pending = session.continueAfterCollision(); const rejection = assert.rejects(pending, /cancelled/); session.reset(); await rejection;
  worker.emit({ type: 'collision-continued', collision_step: state.step, state }); assert.deepEqual(errors, []);
  assert.equal(MockWorker.instances.length, 2);
});

function worldGrid(col: number, row: number, slot: number) {
  const rad = Math.PI / 180;
  return { version: 1 as const, id: `world-c${col}-r${row}`, width: 129, height: 129, slot,
    source: 'global' as const, sha256: 'a'.repeat(64),
    west_rad: (-180 + col / 4) * rad, east_rad: (-180 + (col + 1) / 4) * rad,
    south_rad: (-90 + row / 4) * rad, north_rad: (-90 + (row + 1) / 4) * rad,
    physical_m: new Float64Array(129 * 129).fill(10), geoid_m: new Float64Array(129 * 129).fill(30) };
}
test('R-WORLD-11 world tile identity is independent of reused native slot and removals bound residency', t => {
  const f = fixture(t); f.session.reset(); const worker = MockWorker.instances[0];
  const first = worldGrid(424, 523, 0), second = worldGrid(425, 523, 0);
  worker.emit({ type: 'terrain-tile', grid: first });
  worker.emit({ type: 'terrain-remove', id: first.id });
  worker.emit({ type: 'terrain-tile', grid: second });
  assert.equal(f.tiles.length, 2); assert.deepEqual(f.removed, [first.id]); assert.deepEqual(f.errors, []);
  worker.emit({ type: 'terrain-remove', id: first.id });
  assert.equal(f.errors.length, 1, 'unknown removal cannot silently desynchronize the view');
});
test('R-WORLD-11 malformed world grids, unsupported pool slots and unremoved slot aliases fail closed', async t => {
  const base = worldGrid(424, 523, 0);
  for (const change of [{ slot: 9 }, { source: 'unknown' }, { id: 'world-c0-r0' },
    { east_rad: base.east_rad + .001 }, { sha256: 'bad' }, { masked: true }]) await t.test(JSON.stringify(change), t => {
      const f = fixture(t); f.session.reset(); MockWorker.instances[0].emit({ type: 'terrain-tile', grid: { ...base, ...change } });
      assert.equal(f.tiles.length, 0); assert.equal(f.errors.length, 1);
    });
  await t.test('reuse without removal', t => {
    const f = fixture(t); f.session.reset(); const worker = MockWorker.instances[0];
    worker.emit({ type: 'terrain-tile', grid: base }); worker.emit({ type: 'terrain-tile', grid: worldGrid(425, 523, 0) });
    assert.equal(f.tiles.length, 1); assert.equal(f.errors.length, 1);
  });
});
test('R-WORLD-11 world source quality is forwarded atomically and unknown quality cannot claim coverage', t => {
  const f = fixture(t); f.session.reset(); const worker = MockWorker.instances[0]; worker.emit(ready);
  worker.emit({ ...state, terrain_profile: 1, terrain_height_msl_m: 10, terrain_geoid_m: 30, terrain_height_ellipsoid_m: 40, terrain_source: 2 });
  assert.equal((f.states.at(-1) as FlightState).terrain_source, 2);
  worker.emit({ ...state, terrain_source: 2 });
  assert.equal(f.errors.length, 1, 'source alone is not a valid terrain snapshot');
});
test('R-WORLD-11 saved world position initializes the actual global terrain mode while paused', t => {
  const f = fixture(t); f.session.reset(); MockWorker.instances[0].emit(ready);
  const location = { version: 1 as const, lat_rad: 40.75 * Math.PI / 180, lon_rad: -74 * Math.PI / 180,
    alt_msl_m: 1200, heading_rad: 1, mode: 'airborne' as const };
  f.session.reset(undefined, 'edfe', undefined, location); const worker = MockWorker.instances.at(-1)!;
  assert.equal((worker.messages[0].ic as FlightState).lon_rad, location.lon_rad);
  assert.equal(worker.messages[0].streaming_terrain, true); worker.emit(ready);
  assert(!worker.messages.some(m => m.type === 'run'));
});
