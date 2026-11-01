import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

// Serve only the local research runtime, never the rest of the repository.
// These ignored assets are deliberately excluded from the production build.
const runtimeRoot = resolve(import.meta.dirname, '../studies/e1-browser/sim');
export default defineConfig({
  server: { port: 5173, strictPort: true },
  plugins: [{
    name: 'local-research-runtime',
    configureServer(server) {
      server.middlewares.use('/studies/e1-browser/sim', async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        const allowed = ['/worker.js', '/dist/jsbsim.mjs', '/dist/jsbsim.wasm', '/dist/build-info.json'];
        if (!allowed.includes(path)) { res.statusCode = 404; res.end(); return; }
        const file = resolve(runtimeRoot, `.${path}`);
        try {
          const info = await stat(file);
          if (!info.isFile()) { next(); return; }
          res.setHeader('Content-Type', path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.json') ? 'application/json' : 'text/javascript');
          res.setHeader('Cache-Control', 'no-store');
          createReadStream(file).on('error', () => res.destroy()).pipe(res);
        } catch { res.statusCode = 404; res.end('Run just build-flight-engine first.'); }
      });
    },
  }],
});
