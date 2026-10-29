import type { Payload } from "payload";

import { INQUIRY_TYPES } from "../../collections/Inquiries";
import type { Locale } from "../../i18n/locales";
import { logCaseEvent } from "../cases/events";
import { adminLink, emailSettings, officeRecipients } from "../office-email";
import { type InquiryErrors, type InquiryForm, parseInquiry } from "./inquiry-schema";
import { createRateLimiter, verifyTurnstile } from "./security";

/**
 * At most 5 messages per IP (hash) per 10 minutes (Phase 1 task 6), counted across all inquiry forms
 * together, so a script can't use each form for its own allowance (D-033).
 */
export const inquiryRateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

export type InquiryResult =
  | { status: "success"; reference: string | null }
  | { status: "error"; fieldErrors?: InquiryErrors; formError?: "spam" | "rateLimited" | "server" };

export type InquiryContext = { ipHash: string; locale: Locale; turnstileToken: string | null };

/**
 * Handles one inquiry form submission (contact, Sunday School, marriage, fitihat, volunteer):
 * 1. honeypot filled in → looks like success to the bot, nothing is stored or sent;
 * 2. validation (zod, per form) → field errors;
 * 3. rate limit per IP hash (counts valid attempts only, so fixing typos doesn't lock anyone out);
 * 4. Turnstile;
 * 5. stores the Inquiry and emails the office its reference and admin link only — no name, address
 *    or message in email (spec: "no sensitive echo"). A failed email never loses the inquiry: it is
 *    in the admin either way.
 */
export async function submitInquiry(
  payload: Payload,
  form: InquiryForm,
  raw: Record<string, unknown>,
  { ipHash, locale, turnstileToken }: InquiryContext,
  { verify = verifyTurnstile, limiter = inquiryRateLimiter } = {},
): Promise<InquiryResult> {
  if (typeof raw.website === "string" && raw.website.trim() !== "") return { status: "success", reference: null };

  const parsed = parseInquiry(form, raw);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors };
  if (!limiter.hit(ipHash)) return { status: "error", formError: "rateLimited" };
  if (!(await verify(turnstileToken))) return { status: "error", formError: "spam" };

  const d = parsed.data;
  try {
    const inquiry = await payload.create({
      collection: "inquiries",
      overrideAccess: true, // the public has no create access: forms are the only way in (spec §3)
      data: {
        type: form,
        status: "new",
        name: d.name,
        email: d.email,
        phone: d.phone || null,
        message: d.message || null,
        childName: d.childName || null,
        childAge: d.childAge ?? null,
        interests: d.interests?.length ? d.interests : null,
        availability: d.availability || null,
        preferredLocale: locale,
        privacyAccepted: true,
      },
    });
    await notifyOffice(payload, form, inquiry.id, inquiry.reference!);
    return { status: "success", reference: inquiry.reference ?? null };
  } catch (error) {
    payload.logger.error({ msg: "Inquiry form: could not save the inquiry", form, error: String(error) });
    return { status: "error", formError: "server" };
  }
}

/** Emails the office notification addresses (or the public office address) about a new inquiry. */
async function notifyOffice(payload: Payload, form: InquiryForm, id: number, reference: string) {
  const kind = INQUIRY_TYPES.find((t) => t.value === form)?.label ?? form;
  try {
    const to = officeRecipients(await emailSettings(payload));
    if (!to.length) {
      payload.logger.warn({ msg: "Inquiry form: no office email in Site settings; inquiry saved without notification", reference });
      return;
    }
    // Staff-facing (the admin is in English); deliberately without the visitor's details.
    await payload.sendEmail({
      to,
      subject: `New message from the website (${kind}): ${reference}`,
      text: [
        `A new message (${reference}, ${kind}) was sent on the website.`,
        "",
        `Read and answer it in the admin: ${adminLink("inquiries", id)}`,
        "",
        "The message and the sender's details are only in the admin, so personal data stays out of email.",
      ].join("\n"),
    });
    await logCaseEvent(payload, { collection: "inquiries", id, action: "email_sent", note: `Office notification (${to.length} recipients)` });
  } catch (error) {
    payload.logger.error({ msg: "Inquiry form: office email failed (inquiry is saved)", reference, error: String(error) });
  }
}
