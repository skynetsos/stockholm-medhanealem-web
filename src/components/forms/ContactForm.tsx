"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import { type ContactState, sendContactMessage } from "@/app/(frontend)/[locale]/visit/actions";
import { Link } from "@/i18n/navigation";
import { CONTACT_LIMITS, type ContactField } from "@/lib/forms/contact-schema";

import { Checkbox, ErrorSummary, Input, Textarea } from "./Fields";
import { Turnstile } from "./Turnstile";

const FIELD_IDS: Record<ContactField, string> = {
  name: "contact-name",
  email: "contact-email",
  phone: "contact-phone",
  message: "contact-message",
  privacyAccepted: "contact-privacy",
};
const FIELD_LABELS = { name: "name", email: "email", phone: "phone", message: "message", privacyAccepted: "privacyLink" } as const;

/**
 * Contact form (spec Phase 1 task 6). Works as a normal form post; with JavaScript it shows errors
 * without a reload. After a failed send the error summary gets focus; after success the thank-you.
 */
export function ContactForm({ turnstileSiteKey, privacyHref }: { turnstileSiteKey?: string; privacyHref?: string | null }) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, null);
  const [active, setActive] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLDivElement>(null);

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
  const error = (field: ContactField) => (errors[field] ? t(`errors.${errors[field]}`) : null);
  const values = state?.status === "error" ? state.values : undefined;
  const summaryItems = (Object.keys(errors) as ContactField[]).map((field) => ({
    id: FIELD_IDS[field],
    text: `${t(FIELD_LABELS[field])}: ${error(field)}`,
  }));

  return (
    <form action={action} onFocus={() => setActive(true)} noValidate className="flex flex-col gap-5" aria-describedby="contact-title">
      <ErrorSummary
        id="contact-errors"
        ref={summary}
        title={t("errorSummary")}
        items={summaryItems}
        formError={state?.status === "error" && state.formError ? t(`errors.${state.formError}`) : null}
      />
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">{t("honeypot")}</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id={FIELD_IDS.name}
          name="name"
          label={t("name")}
          autoComplete="name"
          required
          maxLength={CONTACT_LIMITS.name}
          defaultValue={values?.name}
          error={error("name")}
        />
        <Input
          id={FIELD_IDS.email}
          name="email"
          type="email"
          label={t("email")}
          autoComplete="email"
          required
          maxLength={CONTACT_LIMITS.email}
          defaultValue={values?.email}
          error={error("email")}
        />
      </div>
      <Input
        id={FIELD_IDS.phone}
        name="phone"
        type="tel"
        label={t("phone")}
        autoComplete="tel"
        maxLength={CONTACT_LIMITS.phone}
        defaultValue={values?.phone}
        error={error("phone")}
        className="sm:max-w-sm"
      />
      <Textarea
        id={FIELD_IDS.message}
        name="message"
        label={t("message")}
        rows={6}
        required
        minLength={CONTACT_LIMITS.messageMin}
        maxLength={CONTACT_LIMITS.message}
        defaultValue={values?.message}
        error={error("message")}
      />
      <Checkbox
        id={FIELD_IDS.privacyAccepted}
        name="privacyAccepted"
        label={t("privacy")}
        required
        defaultChecked={values?.privacyAccepted}
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
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded bg-primary px-6 font-medium text-cream hover:bg-ink disabled:opacity-60"
        >
          {pending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}
