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
  categoryFor,
  FIELD_STEP,
  firstStepWithError,
  GENDERS,
  parseBaptismStep,
} from "@/lib/forms/baptism-schema";

import { Checkbox, ErrorSummary, Input, Select } from "./Fields";
import { Turnstile } from "./Turnstile";

const id = (field: BaptismField) => `bap-${field}`;
const target = id;
const isDay = (v: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
const CHECKBOXES: BaptismField[] = ["guardianConsent", "privacyAccepted"];

type Values = Record<string, string>;

/**
 * Baptism request form (spec Phase 2 task 4; D-050): one details step in two groups, as on the
 * reference layout (the person to be baptised and the sacrament; the contact person), then our
 * review step with the privacy consent; the reference number on success.
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
  const [step, setStep] = useState<BaptismStep>("details");
  const [errors, setErrors] = useState<BaptismErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [review, setReview] = useState<Values>({});
  const [active, setActive] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLDivElement>(null);
  // Where focus goes after the next render; a new object each time, so the same target can repeat.
  const [focusRequest, setFocusRequest] = useState<{ to: "heading" | "summary" } | null>(null);
  const [handledState, setHandledState] = useState(state);

  const values = (): Values => Object.fromEntries([...new FormData(form.current!).entries()].map(([k, v]) => [k, String(v)]));
  const index = BAPTISM_STEPS.indexOf(step);

  // The server's answer: show its errors on the first step that has one (adjusted while rendering,
  // as React recommends for state that follows other state, not in an effect).
  if (state !== handledState) {
    setHandledState(state);
    if (state?.status === "error") {
      const fieldErrors = state.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(state.formError ? t(`errors.${state.formError}`) : null);
      setStep(firstStepWithError(fieldErrors) ?? "review");
      setFocusRequest({ to: "summary" });
    }
  }

  useEffect(() => {
    if (state?.status === "success") success.current?.focus();
  }, [state]);

  useEffect(() => {
    if (focusRequest?.to === "summary") summary.current?.focus();
    if (focusRequest?.to === "heading") heading.current?.focus();
  }, [focusRequest]);

  const goTo = (next: BaptismStep) => {
    if (next === "review") setReview(values());
    setErrors({});
    setFormError(null);
    setStep(next);
    setFocusRequest({ to: "heading" });
  };

  /** Check the current step; true when it may be left. */
  const checkStep = () => {
    const stepErrors = parseBaptismStep(step, values());
    if (Object.keys(stepErrors).length === 0) return true;
    setErrors(stepErrors);
    setFormError(null);
    setFocusRequest({ to: "summary" });
    return false;
  };

  // Enter in a field submits the form: on the details step that means "Next".
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
  // Under 18 the contact person is the parent or guardian (relationship and consent).
  const needsGuardian = isDay(dateOfBirth) && categoryFor(dateOfBirth) !== "adult";
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

      <div hidden={step !== "details"} className="mt-6 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-5 rounded-md border border-primary/15 bg-white p-5 shadow-sm sm:p-6">
          <legend className="float-left mb-1 w-full border-s-4 border-primary ps-3 font-serif text-h4">{t("groups.candidate")}</legend>
          <Input id={id("candidateName")} name="candidateName" label={t("candidateName")} required maxLength={BAPTISM_LIMITS.name} error={error("candidateName")} />
          <Input
            id={id("dateOfBirth")}
            name="dateOfBirth"
            type="date"
            label={t("dateOfBirth")}
            required
            min="1900-01-01"
            max={today}
            onChange={(e) => setDateOfBirth(e.target.value)}
            error={error("dateOfBirth")}
            className="sm:max-w-xs"
          />
          <Input id={id("preferredPeriod")} name="preferredPeriod" label={t("preferredPeriod")} hint={t("preferredPeriodHint")} maxLength={BAPTISM_LIMITS.period} error={error("preferredPeriod")} />
          <Input id={id("baptismalName")} name="baptismalName" label={t("baptismalName")} hint={t("baptismalNameHint")} maxLength={BAPTISM_LIMITS.name} error={error("baptismalName")} />
          <Select
            id={id("gender")}
            name="gender"
            label={t("gender")}
            required
            placeholder={t("select")}
            options={GENDERS.map((value) => ({ value, label: t(`genders.${value}`) }))}
            error={error("gender")}
            className="sm:max-w-xs"
          />
          <Input id={id("placeOfBirth")} name="placeOfBirth" label={t("placeOfBirth")} required maxLength={BAPTISM_LIMITS.place} error={error("placeOfBirth")} />
          <Input id={id("fatherName")} name="fatherName" label={t("fatherName")} required maxLength={BAPTISM_LIMITS.name} error={error("fatherName")} />
          <Input id={id("motherName")} name="motherName" label={t("motherName")} required maxLength={BAPTISM_LIMITS.name} error={error("motherName")} />
          <Input id={id("godparentName")} name="godparentName" label={t("godparentName")} maxLength={BAPTISM_LIMITS.name} error={error("godparentName")} />
          <Input id={id("priestName")} name="priestName" label={t("priestName")} maxLength={BAPTISM_LIMITS.name} error={error("priestName")} />
        </fieldset>

        <fieldset className="flex flex-col gap-5 rounded-md border border-primary/15 bg-white p-5 shadow-sm sm:p-6">
          <legend className="float-left mb-1 w-full border-s-4 border-primary ps-3 font-serif text-h4">{t("groups.contact")}</legend>
          <Input id={id("applicantName")} name="applicantName" label={t("applicantName")} autoComplete="name" required maxLength={BAPTISM_LIMITS.name} error={error("applicantName")} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input id={id("applicantPhone")} name="applicantPhone" type="tel" label={t("applicantPhone")} autoComplete="tel" required maxLength={BAPTISM_LIMITS.phone} error={error("applicantPhone")} />
            <Input id={id("applicantEmail")} name="applicantEmail" type="email" label={t("applicantEmail")} autoComplete="email" required maxLength={BAPTISM_LIMITS.email} error={error("applicantEmail")} />
          </div>
          <div hidden={!needsGuardian} className="flex flex-col gap-5">
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
          </div>
        </fieldset>
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
  const adult = isDay(values.dateOfBirth) && categoryFor(values.dateOfBirth) === "adult";
  const rows: Record<"candidate" | "contact", [string, string | undefined][]> = {
    candidate: [
      [t("candidateName"), values.candidateName],
      [t("dateOfBirth"), values.dateOfBirth && date(values.dateOfBirth)],
      [t("preferredPeriod"), values.preferredPeriod],
      [t("baptismalName"), values.baptismalName],
      [t("gender"), values.gender && t(`genders.${values.gender as "male"}`)],
      [t("placeOfBirth"), values.placeOfBirth],
      [t("fatherName"), values.fatherName],
      [t("motherName"), values.motherName],
      [t("godparentName"), values.godparentName],
      [t("priestName"), values.priestName],
    ],
    contact: [
      [t("applicantName"), values.applicantName],
      [t("applicantPhone"), values.applicantPhone],
      [t("applicantEmail"), values.applicantEmail],
      [t("guardianRelationship"), adult ? undefined : values.guardianRelationship],
    ],
  };

  return (
    <>
      {(["candidate", "contact"] as const).map((group) => (
        <section key={group} aria-labelledby={`review-${group}`} className="rounded bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 id={`review-${group}`} className="text-h4">
              {t(`groups.${group}`)}
            </h3>
            <button type="button" onClick={() => onChange("details")} className="min-h-11 px-2 font-medium text-primary underline">
              {t("change")}
              <span className="sr-only">: {t(`groups.${group}`)}</span>
            </button>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {rows[group]
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
