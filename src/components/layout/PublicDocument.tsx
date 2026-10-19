import "@/styles/globals.css";

import type { Locale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { getLayoutData } from "@/lib/cms/layout";
import { fontVariables } from "@/styles/fonts";

import { AnnouncementBar } from "./AnnouncementBar";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * The public site's <html> document: correct lang, fonts, header and footer.
 * Used by the [locale] root layout and by the root 404 page, so both look identical.
 */
export async function PublicDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  const data = await getLayoutData(locale);

  return (
    <html lang={locale} dir="ltr" className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale}>
          <AnnouncementBar announcements={data.urgent} />
          <SiteHeader data={data} />
          <div className="flex-1">{children}</div>
          <SiteFooter data={data} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
