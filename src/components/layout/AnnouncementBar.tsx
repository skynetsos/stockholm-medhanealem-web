import { getTranslations } from "next-intl/server";

import { urgentAnnouncements } from "@/lib/home";
import { richTextToPlain } from "@/lib/richtext";
import type { Announcement } from "@/payload-types";

const MAX_TEXT = 200;

/** Urgent announcements, at the top of every page while they are visible (spec §2.5). */
export async function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const live = urgentAnnouncements(announcements, new Date());
  if (!live.length) return null;
  const t = await getTranslations("announcements");

  return (
    <section aria-label={t("urgentLabel")} className="bg-gold text-ink">
      <ul className="mx-auto max-w-site px-gutter py-2">
        {live.map((announcement) => {
          const text = richTextToPlain(announcement.body);
          return (
            <li key={announcement.id} className="py-1">
              <strong className="me-2">{announcement.title}</strong>
              {text && <span>{text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT).trimEnd()}…` : text}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
