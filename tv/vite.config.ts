import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' produces relative asset paths so the built bundle works when
// loaded from the local filesystem inside a packaged Tizen / webOS / Fire TV app.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5174 },
  build: { target: 'es2017' }, // older TV browser engines (2018–2020 sets)
})
