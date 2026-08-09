import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/sketcher/src/**/*.test.ts',
      'packages/quantized-mesh/src/**/*.test.ts',
    ],
  },
})
