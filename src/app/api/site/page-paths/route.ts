import { getPublishedPagePaths } from "@/lib/cms/pages";

export const dynamic = "force-dynamic";

/**
 * Published page addresses for the middleware (D-017). Public information: the same pages are
 * linked from the site. Cached on the server and refreshed when a page is saved.
 */
export async function GET() {
  try {
    return Response.json({ paths: await getPublishedPagePaths() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
