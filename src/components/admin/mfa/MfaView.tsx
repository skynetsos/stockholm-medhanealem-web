import { MinimalTemplate } from "@payloadcms/next/templates";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { isMfaSatisfied, type MfaUser } from "../../../lib/mfa/session";
import { MfaFlow } from "./MfaFlow";

/** /admin/mfa — enrolment (first time) or per-session verification for privileged roles. */
export function MfaView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult;
  const user = req.user as (MfaUser & { email?: string }) | null;

  if (!user) redirect("/admin/login?redirect=%2Fadmin%2Fmfa");
  if (isMfaSatisfied(user, req.headers)) redirect("/admin");

  return (
    <MinimalTemplate>
      <MfaFlow mode={user.mfa?.enabled ? "verify" : "enrol"} />
    </MinimalTemplate>
  );
}
