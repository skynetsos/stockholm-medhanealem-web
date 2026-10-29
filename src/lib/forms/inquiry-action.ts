"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { defaultLocale, type Locale, locales } from "@/i18n/locales";
import { type InquiryResult, submitInquiry } from "@/lib/forms/inquiry";
import { type InquiryForm, isInquiryForm } from "@/lib/forms/inquiry-schema";
import { clientIp, hashIp } from "@/lib/forms/security";

/** What a form shows after sending: the result plus the visitor's own entries (kept on errors). */
export type InquiryState = null | (InquiryResult & { values?: Record<string, string | string[]> });

/**
 * The inquiry forms (contact, Sunday School, marriage, fitihat, volunteer; D-033). The only way the
 * public can create an inquiry. The form type comes from a hidden field and must be a public form.
 */
export async function sendInquiry(_previous: InquiryState, form: FormData): Promise<InquiryState> {
  const type = form.get("form");
  if (!isInquiryForm(type)) return { status: "error", formError: "server" };
  const raw: Record<string, unknown> = { ...Object.fromEntries(form.entries()), interests: form.getAll("interests").map(String) };
  const lang = String(raw.locale ?? "");
  const locale: Locale = (locales as readonly string[]).includes(lang) ? (lang as Locale) : defaultLocale;
  const token = form.get("cf-turnstile-response");

  const payload = await getPayload({ config });
  const result = await submitInquiry(payload, type as InquiryForm, raw, {
    ipHash: hashIp(clientIp(await headers())),
    locale,
    turnstileToken: typeof token === "string" ? token : null,
  });
  if (result.status === "success") return result;
  const keep = ["name", "email", "phone", "message", "childName", "childAge", "availability"] as const;
  return {
    ...result,
    values: {
      ...Object.fromEntries(keep.map((k) => [k, String(raw[k] ?? "")])),
      interests: raw.interests as string[],
      privacyAccepted: raw.privacyAccepted === "on" ? "on" : "",
    },
  };
}
