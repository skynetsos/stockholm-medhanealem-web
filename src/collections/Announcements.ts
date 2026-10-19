import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type Where } from "payload";

import { staffContentAccess } from "../access/content";
import { stockholmDateTime } from "../fields/stockholmDate";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";

/**
 * Spec §2.5 / §3: editors and super_admin manage announcements; clergy/office read; translators edit
 * text. The public sees an announcement only between its publish time and its expiry.
 */
const { access, editorsOnlyField } = staffContentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "editor"],
  deleters: ["super_admin", "editor"],
  publicWhere: (): Where => {
    const now = new Date().toISOString();
    return {
      and: [
        { publishAt: { less_than_equal: now } },
        { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: now } }] },
      ],
    };
  },
});
const structural = { access: { update: editorsOnlyField } };

const validateWindow: CollectionBeforeChangeHook = ({ data }) => {
  if (data?.publishAt && data.expiresAt && new Date(data.expiresAt) <= new Date(data.publishAt)) {
    throw new APIError("The expiry must be after the publish time.", 400);
  }
  return data;
};

const revalidation = revalidateTags(CACHE_TAGS.announcements, CACHE_TAGS.layout);

export const Announcements: CollectionConfig = {
  slug: "announcements",
  labels: { singular: "Announcement", plural: "Announcements" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "publishAt", "expiresAt", "urgent", "pinned"],
    description: "Notices for the congregation. Urgent ones appear in a bar at the top of every page.",
  },
  access,
  defaultSort: "-publishAt",
  hooks: {
    beforeChange: [validateWindow],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    { name: "body", type: "richText", localized: true },
    {
      type: "row",
      fields: [
        stockholmDateTime({
          name: "publishAt",
          label: "Show from",
          required: true,
          index: true,
          defaultValue: () => new Date().toISOString(),
          ...structural,
          admin: { width: "50%" },
        }),
        stockholmDateTime({
          name: "expiresAt",
          label: "Hide after",
          index: true,
          ...structural,
          admin: { width: "50%", description: "Leave empty to keep it until removed." },
        }),
      ],
    },
    {
      name: "urgent",
      type: "checkbox",
      defaultValue: false,
      ...structural,
      admin: { position: "sidebar", description: "Show in the bar at the top of every page while visible." },
    },
    {
      name: "pinned",
      type: "checkbox",
      defaultValue: false,
      ...structural,
      admin: { position: "sidebar", description: "Keep at the top of the announcements list." },
    },
  ],
};
