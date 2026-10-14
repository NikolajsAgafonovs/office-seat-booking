// Vite dev server and build for the React client (decision 0006).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin `/api` in the browser, forwarded to the Fastify server (docs/api.md).
    // Server-Sent Events (`/api/events`, R-26) stream through http-proxy unchanged.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
});
