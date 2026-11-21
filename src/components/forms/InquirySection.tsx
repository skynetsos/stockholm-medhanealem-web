import type { Locale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/pages/PageHeader";
import { Link } from "@/i18n/navigation";
import { getPublishedClergy } from "@/lib/cms/clergy";
import { getLayoutData } from "@/lib/cms/layout";
import { getAvailablePaths } from "@/lib/cms/pages";
import { formsOpen } from "@/lib/forms/open";
import type { InquiryForm as FormType } from "@/lib/forms/inquiry-schema";

import { InquiryForm, type PriestOption } from "./InquiryForm";

/**
 * An inquiry form with its heading and introduction (Phase 2 task 7; D-050): as a page of its own
 * (`h1`: the page banner with the title, then the introduction and the form — /sunday-school/join,
 * /support/volunteer, /sacraments/prayer-request) or as a section of a page (`h2`, under the
 * marriage and fitihat guidance). The prayer request lists the published clergy to choose from and
 * the office phone for urgent needs.
 */
export async function InquirySection({
  form,
  heading,
  back,
}: {
  form: Exclude<FormType, "contact">;
  heading: "h1" | "h2";
  /** On a page of its own: a link back to the section, above the title. */
  back?: { href: string; label: string };
}) {
  const [t, available, locale] = await Promise.all([getTranslations("inquiryForms"), getAvailablePaths(), getLocale()]);
  const privacyHref = available.includes("/privacy") ? "/privacy" : null;
  // A form that collects personal data needs the privacy notice: in production it is shown only once
  // /privacy is published (review F-03). Development keeps it, so the committee can try it.
  if (!formsOpen(available)) return null;
  const titleId = `inquiry-${form.replace("_", "-")}-title`;

  let priests: PriestOption[] = [];
  let urgentPhone: string | null = null;
  if (form === "pastoral") {
    const [clergy, { settings }] = await Promise.all([getPublishedClergy(locale as Locale), getLayoutData(locale as Locale)]);
    priests = clergy.map((c) => ({ id: c.id, name: c.name, title: c.title }));
    urgentPhone = settings.phone?.trim() || null;
  }
  const body = (
    <InquiryForm
      form={form}
      titleId={titleId}
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY}
      privacyHref={privacyHref}
      priests={priests}
      urgentPhone={urgentPhone}
    />
  );

  if (heading === "h1") {
    return (
      <>
        <PageHeader
          title={t(`${form}.title`)}
          subtitle={t(`${form}.intro`)}
          titleId={titleId}
          eyebrow={back ? <Link href={back.href}>{back.label}</Link> : undefined}
        />
        <div className="mx-auto max-w-3xl px-gutter py-12">
          <div className="rounded-md border border-primary/15 bg-white p-5 shadow-sm sm:p-8">{body}</div>
        </div>
      </>
    );
  }
  return (
    <section aria-labelledby={titleId} className="mt-12 rounded-md border border-primary/15 bg-white p-5 shadow-sm sm:p-8">
      <h2 id={titleId}>{t(`${form}.title`)}</h2>
      <p className="mt-4 mb-6">{t(`${form}.intro`)}</p>
      {body}
    </section>
  );
}
