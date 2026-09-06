import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/pixytalk_test',
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        'test-only-secret-that-is-at-least-32-characters',
      BETTER_AUTH_URL:
        process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
      WEB_URL: process.env.WEB_URL ?? 'http://localhost:3000',
    },
  },
});
