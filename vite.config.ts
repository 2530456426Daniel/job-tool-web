import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 整站部署前缀（结尾必须带 /）。它同时决定 index.html 的资源引用路径
  // 和 import.meta.env.BASE_URL，router 里的
  // createWebHistory(import.meta.env.BASE_URL) 会自动跟着变。
  base: '/jobTool/',

  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false,
    proxy: {
      // 开发环境把 /api 代理到后端，避免跨域。
      // 后端 context-path 就是 /api，因此无需 rewrite。
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1024,
  },
})
