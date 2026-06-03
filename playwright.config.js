import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    // Spread the Desktop Chrome preset first so our own viewport below
    // overrides its defaults (otherwise the preset's 1280×720 silently wins).
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    trace: 'off',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: 'chromium' },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
