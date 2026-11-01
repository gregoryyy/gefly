#!/usr/bin/env node
// Offline checks for geo.js and synthetic-source.js (no browser, no network).
// Usage: node studies/e1-browser/render/check-synthetic.mjs   (exit 0 = all passed)
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEG = Math.PI / 180;
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures += 1;
}

function loadWorker(query) {
  const posted = [];
  const ctx = {
    self: null, performance, setInterval: () => 0, clearInterval: () => {},
    URLSearchParams, Math, Number, String, RangeError,
    importScripts: (f) => vm.runInContext(readFileSync(path.join(HERE, f), "utf8"), ctx),
  };
  ctx.self = ctx;
  ctx.location = { search: query };
  ctx.postMessage = (m) => posted.push(m);
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(HERE, "synthetic-source.js"), "utf8"), ctx);
  return { ctx, posted };
}

// geo.js round trip and ENU sanity.
{
  const { ctx } = loadWorker("");
  const G = ctx.GeoWGS84;
  const f = G.makeEnuFrame(49.96 * DEG, 8.643 * DEG, 0);
  const [lat, lon, h] = f.enuToGeodetic(1234.5, -2345.6, 396.24);
  const [e, n, u] = f.geodeticToEnu(lat, lon, h);
  const err = Math.hypot(e - 1234.5, n + 2345.6, u - 396.24);
  check("ENU -> geodetic -> ENU round trip < 1 mm", err < 1e-3, `${err.toExponential(2)} m`);
  const [e2, n2] = f.geodeticToEnu(49.96 * DEG + 1e-4, 8.643 * DEG, 0);
  check("north offset maps to +n", n2 > 600 && Math.abs(e2) < 1e-3, `n=${n2.toFixed(2)} m`);
  let threw = false;
  try { G.geodeticToEcef(NaN, 0, 0); } catch { threw = true; }
  check("non-finite input rejected", threw);
}

const IC = { lat_rad: 49.96 * DEG, lon_rad: 8.643 * DEG, alt_msl_m: 396.24,
  heading_rad: 82 * DEG, tas_mps: 90 * 1852 / 3600 };

for (const circuit of ["left", "right"]) {
  const { ctx, posted } = loadWorker(`?circuit=${circuit}`);
  ctx.onmessage({ data: { type: "init", dt_s: 1 / 120, aircraft: "c172x", ic: IC, state_hz: 60 } });
  const ready = posted.find((m) => m.type === "ready");
  check(`${circuit}: ready posted`, !!ready);
  const syn = ready.build.synthetic;
  const periodSteps = Math.round(syn.period_s * 120);
  const s0 = ctx.stateAt(0);
  const frame = ctx.GeoWGS84.makeEnuFrame(IC.lat_rad, IC.lon_rad, IC.alt_msl_m);
  const keys = ["type", "step", "t_s", "lat_rad", "lon_rad", "alt_msl_m", "roll_rad", "pitch_rad",
    "heading_rad", "tas_mps", "last_input_wall_ms", "step_cost_us"];
  check(`${circuit}: state has exactly the contract v0 fields`,
    JSON.stringify(Object.keys(s0).sort()) === JSON.stringify(keys.slice().sort()));
  let maxStep = 0, minAlt = Infinity, maxAlt = -Infinity, prev = frame.geodeticToEnu(s0.lat_rad, s0.lon_rad, 0);
  let minLateral = Infinity, maxLateral = -Infinity;
  const ux = Math.sin(IC.heading_rad), uy = Math.cos(IC.heading_rad);
  for (let k = 1; k <= periodSteps; k++) {
    const s = ctx.stateAt(k);
    const p = frame.geodeticToEnu(s.lat_rad, s.lon_rad, 0);
    maxStep = Math.max(maxStep, Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    minAlt = Math.min(minAlt, s.alt_msl_m); maxAlt = Math.max(maxAlt, s.alt_msl_m);
    const lateral = p[0] * uy - p[1] * ux;            // + = right of initial track
    minLateral = Math.min(minLateral, lateral); maxLateral = Math.max(maxLateral, lateral);
    prev = p;
  }
  const expect = IC.tas_mps / 120;
  check(`${circuit}: ground distance per step ~ tas*dt`, Math.abs(maxStep - expect) < 0.01 * expect,
    `${maxStep.toFixed(4)} vs ${expect.toFixed(4)} m`);
  check(`${circuit}: level (constant alt_msl_m)`, minAlt === IC.alt_msl_m && maxAlt === IC.alt_msl_m);
  const end = ctx.stateAt(periodSteps);
  const closure = Math.hypot(...frame.geodeticToEnu(end.lat_rad, end.lon_rad, 0).slice(0, 2));
  check(`${circuit}: circuit closes`, closure < IC.tas_mps / 120 + 0.01, `${closure.toFixed(3)} m`);
  const turnStep = Math.round((syn.leg_m / IC.tas_mps + 10) * 120);   // 10 s into turn 1
  const t = ctx.stateAt(turnStep);
  const sign = circuit === "left" ? -1 : 1;
  check(`${circuit}: roll sign in turn (right wing down +)`, Math.sign(t.roll_rad) === sign,
    `${(t.roll_rad / DEG).toFixed(1)} deg`);
  check(`${circuit}: downwind on the ${circuit} side`,
    circuit === "left" ? minLateral < -1500 && maxLateral < 1 : maxLateral > 1500 && minLateral > -1,
    `lateral ${minLateral.toFixed(0)}..${maxLateral.toFixed(0)} m`);
  ctx.onmessage({ data: { type: "input", step: 10, wall_ms: 1234.5, elevator: 0, aileron: 0, rudder: 0, throttle: 0.5 } });
  check(`${circuit}: input for step s first echoed in state s+1`,
    ctx.stateAt(10).last_input_wall_ms === null && ctx.stateAt(11).last_input_wall_ms === 1234.5);
  posted.length = 0;
  ctx.onmessage({ data: { type: "init", dt_s: 1 / 120, ic: { ...IC, tas_mps: NaN } } });
  check(`${circuit}: non-finite init rejected`, posted.some((m) => m.type === "error"));
}

console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exitCode = failures ? 1 : 0;
