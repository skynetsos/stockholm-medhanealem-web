"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { defaultLocale, type Locale, locales } from "@/i18n/locales";
import { type BaptismResult, submitBaptismRequest } from "@/lib/forms/baptism";
import { clientIp, hashIp } from "@/lib/forms/security";

/** Baptism request form (spec Phase 2 task 4). The only way the public can create a request. */
export async function sendBaptismRequest(_previous: BaptismResult | null, form: FormData): Promise<BaptismResult> {
  const raw = Object.fromEntries(form.entries());
  const lang = String(raw.locale ?? "");
  const locale: Locale = (locales as readonly string[]).includes(lang) ? (lang as Locale) : defaultLocale;
  const token = form.get("cf-turnstile-response");
  const requestHeaders = await headers();

  const payload = await getPayload({ config });
  return submitBaptismRequest(payload, raw, {
    ipHash: hashIp(clientIp(requestHeaders)),
    locale,
    turnstileToken: typeof token === "string" ? token : null,
    userAgent: requestHeaders.get("user-agent"),
  });
}
