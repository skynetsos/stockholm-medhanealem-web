import { getTranslations } from "next-intl/server";

import { VisitDetails } from "@/components/visit/VisitDetails";
import type { SiteSetting } from "@/payload-types";

import { HomeSection } from "./HomeSection";

export { hasVisitInfo } from "@/components/visit/VisitDetails";

/** Address, directions and office contact, with a link to the Visit page (map, contact form). */
export async function VisitUs({ settings }: { settings: SiteSetting }) {
  const t = await getTranslations("home");
  return (
    <HomeSection id="visit" title={t("visit")} more={{ href: "/visit", label: t("visitPage") }}>
      <VisitDetails settings={settings} />
    </HomeSection>
  );
}
