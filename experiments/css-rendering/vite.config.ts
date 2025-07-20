import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  build: {
    lib: {
      entry: 'src/css-cube.ts',
      name: 'CssCubeRenderer',
      fileName: 'css-cube',
    },
    rollupOptions: {
      external: ['shared-utilities'],
    },
  },
});
