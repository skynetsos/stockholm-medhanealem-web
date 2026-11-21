import { z } from "./zod";

/**
 * Baptism request form (spec Phase 2 task 4; field groups and order after the reference layout,
 * D-050): one "details" step with two groups — the person to be baptised and the sacrament, then
 * the contact person — and our "review and send" step with the privacy consent. One zod schema per
 * step, used by the browser before moving on and by the server for everything again. Error codes
 * map to message keys (baptismForm.errors.*). No server-only imports: the form uses this.
 */
export const BAPTISM_LIMITS = { name: 100, email: 254, phone: 40, relationship: 60, period: 100, place: 100, notes: 2000 } as const;

export const BAPTISM_STEPS = ["details", "review"] as const;
export type BaptismStep = (typeof BAPTISM_STEPS)[number];

/** The two groups of the details step, in order. */
export const BAPTISM_GROUPS = ["candidate", "contact"] as const;

export const CANDIDATE_CATEGORIES = ["infant", "child", "adult"] as const;
export type CandidateCategory = (typeof CANDIDATE_CATEGORIES)[number];
export const GENDERS = ["male", "female"] as const;
/** Kept for cases sent before D-050 (the admin still shows it); the form no longer asks. */
export const PARISH_RELATIONSHIPS = ["member", "regular", "new"] as const;

const text = (max: number) => z.string().trim().max(max, "tooLong");
const required = (max: number) => text(max).min(1, "required");
const phone = (v: string) => /^\+?[\d\s()-]{6,}$/.test(v);

/** "YYYY-MM-DD" (a date input's value): a real day, not in the future, not before 1900. */
const birthDate = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), "date")
  .refine((v) => v >= "1900-01-01", "date")
  .refine((v) => v <= new Date().toISOString().slice(0, 10), "dateFuture");

/**
 * Infant (under one year), child (under 18) or adult, from the date of birth on `today`
 * ("YYYY-MM-DD"). Replaces the question the form used to ask (D-050).
 */
export function categoryFor(dateOfBirth: string, today = new Date().toISOString().slice(0, 10)): CandidateCategory {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const years = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return years < 1 ? "infant" : years < 18 ? "child" : "adult";
}

/** Group 1, the person to be baptised and the sacrament; group 2, the contact person. */
const detailsFields = z.object({
  candidateName: required(BAPTISM_LIMITS.name),
  dateOfBirth: birthDate,
  preferredPeriod: text(BAPTISM_LIMITS.period),
  baptismalName: text(BAPTISM_LIMITS.name),
  gender: z.enum(GENDERS, "choice"),
  placeOfBirth: required(BAPTISM_LIMITS.place),
  fatherName: required(BAPTISM_LIMITS.name),
  motherName: required(BAPTISM_LIMITS.name),
  godparentName: text(BAPTISM_LIMITS.name),
  priestName: text(BAPTISM_LIMITS.name),
  applicantName: required(BAPTISM_LIMITS.name),
  applicantPhone: required(BAPTISM_LIMITS.phone).refine(phone, "phone"),
  // Required: the acknowledgement and the decision are emailed (a difference from the reference form).
  applicantEmail: required(BAPTISM_LIMITS.email).pipe(z.email("email")),
  guardianRelationship: text(BAPTISM_LIMITS.relationship),
  guardianConsent: z.boolean(),
});

/** For someone under 18 the contact person is the parent or guardian (spec §2.12): relationship and consent. */
export const detailsSchema = detailsFields
  .superRefine((v, ctx) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.dateOfBirth) || categoryFor(v.dateOfBirth) === "adult") return;
    if (!v.guardianRelationship) ctx.addIssue({ code: "custom", path: ["guardianRelationship"], message: "required" });
    if (!v.guardianConsent) ctx.addIssue({ code: "custom", path: ["guardianConsent"], message: "consent" });
  })
  .transform((v) => {
    const category = categoryFor(v.dateOfBirth);
    return category === "adult" ? { ...v, category, guardianRelationship: "", guardianConsent: false } : { ...v, category };
  });

export const reviewSchema = z.object({ privacyAccepted: z.literal(true, "privacy") });

const SCHEMAS = { details: detailsSchema, review: reviewSchema } as const;

export type BaptismInput = z.output<typeof detailsSchema> & z.infer<typeof reviewSchema>;
export type BaptismField = keyof z.input<typeof detailsFields> | "privacyAccepted";
export type BaptismErrorCode = "required" | "tooLong" | "email" | "phone" | "choice" | "date" | "dateFuture" | "consent" | "privacy";
export type BaptismErrors = Partial<Record<BaptismField, BaptismErrorCode>>;

/** Which step and group each field is on, in the form's order. */
export const FIELDS: { field: BaptismField; step: BaptismStep; group?: (typeof BAPTISM_GROUPS)[number] }[] = [
  { field: "candidateName", step: "details", group: "candidate" },
  { field: "dateOfBirth", step: "details", group: "candidate" },
  { field: "preferredPeriod", step: "details", group: "candidate" },
  { field: "baptismalName", step: "details", group: "candidate" },
  { field: "gender", step: "details", group: "candidate" },
  { field: "placeOfBirth", step: "details", group: "candidate" },
  { field: "fatherName", step: "details", group: "candidate" },
  { field: "motherName", step: "details", group: "candidate" },
  { field: "godparentName", step: "details", group: "candidate" },
  { field: "priestName", step: "details", group: "candidate" },
  { field: "applicantName", step: "details", group: "contact" },
  { field: "applicantPhone", step: "details", group: "contact" },
  { field: "applicantEmail", step: "details", group: "contact" },
  { field: "guardianRelationship", step: "details", group: "contact" },
  { field: "guardianConsent", step: "details", group: "contact" },
  { field: "privacyAccepted", step: "review" },
];
export const FIELD_STEP = Object.fromEntries(FIELDS.map((f) => [f.field, f.step])) as Record<BaptismField, BaptismStep>;

const isChecked = (value: unknown) => value === true || value === "on";

/** Form values (FormData entries or the browser's) as the schemas expect them. */
function normalise(raw: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  for (const { field } of FIELDS) {
    if (field === "guardianConsent" || field === "privacyAccepted") values[field] = isChecked(raw[field]);
    else if (field === "gender") values[field] = raw[field] || undefined;
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
