import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the PRODUCTION build (`pnpm build` first). Run with `pnpm test:e2e`.
 * Expects Postgres running with `pnpm seed:base` applied. Stop `pnpm dev` first locally (same port).
 */
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `${baseURL}/am`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
