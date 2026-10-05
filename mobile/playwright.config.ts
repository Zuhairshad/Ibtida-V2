import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 8089);
// The sandbox ships a Chromium that may not match the @playwright/test version; prefer it when present.
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  // `npm run shots` (SHOTS=1) runs the visual capture; the default run is the functional specs.
  testMatch: process.env.SHOTS ? '**/*.shots.ts' : '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    // Prayer times render in device-local time; match the default city (Lahore) like a real phone would.
    timezoneId: 'Asia/Karachi',
    locale: 'en-US',
    trace: 'retain-on-failure',
    launchOptions: existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {},
  },
  // Serves the static export; run `npm run web:export` first (the `e2e` script does both).
  webServer: {
    command: `node e2e/serve.mjs`,
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
