import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The bundle is served by nginx; config.js is mounted separately (K8s ConfigMap)
    // and must NOT be inlined by Vite.
    assetsInlineLimit: 0
  }
});
