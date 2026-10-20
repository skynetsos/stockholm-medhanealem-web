import { hasLocale, type Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/hooks/revalidate";
import { LAYOUT_TAG } from "@/hooks/revalidateLayout";
import { routing } from "@/i18n/routing";
import { getActiveEvents } from "@/lib/cms/events";
import { getLayoutData } from "@/lib/cms/layout";
import { gregorianToJdn, jdnToGregorian, stockholmDate } from "@/lib/ethiopian-calendar";
import { expandEvents } from "@/lib/events/expand";
import { buildCalendar } from "@/lib/ical";

export const dynamic = "force-dynamic";

const PAST_DAYS = 7;
const FUTURE_DAYS = 365;

/** The feed for one language, rebuilt at most once an hour (or when events change). */
const calendarFor = (locale: Locale) =>
  unstable_cache(
    async () => {
      const [events, { settings }] = await Promise.all([getActiveEvents(locale), getLayoutData(locale)]);
      const today = gregorianToJdn(stockholmDate(new Date()));
      const occurrences = expandEvents(events, { from: jdnToGregorian(today - PAST_DAYS), to: jdnToGregorian(today + FUTURE_DAYS) });
      const site = new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000");
      return buildCalendar({
        name: settings.shortName || settings.churchName || site.hostname,
        domain: site.hostname,
        events: occurrences.map((o) => ({
          ...o,
          eventId: o.event.id,
          title: o.event.title,
          description: o.event.description,
          location: o.event.location || settings.defaultLocation,
          url: `${site.origin}/${locale}/worship/calendar`,
        })),
      });
    },
    ["ical", locale],
    { tags: [CACHE_TAGS.events, LAYOUT_TAG], revalidate: 3600 },
  )();

/**
 * /api/ical?lang=am|en|sv (spec §4): the coming year's services, feasts and fasts as an iCalendar
 * subscription, in the chosen language (default Amharic). Cached for 1 hour, also by Cloudflare.
 */
export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  const locale: Locale = hasLocale(routing.locales, lang) ? lang : routing.defaultLocale;
  try {
    return new Response(await calendarFor(locale), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="medhanealem-${locale}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Calendar unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
