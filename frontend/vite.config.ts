import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const apiProxy = process.env.VITE_API_PROXY ?? 'http://localhost:3001';
const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Express PDF→PNG / DocAI / vision proxy. VITE_API_PROXY is the Docker service URL.
    proxy: {
      '/api': {
        target: apiProxy,
        changeOrigin: true,
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
    ...(usePolling ? { watch: { usePolling: true, interval: 300 } } : {}),
    hmr: {
      clientPort: 5173,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

