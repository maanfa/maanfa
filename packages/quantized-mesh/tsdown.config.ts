import { defineConfig } from 'tsdown'
import type { UserConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  entry: 'src/index.ts',
  platform: 'neutral',
  dts: {
    sourcemap: true,
  },
  outDir: 'dist',
  format: {
    esm: {
      target: ['es2020'],
    },
  },
  minify: false,
  exports: true,
  unbundle: false,
})

export default tsdownConfig
