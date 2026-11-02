import { defineConfig } from 'vite';
import { resolve, extname, sep } from 'node:path';
import { createReadStream } from 'node:fs';
import { stat, cp, mkdir } from 'node:fs/promises';

const runtimeRoot = resolve(import.meta.dirname, '../studies/e1-browser/sim');
const cesiumRoot = resolve(import.meta.dirname, 'node_modules/cesium/Build/Cesium');
const cesiumDirectories = ['Assets', 'Workers', 'ThirdParty', 'Widgets'];
const contentTypes: Record<string, string> = {
  '.wasm': 'application/wasm', '.json': 'application/json',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ktx2': 'image/ktx2', '.xml': 'application/xml',
};
export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify('/cesium/') },
  server: { port: 5173, strictPort: true },
  build: { rollupOptions: { output: { manualChunks: { cesium: ['cesium'] } } } },
  plugins: [{
    name: 'local-flight-assets',
    configureServer(server) {
      // The research runtime remains local and is excluded from production output.
      server.middlewares.use('/studies/e1-browser/sim', async (req, res) => {
        const path = (req.url ?? '').split('?')[0];
        const allowed = ['/worker.js', '/dist/jsbsim.mjs', '/dist/jsbsim.wasm', '/dist/build-info.json'];
        if (!allowed.includes(path)) { res.statusCode = 404; res.end(); return; }
        const file = resolve(runtimeRoot, `.${path}`);
        try {
          const info = await stat(file);
          if (!info.isFile()) { res.statusCode = 404; res.end(); return; }
          res.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-store');
          createReadStream(file).on('error', () => res.destroy()).pipe(res);
        } catch { res.statusCode = 404; res.end('Run just build-flight-engine first.'); }
      });
      server.middlewares.use('/cesium', async (req, res) => {
        let path: string;
        try { path = decodeURIComponent((req.url ?? '').split('?')[0]); }
        catch { res.statusCode = 400; res.end(); return; }
        const file = resolve(cesiumRoot, `.${path}`);
        if (path.includes('\0') || !file.startsWith(cesiumRoot + sep)
          || !cesiumDirectories.includes(path.split('/')[1])) {
          res.statusCode = 404; res.end(); return;
        }
        try {
          const info = await stat(file);
          if (!info.isFile()) { res.statusCode = 404; res.end(); return; }
          res.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream');
          createReadStream(file).on('error', () => res.destroy()).pipe(res);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
    async writeBundle(options) {
      const output = resolve(import.meta.dirname, options.dir ?? 'dist', 'cesium');
      await mkdir(output, { recursive: true });
      await Promise.all(cesiumDirectories.map(dir => cp(resolve(cesiumRoot, dir), resolve(output, dir), { recursive: true })));
      const packageRoot = resolve(import.meta.dirname, 'node_modules/cesium');
      await Promise.all(['LICENSE.md', 'ThirdParty.json', 'ThirdParty.extra.json'].map(file => cp(resolve(packageRoot, file), resolve(output, file))));
      await cp(resolve(import.meta.dirname, 'node_modules/maplibre-gl/LICENSE.txt'), resolve(output, '../MapLibre-LICENSE.txt'));
    },
  }],
});
