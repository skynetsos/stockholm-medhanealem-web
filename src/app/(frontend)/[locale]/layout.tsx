import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PublicDocument } from "@/components/layout/PublicDocument";
import { routing } from "@/i18n/routing";
import { getLayoutData } from "@/lib/cms/layout";
import { mediaSource, publicMedia } from "@/lib/media";
import { isIndexable, siteOrigin } from "@/lib/seo";

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
  const shareImage = publicMedia(settings.shareImage);
  const share = shareImage ? mediaSource(shareImage, 1200) : null;
  return {
    metadataBase: new URL(siteOrigin()),
    title: siteName ? { default: siteName, template: `%s | ${settings.shortName || siteName}` } : undefined,
    // Defaults for every page (D-023); pages with their own picture or description override them.
    openGraph: {
      siteName,
      type: "website",
      locale,
      images: share ? [{ url: share.url, width: share.width, height: share.height, alt: shareImage!.alt }] : undefined,
    },
    twitter: { card: share ? "summary_large_image" : "summary" },
    robots: isIndexable(locale, settings) ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/** Root layout for the public site: one per locale, with the correct <html lang>. */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <PublicDocument locale={locale}>{children}</PublicDocument>;
}
