import type { Payload } from "payload";

import type { Locale } from "../../i18n/locales";
import { notifyOfficeOfBaptism, sendApplicantEmail } from "../baptism/emails";
import { stockholmInstant } from "../stockholm-time";
import { type BaptismErrors, parseBaptism } from "./baptism-schema";
import { createRateLimiter, verifyTurnstile } from "./security";

/** Spec Phase 2 task 4: at most 3 baptism requests per IP (hash) per hour. */
export const baptismRateLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60_000 });

const STOCKHOLM = "Europe/Stockholm" as const;

export type BaptismResult =
  | { status: "success"; reference: string | null }
  | { status: "error"; fieldErrors?: BaptismErrors; formError?: "spam" | "rateLimited" | "closed" | "server" };

export type BaptismContext = { ipHash: string; locale: Locale; turnstileToken: string | null; userAgent: string | null };

/**
 * Handles one baptism request (the server action passes the form and request details), like the
 * contact form (D-022):
 * 1. honeypot filled in → looks like success to the bot, nothing is stored;
 * 2. requests closed in the Baptism page settings → refused (the page may still be open in a tab);
 * 3. validation of all three steps (zod) → field errors;
 * 4. rate limit per IP hash (valid attempts only); 5. Turnstile;
 * 6. stores the request (status "new", reference BAP-YYYY-NNNN; a "created" audit entry is added by
 *    the collection), then emails the applicant an acknowledgement and the office a notification
 *    (task 5). A failed email never loses the request: it is in the admin either way.
 */
export async function submitBaptismRequest(
  payload: Payload,
  raw: Record<string, unknown>,
  { ipHash, locale, turnstileToken, userAgent }: BaptismContext,
  { verify = verifyTurnstile, limiter = baptismRateLimiter, now = () => new Date() } = {},
): Promise<BaptismResult> {
  if (typeof raw.website === "string" && raw.website.trim() !== "") return { status: "success", reference: null };

  const settings = await payload.findGlobal({ slug: "baptism-page", overrideAccess: true, depth: 0 });
  if (!settings.requestsOpen) return { status: "error", formError: "closed" };

  const parsed = parseBaptism(raw);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors };
  if (!limiter.hit(ipHash)) return { status: "error", formError: "rateLimited" };
  if (!(await verify(turnstileToken))) return { status: "error", formError: "spam" };

  const d = parsed.data;
  const [year, month, day] = d.dateOfBirth.split("-").map(Number);
  const adult = d.category === "adult";
  try {
    const request = await payload.create({
      collection: "baptism-requests",
      overrideAccess: true, // the public has no create access: this form is the only way in (spec §3)
      data: {
        status: "new",
        applicant: {
          name: d.applicantName,
          email: d.applicantEmail,
          phone: d.applicantPhone || null,
          preferredLocale: locale,
          parishRelationship: d.parishRelationship,
        },
        candidate: {
          fullName: d.candidateName,
          dateOfBirth: stockholmInstant({ year, month, day }).toISOString(),
          dateOfBirth_tz: STOCKHOLM,
          category: d.category,
        },
        guardian: adult
          ? { name: null, relationship: null, consentConfirmed: false }
          : { name: d.guardianName, relationship: d.guardianRelationship, consentConfirmed: true },
        preferredPeriod: d.preferredPeriod || null,
        notes: d.notes || null,
        privacyAccepted: true,
        source: { ipHash, userAgent: userAgent?.slice(0, 300) || null, submittedAt: now().toISOString(), submittedAt_tz: STOCKHOLM },
      },
    });
    await sendApplicantEmail(payload, request, "acknowledgement");
    await notifyOfficeOfBaptism(payload, request);
    return { status: "success", reference: request.reference ?? null };
  } catch (error) {
    payload.logger.error({ msg: "Baptism request: could not save", error: String(error) });
    return { status: "error", formError: "server" };
  }
}
