"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";
import { type InquiryState, sendInquiry } from "@/lib/forms/inquiry-action";
import { CHILD_AGE, INQUIRY_LIMITS, type InquiryField, type InquiryForm as FormType, VOLUNTEER_INTERESTS } from "@/lib/forms/inquiry-schema";

import { Checkbox, ErrorSummary, Input, Textarea } from "./Fields";
import { Turnstile } from "./Turnstile";

/** Forms whose message is required (the others have an optional "anything else" field). */
const MESSAGE_REQUIRED: FormType[] = ["contact", "marriage", "funeral"];
const CHECKBOXES: InquiryField[] = ["privacyAccepted"];

/**
 * Inquiry form (spec §2.14; Phase 1 task 6, Phase 2 task 7): the contact form and the Sunday School,
 * marriage, fitihat and volunteer forms. Common fields and texts come from the "contact" messages,
 * each form's own from "inquiryForms.<form>". Works as a normal form post; with JavaScript it shows
 * errors without a reload. After a failed send the error summary gets focus; after success the
 * thank-you. `titleId` is the heading the form is named by.
 */
export function InquiryForm({
  form,
  titleId,
  turnstileSiteKey,
  privacyHref,
}: {
  form: FormType;
  titleId: string;
  turnstileSiteKey?: string;
  privacyHref?: string | null;
}) {
  const t = useTranslations("contact");
  const tf = useTranslations("inquiryForms");
  const locale = useLocale();
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const [active, setActive] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLDivElement>(null);
  // The contact form keeps its Phase 1 ids ("contact-name", "contact-errors").
  const prefix = form === "contact" ? "contact" : `inquiry-${form.replace("_", "-")}`;
  const id = (field: InquiryField) => (field === "privacyAccepted" ? `${prefix}-privacy` : field === "interests" ? `${prefix}-interests-${VOLUNTEER_INTERESTS[0]}` : `${prefix}-${field}`);
  const own = form === "contact" ? null : form;

  useEffect(() => {
    if (state?.status === "error") summary.current?.focus();
    if (state?.status === "success") success.current?.focus();
  }, [state]);

  if (state?.status === "success") {
    return (
      <div ref={success} tabIndex={-1} role="status" className="rounded border-s-4 border-gold bg-white p-5 shadow-sm">
        <p className="text-h4 font-semibold text-primary">{t("successTitle")}</p>
        <p className="mt-2">{state.reference ? t("successText", { reference: state.reference }) : t("successTextNoReference")}</p>
      </div>
    );
  }

  const errors = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const error = (field: InquiryField) => (errors[field] ? t(`errors.${errors[field]!}`) : null);
  const values = state?.status === "error" ? (state.values ?? {}) : {};
  const value = (field: string) => (typeof values[field] === "string" ? (values[field] as string) : undefined);
  const chosen = new Set(Array.isArray(values.interests) ? values.interests : []);

  const label = (field: InquiryField): string => {
    if (field === "privacyAccepted") return t("privacyLink");
    if (field === "name" && form === "sunday_school") return tf("sunday_school.name");
    if (field === "message" && own) return tf(`${own}.message`);
    if (field === "childName" || field === "childAge") return tf(`sunday_school.${field}`);
    if (field === "interests" || field === "availability") return tf(`volunteer.${field}`);
    return t(field as "name" | "email" | "phone" | "message");
  };
  const summaryItems = (Object.keys(errors) as InquiryField[]).map((field) => ({
    id: id(field),
    text: CHECKBOXES.includes(field) ? error(field)! : `${label(field)}: ${error(field)}`,
  }));

  return (
    <form action={action} onFocus={() => setActive(true)} noValidate className="flex flex-col gap-5" aria-labelledby={titleId}>
      <ErrorSummary
        id={`${prefix}-errors`}
        ref={summary}
        title={t("errorSummary")}
        items={summaryItems}
        formError={state?.status === "error" && state.formError ? t(`errors.${state.formError}`) : null}
      />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="form" value={form} />
      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${prefix}-website`}>{t("honeypot")}</label>
        <input id={`${prefix}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input id={id("name")} name="name" label={label("name")} autoComplete="name" required maxLength={INQUIRY_LIMITS.name} defaultValue={value("name")} error={error("name")} />
        <Input
          id={id("email")}
          name="email"
          type="email"
          label={label("email")}
          autoComplete="email"
          required
          maxLength={INQUIRY_LIMITS.email}
          defaultValue={value("email")}
          error={error("email")}
        />
      </div>
      <Input
        id={id("phone")}
        name="phone"
        type="tel"
        label={label("phone")}
        autoComplete="tel"
        maxLength={INQUIRY_LIMITS.phone}
        defaultValue={value("phone")}
        error={error("phone")}
        className="sm:max-w-sm"
      />

      {form === "sunday_school" && (
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Input id={id("childName")} name="childName" label={label("childName")} required maxLength={INQUIRY_LIMITS.name} defaultValue={value("childName")} error={error("childName")} />
          <Input
            id={id("childAge")}
            name="childAge"
            type="number"
            inputMode="numeric"
            label={label("childAge")}
            required
            min={CHILD_AGE.min}
            max={CHILD_AGE.max}
            defaultValue={value("childAge")}
            error={error("childAge")}
          />
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

      <Textarea
        id={id("message")}
        name="message"
        label={label("message")}
        rows={MESSAGE_REQUIRED.includes(form) ? 6 : 3}
        required={MESSAGE_REQUIRED.includes(form)}
        minLength={MESSAGE_REQUIRED.includes(form) ? INQUIRY_LIMITS.messageMin : undefined}
        maxLength={INQUIRY_LIMITS.message}
        defaultValue={value("message")}
        error={error("message")}
      />
      <Checkbox
        id={id("privacyAccepted")}
        name="privacyAccepted"
        label={t("privacy")}
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

      <div>
        <button type="submit" disabled={pending} className="min-h-11 rounded bg-primary px-6 font-medium text-cream hover:bg-ink disabled:opacity-60">
          {pending ? t("sending") : own ? tf(`${own}.submit`) : t("submit")}
        </button>
      </div>
    </form>
  );
}
