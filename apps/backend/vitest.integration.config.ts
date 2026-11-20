import { defineConfig } from 'vitest/config';

const url = process.env['DATABASE_URL'];
if (!url || !new URL(url).pathname.endsWith('_unitools_test')) {
  throw new Error('Integration tests require a separate database ending in _unitools_test');
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
