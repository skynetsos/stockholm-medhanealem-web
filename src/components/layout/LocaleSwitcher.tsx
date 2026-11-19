"use client";

import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";

import { localeNames, localeShortNames } from "@/i18n/locales";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * "አማ | EN | SV": keeps the visitor on the same page in the other language. `pill`: the rounded,
 * light-on-green version in the header (D-049).
 */
export function LocaleSwitcher({ locales, variant = "plain" }: { locales: Locale[]; variant?: "plain" | "pill" }) {
  const pill = variant === "pill";
  const t = useTranslations("common");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("changeLanguage")}>
      <ul className={pill ? "inline-flex items-center rounded-full border border-cream/40 px-1" : "flex items-center"}>
        {locales.map((code, index) => {
          const active = code === current;
          return (
            <li key={code} className="flex items-center">
              {index > 0 && (
                <span aria-hidden="true" className={pill ? "text-cream/50" : "px-1 text-muted"}>
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
                  pill
                    ? active
                      ? "font-semibold text-cream underline decoration-gold decoration-2 underline-offset-4"
                      : "text-cream/90 hover:underline"
                    : active
                      ? "font-semibold text-primary underline decoration-gold decoration-2"
                      : "text-ink hover:underline"
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
