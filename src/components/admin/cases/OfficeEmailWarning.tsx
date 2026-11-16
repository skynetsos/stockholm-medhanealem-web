import Link from "next/link";
import type { ServerProps } from "payload";

import { hasRole } from "../../../access/roles";
import { officeRecipients } from "../../../lib/office-email";
import styles from "./Cases.module.css";

type T = (key: string) => string;

/**
 * Dashboard warning while no one is emailed about new requests and messages (review F-09): without
 * an office notification email or office email in Site settings, forms are saved but nobody is told.
 * Shown to the staff who can fix it or who handle requests.
 */
export async function OfficeEmailWarning({ payload, user, i18n }: ServerProps) {
  if (!user || !hasRole(user as { roles?: string[] }, "super_admin", "office_coordinator")) return null;
  const settings = await payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0 });
  if (officeRecipients(settings).length) return null;
  const t = i18n.t as unknown as T;
  return (
    <p role="alert" className={styles.error}>
      {t("cases:noOfficeEmail")} <Link href="/admin/globals/site-settings">{t("cases:openSiteSettings")}</Link>
    </p>
  );
}
