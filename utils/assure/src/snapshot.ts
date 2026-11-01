// Gefly adaptation: bounded, read-only repository snapshots; no imported code is run.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { LOG_FORMAT, parseLog, type Commit } from '../upstream/src/extract/refs.ts';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_GIT_BYTES = 24 * 1024 * 1024;
const MAX_PATHS = 12000;
export class InputError extends Error {}

export interface Snapshot {
  revision: string;
  head: string;
  paths: readonly string[];
  commits: readonly Commit[];
  changes: ReadonlyMap<string, readonly string[]>;
  readFile(path: string): string | undefined;
  committedLedger?: string;
}

export const sha256 = (text: string | Uint8Array): string => createHash('sha256').update(text).digest('hex');

export function safePath(path: string): string {
  if (!path || path.includes('\0') || path.includes('\\') || isAbsolute(path)
      || path.split('/').some((part) => part === '..' || part === '.' || !part)
      || /^[A-Za-z]:/.test(path)) throw new InputError(`unsafe repository path: ${JSON.stringify(path)}`);
  return path;
}

export function git(root: string, args: readonly string[]): Buffer {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  // Never permit Git's promisor-object reads to fetch from a remote or prompt.
  Object.assign(env, { GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });
  try {
    return execFileSync('git', ['--no-pager', '-c', 'core.fsmonitor=false', ...args], {
      cwd: root, env, timeout: 10000, maxBuffer: MAX_GIT_BYTES, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new InputError(`Git read failed (${args[0] ?? 'unknown'}); check repository/revision and limits`);
  }
}

function textBytes(bytes: Buffer, path: string): string {
  if (bytes.length > MAX_FILE_BYTES) throw new InputError(`input exceeds ${MAX_FILE_BYTES} bytes: ${path}`);
  if (bytes.includes(0)) throw new InputError(`binary input is not supported: ${path}`);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new InputError(`input is not UTF-8: ${path}`); }
}

/** Resolve revision to an immutable commit before constructing object specifiers. */
export function resolveRevision(root: string, revision: string): string {
  if (!revision || revision.startsWith('-') || revision.includes('\0')) throw new InputError('invalid revision');
  return git(root, ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`]).toString('utf8').trim();
}

export function loadSnapshot(rootPath: string, revision = 'worktree'): Snapshot {
  const root = realpathSync(resolve(rootPath));
  const head = resolveRevision(root, revision === 'worktree' ? 'HEAD' : revision);
  const worktree = revision === 'worktree';
  const modes = new Map<string, string>();
  let paths: string[];
  if (worktree) {
    paths = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).toString('utf8').split('\0').filter(Boolean);
  } else {
    paths = git(root, ['ls-tree', '-rz', '--full-tree', head]).toString('utf8').split('\0').filter(Boolean).map((entry) => {
      const split = entry.indexOf('\t');
      if (split < 0) throw new InputError('invalid Git tree record');
      const path = entry.slice(split + 1);
      modes.set(path, entry.slice(0, split).split(' ')[0]);
      return path;
    });
  }
  paths = [...new Set(paths.map(safePath))].sort();
  if (paths.length > MAX_PATHS) throw new InputError(`snapshot exceeds ${MAX_PATHS} paths`);
  const known = new Set(paths);
  const cache = new Map<string, string | undefined>();
  const readFile = (path: string): string | undefined => {
    safePath(path);
    if (cache.has(path)) return cache.get(path);
    if (!known.has(path)) return undefined;
    let text: string | undefined;
    if (worktree) {
      const location = resolve(root, path);
      let actual: string;
      try { actual = realpathSync(location); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') { cache.set(path, undefined); return undefined; }
        throw new InputError(`cannot resolve input: ${path}`);
      }
      const contained = relative(root, actual);
      if (contained === '..' || contained.startsWith(`..${sep}`) || isAbsolute(contained)) throw new InputError(`symlink escapes repository: ${path}`);
      const stat = statSync(actual);
      if (!stat.isFile()) throw new InputError(`input is not a regular file: ${path}`);
      if (stat.size > MAX_FILE_BYTES) throw new InputError(`input exceeds ${MAX_FILE_BYTES} bytes: ${path}`);
      text = textBytes(readFileSync(actual), path);
    } else {
      if (modes.get(path) !== '100644' && modes.get(path) !== '100755') throw new InputError(`unsupported Git file mode: ${path}`);
      const size = Number(git(root, ['cat-file', '-s', `${head}:${path}`]).toString('utf8').trim());
      if (!Number.isSafeInteger(size) || size > MAX_FILE_BYTES) throw new InputError(`input exceeds size bound: ${path}`);
      text = textBytes(git(root, ['show', `${head}:${path}`]), path);
    }
    cache.set(path, text);
    return text;
  };
  const commits = parseLog(git(root, ['log', '--max-count=5000', `--format=${LOG_FORMAT}`, head]).toString('utf8'));
  if (commits.length >= 5000) throw new InputError('history limit reached; narrow repository before checking');
  const changes = new Map<string, string[]>();
  // -m includes differences against every merge parent; merge-only changes must not disappear.
  for (const commit of commits) changes.set(commit.hash,
    [...new Set(git(root, ['diff-tree', '--root', '-m', '--no-commit-id', '--name-only', '-r', '-z', commit.hash])
      .toString('utf8').split('\0').filter(Boolean).map(safePath))].sort());
  let committedLedger: string | undefined;
  if (worktree) {
    const tree = git(root, ['ls-tree', '--name-only', head, '--', 'docs/assure/ledger.jsonl']).toString('utf8').trim();
    if (tree) committedLedger = textBytes(git(root, ['show', `${head}:docs/assure/ledger.jsonl`]), 'docs/assure/ledger.jsonl');
  }
  return { revision: worktree ? 'worktree' : head, head, paths, commits, changes, readFile, committedLedger };
}
