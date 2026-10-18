import { existsSync } from "fs";

/**
 * Integration tests run against a separate database (`<db>_test`) on the same Postgres server,
 * so they never touch development data. CI can set TEST_DATABASE_URI explicitly.
 */
export function loadTestEnv(): { baseUri: string; testUri: string } {
  if (existsSync(".env")) process.loadEnvFile(".env"); // does not override variables already set
  const baseUri = process.env.DATABASE_URI;
  if (!baseUri) throw new Error("DATABASE_URI is not set. Copy .env.example to .env.");

  const url = new URL(process.env.TEST_DATABASE_URI ?? baseUri);
  if (!process.env.TEST_DATABASE_URI) url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return { baseUri, testUri: url.toString() };
}
