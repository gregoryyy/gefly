// Local research runtime served by `just fly`. `just build-flight-engine` runs
// studies/e1-browser/sim/build.sh, which writes ENGINE_FILES into <root>/dist;
// this middleware serves exactly those files and worker.js from the same root.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const MOUNT = '/studies/e1-browser/sim';
export const ENGINE_FILES = ['dist/jsbsim.mjs', 'dist/jsbsim.wasm', 'dist/build-info.json'] as const;
export const RUNTIME_FILES = ['worker.js', ...ENGINE_FILES] as const;
export const defaultRuntimeRoot = resolve(import.meta.dirname, '..', 'studies', 'e1-browser', 'sim');

/**
 * Runtime root: the study directory, or GEFLY_FLIGHT_RUNTIME for local checks that
 * serve a temporary copy (for example the missing-engine smoke case).
 */
export function runtimeRoot(env: Record<string, string | undefined> = process.env): string {
  const override = env.GEFLY_FLIGHT_RUNTIME;
  return override ? resolve(override) : defaultRuntimeRoot;
}

type Next = () => void;
export function runtimeMiddleware(root: string) {
  const allowed = new Set(RUNTIME_FILES.map((file) => `/${file}`));
  return async (req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> => {
    const path = (req.url ?? '').split('?')[0];
    if (!allowed.has(path)) { res.statusCode = 404; res.end(); return; }
    const file = resolve(root, `.${path}`);
    try {
      const info = await stat(file);
      if (!info.isFile()) { next(); return; }
      res.setHeader('Content-Type', path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.json') ? 'application/json' : 'text/javascript');
      res.setHeader('Cache-Control', 'no-store');
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch { res.statusCode = 404; res.end('Run just build-flight-engine first.'); }
  };
}
