import { getTranslations } from "next-intl/server";

import { CmsRichText } from "@/components/richtext/CmsRichText";
import { Link } from "@/i18n/navigation";
import type { BaptismPage } from "@/payload-types";
import { baptismRequirements } from "@/lib/cms/sacraments";
import { BAPTISM_REQUEST_PATH } from "@/lib/content-paths";
import { hasRichText } from "@/lib/richtext";

/**
 * Top of /sacraments/baptism (spec Phase 2 task 3): intro, the "what to prepare" checklist, the
 * notice that a request does not confirm a date, and the request button while requests are open.
 */
export async function BaptismIntro({ page }: { page: BaptismPage }) {
  const t = await getTranslations("sacraments");
  const requirements = baptismRequirements(page);

  return (
    <>
      {hasRichText(page.intro) && <CmsRichText data={page.intro!} className="mt-4" />}
      {requirements.length > 0 && (
        <section aria-labelledby="baptism-requirements" className="mt-8 rounded bg-white p-6 shadow-sm">
          <h2 id="baptism-requirements" className="text-h3">
            {t("requirementsTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {requirements.map((r) => (
              <li key={r.id} className="flex gap-3">
                <span aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 rounded-sm border-2 border-primary" />
                <span>
                  <span className="font-medium">{r.item}</span>
                  {r.detail && <span className="mt-1 block text-muted">{r.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <aside aria-labelledby="baptism-notice" className="mt-8 rounded border-l-4 border-primary bg-white p-5 shadow-sm">
        <h2 id="baptism-notice" className="text-h4">
          {t("noticeTitle")}
        </h2>
        <p className="mt-2">{t("baptismNotice")}</p>
      </aside>
      {page.requestsOpen && (
        <p className="mt-8">
          <Link
            href={BAPTISM_REQUEST_PATH}
            className="inline-flex min-h-11 items-center rounded bg-primary px-6 font-medium text-cream no-underline hover:bg-ink"
          >
            {t("requestCta")}
          </Link>
        </p>
      )}
    </>
  );
}
