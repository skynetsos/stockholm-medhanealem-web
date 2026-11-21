"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Link } from "@/i18n/navigation";
import { type InquiryState, sendInquiry } from "@/lib/forms/inquiry-action";
import {
  CHILD_AGE,
  FORM_FIELDS,
  INQUIRY_LIMITS,
  type InquiryErrors,
  type InquiryField,
  type InquiryForm as FormType,
  MARRIAGE_STEPS,
  parseInquiryFields,
  PRAYER_REQUEST_TYPES,
  VOLUNTEER_INTERESTS,
} from "@/lib/forms/inquiry-schema";

import { Checkbox, ErrorSummary, Input, Select, Textarea } from "./Fields";
import { Turnstile } from "./Turnstile";

const noSubscribe = () => () => {};

/** A priest a prayer request may name (published clergy profiles). */
export type PriestOption = { id: number; name: string; title?: string | null };

/** Labels a form has of its own (inquiryForms.<form>.<field>); the rest come from "contact". */
const OWN_LABELS: Partial<Record<FormType, readonly InquiryField[]>> = {
  sunday_school: ["name", "childName", "childAge", "message"],
  volunteer: ["interests", "availability", "message"],
  marriage: ["name", "partnerName", "phone", "partnerPhone", "email", "preferredDate", "message"],
  funeral: ["name", "phone", "email", "deceasedName", "dateOfPassing", "preferredDate", "message"],
  pastoral: ["name", "phone", "email", "requestType", "message"],
};
const REQUIRED: Record<FormType, readonly InquiryField[]> = {
  contact: ["name", "email", "message"],
  marriage: ["name", "partnerName", "phone", "partnerPhone", "email"],
  funeral: ["name", "phone", "email", "deceasedName"],
  pastoral: ["name", "phone", "requestType"],
  sunday_school: ["name", "email", "childName", "childAge"],
  volunteer: ["name", "email", "interests"],
};

/**
 * Inquiry forms (spec §2.14; Phase 1 task 6, Phase 2 task 7; D-050): contact, Sunday School,
 * wedding (two steps), memorial (fitihat), prayer request and volunteer, each with its fields in the
 * reference layout's order. Works as a normal form post; with JavaScript it shows errors without a
 * reload, and the wedding form shows one step at a time (without JavaScript, both steps on one page).
 * After a failed send the error summary gets focus; after success the thank-you with the reference.
 */
export function InquiryForm({
  form,
  titleId,
  turnstileSiteKey,
  privacyHref,
  priests = [],
  urgentPhone,
}: {
  form: FormType;
  titleId: string;
  turnstileSiteKey?: string;
  privacyHref?: string | null;
  priests?: PriestOption[];
  urgentPhone?: string | null;
}) {
  const t = useTranslations("contact");
  const tf = useTranslations("inquiryForms");
  const locale = useLocale();
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const [active, setActive] = useState(false);
  // True once hydrated (the server renders the no-JavaScript version: both wedding steps on one page).
  const scripted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<InquiryErrors | null>(null);
  const [handled, setHandled] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const [focus, setFocus] = useState<{ to: "summary" | "step" } | null>(null);
  // The contact form keeps its Phase 1 ids ("contact-name", "contact-errors").
  const prefix = form === "contact" ? "contact" : `inquiry-${form.replace("_", "-")}`;
  const id = (field: InquiryField) =>
    field === "privacyAccepted"
      ? `${prefix}-privacy`
      : field === "interests"
        ? `${prefix}-interests-${VOLUNTEER_INTERESTS[0]}`
        : field === "priest"
          ? `${prefix}-priest-any`
          : `${prefix}-${field}`;
  const own = form === "contact" ? null : form;
  const stepped = form === "marriage" && scripted;

  // The server refused: open the first step with an error (adjusted while rendering).
  if (state !== handled) {
    setHandled(state);
    setStepErrors(null);
    if (state?.status === "error" && form === "marriage") {
      const fields = Object.keys(state.fieldErrors ?? {});
      setStep(fields.some((f) => (MARRIAGE_STEPS[0].fields as readonly string[]).includes(f)) ? 0 : 1);
    }
  }
  useEffect(() => {
    if (state?.status === "error") summary.current?.focus();
    if (state?.status === "success") success.current?.focus();
  }, [state]);
  useEffect(() => {
    if (focus?.to === "summary") summary.current?.focus();
    if (focus?.to === "step") stepHeading.current?.focus();
  }, [focus]);

  if (state?.status === "success") {
    return (
      <div ref={success} tabIndex={-1} role="status" className="rounded border-s-4 border-gold bg-white p-5 shadow-sm">
        <p className="text-h4 font-semibold text-primary">{t("successTitle")}</p>
        <p className="mt-2">{state.reference ? t("successText", { reference: state.reference }) : t("successTextNoReference")}</p>
      </div>
    );
  }

  const errors: InquiryErrors = stepErrors ?? (state?.status === "error" ? (state.fieldErrors ?? {}) : {});
  const error = (field: InquiryField) => (errors[field] ? t(`errors.${errors[field]!}`) : null);
  const values = state?.status === "error" ? (state.values ?? {}) : {};
  const value = (field: string) => (typeof values[field] === "string" ? (values[field] as string) : undefined);
  const chosen = new Set(Array.isArray(values.interests) ? values.interests : []);
  const required = (field: InquiryField) => REQUIRED[form].includes(field);
  const fields = FORM_FIELDS[form];
  const shows = (field: InquiryField) => fields.includes(field) && (field !== "priest" || priests.length > 0);
  const onStep = (field: InquiryField) => !stepped || (MARRIAGE_STEPS[step].fields as readonly InquiryField[]).includes(field);

  const label = (field: InquiryField): string => {
    if (field === "privacyAccepted") return t("privacyLink");
    if (own && OWN_LABELS[own]?.includes(field)) return tf(`${own}.${field}` as "marriage.name");
    return t(field as "name" | "email" | "phone" | "message");
  };
  const summaryItems = (Object.keys(errors) as InquiryField[])
    .filter(onStep)
    .map((field) => ({ id: id(field), text: field === "privacyAccepted" ? error(field)! : `${label(field)}: ${error(field)}` }));

  /** "Next" on the wedding form: check the first step's fields, then show the second. */
  const next = () => {
    const raw = Object.fromEntries(new FormData(formRef.current!).entries());
    const found = parseInquiryFields(form, raw, MARRIAGE_STEPS[0].fields);
    if (Object.keys(found).length) {
      setStepErrors(found);
      setFocus({ to: "summary" });
      return;
    }
    setStepErrors(null);
    setStep(1);
    setFocus({ to: "step" });
  };

  const today = new Date().toISOString().slice(0, 10);
  const textInput = (field: InquiryField, extra: Partial<Parameters<typeof Input>[0]> = {}) =>
    shows(field) && (
      <Input
        key={field}
        id={id(field)}
        name={field}
        label={label(field)}
        required={required(field)}
        maxLength={field === "email" ? INQUIRY_LIMITS.email : field.toLowerCase().includes("phone") ? INQUIRY_LIMITS.phone : INQUIRY_LIMITS.name}
        defaultValue={value(field)}
        error={error(field)}
        {...extra}
      />
    );

  return (
    <form
      ref={formRef}
      action={action}
      onFocus={() => setActive(true)}
      noValidate
      className="flex flex-col gap-5"
      aria-labelledby={titleId}
      onSubmitCapture={() => setStepErrors(null)}
    >
      {stepped && (
        <>
          <ol aria-label={tf("progress")} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {MARRIAGE_STEPS.map((s, i) => (
              <li key={s.step} aria-current={i === step ? "step" : undefined} className={i === step ? "font-semibold text-primary" : "text-muted"}>
                {i + 1}. {tf(`marriage.steps.${s.step}`)}
              </li>
            ))}
          </ol>
          <h3 ref={stepHeading} tabIndex={-1} className="text-h4">
            {tf("stepOf", { current: step + 1, total: MARRIAGE_STEPS.length, step: tf(`marriage.steps.${MARRIAGE_STEPS[step].step}`) })}
          </h3>
        </>
      )}
      <ErrorSummary
        id={`${prefix}-errors`}
        ref={summary}
        title={t("errorSummary")}
        items={summaryItems}
        formError={!stepErrors && state?.status === "error" && state.formError ? t(`errors.${state.formError}`) : null}
      />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="form" value={form} />
      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${prefix}-website`}>{t("honeypot")}</label>
        <input id={`${prefix}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {/* Prayer request: 1. an optional priest (cards), 2. the visitor's details. */}
      {shows("priest") && (
        <fieldset>
          <legend className="mb-3 font-serif text-h4">{tf("pastoral.choosePriest")}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[{ id: "any", name: tf("pastoral.anyPriest"), title: null as string | null | undefined, value: "" }, ...priests.map((p) => ({ ...p, id: String(p.id), value: String(p.id) }))].map((p) => (
              <label
                key={p.id}
                htmlFor={`${prefix}-priest-${p.id}`}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-primary/15 bg-white p-3 text-center has-[:checked]:border-primary has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
              >
                <input id={`${prefix}-priest-${p.id}`} type="radio" name="priest" value={p.value} defaultChecked={(value("priest") ?? "") === p.value} className="sr-only" />
                <span className="font-semibold">{p.name}</span>
                {p.title && <span className="text-sm text-muted">{p.title}</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {shows("priest") && <h3 className="font-serif text-h4">{tf("pastoral.yourDetails")}</h3>}

      {/* Wedding step 1 / everything else in the reference layout's order. */}
      <div hidden={stepped && step !== 0} className="contents">
        {form === "marriage" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {textInput("name", { autoComplete: "off" })}
            {textInput("partnerName", { autoComplete: "off" })}
            {textInput("phone", { type: "tel", autoComplete: "off" })}
            {textInput("partnerPhone", { type: "tel", autoComplete: "off" })}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {textInput("name", { autoComplete: "name" })}
            {form === "contact" || form === "sunday_school" || form === "volunteer"
              ? textInput("email", { type: "email", autoComplete: "email" })
              : textInput("phone", { type: "tel", autoComplete: "tel" })}
          </div>
        )}
      </div>

      {(form === "funeral" || form === "pastoral") && textInput("email", { type: "email", autoComplete: "email", className: "sm:max-w-md" })}
      {(form === "sunday_school" || form === "volunteer") && textInput("phone", { type: "tel", autoComplete: "tel", className: "sm:max-w-sm" })}

      {form === "funeral" && (
        <>
          {textInput("deceasedName")}
          <div className="grid gap-5 sm:grid-cols-2">
            {textInput("dateOfPassing", { type: "date", max: today })}
            {textInput("preferredDate", { type: "date", min: today })}
          </div>
        </>
      )}

      {form === "pastoral" && (
        <Select
          id={id("requestType")}
          name="requestType"
          label={label("requestType")}
          required
          placeholder={tf("select")}
          options={PRAYER_REQUEST_TYPES.map((v) => ({ value: v, label: tf(`pastoral.types.${v}`) }))}
          defaultValue={value("requestType")}
          error={error("requestType")}
        />
      )}

      {form === "sunday_school" && (
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          {textInput("childName")}
          {textInput("childAge", { type: "number", inputMode: "numeric", min: CHILD_AGE.min, max: CHILD_AGE.max, maxLength: undefined })}
        </div>
      )}

      {form === "volunteer" && (
        <>
          <fieldset aria-describedby={errors.interests ? `${prefix}-interests-error` : undefined}>
            <legend className="font-semibold">{label("interests")}</legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {VOLUNTEER_INTERESTS.map((interest) => (
                <div key={interest} className="flex min-h-11 items-center gap-3">
                  <input
                    id={`${prefix}-interests-${interest}`}
                    type="checkbox"
                    name="interests"
                    value={interest}
                    defaultChecked={chosen.has(interest)}
                    className="h-6 w-6 shrink-0 accent-primary"
                  />
                  <label htmlFor={`${prefix}-interests-${interest}`}>{tf(`volunteer.interest.${interest}`)}</label>
                </div>
              ))}
            </div>
            {errors.interests && (
              <p id={`${prefix}-interests-error`} className="mt-1 text-sm font-semibold text-error">
                {error("interests")}
              </p>
            )}
          </fieldset>
          <Textarea
            id={id("availability")}
            name="availability"
            label={label("availability")}
            rows={3}
            maxLength={INQUIRY_LIMITS.availability}
            defaultValue={value("availability")}
            error={error("availability")}
          />
        </>
      )}

      {/* Wedding step 2: email, date, notes, consent. */}
      <div hidden={stepped && step !== 1} className="contents">
        {form === "marriage" && (
          <div className="grid gap-5 sm:grid-cols-2">
            {textInput("email", { type: "email", autoComplete: "email" })}
            {textInput("preferredDate", { type: "date", min: today })}
          </div>
        )}
        <Textarea
          id={id("message")}
          name="message"
          label={label("message")}
          rows={form === "contact" ? 6 : 3}
          required={required("message")}
          minLength={required("message") ? INQUIRY_LIMITS.messageMin : undefined}
          maxLength={INQUIRY_LIMITS.message}
          defaultValue={value("message")}
          error={error("message")}
        />
        <Checkbox
          id={id("privacyAccepted")}
          name="privacyAccepted"
          // Sunday School registration also stores the child's name and age (review F-03).
          label={form === "sunday_school" ? tf("privacySundaySchool") : form === "pastoral" ? tf("pastoral.privacy") : t("privacy")}
          required
          defaultChecked={value("privacyAccepted") === "on"}
          error={error("privacyAccepted")}
        >
          {privacyHref && (
            <Link href={privacyHref} target="_blank">
              {t("privacyLink")}
            </Link>
          )}
        </Checkbox>
        {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} locale={locale} active={active} resetKey={state} />}
      </div>

      <div className="flex flex-wrap gap-4">
        {stepped && step === 1 && (
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setFocus({ to: "step" });
            }}
            className="min-h-11 rounded border-2 border-primary px-6 font-medium text-primary hover:bg-white"
          >
            {tf("back")}
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (stepped && step === 0) {
              e.preventDefault();
              next();
            }
          }}
          className="min-h-11 rounded bg-primary px-6 font-medium text-cream hover:bg-ink disabled:opacity-60"
        >
          {stepped && step === 0 ? tf("next") : pending ? t("sending") : own ? tf(`${own}.submit`) : t("submit")}
        </button>
      </div>

      {form === "pastoral" && urgentPhone && (
        <p className="border-t border-muted/30 pt-4 text-sm">
          {tf("pastoral.urgent", { phone: urgentPhone })}
        </p>
      )}
    </form>
  );
}

