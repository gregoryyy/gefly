// State-stream client shared by cesium.html and three.html (classic script).
// Starts a contract-v0 worker, keeps only the latest `state`, and counts arrivals.
//
// Page query parameters:
//   source=synthetic (default) | sim      sim -> ../sim/worker.js (code1)
//   circuit=left (default) | right        synthetic only
(function (root) {
  "use strict";
  const DEG = Math.PI / 180;
  const FT_M = 0.3048;
  const KT_MPS = 1852 / 3600;

  // Approximate EDFE values for a synthetic scene only (OurAirports-derived,
  // rounded; NOT authoritative and not for navigation). Runway 08 ~082 deg
  // magnetic is used directly as a TRUE heading; magnetic variation is not applied.
  const EDFE_APPROX = {
    lat_rad: 49.96 * DEG,
    lon_rad: 8.643 * DEG,
    rwy08_heading_rad: 82 * DEG,
  };

  function startStream(opts) {
    const q = new URLSearchParams(location.search);
    const source = q.get("source") === "sim" ? "sim" : "synthetic";
    const circuit = q.get("circuit") === "right" ? "right" : "left";
    const url = source === "sim" ? "../sim/worker.js"
                                 : `synthetic-source.js?circuit=${circuit}`;
    const s = {
      source, url, latest: null, ready: null, errors: [],
      count: 0, arrivalsMs: [], worker: null,
    };
    let w;
    try {
      w = new Worker(url, source === "sim" ? { type: "module" } : undefined);
    } catch (e) {
      s.errors.push(`worker construction failed: ${e.message}`);
      return s;
    }
    s.worker = w;
    w.onmessage = (ev) => {
      const m = ev.data;
      if (!m || typeof m !== "object") return;
      if (m.type === "state") {
        // Arrival times (performance.now, ms) are kept so the summary can be
        // restricted to the meter's measurement window (warm-up excluded).
        if (s.arrivalsMs.length < 200000) s.arrivalsMs.push(performance.now());
        s.count += 1;
        s.latest = m;
        if (opts && opts.onState) opts.onState(m);
      } else if (m.type === "ready") {
        s.ready = m.build || {};
        w.postMessage({ type: "run" });
      } else if (m.type === "error") {
        s.errors.push(String(m.message));
      }
    };
    w.onerror = (ev) => { s.errors.push(`worker error: ${ev.message || "unknown"}`); };
    w.postMessage({
      type: "init", dt_s: 1 / 120, aircraft: "c172x", state_hz: 60,
      ic: {
        lat_rad: EDFE_APPROX.lat_rad, lon_rad: EDFE_APPROX.lon_rad,
        alt_msl_m: 1300 * FT_M, heading_rad: EDFE_APPROX.rwy08_heading_rad,
        tas_mps: 90 * KT_MPS,
      },
    });
    return s;
  }

  // win: {t0_ms, t1_ms} measurement window from the meter (performance.now).
  function streamSummary(s, win) {
    const t = win ? s.arrivalsMs.filter((a) => a >= win.t0_ms && a <= win.t1_ms) : s.arrivalsMs;
    const iv = [];
    for (let i = 1; i < t.length; i++) iv.push(t[i] - t[i - 1]);
    iv.sort((a, b) => a - b);
    const pct = (p) => (iv.length ? iv[Math.min(iv.length - 1, Math.floor(p * iv.length))] : null);
    const span = t.length > 1 ? (t[t.length - 1] - t[0]) / 1000 : null;
    return {
      source: s.source, url: s.url, ready: s.ready, errors: s.errors,
      window: win ? "measurement window only" : "whole run",
      states_received_total: s.count,
      states_received: t.length,
      state_rate_hz: span ? (t.length - 1) / span : null,
      state_interval_ms: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: iv.length ? iv[iv.length - 1] : null },
      last_step: s.latest ? s.latest.step : null,
      last_t_s: s.latest ? s.latest.t_s : null,
    };
  }

  root.E1Stream = { startStream, streamSummary, EDFE_APPROX, DEG, FT_M, KT_MPS };
})(window);
