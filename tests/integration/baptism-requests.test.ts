/**
 * BaptismRequests and CaseEvents (spec §2.12, §2.13, §3; Phase 2 task 1): private records.
 * Access is checked through the local API (what server components use) and through Payload's real
 * REST and GraphQL handlers (what anyone on the internet can call).
 */
import { GRAPHQL_POST, REST_DELETE, REST_GET, REST_PATCH, REST_POST } from "@payloadcms/next/routes";
import { generate } from "otplib";
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import type { BaptismRequest } from "../../src/payload-types";
import { MFA_COOKIE } from "../../src/lib/mfa/session";
import { type Actor, as, createActor } from "./helpers";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
const PASSWORD = "Integration-test-Pa55!";

let payload: Payload;
let superAdmin: Actor;
let office: Actor;
let clergy: Actor;
let editor: Actor;
let translator: Actor;
let finance: Actor;
let caseId: number;

const restGet = REST_GET(config);
const restPost = REST_POST(config);
const restPatch = REST_PATCH(config);
const restDelete = REST_DELETE(config);
const graphqlPost = GRAPHQL_POST(config);

const STOCKHOLM = "Europe/Stockholm" as const;

/** A complete request for a child, as the website form will save it (task 4). */
const childRequest = (overrides: Partial<BaptismRequest> = {}) => ({
  status: "new" as const,
  applicant: { name: "Private Applicant", email: "applicant@example.org", phone: "070-000 00 00", preferredLocale: "am" as const, parishRelationship: "member" as const },
  candidate: { fullName: "Private Child", dateOfBirth: "2026-03-01T23:00:00.000Z", dateOfBirth_tz: STOCKHOLM, category: "child" as const },
  guardian: { name: "Private Applicant", relationship: "Mother", consentConfirmed: true },
  preferredPeriod: "December 2026",
  privacyAccepted: true,
  source: { ipHash: "hash", userAgent: "test", submittedAt: new Date().toISOString(), submittedAt_tz: STOCKHOLM },
  ...overrides,
});

const serverCreate = (data: ReturnType<typeof childRequest>) =>
  payload.create({ collection: "baptism-requests", overrideAccess: true, data, context: { disableRevalidate: true } });

type Cookies = Record<string, string>;

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
  post: (path: string, cookies?: Cookies, body?: unknown) => restPost(request("POST", path, cookies, body), slugParams(path)),
  patch: (path: string, cookies?: Cookies, body?: unknown) => restPatch(request("PATCH", path, cookies, body), slugParams(path)),
  delete: (path: string, cookies?: Cookies) => restDelete(request("DELETE", path, cookies), slugParams(path)),
  graphql: async (query: string, cookies: Cookies = {}) => {
    const res = await graphqlPost(request("POST", "graphql", cookies, { query }));
    return (await res.json()) as { data?: Record<string, unknown> | null; errors?: unknown[] };
  },
};

async function login(email: string): Promise<Cookies> {
  const res = await api.post("users/login", {}, { email, password: PASSWORD });
  expect(res.status).toBe(200);
  const { token } = (await res.json()) as { token: string };
  return { "payload-token": token };
}

beforeAll(async () => {
  payload = await getPayload({ config });
  superAdmin = await createActor(payload, "bap-admin@test.local", ["super_admin"]);
  office = await createActor(payload, "bap-office@test.local", ["office_coordinator"]);
  clergy = await createActor(payload, "bap-clergy@test.local", ["clergy_approver"]);
  editor = await createActor(payload, "bap-editor@test.local", ["editor"]);
  translator = await createActor(payload, "bap-translator@test.local", ["translator"], { translatorLocales: ["en"] });
  finance = await createActor(payload, "bap-finance@test.local", ["finance"]);
  caseId = (await serverCreate(childRequest())).id;
});

afterAll(async () => {
  await payload?.destroy();
});

describe("baptism requests: reference and audit log", () => {
  it("gets a yearly BAP reference and a 'created' audit entry from the system", async () => {
    const first = await payload.findByID({ collection: "baptism-requests", id: caseId, overrideAccess: true });
    const second = await serverCreate(childRequest());
    expect(first.reference).toMatch(/^BAP-\d{4}-\d{4,}$/);
    expect(Number(second.reference!.split("-")[2])).toBe(Number(first.reference!.split("-")[2]) + 1);

    const events = await payload.find({ collection: "case-events", overrideAccess: true, where: { "request.relationTo": { equals: "baptism-requests" }, "request.value": { equals: second.id } } });
    expect(events.docs).toHaveLength(1);
    expect(events.docs[0]).toMatchObject({ action: "created", actorType: "system", to: "new", request: { relationTo: "baptism-requests" } });
  });

  it("requires a guardian with consent unless the candidate is an adult", async () => {
    const noGuardian = { name: null, relationship: null, consentConfirmed: false };
    await expect(serverCreate(childRequest({ guardian: noGuardian }))).rejects.toThrow(/guardian/i);
    await expect(serverCreate(childRequest({ guardian: { name: "Parent", relationship: "Father", consentConfirmed: false } }))).rejects.toThrow();
    const adult = await serverCreate(childRequest({ candidate: { fullName: "Adult Candidate", category: "adult" }, guardian: noGuardian }));
    expect(adult.reference).toMatch(/^BAP-/);
  });
});

describe("baptism requests are private (spec §3)", () => {
  it("office, clergy and super_admin read them through the local API", async () => {
    for (const actor of [superAdmin, office, clergy]) {
      const found = await payload.find({ collection: "baptism-requests", ...as(actor) });
      expect(found.docs.map((d) => d.id)).toContain(caseId);
    }
  });

  it("the public, editors, translators and finance get nothing through the local API", async () => {
    await expect(payload.find({ collection: "baptism-requests", overrideAccess: false })).rejects.toThrow();
    await expect(payload.findByID({ collection: "baptism-requests", id: caseId, overrideAccess: false })).rejects.toThrow();
    for (const actor of [editor, translator, finance]) {
      await expect(payload.find({ collection: "baptism-requests", ...as(actor) })).rejects.toThrow();
      await expect(payload.findByID({ collection: "baptism-requests", id: caseId, ...as(actor) })).rejects.toThrow();
      await expect(payload.find({ collection: "case-events", ...as(actor) })).rejects.toThrow();
    }
  });

  it("the public, editors and translators get nothing through REST", async () => {
    const accounts: Cookies[] = [{}, await login("bap-editor@test.local"), await login("bap-translator@test.local")];
    for (const cookies of accounts) {
      for (const path of ["baptism-requests", `baptism-requests/${caseId}`, "case-events", "baptism-requests/count"]) {
        const res = await api.get(path, cookies);
        expect(res.status, path).toBe(403);
        expect(await res.text()).not.toContain("Private Applicant");
      }
      expect((await api.post("baptism-requests", cookies, childRequest())).status).toBe(403);
      expect((await api.patch(`baptism-requests/${caseId}`, cookies, { status: "declined" })).status).toBe(403);
      // The status action (D-032): 401 without an account, 403 for other roles.
      expect([401, 403]).toContain((await api.post(`baptism-requests/${caseId}/status`, cookies, { to: "declined", note: "x" })).status);
      expect((await api.delete(`baptism-requests/${caseId}`, cookies)).status).toBe(403);
    }
    const unchanged = await payload.findByID({ collection: "baptism-requests", id: caseId, overrideAccess: true });
    expect(unchanged.status).toBe("new");
  });

  it("the public, editors and translators get nothing through GraphQL", async () => {
    const accounts: Cookies[] = [{}, await login("bap-editor@test.local"), await login("bap-translator@test.local")];
    for (const cookies of accounts) {
      for (const query of [
        "{ BaptismRequests { docs { id reference applicant { name email } } } }",
        `{ BaptismRequest(id: ${caseId}) { id applicant { name } } }`,
        "{ CaseEvents { docs { id action } } }",
      ]) {
        const result = await api.graphql(query, cookies);
        expect(result.errors?.length, query).toBeGreaterThan(0);
        expect(JSON.stringify(result.data ?? null)).not.toContain("Private Applicant");
      }
      const created = await api.graphql(
        'mutation { createBaptismRequest(data: { status: new, candidate: { category: adult }, privacyAccepted: true }) { id } }',
        cookies,
      );
      expect(created.errors?.length).toBeGreaterThan(0);
    }
    expect((await payload.count({ collection: "baptism-requests", overrideAccess: true, where: { "applicant.name": { exists: false } } })).totalDocs).toBe(0);
  });

  it("nobody creates a request through the API, staff included; only super_admin deletes", async () => {
    for (const actor of [superAdmin, office, clergy]) {
      await expect(payload.create({ collection: "baptism-requests", ...as(actor), data: childRequest() })).rejects.toThrow();
    }
    const extra = await serverCreate(childRequest());
    for (const actor of [office, clergy]) {
      await expect(payload.delete({ collection: "baptism-requests", id: extra.id, ...as(actor) })).rejects.toThrow();
    }
    await payload.delete({ collection: "baptism-requests", id: extra.id, ...as(superAdmin) });
  });

  it("office staff correct the applicant's details; clergy record the clergy decision", async () => {
    const byOffice = await payload.update({
      collection: "baptism-requests",
      id: caseId,
      ...as(office),
      data: {
        applicant: { ...childRequest().applicant, phone: "070-111 11 11" },
        internal: { clergyDecision: "approve" },
        reference: "BAP-0000-0000",
        privacyAccepted: false,
      },
    });
    expect(byOffice.applicant?.phone).toBe("070-111 11 11");
    expect(byOffice.internal?.clergyDecision ?? null).toBeNull();
    expect(byOffice.reference).toMatch(/^BAP-\d{4}-/);
    expect(byOffice.reference).not.toBe("BAP-0000-0000");
    expect(byOffice.privacyAccepted).toBe(true);

    const byClergy = await payload.update({
      collection: "baptism-requests",
      id: caseId,
      ...as(clergy),
      data: { applicant: { ...childRequest().applicant, name: "Changed" }, internal: { clergyDecision: "approve", clergyNotes: "Ready" } },
    });
    expect(byClergy.applicant?.name).toBe("Private Applicant");
    expect(byClergy.internal).toMatchObject({ clergyDecision: "approve", clergyNotes: "Ready" });
  });
});

describe("status action over HTTP (D-032)", () => {
  it("works for a signed-in office coordinator with MFA, through Payload's real handler", async () => {
    await payload.create({
      collection: "users",
      overrideAccess: true,
      data: { email: "bap-http-office@test.local", password: PASSWORD, name: "HTTP Office", roles: ["office_coordinator"], active: true },
    });
    const cookies = await login("bap-http-office@test.local");
    const { secret } = (await (await api.post("users/mfa/setup", cookies)).json()) as { secret: string };
    const enrolled = await api.post("users/mfa/enroll", cookies, { code: await generate({ secret }) });
    const mfa = (enrolled.headers.get("set-cookie") ?? "").match(new RegExp(`${MFA_COOKIE}=([^;]+)`))?.[1];
    const session = { ...cookies, [MFA_COOKIE]: mfa! };

    const { id } = await serverCreate(childRequest());
    const res = await api.post(`baptism-requests/${id}/status`, session, { to: "info_needed" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "info_needed" });
    const declined = await api.post(`baptism-requests/${id}/status`, session, { to: "declined" });
    expect(declined.status).toBe(400);
    expect((await declined.json()).error).toMatch(/internal note/);
    // Without the MFA cookie the same account may not.
    expect((await api.post(`baptism-requests/${id}/status`, cookies, { to: "declined", note: "x" })).status).toBe(403);
  });
});

describe("case events are an immutable audit log (spec §2.13)", () => {
  it("staff read them; nobody creates them through the API; only super_admin changes or deletes them", async () => {
    const [event] = (await payload.find({ collection: "case-events", ...as(office), where: { "request.relationTo": { equals: "baptism-requests" }, "request.value": { equals: caseId }, action: { equals: "created" } } })).docs;
    expect(event.action).toBe("created");
    expect((await payload.find({ collection: "case-events", ...as(clergy) })).totalDocs).toBeGreaterThan(0);

    const data = { request: { relationTo: "baptism-requests" as const, value: caseId }, actorType: "system" as const, action: "note_added" as const, at: new Date().toISOString(), at_tz: STOCKHOLM };
    for (const actor of [superAdmin, office, clergy]) {
      await expect(payload.create({ collection: "case-events", ...as(actor), data })).rejects.toThrow();
    }
    for (const actor of [office, clergy]) {
      await expect(payload.update({ collection: "case-events", id: event.id, ...as(actor), data: { note: "rewritten" } })).rejects.toThrow();
      await expect(payload.delete({ collection: "case-events", id: event.id, ...as(actor) })).rejects.toThrow();
    }
    expect((await payload.update({ collection: "case-events", id: event.id, ...as(superAdmin), data: { note: "corrected" } })).note).toBe("corrected");
  });
});
