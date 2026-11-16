// Served-path checks for `just build-flight-engine` and `just fly` (TODO 2.0).
// These prove path wiring with stand-in files; they do not build or run JSBSim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve } from 'node:path';
import { test } from 'node:test';
import { ENGINE_FILES, MOUNT, RUNTIME_FILES, defaultRuntimeRoot, runtimeMiddleware, runtimeRoot } from '../runtime.ts';

const app = resolve(import.meta.dirname, '..');
const repo = resolve(app, '..');
const read = (path: string) => readFileSync(resolve(repo, path), 'utf8');

async function standIn(files: readonly string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'gefly-runtime-'));
  for (const file of files) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), `stand-in ${file}`);
  }
  return root;
}

async function serve(root: string) {
  const handler = runtimeMiddleware(root);
  const server = createServer((req, res) => {
    if (!req.url?.startsWith(`${MOUNT}/`)) { res.statusCode = 500; res.end(); return; }
    req.url = req.url.slice(MOUNT.length); // Connect strips the mount prefix the same way.
    void handler(req, res, () => { res.statusCode = 404; res.end(); });
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as { port: number };
  return { base: `http://127.0.0.1:${port}${MOUNT}`, close: () => new Promise((done) => server.close(done)) };
}

test('build-flight-engine writes the engine into the directory just fly serves', () => {
  const recipe = /^build-flight-engine:\n\s+bash "\{\{justfile_directory\(\)\}\}\/([^"]+)"/m.exec(read('justfile'));
  assert.ok(recipe, 'justfile build-flight-engine recipe runs a build script');
  assert.equal(dirname(resolve(repo, recipe[1])), defaultRuntimeRoot, 'build script lives in the served runtime root');
  const build = read(recipe[1]);
  assert.match(build, /^HERE=\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)" && pwd\)$/m);
  assert.match(build, /^DIST=\$HERE\/dist$/m, 'outputs go to <script dir>/dist, independent of the work-dir argument');
  for (const file of ENGINE_FILES) assert.ok(build.includes(`$DIST/${file.slice('dist/'.length)}`), `build writes ${file}`);
  const fly = /^fly:\n((?: {4}.*\n)+)/m.exec(read('justfile'));
  assert.ok(fly, 'justfile has a fly recipe');
  assert.match(fly[1], /^\s+root="\{\{justfile_directory\(\)\}\}"$/m);
  assert.match(fly[1], /^\s+exec npm --prefix "\$root\/app" run dev -- --port 5173 --strictPort$/m);
  assert.match(fly[1], /\[ -z "\$\{PYTHON:-\}" \] && \[ -x "\$root\/\.venv\/bin\/python" \]; then export PYTHON="\$root\/\.venv\/bin\/python"/,
    'R-WORLD-14 just fly passes the project venv to the scenery compositor unless PYTHON is set');
  assert.equal(JSON.parse(read('app/package.json')).scripts.dev.split(' ')[0], 'vite');
  assert.equal(runtimeRoot({}), defaultRuntimeRoot, 'just fly serves the study root by default');
  assert.match(read('studies/e1-browser/sim/worker.js'), /^import createJSBSim from '\.\/dist\/jsbsim\.mjs';$/m);
  assert.match(read('app/src/session.ts'), new RegExp(`new Worker\\('${MOUNT}/worker\\.js'`));
});

test('Task150 every static local runtime import is served, including the indirect Copernicus decoder', () => {
  const allowed = new Set<string>(RUNTIME_FILES);
  assert(allowed.has('copernicus-terrain.js'));
  for (const file of RUNTIME_FILES.filter(file => file.endsWith('.js'))) {
    const source = read(`studies/e1-browser/sim/${file}`);
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.\/[^'"]+)['"]/g)) {
      const imported = posix.normalize(posix.join(posix.dirname(file), match[1]));
      assert(allowed.has(imported), `${file} imports unserved runtime helper ${imported}`);
    }
  }
});

test('the runtime middleware serves files placed at the build output path and nothing else', async (t) => {
  const root = await standIn(RUNTIME_FILES);
  const server = await serve(root);
  t.after(async () => { await server.close(); await rm(root, { recursive: true, force: true }); });
  for (const file of RUNTIME_FILES) {
    const response = await fetch(`${server.base}/${file}`);
    assert.equal(response.status, 200, file);
    assert.equal(await response.text(), `stand-in ${file}`);
  }
  assert.equal((await fetch(`${server.base}/dist/jsbsim.wasm`)).headers.get('content-type'), 'application/wasm');
  for (const path of ['/build.sh', '/bridge.cpp', '/dist/other.js', '/dist/%2e%2e/build.sh', '/worker.js/']) assert.equal((await fetch(`${server.base}${path}`)).status, 404, path);
});

test('a runtime copy without the engine files returns the build hint', async (t) => {
  const root = await standIn(['worker.js']);
  const server = await serve(root);
  t.after(async () => { await server.close(); await rm(root, { recursive: true, force: true }); });
  assert.equal((await fetch(`${server.base}/worker.js`)).status, 200);
  for (const file of ENGINE_FILES) {
    const response = await fetch(`${server.base}/${file}`);
    assert.equal(response.status, 404, file);
    assert.match(await response.text(), /just build-flight-engine/);
  }
});

// The OS picks a free port; vite then binds it with --strictPort (a brief reuse race remains).
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const { port } = probe.address() as { port: number };
  await new Promise((done) => probe.close(done));
  return port;
}
const vite = join(app, 'node_modules/vite/bin/vite.js');
test('the actual dev server configuration serves the configured runtime root', { skip: !existsSync(vite) && 'run npm ci in app first' }, async (t) => {
  const root = await standIn(RUNTIME_FILES);
  const port = await freePort();
  const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: app, stdio: 'pipe', env: { ...process.env, GEFLY_FLIGHT_RUNTIME: root } });
  let output = ''; child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(async () => { child.kill('SIGTERM'); await rm(root, { recursive: true, force: true }); });
  let response: Response | undefined;
  for (let attempt = 0; attempt < 100 && !response; attempt++) {
    if (child.exitCode !== null) throw new Error(`vite exited: ${output}`);
    try { response = await fetch(`http://127.0.0.1:${port}${MOUNT}/dist/jsbsim.wasm`); } catch { await new Promise((done) => setTimeout(done, 100)); }
  }
  assert.ok(response, `vite did not start: ${output}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'stand-in dist/jsbsim.wasm');
});


test('every static relative worker-runtime import is present in the served allowlist', () => {
  for (const file of RUNTIME_FILES.filter(file => /\.(?:m?js)$/.test(file) && !file.startsWith('dist/'))) {
    const source = read(`studies/e1-browser/sim/${file}`);
    for (const match of source.matchAll(/^import\s+.*?\s+from\s+['"]\.\/([^'"]+)['"];?$/gm)) {
      assert(RUNTIME_FILES.some(allowed => allowed === match[1]), `${file} imports unserved ${match[1]}`);
    }
  }
});
