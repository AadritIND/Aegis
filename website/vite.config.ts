import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative URLs keep the build working under /Aegis/ on GitHub Pages and
  // at the root of the local dev server.
  base: './',
  plugins: [react()],
  server: {
    port: 5310,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
})
