#!/usr/bin/env python3
"""E1 study harness: JSBSim as a deterministic fixed-step dynamics core.

Standard library plus the ``jsbsim`` package only. JSBSim works in English
units internally; this harness converts once at its boundary and reports SI
(m, m/s, rad, s) unless a field name states another unit (``_deg``).
Simulation time is step-indexed (k * dt); no wall clock enters the dynamics.

Engine-behaviour evidence only: the bundled c172x model is a generic C172P
model, not the 172S/FR172 selected for Gefly.
"""

from __future__ import annotations

import argparse
import atexit
import contextlib
import hashlib
import json
import math
import os
import platform
import struct
import subprocess
import sys
import tempfile
import time

# --- Unit conversions (exact definitions) ---------------------------------

M_PER_FT = 0.3048                 # international foot, exact
MPS_PER_KT = 1852.0 / 3600.0      # international nautical mile per hour, exact
RAD_PER_DEG = math.pi / 180.0


def _finite(value: float, name: str = "value") -> float:
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite, got {value!r}")
    return value


def ft_to_m(ft: float) -> float:
    return _finite(ft, "ft") * M_PER_FT


def m_to_ft(m: float) -> float:
    return _finite(m, "m") / M_PER_FT


def kt_to_mps(kt: float) -> float:
    return _finite(kt, "kt") * MPS_PER_KT


def mps_to_kt(mps: float) -> float:
    return _finite(mps, "mps") / MPS_PER_KT


def deg_to_rad(deg: float) -> float:
    return _finite(deg, "deg") * RAD_PER_DEG


def rad_to_deg(rad: float) -> float:
    return _finite(rad, "rad") / RAD_PER_DEG


# --- Fixture configuration -------------------------------------------------

AIRCRAFT = "c172x"
IC_ALT_MSL_M = 1219.2       # 4000 ft
IC_TAS_MPS = 51.4           # about 100 kt
IC_HEADING_TRUE_RAD = 0.0
IC_LAT_RAD = deg_to_rad(50.0)
IC_LON_RAD = deg_to_rad(8.6)

# Properties hashed for determinism (JSBSim native units; hashed raw).
STATE_PROPERTIES = (
    "position/lat-geod-rad", "position/long-gc-rad", "position/h-sl-ft",
    "attitude/phi-rad", "attitude/theta-rad", "attitude/psi-rad",
    "velocities/u-fps", "velocities/v-fps", "velocities/w-fps",
    "velocities/p-rad_sec", "velocities/q-rad_sec", "velocities/r-rad_sec",
    "propulsion/engine/engine-rpm", "propulsion/engine/thrust-lbs",
    "fcs/elevator-pos-rad", "simulation/sim-time-sec",
)

INTEGRATOR_PROPERTIES = (
    "simulation/integrator/rate/rotational",
    "simulation/integrator/rate/translational",
    "simulation/integrator/position/rotational",
    "simulation/integrator/position/translational",
)
# FGPropagate::eIntegrateType ordering in JSBSim 1.3.x.
INTEGRATOR_NAMES = {0: "none", 1: "rect-euler", 2: "trapezoidal", 3: "adams-bashforth-2",
                    4: "adams-bashforth-3", 5: "adams-bashforth-4", 6: "buss-1",
                    7: "buss-2", 8: "local-linearization", 9: "adams-bashforth-5"}


_OUTPUT_DIR: tempfile.TemporaryDirectory | None = None


def _output_sink() -> str:
    """Harness-owned temporary directory for JSBSim's model-declared CSV output.

    ``c172x.xml`` declares a CSV ``<output>`` that JSBSim opens at ``run_ic()``
    even after ``disable_output()``; it would otherwise land in the working
    directory. The directory is removed at interpreter exit.
    """
    global _OUTPUT_DIR
    if _OUTPUT_DIR is None:
        _OUTPUT_DIR = tempfile.TemporaryDirectory(prefix="e1-jsbsim-out-")
        atexit.register(_OUTPUT_DIR.cleanup)
    return _OUTPUT_DIR.name


@contextlib.contextmanager
def native_stdout_to_stderr():
    """Route C/C++-level writes to fd 1 into stderr so stdout carries only results."""
    sys.stdout.flush()
    saved = os.dup(1)
    try:
        os.dup2(2, 1)
        yield
    finally:
        sys.stdout.flush()
        os.dup2(saved, 1)
        os.close(saved)


def _jsbsim():
    import jsbsim  # imported lazily so unit helpers work without the package
    return jsbsim


def make_fdm(dt_s: float, aircraft: str = AIRCRAFT):
    """Create a fresh, quiet FDM instance with a fixed step of ``dt_s`` seconds."""
    dt_s = _finite(dt_s, "dt_s")
    if dt_s <= 0.0:
        raise ValueError("dt_s must be positive")
    jsbsim = _jsbsim()
    jsbsim.FGJSBBase().debug_lvl = 0
    fdm = jsbsim.FGFDMExec(None)
    fdm.set_debug_level(0)
    if not fdm.load_model(aircraft):
        raise RuntimeError(f"cannot load aircraft {aircraft!r}")
    fdm.set_output_filename(0, os.path.join(_output_sink(), f"out-{id(fdm)}.csv"))
    fdm.disable_output()
    fdm.set_dt(dt_s)
    return fdm


def init_airborne(fdm, alt_msl_m=IC_ALT_MSL_M, tas_mps=IC_TAS_MPS,
                  heading_true_rad=IC_HEADING_TRUE_RAD):
    """Airborne IC with engine running, set from SI values."""
    fdm["ic/lat-geod-rad"] = IC_LAT_RAD
    fdm["ic/long-gc-rad"] = IC_LON_RAD
    fdm["ic/h-sl-ft"] = m_to_ft(alt_msl_m)
    fdm["ic/vt-kts"] = mps_to_kt(tas_mps)
    fdm["ic/psi-true-rad"] = _finite(heading_true_rad, "heading")
    fdm["ic/gamma-deg"] = 0.0
    fdm["fcs/mixture-cmd-norm"] = 1.0
    fdm["fcs/throttle-cmd-norm"] = 0.7
    fdm["propulsion/magneto_cmd"] = 3
    if not fdm.run_ic():
        raise RuntimeError("run_ic failed")
    fdm["propulsion/set-running"] = -1


def init_at_rest(fdm):
    """Bundled at-rest ground IC; engine off, parking brakes applied."""
    fdm.load_ic("reset_at_rest", True)
    fdm["fcs/throttle-cmd-norm"] = 0.0
    fdm["fcs/mixture-cmd-norm"] = 0.0
    fdm["propulsion/magneto_cmd"] = 0
    fdm["fcs/left-brake-cmd-norm"] = 1.0
    fdm["fcs/right-brake-cmd-norm"] = 1.0
    if not fdm.run_ic():
        raise RuntimeError("run_ic failed")


def scripted_inputs(t_s: float) -> dict[str, float]:
    """Deterministic F1 input profile (normalized controls) as a function of sim time."""
    return {
        "fcs/throttle-cmd-norm": 0.7 + 0.3 * (t_s >= 4.0),
        "fcs/elevator-cmd-norm": -0.1 * math.sin(0.5 * t_s),
        "fcs/aileron-cmd-norm": 0.05 * (5.0 <= t_s < 10.0),
    }


def state_vector(fdm) -> list[float]:
    return [fdm[p] for p in STATE_PROPERTIES]


def pack(values) -> bytes:
    return struct.pack(f"<{len(values)}d", *values)


def run_hashed(fdm, steps: int, dt_s: float, inputs=scripted_inputs) -> str:
    """Advance ``steps`` fixed steps applying ``inputs(t)``; hash every state."""
    digest = hashlib.sha256()
    for k in range(steps):
        for name, value in inputs(k * dt_s).items():
            fdm[name] = value
        if not fdm.run():
            raise RuntimeError(f"run() returned False at step {k}")
        digest.update(pack(state_vector(fdm)))
    return digest.hexdigest()


def fnv1a64_final(steps: int = 2400, dt_s: float = 1.0 / 120.0) -> tuple[str, list[float]]:
    """Same run as F1, hashed with FNV-1a 64 to compare with wasm/driver.cpp."""
    fdm = make_fdm(dt_s)
    init_airborne(fdm)
    h = 1469598103934665603
    values: list[float] = []
    for k in range(steps):
        for name, value in scripted_inputs(k * dt_s).items():
            fdm[name] = value
        if not fdm.run():
            raise RuntimeError(f"run() returned False at step {k}")
        values = state_vector(fdm)
        for byte in pack(values):
            h = ((h ^ byte) * 1099511628211) & 0xFFFFFFFFFFFFFFFF
    return f"{h:016x}", values


def determinism_digest(steps: int = 2400, dt_s: float = 1.0 / 120.0) -> str:
    fdm = make_fdm(dt_s)
    init_airborne(fdm)
    return run_hashed(fdm, steps, dt_s)


def fixture_determinism(steps: int = 2400, dt_s: float = 1.0 / 120.0) -> dict:
    a = determinism_digest(steps, dt_s)
    b = determinism_digest(steps, dt_s)
    child = subprocess.run(
        [sys.executable, os.path.abspath(__file__), "digest", "--steps", str(steps),
         "--dt", repr(dt_s)], capture_output=True, text=True, check=True,
    ).stdout.strip().splitlines()[-1]
    fdm = make_fdm(dt_s)
    init_airborne(fdm)
    run_hashed(fdm, steps // 2, dt_s)
    fdm.reset_to_initial_conditions(0)
    fdm["propulsion/set-running"] = -1
    reset = run_hashed(fdm, steps, dt_s)
    return {"steps": steps, "dt_s": dt_s, "fresh_a": a, "fresh_b": b,
            "child_process": child, "after_reset": reset,
            "fresh_identical": a == b == child, "reset_identical": reset == a}


def trim(fdm) -> dict:
    """JSBSim simple (longitudinal) trim; report status, controls and residuals."""
    jsbsim = _jsbsim()
    try:
        fdm["simulation/do_simple_trim"] = 1
        ok = True
    except jsbsim.TrimFailureError:
        ok = False
    return {
        "success": ok,
        "elevator_cmd_norm": fdm["fcs/elevator-cmd-norm"],
        "pitch_trim_cmd_norm": fdm["fcs/pitch-trim-cmd-norm"],
        "throttle_cmd_norm": fdm["fcs/throttle-cmd-norm"],
        "pitch_deg": rad_to_deg(fdm["attitude/theta-rad"]),
        "alpha_deg": rad_to_deg(fdm["aero/alpha-rad"]),
        "udot_mps2": ft_to_m(fdm["accelerations/udot-ft_sec2"]),
        "wdot_mps2": ft_to_m(fdm["accelerations/wdot-ft_sec2"]),
        "qdot_rad_s2": fdm["accelerations/qdot-rad_sec2"],
    }


def si_sample(fdm) -> dict:
    return {"alt_msl_m": ft_to_m(fdm["position/h-sl-ft"]),
            "tas_mps": ft_to_m(fdm["velocities/vtrue-fps"]),
            "pitch_deg": rad_to_deg(fdm["attitude/theta-rad"])}


def refinement_run(dt_s: float, sample_times_s=(10.0, 20.0, 30.0, 40.0)) -> dict:
    fdm = make_fdm(dt_s)
    init_airborne(fdm)
    trim_result = trim(fdm)
    elev0, thr0 = trim_result["elevator_cmd_norm"], trim_result["throttle_cmd_norm"]
    steps_per_s = round(1.0 / dt_s)
    samples = {}
    total = int(round(sample_times_s[-1] * steps_per_s))
    t_after = 0.0
    for k in range(total):
        t = k / steps_per_s
        climb = 5.0 <= t < 25.0
        fdm["fcs/throttle-cmd-norm"] = 1.0 if climb else thr0
        fdm["fcs/elevator-cmd-norm"] = elev0 - 0.05 if climb else elev0
        if not fdm.run():
            raise RuntimeError("run() returned False")
        t_after = (k + 1) / steps_per_s
        for ts in sample_times_s:
            if (k + 1) == int(round(ts * steps_per_s)):
                samples[ts] = si_sample(fdm)
    return {"dt_s": dt_s, "trim": trim_result, "samples": samples,
            "sim_time_s": fdm["simulation/sim-time-sec"], "t_end_s": t_after}


def consecutive_orders(samples_by_hz: dict, rates_hz, keys) -> tuple[dict, dict]:
    """Reference-free convergence estimate from runs at halving step sizes.

    d(dt) = max over sample times |y(dt) - y(dt/2)|; p = log2(d(dt) / d(dt/2)).
    Returns (differences keyed by coarse rate, orders keyed "coarse/fine").
    """
    diffs = {}
    for coarse, fine in zip(rates_hz[:-1], rates_hz[1:]):
        times = samples_by_hz[fine]
        diffs[coarse] = {key: max(abs(samples_by_hz[coarse][t][key] - times[t][key])
                                  for t in times) for key in keys}
    orders = {}
    for coarse, fine in zip(rates_hz[:-2], rates_hz[1:-1]):
        orders[f"{coarse}/{fine}"] = {
            k: (math.log2(diffs[coarse][k] / diffs[fine][k])
                if diffs[fine][k] > 0 and diffs[coarse][k] > 0 else None)
            for k in keys}
    return diffs, orders


def fixture_refinement(rates_hz=(60, 120, 240, 480)) -> dict:
    runs = {hz: refinement_run(1.0 / hz) for hz in rates_hz}
    ref = runs[rates_hz[-1]]
    errors = {}
    for hz in rates_hz[:-1]:
        err = {}
        for key in ("alt_msl_m", "tas_mps", "pitch_deg"):
            err[key] = max(abs(runs[hz]["samples"][t][key] - ref["samples"][t][key])
                           for t in ref["samples"])
        errors[hz] = err
    orders = {}
    for coarse, fine in zip(rates_hz[:-2], rates_hz[1:-1]):
        orders[f"{coarse}->{fine}"] = {
            k: (math.log2(errors[coarse][k] / errors[fine][k])
                if errors[fine][k] > 0 and errors[coarse][k] > 0 else None)
            for k in errors[coarse]}
    # With the finest run as reference, first order would appear as
    # log2(7/3) = 1.22 and log2(3) = 1.58 for this rate ladder.
    diffs, consecutive = consecutive_orders(
        {hz: runs[hz]["samples"] for hz in rates_hz}, rates_hz,
        ("alt_msl_m", "tas_mps", "pitch_deg"))
    return {"reference_hz": rates_hz[-1],
            "consecutive_diffs": diffs, "observed_order_consecutive": consecutive,
            "reference_samples": ref["samples"],
            "max_abs_diff_vs_reference": errors, "observed_order": orders,
            "trim_by_hz": {hz: runs[hz]["trim"] for hz in rates_hz},
            "end_sim_time_s": {hz: runs[hz]["sim_time_s"] for hz in rates_hz}}


def fixture_stationary(dt_s: float = 1.0 / 120.0, settle_s: float = 5.0,
                       observe_s: float = 25.0) -> dict:
    fdm = make_fdm(dt_s)
    init_at_rest(fdm)
    for _ in range(int(round(settle_s / dt_s))):
        fdm.run()
    r_earth_m = 6371008.8  # IUGG mean radius; adequate for a small drift estimate
    lat0, lon0 = fdm["position/lat-geod-rad"], fdm["position/long-gc-rad"]
    h0 = ft_to_m(fdm["position/h-agl-ft"])
    max_speed = 0.0
    for _ in range(int(round(observe_s / dt_s))):
        fdm.run()
        u, v, w = (ft_to_m(fdm[p]) for p in ("velocities/u-fps", "velocities/v-fps",
                                            "velocities/w-fps"))
        max_speed = max(max_speed, math.sqrt(u * u + v * v + w * w))
    dlat = fdm["position/lat-geod-rad"] - lat0
    dlon = (fdm["position/long-gc-rad"] - lon0) * math.cos(lat0)
    trim_fdm = make_fdm(dt_s)
    init_airborne(trim_fdm)
    return {"dt_s": dt_s, "settle_s": settle_s, "observe_s": observe_s,
            "horizontal_drift_m": r_earth_m * math.hypot(dlat, dlon),
            "height_agl_change_m": ft_to_m(fdm["position/h-agl-ft"]) - h0,
            "max_speed_mps": max_speed,
            "airborne_trim": trim(trim_fdm)}


def fixture_cost(steps: int = 12000, dt_s: float = 1.0 / 120.0, runs: int = 3) -> dict:
    """Repeat the single-run cost measurement; report each metric separately."""
    samples = [_cost_once(steps, dt_s) for _ in range(runs)]
    out = {"steps_per_run": steps, "dt_s": dt_s, "runs": runs, "per_run": samples}
    for metric in ("run_only", "with_io_hash"):
        us = [r[f"{metric}_us_per_step"] for r in samples]
        rtf = [r[f"{metric}_realtime_factor"] for r in samples]
        out[metric] = {"us_per_step_min": min(us), "us_per_step_max": max(us),
                       "realtime_factor_min": min(rtf), "realtime_factor_max": max(rtf)}
    return out


def _cost_once(steps: int, dt_s: float) -> dict:
    fdm = make_fdm(dt_s)
    init_airborne(fdm)
    t0 = time.perf_counter()
    for _ in range(steps):
        fdm.run()
    bare = (time.perf_counter() - t0) / steps
    fdm = make_fdm(dt_s)
    init_airborne(fdm)
    t0 = time.perf_counter()
    run_hashed(fdm, steps, dt_s)
    full = (time.perf_counter() - t0) / steps
    return {"run_only_us_per_step": bare * 1e6, "run_only_realtime_factor": dt_s / bare,
            "with_io_hash_us_per_step": full * 1e6,
            "with_io_hash_realtime_factor": dt_s / full}


def environment() -> dict:
    jsbsim = _jsbsim()
    fdm = make_fdm(1.0 / 120.0)
    integrators = {p.rsplit("/", 2)[-2] + "/" + p.rsplit("/", 1)[-1]:
                   INTEGRATOR_NAMES.get(int(fdm[p]), str(fdm[p]))
                   for p in INTEGRATOR_PROPERTIES}
    cpu = platform.processor() or ""
    try:
        with open("/proc/cpuinfo", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("model name"):
                    cpu = line.split(":", 1)[1].strip()
                    break
    except OSError:
        pass
    return {"jsbsim": jsbsim.__version__, "python": platform.python_version(),
            "platform": platform.platform(), "cpu": cpu, "cpus": os.cpu_count(),
            "aircraft": AIRCRAFT, "integrators": integrators}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("command", choices=("all", "digest", "fnv"))
    parser.add_argument("--steps", type=int, default=2400)
    parser.add_argument("--dt", type=float, default=1.0 / 120.0)
    parser.add_argument("--out", help="write JSON results to this path")
    args = parser.parse_args(argv)
    if args.command == "digest":
        with native_stdout_to_stderr():
            digest = determinism_digest(args.steps, args.dt)
        print(digest)
        return 0
    if args.command == "fnv":
        with native_stdout_to_stderr():
            digest, values = fnv1a64_final(args.steps, args.dt)
        print(f"fnv1a64 {digest}")
        for name, value in zip(STATE_PROPERTIES, values):
            print(name, value.hex())
        return 0
    t0 = time.perf_counter()
    with native_stdout_to_stderr():
        results = {"environment": environment(),
                   "F1_determinism": fixture_determinism(),
                   "F2_refinement": fixture_refinement(),
                   "F3_stationary_trim": fixture_stationary(),
                   "F4_cost": fixture_cost()}
    results["harness_wall_s"] = time.perf_counter() - t0
    text = json.dumps(results, indent=2, sort_keys=True, default=str)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
