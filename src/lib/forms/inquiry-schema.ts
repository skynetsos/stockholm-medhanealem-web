import { z } from "zod";

/**
 * Inquiry forms (spec §2.14, Phase 1 task 6 and Phase 2 task 7): one schema per type, sharing the
 * contact details and privacy consent. The server is the authority; the browser checks the same
 * limits for quick feedback. Error codes map to message keys (contact.errors.*). No server-only
 * imports: the forms use this.
 */
export const INQUIRY_LIMITS = { name: 100, email: 254, phone: 40, messageMin: 10, message: 4000, availability: 1000 } as const;

/** Forms the public may send, and the inquiry type each one stores. */
export const PUBLIC_INQUIRY_FORMS = ["contact", "sunday_school", "marriage", "funeral", "volunteer"] as const;
export type InquiryForm = (typeof PUBLIC_INQUIRY_FORMS)[number];

/** Ways to help that volunteers can tick (labels: inquiryForms.volunteer.interests.*). */
export const VOLUNTEER_INTERESTS = ["liturgy", "choir", "sunday_school", "hospitality", "property", "media", "events", "other"] as const;

export const CHILD_AGE = { min: 3, max: 18 } as const;

const text = (max: number) => z.string().trim().max(max, "tooLong");
const required = (max: number) => text(max).min(1, "required");
const message = (min: number) => required(INQUIRY_LIMITS.message).min(min, "messageShort");

const common = {
  name: required(INQUIRY_LIMITS.name),
  email: required(INQUIRY_LIMITS.email).pipe(z.email("email")),
  phone: text(INQUIRY_LIMITS.phone).refine((v) => v === "" || /^\+?[\d\s()-]{6,}$/.test(v), "phone"),
  privacyAccepted: z.literal(true, "privacy"),
};

export const INQUIRY_SCHEMAS = {
  contact: z.object({ ...common, message: message(INQUIRY_LIMITS.messageMin) }),
  marriage: z.object({ ...common, message: message(INQUIRY_LIMITS.messageMin) }),
  funeral: z.object({ ...common, message: message(INQUIRY_LIMITS.messageMin) }),
  sunday_school: z.object({
    ...common,
    childName: required(INQUIRY_LIMITS.name),
    childAge: z
      .string()
      .trim()
      .min(1, "required")
      .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= CHILD_AGE.min && Number(v) <= CHILD_AGE.max, "childAge")
      .transform(Number),
    message: text(INQUIRY_LIMITS.message),
  }),
  volunteer: z.object({
    ...common,
    interests: z.array(z.enum(VOLUNTEER_INTERESTS)).min(1, "interests"),
    availability: text(INQUIRY_LIMITS.availability),
    message: text(INQUIRY_LIMITS.message),
  }),
} as const satisfies Record<InquiryForm, z.ZodType>;

export type InquiryInput = {
  name: string;
  email: string;
  phone: string;
  privacyAccepted: true;
  message?: string;
  childName?: string;
  childAge?: number;
  interests?: (typeof VOLUNTEER_INTERESTS)[number][];
  availability?: string;
};
export type InquiryField = "name" | "email" | "phone" | "privacyAccepted" | "message" | "childName" | "childAge" | "interests" | "availability";
export type InquiryErrorCode = "required" | "tooLong" | "email" | "phone" | "messageShort" | "privacy" | "childAge" | "interests";
export type InquiryErrors = Partial<Record<InquiryField, InquiryErrorCode>>;

export const isInquiryForm = (value: unknown): value is InquiryForm => PUBLIC_INQUIRY_FORMS.includes(value as InquiryForm);

/** Field → first error code, or the parsed values. Accepts FormData entries or plain values. */
export function parseInquiry(form: InquiryForm, raw: Record<string, unknown>): { ok: true; data: InquiryInput } | { ok: false; errors: InquiryErrors } {
  const interests = raw.interests;
  const result = INQUIRY_SCHEMAS[form].safeParse({
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    message: String(raw.message ?? ""),
    childName: String(raw.childName ?? ""),
    childAge: String(raw.childAge ?? ""),
    interests: Array.isArray(interests) ? interests.map(String) : typeof interests === "string" && interests ? [interests] : [],
    availability: String(raw.availability ?? ""),
    privacyAccepted: raw.privacyAccepted === true || raw.privacyAccepted === "on",
  });
  if (result.success) return { ok: true, data: result.data as InquiryInput };
  const errors: InquiryErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as InquiryField;
    // A wrong option in the list (only possible by tampering) counts as "choose at least one".
    errors[field] ??= (field === "interests" ? "interests" : issue.message) as InquiryErrorCode;
  }
  return { ok: false, errors };
}
