import "@/styles/globals.css";

import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { routing } from "@/i18n/routing";
import { getLayoutData } from "@/lib/cms/layout";
import { fontVariables } from "@/styles/fonts";

type Props = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

// Pages render on first request and are cached for 5 minutes (spec §4 ISR); no database is
// needed at build time. Saving a global refreshes header/footer immediately (LAYOUT_TAG).
export const revalidate = 300;

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
  const data = await getLayoutData(locale);

  return (
    <html lang={locale} dir="ltr" className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <SiteHeader data={data} />
          <div className="flex-1">{children}</div>
          <SiteFooter data={data} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
