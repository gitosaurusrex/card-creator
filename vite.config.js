import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    // End-to-end tests (`vite --mode e2e`) swap Clerk for a local stub so the
    // app can be driven without a real Clerk instance. Never used in builds.
    alias: mode === 'e2e'
      ? { '@clerk/clerk-react': fileURLToPath(new URL('./tests/e2e/clerk-stub.jsx', import.meta.url)) }
      : {},
  },
}))
