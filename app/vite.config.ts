import { defineConfig } from 'vite';
import { MOUNT, runtimeMiddleware, runtimeRoot } from './runtime.ts';

// Serve only the local research runtime, never the rest of the repository.
// These ignored assets are deliberately excluded from the production build.
export default defineConfig({
  server: { port: 5173, strictPort: true },
  plugins: [{
    name: 'local-research-runtime',
    configureServer(server) {
      server.middlewares.use(MOUNT, runtimeMiddleware(runtimeRoot()));
    },
  }],
});
