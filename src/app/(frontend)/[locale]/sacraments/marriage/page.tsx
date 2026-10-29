import type { Metadata } from "next";

import { InquirySection } from "@/components/forms/InquirySection";
import { SacramentPage, sacramentMetadata } from "@/components/teachings/SacramentPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sacramentMetadata((await params).locale, "marriage");
}

export default async function MarriagePage({ params }: Props) {
  // Phase 2 task 7: the marriage inquiry form under the guidance.
  return <SacramentPage locale={(await params).locale} page="marriage" after={<InquirySection form="marriage" heading="h2" />} />;
}
