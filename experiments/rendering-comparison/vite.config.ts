import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  build: {
    lib: {
      entry: 'src/rendering-comparison.ts',
      name: 'RenderingComparison',
      fileName: 'rendering-comparison',
    },
    rollupOptions: {
      external: ['shared-utilities'],
    },
  },
});
