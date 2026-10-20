import type { Metadata } from "next";

import { SacramentPage, sacramentMetadata } from "@/components/teachings/SacramentPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sacramentMetadata((await params).locale, "baptism");
}

export default async function BaptismPage({ params }: Props) {
  return <SacramentPage locale={(await params).locale} page="baptism" />;
}
