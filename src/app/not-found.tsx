import "@/styles/globals.css";

import { headers } from "next/headers";

import { defaultLocale, type Locale, locales } from "@/i18n/locales";
import am from "@/messages/am.json";
import en from "@/messages/en.json";
import sv from "@/messages/sv.json";
import { fontVariables } from "@/styles/fonts";

const messages: Record<Locale, typeof en> = { am, en, sv };

/**
 * 404 for every URL that matches no route (e.g. /en/does-not-exist), server-rendered in the
 * visitor's language: the proxy's next-intl step puts the locale from the URL on the request
 * (`x-next-intl-locale`). Reading the request also makes Next.js render this page per request
 * rather than once at build time, so its scripts get the CSP nonce (D-037, D-038). Before the
 * nonce policy this had to be a client component so cached pages stayed cacheable (D-007).
 */
export default async function RootNotFound() {
  const requested = (await headers()).get("x-next-intl-locale") ?? "";
  const locale = (locales as readonly string[]).includes(requested) ? (requested as Locale) : defaultLocale;
  const t = messages[locale].notFound;

  return (
    <html lang={locale} dir="ltr" className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <title>{t.title}</title>
        <main id="main" className="mx-auto max-w-site px-gutter py-12">
          <h1>{t.title}</h1>
          <p>{t.description}</p>
          <a href={`/${locale}`}>{t.backHome}</a>
        </main>
      </body>
    </html>
  );
}
