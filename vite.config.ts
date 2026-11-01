import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the static build works from any sub-path (GitHub Pages, CDN folder, file server).
// three.js only loads with the lazy LabPage chunk; it is ~1 MB by nature, so the warning limit is raised.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
})
