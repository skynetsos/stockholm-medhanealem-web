import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { availablePaths, rewriteTarget } from "./lib/cms-routing";
import { isContentGatedPath } from "./lib/content-paths";
import { createNonce, cspOptions, publicCsp } from "./lib/security/csp";

const handleI18nRouting = createMiddleware(routing);

/**
 * This app's own address for server-internal requests (the list of available addresses). Behind
 * Docker and Caddy the public URL isn't reachable from inside, so it defaults to the local port.
 */
const internalOrigin = () => process.env.INTERNAL_SERVER_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

/**
 * Content Security Policy with a fresh nonce for this response (D-037). Next.js puts the nonce on its
 * own scripts when it finds it in the *request's* CSP header, and middleware changes request headers
 * through an override list that must name every request header to keep; next-intl may have set
 * some already, so they are merged.
 */
function withCsp(request: NextRequest, response: NextResponse): NextResponse {
  const nonce = createNonce();
  const csp = publicCsp(nonce, cspOptions());
  const forward = new Headers(request.headers);
  const overridden = response.headers.get("x-middleware-override-headers");
  for (const name of overridden ? overridden.split(",") : []) {
    const value = response.headers.get(`x-middleware-request-${name}`);
    if (value === null) forward.delete(name);
    else forward.set(name, value);
  }
  forward.set("content-security-policy", csp);
  forward.set("x-nonce", nonce);
  response.headers.set("x-middleware-override-headers", [...forward.keys()].join(","));
  forward.forEach((value, name) => response.headers.set(`x-middleware-request-${name}`, value));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/**
 * 1. next-intl: every public path gets a locale ("/" → "/am", "/wp-login.php" → "/am/wp-login.php").
 * 2. Content-dependent addresses (D-017, D-018): a published CMS page is rewritten to the internal
 *    CMS route; a teaching or sacrament address without content is sent to the 404; anything else
 *    is left alone, so unknown addresses get the server-rendered 404.
 * 3. The Content Security Policy with this response's nonce (D-037).
 */
export default async function proxy(request: NextRequest) {
  return withCsp(request, await route(request));
}

async function route(request: NextRequest): Promise<NextResponse> {
  const response = handleI18nRouting(request);
  if (response.headers.has("location")) return response;

  const { pathname, search } = request.nextUrl;
  // Only addresses that may depend on content need the list (no fetch for home, news, admin, …).
  const withoutLocale = pathname.replace(/^\/[^/]+/, "");
  const mayDepend = rewriteTarget(pathname, null) !== null || isContentGatedPath(withoutLocale);
  if (!mayDepend) return response;
  const target = rewriteTarget(pathname, await availablePaths(internalOrigin()));
  if (!target) return response;

  const rewritten = NextResponse.rewrite(new URL(`${target}${search}`, request.url));
  // Keep what next-intl set (request header overrides, cookies), but not its own routing decision.
  response.headers.forEach((value, key) => {
    if (key === "x-middleware-next" || key === "x-middleware-rewrite") return;
    rewritten.headers.set(key, value);
  });
  return rewritten;
}

export const config = {
  // Every public path gets a locale, including unknown "file-like" paths (e.g. /wp-login.php), so the
  // 404 page always knows its language. Skipped: the Payload admin and APIs, Next.js internals, and the
  // file routes Next.js serves itself (icons, robots.txt, sitemap.xml, web manifest, .well-known).
  // Files in public/ live under /fonts; add any other public/ folder to this list.
  matcher: [
    "/((?!admin|api|_next|_vercel|fonts/|favicon\\.ico|icon|apple-icon|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|twitter-image|\\.well-known).*)",
  ],
};
