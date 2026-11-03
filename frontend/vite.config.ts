import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin in dev so cookies work; the API allows http://localhost:5173
    proxy: { '/api': { target: 'http://localhost:4000' } },
  },
})
