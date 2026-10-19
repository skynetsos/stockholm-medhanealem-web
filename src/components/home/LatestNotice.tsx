import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { getTranslations } from "next-intl/server";

import type { DateLabels } from "@/lib/date-labels";
import { hasRichText } from "@/lib/richtext";
import type { Announcement } from "@/payload-types";

import { HomeSection } from "./HomeSection";

/** The pinned (or newest) non-urgent announcement, in full. */
export async function LatestNotice({ announcement, labels }: { announcement: Announcement; labels: DateLabels }) {
  const t = await getTranslations("home");

  return (
    <HomeSection id="latest-notice" title={t("latestNotice")}>
      <article className="rounded bg-white p-5 shadow-sm">
        <h3>{announcement.title}</h3>
        <p className="text-sm text-muted">
          <time dateTime={announcement.publishAt}>{labels.instant(announcement.publishAt)}</time>
        </p>
        {hasRichText(announcement.body) && (
          <RichText data={announcement.body as SerializedEditorState} className="mt-3 space-y-3" />
        )}
      </article>
    </HomeSection>
  );
}
