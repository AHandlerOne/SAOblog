import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

function imagesAssetPlugin(): Plugin {
  const sourceDir = resolve(__dirname, 'images')
  let outDir = resolve(__dirname, 'dist')

  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }

  function getContentType(filePath: string) {
    return contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  }

  function copyImagesToDist() {
    if (!fs.existsSync(sourceDir)) return
    const targetDir = resolve(outDir, 'images')
    fs.rmSync(targetDir, { recursive: true, force: true })
    fs.cpSync(sourceDir, targetDir, { recursive: true })
  }

  return {
    name: 'sao-web-images',
    configResolved(config: ResolvedConfig) {
      outDir = resolve(config.root, config.build.outDir)
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/images', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const requestPath = decodeURIComponent((req.url || '').split('?')[0] || '')
        const relativePath = requestPath.replace(/^\/images\/?/, '')
        const filePath = resolve(sourceDir, relativePath)

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          next()
          return
        }

        res.statusCode = 200
        res.setHeader('Content-Type', getContentType(filePath))
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      copyImagesToDist()
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    imagesAssetPlugin(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
      ],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '',
      },
    },
  },
})
