import type { Metadata } from "next";

import { WorshipList, worshipListMetadata } from "@/components/worship/WorshipList";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return worshipListMetadata((await params).locale, "annual-feasts");
}

export default async function AnnualFeastsPage({ params }: Props) {
  return <WorshipList locale={(await params).locale} list="annual-feasts" />;
}
