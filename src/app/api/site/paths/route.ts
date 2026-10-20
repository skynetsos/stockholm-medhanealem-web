import { getAvailablePaths } from "@/lib/cms/pages";

export const dynamic = "force-dynamic";

/**
 * Addresses that exist because of published content, for the middleware (D-017, D-018). Public
 * information: the same pages are linked from the site. Cached and refreshed on save.
 */
export async function GET() {
  try {
    return Response.json({ paths: await getAvailablePaths() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
