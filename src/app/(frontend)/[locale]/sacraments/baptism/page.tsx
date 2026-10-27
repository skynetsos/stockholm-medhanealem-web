import type { Metadata } from "next";
import type { Locale } from "next-intl";

import { BaptismIntro } from "@/components/sacraments/BaptismIntro";
import { SacramentPage, sacramentMetadata } from "@/components/teachings/SacramentPage";
import { getBaptismPage } from "@/lib/cms/sacraments";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sacramentMetadata((await params).locale, "baptism");
}

export default async function BaptismPage({ params }: Props) {
  const { locale } = await params;
  const page = await getBaptismPage(locale as Locale);
  return (
    <SacramentPage locale={locale} page="baptism">
      <BaptismIntro page={page} />
    </SacramentPage>
  );
}
