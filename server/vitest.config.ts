import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/test/globalSetup.ts'],
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
