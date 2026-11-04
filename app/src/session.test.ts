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
  const states: unknown[] = [], errors: string[] = [], statuses: string[] = [];
  const session = createSession({
    onState: (state) => states.push(state), onReady: () => {},
    onError: (error) => errors.push(error), onStatus: (status) => statuses.push(status),
  });
  t.after(() => { session.dispose(); globalThis.Worker = original; });
  return { session, states, errors, statuses };
}

const ready = { type: 'ready', trim: { throttle: 0.693, pitch_trim: 0.168, status: 1 } };
const state = {
  type: 'state', step: 3, t_s: 0.025, lat_rad: 0.87, lon_rad: 0.15,
  alt_msl_m: 396.24, roll_rad: 0, pitch_rad: 0.04, heading_rad: 1.43, tas_mps: 46.3,
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('rate changes are bounded worker messages and autopilot capture flushes deliberate neutral handoff while paused', t => {
  const { session, errors } = fixture(t);
  session.reset(); const worker = MockWorker.instances[0]; worker.emit(ready);
  for (const rate of [1, 1.5, 2, 5, 10]) session.setSimulationRate(rate);
  assert.deepEqual(worker.messages.filter(m => m.type === 'simulation-rate').map(m => m.rate), [1, 1.5, 2, 5, 10]);
  const count = worker.messages.length;
  for (const rate of [0, -1, 3, NaN, Infinity]) session.setSimulationRate(rate);
  assert.equal(worker.messages.length, count);
  session.input({ elevator: .2, aileron: .3, rudder: 0, throttle: .7, pilot_override: true });
  session.captureAutopilot(); assert.equal(worker.messages.length, count);
  session.input({ elevator: 0, aileron: -.109375, rudder: 0, throttle: .7, pilot_override: false });
  session.captureAutopilot();
  assert.equal(worker.messages.at(-2)!.type, 'input');
  assert.equal(worker.messages.at(-2)!.aileron, 0);
  assert.equal(worker.messages.at(-1)!.type, 'autopilot-capture');
  worker.emit({ ...state, simulation_rate: 5 });
  worker.emit({ ...state, simulation_rate: 3 });
  assert.equal(errors.length, 1);
});

test('regional worker messages reject a valid-shaped grid with inconsistent slot identity', t => {
  const { session, errors } = fixture(t);
  session.reset(); const worker = MockWorker.instances[0];
  const r = Math.PI / 180;
  worker.emit({ type: 'terrain-tile', grid: {
    version: 1, id: 'e850-n4925', slot: 0, width: 129, height: 129,
    west_rad: 8.25 * r, south_rad: 49.25 * r, east_rad: 8.5 * r, north_rad: 49.5 * r,
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
  session.reset(undefined, 'edfe', undefined, { ...location, lon_rad: 0 }); assert.equal(MockWorker.instances.length, count);
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
