// E1 browser check: serve this directory on 127.0.0.1 with cross-origin
// isolation headers (finer performance.now() resolution in the worker), open
// sim.html in headless Chromium via Playwright and print window.__results.
// Usage: node run-headless.mjs [--seconds 30] [--live 10] [--state-hz 60]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));
const seconds = Number(args.seconds || 30);
const live = Number(args.live || 10);
const stateHz = Number(args['state-hz'] || 60);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.wasm': 'application/wasm', '.json': 'application/json' };

if (!fs.existsSync(path.join(ROOT, 'dist', 'jsbsim.wasm'))) {
  console.error('dist/jsbsim.wasm missing: run build.sh first');
  process.exit(2);
}

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel || 'sim.html');
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
let code = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${port}/sim.html?seconds=${seconds}&live=${live}&state_hz=${stateHz}`);
  const timeoutMs = (2 * seconds + live) * 1000 * 2 + 60000;
  await page.waitForFunction(() => window.__results !== undefined, null, { timeout: timeoutMs, polling: 500 });
  const results = await page.evaluate(() => window.__results);
  results.browser = { name: 'chromium (Playwright, headless)', version: browser.version() };
  console.log(JSON.stringify(results, null, 2));
  if (results.error) code = 1;
} finally {
  await browser.close();
  server.close();
}
process.exit(code);
