import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import errors from "../messages/errors.json";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale: explicit, requestLocale }) => {
  // An explicitly passed locale (e.g. getTranslations({ locale })) avoids reading request headers.
  const requested = explicit ?? (await requestLocale);
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: "Europe/Stockholm",
    // Error page strings are kept apart so the last-resort error page can load just them (D-044).
    messages: { ...(await import(`../messages/${locale}.json`)).default, errors: errors[locale] },
  };
});
