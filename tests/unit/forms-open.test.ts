import { afterEach, describe, expect, it, vi } from "vitest";

import { formsOpen } from "../../src/lib/forms/open";

describe("formsOpen (review F-03, V-01, V-04)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("in development, forms are always offered", () => {
    vi.stubEnv("SITE_ENV", "development");
    expect(formsOpen([])).toBe(true);
  });

  it("in production, only once the privacy notice is published", () => {
    vi.stubEnv("SITE_ENV", "production");
    expect(formsOpen(["/visit"])).toBe(false);
    expect(formsOpen(["/privacy"])).toBe(true);
    expect(formsOpen(new Set(["/privacy"]))).toBe(true);
  });
});
