import { headers } from "next/headers";
import Link from "next/link";
import type { BeforeListTableServerProps } from "payload";

import type { CaseCollection } from "../../../lib/cases/events";
import { CASE_STATUSES, caseCounts, caseListHref, currentFilter } from "../../../lib/cases/overview";
import styles from "./Cases.module.css";

type T = (key: string, options?: Record<string, unknown>) => string;

/**
 * Above the case list (spec Phase 2 task 6): one-click filters by status with counts, and the
 * open cases assigned to the signed-in staff member. Counts use the viewer's own access.
 */
export async function CaseStatusFilters({ collectionConfig, payload, user, searchParams, i18n }: BeforeListTableServerProps) {
  const collection = collectionConfig.slug as CaseCollection;
  if (!user) return null;
  const counts = await caseCounts(payload, collection, { user, req: { headers: await headers() } });
  if (!counts) return null;
  const t = i18n.t as unknown as T;
  const active = currentFilter(collection, searchParams);
  const none = !active.status && active.assignedTo === undefined;
  const mine = active.status === "open" && active.assignedTo !== undefined && String(active.assignedTo) === String(user.id);

  const item = (href: string, label: string, count: number | null, current: boolean) => (
    <li key={href}>
      <Link href={href} className={styles.filter} aria-current={current ? "page" : undefined}>
        {label}
        {count !== null && <span className={styles.count}>{count}</span>}
      </Link>
    </li>
  );

  return (
    <nav aria-label={t("cases:filters")} className={styles.filters}>
      <ul>
        {item(caseListHref(collection), t("cases:all"), null, none)}
        {item(caseListHref(collection, { status: "open" }), t("cases:open"), counts.open, active.status === "open" && !mine)}
        {item(caseListHref(collection, { status: "open", assignedTo: user.id }), t("cases:assignedToMe"), counts.mine, mine)}
        {CASE_STATUSES[collection].map((status) =>
          item(caseListHref(collection, { status }), t(`cases:status_${status}`), counts.byStatus[status], active.status === status && active.assignedTo === undefined),
        )}
      </ul>
    </nav>
  );
}
