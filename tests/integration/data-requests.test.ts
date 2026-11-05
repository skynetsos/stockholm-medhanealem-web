/** Data subject requests (spec Phase 2 task 9, D-036): export a case as JSON, erase its personal data. */
import { REST_GET, REST_POST } from "@payloadcms/next/routes";
import { generate } from "otplib";
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { eraseCase, exportCase } from "../../src/lib/cases/data-requests";
import { MFA_COOKIE } from "../../src/lib/mfa/session";
import { type Actor, as, createActor, rich } from "./helpers";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
const PASSWORD = "Integration-test-Pa55!";

let payload: Payload;
let superAdmin: Actor;
let office: Actor;
let clergy: Actor;
let editor: Actor;

const restGet = REST_GET(config);
const restPost = REST_POST(config);
type Cookies = Record<string, string>;
const request = (method: string, path: string, cookies: Cookies, body?: unknown) =>
  new Request(`${BASE}/api/${path}`, {
    method,
    headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "), "content-type": "application/json", origin: BASE },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (path: string) => ({ params: Promise.resolve({ slug: path.split("/") }) });
const api = {
  get: (path: string, cookies: Cookies) => restGet(request("GET", path, cookies), params(path)),
  post: (path: string, cookies: Cookies, body?: unknown) => restPost(request("POST", path, cookies, body), params(path)),
};

async function newCase() {
  const doc = await payload.create({
    collection: "baptism-requests",
    overrideAccess: true,
    data: {
      status: "new",
      applicant: { name: "Data Subject", email: "subject@example.org", phone: "070 111 22 33", preferredLocale: "am" },
      candidate: { fullName: "Subject Child", category: "child" },
      guardian: { name: "Data Subject", relationship: "Mother", consentConfirmed: true },
      notes: "Please call after 17:00",
      privacyAccepted: true,
      internal: { officeNotes: rich("Spoke to the mother") },
    },
  });
  // A staff action: assignment names a colleague, who must not appear in the export.
  await payload.update({ collection: "baptism-requests", id: doc.id, ...as(office), data: { internal: { assignedTo: office.user.id } } });
  return doc;
}

const events = (id: number, collection = "baptism-requests") =>
  payload
    .find({
      collection: "case-events",
      overrideAccess: true,
      depth: 0,
      pagination: false,
      sort: "id",
      where: { and: [{ "request.relationTo": { equals: collection } }, { "request.value": { equals: id } }] },
    })
    .then((r) => r.docs);

beforeAll(async () => {
  payload = await getPayload({ config });
  superAdmin = await createActor(payload, "dsr-admin@test.local", ["super_admin"], { name: "Admin Person" });
  office = await createActor(payload, "dsr-office@test.local", ["office_coordinator"], { name: "Office Colleague" });
  clergy = await createActor(payload, "dsr-clergy@test.local", ["clergy_approver"]);
  editor = await createActor(payload, "dsr-editor@test.local", ["editor"]);
});

afterAll(async () => {
  await payload?.destroy();
});

describe("export a case as JSON", () => {
  it("gives the case and its timeline, without staff names, and logs it", async () => {
    const doc = await newCase();
    const data = await exportCase(payload, "baptism-requests", doc.id, superAdmin);
    expect(data.case).toMatchObject({
      reference: doc.reference,
      applicant: { name: "Data Subject", email: "subject@example.org", phone: "070 111 22 33" },
      candidate: { fullName: "Subject Child" },
      notes: "Please call after 17:00",
    });
    expect(data.timeline.map((e) => e.action)).toEqual(["created", "assigned"]);
    expect(data.timeline.every((e) => e.by === "staff" || e.by === "system")).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/Office Colleague|dsr-office|Admin Person/);
    expect((await events(doc.id)).at(-1)).toMatchObject({ action: "exported", actorType: "user", actor: superAdmin.user.id });
  });

  it("is for super admins only", async () => {
    const doc = await newCase();
    for (const actor of [office, clergy, editor]) await expect(exportCase(payload, "baptism-requests", doc.id, actor)).rejects.toThrow(/super admin/);
    await expect(exportCase(payload, "baptism-requests", doc.id, { user: null })).rejects.toThrow(/Sign in/);
    expect((await events(doc.id)).some((e) => e.action === "exported")).toBe(false);
  });
});

describe("erase a case's personal data", () => {
  it("needs a super admin and the reference typed exactly", async () => {
    const doc = await newCase();
    await expect(eraseCase(payload, "baptism-requests", doc.id, doc.reference, office)).rejects.toThrow(/super admin/);
    await expect(eraseCase(payload, "baptism-requests", doc.id, "BAP-0000-0000", superAdmin)).rejects.toThrow(/reference/);
    expect((await payload.findByID({ collection: "baptism-requests", id: doc.id, overrideAccess: true })).applicant?.name).toBe("Data Subject");
  });

  it("removes the personal data at any status; reference, status and timeline stay; logged with who", async () => {
    const doc = await newCase();
    expect(await eraseCase(payload, "baptism-requests", doc.id, ` ${doc.reference} `, superAdmin)).toEqual({ reference: doc.reference, erased: true });
    const erased = await payload.findByID({ collection: "baptism-requests", id: doc.id, overrideAccess: true });
    expect(erased).toMatchObject({ reference: doc.reference, status: "new", applicant: { name: null, email: null, phone: null }, notes: null, internal: { officeNotes: null } });
    expect(erased.archivedAt).toBeTruthy();
    expect(JSON.stringify(erased)).not.toMatch(/Data Subject|subject@example|Spoke to the mother/);
    expect((await events(doc.id)).at(-1)).toMatchObject({ action: "erased", actorType: "user", actor: superAdmin.user.id });
  });

  it("works for inquiries too", async () => {
    const inquiry = await payload.create({
      collection: "inquiries",
      overrideAccess: true,
      data: { type: "volunteer", status: "in_progress", name: "Volunteer Subject", email: "vol@example.org", interests: ["choir"], availability: "Evenings", privacyAccepted: true },
    });
    const data = await exportCase(payload, "inquiries", inquiry.id, superAdmin);
    expect(data.case).toMatchObject({ name: "Volunteer Subject", interests: ["choir"] });
    await eraseCase(payload, "inquiries", inquiry.id, inquiry.reference, superAdmin);
    const erased = await payload.findByID({ collection: "inquiries", id: inquiry.id, overrideAccess: true });
    expect(erased).toMatchObject({ status: "in_progress", name: null, email: null, availability: null });
    expect(erased.interests ?? []).toEqual([]);
    expect((await events(inquiry.id, "inquiries")).map((e) => e.action)).toEqual(["exported", "erased"]);
  });
});

describe("over HTTP, through Payload's real handler", () => {
  it("a signed-in super admin with MFA downloads the export and erases; without MFA it is refused", async () => {
    await payload.create({
      collection: "users",
      overrideAccess: true,
      data: { email: "dsr-http@test.local", password: PASSWORD, name: "HTTP Admin", roles: ["super_admin"], active: true },
    });
    const login = await api.post("users/login", {}, { email: "dsr-http@test.local", password: PASSWORD });
    const cookies = { "payload-token": ((await login.json()) as { token: string }).token };
    const doc = await newCase();
    expect((await api.get(`baptism-requests/${doc.id}/export`, cookies)).status).toBe(403);

    const { secret } = (await (await api.post("users/mfa/setup", cookies)).json()) as { secret: string };
    const enrolled = await api.post("users/mfa/enroll", cookies, { code: await generate({ secret }) });
    const session = { ...cookies, [MFA_COOKIE]: (enrolled.headers.get("set-cookie") ?? "").match(new RegExp(`${MFA_COOKIE}=([^;]+)`))![1] };

    const exported = await api.get(`baptism-requests/${doc.id}/export`, session);
    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-disposition")).toBe(`attachment; filename="${doc.reference}.json"`);
    expect(((await exported.json()) as { case: { reference: string } }).case.reference).toBe(doc.reference);

    expect((await api.post(`baptism-requests/${doc.id}/erase`, session, { confirm: "wrong" })).status).toBe(400);
    const erased = await api.post(`baptism-requests/${doc.id}/erase`, session, { confirm: doc.reference });
    expect(erased.status).toBe(200);
    expect((await payload.findByID({ collection: "baptism-requests", id: doc.id, overrideAccess: true })).applicant?.name).toBeNull();
  });
});
