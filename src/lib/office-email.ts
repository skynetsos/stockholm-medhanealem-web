import type { Payload } from "payload";

import type { SiteSetting } from "../payload-types";

/** Who is told about new requests: the office notification addresses, else the public office address. */
export function officeRecipients(settings: Pick<SiteSetting, "officeNotificationEmails" | "officeEmail">): string[] {
  const to = (settings.officeNotificationEmails ?? []).map((e) => e.email).filter((e): e is string => Boolean(e));
  if (!to.length && settings.officeEmail) to.push(settings.officeEmail);
  return to;
}

/** Site settings as server code needs them for email (all languages' fallbacks resolved per call). */
export const emailSettings = (payload: Payload, locale: "am" | "en" | "sv" = "am") =>
  payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0, locale });

/** Link to a case in the admin. */
export const adminLink = (collection: "inquiries" | "baptism-requests", id: number) =>
  `${process.env.NEXT_PUBLIC_SERVER_URL}/admin/collections/${collection}/${id}`;
