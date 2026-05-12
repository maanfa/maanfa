import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    conditions: ['source'],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-vue', test: (id: string) => id.includes('node_modules') && (id.includes('@vue') || /[\\/]vue[\\/@]/.test(id)) },
            { name: 'vendor-three', test: (id: string) => id.includes('node_modules/three') || /[\\/]\.pnpm[\\/]three@/.test(id) },
            { name: 'vendor-naive-ui', test: (id: string) => id.includes('naive-ui') },
            { name: 'quantized-mesh', test: (id: string) => id.includes('quantized-mesh') },
          ],
        },
      },
    },
  },
})
