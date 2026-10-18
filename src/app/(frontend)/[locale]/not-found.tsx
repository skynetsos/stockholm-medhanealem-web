import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

/** Localized 404, rendered inside the [locale] layout so <html lang> is correct. */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main id="main">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <Link href="/">{t("backHome")}</Link>
    </main>
  );
}
