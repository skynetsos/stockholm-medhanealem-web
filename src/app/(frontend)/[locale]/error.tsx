"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Link } from "@/i18n/navigation";

/**
 * 500 inside the public site (Phase 3, D-044): shown in place of the page when rendering fails,
 * inside the normal layout, so the CMS header, menu and footer stay. Sentry records the error
 * (instrumentation); the visitor sees a short message in their language and can try again.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded bg-primary px-5 font-medium text-cream hover:bg-ink">
          {t("retry")}
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center">
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
