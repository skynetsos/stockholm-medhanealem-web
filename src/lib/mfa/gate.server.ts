import config from "@payload-config";
import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { adminMfaRedirect } from "./gate";

/** Called by the admin catch-all page before Payload renders anything. */
export async function enforceAdminMfa(segments: string[] | undefined): Promise<void> {
  const headers = await getHeaders();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers });
  const target = adminMfaRedirect({ user, headers, segments });
  if (target) redirect(target);
}
