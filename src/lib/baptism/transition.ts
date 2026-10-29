import { APIError, type Endpoint, type Payload, type PayloadRequest } from "payload";

import { hasStaffRole } from "../../access/content";
import type { BaptismRequest } from "../../payload-types";
import { type BaptismStatus, isBaptismStatus } from "./state";
import { TRANSITION_NOTE_MAX } from "./transition-limits";

export type StatusChange = { id: number | string; to: BaptismStatus; note?: string | null };

/**
 * The only way a baptism request changes status (D-032): the status field itself can't be changed
 * through the admin form or the API. Checks that the actor handles requests (with MFA), then saves
 * as that actor, so the workflow hook checks the transition and their role, and the audit log and
 * emails name them. The note (required when declining) goes into the audit log.
 */
export async function changeStatus(
  payload: Payload,
  { id, to, note }: StatusChange,
  actor: { user: PayloadRequest["user"]; req?: Partial<PayloadRequest> },
): Promise<BaptismRequest> {
  // Only what the role check needs. Not `{ ...actor.req }`: a real request's headers are a getter on
  // its prototype, which spreading drops (and the MFA check reads the headers).
  const req = { headers: actor.req?.headers ?? new Headers(), user: actor.user, payload } as PayloadRequest;
  if (!actor.user) throw new APIError("Sign in to change a request.", 401);
  if (!hasStaffRole(req, ["super_admin", "office_coordinator", "clergy_approver"])) throw new APIError("You are not allowed to change requests.", 403);
  if (!isBaptismStatus(to)) throw new APIError("Unknown status.", 400);
  if (note && note.length > TRANSITION_NOTE_MAX) throw new APIError("The note is too long.", 400);

  return payload.update({
    collection: "baptism-requests",
    id,
    data: { status: to },
    user: actor.user,
    req: actor.req,
    // The status field is closed to edits; this action is the exception. Role and transition are
    // checked by the workflow hook, which runs either way.
    overrideAccess: true,
    context: { transitionNote: note?.trim() || undefined },
  });
}

/** POST /api/baptism-requests/:id/status { to, note } — the status buttons on the case page. */
export const statusEndpoint: Endpoint = {
  path: "/:id/status",
  method: "post",
  handler: async (req) => {
    try {
      const body = (await req.json?.()) as { to?: unknown; note?: unknown } | undefined;
      const doc = await changeStatus(
        req.payload,
        { id: String(req.routeParams?.id), to: body?.to as BaptismStatus, note: typeof body?.note === "string" ? body.note : null },
        { user: req.user, req },
      );
      return Response.json({ status: doc.status });
    } catch (error) {
      const status = error instanceof APIError ? error.status : 500;
      const message = error instanceof APIError ? error.message : "Something went wrong.";
      if (status === 500) req.payload.logger.error({ msg: "Status change failed", error: String(error) });
      return Response.json({ error: message }, { status });
    }
  },
};
