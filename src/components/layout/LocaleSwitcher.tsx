"use client";

import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";

import { localeNames, localeShortNames } from "@/i18n/locales";
import { Link, usePathname } from "@/i18n/navigation";

/** "አማ | EN | SV": keeps the visitor on the same page in the other language. */
export function LocaleSwitcher({ locales }: { locales: Locale[] }) {
  const t = useTranslations("common");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("changeLanguage")}>
      <ul className="flex items-center">
        {locales.map((code, index) => {
          const active = code === current;
          return (
            <li key={code} className="flex items-center">
              {index > 0 && (
                <span aria-hidden="true" className="px-1 text-muted">
                  |
                </span>
              )}
              <Link
                href={pathname}
                locale={code}
                lang={code}
                hrefLang={code}
                aria-label={localeNames[code]}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-sm no-underline ${
                  active ? "font-semibold text-primary underline decoration-gold decoration-2" : "text-ink hover:underline"
                }`}
              >
                {localeShortNames[code]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
