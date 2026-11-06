import { defineConfig } from 'vite';
import { sceneryMiddleware } from './scenery-server';
import { createCopernicusTerrainMiddleware } from './copernicus-terrain-server';
import { MOUNT, runtimeMiddleware, runtimeRoot } from './runtime.ts';
import { resolve, extname, sep } from 'node:path';
import { createReadStream } from 'node:fs';
import { stat, cp, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const cesiumRoot = resolve(import.meta.dirname, 'node_modules/cesium/Build/Cesium');
const cesiumDirectories = ['Assets', 'Workers', 'ThirdParty', 'Widgets'];
const contentTypes: Record<string, string> = {
  '.wasm': 'application/wasm', '.json': 'application/json',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ktx2': 'image/ktx2', '.xml': 'application/xml',
};
// Only content-identified public scenery is immutable. A wrong digest cannot
// give a stale/changed height tile an immutable URL or bypass the native checks.
function hashedSceneryAssets(root: string) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    let url: URL;
    try { url = new URL(req.url || '/', 'http://localhost'); }
    catch { res.writeHead(400, { 'Cache-Control': 'no-store' }).end(); return; }
    if (!['GET', 'HEAD'].includes(req.method || '') || !/^\?sha256=[a-f0-9]{64}$/.test(url.search)
      || !/^(?:\/terrain\/region\/e\d{3,4}-n\d{4}\.f32|\/imagery\/rhein-main\/tiles\/\d{1,2}\/\d{1,5}\/\d{1,5}\.jpg)$/.test(url.pathname)) { next(); return; }
    try {
      const bytes = await readFile(resolve(root, '.' + url.pathname));
      if (createHash('sha256').update(bytes).digest('hex') !== url.searchParams.get('sha256')) {
        res.writeHead(400, { 'Cache-Control': 'no-store' }).end('Scenery digest mismatch'); return;
      }
      res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.f32') ? 'application/octet-stream' : 'image/jpeg',
        'Content-Length': bytes.length, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { next(); }
  };
}
export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify('/cesium/') },
  server: { port: 5173, strictPort: true },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'cesium', test: /node_modules\/(?:cesium|@cesium)\// }] } } } },
  plugins: [{
    name: 'local-flight-assets',
    configurePreviewServer(server) {
      server.middlewares.use(hashedSceneryAssets(resolve(import.meta.dirname, 'dist')));
      server.middlewares.use(createCopernicusTerrainMiddleware());
    },
    configureServer(server) {
      server.middlewares.use(hashedSceneryAssets(resolve(import.meta.dirname, 'public')));
      server.middlewares.use(createCopernicusTerrainMiddleware());
      server.middlewares.use(sceneryMiddleware());
      // The research runtime remains local and is excluded from production output.
      server.middlewares.use(MOUNT, runtimeMiddleware(runtimeRoot()));
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
      await cp(resolve(import.meta.dirname, 'node_modules/@mapbox/vector-tile/LICENSE.txt'), resolve(output, '../vector-tile-LICENSE.txt'));
      await cp(resolve(import.meta.dirname, 'node_modules/pbf/LICENSE'), resolve(output, '../pbf-LICENSE.txt'));
      await cp(resolve(import.meta.dirname, 'node_modules/@mapbox/point-geometry/LICENSE'), resolve(output, '../point-geometry-LICENSE.txt'));
    },
  }],
});
