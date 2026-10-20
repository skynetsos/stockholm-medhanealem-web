"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { defaultLocale, type Locale, locales } from "@/i18n/locales";
import { type ContactResult, submitContact } from "@/lib/forms/contact";
import { clientIp, hashIp } from "@/lib/forms/security";

/** What the form shows after sending: the result plus the visitor's own entries (kept on errors). */
export type ContactState =
  | null
  | (ContactResult & { values?: { name: string; email: string; phone: string; message: string; privacyAccepted: boolean } });

/** Contact form on /visit (spec Phase 1 task 6). The only way the public can create an inquiry. */
export async function sendContactMessage(_previous: ContactState, form: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(form.entries());
  const lang = String(raw.locale ?? "");
  const locale: Locale = (locales as readonly string[]).includes(lang) ? (lang as Locale) : defaultLocale;
  const token = form.get("cf-turnstile-response");

  const payload = await getPayload({ config });
  const result = await submitContact(payload, raw, {
    ipHash: hashIp(clientIp(await headers())),
    locale,
    turnstileToken: typeof token === "string" ? token : null,
  });
  if (result.status === "success") return result;
  return {
    ...result,
    values: {
      name: String(raw.name ?? ""),
      email: String(raw.email ?? ""),
      phone: String(raw.phone ?? ""),
      message: String(raw.message ?? ""),
      privacyAccepted: raw.privacyAccepted === "on",
    },
  };
}
