import { headers } from "next/headers";

import { serializeJsonLd } from "@/lib/jsonld";

/**
 * Structured data for search engines; renders nothing when there is none. It is data, not code, but
 * carries the page's CSP nonce like every inline script (D-037).
 */
export async function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] | null }) {
  if (!data || (Array.isArray(data) && !data.length)) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
