import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Legacy integration.test.ts modifies DATABASE_URL directly. Run only isolated suites.
    include: ['tests/domain/**/*.test.ts', 'tests/services/**/*.test.ts', 'tests/api/recipeLibrary.test.ts'],
    testTimeout: 20000,
  },
});
