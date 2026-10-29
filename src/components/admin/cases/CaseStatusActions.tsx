import type { UIFieldServerProps } from "payload";

import { hasStaffRole } from "../../../access/content";
import { allowedTransitions, isBaptismStatus, isFinal } from "../../../lib/baptism/state";
import { StatusActionButtons } from "./StatusActionButtons";

/**
 * Case page sidebar (spec Phase 2 task 6, D-032): the current status and buttons for exactly the
 * transitions this user may make now — others are hidden, not disabled. The server checks again.
 */
export function CaseStatusActions({ id, data, req }: UIFieldServerProps) {
  const status = (data as { status?: unknown } | undefined)?.status;
  if (!id || !isBaptismStatus(status)) return null;
  const handler = hasStaffRole(req, ["super_admin", "office_coordinator", "clergy_approver"]);
  const transitions = handler ? allowedTransitions(status, req.user as { roles?: string[] }) : [];
  const scheduledDate = (data as { internal?: { scheduledDate?: string | null } }).internal?.scheduledDate ?? null;
  return <StatusActionButtons id={String(id)} status={status} transitions={transitions} final={isFinal(status)} scheduledDate={scheduledDate} />;
}
