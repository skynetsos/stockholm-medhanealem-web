/** Sign-in alerts for privileged roles (spec §8, review F-12). */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import config from "../../src/payload.config";

let payload: Payload;
const PASSWORD = "Login-alert-Pa55!";

async function user(email: string, roles: string[]) {
  await payload.create({ collection: "users", overrideAccess: true, data: { email, password: PASSWORD, name: email, roles, active: true } as never });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await user("alert-office@test.local", ["office_coordinator"]);
  await user("alert-editor@test.local", ["editor"]);
});

afterAll(async () => {
  vi.restoreAllMocks();
  await payload?.destroy();
});

describe("sign-in alerts", () => {
  it("email a privileged user on each sign-in, with time and browser but no password", async () => {
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined as never);
    await payload.login({ collection: "users", data: { email: "alert-office@test.local", password: PASSWORD } });
    const mail = send.mock.calls.map(([m]) => m as { to: string; subject: string; text: string }).find((m) => m.to === "alert-office@test.local");
    expect(mail?.subject).toBe("New sign-in to the Medhanealem website admin");
    expect(mail?.text).toMatch(/\(Stockholm\)/);
    expect(mail?.text).not.toContain(PASSWORD);
    send.mockRestore();
  });

  it("don't email users without privileged roles", async () => {
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined as never);
    await payload.login({ collection: "users", data: { email: "alert-editor@test.local", password: PASSWORD } });
    expect(send.mock.calls.some(([m]) => (m as { to: string }).to === "alert-editor@test.local")).toBe(false);
    send.mockRestore();
  });

  it("never block the sign-in when the email can't be sent", async () => {
    const send = vi.spyOn(payload, "sendEmail").mockRejectedValue(new Error("mail server down"));
    await expect(payload.login({ collection: "users", data: { email: "alert-office@test.local", password: PASSWORD } })).resolves.toHaveProperty("token");
    send.mockRestore();
  });
});
