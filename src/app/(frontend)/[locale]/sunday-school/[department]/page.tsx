import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { CmsRichText } from "@/components/richtext/CmsRichText";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getDepartments } from "@/lib/cms/sections";
import { hasDepartmentContent } from "@/lib/departments";
import { mediaSource, publicMedia } from "@/lib/media";

type Props = { params: Promise<{ locale: string; department: string }> };

// Cached for 5 minutes on first visit like other pages (D-007): an empty list builds nothing ahead.
export function generateStaticParams() {
  return [];
}

async function findDepartment(locale: string, slug: string) {
  const departments = await getDepartments(locale as Locale);
  return departments.find((d) => d.slug === slug && hasDepartmentContent(d)) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, department } = await params;
  const d = await findDepartment(locale, department);
  if (!d) return { robots: { index: false } };
  return { title: d.name, description: d.summary || undefined, alternates: localeAlternates(locale, `/sunday-school/${department}`) };
}

/** /sunday-school/[department] (spec §2.7): name, image, summary, text and leader. */
export default async function DepartmentPage({ params }: Props) {
  const { locale, department } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, d] = await Promise.all([getTranslations("sundaySchool"), findDepartment(locale, department)]);
  if (!d) return <NotFoundContent />;
  const image = publicMedia(d.image);
  const source = image ? mediaSource(image, 1600) : null;

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <p className="mb-2 text-sm font-semibold">
        <Link href="/sunday-school">{t("title")}</Link>
      </p>
      <h1>{d.name}</h1>
      {d.summary && <p className="mt-3 text-lg">{d.summary}</p>}
      {image && source && (
        <Image
          src={source.url}
          width={source.width}
          height={source.height}
          alt={image.alt}
          sizes="(min-width: 768px) 48rem, 100vw"
          priority
          className="mt-6 h-auto w-full rounded"
        />
      )}
      <CmsRichText data={d.body} className="mt-6" />
      {d.leaderName && (
        <p className="mt-6">
          <span className="font-semibold">{t("leader")}:</span> {d.leaderName}
        </p>
      )}
    </main>
  );
}
