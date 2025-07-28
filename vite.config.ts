import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// 插件：复制静态文件
const copyStaticFiles = () => {
  return {
    name: 'copy-static-files',
    writeBundle() {
      // 确保 dist 目录存在
      if (!existsSync('dist')) {
        mkdirSync('dist', { recursive: true });
      }
      
      // 复制 manifest.json
      copyFileSync('manifest.json', 'dist/manifest.json');
      
      // 确保 icons 目录存在
      if (!existsSync('dist/icons')) {
        mkdirSync('dist/icons', { recursive: true });
      }
      
      // 复制图标文件
      copyFileSync('icons/icon16.png', 'dist/icons/icon16.png');
      copyFileSync('icons/icon48.png', 'dist/icons/icon48.png');
      copyFileSync('icons/icon128.png', 'dist/icons/icon128.png');
    }
  }
}

// 插件：修复 Service Worker 代码
const fixServiceWorker = () => {
  return {
    name: 'fix-service-worker',
    generateBundle(options, bundle) {
      // 查找 background.js 文件
      const backgroundChunk = bundle['background.js'];
      if (backgroundChunk && backgroundChunk.type === 'chunk') {
        // 移除包含 window 的预加载代码
        backgroundChunk.code = backgroundChunk.code.replace(
          /const __vitePreload[\s\S]*?};/g,
          'const __vitePreload = function() { return Promise.resolve(); };'
        );
        
        // 移除任何 window 相关的调用
        backgroundChunk.code = backgroundChunk.code.replace(
          /window\.dispatchEvent\([^)]*\);?/g,
          '// window.dispatchEvent removed for Service Worker compatibility'
        );
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copyStaticFiles(), fixServiceWorker()],
  build: {
    outDir: 'dist',
    minify: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        'content-styles': resolve(__dirname, 'src/content/styles.css'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'content-styles.css') {
            return 'content.css';
          }
          return '[name].[ext]';
        },
        format: 'es',
      },
    },
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    // 为 Service Worker 环境定义全局变量
    global: 'globalThis',
  },
})