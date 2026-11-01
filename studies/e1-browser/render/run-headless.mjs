#!/usr/bin/env node
// Headless runner for the E1 render pages: serves studies/e1-browser/ over a local
// HTTP server, opens each page in Chromium (Playwright) at 1440x900 CSS px, waits
// for the frame-pacing meter, and prints one JSON document to stdout.
//
// Usage: node studies/e1-browser/render/run-headless.mjs
//          [--pages cesium,three] [--duration 20] [--warmup 3] [--query "circuit=right"]
//          [--shots <dir>] [--headed]
// Needs Playwright with a Chromium build (`require("playwright")`, global install is
// accepted) and network access to cdn.jsdelivr.net for the pinned engine builds.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");          // studies/e1-browser

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req("playwright"); } catch { /* fall through to global */ }
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return createRequire(path.join(globalRoot, "noop.js"))("playwright");
}

function parseArgs(argv) {
  const a = { pages: ["cesium", "three"], duration: 20, warmup: 3, query: "", shots: null, headed: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === "--pages") { a.pages = v.split(","); i++; }
    else if (k === "--duration") { a.duration = Number(v); i++; }
    else if (k === "--warmup") { a.warmup = Number(v); i++; }
    else if (k === "--query") { a.query = v; i++; }
    else if (k === "--shots") { a.shots = path.resolve(v); i++; }
    else if (k === "--headed") { a.headed = true; }
    else throw new Error(`unknown argument ${k}`);
  }
  if (!(a.duration > 0) || !(a.warmup >= 0)) throw new Error("duration/warmup must be positive");
  return a;
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".wasm": "application/wasm", ".css": "text/css" };

function serve(root) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const file = path.resolve(root, "." + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function runPage(browser, base, name, args) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const hosts = {};
  const consoleErrors = [];
  page.on("request", (r) => {
    const h = new URL(r.url()).host;
    hosts[h] = (hosts[h] || 0) + 1;
  });
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  const qs = new URLSearchParams(args.query);
  qs.set("duration_s", String(args.duration));
  qs.set("warmup_s", String(args.warmup));
  const t0 = Date.now();
  await page.goto(`${base}/render/${name}.html?${qs}`, { waitUntil: "load", timeout: 120000 });
  let results = null, error = null;
  try {
    await page.waitForFunction(() => window.__done === true, null,
      { timeout: (args.duration + args.warmup + 90) * 1000, polling: 500 });
    results = await page.evaluate(() => window.__results);
  } catch (e) {
    error = String(e.message || e);
  }
  if (args.shots) {
    await mkdir(args.shots, { recursive: true });
    await page.screenshot({ path: path.join(args.shots, `${name}.png`) });
  }
  await context.close();
  const forbidden = Object.keys(hosts).filter((h) => /(^|\.)cesium\.com$|bing\.|virtualearth/i.test(h));
  return { page: name, wall_s: (Date.now() - t0) / 1000, error, request_hosts: hosts,
    forbidden_hosts: forbidden, console_errors: consoleErrors, results };
}

const args = parseArgs(process.argv.slice(2));
const { chromium } = loadPlaywright();
const server = await serve(ROOT);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: !args.headed });
const out = {
  evidence_class: "preliminary (headless Chromium; see render/README.md)",
  started_utc: new Date().toISOString(),
  browser: { name: "chromium", version: browser.version() },
  host: { platform: process.platform, arch: process.arch, node: process.version },
  runs: [],
};
try {
  for (const name of args.pages) out.runs.push(await runPage(browser, base, name, args));
} finally {
  await browser.close();
  server.close();
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
process.exitCode = out.runs.every((r) => r.results && !r.error && r.forbidden_hosts.length === 0) ? 0 : 1;
