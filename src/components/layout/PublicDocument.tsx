import "@/styles/globals.css";

import type { Locale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { preload } from "react-dom";

import { getLayoutData } from "@/lib/cms/layout";
import { fontVariables } from "@/styles/fonts";

import { AnnouncementBar } from "./AnnouncementBar";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * UI text the browser needs: only the namespaces client components use (task 10). Everything else
 * is rendered on the server, so it never has to travel to the browser as JSON.
 */
const CLIENT_NAMESPACES = ["common", "calendar", "contact", "events", "gallery", "video", "visit"] as const;

/** The Ethiopic fonts declared in globals.css, preloaded on Amharic pages (D-025). */
const ETHIOPIC_FONTS = ["/fonts/noto-sans-ethiopic-v1.woff2", "/fonts/noto-serif-ethiopic-v1.woff2"];

/**
 * The public site's <html> document: correct lang, fonts, header and footer.
 * Used by the [locale] root layout and by the root 404 page, so both look identical.
 */
export async function PublicDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [data, messages] = await Promise.all([getLayoutData(locale), getMessages({ locale })]);
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));
  // Amharic pages are mostly Ethiopic text: fetch both Ethiopic fonts with the page instead of
  // after the stylesheet (Lighthouse, D-025). Other languages load them only when needed.
  if (locale === "am") {
    for (const file of ETHIOPIC_FONTS) preload(file, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    <html lang={locale} dir="ltr" className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <AnnouncementBar announcements={data.urgent} />
          <SiteHeader data={data} />
          <div className="flex-1">{children}</div>
          <SiteFooter data={data} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
