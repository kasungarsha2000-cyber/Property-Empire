import { defineConfig } from 'vite';
export default defineConfig({ root: 'apps/web', build: { outDir: 'dist', emptyOutDir: true }, server: { port: 5173, strictPort: true, proxy: { '/ws': { target: 'ws://127.0.0.1:3001', ws: true } } } });
