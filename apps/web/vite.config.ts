import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      '/api': { target: process.env.PUBLIC_API_URL ?? 'http://localhost:3333', changeOrigin: true },
    },
  },
});
