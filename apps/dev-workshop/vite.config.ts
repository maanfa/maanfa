import { createReadStream } from 'node:fs'
import { cp, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

const CESIUM_ROOT = fileURLToPath(
  new URL('./node_modules/cesium/Build/CesiumUnminified/', import.meta.url),
)

const CESIUM_DIRS = ['Workers', 'Assets', 'ThirdParty', 'Widgets'] as const

const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.ktx2': 'image/ktx2',
}

function cesiumStaticAssets(): Plugin {
  let base = '/'
  let outDir = 'dist'
  const cesiumUrlPrefix = () => (base === '/' ? '/cesium/' : `${base}cesium/`)
  return {
    name: 'maanfa:cesium-static-assets',
    configResolved(config) {
      base = config.base
      outDir = config.build.outDir
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith(cesiumUrlPrefix())) return next()
        const rel = decodeURIComponent(url.slice(cesiumUrlPrefix().length)).split('?')[0] ?? ''
        const filePath = join(CESIUM_ROOT, rel)
        try {
          const info = await stat(filePath)
          if (!info.isFile()) return next()
          res.statusCode = 200
          res.setHeader(
            'Content-Type',
            MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
          )
          res.setHeader('Content-Length', info.size)
          createReadStream(filePath).pipe(res)
        } catch {
          next()
        }
      })
    },
    async closeBundle() {
      const target = join(outDir, 'cesium')
      await Promise.all(
        CESIUM_DIRS.map((dir) =>
          cp(join(CESIUM_ROOT, dir), join(target, dir), { recursive: true }),
        ),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [vue(), cesiumStaticAssets()],
  resolve: {
    conditions: ['source'],
  },
  // GitHub Pages 部署在 https://maanfa.github.io/maanfa/ 子路径下
  base: command === 'build' ? '/maanfa/' : '/',
}))
