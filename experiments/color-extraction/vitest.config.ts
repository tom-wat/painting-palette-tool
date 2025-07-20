import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    benchmark: {
      include: ['**/*.bench.ts'],
      reporters: ['verbose'],
    },
  },
});
