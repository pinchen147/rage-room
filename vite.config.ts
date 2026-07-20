import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the static build deploys under any path (Cloudflare Pages / R2).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
})
