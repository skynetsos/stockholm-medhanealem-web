import { z } from "zod";

/**
 * Contact form fields (spec Phase 1 task 6). The server is the authority; the browser checks the
 * same limits (required, maxLength, type=email) for quick feedback. Error codes map to message keys
 * (contact.errors.*), so the text is translated.
 */
export const CONTACT_LIMITS = { name: 100, email: 254, phone: 40, messageMin: 10, message: 4000 } as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "required").max(CONTACT_LIMITS.name, "tooLong"),
  email: z.string().trim().min(1, "required").max(CONTACT_LIMITS.email, "tooLong").pipe(z.email("email")),
  phone: z
    .string()
    .trim()
    .max(CONTACT_LIMITS.phone, "tooLong")
    .refine((v) => v === "" || /^\+?[\d\s()-]{6,}$/.test(v), "phone"),
  message: z.string().trim().min(1, "required").min(CONTACT_LIMITS.messageMin, "messageShort").max(CONTACT_LIMITS.message, "tooLong"),
  privacyAccepted: z.literal(true, "privacy"),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;
export type ContactErrorCode = "required" | "tooLong" | "email" | "phone" | "messageShort" | "privacy";

/** Field → first error code, or the parsed values. */
export function parseContact(raw: Record<string, unknown>):
  | { ok: true; data: ContactInput }
  | { ok: false; errors: Partial<Record<ContactField, ContactErrorCode>> } {
  const result = contactSchema.safeParse({
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    message: String(raw.message ?? ""),
    privacyAccepted: raw.privacyAccepted === true || raw.privacyAccepted === "on",
  });
  if (result.success) return { ok: true, data: result.data };
  const errors: Partial<Record<ContactField, ContactErrorCode>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField;
    errors[field] ??= issue.message as ContactErrorCode;
  }
  return { ok: false, errors };
}
