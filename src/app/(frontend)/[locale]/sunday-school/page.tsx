import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { PageHeader } from "@/components/pages/PageHeader";
import { localeAlternates } from "@/i18n/alternates";
import { getAvailablePaths, getPage } from "@/lib/cms/pages";
import { getDepartments } from "@/lib/cms/sections";
import { Link } from "@/i18n/navigation";
import { hasDepartmentContent } from "@/lib/departments";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [intro, t] = await Promise.all([
    getPage(locale as Locale, "sunday-school", "index"),
    getTranslations({ locale: locale as Locale, namespace: "sundaySchool" }),
  ]);
  return {
    title: intro?.seo?.title || intro?.title || t("title"),
    description: intro?.seo?.description || undefined,
    alternates: await localeAlternates(locale, "/sunday-school"),
  };
}

/**
 * /sunday-school (spec §4): the optional CMS landing page (section Sunday School, slug "index") as
 * introduction, the Sunday School registration link (Phase 2 task 7), then the departments that
 * have content (D-020).
 */
export default async function SundaySchoolPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, tf, intro, departments, available] = await Promise.all([
    getTranslations("sundaySchool"),
    getTranslations("inquiryForms"),
    getPage(locale as Locale, "sunday-school", "index"),
    getDepartments(locale as Locale),
    getAvailablePaths(),
  ]);
  const shown = departments.filter(hasDepartmentContent);
  if (!intro && !shown.length) return <NotFoundContent />;

  return (
    <main id="main">
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      {/* Departments as an accordion (the reference layout's age-group list, D-049); each opens to its
          summary and a link to its page. Native <details>, so it works without JavaScript. */}
      {shown.length > 0 && (
        <section aria-labelledby="departments-title" className="mx-auto max-w-4xl px-gutter py-10">
          <h2 id="departments-title" className="mb-4">
            {t("departments")}
          </h2>
          <ul className="flex flex-col gap-3">
            {shown.map((d) => (
              <li key={d.id}>
                <details className="group rounded-md border border-primary/15 bg-white shadow-sm">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-serif text-h4 [&::-webkit-details-marker]:hidden">
                    {d.name}
                    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 transition-transform group-open:rotate-180">
                      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="border-t border-primary/10 px-5 py-4">
                    {d.summary && <p>{d.summary}</p>}
                    <p className={d.summary ? "mt-2" : ""}>
                      <Link href={`/sunday-school/${d.slug}`} className="inline-flex min-h-11 items-center font-medium">
                        {t("moreAbout", { name: d.name })}
                      </Link>
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* The registration bar (reference layout), only while the form exists. */}
      {available.includes("/sunday-school/join") && (
        <div className="mx-auto max-w-4xl px-gutter pb-10">
          <div className="on-dark flex flex-col items-start gap-4 rounded-md bg-primary p-6 text-cream sm:flex-row sm:items-center sm:justify-between">
            <p className="font-serif text-h4 text-cream">{t("registerTitle")}</p>
            <Link href="/sunday-school/join" className="inline-flex min-h-11 items-center rounded bg-cream px-5 font-medium text-primary no-underline hover:bg-white">
              {tf("sunday_school.title")}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
