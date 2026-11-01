import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const assureSource = fileURLToPath(new URL('../', import.meta.url));
const env = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
function checkout(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'gefly-assure-cli-'));
  const caller = mkdtempSync(join(tmpdir(), 'gefly-assure-caller-'));
  t.after(() => { rmSync(root, { recursive: true, force: true }); rmSync(caller, { recursive: true, force: true }); });
  mkdirSync(join(root, 'utils/assure'), { recursive: true });
  cpSync(join(assureSource, 'src'), join(root, 'utils/assure/src'), { recursive: true });
  cpSync(join(assureSource, 'upstream'), join(root, 'utils/assure/upstream'), { recursive: true });
  cpSync(join(assureSource, 'package.json'), join(root, 'utils/assure/package.json'));
  cpSync(join(assureSource, 'UPSTREAM.json'), join(root, 'utils/assure/UPSTREAM.json'));
  mkdirSync(join(root, 'docs/assure'), { recursive: true });
  writeFileSync(join(root, 'docs/SPEC.md'), 'Deliver a thing. [R-DEMO-1]\n');
  writeFileSync(join(root, 'docs/TODO.md'), '## 1. Work\n- [ ] 1.1 Future thing.\n');
  writeFileSync(join(root, 'docs/GAPS.md'), '## Open questions\n### Q1. Pending choice\n');
  writeFileSync(join(root, 'docs/DONE.md'), '# Progress\n');
  writeFileSync(join(root, 'docs/assure/catalog.json'), JSON.stringify({ schemaVersion: 1, guards: [], evidence: [], criteria: [], fixtureGroups: [], aircraft: [] }));
  writeFileSync(join(root, '.gitignore'), 'utils/assure/out/\n');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, env: env(), stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid'); git('add', '.'); git('commit', '-qm', 'Fixture');
  const run = (...args: string[]) => spawnSync(process.execPath, [join(root, 'utils/assure/src/cli.ts'), ...args], { cwd: caller, encoding: 'utf8', timeout: 15000 });
  return { root, caller, run };
}

test('AS7 CLI resolves its own checkout from an unrelated directory and sees fresh edits', (t) => {
  const { root, run } = checkout(t);
  const first = run('check', '--json');
  assert.equal(first.status, 0, first.stderr + first.stdout);
  const result = JSON.parse(first.stdout);
  assert.equal(result.summary.errors, 0);
  writeFileSync(join(root, 'docs/SPEC.md'), 'Deliver a thing. [R-DEMO-1]\nDuplicate. [R-DEMO-1]\n');
  const second = run('check', '--json');
  assert.equal(second.status, 1, second.stderr + second.stdout);
  const changed = JSON.parse(second.stdout);
  assert.notEqual(changed.inputHash, result.inputHash);
  assert(changed.problems.some((p: { check: string }) => p.check === 'duplicate-definition'));
});

test('AS6 CLI rejects invalid commands and supports selected revision/trace/diff/impact', (t) => {
  const { run } = checkout(t);
  for (const args of [[], ['unknown'], ['trace'], ['check', 'extra'], ['impact', '../outside'], ['check', '--unsupported']])
    assert.equal(run(...args).status, 2);
  for (const args of [['trace', 'R-DEMO-1'], ['impact', 'docs/SPEC.md'], ['diff', 'HEAD'], ['check', '--revision', 'HEAD', '--json']]) {
    const result = run(...args); assert.equal(result.status, 0, result.stderr + result.stdout); assert.doesNotThrow(() => JSON.parse(result.stdout));
  }
});

test('AS7 lineage writes only ignored generated outputs and refuses escaping output links', (t) => {
  const { root, caller, run } = checkout(t);
  const generated = run('lineage');
  assert.equal(generated.status, 0, generated.stderr + generated.stdout);
  assert(existsSync(join(root, 'utils/assure/out/graph.json')));
  assert.match(readFileSync(join(root, 'utils/assure/out/report.md'), 'utf8'), /no physics or training validation/);
  rmSync(join(root, 'utils/assure/out'), { recursive: true });
  symlinkSync(caller, join(root, 'utils/assure/out'));
  assert.equal(run('lineage').status, 2);
  assert(!existsSync(join(caller, 'graph.json')));
});
