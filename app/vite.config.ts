import { defineConfig } from 'vite';
import { sceneryMiddleware } from './scenery-server';
import { MOUNT, runtimeMiddleware, runtimeRoot } from './runtime.ts';
import { resolve, extname, sep } from 'node:path';
import { createReadStream } from 'node:fs';
import { stat, cp, mkdir } from 'node:fs/promises';

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
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'cesium', test: /node_modules\/(?:cesium|@cesium)\// }] } } } },
  plugins: [{
    name: 'local-flight-assets',
    configureServer(server) {
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
