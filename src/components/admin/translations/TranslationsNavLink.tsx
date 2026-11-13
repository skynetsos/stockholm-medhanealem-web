import Link from "next/link";
import type { ServerProps } from "payload";

import { reportLocales, type Staff } from "../../../lib/translations/coverage";
import styles from "./Translations.module.css";

type T = (key: string) => string;

/** Sidebar link to /admin/translations, for staff who translate or edit content. */
export function TranslationsNavLink({ user, i18n }: ServerProps) {
  if (!user || !reportLocales(user as Staff).length) return null;
  return (
    <Link href="/admin/translations" className={styles.navLink}>
      {(i18n.t as unknown as T)("translations:title")}
    </Link>
  );
}
