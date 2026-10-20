import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

/**
 * "Not found" inside a normal page. Only shown in the moments the middleware's address list is out
 * of date (D-017): real 404s are decided by the middleware, since notFound() can't be used here.
 */
export async function NotFoundContent() {
  const t = await getTranslations("notFound");
  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <Link href="/">{t("backHome")}</Link>
    </main>
  );
}
