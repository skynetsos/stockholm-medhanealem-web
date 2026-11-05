import { APIError, type Endpoint, type Payload, type PayloadRequest } from "payload";

import { hasStaffRole } from "../../access/content";
import type { CaseEvent } from "../../payload-types";
import { type CaseCollection, logCaseEvent } from "./events";
import { removePersonalData } from "./retention";

/**
 * Data subject requests (spec Phase 2 task 9, D-036): a super admin exports a case as JSON or erases
 * its personal data. Both are logged in the case's audit trail with who did it.
 */
type Actor = { user: PayloadRequest["user"]; req?: Partial<PayloadRequest> };

function requireSuperAdmin(payload: Payload, actor: Actor) {
  if (!actor.user) throw new APIError("Sign in first.", 401);
  // Not `{ ...actor.req }`: a real request's headers are a getter that spreading drops (D-032).
  const req = { headers: actor.req?.headers ?? new Headers(), user: actor.user, payload } as PayloadRequest;
  if (!hasStaffRole(req, ["super_admin"])) throw new APIError("Only a super admin can do this.", 403);
}

/** An audit entry as the person asking sees it: what happened and when, without staff names. */
function exportedEvent(event: CaseEvent) {
  const byStaff = event.actorType === "user";
  return {
    at: event.at,
    action: event.action,
    by: byStaff ? "staff" : "system",
    // Assignments name staff members, who are other people: left out.
    ...(event.action === "assigned" ? {} : { from: event.from ?? null, to: event.to ?? null, note: event.note ?? null }),
  };
}

/** Everything held about one case: its fields and its audit trail. Logs an "exported" entry. */
export async function exportCase(payload: Payload, collection: CaseCollection, id: number | string, actor: Actor) {
  requireSuperAdmin(payload, actor);
  const doc = await payload.findByID({ collection, id, depth: 0, overrideAccess: true });
  const events = await payload.find({
    collection: "case-events",
    overrideAccess: true,
    depth: 0,
    pagination: false,
    sort: "at",
    where: { and: [{ "request.relationTo": { equals: collection } }, { "request.value": { equals: doc.id } }] },
  });
  await logCaseEvent(payload, { collection, id: doc.id, action: "exported", actorId: actor.user!.id as number, note: "Exported as JSON" });
  // Staff assignment is internal and names a colleague: left out of the export.
  const { internal, assignedTo, ...fields } = doc as typeof doc & { internal?: Record<string, unknown>; assignedTo?: unknown };
  void assignedTo;
  const ownInternal = internal ? Object.fromEntries(Object.entries(internal).filter(([key]) => key !== "assignedTo")) : undefined;
  return {
    exportedAt: new Date().toISOString(),
    collection,
    case: ownInternal ? { ...fields, internal: ownInternal } : fields,
    timeline: events.docs.map(exportedEvent),
  };
}

/** Removes a case's personal data now, whatever its status. `confirm` must be the case's reference. */
export async function eraseCase(payload: Payload, collection: CaseCollection, id: number | string, confirm: unknown, actor: Actor) {
  requireSuperAdmin(payload, actor);
  const doc = await payload.findByID({ collection, id, depth: 0, overrideAccess: true });
  if (typeof confirm !== "string" || confirm.trim() !== doc.reference) throw new APIError("Type the case's reference to confirm.", 400);
  await removePersonalData(payload, collection, doc.id, { action: "erased", actorId: actor.user!.id as number });
  return { reference: doc.reference, erased: true };
}

const failure = (req: PayloadRequest, error: unknown) => {
  const status = error instanceof APIError ? error.status : 500;
  if (status === 500) req.payload.logger.error({ msg: "Data request failed", error: String(error) });
  return Response.json({ error: error instanceof APIError ? error.message : "Something went wrong." }, { status });
};

/** GET /:id/export and POST /:id/erase { confirm } on a case collection. */
export function dataRequestEndpoints(collection: CaseCollection): Endpoint[] {
  return [
    {
      path: "/:id/export",
      method: "get",
      handler: async (req) => {
        try {
          const data = await exportCase(req.payload, collection, String(req.routeParams?.id), { user: req.user, req });
          const reference = String((data.case as { reference?: string }).reference ?? req.routeParams?.id);
          return new Response(JSON.stringify(data, null, 2), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="${reference}.json"`,
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          return failure(req, error);
        }
      },
    },
    {
      path: "/:id/erase",
      method: "post",
      handler: async (req) => {
        try {
          const body = (await req.json?.()) as { confirm?: unknown } | undefined;
          return Response.json(await eraseCase(req.payload, collection, String(req.routeParams?.id), body?.confirm, { user: req.user, req }));
        } catch (error) {
          return failure(req, error);
        }
      },
    },
  ];
}
