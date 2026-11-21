/**
 * Whether forms that collect personal data may be offered (review F-03, V-01, V-04): in production
 * only once the privacy notice (/privacy) is published; in development always, so the committee can
 * try them. `available` is the list of addresses that exist (getAvailablePaths).
 */
export function formsOpen(available: readonly string[] | ReadonlySet<string>): boolean {
  if (process.env.SITE_ENV !== "production") return true;
  return "has" in available ? available.has("/privacy") : available.includes("/privacy");
}

/** The pages that are a form and nothing else: they exist only while forms are open. */
export const FORM_PAGES = ["/sunday-school/join", "/support/volunteer", "/sacraments/prayer-request"] as const;
