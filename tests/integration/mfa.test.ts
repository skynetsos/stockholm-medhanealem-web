/**
 * MFA enforcement, end to end through Payload's real REST handlers and the admin gate,
 * against a real Postgres database (`<db>_test`, recreated per run).
 */
import { GRAPHQL_POST, REST_GET, REST_POST } from "@payloadcms/next/routes";
import { generate } from "otplib";
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { PRIVILEGED_ROLES, type Role } from "../../src/access/roles";
import { adminMfaRedirect, MFA_ADMIN_PATH } from "../../src/lib/mfa/gate";
import { MFA_COOKIE } from "../../src/lib/mfa/session";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
const PASSWORD = "Integration-test-Pa55!";

/** Every kind of admin screen a privileged user might try to open directly. */
const PROTECTED_ADMIN_PATHS: string[][] = [
  [],
  ["collections", "users"],
  ["collections", "users", "create"],
  ["collections", "users", "1"],
  ["account"],
  ["globals", "site-settings"],
  ["some", "unknown", "route"],
];

type Cookies = Record<string, string>;

let payload: Payload;
const restGet = REST_GET(config);
const restPost = REST_POST(config);
const graphqlPost = GRAPHQL_POST(config);

function request(method: string, path: string, cookies: Cookies = {}, body?: unknown): Request {
  return new Request(`${BASE}/api/${path}`, {
    method,
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
      "content-type": "application/json",
      origin: BASE,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const slugParams = (path: string) => ({ params: Promise.resolve({ slug: path.split("?")[0].split("/") }) });

const api = {
  get: (path: string, cookies?: Cookies) => restGet(request("GET", path, cookies), slugParams(path)),
  post: (path: string, cookies?: Cookies, body?: unknown) =>
    restPost(request("POST", path, cookies, body), slugParams(path)),
};

function cookieValue(res: Response, name: string): string | undefined {
  const header = res.headers.get("set-cookie") ?? "";
  return header.match(new RegExp(`${name}=([^;]+)`))?.[1];
}

async function createUser(email: string, roles: Role[]) {
  return payload.create({
    collection: "users",
    data: { email, password: PASSWORD, name: email, roles, active: true },
    overrideAccess: true,
  });
}

async function login(email: string): Promise<Cookies> {
  const res = await api.post("users/login", {}, { email, password: PASSWORD });
  expect(res.status).toBe(200);
  const { token } = (await res.json()) as { token: string };
  return { "payload-token": token };
}

/** Headers of a browser navigating to an /admin page (Payload only trusts cookies from same-site requests). */
async function authUser(cookies: Cookies) {
  const headers = new Headers({
    cookie: Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
    "sec-fetch-site": "same-origin",
  });
  const { user } = await payload.auth({ headers });
  return { user, headers };
}

async function gate(cookies: Cookies, segments: string[]) {
  const { user, headers } = await authUser(cookies);
  return adminMfaRedirect({ user, headers, segments });
}

/** Enrol via the real endpoints. Returns session cookies (incl. MFA cookie), secret and recovery codes. */
async function enrol(cookies: Cookies) {
  const setup = await api.post("users/mfa/setup", cookies);
  expect(setup.status).toBe(200);
  const { secret, qrDataUrl } = (await setup.json()) as { secret: string; qrDataUrl: string };
  expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);

  const res = await api.post("users/mfa/enroll", cookies, { code: await generate({ secret }) });
  expect(res.status).toBe(200);
  const { recoveryCodes } = (await res.json()) as { recoveryCodes: string[] };
  const mfa = cookieValue(res, MFA_COOKIE);
  expect(mfa).toBeTruthy();
  return { cookies: { ...cookies, [MFA_COOKIE]: mfa! }, secret, recoveryCodes };
}

/** A valid code for the next 30 s step (the current one may already be used). */
const nextCode = (secret: string) => generate({ secret, epoch: Math.floor(Date.now() / 1000) + 30 });

beforeAll(async () => {
  payload = await getPayload({ config });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("privileged user without MFA", () => {
  it.each(PRIVILEGED_ROLES)("%s cannot reach any admin screen beyond enrolment", async (role) => {
    const email = `${role}@test.local`;
    await createUser(email, [role]);
    const cookies = await login(email);

    for (const segments of PROTECTED_ADMIN_PATHS) {
      expect(await gate(cookies, segments), `/admin/${segments.join("/")}`).toBe(MFA_ADMIN_PATH);
    }
    // The enrolment screen itself, and sign-out, stay reachable.
    expect(await gate(cookies, ["mfa"])).toBeNull();
    expect(await gate(cookies, ["logout"])).toBeNull();
  });

  it("gets no data from REST or GraphQL", async () => {
    const { id } = await createUser("no-mfa-api@test.local", ["office_coordinator"]);
    const cookies = await login("no-mfa-api@test.local");

    expect((await api.get("users", cookies)).status).toBe(403);
    expect((await api.get(`users/${id}`, cookies)).status).toBe(403);

    const gql = await graphqlPost(
      new Request(`${BASE}/api/graphql`, {
        method: "POST",
        headers: { cookie: `payload-token=${cookies["payload-token"]}`, "content-type": "application/json", origin: BASE },
        body: JSON.stringify({ query: "{ Users { docs { id email } } }" }),
      }),
    );
    const result = (await gql.json()) as { data?: { Users?: unknown }; errors?: unknown[] };
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.data?.Users ?? null).toBeNull();
  });
});

describe("enrolment and verification", () => {
  it("unlocks admin for this session only, and issues 8 one-time recovery codes", async () => {
    const { id } = await createUser("enrol@test.local", ["clergy_approver"]);
    const enrolled = await enrol(await login("enrol@test.local"));

    expect(enrolled.recoveryCodes).toHaveLength(8);
    expect(await gate(enrolled.cookies, [])).toBeNull();
    expect((await api.get(`users/${id}`, enrolled.cookies)).status).toBe(200);

    // Stored state never exposes secrets through the API.
    const self = (await (await api.get(`users/${id}`, enrolled.cookies)).json()) as Record<string, unknown>;
    expect(JSON.stringify(self)).not.toMatch(/secret|recoveryCodes|pendingSecret/);

    // A new login session needs MFA again; the old MFA cookie does not carry over.
    const second = await login("enrol@test.local");
    expect(await gate(second, [])).toBe(MFA_ADMIN_PATH);
    expect(await gate({ ...second, [MFA_COOKIE]: enrolled.cookies[MFA_COOKIE] }, [])).toBe(MFA_ADMIN_PATH);

    // Setup cannot be restarted once enrolled.
    expect((await api.post("users/mfa/setup", second)).status).toBe(409);
  });

  it("rejects a replayed code, accepts a fresh one, and accepts each recovery code once", async () => {
    await createUser("verify@test.local", ["office_coordinator"]);
    const enrolled = await enrol(await login("verify@test.local"));

    const session = await login("verify@test.local");
    const usedCode = await generate({ secret: enrolled.secret });
    const replay = await api.post("users/mfa/verify", session, { code: usedCode });
    expect(replay.status).toBe(400);

    const ok = await api.post("users/mfa/verify", session, { code: await nextCode(enrolled.secret) });
    expect(ok.status).toBe(200);
    const verified = { ...session, [MFA_COOKIE]: cookieValue(ok, MFA_COOKIE)! };
    expect(await gate(verified, [])).toBeNull();

    const recoverySession = await login("verify@test.local");
    const recovery = enrolled.recoveryCodes[0].toLowerCase().replace("-", " ");
    const first = await api.post("users/mfa/verify", recoverySession, { recoveryCode: recovery });
    expect(first.status).toBe(200);
    expect(((await first.json()) as { recoveryCodesRemaining: number }).recoveryCodesRemaining).toBe(7);
    const again = await api.post("users/mfa/verify", await login("verify@test.local"), { recoveryCode: recovery });
    expect(again.status).toBe(400);
  });

  it("locks verification after 5 wrong codes", async () => {
    await createUser("lockout@test.local", ["office_coordinator"]);
    const enrolled = await enrol(await login("lockout@test.local"));
    const session = await login("lockout@test.local");

    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await api.post("users/mfa/verify", session, { code: "000000" })).status);
    }
    expect(statuses).toEqual([400, 400, 400, 400, 429]);
    const locked = await api.post("users/mfa/verify", session, { code: await nextCode(enrolled.secret) });
    expect(locked.status).toBe(429);
  });
});

describe("MFA reset", () => {
  it("only a super_admin can reset another user's MFA, which signs them out", async () => {
    await createUser("root@test.local", ["super_admin"]);
    const admin = await enrol(await login("root@test.local"));

    const target = await createUser("lost-phone@test.local", ["clergy_approver"]);
    const targetEnrolled = await enrol(await login("lost-phone@test.local"));

    await createUser("coordinator@test.local", ["office_coordinator"]);
    const coordinator = await enrol(await login("coordinator@test.local"));

    expect((await api.post(`users/${target.id}/mfa/reset`, coordinator.cookies)).status).toBe(403);
    // A super_admin who has not completed MFA in this session cannot reset either.
    expect((await api.post(`users/${target.id}/mfa/reset`, await login("root@test.local"))).status).toBe(403);

    expect((await api.post(`users/${target.id}/mfa/reset`, admin.cookies)).status).toBe(200);

    const after = await payload.findByID({ collection: "users", id: target.id, overrideAccess: true });
    expect(after.mfa?.enabled).toBe(false);
    // Existing sessions are revoked...
    expect((await authUser(targetEnrolled.cookies)).user).toBeNull();
    // ...and the next login lands on enrolment again.
    const relogin = await login("lost-phone@test.local");
    expect(await gate(relogin, [])).toBe(MFA_ADMIN_PATH);
    expect((await api.post("users/mfa/setup", relogin)).status).toBe(200);
  });
});

describe("non-privileged roles", () => {
  it("an editor is not forced through MFA", async () => {
    await createUser("editor@test.local", ["editor"]);
    const cookies = await login("editor@test.local");
    for (const segments of PROTECTED_ADMIN_PATHS) {
      expect(await gate(cookies, segments)).toBeNull();
    }
  });
});
