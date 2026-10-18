import { loadTestEnv } from "./test-env";

// Runs in each test worker before test files import the Payload config. Idempotent: setup
// files run once per test file, and the worker may already point at the test database.
if (!process.env.MEDHANEALEM_TEST_DB_SET) {
  process.env.DATABASE_URI = loadTestEnv().testUri;
  process.env.MEDHANEALEM_TEST_DB_SET = "1";
}
