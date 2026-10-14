// Root Vitest entry: runs every workspace's own config as a project (decision 0006).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['shared/vitest.config.ts', 'server/vitest.config.ts', 'client/vitest.config.ts'],
  },
});
