// Frame-pacing meter, identical for cesium.html and three.html (classic script).
//
// Records requestAnimationFrame-to-requestAnimationFrame intervals after a warm-up
// (counted from the meter's first frame),
// for a fixed measurement window, then publishes JSON as `window.__results` and
// sets `window.__done = true`. It measures display-frame cadence as seen by the
// page's main thread; it does not measure GPU completion or input latency.
//
// Query parameters: warmup_s (default 3), duration_s (default 20).
(function (root) {
  "use strict";
  const LONG_FRAME_MS = 25;

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

  // collectExtra(): page-specific fields merged into the results at the end.
  function startMeter({ page, collectExtra, overlay }) {
    const q = new URLSearchParams(location.search);
    const warmupMs = 1000 * Number(q.get("warmup_s") || 3);
    const durationMs = 1000 * Number(q.get("duration_s") || 20);
    const frames = [];
    let prev = null, first = null, t0 = null, heapStart = null;
    root.__done = false;

    function finish(now) {
      const sorted = frames.slice().sort((a, b) => a - b);
      const median = percentile(sorted, 0.5);
      const total = frames.reduce((a, b) => a + b, 0);
      const results = {
        page,
        measured_s: (now - t0) / 1000,
        warmup_s: warmupMs / 1000,
        frames: frames.length,
        fps_median: median ? 1000 / median : null,
        fps_mean: total ? (1000 * frames.length) / total : null,
        frame_ms: {
          p50: median, p95: percentile(sorted, 0.95), p99: percentile(sorted, 0.99),
          max: sorted.length ? sorted[sorted.length - 1] : null,
        },
        long_frames_gt_25ms: frames.filter((f) => f > LONG_FRAME_MS).length,
        js_heap_start: heapStart,
        js_heap_end: heap(),
        viewport_css_px: [innerWidth, innerHeight],
        device_pixel_ratio: devicePixelRatio,
        user_agent: navigator.userAgent,
        ...(collectExtra ? collectExtra() : {}),
      };
      root.__results = results;
      root.__done = true;
      if (overlay) overlay.textContent = `done: median ${results.fps_median?.toFixed(1)} fps, ` +
        `p99 ${results.frame_ms.p99?.toFixed(1)} ms, long ${results.long_frames_gt_25ms}`;
    }

    function onFrame(now) {
      if (prev === null) { prev = now; first = now; root.requestAnimationFrame(onFrame); return; }
      const dt = now - prev;
      prev = now;
      if (t0 === null) {
        if (now - first >= warmupMs) { t0 = now; heapStart = heap(); }
      } else {
        frames.push(dt);
        if (overlay && frames.length % 30 === 0) {
          overlay.textContent = `${page}: measuring ${((now - t0) / 1000).toFixed(0)}/` +
            `${durationMs / 1000} s, last ${dt.toFixed(1)} ms`;
        }
        if (now - t0 >= durationMs) { finish(now); return; }
      }
      root.requestAnimationFrame(onFrame);
    }
    root.requestAnimationFrame(onFrame);
  }

  root.E1Meter = { startMeter, webglInfo, percentile };
})(window);
