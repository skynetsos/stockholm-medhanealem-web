import { z } from "zod";

/**
 * Baptism request form (spec Phase 2 task 4): one zod schema per step, used by the browser to check
 * a step before moving on and by the server to check everything again. Error codes map to message
 * keys (baptismForm.errors.*), so the text is translated. No server-only imports: the form uses this.
 */
export const BAPTISM_LIMITS = { name: 100, email: 254, phone: 40, relationship: 60, period: 100, notes: 2000 } as const;

export const BAPTISM_STEPS = ["applicant", "candidate", "review"] as const;
export type BaptismStep = (typeof BAPTISM_STEPS)[number];

export const PARISH_RELATIONSHIPS = ["member", "regular", "new"] as const;
export const CANDIDATE_CATEGORIES = ["infant", "child", "adult"] as const;

const text = (max: number) => z.string().trim().max(max, "tooLong");
const required = (max: number) => text(max).min(1, "required");

/** "YYYY-MM-DD" (a date input's value): a real day, not in the future, not before 1900. */
const birthDate = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), "date")
  .refine((v) => v >= "1900-01-01", "date")
  .refine((v) => v <= new Date().toISOString().slice(0, 10), "dateFuture");

export const applicantSchema = z.object({
  applicantName: required(BAPTISM_LIMITS.name),
  applicantEmail: required(BAPTISM_LIMITS.email).pipe(z.email("email")),
  applicantPhone: text(BAPTISM_LIMITS.phone).refine((v) => v === "" || /^\+?[\d\s()-]{6,}$/.test(v), "phone"),
  parishRelationship: z.enum(PARISH_RELATIONSHIPS, "choice"),
});

const candidateFields = z.object({
  candidateName: required(BAPTISM_LIMITS.name),
  dateOfBirth: birthDate,
  category: z.enum(CANDIDATE_CATEGORIES, "choice"),
  guardianName: text(BAPTISM_LIMITS.name),
  guardianRelationship: text(BAPTISM_LIMITS.relationship),
  guardianConsent: z.boolean(),
  preferredPeriod: text(BAPTISM_LIMITS.period),
  notes: text(BAPTISM_LIMITS.notes),
});

/** The guardian (spec §2.12) is required unless the candidate is an adult; an adult has none. */
export const candidateSchema = candidateFields
  .superRefine((v, ctx) => {
    if (v.category === "adult") return;
    if (!v.guardianName) ctx.addIssue({ code: "custom", path: ["guardianName"], message: "required" });
    if (!v.guardianRelationship) ctx.addIssue({ code: "custom", path: ["guardianRelationship"], message: "required" });
    if (!v.guardianConsent) ctx.addIssue({ code: "custom", path: ["guardianConsent"], message: "consent" });
  })
  .transform((v) => (v.category === "adult" ? { ...v, guardianName: "", guardianRelationship: "", guardianConsent: false } : v));

export const reviewSchema = z.object({ privacyAccepted: z.literal(true, "privacy") });

const SCHEMAS = { applicant: applicantSchema, candidate: candidateSchema, review: reviewSchema } as const;

export type BaptismInput = z.infer<typeof applicantSchema> & z.output<typeof candidateSchema> & z.infer<typeof reviewSchema>;
export type BaptismField = keyof z.input<typeof applicantSchema> | keyof z.input<typeof candidateFields> | "privacyAccepted";
export type BaptismErrorCode = "required" | "tooLong" | "email" | "phone" | "choice" | "date" | "dateFuture" | "consent" | "privacy";
export type BaptismErrors = Partial<Record<BaptismField, BaptismErrorCode>>;

/** Which step each field is on (the form opens the first step with an error). */
export const FIELD_STEP: Record<BaptismField, BaptismStep> = {
  applicantName: "applicant",
  applicantEmail: "applicant",
  applicantPhone: "applicant",
  parishRelationship: "applicant",
  candidateName: "candidate",
  dateOfBirth: "candidate",
  category: "candidate",
  guardianName: "candidate",
  guardianRelationship: "candidate",
  guardianConsent: "candidate",
  preferredPeriod: "candidate",
  notes: "candidate",
  privacyAccepted: "review",
};

const isChecked = (value: unknown) => value === true || value === "on";

/** Form values (FormData entries or the browser's) as the schemas expect them. */
function normalise(raw: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  for (const field of Object.keys(FIELD_STEP)) {
    if (field === "guardianConsent" || field === "privacyAccepted") values[field] = isChecked(raw[field]);
    else if (field === "parishRelationship" || field === "category") values[field] = raw[field] || undefined;
    else values[field] = String(raw[field] ?? "");
  }
  return values;
}

function collect(issues: { path: PropertyKey[]; message: string }[], errors: BaptismErrors) {
  for (const issue of issues) {
    const field = issue.path[0] as BaptismField;
    errors[field] ??= issue.message as BaptismErrorCode;
  }
}

/** Check one step (the browser, before "Next"). */
export function parseBaptismStep(step: BaptismStep, raw: Record<string, unknown>): BaptismErrors {
  const result = SCHEMAS[step].safeParse(normalise(raw));
  const errors: BaptismErrors = {};
  if (!result.success) collect(result.error.issues, errors);
  return errors;
}

/** Check the whole request (the server). */
export function parseBaptism(raw: Record<string, unknown>): { ok: true; data: BaptismInput } | { ok: false; errors: BaptismErrors } {
  const values = normalise(raw);
  const errors: BaptismErrors = {};
  const parts = BAPTISM_STEPS.map((step) => SCHEMAS[step].safeParse(values));
  for (const part of parts) if (!part.success) collect(part.error.issues, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: Object.assign({}, ...parts.map((p) => p.data)) as BaptismInput };
}

/** The first step with an error, to show after the server refuses a request. */
export const firstStepWithError = (errors: BaptismErrors): BaptismStep | null =>
  BAPTISM_STEPS.find((step) => Object.keys(errors).some((field) => FIELD_STEP[field as BaptismField] === step)) ?? null;
