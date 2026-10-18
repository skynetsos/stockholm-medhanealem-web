"use client";

import "@/styles/globals.css";

import { usePathname } from "next/navigation";

import { defaultLocale, type Locale, locales } from "@/i18n/locales";
import am from "@/messages/am.json";
import en from "@/messages/en.json";
import sv from "@/messages/sv.json";
import { fontVariables } from "@/styles/fonts";

const messages: Record<Locale, typeof en> = { am, en, sv };

/**
 * 404 for every URL that matches no route (e.g. /en/does-not-exist), server-rendered with the
 * language taken from the URL. It is a client component on purpose: Next.js renders the root
 * not-found into every page's tree, and a server component reading the request would make every
 * cached page dynamic. See docs/DECISIONS.md D-007.
 */
export default function RootNotFound() {
  const segment = usePathname()?.split("/")[1] ?? "";
  const locale = (locales as readonly string[]).includes(segment) ? (segment as Locale) : defaultLocale;
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
