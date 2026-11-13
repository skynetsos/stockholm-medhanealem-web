"use client";

import "@/styles/globals.css";

import { useEffect } from "react";

import { defaultLocale, type Locale, locales } from "@/i18n/locales";
// Only the error strings (a few lines), not the site's message files: this component is part of
// every page's JavaScript.
import errors from "@/messages/errors.json";

/**
 * Last-resort 500 (Phase 3, D-044): replaces the whole document when even the layout fails (e.g.
 * the database is down), so it can't use the CMS header or footer. The language comes from the
 * address (/en/…), Amharic otherwise.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const first = typeof window === "undefined" ? "" : window.location.pathname.split("/")[1];
  const locale = (locales as readonly string[]).includes(first) ? (first as Locale) : defaultLocale;
  const t = errors[locale];

  return (
    <html lang={locale} dir="ltr">
      <body className="flex min-h-screen flex-col">
        <title>{t.title}</title>
        <main id="main" className="mx-auto max-w-site px-gutter py-12">
          <h1>{t.title}</h1>
          <p>{t.description}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="min-h-11 rounded bg-primary px-5 font-medium text-cream">
              {t.retry}
            </button>
            <a href={`/${locale}`} className="inline-flex min-h-11 items-center">
              {t.backHome}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
