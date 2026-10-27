import { headers } from "next/headers";
import Link from "next/link";
import type { ServerProps } from "payload";

import type { CaseCollection } from "../../../lib/cases/events";
import { type CaseCounts, caseCounts, caseListHref, OPEN_STATUSES } from "../../../lib/cases/overview";
import styles from "./Cases.module.css";

type T = (key: string, options?: Record<string, unknown>) => string;

const COLLECTIONS: { slug: CaseCollection; title: string }[] = [
  { slug: "baptism-requests", title: "cases:baptismRequests" },
  { slug: "inquiries", title: "cases:inquiries" },
];

/**
 * Dashboard widget (spec Phase 2 task 6): open cases by status for each request type, and those
 * assigned to the signed-in staff member, each linking to the filtered list. Shown only to staff
 * who may read requests (counts use their own access, MFA included).
 */
export async function CaseDashboard({ payload, user, i18n }: ServerProps) {
  if (!user) return null;
  const req = { headers: await headers() };
  const counts = await Promise.all(COLLECTIONS.map(({ slug }) => caseCounts(payload, slug, { user, req })));
  const visible = COLLECTIONS.map((c, i) => ({ ...c, counts: counts[i] })).filter((c): c is typeof c & { counts: CaseCounts } => c.counts !== null);
  if (!visible.length) return null;
  const t = i18n.t as unknown as T;

  return (
    <section aria-labelledby="case-dashboard-title" className={styles.dashboard}>
      <h2 id="case-dashboard-title">{t("cases:dashboardTitle")}</h2>
      <div className={styles.cards}>
        {visible.map(({ slug, title, counts }) => (
          <section key={slug} aria-labelledby={`cases-${slug}`} className={styles.card}>
            <h3 id={`cases-${slug}`}>
              <Link href={caseListHref(slug, { status: "open" })}>
                {t(title)}: {counts.open} {t("cases:open").toLowerCase()}
              </Link>
            </h3>
            <dl>
              {OPEN_STATUSES[slug].map((status) => (
                <div key={status} className={styles.row}>
                  <dt>
                    <Link href={caseListHref(slug, { status })}>{t(`cases:status_${status}`)}</Link>
                  </dt>
                  <dd>{counts.byStatus[status]}</dd>
                </div>
              ))}
              <div className={styles.row}>
                <dt>
                  <Link href={caseListHref(slug, { status: "open", assignedTo: user.id })}>{t("cases:assignedToMe")}</Link>
                </dt>
                <dd>{counts.mine}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}
