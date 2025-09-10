import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/serve-e2e-fixtures.js',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});

