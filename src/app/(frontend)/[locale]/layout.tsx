import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PublicDocument } from "@/components/layout/PublicDocument";
import { routing } from "@/i18n/routing";
import { getLayoutData } from "@/lib/cms/layout";

type Props = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

// Pages render on first request and are cached for 5 minutes (spec §4 ISR); no database is
// needed at build time. Saving a global refreshes header/footer immediately (LAYOUT_TAG).
// An empty generateStaticParams is what makes Next.js cache [locale] pages on demand instead of
// rendering every request dynamically.
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const { settings } = await getLayoutData(locale);
  const siteName = settings.churchName || settings.shortName || undefined;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000"),
    title: siteName ? { default: siteName, template: `%s | ${settings.shortName || siteName}` } : undefined,
    openGraph: siteName ? { siteName } : undefined,
  };
}

/** Root layout for the public site: one per locale, with the correct <html lang>. */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <PublicDocument locale={locale}>{children}</PublicDocument>;
}
