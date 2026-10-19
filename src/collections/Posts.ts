import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import { contentAccess } from "../access/content";
import { stockholmDateTime } from "../fields/stockholmDate";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { validateSlugFormat } from "../lib/pages";

/** Spec §3 (Pages row): editors and super_admin write and publish news; translators save drafts. */
const { access, editorsOnlyField, publishersOnly, publishButton } = contentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "editor"],
  deleters: ["super_admin", "editor"],
  publishers: ["super_admin", "editor"],
});
const structural = { access: { update: editorsOnlyField } };

/** The author defaults to whoever creates the post; the publish date is set on first publish. */
const defaults: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (!data) return data;
  if (operation === "create" && !data.author && req.user) data.author = req.user.id;
  if (data._status === "published" && !data.publishedAt) {
    data.publishedAt = new Date().toISOString();
    data.publishedAt_tz = "Europe/Stockholm";
  }
  return data;
};

const revalidation = revalidateTags(CACHE_TAGS.posts);

/** News and articles (spec §2.11), shown at /news/<slug>. */
export const Posts: CollectionConfig = {
  slug: "posts",
  labels: { singular: "News post", plural: "News" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "publishedAt", "_status", "updatedAt"],
    listSearchableFields: ["title", "slug"],
    components: { edit: { PublishButton: publishButton } },
  },
  access,
  versions: { drafts: true, maxPerDoc: 50 },
  defaultSort: "-publishedAt",
  defaultPopulate: { title: true, slug: true, publishedAt: true, excerpt: true, coverImage: true },
  hooks: {
    beforeChange: [publishersOnly, defaults],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      ...structural,
      admin: { description: "Address: /news/<slug>, e.g. timket-2027." },
      validate: (value: unknown) => validateSlugFormat(value),
    },
    {
      name: "excerpt",
      type: "textarea",
      localized: true,
      maxLength: 300,
      admin: { description: "Short summary for the news list and search results." },
    },
    { name: "body", type: "richText", required: true, localized: true },
    { name: "coverImage", type: "upload", relationTo: "media", ...structural },
    stockholmDateTime({
      name: "publishedAt",
      label: "Publish date",
      index: true,
      ...structural,
      admin: { position: "sidebar", description: "Set automatically when first published; can be changed." },
    }),
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      ...structural,
      admin: { position: "sidebar", description: "Internal: who wrote it. Not shown publicly." },
    },
    {
      name: "byline",
      type: "text",
      localized: true,
      admin: { position: "sidebar", description: "Optional name shown on the site, e.g. the Sunday School." },
    },
  ],
};
