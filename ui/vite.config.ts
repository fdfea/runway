import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      engine: resolve(__dirname, '../engine/dist/index.js')
    }
  },
  optimizeDeps: {
    include: ['phaser']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 5173
  }
})
