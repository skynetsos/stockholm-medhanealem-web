import { z } from "./zod";

/**
 * Inquiry forms (spec §2.14, Phase 1 task 6, Phase 2 task 7; field groups and order after the
 * reference layout, D-050): one schema per form. The server is the authority; the browser checks the
 * same rules for quick feedback. Error codes map to message keys (contact.errors.*). No server-only
 * imports: the forms use this.
 */
export const INQUIRY_LIMITS = { name: 100, email: 254, phone: 40, messageMin: 10, message: 4000, availability: 1000 } as const;

/** Forms the public may send, and the inquiry type each one stores. "pastoral" is the prayer request. */
export const PUBLIC_INQUIRY_FORMS = ["contact", "sunday_school", "marriage", "funeral", "pastoral", "volunteer"] as const;
export type InquiryForm = (typeof PUBLIC_INQUIRY_FORMS)[number];

/** Ways to help that volunteers can tick (labels: inquiryForms.volunteer.interest.*). */
export const VOLUNTEER_INTERESTS = ["liturgy", "choir", "sunday_school", "hospitality", "property", "media", "events", "other"] as const;

/** What a prayer request is about (labels: inquiryForms.pastoral.types.*). */
export const PRAYER_REQUEST_TYPES = ["confession", "sick", "home_blessing", "comfort", "blessing", "appointment", "other"] as const;

export const CHILD_AGE = { min: 3, max: 18 } as const;

/** The wedding request's two steps and the fields on each (the reference layout's two-step form). */
export const MARRIAGE_STEPS = [
  { step: "couple", fields: ["name", "partnerName", "phone", "partnerPhone"] },
  { step: "wedding", fields: ["email", "preferredDate", "message", "privacyAccepted"] },
] as const satisfies { step: string; fields: InquiryField[] }[];
export type MarriageStep = (typeof MARRIAGE_STEPS)[number]["step"];

const text = (max: number) => z.string().trim().max(max, "tooLong");
const required = (max: number) => text(max).min(1, "required");
const message = (min: number) => required(INQUIRY_LIMITS.message).min(min, "messageShort");
const isPhone = (v: string) => /^\+?[\d\s()-]{6,}$/.test(v);
const optionalPhone = text(INQUIRY_LIMITS.phone).refine((v) => v === "" || isPhone(v), "phone");
const requiredPhone = required(INQUIRY_LIMITS.phone).refine(isPhone, "phone");
const email = required(INQUIRY_LIMITS.email).pipe(z.email("email"));
const optionalEmail = text(INQUIRY_LIMITS.email).refine((v) => v === "" || z.email().safeParse(v).success, "email");
const privacy = z.literal(true, "privacy");

const today = () => new Date().toISOString().slice(0, 10);
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v) && v >= "1900-01-01";
/** An optional day ("" or "YYYY-MM-DD"); `when` limits it to the past or the future (today allowed). */
const day = (when: "past" | "future") =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || isDay(v), "date")
    .refine((v) => v === "" || !isDay(v) || (when === "past" ? v <= today() : v >= today()), when === "past" ? "dateFuture" : "datePast");

const optionalMessage = text(INQUIRY_LIMITS.message);

export const INQUIRY_SCHEMAS = {
  // Name, email, message (the reference layout's contact form; no phone).
  contact: z.object({ name: required(INQUIRY_LIMITS.name), email, message: message(INQUIRY_LIMITS.messageMin), privacyAccepted: privacy }),
  // Step 1: groom, bride, both phones. Step 2: email for the reply, preferred date, notes, consent.
  marriage: z.object({
    name: required(INQUIRY_LIMITS.name),
    partnerName: required(INQUIRY_LIMITS.name),
    phone: requiredPhone,
    partnerPhone: requiredPhone,
    email,
    preferredDate: day("future"),
    message: optionalMessage,
    privacyAccepted: privacy,
  }),
  // Memorial (fitihat): who asks, the departed, the dates, notes.
  funeral: z.object({
    name: required(INQUIRY_LIMITS.name),
    phone: requiredPhone,
    email,
    deceasedName: required(INQUIRY_LIMITS.name),
    dateOfPassing: day("past"),
    preferredDate: day("future"),
    message: optionalMessage,
    privacyAccepted: privacy,
  }),
  // Prayer request: an optional priest, then name, phone, optional email, what it is about, details.
  pastoral: z.object({
    priest: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{1,9}$/.test(v), "choice"),
    name: required(INQUIRY_LIMITS.name),
    phone: requiredPhone,
    email: optionalEmail,
    requestType: z.enum(PRAYER_REQUEST_TYPES, "choice"),
    message: optionalMessage,
    privacyAccepted: privacy,
  }),
  sunday_school: z.object({
    name: required(INQUIRY_LIMITS.name),
    email,
    phone: optionalPhone,
    childName: required(INQUIRY_LIMITS.name),
    childAge: z
      .string()
      .trim()
      .min(1, "required")
      .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= CHILD_AGE.min && Number(v) <= CHILD_AGE.max, "childAge")
      .transform(Number),
    message: optionalMessage,
    privacyAccepted: privacy,
  }),
  volunteer: z.object({
    name: required(INQUIRY_LIMITS.name),
    email,
    phone: optionalPhone,
    interests: z.array(z.enum(VOLUNTEER_INTERESTS)).min(1, "interests"),
    availability: text(INQUIRY_LIMITS.availability),
    message: optionalMessage,
    privacyAccepted: privacy,
  }),
} as const satisfies Record<InquiryForm, z.ZodType>;

export type InquiryInput = {
  name: string;
  email?: string;
  phone?: string;
  privacyAccepted: true;
  message?: string;
  childName?: string;
  childAge?: number;
  interests?: (typeof VOLUNTEER_INTERESTS)[number][];
  availability?: string;
  partnerName?: string;
  partnerPhone?: string;
  preferredDate?: string;
  deceasedName?: string;
  dateOfPassing?: string;
  requestType?: (typeof PRAYER_REQUEST_TYPES)[number];
  priest?: string;
};
export type InquiryField =
  | "name"
  | "email"
  | "phone"
  | "privacyAccepted"
  | "message"
  | "childName"
  | "childAge"
  | "interests"
  | "availability"
  | "partnerName"
  | "partnerPhone"
  | "preferredDate"
  | "deceasedName"
  | "dateOfPassing"
  | "requestType"
  | "priest";
export type InquiryErrorCode =
  | "required"
  | "tooLong"
  | "email"
  | "phone"
  | "messageShort"
  | "privacy"
  | "childAge"
  | "interests"
  | "date"
  | "datePast"
  | "dateFuture"
  | "choice";
export type InquiryErrors = Partial<Record<InquiryField, InquiryErrorCode>>;

/** The fields each form shows, in order (the browser renders and the error summary lists them so). */
export const FORM_FIELDS: Record<InquiryForm, readonly InquiryField[]> = {
  contact: ["name", "email", "message", "privacyAccepted"],
  marriage: [...MARRIAGE_STEPS[0].fields, ...MARRIAGE_STEPS[1].fields],
  funeral: ["name", "phone", "email", "deceasedName", "dateOfPassing", "preferredDate", "message", "privacyAccepted"],
  pastoral: ["priest", "name", "phone", "email", "requestType", "message", "privacyAccepted"],
  sunday_school: ["name", "email", "phone", "childName", "childAge", "message", "privacyAccepted"],
  volunteer: ["name", "email", "phone", "interests", "availability", "message", "privacyAccepted"],
};

export const isInquiryForm = (value: unknown): value is InquiryForm => PUBLIC_INQUIRY_FORMS.includes(value as InquiryForm);

const TEXT_FIELDS = ["name", "email", "phone", "message", "childName", "childAge", "availability", "partnerName", "partnerPhone", "preferredDate", "deceasedName", "dateOfPassing", "priest"] as const;

/** Field → first error code, or the parsed values. Accepts FormData entries or plain values. */
export function parseInquiry(form: InquiryForm, raw: Record<string, unknown>): { ok: true; data: InquiryInput } | { ok: false; errors: InquiryErrors } {
  const interests = raw.interests;
  const values: Record<string, unknown> = Object.fromEntries(TEXT_FIELDS.map((f) => [f, String(raw[f] ?? "")]));
  values.interests = Array.isArray(interests) ? interests.map(String) : typeof interests === "string" && interests ? [interests] : [];
  values.requestType = raw.requestType || undefined;
  values.privacyAccepted = raw.privacyAccepted === true || raw.privacyAccepted === "on";
  const result = INQUIRY_SCHEMAS[form].safeParse(values);
  if (result.success) return { ok: true, data: result.data as InquiryInput };
  const errors: InquiryErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as InquiryField;
    // A wrong option in a list (only possible by tampering) counts as "choose".
    errors[field] ??= (field === "interests" ? "interests" : issue.message) as InquiryErrorCode;
  }
  return { ok: false, errors };
}

/** Errors on some fields only (the browser, before "Next" on a multi-step form). */
export function parseInquiryFields(form: InquiryForm, raw: Record<string, unknown>, fields: readonly InquiryField[]): InquiryErrors {
  const result = parseInquiry(form, raw);
  if (result.ok) return {};
  return Object.fromEntries(Object.entries(result.errors).filter(([field]) => fields.includes(field as InquiryField)));
}
