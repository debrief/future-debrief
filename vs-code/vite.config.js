import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'media',
    rollupOptions: {
      input: {
        outline: resolve(__dirname, 'src/webview/outline/index.html'),
        timeline: resolve(__dirname, 'src/webview/timeline/index.html'),
        'map-components': resolve(__dirname, 'src/maps/webview/MapApp.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]'
      }
    },
    sourcemap: false,
    minify: 'esbuild'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  base: './'
})