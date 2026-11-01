// Frame-pacing meter, identical for cesium.html and three.html (classic script).
//
// 1. calibrateRefresh(): before the page builds its scene, sample idle
//    requestAnimationFrame intervals and take their median as the display refresh
//    period (`?refresh_hz=<n>` overrides it, e.g. when the idle probe is unreliable).
// 2. startMeter(): after a warm-up (counted from the meter's first frame), record
//    rAF-to-rAF intervals for a fixed window, then publish JSON as
//    `window.__results` and set `window.__done = true`.
// It measures display-frame cadence on the page's main thread; it does not measure
// GPU completion or input-to-photon latency.
//
// Rendering budget (studies/e1-browser/README.md): median frame interval
// <= 1.05 x refresh period, p99 frame interval <= 25 ms.
// Query parameters: warmup_s (default 3), duration_s (default 20), refresh_hz.
(function (root) {
  "use strict";
  const LONG_FRAME_MS = 25;
  const MEDIAN_FACTOR = 1.05;
  const phase = { name: "idle", t0_ms: null, t1_ms: null };
  let refresh = null;   // {period_ms, hz, source, idle_samples, idle_p10_ms, idle_p90_ms}

  function percentile(sorted, p) {
    if (!sorted.length) return null;
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  }

  function webglInfo(gl) {
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      version: gl.getParameter(gl.VERSION),
      vendor: gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
      renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
      drawing_buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    };
  }

  function heap() {
    const m = performance.memory;   // Chromium-only, non-standard
    return m ? { used_bytes: m.usedJSHeapSize, total_bytes: m.totalJSHeapSize } : null;
  }

  // Idle probe: nothing else is drawing yet, so rAF intervals follow vsync.
  function calibrateRefresh(probeMs = 1000) {
    const q = new URLSearchParams(location.search);
    const forced = Number(q.get("refresh_hz"));
    return new Promise((resolve) => {
      const iv = [];
      let prev = null, start = null;
      function f(now) {
        if (prev !== null) iv.push(now - prev);
        if (start === null) start = now;
        prev = now;
        if (now - start < probeMs || iv.length < 10) { root.requestAnimationFrame(f); return; }
        const sorted = iv.slice().sort((a, b) => a - b);
        const idle = percentile(sorted, 0.5);
        refresh = forced > 0
          ? { period_ms: 1000 / forced, hz: forced, source: "query refresh_hz" }
          : { period_ms: idle, hz: 1000 / idle, source: "idle rAF median before scene start" };
        Object.assign(refresh, { idle_samples: iv.length, idle_median_ms: idle,
          idle_p10_ms: percentile(sorted, 0.1), idle_p90_ms: percentile(sorted, 0.9) });
        resolve(refresh);
      }
      root.requestAnimationFrame(f);
    });
  }

  // collectExtra(win): page-specific fields merged into the results at the end;
  // win = {t0_ms, t1_ms} is the measurement window (performance.now, ms).
  function startMeter({ page, collectExtra, overlay }) {
    const q = new URLSearchParams(location.search);
    const warmupMs = 1000 * Number(q.get("warmup_s") || 3);
    const durationMs = 1000 * Number(q.get("duration_s") || 20);
    const frames = [];
    let prev = null, first = null, heapStart = null;
    root.__done = false;
    phase.name = "warmup";

    function finish(now) {
      phase.name = "done";
      phase.t1_ms = now;
      const sorted = frames.slice().sort((a, b) => a - b);
      const median = percentile(sorted, 0.5);
      const p99 = percentile(sorted, 0.99);
      const total = frames.reduce((a, b) => a + b, 0);
      const P = refresh ? refresh.period_ms : null;
      // Missed vsyncs: refresh periods elapsed beyond the first in each interval.
      const missed = P ? frames.reduce((n, f) => n + Math.max(0, Math.round(f / P) - 1), 0) : null;
      const results = {
        page,
        measured_s: (now - phase.t0_ms) / 1000,
        warmup_s: warmupMs / 1000,
        frames: frames.length,
        fps_median: median ? 1000 / median : null,
        fps_mean: total ? (1000 * frames.length) / total : null,
        frame_ms: {
          p50: median, p95: percentile(sorted, 0.95), p99,
          max: sorted.length ? sorted[sorted.length - 1] : null,
        },
        long_frames_gt_25ms: frames.filter((f) => f > LONG_FRAME_MS).length,
        refresh,
        missed_vsyncs: missed,
        frames_late_gt_1_5_periods: P ? frames.filter((f) => f > 1.5 * P).length : null,
        budget: {
          median_interval_limit_ms: P ? MEDIAN_FACTOR * P : null,
          median_interval_pass: P && median !== null ? median <= MEDIAN_FACTOR * P : null,
          p99_limit_ms: LONG_FRAME_MS,
          p99_pass: p99 !== null ? p99 <= LONG_FRAME_MS : null,
          note: "preliminary unless run on the reference M1/Chrome",
        },
        js_heap_start: heapStart,
        js_heap_end: heap(),
        viewport_css_px: [innerWidth, innerHeight],
        device_pixel_ratio: devicePixelRatio,
        cross_origin_isolated: root.crossOriginIsolated === true,
        user_agent: navigator.userAgent,
        ...(collectExtra ? collectExtra({ t0_ms: phase.t0_ms, t1_ms: phase.t1_ms }) : {}),
      };
      root.__results = results;
      root.__done = true;
      if (overlay) overlay.textContent = `done: median ${median?.toFixed(1)} ms ` +
        `(limit ${results.budget.median_interval_limit_ms?.toFixed(1)}), ` +
        `p99 ${p99?.toFixed(1)} ms, missed vsyncs ${missed}`;
      // Visible, selectable results for manual runs on the reference Mac.
      const doc = root.document;
      if (doc && !doc.getElementById("e1-results")) {
        const pre = doc.createElement("pre");
        pre.id = "e1-results";
        pre.style.cssText = "position:fixed;right:8px;bottom:8px;max-width:min(560px,90vw);" +
          "max-height:45vh;overflow:auto;margin:0;padding:8px;font:11px/1.35 ui-monospace,monospace;" +
          "background:rgba(10,14,20,.88);color:#e6edf3;border-radius:4px;z-index:10;user-select:text";
        pre.textContent = JSON.stringify(results, null, 2);
        doc.body.appendChild(pre);
      }
    }

    function onFrame(now) {
      if (prev === null) { prev = now; first = now; root.requestAnimationFrame(onFrame); return; }
      const dt = now - prev;
      prev = now;
      if (phase.name === "warmup") {
        if (now - first >= warmupMs) { phase.name = "measuring"; phase.t0_ms = now; heapStart = heap(); }
      } else {
        frames.push(dt);
        if (overlay && frames.length % 30 === 0) {
          overlay.textContent = `${page}: measuring ${((now - phase.t0_ms) / 1000).toFixed(0)}/` +
            `${durationMs / 1000} s, last ${dt.toFixed(1)} ms`;
        }
        if (now - phase.t0_ms >= durationMs) { finish(now); return; }
      }
      root.requestAnimationFrame(onFrame);
    }
    root.requestAnimationFrame(onFrame);
  }

  // True only inside the measurement window (warm-up and after-window excluded).
  const measuring = () => phase.name === "measuring";

  root.E1Meter = { calibrateRefresh, startMeter, measuring, webglInfo, percentile };
})(window);
