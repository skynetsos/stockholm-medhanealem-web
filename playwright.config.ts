import { existsSync } from "fs";

import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the PRODUCTION build. Run:
 *   pnpm build && pnpm test:e2e:prepare && pnpm test:e2e
 * The server uses the separate <db>_e2e database prepared by scripts/e2e-prepare.mjs (migrated the
 * production way). Stop `pnpm dev` first locally (same port).
 */
if (existsSync(".env")) process.loadEnvFile(".env");

const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

function e2eDatabaseUri(): string {
  const url = new URL(process.env.DATABASE_URI ?? "postgres://localhost/medhanealem");
  url.pathname = `${url.pathname}_e2e`;
  return url.toString();
}

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
    url: `${baseURL}/api/health`,
    // PORT: the middleware reaches this server at 127.0.0.1:PORT for the published-page list (D-017).
    env: { DATABASE_URI: e2eDatabaseUri(), PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
