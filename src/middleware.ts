import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Public pages only: never touch the Payload admin, APIs, Next internals or static files.
  matcher: ["/((?!admin|api|_next|_vercel|.*\\..*).*)"],
};
