import type { CollectionConfig } from "payload";

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

/**
 * Video/audio library (spec §2.10). Phase 1 supports YouTube and Vimeo links; uploaded audio/video
 * files (e.g. sermon recordings) need their own upload collection and arrive with the Phase 3 audio
 * player (docs/DECISIONS.md D-014).
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
  hooks: { afterChange: revalidation.afterChange, afterDelete: revalidation.afterDelete },
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
      name: "url",
      type: "text",
      required: true,
      ...structural,
      admin: { description: "YouTube or Vimeo link." },
      validate: (value: unknown) =>
        parseVideoUrl(typeof value === "string" ? value : "") ? true : "Enter a YouTube or Vimeo link (https://…)",
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
