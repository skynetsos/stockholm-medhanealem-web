import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, PayloadRequest } from "payload";

import { staffContentAccess } from "../access/content";
import { stockholmDay } from "../fields/stockholmDate";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { parseVideoUrl } from "../lib/video";

/** Spec §3 (Pages row): editors and super_admin manage videos; translators edit text; public reads. */
const { access, editorsOnlyField } = staffContentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "editor"],
  deleters: ["super_admin", "editor"],
  publicWhere: () => true,
});
const structural = { access: { update: editorsOnlyField } };

const revalidation = revalidateTags(CACHE_TAGS.videos);

const idOf = (value: unknown): number | null =>
  typeof value === "number" ? value : value && typeof value === "object" && "id" in value ? (value as { id: number }).id : null;

/**
 * A recording is public while an entry uses it (Audio read access, D-042). Runs in the save's own
 * transaction (`req`): the new entry's reference to the recording locks that row until it commits.
 */
async function syncAttached(req: PayloadRequest, audioId: number | null) {
  if (!audioId) return;
  const used = await req.payload.count({ collection: "videos", overrideAccess: true, req, where: { audio: { equals: audioId } } });
  await req.payload.update({ collection: "audio", id: audioId, overrideAccess: true, req, data: { attached: used.totalDocs > 0 } });
}
const audioAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const now = idOf(doc.audio);
  const before = idOf(previousDoc?.audio);
  await syncAttached(req, now);
  if (before !== now) await syncAttached(req, before);
  return doc;
};
const audioAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await syncAttached(req, idOf(doc.audio));
  return doc;
};

/**
 * Video/audio library (spec §2.10): YouTube, Vimeo and Facebook links, and (Phase 3, D-042) audio
 * recordings uploaded to "Audio recordings", played on the site with a plain audio player.
 */
export const Videos: CollectionConfig = {
  slug: "videos",
  labels: { singular: "Video or recording", plural: "Videos & audio" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "kind", "category", "date"],
    description: "Embedded only after the visitor clicks (privacy), unless consent is turned off for an item.",
  },
  access,
  defaultSort: "-date",
  hooks: { afterChange: [...revalidation.afterChange, audioAfterChange], afterDelete: [...revalidation.afterDelete, audioAfterDelete] },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    {
      type: "row",
      fields: [
        {
          name: "kind",
          type: "select",
          required: true,
          defaultValue: "video",
          options: [
            { label: "Video", value: "video" },
            { label: "Audio", value: "audio" },
          ],
          ...structural,
          admin: { width: "33%" },
        },
        {
          name: "category",
          type: "select",
          required: true,
          options: [
            { label: "Sermon", value: "sermon" },
            { label: "Liturgy", value: "liturgy" },
            { label: "Event", value: "event" },
            { label: "Sunday School", value: "sunday-school" },
          ],
          ...structural,
          admin: { width: "33%" },
        },
        stockholmDay({ name: "date", required: true, index: true, ...structural, admin: { width: "33%" } }),
      ],
    },
    {
      name: "audio",
      type: "upload",
      relationTo: "audio",
      ...structural,
      admin: { description: "The recording (upload it under Audio recordings).", condition: (_, sibling) => sibling?.kind === "audio" },
      validate: (value: unknown, { siblingData }: { siblingData?: { kind?: string; url?: string } }) =>
        siblingData?.kind === "audio" && !value && !siblingData.url ? "Choose a recording, or enter a video link instead." : true,
    },
    {
      name: "url",
      type: "text",
      ...structural,
      admin: { description: "YouTube, Vimeo or Facebook video link. For an uploaded recording, leave empty." },
      validate: (value: unknown, { siblingData }: { siblingData?: { kind?: string; audio?: unknown } }) => {
        if (siblingData?.kind === "audio" && siblingData.audio && !value) return true;
        return parseVideoUrl(typeof value === "string" ? value : "") ? true : "Enter a YouTube, Vimeo or Facebook video link (https://…)";
      },
    },
    { name: "description", type: "textarea", localized: true },
    {
      name: "consentRequired",
      type: "checkbox",
      label: "Load only after the visitor clicks",
      defaultValue: true,
      ...structural,
      admin: {
        position: "sidebar",
        description: "Keeps YouTube/Vimeo from setting cookies until the visitor chooses to play. Leave on.",
      },
    },
  ],
};
