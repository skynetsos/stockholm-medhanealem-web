import type { Metadata } from "next";

import { SacramentPage, sacramentMetadata } from "@/components/teachings/SacramentPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sacramentMetadata((await params).locale, "marriage");
}

export default async function MarriagePage({ params }: Props) {
  return <SacramentPage locale={(await params).locale} page="marriage" />;
}
