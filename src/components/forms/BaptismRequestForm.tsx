"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useRef, useState } from "react";

import { sendBaptismRequest } from "@/app/(frontend)/[locale]/sacraments/baptism/request/actions";
import { Link } from "@/i18n/navigation";
import {
  BAPTISM_LIMITS,
  BAPTISM_STEPS,
  type BaptismErrors,
  type BaptismField,
  type BaptismStep,
  CANDIDATE_CATEGORIES,
  FIELD_STEP,
  firstStepWithError,
  PARISH_RELATIONSHIPS,
  parseBaptismStep,
} from "@/lib/forms/baptism-schema";

import { Checkbox, ErrorSummary, Input, RadioGroup, Textarea } from "./Fields";
import { Turnstile } from "./Turnstile";

const id = (field: BaptismField) => `bap-${field}`;
/** Where the error summary sends the visitor: radio groups to their first option. */
const target = (field: BaptismField) =>
  field === "parishRelationship" ? `${id(field)}-${PARISH_RELATIONSHIPS[0]}` : field === "category" ? `${id(field)}-${CANDIDATE_CATEGORIES[0]}` : id(field);
const CHECKBOXES: BaptismField[] = ["guardianConsent", "privacyAccepted"];

type Values = Record<string, string>;

/**
 * Baptism request form (spec Phase 2 task 4): Applicant → Candidate & guardian → Review & consent.
 * All fields stay in one form (later steps hidden), so nothing is lost when going back. "Next"
 * checks the step with the same zod schema the server uses; the server checks everything again
 * and, if it refuses, the form opens the first step with an error. Focus moves to the step heading
 * on every step change and to the error summary when there are errors. Needs JavaScript (D-029).
 */
export function BaptismRequestForm({
  turnstileSiteKey,
  privacyNotice,
  privacyHref,
}: {
  turnstileSiteKey?: string;
  privacyNotice?: ReactNode;
  privacyHref?: string | null;
}) {
  const t = useTranslations("baptismForm");
  const locale = useLocale();
  const [state, dispatch, pending] = useActionState(sendBaptismRequest, null);
  const [step, setStep] = useState<BaptismStep>("applicant");
  const [errors, setErrors] = useState<BaptismErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [relationship, setRelationship] = useState("");
  const [category, setCategory] = useState("");
  const [review, setReview] = useState<Values>({});
  const [active, setActive] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLDivElement>(null);
  const focusNext = useRef<"heading" | "summary" | null>(null);

  const values = (): Values => Object.fromEntries([...new FormData(form.current!).entries()].map(([k, v]) => [k, String(v)]));
  const index = BAPTISM_STEPS.indexOf(step);

  // The server's answer: show its errors on the first step that has one.
  useEffect(() => {
    if (state?.status !== "error") return;
    const fieldErrors = state.fieldErrors ?? {};
    setErrors(fieldErrors);
    setFormError(state.formError ? t(`errors.${state.formError}`) : null);
    setStep(firstStepWithError(fieldErrors) ?? "review");
    focusNext.current = "summary";
  }, [state, t]);

  useEffect(() => {
    if (state?.status === "success") success.current?.focus();
  }, [state]);

  useEffect(() => {
    if (focusNext.current === "summary") summary.current?.focus();
    if (focusNext.current === "heading") heading.current?.focus();
    focusNext.current = null;
  }, [step, errors, formError]);

  const goTo = (next: BaptismStep) => {
    if (next === "review") setReview(values());
    setErrors({});
    setFormError(null);
    setStep(next);
    focusNext.current = "heading";
  };

  /** Check the current step; true when it may be left. */
  const checkStep = () => {
    const stepErrors = parseBaptismStep(step, values());
    if (Object.keys(stepErrors).length === 0) return true;
    setErrors(stepErrors);
    setFormError(null);
    focusNext.current = "summary";
    return false;
  };

  // Enter in a field submits the form: on the first two steps that means "Next".
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkStep()) return;
    if (step !== "review") return goTo(BAPTISM_STEPS[index + 1]);
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };

  if (state?.status === "success") {
    return (
      <div ref={success} tabIndex={-1} role="status" className="rounded border-s-4 border-gold bg-white p-5 shadow-sm">
        <p className="text-h4 font-semibold text-primary">{t("successTitle")}</p>
        <p className="mt-2">{state.reference ? t("successText", { reference: state.reference }) : t("successTextNoReference")}</p>
      </div>
    );
  }

  const error = (field: BaptismField) => (errors[field] ? t(`errors.${errors[field]}`) : null);
  const label = (field: BaptismField) => (field === "privacyAccepted" ? t("privacy") : t(field));
  const summaryItems = (Object.keys(errors) as BaptismField[])
    .filter((field) => FIELD_STEP[field] === step)
    .map((field) => ({ id: target(field), text: CHECKBOXES.includes(field) ? error(field)! : `${label(field)}: ${error(field)}` }));
  const needsGuardian = category === "infant" || category === "child";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={form} onSubmit={onSubmit} onFocus={() => setActive(true)} noValidate aria-labelledby="baptism-form-title">
      <ol aria-label={t("progress")} className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {BAPTISM_STEPS.map((s, i) => (
          <li key={s} aria-current={s === step ? "step" : undefined} className={s === step ? "font-semibold text-primary" : "text-muted"}>
            {i + 1}. {t(`steps.${s}`)}
          </li>
        ))}
      </ol>

      <h2 ref={heading} tabIndex={-1} className="text-h3">
        {t("stepOf", { current: index + 1, total: BAPTISM_STEPS.length, step: t(`steps.${step}`) })}
      </h2>

      <ErrorSummary id="baptism-errors" ref={summary} title={t("errorSummary")} items={summaryItems} formError={formError} />

      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="bap-website">{t("honeypot")}</label>
        <input id="bap-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div hidden={step !== "applicant"} className="mt-6 flex flex-col gap-5">
        <Input id={id("applicantName")} name="applicantName" label={t("applicantName")} autoComplete="name" required maxLength={BAPTISM_LIMITS.name} error={error("applicantName")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input id={id("applicantEmail")} name="applicantEmail" type="email" label={t("applicantEmail")} autoComplete="email" required maxLength={BAPTISM_LIMITS.email} error={error("applicantEmail")} />
          <Input id={id("applicantPhone")} name="applicantPhone" type="tel" label={t("applicantPhone")} autoComplete="tel" maxLength={BAPTISM_LIMITS.phone} error={error("applicantPhone")} />
        </div>
        <RadioGroup
          id={id("parishRelationship")}
          name="parishRelationship"
          label={t("parishRelationship")}
          options={PARISH_RELATIONSHIPS.map((value) => ({ value, label: t(`relationships.${value}`) }))}
          value={relationship}
          onChange={setRelationship}
          error={error("parishRelationship")}
        />
      </div>

      <div hidden={step !== "candidate"} className="mt-6 flex flex-col gap-5">
        <Input id={id("candidateName")} name="candidateName" label={t("candidateName")} required maxLength={BAPTISM_LIMITS.name} error={error("candidateName")} />
        <Input id={id("dateOfBirth")} name="dateOfBirth" type="date" label={t("dateOfBirth")} required min="1900-01-01" max={today} error={error("dateOfBirth")} className="sm:max-w-xs" />
        <RadioGroup
          id={id("category")}
          name="category"
          label={t("category")}
          options={CANDIDATE_CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
          value={category}
          onChange={setCategory}
          error={error("category")}
        />
        <fieldset hidden={!needsGuardian} className="flex flex-col gap-5 border-s-4 border-primary ps-4">
          <legend className="mb-2 text-h4 font-semibold">{t("guardianTitle")}</legend>
          <Input id={id("guardianName")} name="guardianName" label={t("guardianName")} required={needsGuardian} maxLength={BAPTISM_LIMITS.name} error={error("guardianName")} />
          <Input
            id={id("guardianRelationship")}
            name="guardianRelationship"
            label={t("guardianRelationship")}
            hint={t("guardianRelationshipHint")}
            required={needsGuardian}
            maxLength={BAPTISM_LIMITS.relationship}
            error={error("guardianRelationship")}
          />
          <Checkbox id={id("guardianConsent")} name="guardianConsent" label={t("guardianConsent")} required={needsGuardian} error={error("guardianConsent")} />
        </fieldset>
        <Input
          id={id("preferredPeriod")}
          name="preferredPeriod"
          label={t("preferredPeriod")}
          hint={t("preferredPeriodHint")}
          maxLength={BAPTISM_LIMITS.period}
          error={error("preferredPeriod")}
        />
        <Textarea id={id("notes")} name="notes" label={t("notes")} rows={4} maxLength={BAPTISM_LIMITS.notes} error={error("notes")} />
      </div>

      <div hidden={step !== "review"} className="mt-6 flex flex-col gap-5">
        <p>{t("reviewIntro")}</p>
        <Review values={review} onChange={goTo} />
        {privacyNotice && <div className="rounded bg-white p-5 shadow-sm">{privacyNotice}</div>}
        <Checkbox id={id("privacyAccepted")} name="privacyAccepted" label={t("privacy")} required error={error("privacyAccepted")}>
          {privacyHref && (
            <Link href={privacyHref} target="_blank">
              {t("privacyLink")}
            </Link>
          )}
        </Checkbox>
        {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} locale={locale} active={active} resetKey={state} />}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(BAPTISM_STEPS[index - 1])}
            className="min-h-11 rounded border-2 border-primary px-6 font-medium text-primary hover:bg-white"
          >
            {t("back")}
          </button>
        )}
        <button type="submit" disabled={pending} className="min-h-11 rounded bg-primary px-6 font-medium text-cream hover:bg-ink disabled:opacity-60">
          {step !== "review" ? t("next") : pending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}

/** What the visitor entered, per step, each with a "Change" button back to that step. */
function Review({ values, onChange }: { values: Values; onChange: (step: BaptismStep) => void }) {
  const t = useTranslations("baptismForm");
  const format = useFormatter();
  // Dates as elsewhere on the site; the day typed is a calendar day, so format it at UTC midnight.
  const date = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) ? format.dateTime(new Date(`${v}T00:00:00Z`), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : v;
  const adult = values.category === "adult";
  const rows: Record<"applicant" | "candidate", [string, string | undefined][]> = {
    applicant: [
      [t("applicantName"), values.applicantName],
      [t("applicantEmail"), values.applicantEmail],
      [t("applicantPhone"), values.applicantPhone],
      [t("parishRelationship"), values.parishRelationship && t(`relationships.${values.parishRelationship as "member"}`)],
    ],
    candidate: [
      [t("candidateName"), values.candidateName],
      [t("dateOfBirth"), values.dateOfBirth && date(values.dateOfBirth)],
      [t("category"), values.category && t(`categories.${values.category as "adult"}`)],
      [t("guardianName"), adult ? undefined : values.guardianName],
      [t("guardianRelationship"), adult ? undefined : values.guardianRelationship],
      [t("preferredPeriod"), values.preferredPeriod],
      [t("notes"), values.notes],
    ],
  };

  return (
    <>
      {(["applicant", "candidate"] as const).map((step) => (
        <section key={step} aria-labelledby={`review-${step}`} className="rounded bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 id={`review-${step}`} className="text-h4">
              {t(`steps.${step}`)}
            </h3>
            <button type="button" onClick={() => onChange(step)} className="min-h-11 px-2 font-medium text-primary underline">
              {t("change")}
              <span className="sr-only">: {t(`steps.${step}`)}</span>
            </button>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {rows[step]
              .filter(([, value]) => value?.trim())
              .map(([term, value]) => (
                <div key={term} className="contents">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="break-words whitespace-pre-line">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </>
  );
}
