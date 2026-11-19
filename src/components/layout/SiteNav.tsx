"use client";

import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";

import { LocaleSwitcher } from "./LocaleSwitcher";

/** A resolved menu link (built on the server from the Navigation global). */
export type NavLink = { id: string; label: string; href: string; external: boolean; newTab: boolean };
export type NavItem = (NavLink & { kind: "link" }) | { kind: "dropdown"; id: string; label: string; children: NavLink[] };

type Props = { items: NavItem[]; ctas: NavLink[]; locales: Locale[] };

/** The menu link whose address is the longest match for the current page (the "you are here" item). */
function currentHref(pathname: string, items: NavItem[]): string | null {
  const hrefs = items.flatMap((item) => (item.kind === "link" ? [item.href] : item.children.map((c) => c.href)));
  const matches = hrefs.filter((href) => !/^[a-z]+:/i.test(href) && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

function NavAnchor({ link, className, current, onNavigate }: { link: NavLink; className: string; current?: boolean; onNavigate?: () => void }) {
  const tab = link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  if (link.external) {
    return (
      <a href={link.href} className={className} onClick={onNavigate} {...tab}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} aria-current={current ? "page" : undefined} onClick={onNavigate} {...tab}>
      {link.label}
    </Link>
  );
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
    <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" strokeLinecap="round" />
  </svg>
);

/**
 * The header menu in the reference layout (D-049): from 1360px one row of links and dropdowns that
 * open on hover or click (Escape or a click elsewhere closes them); below 1360px a full-width drawer with
 * one accordion per dropdown. The language switcher and search come with it.
 */
export function SiteNav({ items, ctas, locales }: Props) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const here = currentHref(pathname, items);

  // ── Desktop dropdowns ───────────────────────────────────────────────
  const [openId, setOpenId] = useState<string | null>(null);
  const desktopRef = useRef<HTMLUListElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  // ── Mobile drawer ───────────────────────────────────────────────────
  const [drawer, setDrawer] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const drawerId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close everything after navigating (adjusted while rendering, as React recommends).
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpenId(null);
    setDrawer(false);
  }

  useEffect(() => {
    if (!openId && !drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openId) {
        buttons.current.get(openId)?.focus();
        setOpenId(null);
      } else {
        setDrawer(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (openId && !desktopRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openId, drawer]);

  const topLink =
    "flex min-h-11 items-center gap-1 rounded px-2 text-sm font-medium whitespace-nowrap text-cream no-underline hover:bg-white/10";
  const pill =
    "flex min-h-11 items-center rounded-full border-2 border-gold bg-cream px-4 text-sm font-semibold whitespace-nowrap text-primary no-underline hover:bg-white";
  const parentOf = (item: NavItem) => item.kind === "dropdown" && item.children.some((c) => c.href === here);

  return (
    <>
      {/* ── 1360px and up: one row ─────────────────────────────────────── */}
      <div className="ml-auto hidden items-center gap-1 nav:flex">
        <nav aria-label={t("mainNavigation")}>
          <ul ref={desktopRef} className="flex items-center gap-0.5">
            {items.map((item) => {
              const active = item.kind === "link" ? item.href === here : parentOf(item);
              const activeClass = active ? " bg-white/15" : "";
              if (item.kind === "link") {
                return (
                  <li key={item.id}>
                    <NavAnchor link={item} className={topLink + activeClass} current={item.href === here} />
                  </li>
                );
              }
              const open = openId === item.id;
              const panelId = `menu-${item.id}`;
              return (
                <li
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setOpenId(item.id)}
                  onMouseLeave={() => setOpenId((id) => (id === item.id ? null : id))}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenId((id) => (id === item.id ? null : id));
                  }}
                >
                  <button
                    ref={(el) => {
                      if (el) buttons.current.set(item.id, el);
                      else buttons.current.delete(item.id);
                    }}
                    type="button"
                    className={topLink + activeClass}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    {item.label}
                    <Chevron open={open} />
                  </button>
                  <ul
                    id={panelId}
                    hidden={!open}
                    className="absolute top-full left-0 z-50 min-w-56 rounded-md border border-cream bg-white p-1.5 text-ink shadow-lg"
                  >
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <NavAnchor
                          link={child}
                          current={child.href === here}
                          className={`flex min-h-11 items-center rounded px-3 text-ink no-underline hover:bg-cream ${child.href === here ? "font-semibold text-primary" : ""}`}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {ctas.map((cta) => (
              <li key={cta.id} className="ml-1.5">
                <NavAnchor link={cta} className={pill} current={cta.href === here} />
              </li>
            ))}
          </ul>
        </nav>
        <span aria-hidden="true" className="mx-2 h-7 w-px bg-cream/30" />
        <LocaleSwitcher locales={locales} variant="pill" />
        <Link href="/search" aria-label={t("search")} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-cream hover:bg-white/10 print:hidden">
          <SearchIcon />
        </Link>
      </div>

      {/* ── Below 1360px: search + menu button, drawer ─────────────────── */}
      <div className="ml-auto flex items-center gap-1 nav:hidden">
        <Link href="/search" aria-label={t("search")} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-cream hover:bg-white/10 print:hidden">
          <SearchIcon />
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-cream hover:bg-white/10 print:hidden"
          aria-expanded={drawer}
          aria-controls={drawerId}
          aria-label={drawer ? t("closeMenu") : t("menu")}
          onClick={() => setDrawer(!drawer)}
        >
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {drawer ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      <div
        id={drawerId}
        hidden={!drawer}
        className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-cream/20 bg-primary px-gutter pt-4 pb-8 shadow-lg nav:hidden"
      >
        <LocaleSwitcher locales={locales} variant="pill" />
        <nav aria-label={t("mainNavigation")} className="mt-3">
          <ul>
            {items.map((item) => {
              const row = "flex min-h-12 w-full items-center justify-between border-b border-cream/15 py-2 text-left text-base text-cream no-underline";
              if (item.kind === "link") {
                return (
                  <li key={item.id}>
                    <NavAnchor link={item} current={item.href === here} className={`${row} ${item.href === here ? "font-semibold underline decoration-gold decoration-2 underline-offset-4" : ""}`} />
                  </li>
                );
              }
              const open = section === item.id;
              const listId = `drawer-${item.id}`;
              return (
                <li key={item.id}>
                  <button type="button" className={`${row} ${parentOf(item) ? "font-semibold" : ""}`} aria-expanded={open} aria-controls={listId} onClick={() => setSection(open ? null : item.id)}>
                    {item.label}
                    <Chevron open={open} />
                  </button>
                  <ul id={listId} hidden={!open} className="my-2 ml-2 border-l-2 border-gold pl-4">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <NavAnchor
                          link={child}
                          current={child.href === here}
                          className={`flex min-h-11 items-center text-cream no-underline hover:underline ${child.href === here ? "font-semibold underline decoration-gold decoration-2 underline-offset-4" : ""}`}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          {ctas.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {ctas.map((cta) => (
                <li key={cta.id}>
                  <NavAnchor link={cta} className={pill} current={cta.href === here} />
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>
    </>
  );
}

