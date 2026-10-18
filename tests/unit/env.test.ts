import { afterEach, describe, expect, it } from "vitest";

import { requireEnv } from "../../src/lib/env";

describe("requireEnv", () => {
  const key = "MEDHANEALEM_TEST_ENV";

  afterEach(() => {
    delete process.env[key];
  });

  it("returns the value when set", () => {
    process.env[key] = "value";
    expect(requireEnv(key)).toBe("value");
  });

  it("throws a helpful error when missing or empty", () => {
    expect(() => requireEnv(key)).toThrow(/MEDHANEALEM_TEST_ENV.*\.env\.example/);
    process.env[key] = "";
    expect(() => requireEnv(key)).toThrow();
  });
});
