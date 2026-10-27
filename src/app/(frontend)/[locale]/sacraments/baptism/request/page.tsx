import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { BaptismRequestForm } from "@/components/forms/BaptismRequestForm";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getAvailablePaths, getPage } from "@/lib/cms/pages";
import { BAPTISM_REQUEST_PATH } from "@/lib/content-paths";

type Props = { params: Promise<{ locale: string }> };

/** The privacy notice for requests: CMS page Other / "privacy-baptism" (D-029). */
const PRIVACY_NOTICE_SLUG = "privacy-baptism";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "baptismForm" });
  return { title: t("title"), alternates: localeAlternates(locale, BAPTISM_REQUEST_PATH) };
}

/**
 * /sacraments/baptism/request (spec Phase 2 task 4): the 3-step request form. The middleware only
 * lets visitors reach it while requests are open and the baptism page exists (D-029).
 */
export default async function BaptismRequestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, ts, available, notice] = await Promise.all([
    getTranslations("baptismForm"),
    getTranslations("sacraments"),
    getAvailablePaths(),
    getPage(locale as Locale, "other", PRIVACY_NOTICE_SLUG),
  ]);
  if (!available.includes(BAPTISM_REQUEST_PATH)) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <p>
        <Link href="/sacraments/baptism">{ts("baptism")}</Link>
      </p>
      <h1 id="baptism-form-title" className="mt-2">
        {t("title")}
      </h1>
      <p className="mt-4">{t("intro")}</p>
      <p className="mt-2">{ts("baptismNotice")}</p>
      <noscript>
        <p className="mt-6 rounded border-2 border-error bg-white p-4">
          {t("noScript")} <Link href="/visit">{t("contactOffice")}</Link>
        </p>
      </noscript>
      <div className="mt-8">
        <BaptismRequestForm
          turnstileSiteKey={process.env.TURNSTILE_SITE_KEY}
          privacyNotice={notice ? <RenderBlocks blocks={notice.layout} locale={locale as Locale} /> : null}
          privacyHref={available.includes("/privacy") ? "/privacy" : null}
        />
      </div>
    </main>
  );
}
