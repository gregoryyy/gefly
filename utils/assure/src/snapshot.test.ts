import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSnapshot, MAX_FILE_BYTES, safePath } from './snapshot.ts';

function git(root: string, ...args: string[]) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  return execFileSync('git', args, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function repo(t: { after: (fn: () => void) => void }): string {
  const root = mkdtempSync(join(tmpdir(), 'gefly-assure-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q'); git(root, 'config', 'user.name', 'Fixture'); git(root, 'config', 'user.email', 'fixture@example.invalid');
  writeFileSync(join(root, 'README.md'), 'Initial\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Initial');
  return root;
}

test('AS7 read snapshots reject escaping paths, symlinks and oversized input', (t) => {
  const root = repo(t), outside = repo(t);
  symlinkSync(join(outside, 'README.md'), join(root, 'escape.md'));
  writeFileSync(join(root, 'large.md'), 'x'.repeat(MAX_FILE_BYTES + 1));
  const snapshot = loadSnapshot(root);
  for (const path of ['/etc/passwd', '../README.md', 'x/../../file', 'C:\\file']) assert.throws(() => safePath(path));
  assert.throws(() => snapshot.readFile('escape.md'), /escapes/);
  assert.throws(() => snapshot.readFile('large.md'), /exceeds/);
  assert.equal(snapshot.readFile('missing.md'), undefined);
});

test('AS1 current and selected Git revisions are fresh across separate invocations', (t) => {
  const root = repo(t), initial = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'README.md'), 'Changed\n');
  assert.equal(loadSnapshot(root).readFile('README.md'), 'Changed\n');
  assert.equal(loadSnapshot(root, initial).readFile('README.md'), 'Initial\n');
  writeFileSync(join(root, 'README.md'), 'Again\n');
  assert.equal(loadSnapshot(root).readFile('README.md'), 'Again\n');
});

test('AS7 inherited Git repository/index/config variables cannot redirect snapshot coverage', (t) => {
  const root = repo(t), foreign = repo(t);
  writeFileSync(join(root, 'only-here.md'), 'Intended source\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Intended');
  const saved = { ...process.env };
  Object.assign(process.env, { GIT_DIR: join(foreign, '.git'), GIT_WORK_TREE: foreign, GIT_INDEX_FILE: join(foreign, '.git/index'), GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.bare', GIT_CONFIG_VALUE_0: 'true' });
  try {
    const snapshot = loadSnapshot(root);
    assert(snapshot.paths.includes('only-here.md'));
    assert.equal(snapshot.readFile('only-here.md'), 'Intended source\n');
  } finally { for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, saved); }
});

test('AS1 Git history includes merge-only changes against every parent', (t) => {
  const root = repo(t), base = git(root, 'branch', '--show-current');
  git(root, 'checkout', '-qb', 'feature'); writeFileSync(join(root, 'feature.txt'), 'Feature\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Feature');
  git(root, 'checkout', '-q', base); writeFileSync(join(root, 'main.txt'), 'Main\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Main');
  git(root, 'merge', '--no-ff', '--no-commit', 'feature'); writeFileSync(join(root, 'merge-only.cpp'), 'int mergeOnly;\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Merge\n\nRefs: TODO 1.1');
  const snapshot = loadSnapshot(root), merge = snapshot.commits.find((c) => c.subject === 'Merge')!;
  assert(merge);
  assert(snapshot.changes.get(merge.hash)?.includes('merge-only.cpp'));
});
