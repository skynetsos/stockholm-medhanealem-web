import { serializeJsonLd } from "@/lib/jsonld";

/** Structured data for search engines; renders nothing when there is none. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] | null }) {
  if (!data || (Array.isArray(data) && !data.length)) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
