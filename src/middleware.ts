import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Every public path gets a locale, including unknown "file-like" paths (e.g. /wp-login.php), so the
  // 404 page always knows its language. Skipped: the Payload admin and APIs, Next.js internals, and the
  // file routes Next.js serves itself (icons, robots.txt, sitemap.xml, web manifest, .well-known).
  // The public/ folder is empty; add any file placed there to this list.
  matcher: [
    "/((?!admin|api|_next|_vercel|favicon\\.ico|icon|apple-icon|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|twitter-image|\\.well-known).*)",
  ],
};
