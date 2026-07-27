import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serveix el build a /dades/; en dev es queda a l'arrel
  base: command === 'build' ? '/dades/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: false,
  },
}))
