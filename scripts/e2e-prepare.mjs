// Prepare the database for Playwright e2e tests (`pnpm test:e2e:prepare`, also used by CI).
//
// E2E runs the PRODUCTION server, which applies migrations and refuses databases created by dev
// "push". So e2e gets its own database, <DATABASE_URI db>_e2e, recreated here and built the
// production way: migrations, then the base seed and an admin user.
import { spawnSync } from "child_process";
import { existsSync } from "fs";
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
for (const script of ["seed:base", "user:create-super-admin"]) {
  const result = spawnSync("pnpm", [script], { env, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`E2E database ready: ${e2eDb}`);
