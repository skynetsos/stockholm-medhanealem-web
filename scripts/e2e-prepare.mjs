// Prepare the database for Playwright e2e tests (`pnpm test:e2e:prepare`, also used by CI).
//
// E2E runs the PRODUCTION server, which applies migrations and refuses databases created by dev
// "push". So e2e gets its own database, <DATABASE_URI db>_e2e, recreated here and built the
// production way: migrations, then the base seed, an admin user and a few test pages.
import { spawnSync } from "child_process";
import { existsSync, rmSync } from "fs";
import pg from "pg";

if (existsSync(".env")) process.loadEnvFile(".env");
const base = process.env.DATABASE_URI;
if (!base) throw new Error("DATABASE_URI is not set (copy .env.example to .env).");

const url = new URL(base);
const e2eDb = `${url.pathname.slice(1)}_e2e`;
url.pathname = `/${e2eDb}`;
const e2eUri = url.toString();

const admin = new pg.Client({ connectionString: base });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${e2eDb}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${e2eDb}"`);
await admin.end();
console.log(`Recreated database ${e2eDb}`);

const env = {
  ...process.env,
  NODE_ENV: "production", // migrations, never push
  DATABASE_URI: e2eUri,
  ADMIN_EMAIL: "e2e-admin@example.org",
  ADMIN_NAME: "E2E Admin",
};
for (const args of [["seed:base"], ["user:create-super-admin"], ["payload", "run", "scripts/e2e-fixtures.ts"]]) {
  const result = spawnSync("pnpm", args, { env, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// The production server keeps cached CMS data and the pages it rendered on demand (ISR) on disk;
// they belong to the database just replaced. Pages are rendered again on the first visit.
rmSync(".next/cache/fetch-cache", { recursive: true, force: true });
for (const locale of ["am", "en", "sv"]) rmSync(`.next/server/app/${locale}`, { recursive: true, force: true });
console.log(`E2E database ready: ${e2eDb}`);
