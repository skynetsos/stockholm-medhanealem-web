import { getTranslations } from "next-intl/server";

import { getAvailablePaths } from "@/lib/cms/pages";
import type { InquiryForm as FormType } from "@/lib/forms/inquiry-schema";

import { InquiryForm } from "./InquiryForm";

/**
 * An inquiry form with its heading and introduction (Phase 2 task 7): as the page itself (`h1`, for
 * /sunday-school/join and /support/volunteer) or as a section of a page (`h2`, under the marriage and
 * fitihat guidance).
 */
export async function InquirySection({ form, heading }: { form: Exclude<FormType, "contact">; heading: "h1" | "h2" }) {
  const [t, available] = await Promise.all([getTranslations("inquiryForms"), getAvailablePaths()]);
  const Heading = heading;
  const titleId = `inquiry-${form.replace("_", "-")}-title`;
  return (
    <section aria-labelledby={titleId} className={heading === "h2" ? "mt-12 border-t border-muted/30 pt-10" : undefined}>
      <Heading id={titleId}>{t(`${form}.title`)}</Heading>
      <p className="mt-4 mb-6">{t(`${form}.intro`)}</p>
      <InquiryForm
        form={form}
        titleId={titleId}
        turnstileSiteKey={process.env.TURNSTILE_SITE_KEY}
        privacyHref={available.includes("/privacy") ? "/privacy" : null}
      />
    </section>
  );
}
