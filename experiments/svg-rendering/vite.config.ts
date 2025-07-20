import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    benchmark: {
      include: ['**/*.bench.ts'],
      reporters: ['verbose'],
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'SvgRendering',
      fileName: 'index',
    },
  },
});
