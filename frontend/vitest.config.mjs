import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})