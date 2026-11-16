import type { CollectionAfterLoginHook } from "payload";

import { requiresMfa } from "../../access/roles";

/**
 * Sign-in alerts for privileged roles (spec §8; review F-12): super admins, clergy approvers and
 * office coordinators can read baptism requests, so each sign-in to such an account is emailed to its
 * owner, who can react if it wasn't them. The email names the time (Stockholm) and the browser, never
 * the password or the address. It never blocks the sign-in: if sending fails, that is only logged.
 */
export const loginAlert: CollectionAfterLoginHook = async ({ req, user }) => {
  const account = user as { email?: string; roles?: string[] | null } | null;
  if (!account?.email || !requiresMfa(account)) return;
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(new Date());
  const browser = (req.headers?.get("user-agent") ?? "unknown browser").slice(0, 200);
  try {
    await req.payload.sendEmail({
      to: account.email,
      subject: "New sign-in to the Medhanealem website admin",
      text: [
        "Your account was just used to sign in to the church website's admin.",
        "",
        `Time: ${when} (Stockholm)`,
        `Browser: ${browser}`,
        "",
        "If this was you, there is nothing to do.",
        "If it wasn't, change your password now and tell the site administrator, who can reset your two-factor sign-in.",
      ].join("\n"),
    });
  } catch (error) {
    req.payload.logger.warn({ msg: "Sign-in alert could not be sent", error: String(error) });
  }
};
