import type { Payload } from "payload";

import type { Locale } from "../../i18n/locales";
import { logCaseEvent } from "../cases/events";
import { adminLink, emailSettings, officeRecipients } from "../office-email";
import { type ContactErrorCode, type ContactField, parseContact } from "./contact-schema";
import { createRateLimiter, verifyTurnstile } from "./security";

/** Spec Phase 1 task 6: at most 5 contact messages per IP (hash) per 10 minutes. */
export const contactRateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

export type ContactResult =
  | { status: "success"; reference: string | null }
  | {
      status: "error";
      fieldErrors?: Partial<Record<ContactField, ContactErrorCode>>;
      formError?: "spam" | "rateLimited" | "server";
    };

/**
 * Handles one contact form submission (the server action passes the form and request details):
 * 1. honeypot filled in → looks like success to the bot, nothing is stored or sent;
 * 2. validation (zod) → field errors;
 * 3. rate limit per IP hash (counts valid attempts only, so fixing typos doesn't lock anyone out);
 * 4. Turnstile;
 * 5. stores the Inquiry (type contact) and emails the office its reference and admin link only —
 *    no name, address or message in email (spec: "no sensitive echo"). A failed email never loses
 *    the inquiry: it is in the admin either way.
 */
export async function submitContact(
  payload: Payload,
  raw: Record<string, unknown>,
  { ipHash, locale, turnstileToken }: { ipHash: string; locale: Locale; turnstileToken: string | null },
  { verify = verifyTurnstile, limiter = contactRateLimiter } = {},
): Promise<ContactResult> {
  if (typeof raw.website === "string" && raw.website.trim() !== "") return { status: "success", reference: null };

  const parsed = parseContact(raw);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors };
  if (!limiter.hit(ipHash)) return { status: "error", formError: "rateLimited" };
  if (!(await verify(turnstileToken))) return { status: "error", formError: "spam" };

  try {
    const inquiry = await payload.create({
      collection: "inquiries",
      overrideAccess: true, // the public has no create access: forms are the only way in (spec §3)
      data: {
        type: "contact",
        status: "new",
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
        preferredLocale: locale,
        privacyAccepted: true,
      },
    });
    await notifyOffice(payload, inquiry.id, inquiry.reference!);
    return { status: "success", reference: inquiry.reference ?? null };
  } catch (error) {
    payload.logger.error({ msg: "Contact form: could not save the inquiry", error: String(error) });
    return { status: "error", formError: "server" };
  }
}

/** Emails the office notification addresses (or the public office address) about a new inquiry. */
async function notifyOffice(payload: Payload, id: number, reference: string) {
  try {
    const to = officeRecipients(await emailSettings(payload));
    if (!to.length) {
      payload.logger.warn({ msg: "Contact form: no office email in Site settings; inquiry saved without notification", reference });
      return;
    }
    const link = adminLink("inquiries", id);
    // Staff-facing (the admin is in English); deliberately without the visitor's details.
    await payload.sendEmail({
      to,
      subject: `New message from the website: ${reference}`,
      text: [
        `A new message (${reference}) was sent with the contact form on the website.`,
        "",
        `Read and answer it in the admin: ${link}`,
        "",
        "The message and the sender's details are only in the admin, so personal data stays out of email.",
      ].join("\n"),
    });
    await logCaseEvent(payload, { collection: "inquiries", id, action: "email_sent", note: `Office notification (${to.length} recipients)` });
  } catch (error) {
    payload.logger.error({ msg: "Contact form: office email failed (inquiry is saved)", reference, error: String(error) });
  }
}
