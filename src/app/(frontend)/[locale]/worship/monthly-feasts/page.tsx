import type { Metadata } from "next";

import { WorshipList, worshipListMetadata } from "@/components/worship/WorshipList";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return worshipListMetadata((await params).locale, "monthly-feasts");
}

export default async function MonthlyFeastsPage({ params }: Props) {
  return <WorshipList locale={(await params).locale} list="monthly-feasts" />;
}
