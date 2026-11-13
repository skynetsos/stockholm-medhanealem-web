import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { localeNames } from "../../../i18n/locales";
import { reportLocales, type Staff, SWEDISH_THRESHOLD_PERCENT, translationReport } from "../../../lib/translations/coverage";
import styles from "./Translations.module.css";

type T = (key: string, options?: Record<string, unknown>) => string;

/**
 * /admin/translations — "Missing translations" (spec Phase 3 task 1, D-041): for each language, the
 * live content without its own text in that language, by collection, each linking to the item opened
 * in that language. Shows how much of the core content (pages, teachings) is translated, which
 * decides when Swedish can be switched on (≥ 80 %).
 */
export async function TranslationsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const user = req.user as (Staff & { id: number }) | null;
  if (!user) redirect("/admin/login?redirect=%2Fadmin%2Ftranslations");
  const t = req.i18n.t as unknown as T;
  const shown = reportLocales(user);
  const reports = await Promise.all(shown.map((l) => translationReport(req.payload, l)));

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div className={styles.view}>
          <h1>{t("translations:title")}</h1>
          <p>{t("translations:intro")}</p>
          {!reports.length && <p>{t("translations:noLanguages")}</p>}
          {reports.map((report) => (
            <section key={report.locale} aria-labelledby={`tr-${report.locale}`} className={styles.language}>
              <h2 id={`tr-${report.locale}`}>{localeNames[report.locale]}</h2>
              <p className={styles.coverage}>
                {t("translations:coverage", { percent: report.corePercent, translated: report.coreTranslated, total: report.coreTotal })}
                {report.locale === "sv" &&
                  ` ${t(report.corePercent >= SWEDISH_THRESHOLD_PERCENT ? "translations:swedishReady" : "translations:swedishNotReady", { threshold: SWEDISH_THRESHOLD_PERCENT })}`}
              </p>
              {report.collections.every((c) => !c.missing.length) ? (
                <p>{t("translations:allDone")}</p>
              ) : (
                report.collections
                  .filter((c) => c.missing.length)
                  .map((c) => (
                    <section key={c.collection} aria-labelledby={`tr-${report.locale}-${c.collection}`}>
                      <h3 id={`tr-${report.locale}-${c.collection}`}>
                        {t(`translations:collection_${c.collection}`)} ({c.translated}/{c.total})
                      </h3>
                      <ul className={styles.list}>
                        {c.missing.map((item) => (
                          <li key={item.id}>
                            <Link href={`/admin/collections/${c.collection}/${item.id}?locale=${report.locale}`}>{item.title}</Link>
                            <span className={styles.fields}>
                              {" "}
                              — {t("translations:missing")}: {item.missing.map((f) => t(`translations:field_${f}`)).join(", ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
              )}
            </section>
          ))}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}
