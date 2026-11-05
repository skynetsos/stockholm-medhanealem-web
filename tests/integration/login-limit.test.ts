/** Admin sign-in limit per connection (spec Phase 2 task 10, D-037), through Payload's real handler. */
import { REST_POST } from "@payloadcms/next/routes";
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
let payload: Payload;
const restPost = REST_POST(config);

const attempt = (ip: string | null, path = "users/login", body: unknown = { email: "nobody@test.local", password: "wrong-password" }) =>
  restPost(
    new Request(`${BASE}/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, ...(ip ? { "x-real-ip": ip } : {}) },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: path.split("/") }) },
  );

beforeAll(async () => {
  payload = await getPayload({ config });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("admin sign-in limit", () => {
  it("allows 10 attempts per connection in 15 minutes, then answers 429; other connections are unaffected", async () => {
    for (let i = 0; i < 10; i++) expect((await attempt("203.0.113.10")).status).toBe(401);
    const blocked = await attempt("203.0.113.10");
    expect(blocked.status).toBe(429);
    expect(JSON.stringify(await blocked.json())).toMatch(/Too many sign-in attempts/);
    expect((await attempt("203.0.113.11")).status).toBe(401);
  });

  it("counts password-reset requests too", async () => {
    for (let i = 0; i < 10; i++) await attempt("203.0.113.20", "users/forgot-password", { email: "nobody@test.local" });
    expect((await attempt("203.0.113.20", "users/forgot-password", { email: "nobody@test.local" })).status).toBe(429);
  });
});
