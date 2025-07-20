import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
  benchmark: {
    include: ['**/*.bench.ts'],
    reporters: ['verbose'],
  },
});
