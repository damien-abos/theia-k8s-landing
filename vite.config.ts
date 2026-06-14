import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Le bundle est servi par nginx ; config.js est monté séparément (ConfigMap K8s)
    // et ne doit donc PAS être inliné par Vite.
    assetsInlineLimit: 0
  }
});
