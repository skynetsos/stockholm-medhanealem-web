import pg from "pg";

import { loadTestEnv } from "./test-env";

/** Recreate the test database before each integration run. */
export default async function setup() {
  const { baseUri, testUri } = loadTestEnv();
  const testDb = new URL(testUri).pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(testDb)) {
    throw new Error(`Refusing to recreate "${testDb}": test database names must end in _test.`);
  }

  const admin = new pg.Client({ connectionString: baseUri });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${testDb}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${testDb}"`);
  } finally {
    await admin.end();
  }
}
