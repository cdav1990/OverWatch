import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import cesium from 'vite-plugin-cesium'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cesium(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'CESIUM_BASE_URL': JSON.stringify('/cesium')
  },
  server: {
    host: 'overwatch.local',
    port: 5173,
    strictPort: false,
    open: 'http://overwatch.local:5173',
    hmr: { overlay: true },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          cesium: ['cesium'],
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: [
            '@mui/material',
            '@mui/icons-material',
            '@mui/lab', 
            '@mui/x-tree-view',
            '@emotion/react',
            '@emotion/styled'
          ]
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
    ],
    force: false,
    esbuildOptions: {
      target: 'esnext'
    }
  },
  cacheDir: 'node_modules/.vite',
  css: {
    devSourcemap: false,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext'
  }
})
