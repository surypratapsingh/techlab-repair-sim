import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' so the static build works from any sub-path (GitHub Pages, CDN folder, file server).
// three.js only loads with the lazy LabPage chunk; it is ~1 MB by nature, so the warning limit is raised.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
  // The match judge tests do pixel work and time out at the 5 s default on a loaded machine.
  test: { testTimeout: 30000 },
})
