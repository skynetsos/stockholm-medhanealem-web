import type { Payload } from "payload";

import { defaultLocale, type Locale, locales } from "../i18n/locales";
import { baseSeed, type Localized } from "./base-data";

export type SeedOutcome = "seeded" | "skipped (already has content)";
export type SeedReport = Record<"site-settings" | "navigation" | "footer" | "departments", SeedOutcome>;

// Scripts run outside Next.js, so there is no page cache to revalidate.
const context = { disableRevalidate: true };
const otherLocales = locales.filter((l): l is Exclude<Locale, "am"> => l !== defaultLocale);
const internal = (path: string) => ({ type: "internal" as const, path });

/** Label for a locale, or the Amharic label (Payload would fall back to it anyway). */
const label = (text: Localized, locale: Locale) => text[locale] ?? text.am;

/**
 * Fill SiteSettings, Navigation and Footer with base content (docs/DECISIONS.md D-006).
 * Safe to run repeatedly: a global that already has content is left alone unless `force` is set,
 * so edits made in /admin are never overwritten by accident.
 *
 * Array rows are shared across locales while their labels are localized, so each global is written
 * once in Amharic and then relabelled per locale on the same row ids.
 */
export async function seedBase(payload: Payload, { force = false } = {}): Promise<SeedReport> {
  const read = { locale: defaultLocale, overrideAccess: true, depth: 0, fallbackLocale: false } as const;
  const [settings, navigation, footer] = await Promise.all([
    payload.findGlobal({ slug: "site-settings", ...read }),
    payload.findGlobal({ slug: "navigation", ...read }),
    payload.findGlobal({ slug: "footer", ...read }),
  ]);
  const skipped = "skipped (already has content)" as const;
  const report: SeedReport = { "site-settings": skipped, navigation: skipped, footer: skipped, departments: skipped };

  // ── Site settings ─────────────────────────────────────────────────────
  if (force || (!settings.churchName && !settings.shortName)) {
    const s = baseSeed.settings;
    await payload.updateGlobal({
      slug: "site-settings",
      locale: defaultLocale,
      overrideAccess: true,
      context,
      data: {
        churchName: s.churchName.am,
        defaultLocation: s.defaultLocation.am,
        shortName: s.shortName,
        address: s.address,
        retentionMonthsBaptism: s.retentionMonthsBaptism,
      },
    });
    for (const locale of otherLocales) {
      await payload.updateGlobal({
        slug: "site-settings",
        locale,
        overrideAccess: true,
        context,
        // Explicit null means "no translation": the site falls back to Amharic.
        data: { churchName: s.churchName[locale] ?? null, defaultLocation: s.defaultLocation[locale] ?? null },
      });
    }
    report["site-settings"] = "seeded";
  }

  // ── Navigation ────────────────────────────────────────────────────────
  if (force || (!navigation.headerItems?.length && !navigation.headerCTAs?.length)) {
    const { items, ctas } = baseSeed.navigation;
    const saved = await payload.updateGlobal({
      slug: "navigation",
      locale: defaultLocale,
      overrideAccess: true,
      context,
      data: {
        headerItems: items.map((item) => ({ label: item.label.am, link: internal(item.path), children: [] })),
        headerCTAs: ctas.map((cta) => ({ label: cta.label.am, link: internal(cta.path), style: cta.style })),
      },
    });
    for (const locale of otherLocales) {
      await payload.updateGlobal({
        slug: "navigation",
        locale,
        overrideAccess: true,
        context,
        data: {
          headerItems: (saved.headerItems ?? []).map((row, i) => ({ ...row, label: label(items[i].label, locale) })),
          headerCTAs: (saved.headerCTAs ?? []).map((row, i) => ({ ...row, label: label(ctas[i].label, locale) })),
        },
      });
    }
    report.navigation = "seeded";
  }

  // ── Footer ────────────────────────────────────────────────────────────
  if (force || (!footer.columns?.length && !footer.legalLinks?.length && !footer.diocese?.label)) {
    const { diocese, legal } = baseSeed.footer;
    const dioceseLink = { type: "external" as const, url: diocese.url, newTab: true };
    const saved = await payload.updateGlobal({
      slug: "footer",
      locale: defaultLocale,
      overrideAccess: true,
      context,
      data: {
        columns: [],
        diocese: { label: diocese.label.am, link: dioceseLink },
        legalLinks: legal.map((item) => ({ label: item.label.am, link: internal(item.path) })),
      },
    });
    for (const locale of otherLocales) {
      await payload.updateGlobal({
        slug: "footer",
        locale,
        overrideAccess: true,
        context,
        data: {
          diocese: { label: label(diocese.label, locale), link: dioceseLink },
          legalLinks: (saved.legalLinks ?? []).map((row, i) => ({ ...row, label: label(legal[i].label, locale) })),
        },
      });
    }
    report.footer = "seeded";
  }


  // ── Departments (spec §2.7): create any that are missing (by slug); names only ──
  for (const dept of baseSeed.departments) {
    const existing = await payload.find({
      collection: "departments",
      where: { slug: { equals: dept.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs[0] && !force) continue;
    const saved = existing.docs[0]
      ? await payload.update({
          collection: "departments",
          id: existing.docs[0].id,
          locale: defaultLocale,
          overrideAccess: true,
          context,
          data: { name: dept.name.am, order: dept.order },
        })
      : await payload.create({
          collection: "departments",
          locale: defaultLocale,
          overrideAccess: true,
          context,
          data: { slug: dept.slug, name: dept.name.am, order: dept.order },
        });
    for (const locale of otherLocales) {
      await payload.update({
        collection: "departments",
        id: saved.id,
        locale,
        overrideAccess: true,
        context,
        data: { name: label(dept.name, locale) },
      });
    }
    report.departments = "seeded";
  }

  return report;
}
