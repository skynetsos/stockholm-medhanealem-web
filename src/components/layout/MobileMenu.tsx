"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * Wraps the main navigation: a full-width row on xl screens, a toggled drawer below that.
 * The menu content is server-rendered and passed in as children (one nav, no duplicate markup).
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close after navigating, and on Escape (returning focus to the toggle).
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded border border-primary px-3 text-primary xl:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
        <span>{open ? t("closeMenu") : t("menu")}</span>
      </button>
      <nav
        id={panelId}
        aria-label={t("mainNavigation")}
        className={`${open ? "block" : "hidden"} absolute inset-x-0 top-full z-40 border-b-4 border-gold bg-white px-gutter pb-6 shadow-lg xl:static xl:block xl:basis-full xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`}
      >
        {children}
      </nav>
    </>
  );
}
