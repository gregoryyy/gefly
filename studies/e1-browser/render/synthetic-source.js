// Synthetic state source for the E1 render pages (classic Web Worker).
//
// Speaks the frozen worker message contract v0 (studies/e1-browser/README.md):
// accepts init/input/run/pause/stop and emits ready/state/error, so a page can
// swap `new Worker("synthetic-source.js")` for code1's `../sim/worker.js`.
//
// It is NOT a flight model. It replays a kinematic, level racetrack circuit:
//   - starts at the init `ic` position/heading/height and flies the upwind leg
//     along `ic.heading_rad` (true), then turns 180 deg, flies the opposite
//     leg, turns 180 deg and repeats;
//   - constant `ic.tas_mps`, no wind (ground speed == TAS, track == heading);
//   - turns at a generic 3 deg/s "standard rate"; bank from the coordinated-turn
//     relation tan(roll) = V * omega / g, applied as a step at leg boundaries;
//   - pitch held at 0 rad; control inputs are recorded but do not change the path.
// None of these values is aircraft data; they only produce a plausible-looking
// motion for frame-pacing measurement.
//
// Worker URL query: ?circuit=left|right (default left), ?leg_m=<straight length>.
"use strict";
importScripts("geo.js");

const G_MPS2 = 9.80665;
const TURN_RATE_RADPS = (3 * Math.PI) / 180;
const params = new URLSearchParams(self.location.search);
const CIRCUIT = params.get("circuit") === "right" ? "right" : "left";
const LEG_M = Number(params.get("leg_m") || 3000);

let cfg = null;        // {dt_s, state_hz, ic, frame, radius_m, period_m}
let running = false;
let timer = null;
let step = 0;          // last emitted step index
let runEpochMs = 0;    // wall time corresponding to step 0 of the current run
let pendingInputs = []; // inputs not yet applied (sorted by step)
let lastInputWallMs = null;

function post(msg) { self.postMessage(msg); }

function fail(message) {
  post({ type: "error", message });
}

function finiteAll(obj, keys) {
  return keys.every((k) => Number.isFinite(obj[k]));
}

// Path position for along-track distance s (m) in the ENU frame anchored at ic.
// Returns {e, n, heading, turn} where turn is +1 (right), -1 (left) or 0.
function pathAt(s_m) {
  const { ic, radius_m, period_m } = cfg;
  const L = LEG_M, R = radius_m;
  const h0 = ic.heading_rad;
  const side = CIRCUIT === "right" ? 1 : -1;   // +1: turns clockwise seen from above
  const ux = Math.sin(h0), uy = Math.cos(h0);   // along-track unit (east, north)
  const vx = side * uy, vy = -side * ux;        // lateral unit toward the turn side
  let s = s_m % period_m;
  const halfTurn = Math.PI * R;
  if (s < L) {                                   // leg 1: from ic along h0
    return { e: ux * s, n: uy * s, heading: h0, turn: 0 };
  }
  s -= L;
  if (s < halfTurn) {                            // turn 1 about centre end1 + v*R
    const a = s / R;
    const cx = ux * L + vx * R, cy = uy * L + vy * R;
    return {
      e: cx - vx * R * Math.cos(a) + ux * R * Math.sin(a),
      n: cy - vy * R * Math.cos(a) + uy * R * Math.sin(a),
      heading: h0 + side * a, turn: side,
    };
  }
  s -= halfTurn;
  if (s < L) {                                   // leg 2: back along h0 + pi
    const sx = ux * L + 2 * vx * R, sy = uy * L + 2 * vy * R;
    return { e: sx - ux * s, n: sy - uy * s, heading: h0 + Math.PI, turn: 0 };
  }
  s -= L;
  const a = s / R;                               // turn 2 about centre v*R
  const cx = vx * R, cy = vy * R;
  return {
    e: cx + vx * R * Math.cos(a) - ux * R * Math.sin(a),
    n: cy + vy * R * Math.cos(a) - uy * R * Math.sin(a),
    heading: h0 + Math.PI + side * a, turn: side,
  };
}

function wrapHeading(h) {
  const t = 2 * Math.PI;
  return ((h % t) + t) % t;
}

function stateAt(stepIndex) {
  const t0 = performance.now();
  const t_s = stepIndex * cfg.dt_s;
  const p = pathAt(cfg.ic.tas_mps * t_s);
  const [lat_rad, lon_rad] = cfg.frame.enuToGeodetic(p.e, p.n, 0);
  while (pendingInputs.length && pendingInputs[0].step <= stepIndex) {
    lastInputWallMs = pendingInputs.shift().wall_ms;
  }
  const roll_rad = p.turn * cfg.bank_rad;   // right wing down positive
  const cost_us = (performance.now() - t0) * 1000;
  return {
    type: "state", step: stepIndex, t_s,
    lat_rad, lon_rad, alt_msl_m: cfg.ic.alt_msl_m,
    roll_rad, pitch_rad: 0, heading_rad: wrapHeading(p.heading),
    tas_mps: cfg.ic.tas_mps,
    last_input_wall_ms: lastInputWallMs,
    step_cost_us: cost_us,
  };
}

function tick() {
  if (!running) return;
  // Fixed-step clock: the step index follows wall time; emission rate does not
  // change dt_s. Only the latest state is posted.
  const target = Math.floor((performance.now() - runEpochMs) / (cfg.dt_s * 1000));
  if (target > step) {
    step = target;
    post(stateAt(step));
  }
}

function onInit(msg) {
  const ic = msg.ic || {};
  if (!Number.isFinite(msg.dt_s) || msg.dt_s <= 0 ||
      !finiteAll(ic, ["lat_rad", "lon_rad", "alt_msl_m", "heading_rad", "tas_mps"]) ||
      ic.tas_mps <= 0 || !(LEG_M > 0)) {
    fail("init: dt_s, ic.{lat_rad,lon_rad,alt_msl_m,heading_rad,tas_mps} must be finite; tas_mps, dt_s, leg_m > 0");
    return;
  }
  const state_hz = Number.isFinite(msg.state_hz) && msg.state_hz > 0 ? msg.state_hz : 60;
  const radius_m = ic.tas_mps / TURN_RATE_RADPS;
  cfg = {
    dt_s: msg.dt_s, state_hz, ic,
    frame: self.GeoWGS84.makeEnuFrame(ic.lat_rad, ic.lon_rad, ic.alt_msl_m),
    radius_m,
    period_m: 2 * LEG_M + 2 * Math.PI * radius_m,
    bank_rad: Math.atan((ic.tas_mps * TURN_RATE_RADPS) / G_MPS2),
  };
  step = 0;
  pendingInputs = [];
  lastInputWallMs = null;
  post({ type: "ready", build: { jsbsim_tag: null, emsdk: null, wasm_bytes: 0,
    synthetic: { circuit: CIRCUIT, leg_m: LEG_M, radius_m,
      bank_rad: cfg.bank_rad, period_s: cfg.period_m / ic.tas_mps } } });
}

self.onmessage = (ev) => {
  const msg = ev.data || {};
  try {
    switch (msg.type) {
      case "init": onInit(msg); break;
      case "input":
        if (!Number.isFinite(msg.step) || !Number.isFinite(msg.wall_ms)) {
          fail("input: step and wall_ms must be finite"); break;
        }
        pendingInputs.push({ step: msg.step, wall_ms: msg.wall_ms });
        pendingInputs.sort((a, b) => a.step - b.step);
        break;
      case "run":
        if (!cfg) { fail("run before init"); break; }
        if (running) break;
        running = true;
        runEpochMs = performance.now() - step * cfg.dt_s * 1000;
        timer = setInterval(tick, 1000 / cfg.state_hz);
        break;
      case "pause":
      case "stop":
        running = false;
        if (timer) clearInterval(timer);
        timer = null;
        if (msg.type === "stop") { cfg = null; step = 0; }
        break;
      default:
        fail(`unknown message type: ${String(msg.type)}`);
    }
  } catch (e) {
    fail(String(e && e.message || e));
  }
};
