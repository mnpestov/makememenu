import { spawnSync } from 'node:child_process';

const configuredUrl = process.env['DATABASE_URL'];
if (!configuredUrl) throw new Error('DATABASE_URL is required');
const testUrl = new URL(configuredUrl);
testUrl.pathname = '/make_me_menu_unitools_test';
const env = { ...process.env, DATABASE_URL: testUrl.toString(), NODE_ENV: 'test', JWT_SECRET: 'unitools-integration-tests-only' };

for (const [entry, args] of [
  [require.resolve('prisma/build/index.js'), ['migrate', 'deploy']],
  [require.resolve('vitest/vitest.mjs'), ['run', '--config', 'vitest.integration.config.ts']],
] as const) {
  const result = spawnSync(process.execPath, [entry, ...args], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
